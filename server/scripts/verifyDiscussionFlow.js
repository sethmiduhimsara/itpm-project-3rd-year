require("dotenv").config();

const baseUrl = process.env.VERIFY_BASE_URL || "http://localhost:5000";

function nowTag() {
  return Date.now().toString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
}

async function registerOrLoginStudent({ name, email, password }) {
  const reg = await request("POST", "/api/auth/register", {
    body: { name, email, password },
  });

  if (reg.ok) return reg.data;

  const msg = reg.data?.message || "";
  if (!/already registered/i.test(msg)) {
    throw new Error(
      `Student registration failed for ${email}: ${msg || reg.status}`,
    );
  }

  const login = await request("POST", "/api/auth/login", {
    body: { email, password },
  });

  if (!login.ok) {
    throw new Error(
      `Student login failed for ${email}: ${login.data?.message || login.status}`,
    );
  }

  return login.data;
}

async function loginAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment for admin verification.",
    );
  }

  const res = await request("POST", "/api/auth/login", {
    body: { email, password },
  });
  if (!res.ok) {
    throw new Error(`Admin login failed: ${res.data?.message || res.status}`);
  }
  return res.data;
}

async function run() {
  const suffix = nowTag();
  const studentPassword = "Pass1234!";

  const studentAIdentity = {
    name: `Verify Student A ${suffix}`,
    email: `verify.student.a.${suffix}@example.com`,
    password: studentPassword,
  };
  const studentBIdentity = {
    name: `Verify Student B ${suffix}`,
    email: `verify.student.b.${suffix}@example.com`,
    password: studentPassword,
  };

  console.log("Step 1/10: Authenticating users...");
  const [studentA, studentB, admin] = await Promise.all([
    registerOrLoginStudent(studentAIdentity),
    registerOrLoginStudent(studentBIdentity),
    loginAdmin(),
  ]);

  const tokenA = studentA.token;
  const tokenB = studentB.token;
  const tokenAdmin = admin.token;

  console.log("Step 2/10: Student A creates a post...");
  const createPost = await request("POST", "/api/posts", {
    token: tokenA,
    body: {
      title: `Verification post ${suffix}`,
      body: "This post is created by verification flow for authorization and status checks.",
      category: "General",
    },
  });
  assert(
    createPost.ok,
    `Create post failed: ${createPost.data?.message || createPost.status}`,
  );
  const postId = createPost.data._id;

  console.log("Step 3/10: Student B cannot resolve Student A post...");
  const unauthorizedResolve = await request(
    "PATCH",
    `/api/posts/${postId}/discussion-status`,
    {
      token: tokenB,
      body: { discussionStatus: "Resolved" },
    },
  );
  assert(
    unauthorizedResolve.status === 403,
    `Expected 403, got ${unauthorizedResolve.status}`,
  );

  console.log("Step 4/10: Student A resolves own post...");
  const ownerResolve = await request(
    "PATCH",
    `/api/posts/${postId}/discussion-status`,
    {
      token: tokenA,
      body: { discussionStatus: "Resolved" },
    },
  );
  assert(
    ownerResolve.ok,
    `Owner resolve failed: ${ownerResolve.data?.message || ownerResolve.status}`,
  );
  assert(
    ownerResolve.data.discussionStatus === "Resolved",
    "discussionStatus did not update to Resolved",
  );

  console.log("Step 5/10: Student B replies to post...");
  const replyRes = await request("POST", `/api/posts/${postId}/replies`, {
    token: tokenB,
    body: { text: "This is a helpful verification reply." },
  });
  assert(
    replyRes.ok,
    `Reply failed: ${replyRes.data?.message || replyRes.status}`,
  );
  const createdReply = replyRes.data.replies[replyRes.data.replies.length - 1];
  assert(createdReply?._id, "Reply id missing after creation");
  const replyId = createdReply._id;

  console.log("Step 6/10: Student A toggles helpful on reply...");
  const helpfulOn = await request(
    "PATCH",
    `/api/posts/${postId}/replies/${replyId}/helpful`,
    {
      token: tokenA,
    },
  );
  assert(
    helpfulOn.ok,
    `Helpful toggle on failed: ${helpfulOn.data?.message || helpfulOn.status}`,
  );
  const replyAfterOn = helpfulOn.data.replies.find((r) => r._id === replyId);
  assert(
    (replyAfterOn?.helpfulCount || 0) === 1,
    `Expected helpfulCount 1, got ${replyAfterOn?.helpfulCount || 0}`,
  );

  console.log("Step 7/10: Student A toggles helpful off reply...");
  const helpfulOff = await request(
    "PATCH",
    `/api/posts/${postId}/replies/${replyId}/helpful`,
    {
      token: tokenA,
    },
  );
  assert(
    helpfulOff.ok,
    `Helpful toggle off failed: ${helpfulOff.data?.message || helpfulOff.status}`,
  );
  const replyAfterOff = helpfulOff.data.replies.find((r) => r._id === replyId);
  assert(
    (replyAfterOff?.helpfulCount || 0) === 0,
    `Expected helpfulCount 0, got ${replyAfterOff?.helpfulCount || 0}`,
  );

  console.log("Step 8/10: Student B cannot delete Student A post...");
  const unauthorizedDelete = await request("DELETE", `/api/posts/${postId}`, {
    token: tokenB,
  });
  assert(
    unauthorizedDelete.status === 403,
    `Expected 403, got ${unauthorizedDelete.status}`,
  );

  console.log("Step 9/10: Admin hides post and student feed excludes it...");
  const hideRes = await request("PATCH", `/api/posts/${postId}/status`, {
    token: tokenAdmin,
    body: { status: "Hidden" },
  });
  assert(
    hideRes.ok,
    `Admin hide failed: ${hideRes.data?.message || hideRes.status}`,
  );

  const studentFeed = await request("GET", "/api/posts", { token: tokenA });
  assert(
    studentFeed.ok,
    `Student feed failed: ${studentFeed.data?.message || studentFeed.status}`,
  );
  const studentSeesPost =
    Array.isArray(studentFeed.data) &&
    studentFeed.data.some((p) => p._id === postId);
  assert(!studentSeesPost, "Hidden post is visible in student feed");

  const adminFeed = await request("GET", "/api/posts", { token: tokenAdmin });
  assert(
    adminFeed.ok,
    `Admin feed failed: ${adminFeed.data?.message || adminFeed.status}`,
  );
  const adminPost = Array.isArray(adminFeed.data)
    ? adminFeed.data.find((p) => p._id === postId)
    : null;
  assert(
    adminPost && adminPost.status === "Hidden",
    "Admin cannot see hidden post state",
  );

  console.log("Step 10/10: Cleanup by admin delete...");
  const adminDelete = await request("DELETE", `/api/posts/${postId}`, {
    token: tokenAdmin,
  });
  assert(
    adminDelete.ok,
    `Admin cleanup delete failed: ${adminDelete.data?.message || adminDelete.status}`,
  );

  console.log("--- Verification Result ---");
  console.log(
    "PASS: Discussion auth/status/helpful flow validated with Student A, Student B, and Admin.",
  );
}

run().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exit(1);
});
