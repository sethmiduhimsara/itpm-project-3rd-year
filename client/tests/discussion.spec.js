import { test, expect } from "@playwright/test";

const currentUser = {
  _id: "user-student-01",
  name: "test01",
  email: "test01@university.edu",
  role: "student",
};

function nowIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function createSeedPosts() {
  return [
    {
      _id: "post-own-1",
      title: "Need help with database normalization",
      body: "Can someone explain 3NF with a practical university example?",
      category: "Lectures",
      author: "test01",
      createdAt: nowIso(-1),
      discussionStatus: "Open",
      status: "Visible",
      likesCount: 1,
      dislikesCount: 0,
      likedBy: [],
      dislikedBy: [],
      reports: [],
      replies: [
        {
          _id: "reply-1",
          text: "Start by identifying all transitive dependencies first.",
          author: "hashan",
          date: nowIso(-1),
          helpfulCount: 0,
        },
      ],
    },
    {
      _id: "post-other-1",
      title: "Exam past paper tips",
      body: "Share your best strategy for answering structured questions.",
      category: "Exams",
      author: "hashan",
      createdAt: nowIso(-2),
      discussionStatus: "Open",
      status: "Visible",
      likesCount: 0,
      dislikesCount: 0,
      likedBy: [],
      dislikedBy: [],
      reports: [],
      replies: [],
    },
    {
      _id: "post-other-2",
      title: "Campus cafeteria timings",
      body: "Is the canteen open after 6 PM during weekdays?",
      category: "Campus Life",
      author: "amaya",
      createdAt: nowIso(-3),
      discussionStatus: "Resolved",
      status: "Visible",
      likesCount: 0,
      dislikesCount: 0,
      likedBy: [],
      dislikedBy: [],
      reports: [],
      replies: [],
    },
  ];
}

async function saveShot(page, name) {
  await page.screenshot({
    path: `tests/screenshots/${name}.png`,
    fullPage: true,
  });
}

async function installDiscussionApiMocks(page) {
  let mockPosts = createSeedPosts();

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const path = url.pathname;

    const json = (status, data) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });

    if (method === "GET" && path === "/api/posts") {
      return json(200, mockPosts);
    }

    if (method === "POST" && path === "/api/posts") {
      const created = {
        _id: `post-new-${Date.now()}`,
        title: "Playwright created post",
        body: "This post was created through automated UI testing.",
        category: "Exams",
        author: currentUser.name,
        createdAt: new Date().toISOString(),
        discussionStatus: "Open",
        status: "Visible",
        likesCount: 0,
        dislikesCount: 0,
        likedBy: [],
        dislikedBy: [],
        reports: [],
        replies: [],
      };
      mockPosts = [created, ...mockPosts];
      return json(201, created);
    }

    const reactionMatch = path.match(/^\/api\/posts\/([^/]+)\/reaction$/);
    if (method === "PATCH" && reactionMatch) {
      const postId = reactionMatch[1];
      const payload = req.postDataJSON() || {};
      const reaction = payload.reaction;
      mockPosts = mockPosts.map((post) => {
        if (post._id !== postId) return post;
        if (reaction === "like") {
          return {
            ...post,
            likesCount: (post.likesCount || 0) + 1,
          };
        }
        if (reaction === "dislike") {
          return {
            ...post,
            dislikesCount: (post.dislikesCount || 0) + 1,
          };
        }
        return post;
      });
      const updated = mockPosts.find((p) => p._id === postId);
      return json(200, updated);
    }

    const replyMatch = path.match(/^\/api\/posts\/([^/]+)\/replies$/);
    if (method === "POST" && replyMatch) {
      const postId = replyMatch[1];
      const reply = {
        _id: `reply-new-${Date.now()}`,
        text: "Thanks, this helps a lot.",
        author: currentUser.name,
        date: new Date().toISOString(),
        helpfulCount: 0,
      };
      mockPosts = mockPosts.map((post) =>
        post._id === postId
          ? { ...post, replies: [...(post.replies || []), reply] }
          : post,
      );
      const updated = mockPosts.find((p) => p._id === postId);
      return json(200, updated);
    }

    const statusMatch = path.match(
      /^\/api\/posts\/([^/]+)\/discussion-status$/,
    );
    if (method === "PATCH" && statusMatch) {
      const postId = statusMatch[1];
      const payload = req.postDataJSON() || {};
      mockPosts = mockPosts.map((post) =>
        post._id === postId
          ? { ...post, discussionStatus: payload.discussionStatus || "Open" }
          : post,
      );
      const updated = mockPosts.find((p) => p._id === postId);
      return json(200, updated);
    }

    const reportMatch = path.match(/^\/api\/posts\/([^/]+)\/report$/);
    if (method === "POST" && reportMatch) {
      const postId = reportMatch[1];
      const payload = req.postDataJSON() || {};
      mockPosts = mockPosts.map((post) => {
        if (post._id !== postId) return post;
        const nextReports = Array.isArray(post.reports)
          ? [...post.reports]
          : [];
        nextReports.push({
          reporterId: currentUser._id,
          reason: payload.reason || "Spam or misleading content",
          createdAt: new Date().toISOString(),
        });
        return { ...post, reports: nextReports };
      });
      const updated = mockPosts.find((p) => p._id === postId);
      return json(200, updated);
    }

    const helpfulMatch = path.match(
      /^\/api\/posts\/([^/]+)\/replies\/([^/]+)\/helpful$/,
    );
    if (method === "PATCH" && helpfulMatch) {
      const postId = helpfulMatch[1];
      const replyId = helpfulMatch[2];
      mockPosts = mockPosts.map((post) => {
        if (post._id !== postId) return post;
        return {
          ...post,
          replies: (post.replies || []).map((reply) =>
            reply._id === replyId
              ? { ...reply, helpfulCount: (reply.helpfulCount || 0) + 1 }
              : reply,
          ),
        };
      });
      const updated = mockPosts.find((p) => p._id === postId);
      return json(200, updated);
    }

    const deleteMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const postId = deleteMatch[1];
      mockPosts = mockPosts.filter((post) => post._id !== postId);
      return json(200, { ok: true });
    }

    if (method === "GET" && path === "/api/activities") {
      return json(200, []);
    }

    if (method === "POST" && path === "/api/activities") {
      const payload = req.postDataJSON() || {};
      return json(201, { _id: `activity-${Date.now()}`, ...payload });
    }

    if (method === "GET" && path === "/api/help-requests") {
      return json(200, []);
    }

    if (method === "GET" && path === "/api/resources") {
      return json(200, []);
    }

    if (method === "GET" && path === "/api/notifications") {
      return json(200, []);
    }

    if (method === "PATCH" && path === "/api/notifications/mark-read") {
      return json(200, { ok: true });
    }

    return json(200, {});
  });
}

test.describe("Student Discussion Module", () => {
  test.beforeEach(async ({ page }) => {
    await installDiscussionApiMocks(page);

    await page.addInitScript((user) => {
      localStorage.setItem("uc_user", JSON.stringify(user));
      localStorage.setItem("uc_token", "mock-token-for-playwright");
    }, currentUser);

    await page.goto("/discussion?view=feed");
    await expect(
      page.getByRole("heading", { name: "Student Discussion Board" }),
    ).toBeVisible();
  });

  test("feed renders controls and post cards", async ({ page }) => {
    await expect(
      page.getByText("Explore conversations with quick filters"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Community Feed" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Search by title, content, or author"),
    ).toBeVisible();
    await expect(
      page.getByText("Need help with database normalization"),
    ).toBeVisible();
    await expect(page.getByText("Exam past paper tips")).toBeVisible();
    await saveShot(page, "discussion-feed");
  });

  test("search filters community feed results", async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      "Search by title, content, or author",
    );
    await searchInput.fill("normalization");

    await expect(
      page.getByText("Need help with database normalization"),
    ).toBeVisible();
    await expect(page.getByText("Exam past paper tips")).toHaveCount(0);
    await saveShot(page, "discussion-search");
  });

  test("category filter works on feed", async ({ page }) => {
    await page.locator("select").first().selectOption("Campus Life");

    await expect(page.getByText("Campus cafeteria timings")).toBeVisible();
    await expect(
      page.getByText("Need help with database normalization"),
    ).toHaveCount(0);
    await saveShot(page, "discussion-category");
  });

  test("thread view shows empty prompt when no post selected", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Thread View" }).click();
    await expect(
      page.getByText(
        "Select a post from Community Feed or My Posts to open a full thread view.",
      ),
    ).toBeVisible();
    await saveShot(page, "discussion-thread-empty");
  });

  test("open thread from feed and add reply", async ({ page }) => {
    await page.getByRole("button", { name: "Open Thread" }).first().click();
    await expect(page).toHaveURL(/view=thread/);

    const replyInput = page.getByPlaceholder("Write a reply...");
    await replyInput.fill("Thank you, this explanation is clear!");
    await page.getByRole("button", { name: "Reply" }).click();

    await expect(page.getByText("Thanks, this helps a lot.")).toBeVisible();
    await saveShot(page, "discussion-thread-reply");
  });

  test("my posts view shows only logged in user posts", async ({ page }) => {
    await page.getByRole("button", { name: "My Posts" }).click();
    await expect(page).toHaveURL(/view=mine/);

    await expect(
      page.getByText("Need help with database normalization"),
    ).toBeVisible();
    await expect(page.getByText("Exam past paper tips")).toHaveCount(0);
    await saveShot(page, "discussion-my-posts");
  });

  test("create post validates and submits successfully", async ({ page }) => {
    await page.getByRole("button", { name: "Create Post" }).click();
    await expect(
      page.getByRole("heading", { name: "Create a New Post" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Post Discussion" }).click();
    await expect(page.getByText("Title is required.")).toBeVisible();
    await expect(page.getByText("Description is required.")).toBeVisible();

    await page
      .getByPlaceholder("Enter a clear title (min 5 characters)")
      .fill("Playwright post title");
    await page
      .getByPlaceholder("Describe your topic in detail (min 10 characters)")
      .fill(
        "This is a full discussion body created by automated Playwright testing.",
      );
    await page.getByRole("button", { name: "Post Discussion" }).click();

    await expect(page.getByText("Post created successfully!")).toBeVisible();
    await page.getByRole("button", { name: "Community Feed" }).click();
    await expect(page.getByText("Playwright created post")).toBeVisible();
    await saveShot(page, "discussion-create-post");
  });

  test("owner can toggle discussion status and non-owner can report", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "My Posts" }).click();
    await page.getByRole("button", { name: "Mark Resolved" }).first().click();
    await expect(
      page.getByText("Discussion marked as Resolved."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mark Open" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Community Feed" }).click();
    await page.getByRole("button", { name: "Report Post" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Report Post" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Submit Report" }).click();
    await expect(page.getByText("Post reported successfully.")).toBeVisible();
    await saveShot(page, "discussion-status-report");
  });

  test("dashboard view renders metrics and opens thread from recent list", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Dashboard" }).click();

    await expect(page.getByText("Last 7 Days Activity")).toBeVisible();
    await expect(page.getByText("Recent Discussions")).toBeVisible();
    await page.getByRole("button", { name: "Open Thread" }).first().click();
    await expect(page).toHaveURL(/view=thread&postId=/);
    await saveShot(page, "discussion-dashboard");
  });
});
