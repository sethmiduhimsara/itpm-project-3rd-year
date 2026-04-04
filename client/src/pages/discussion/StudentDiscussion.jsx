import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useActivities } from "../../contexts/ActivityContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";

const CATEGORIES = [
  "All",
  "Exams",
  "Group Issues",
  "Lectures",
  "Campus Life",
  "General",
];

const DISCUSSION_STATUSES = ["Open", "Resolved"];
const SEARCH_MAX_LENGTH = 80;
const POST_BODY_MAX = 2000;
const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const REPLY_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const POST_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const REPLY_MAX = 500;
const REPORT_REASON_MIN = 5;
const REPORT_REASON_MAX = 280;
const REPORT_REASONS = [
  "Harassment or bullying",
  "Hate speech or discrimination",
  "Spam or misleading content",
  "Violence or harmful content",
  "Sexual or explicit content",
  "Other",
];

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getInitials(name) {
  const normalized = normalizeText(name);
  if (!normalized) return "U";
  return normalized
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPostImageUrl(imagePath) {
  const normalized = normalizeText(imagePath);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `http://localhost:5000${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

function StudentDiscussion() {
  const { addActivity } = useActivities();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", category: "Exams" });
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreviewUrl, setPostImagePreviewUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [replyInputs, setReplyInputs] = useState({});
  const [replyImageFiles, setReplyImageFiles] = useState({});
  const [replyImagePreviewUrls, setReplyImagePreviewUrls] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [searchText, setSearchText] = useState("");
  const [hoveredTab, setHoveredTab] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });
  const [reportDialog, setReportDialog] = useState({
    open: false,
    postId: "",
    reasonOption: REPORT_REASONS[0],
    details: "",
    error: "",
  });
  const toastTimerRef = useRef(null);
  const replyPreviewUrlsRef = useRef({});
  const createCardWrapRef = useRef(null);
  const createCardContentRef = useRef(null);
  const [createCardHeight, setCreateCardHeight] = useState(0);

  const showToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ show: true, message });
    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, message: "" });
      toastTimerRef.current = null;
    }, 2800);
  };

  // Fetch posts from backend on mount
  useEffect(() => {
    api
      .get("/posts")
      .then((res) => {
        setPosts(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeView = useMemo(() => {
    const view = (searchParams.get("view") || "feed").toLowerCase();
    if (["dashboard", "feed", "thread", "mine", "create"].includes(view))
      return view;
    return "feed";
  }, [searchParams]);

  const selectedPostId = searchParams.get("postId");

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setShowForm(activeView === "create");
  }, [activeView]);

  useEffect(() => {
    if (!showForm) return;
    const frameId = requestAnimationFrame(() => {
      createCardWrapRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [showForm]);

  useEffect(() => {
    const contentEl = createCardContentRef.current;
    if (!contentEl) return;

    const updateHeight = () => {
      setCreateCardHeight(contentEl.scrollHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateHeight());
      observer.observe(contentEl);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    replyPreviewUrlsRef.current = replyImagePreviewUrls;
  }, [replyImagePreviewUrls]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (postImagePreviewUrl) {
        URL.revokeObjectURL(postImagePreviewUrl);
      }
      Object.values(replyPreviewUrlsRef.current).forEach((previewUrl) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    };
  }, [postImagePreviewUrl]);

  const validate = () => {
    const newErrors = {};
    const normalizedTitle = normalizeText(form.title);
    const normalizedBody = normalizeText(form.body);

    if (!normalizedTitle) newErrors.title = "Title is required.";
    else if (normalizedTitle.length < 5)
      newErrors.title = "Title must be at least 5 characters.";
    else if (normalizedTitle.length > 100)
      newErrors.title = "Title must be under 100 characters.";
    if (!normalizedBody) newErrors.body = "Description is required.";
    else if (normalizedBody.length < 10)
      newErrors.body = "Description must be at least 10 characters.";
    else if (normalizedBody.length > POST_BODY_MAX)
      newErrors.body = `Description must be under ${POST_BODY_MAX} characters.`;
    if (
      !form.category ||
      !CATEGORIES.includes(form.category) ||
      form.category === "All"
    )
      newErrors.category = "Please select a valid category.";
    if (postImageFile && !POST_IMAGE_MIME_TYPES.has(postImageFile.type)) {
      newErrors.image = "Only JPG, PNG, WEBP, or GIF images are allowed.";
    }
    if (postImageFile && postImageFile.size > POST_IMAGE_MAX_BYTES) {
      newErrors.image = "Image size must be 5MB or less.";
    }
    return newErrors;
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }

    const nextErrors = { ...errors };
    delete nextErrors.image;

    if (!POST_IMAGE_MIME_TYPES.has(file.type)) {
      setErrors({
        ...nextErrors,
        image: "Only JPG, PNG, WEBP, or GIF images are allowed.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > POST_IMAGE_MAX_BYTES) {
      setErrors({
        ...nextErrors,
        image: "Image size must be 5MB or less.",
      });
      event.target.value = "";
      return;
    }

    if (postImagePreviewUrl) {
      URL.revokeObjectURL(postImagePreviewUrl);
    }

    setPostImageFile(file);
    setPostImagePreviewUrl(URL.createObjectURL(file));
    setErrors(nextErrors);
  };

  const clearSelectedImage = () => {
    if (postImagePreviewUrl) {
      URL.revokeObjectURL(postImagePreviewUrl);
    }
    setPostImagePreviewUrl("");
    setPostImageFile(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.image;
      return next;
    });
  };

  const validateReplyImageFile = (file) => {
    if (!file) return "";
    if (!POST_IMAGE_MIME_TYPES.has(file.type)) {
      return "Only JPG, PNG, WEBP, or GIF images are allowed.";
    }
    if (file.size > REPLY_IMAGE_MAX_BYTES) {
      return "Reply image size must be 3MB or less.";
    }
    return "";
  };

  const handleReplyImageChange = (postId, event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const fileError = validateReplyImageFile(file);
    if (fileError) {
      setReplyErrors((prev) => ({ ...prev, [postId]: fileError }));
      event.target.value = "";
      return;
    }

    setReplyErrors((prev) => ({ ...prev, [postId]: "" }));

    setReplyImagePreviewUrls((prev) => {
      if (prev[postId]) URL.revokeObjectURL(prev[postId]);
      return {
        ...prev,
        [postId]: URL.createObjectURL(file),
      };
    });

    setReplyImageFiles((prev) => ({
      ...prev,
      [postId]: file,
    }));
  };

  const clearReplyImage = (postId) => {
    setReplyImagePreviewUrls((prev) => {
      if (prev[postId]) URL.revokeObjectURL(prev[postId]);
      const next = { ...prev };
      delete next[postId];
      return next;
    });

    setReplyImageFiles((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  };

  const handleSubmit = async () => {
    const foundErrors = validate();
    if (Object.keys(foundErrors).length > 0) {
      setErrors(foundErrors);
      return;
    }
    try {
      const payload = new FormData();
      payload.append("title", normalizeText(form.title));
      payload.append("body", normalizeText(form.body));
      payload.append("category", form.category);
      if (postImageFile) {
        payload.append("image", postImageFile);
      }

      const res = await api.post("/posts", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPosts((prev) => [res.data, ...prev]);
      setForm({ title: "", body: "", category: "Exams" });
      clearSelectedImage();
      setErrors({});
      setShowForm(activeView === "create");
      setSuccessMsg("Post created successfully!");
      addActivity({
        type: "Discussion",
        description: `Posted: ${res.data.title}`,
        date: new Date().toISOString(),
      });
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create post");
    }
  };

  const handleReplySubmit = async (postId) => {
    const reply = normalizeText(replyInputs[postId] || "");
    const replyImageFile = replyImageFiles[postId] || null;
    const post = posts.find((p) => p._id === postId);

    if (!reply) {
      setReplyErrors({ ...replyErrors, [postId]: "Reply cannot be empty." });
      return;
    }
    if (reply.length < 3) {
      setReplyErrors({
        ...replyErrors,
        [postId]: "Reply must be at least 3 characters.",
      });
      return;
    }
    if (reply.length > REPLY_MAX) {
      setReplyErrors({
        ...replyErrors,
        [postId]: `Reply must be under ${REPLY_MAX} characters.`,
      });
      return;
    }
    const replyImageError = validateReplyImageFile(replyImageFile);
    if (replyImageError) {
      setReplyErrors({
        ...replyErrors,
        [postId]: replyImageError,
      });
      return;
    }
    if (post?.discussionStatus === "Resolved") {
      setReplyErrors({
        ...replyErrors,
        [postId]: "This discussion is resolved. Reopen it to add replies.",
      });
      return;
    }

    const target = post;
    try {
      const payload = new FormData();
      payload.append("text", reply);
      if (replyImageFile) {
        payload.append("replyImage", replyImageFile);
      }

      const res = await api.post(`/posts/${postId}/replies`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPosts((prev) => prev.map((p) => (p._id === postId ? res.data : p)));
      setReplyInputs({ ...replyInputs, [postId]: "" });
      setReplyErrors({ ...replyErrors, [postId]: "" });
      clearReplyImage(postId);
      addActivity({
        type: "Help Given",
        description: `Replied to: ${target?.title ?? "discussion"}`,
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post reply");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await api.delete(`/posts/${id}`);
        setPosts((prev) => prev.filter((p) => p._id !== id));
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete post");
      }
    }
  };

  const handleDiscussionStatus = async (postId, discussionStatus) => {
    if (!DISCUSSION_STATUSES.includes(discussionStatus)) return;
    try {
      const res = await api.patch(`/posts/${postId}/discussion-status`, {
        discussionStatus,
      });
      setPosts((prev) => prev.map((p) => (p._id === postId ? res.data : p)));
      setSuccessMsg(`Discussion marked as ${discussionStatus}.`);
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to update discussion status",
      );
    }
  };

  const handleToggleHelpful = async (postId, replyId) => {
    try {
      const res = await api.patch(
        `/posts/${postId}/replies/${replyId}/helpful`,
      );
      setPosts((prev) => prev.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to react to reply");
    }
  };

  const hasLikedByMe = (post) =>
    Array.isArray(post?.likedBy) &&
    post.likedBy.some((id) => String(id) === String(user?._id));

  const hasDislikedByMe = (post) =>
    Array.isArray(post?.dislikedBy) &&
    post.dislikedBy.some((id) => String(id) === String(user?._id));

  const handlePostReaction = async (postId, reaction) => {
    try {
      const res = await api.patch(`/posts/${postId}/reaction`, { reaction });
      setPosts((prev) => prev.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to react to post");
    }
  };

  const openReportDialog = (postId) => {
    setReportDialog({
      open: true,
      postId,
      reasonOption: REPORT_REASONS[0],
      details: "",
      error: "",
    });
  };

  const closeReportDialog = () => {
    setReportDialog({
      open: false,
      postId: "",
      reasonOption: REPORT_REASONS[0],
      details: "",
      error: "",
    });
  };

  const submitReport = async () => {
    const details = normalizeText(reportDialog.details);
    const isOther = reportDialog.reasonOption === "Other";
    const reason = isOther
      ? `Other: ${details}`
      : details
        ? `${reportDialog.reasonOption} - ${details}`
        : reportDialog.reasonOption;

    if (isOther && details.length < REPORT_REASON_MIN) {
      setReportDialog((prev) => ({
        ...prev,
        error: `Please enter at least ${REPORT_REASON_MIN} characters for Other reason.`,
      }));
      return;
    }
    if (reason.length > REPORT_REASON_MAX) {
      setReportDialog((prev) => ({
        ...prev,
        error: `Report reason must be under ${REPORT_REASON_MAX} characters.`,
      }));
      return;
    }

    try {
      const res = await api.post(`/posts/${reportDialog.postId}/report`, {
        reason,
      });
      setPosts((prev) =>
        prev.map((p) => (p._id === reportDialog.postId ? res.data : p)),
      );
      closeReportDialog();
      setSuccessMsg("Post reported to admin for review.");
      setTimeout(() => setSuccessMsg(""), 2500);
      showToast("Post reported successfully.");
    } catch (err) {
      setReportDialog((prev) => ({
        ...prev,
        error: err.response?.data?.message || "Failed to report post",
      }));
    }
  };

  const hasReportedByMe = (post) =>
    Array.isArray(post?.reports) &&
    post.reports.some((r) => String(r.reporterId) === String(user?._id));

  const filteredByCategory =
    activeCategory === "All"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const searchedPosts = filteredByCategory.filter((p) => {
    const q = normalizeText(searchText)
      .slice(0, SEARCH_MAX_LENGTH)
      .toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q)
    );
  });

  const myPosts = searchedPosts.filter((p) => p.author === user?.name);
  const selectedPost = posts.find((p) => p._id === selectedPostId);

  const visiblePosts = activeView === "mine" ? myPosts : searchedPosts;

  const dashboardMetrics = useMemo(() => {
    const safePosts = Array.isArray(searchedPosts) ? searchedPosts : [];
    const totalPosts = safePosts.length;
    const openPosts = safePosts.filter(
      (p) => (p.discussionStatus || "Open") !== "Resolved",
    ).length;
    const resolvedPosts = safePosts.filter(
      (p) => p.discussionStatus === "Resolved",
    ).length;
    const totalReplies = safePosts.reduce(
      (sum, p) => sum + (Array.isArray(p.replies) ? p.replies.length : 0),
      0,
    );
    const myPostCount = safePosts.filter((p) => p.author === user?.name).length;
    const myReplyCount = safePosts.reduce((sum, p) => {
      const replies = Array.isArray(p.replies) ? p.replies : [];
      return (
        sum + replies.filter((reply) => reply?.author === user?.name).length
      );
    }, 0);

    const categoryCounts = safePosts.reduce((acc, p) => {
      const key = p.category || "General";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topCategory =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    const today = new Date();
    const activityByDay = Array.from({ length: 7 }).map((_, idx) => {
      const dayDate = new Date(today);
      dayDate.setHours(0, 0, 0, 0);
      dayDate.setDate(today.getDate() - (6 - idx));

      const dayLabel = dayDate.toLocaleDateString(undefined, {
        weekday: "short",
      });
      const dateLabel = dayDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const dayValue = safePosts.filter((post) => {
        const created = new Date(post.createdAt);
        created.setHours(0, 0, 0, 0);
        return created.getTime() === dayDate.getTime();
      }).length;

      return { label: dayLabel, dateLabel, value: dayValue };
    });

    const weekTotal = activityByDay.reduce((sum, day) => sum + day.value, 0);
    const peakValue = activityByDay.reduce(
      (max, day) => (day.value > max ? day.value : max),
      0,
    );
    const peakDay =
      activityByDay.find((day) => day.value === peakValue && peakValue > 0) ||
      null;

    return {
      totalPosts,
      openPosts,
      resolvedPosts,
      totalReplies,
      myContributions: myPostCount + myReplyCount,
      topCategory,
      activityByDay,
      activityWeekTotal: weekTotal,
      activityPeakValue: peakValue,
      activityPeakDayLabel: peakDay
        ? `${peakDay.label} (${peakDay.dateLabel})`
        : "No activity yet",
    };
  }, [searchedPosts, user?.name]);

  const openThread = (postId) => {
    navigate(`/discussion?view=thread&postId=${postId}`);
  };

  const dashboardStatCards = [
    {
      key: "posts",
      label: "Posts in Scope",
      value: dashboardMetrics.totalPosts,
      icon: "P",
      hint: "Posts after current search/category filters",
      tint: "rgba(56, 189, 248, 0.18)",
    },
    {
      key: "open",
      label: "Open Discussions",
      value: dashboardMetrics.openPosts,
      icon: "O",
      hint: "Threads waiting for resolution",
      tint: "rgba(250, 204, 21, 0.18)",
    },
    {
      key: "resolved",
      label: "Resolved",
      value: dashboardMetrics.resolvedPosts,
      icon: "R",
      hint: "Threads marked as solved",
      tint: "rgba(52, 211, 153, 0.18)",
    },
    {
      key: "replies",
      label: "Replies",
      value: dashboardMetrics.totalReplies,
      icon: "C",
      hint: "Conversation replies across posts",
      tint: "rgba(167, 139, 250, 0.20)",
    },
    {
      key: "mine",
      label: "My Contributions",
      value: dashboardMetrics.myContributions,
      icon: "M",
      hint: "Your posts and replies combined",
      tint: "rgba(34, 197, 94, 0.20)",
    },
    {
      key: "top-category",
      label: "Top Category",
      value: dashboardMetrics.topCategory,
      icon: "T",
      hint: "Most active category right now",
      tint: "rgba(244, 114, 182, 0.20)",
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Student Discussion Board</h1>
        <p style={styles.subheading}>
          Ask questions, share ideas, and help each other!
        </p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <div style={styles.controlPanel}>
          <div style={styles.controlHero}>
            <div>
              <div style={styles.controlEyebrow}>Discussion Workspace</div>
              <div style={styles.controlTitle}>
                Explore conversations with quick filters
              </div>
            </div>
            {activeView !== "thread" && (
              <button
                style={styles.newPostBtn}
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Close Composer" : "New Post"}
              </button>
            )}
          </div>

          <div style={styles.viewTabsRail}>
            <div style={styles.viewTabs}>
              {[
                { key: "dashboard", label: "Dashboard" },
                { key: "feed", label: "Community Feed" },
                { key: "thread", label: "Thread View" },
                { key: "mine", label: "My Posts" },
                { key: "create", label: "Create Post" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  style={{
                    ...styles.viewTabBtn,
                    ...(hoveredTab === tab.key && activeView !== tab.key
                      ? styles.viewTabHover
                      : {}),
                    ...(activeView === tab.key ? styles.viewTabActive : {}),
                    ...(prefersReducedMotion ? styles.reduceMotion : {}),
                  }}
                  onClick={() => navigate(`/discussion?view=${tab.key}`)}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() =>
                    setHoveredTab((current) =>
                      current === tab.key ? "" : current,
                    )
                  }
                  onFocus={() => setHoveredTab(tab.key)}
                  onBlur={() =>
                    setHoveredTab((current) =>
                      current === tab.key ? "" : current,
                    )
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>Search</div>
              <input
                style={styles.search}
                placeholder="Search by title, content, or author"
                value={searchText}
                onChange={(e) =>
                  setSearchText(e.target.value.slice(0, SEARCH_MAX_LENGTH))
                }
              />
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>Category</div>
              <div style={styles.categoryRow}>
                <select
                  style={styles.categorySelect}
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} style={styles.selectOption}>
                      {cat}
                    </option>
                  ))}
                </select>
                {activeCategory !== "All" && (
                  <button
                    type="button"
                    style={styles.categoryResetBtn}
                    onClick={() => setActiveCategory("All")}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Post Form */}
        <div
          ref={createCardWrapRef}
          style={{
            ...styles.createCardWrap,
            ...(showForm
              ? styles.createCardWrapOpen(createCardHeight)
              : styles.createCardWrapClosed),
          }}
          aria-hidden={!showForm}
        >
          <div ref={createCardContentRef} style={styles.card}>
            <h3 style={styles.cardTitle}>Create a New Post</h3>

            <label style={styles.label}>Category *</label>
            <select
              style={{
                ...styles.selectInput,
                ...(errors.category ? styles.inputError : {}),
              }}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c} style={styles.selectOption}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && (
              <span style={styles.error}>{errors.category}</span>
            )}

            <label style={styles.label}>Post Title *</label>
            <input
              style={{
                ...styles.input,
                ...(errors.title ? styles.inputError : {}),
              }}
              placeholder="Enter a clear title (min 5 characters)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && <span style={styles.error}>{errors.title}</span>}

            <label style={styles.label}>Description *</label>
            <textarea
              style={{
                ...styles.textarea,
                ...(errors.body ? styles.inputError : {}),
              }}
              placeholder="Describe your topic in detail (min 10 characters)"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
            />
            {errors.body && <span style={styles.error}>{errors.body}</span>}

            <label style={styles.label}>Image (optional)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              style={styles.fileInput}
              onChange={handleImageChange}
            />
            <div style={styles.fileHint}>
              Supported: JPG, PNG, WEBP, GIF (max 5MB)
            </div>
            {errors.image && <span style={styles.error}>{errors.image}</span>}

            {postImagePreviewUrl && (
              <div style={styles.imagePreviewWrap}>
                <img
                  src={postImagePreviewUrl}
                  alt="Selected for post"
                  style={styles.imagePreview}
                />
                <button
                  type="button"
                  style={styles.removeImageBtn}
                  onClick={clearSelectedImage}
                >
                  Remove Image
                </button>
              </div>
            )}

            <button style={styles.submitBtn} onClick={handleSubmit}>
              Post Discussion
            </button>
          </div>
        </div>

        {/* Thread View */}
        {activeView === "thread" &&
          (loading ? (
            <div style={styles.emptyState}>Loading posts...</div>
          ) : selectedPost ? (
            <div style={styles.postCard}>
              <div style={styles.postHeader}>
                <div style={styles.badgeRow}>
                  <span style={styles.categoryBadge}>
                    {selectedPost.category}
                  </span>
                  <span
                    style={{
                      ...styles.discussionStatusBadge,
                      ...(selectedPost.discussionStatus === "Resolved"
                        ? styles.discussionResolved
                        : styles.discussionOpen),
                    }}
                  >
                    {selectedPost.discussionStatus || "Open"}
                  </span>
                </div>
                <span style={styles.postMeta}>
                  {new Date(selectedPost.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div style={styles.authorRow}>
                <span style={styles.authorAvatar}>
                  {getInitials(selectedPost.author)}
                </span>
                <div style={styles.authorTextBlock}>
                  <div style={styles.authorName}>{selectedPost.author}</div>
                  <div style={styles.authorDate}>
                    Posted on{" "}
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <h3 style={styles.postTitle}>{selectedPost.title}</h3>
              <p style={styles.postBody}>{selectedPost.body}</p>
              {selectedPost.imagePath && (
                <div style={styles.postImageWrap}>
                  <img
                    src={getPostImageUrl(selectedPost.imagePath)}
                    alt="Post attachment"
                    style={styles.postImage}
                    loading="lazy"
                  />
                </div>
              )}

              <div style={styles.reactionRow}>
                <button
                  style={{
                    ...styles.reactionBtn,
                    ...(hasLikedByMe(selectedPost)
                      ? styles.reactionLikeActive
                      : {}),
                  }}
                  onClick={() => handlePostReaction(selectedPost._id, "like")}
                >
                  👍 {selectedPost.likesCount || 0}
                </button>
                <button
                  style={{
                    ...styles.reactionBtn,
                    ...(hasDislikedByMe(selectedPost)
                      ? styles.reactionDislikeActive
                      : {}),
                  }}
                  onClick={() =>
                    handlePostReaction(selectedPost._id, "dislike")
                  }
                >
                  👎 {selectedPost.dislikesCount || 0}
                </button>
              </div>

              {selectedPost.author === user?.name && (
                <div style={styles.actionClusters}>
                  <div style={styles.actionSecondaryGroup}>
                    <button
                      style={styles.viewThreadBtn}
                      onClick={() =>
                        handleDiscussionStatus(
                          selectedPost._id,
                          selectedPost.discussionStatus === "Resolved"
                            ? "Open"
                            : "Resolved",
                        )
                      }
                    >
                      {selectedPost.discussionStatus === "Resolved"
                        ? "Mark Open"
                        : "Mark Resolved"}
                    </button>
                  </div>
                </div>
              )}

              {selectedPost.author !== user?.name && (
                <div style={styles.actionClusters}>
                  <div style={styles.actionSecondaryGroup}>
                    <button
                      style={styles.reportBtn}
                      onClick={() => openReportDialog(selectedPost._id)}
                      disabled={hasReportedByMe(selectedPost)}
                    >
                      {hasReportedByMe(selectedPost)
                        ? "Reported"
                        : "Report Post"}
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.repliesSection}>
                <div style={styles.repliesHeading}>
                  Thread Replies ({selectedPost.replies.length})
                </div>
                {selectedPost.replies.map((r, i) => (
                  <div key={r._id || i} style={styles.replyItemEnhanced}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.replyText}>{r.text}</div>
                      {r.imagePath && (
                        <div style={styles.replyImageWrap}>
                          <img
                            src={getPostImageUrl(r.imagePath)}
                            alt="Reply attachment"
                            style={styles.replyImage}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div style={styles.replyMeta}>
                        By {r.author || "Student"} • {r.date}
                      </div>
                    </div>
                    <button
                      style={styles.helpfulBtn}
                      onClick={() =>
                        handleToggleHelpful(selectedPost._id, r._id)
                      }
                      disabled={!r._id}
                    >
                      Helpful ({r.helpfulCount || 0})
                    </button>
                  </div>
                ))}
                <div style={styles.replyComposerBox}>
                  <div style={styles.replyForm}>
                    <input
                      style={{
                        ...styles.replyInput,
                        ...(replyErrors[selectedPost._id]
                          ? styles.inputError
                          : {}),
                      }}
                      placeholder="Write a reply..."
                      value={replyInputs[selectedPost._id] || ""}
                      onChange={(e) =>
                        setReplyInputs({
                          ...replyInputs,
                          [selectedPost._id]: e.target.value,
                        })
                      }
                    />
                    <button
                      style={styles.replyBtn}
                      onClick={() => handleReplySubmit(selectedPost._id)}
                    >
                      Reply
                    </button>
                  </div>
                  <div style={styles.replyAttachRow}>
                    <label style={styles.replyAttachLabel}>
                      Add image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        style={styles.hiddenFileInput}
                        onClick={(e) => {
                          e.currentTarget.value = "";
                        }}
                        onChange={(e) =>
                          handleReplyImageChange(selectedPost._id, e)
                        }
                      />
                    </label>
                    {replyImagePreviewUrls[selectedPost._id] && (
                      <button
                        type="button"
                        style={styles.replyRemoveImageBtn}
                        onClick={() => clearReplyImage(selectedPost._id)}
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  {replyImagePreviewUrls[selectedPost._id] && (
                    <img
                      src={replyImagePreviewUrls[selectedPost._id]}
                      alt="Reply image preview"
                      style={styles.replyImagePreview}
                    />
                  )}
                </div>
                {replyErrors[selectedPost._id] && (
                  <span style={styles.error}>
                    {replyErrors[selectedPost._id]}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              Select a post from Community Feed or My Posts to open a full
              thread view.
            </div>
          ))}

        {activeView === "dashboard" && (
          <>
            <div style={styles.dashboardStatsGrid}>
              {dashboardStatCards.map((card) => (
                <div key={card.key} style={styles.dashboardStatCard}>
                  <div style={styles.dashboardStatCardHeader}>
                    <span
                      style={{
                        ...styles.dashboardStatIcon,
                        backgroundColor: card.tint,
                      }}
                    >
                      {card.icon}
                    </span>
                    <div style={styles.dashboardStatLabel}>{card.label}</div>
                  </div>
                  <div
                    style={
                      typeof card.value === "string"
                        ? styles.dashboardStatValueText
                        : styles.dashboardStatValue
                    }
                  >
                    {card.value}
                  </div>
                  <div style={styles.dashboardStatMeta}>{card.hint}</div>
                </div>
              ))}
            </div>

            <div style={styles.dashboardPanel}>
              <div style={styles.dashboardPanelHeadRow}>
                <div>
                  <div style={styles.dashboardPanelTitle}>
                    Last 7 Days Activity
                  </div>
                  <div style={styles.dashboardActivityHint}>
                    Posts created each day, so you can quickly spot active
                    periods.
                  </div>
                </div>
                <div style={styles.dashboardActivitySummary}>
                  <div style={styles.dashboardActivitySummaryItem}>
                    <span style={styles.dashboardActivitySummaryLabel}>
                      Total
                    </span>
                    <span style={styles.dashboardActivitySummaryValue}>
                      {dashboardMetrics.activityWeekTotal}
                    </span>
                  </div>
                  <div style={styles.dashboardActivitySummaryItem}>
                    <span style={styles.dashboardActivitySummaryLabel}>
                      Peak Day
                    </span>
                    <span style={styles.dashboardActivitySummaryValueText}>
                      {dashboardMetrics.activityPeakDayLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div style={styles.dashboardTrendRow}>
                {dashboardMetrics.activityByDay.map((entry) => (
                  <div
                    key={`${entry.label}-${entry.dateLabel}`}
                    style={styles.dashboardTrendItem}
                    title={`${entry.label} ${entry.dateLabel}: ${entry.value} posts`}
                  >
                    <div style={styles.dashboardTrendTopRow}>
                      <div style={styles.dashboardTrendLabel}>
                        {entry.label}
                      </div>
                      <div style={styles.dashboardTrendValue}>
                        {entry.value}
                      </div>
                    </div>
                    <div style={styles.dashboardTrendBarTrack}>
                      <div
                        style={{
                          ...styles.dashboardTrendBarFill,
                          width: `${
                            dashboardMetrics.activityPeakValue > 0
                              ? Math.max(
                                  10,
                                  (entry.value /
                                    dashboardMetrics.activityPeakValue) *
                                    100,
                                )
                              : 0
                          }%`,
                          opacity: entry.value > 0 ? 1 : 0.35,
                        }}
                      />
                    </div>
                    <div style={styles.dashboardTrendDate}>
                      {entry.dateLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.dashboardPanel}>
              <div style={styles.dashboardPanelHeadRow}>
                <div style={styles.dashboardPanelTitle}>Recent Discussions</div>
                <button
                  type="button"
                  style={styles.dashboardQuickBtn}
                  onClick={() => navigate("/discussion?view=create")}
                >
                  + Create New
                </button>
              </div>

              {searchedPosts.length === 0 ? (
                <div style={styles.emptyState}>
                  No discussions available yet.
                </div>
              ) : (
                searchedPosts.slice(0, 5).map((post) => (
                  <div key={post._id} style={styles.dashboardListItem}>
                    <div style={styles.dashboardListMain}>
                      <div style={styles.dashboardListTitle}>{post.title}</div>
                      <div style={styles.dashboardListMeta}>
                        {post.category} • {post.author} •{" "}
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={styles.dashboardOpenThreadBtn}
                      onClick={() => openThread(post._id)}
                    >
                      Open Thread
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Community feed / My posts list */}
        {activeView !== "thread" &&
          activeView !== "dashboard" &&
          (loading ? (
            <div style={styles.emptyState}>Loading posts...</div>
          ) : visiblePosts.length === 0 ? (
            <div style={styles.emptyState}>
              {activeView === "mine"
                ? "You have not created posts yet."
                : "No posts in this category yet."}
            </div>
          ) : (
            visiblePosts.map((post) => (
              <div key={post._id} style={styles.postCard}>
                <div style={styles.postHeader}>
                  <div style={styles.badgeRow}>
                    <span style={styles.categoryBadge}>{post.category}</span>
                    <span
                      style={{
                        ...styles.discussionStatusBadge,
                        ...(post.discussionStatus === "Resolved"
                          ? styles.discussionResolved
                          : styles.discussionOpen),
                      }}
                    >
                      {post.discussionStatus || "Open"}
                    </span>
                  </div>
                  <span style={styles.postMeta}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={styles.authorRow}>
                  <span style={styles.authorAvatar}>
                    {getInitials(post.author)}
                  </span>
                  <div style={styles.authorTextBlock}>
                    <div style={styles.authorName}>{post.author}</div>
                    <div style={styles.authorDate}>
                      Posted on {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <h3 style={styles.postTitle}>{post.title}</h3>
                <p style={styles.postBody}>{post.body}</p>
                {post.imagePath && (
                  <div style={styles.postImageWrap}>
                    <img
                      src={getPostImageUrl(post.imagePath)}
                      alt="Post attachment"
                      style={styles.postImage}
                      loading="lazy"
                    />
                  </div>
                )}

                <div style={styles.reactionRow}>
                  <button
                    style={{
                      ...styles.reactionBtn,
                      ...(hasLikedByMe(post) ? styles.reactionLikeActive : {}),
                    }}
                    onClick={() => handlePostReaction(post._id, "like")}
                  >
                    👍 {post.likesCount || 0}
                  </button>
                  <button
                    style={{
                      ...styles.reactionBtn,
                      ...(hasDislikedByMe(post)
                        ? styles.reactionDislikeActive
                        : {}),
                    }}
                    onClick={() => handlePostReaction(post._id, "dislike")}
                  >
                    👎 {post.dislikesCount || 0}
                  </button>
                </div>

                <div style={styles.actionClusters}>
                  <div style={styles.actionPrimaryGroup}>
                    <button
                      style={styles.viewThreadPrimaryBtn}
                      onClick={() => openThread(post._id)}
                    >
                      Open Thread
                    </button>
                  </div>
                  <div style={styles.actionSecondaryGroup}>
                    {post.author !== user?.name && (
                      <button
                        style={styles.reportBtn}
                        onClick={() => openReportDialog(post._id)}
                        disabled={hasReportedByMe(post)}
                      >
                        {hasReportedByMe(post) ? "Reported" : "Report Post"}
                      </button>
                    )}
                    {post.author === user?.name && (
                      <button
                        style={styles.viewThreadBtn}
                        onClick={() =>
                          handleDiscussionStatus(
                            post._id,
                            post.discussionStatus === "Resolved"
                              ? "Open"
                              : "Resolved",
                          )
                        }
                      >
                        {post.discussionStatus === "Resolved"
                          ? "Mark Open"
                          : "Mark Resolved"}
                      </button>
                    )}
                  </div>
                  {post.author === user?.name && (
                    <div style={styles.actionDangerGroup}>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(post._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Replies */}
                <div style={styles.repliesSection}>
                  <div style={styles.repliesHeading}>
                    Replies ({post.replies.length})
                  </div>
                  {post.replies.map((r, i) => (
                    <div key={r._id || i} style={styles.replyItemEnhanced}>
                      <div style={{ flex: 1 }}>
                        <div style={styles.replyText}>{r.text}</div>
                        {r.imagePath && (
                          <div style={styles.replyImageWrap}>
                            <img
                              src={getPostImageUrl(r.imagePath)}
                              alt="Reply attachment"
                              style={styles.replyImage}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div style={styles.replyMeta}>
                          By {r.author || "Student"} • {r.date}
                        </div>
                      </div>
                      <button
                        style={styles.helpfulBtn}
                        onClick={() => handleToggleHelpful(post._id, r._id)}
                        disabled={!r._id}
                      >
                        Helpful ({r.helpfulCount || 0})
                      </button>
                    </div>
                  ))}
                  <div style={styles.replyComposerBox}>
                    <div style={styles.replyForm}>
                      <input
                        style={{
                          ...styles.replyInput,
                          ...(replyErrors[post._id] ? styles.inputError : {}),
                        }}
                        placeholder="Write a reply..."
                        value={replyInputs[post._id] || ""}
                        onChange={(e) =>
                          setReplyInputs({
                            ...replyInputs,
                            [post._id]: e.target.value,
                          })
                        }
                      />
                      <button
                        style={styles.replyBtn}
                        onClick={() => handleReplySubmit(post._id)}
                      >
                        Reply
                      </button>
                    </div>
                    <div style={styles.replyAttachRow}>
                      <label style={styles.replyAttachLabel}>
                        Add image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                          style={styles.hiddenFileInput}
                          onClick={(e) => {
                            e.currentTarget.value = "";
                          }}
                          onChange={(e) => handleReplyImageChange(post._id, e)}
                        />
                      </label>
                      {replyImagePreviewUrls[post._id] && (
                        <button
                          type="button"
                          style={styles.replyRemoveImageBtn}
                          onClick={() => clearReplyImage(post._id)}
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                    {replyImagePreviewUrls[post._id] && (
                      <img
                        src={replyImagePreviewUrls[post._id]}
                        alt="Reply image preview"
                        style={styles.replyImagePreview}
                      />
                    )}
                  </div>
                  {replyErrors[post._id] && (
                    <span style={styles.error}>{replyErrors[post._id]}</span>
                  )}
                </div>
              </div>
            ))
          ))}
        {reportDialog.open && (
          <div style={styles.reportOverlay} role="dialog" aria-modal="true">
            <div style={styles.reportModal}>
              <h3 style={styles.reportTitle}>Report Post</h3>
              <p style={styles.reportHint}>
                Select the main reason so admins can review quickly.
              </p>

              <label style={styles.label}>Reason *</label>
              <select
                style={styles.selectInput}
                value={reportDialog.reasonOption}
                onChange={(e) =>
                  setReportDialog((prev) => ({
                    ...prev,
                    reasonOption: e.target.value,
                    error: "",
                  }))
                }
              >
                {REPORT_REASONS.map((reason) => (
                  <option
                    key={reason}
                    value={reason}
                    style={styles.selectOption}
                  >
                    {reason}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Additional Details</label>
              <textarea
                style={styles.textarea}
                rows={3}
                placeholder="Optional details for admin review"
                value={reportDialog.details}
                onChange={(e) =>
                  setReportDialog((prev) => ({
                    ...prev,
                    details: e.target.value,
                    error: "",
                  }))
                }
              />

              {reportDialog.error && (
                <span style={styles.error}>{reportDialog.error}</span>
              )}

              <div style={styles.reportActionRow}>
                <button
                  style={styles.reportCancelBtn}
                  onClick={closeReportDialog}
                >
                  Cancel
                </button>
                <button style={styles.reportSubmitBtn} onClick={submitReport}>
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div style={styles.toast} role="status" aria-live="polite">
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "0", padding: 0, backgroundColor: "transparent" },
  container: { maxWidth: "860px", margin: "0 auto" },
  heading: { fontSize: "28px", color: "var(--text)", marginBottom: "6px" },
  subheading: { color: "var(--muted)", marginBottom: "20px" },
  controlPanel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "20px",
    boxShadow: "var(--shadow-lg)",
    transition: "border-color 180ms ease, box-shadow 220ms ease",
  },
  controlHero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  controlEyebrow: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    fontWeight: "800",
    color: "var(--muted2)",
  },
  controlTitle: {
    fontSize: "16px",
    color: "var(--text)",
    fontWeight: "800",
    marginTop: "3px",
  },
  viewTabsRail: {
    backgroundColor: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "8px",
    marginBottom: "14px",
  },
  viewTabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "nowrap",
    overflowX: "auto",
    overflowY: "visible",
    padding: "2px 2px 6px",
    alignItems: "center",
  },
  viewTabBtn: {
    padding: "9px 15px",
    minHeight: "40px",
    borderRadius: "999px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface)",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--muted)",
    fontWeight: "700",
    whiteSpace: "nowrap",
    outline: "none",
    transform: "none",
    boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
    transition:
      "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 220ms ease",
  },
  viewTabHover: {
    backgroundColor: "var(--surface2)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent-rgb), 0.45)",
    boxShadow: "var(--shadow)",
  },
  viewTabActive: {
    backgroundColor: "rgba(var(--accent-rgb), 0.10)",
    color: "var(--accent)",
    border: "1px solid rgba(var(--accent-rgb), 0.6)",
    boxShadow: "var(--shadow)",
  },
  reduceMotion: {
    transition: "none",
    transform: "none",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(220px, 1fr)",
    gap: "12px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fieldLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "800",
    color: "var(--muted2)",
  },
  dashboardStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  dashboardStatCard: {
    backgroundColor: "var(--panel)",
    border: "1px solid var(--panel-border)",
    borderRadius: "14px",
    padding: "14px 14px 12px",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.15)",
  },
  dashboardStatCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  dashboardStatIcon: {
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text)",
    fontSize: "11px",
    fontWeight: "900",
    border: "1px solid rgba(255, 255, 255, 0.22)",
    flexShrink: 0,
  },
  dashboardStatLabel: {
    fontSize: "11px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted2)",
  },
  dashboardStatValue: {
    fontSize: "34px",
    fontWeight: "900",
    lineHeight: 1,
    color: "var(--text)",
    marginBottom: "8px",
  },
  dashboardStatValueText: {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: 1.2,
    color: "var(--text)",
    marginBottom: "8px",
    wordBreak: "break-word",
  },
  dashboardStatMeta: {
    fontSize: "12px",
    color: "var(--muted2)",
    lineHeight: 1.35,
  },
  dashboardPanel: {
    backgroundColor: "var(--panel)",
    border: "1px solid var(--panel-border)",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "16px",
    boxShadow: "0 16px 38px rgba(0, 0, 0, 0.14)",
  },
  dashboardPanelHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  dashboardPanelTitle: {
    fontSize: "16px",
    fontWeight: "800",
    color: "var(--text)",
    marginBottom: "10px",
  },
  dashboardActivityHint: {
    fontSize: "12px",
    color: "var(--muted2)",
    marginTop: "-4px",
  },
  dashboardActivitySummary: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  dashboardActivitySummaryItem: {
    border: "1px solid var(--panel-border)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: "10px",
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  dashboardActivitySummaryLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "var(--muted2)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  dashboardActivitySummaryValue: {
    fontSize: "16px",
    fontWeight: "900",
    color: "var(--text)",
  },
  dashboardActivitySummaryValueText: {
    fontSize: "12px",
    fontWeight: "800",
    color: "var(--text)",
  },
  dashboardTrendRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "8px",
  },
  dashboardTrendItem: {
    border: "1px solid var(--panel-border)",
    borderRadius: "10px",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  dashboardTrendTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "7px",
    gap: "8px",
  },
  dashboardTrendBarTrack: {
    width: "100%",
    height: "8px",
    borderRadius: "999px",
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    overflow: "hidden",
    marginBottom: "7px",
  },
  dashboardTrendBarFill: {
    height: "100%",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, rgba(var(--accent-rgb), 0.95), rgba(var(--accent2-rgb), 0.95))",
    minWidth: "0%",
    transition: "width 220ms ease",
  },
  dashboardTrendValue: {
    fontSize: "16px",
    fontWeight: "800",
    color: "var(--text)",
  },
  dashboardTrendLabel: {
    fontSize: "12px",
    color: "var(--muted)",
    fontWeight: "700",
  },
  dashboardTrendDate: {
    fontSize: "11px",
    color: "var(--muted2)",
    fontWeight: "600",
  },
  dashboardQuickBtn: {
    border: "1px solid rgba(var(--accent2-rgb), 0.4)",
    backgroundColor: "rgba(var(--accent-rgb), 0.14)",
    color: "var(--text)",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "12px",
  },
  dashboardListItem: {
    border: "1px solid var(--panel-border)",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  dashboardListMain: {
    flex: 1,
    minWidth: 0,
  },
  dashboardListTitle: {
    fontSize: "15px",
    fontWeight: "800",
    color: "var(--text)",
    marginBottom: "4px",
    wordBreak: "break-word",
  },
  dashboardListMeta: {
    fontSize: "12px",
    color: "var(--muted2)",
  },
  dashboardOpenThreadBtn: {
    border: "1px solid rgba(var(--accent2-rgb), 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  success: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    color: "#34d399",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontWeight: "600",
    border: "1px solid rgba(52, 211, 153, 0.25)",
  },
  search: {
    width: "100%",
    padding: "11px 14px",
    minHeight: "42px",
    borderRadius: "12px",
    border: "1.5px solid var(--border)",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "var(--surface2)",
    color: "var(--text)",
  },
  categoryRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  categorySelect: {
    flex: "1 1 auto",
    minWidth: "170px",
    minHeight: "42px",
    borderRadius: "12px",
    border: "1.5px solid var(--border)",
    padding: "8px 10px",
    backgroundColor: "var(--surface2)",
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: "600",
    colorScheme: "light",
  },
  selectInput: {
    width: "100%",
    minHeight: "42px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    marginBottom: "5px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
    fontWeight: "700",
    colorScheme: "dark",
  },
  selectOption: {
    backgroundColor: "var(--surface)",
    color: "var(--text)",
  },
  categoryResetBtn: {
    minHeight: "42px",
    borderRadius: "12px",
    border: "1px solid rgba(var(--accent2-rgb), 0.35)",
    padding: "0 12px",
    backgroundColor: "rgba(var(--accent-rgb), 0.16)",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--text)",
    fontWeight: "700",
  },
  newPostBtn: {
    backgroundColor: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "10px 14px",
    minHeight: "42px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "12px",
    boxShadow: "0 12px 28px rgba(var(--accent-rgb), 0.30)",
  },
  createCardWrap: {
    overflow: "hidden",
    transformOrigin: "top center",
    transition:
      "max-height 280ms ease, opacity 220ms ease, transform 280ms ease, margin-bottom 220ms ease",
  },
  createCardWrapOpen: (height) => ({
    maxHeight: `${Math.max(height, 1)}px`,
    opacity: 1,
    transform: "translateY(0)",
    marginBottom: "24px",
    pointerEvents: "auto",
  }),
  createCardWrapClosed: {
    maxHeight: "0px",
    opacity: 0,
    transform: "translateY(-8px)",
    marginBottom: "0px",
    pointerEvents: "none",
  },
  card: {
    backgroundColor: "var(--panel)",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 18px 45px rgba(0, 0, 0, 0.25)",
    border: "1px solid var(--panel-border)",
  },
  cardTitle: { marginBottom: "16px", color: "var(--text)", fontSize: "18px" },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "700",
    fontSize: "14px",
    color: "var(--muted)",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    marginBottom: "5px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    marginBottom: "5px",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
  },
  fileInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1.5px dashed var(--panel-border)",
    marginBottom: "4px",
    fontSize: "13px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    color: "var(--text)",
    boxSizing: "border-box",
  },
  fileHint: {
    color: "var(--muted2)",
    fontSize: "12px",
    marginBottom: "8px",
  },
  imagePreviewWrap: {
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: "10px",
    marginBottom: "10px",
  },
  imagePreview: {
    width: "100%",
    maxHeight: "340px",
    objectFit: "contain",
    borderRadius: "10px",
    display: "block",
    marginBottom: "10px",
    backgroundColor: "rgba(2, 6, 23, 0.4)",
  },
  removeImageBtn: {
    border: "1px solid rgba(251, 113, 133, 0.35)",
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    color: "var(--danger)",
    borderRadius: "10px",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
  },
  inputError: { border: "1.5px solid rgba(251, 113, 133, 0.85)" },
  error: {
    color: "var(--danger)",
    fontSize: "12px",
    marginBottom: "10px",
    display: "block",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "12px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
    marginTop: "8px",
    fontSize: "14px",
  },
  postCard: {
    backgroundColor: "var(--panel)",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "16px",
    boxShadow: "0 18px 45px rgba(0, 0, 0, 0.18)",
    border: "1px solid var(--panel-border)",
  },
  postHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    gap: "10px",
    flexWrap: "wrap",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: "rgba(var(--accent-rgb), 0.18)",
    color: "var(--text)",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid rgba(var(--accent2-rgb), 0.40)",
  },
  discussionStatusBadge: {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid rgba(255,255,255,0.20)",
  },
  discussionOpen: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    color: "#34d399",
    border: "1px solid rgba(52, 211, 153, 0.35)",
  },
  discussionResolved: {
    backgroundColor: "rgba(96, 165, 250, 0.14)",
    color: "#60a5fa",
    border: "1px solid rgba(96, 165, 250, 0.40)",
  },
  postMeta: { color: "var(--muted2)", fontSize: "12px" },
  authorRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  authorAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "999px",
    backgroundColor: "rgba(var(--accent-rgb), 0.22)",
    border: "1px solid rgba(var(--accent2-rgb), 0.45)",
    color: "var(--text)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "800",
    flexShrink: 0,
  },
  authorTextBlock: { display: "flex", flexDirection: "column", gap: "2px" },
  authorName: { color: "var(--text)", fontSize: "14px", fontWeight: "700" },
  authorDate: { color: "var(--muted2)", fontSize: "12px" },
  postTitle: {
    fontSize: "clamp(20px, 2.3vw, 28px)",
    color: "var(--text)",
    marginBottom: "10px",
    lineHeight: "1.2",
    letterSpacing: "-0.01em",
    fontWeight: "800",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  postBody: {
    color: "var(--muted)",
    fontSize: "clamp(15px, 1.4vw, 18px)",
    lineHeight: "1.65",
    marginBottom: "16px",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  postImageWrap: {
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: "8px",
    marginBottom: "16px",
  },
  postImage: {
    width: "100%",
    maxHeight: "460px",
    objectFit: "contain",
    borderRadius: "10px",
    display: "block",
    backgroundColor: "rgba(2, 6, 23, 0.38)",
  },
  actionClusters: {
    display: "flex",
    gap: "10px 12px",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  actionPrimaryGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  actionSecondaryGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  actionDangerGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  reactionRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  reactionBtn: {
    border: "1px solid var(--panel-border)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "var(--text)",
    padding: "8px 14px",
    minHeight: "38px",
    borderRadius: "999px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    minWidth: "84px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    transition: "transform 120ms ease, border-color 120ms ease",
  },
  reactionLikeActive: {
    backgroundColor: "rgba(52, 211, 153, 0.18)",
    border: "1px solid rgba(52, 211, 153, 0.5)",
    color: "#6ee7b7",
  },
  reactionDislikeActive: {
    backgroundColor: "rgba(251, 113, 133, 0.16)",
    border: "1px solid rgba(251, 113, 133, 0.45)",
    color: "#fda4af",
  },
  viewThreadBtn: {
    backgroundColor: "rgba(var(--accent2-rgb), 0.22)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.42)",
    padding: "8px 14px",
    minHeight: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
  },
  viewThreadPrimaryBtn: {
    backgroundColor: "rgba(var(--accent-rgb), 0.24)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.55)",
    padding: "8px 15px",
    minHeight: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "800",
    boxShadow: "0 10px 20px rgba(var(--accent-rgb), 0.2)",
  },
  deleteBtn: {
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    color: "var(--danger)",
    border: "1px solid rgba(251, 113, 133, 0.35)",
    padding: "8px 14px",
    minHeight: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
  },
  reportBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.13)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.42)",
    padding: "8px 14px",
    minHeight: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
  },
  repliesSection: {
    borderTop: "1px solid rgba(255, 255, 255, 0.10)",
    paddingTop: "14px",
    marginTop: "2px",
  },
  repliesHeading: {
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: "800",
    marginBottom: "10px",
  },
  replyItemEnhanced: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: "8px 12px",
    borderRadius: "12px",
    marginTop: "10px",
    fontSize: "13px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  replyText: { color: "var(--text)" },
  replyImageWrap: {
    marginTop: "8px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: "6px",
  },
  replyImage: {
    width: "100%",
    maxHeight: "260px",
    objectFit: "contain",
    borderRadius: "8px",
    display: "block",
    backgroundColor: "rgba(2, 6, 23, 0.38)",
  },
  replyMeta: { color: "var(--muted2)", fontSize: "11px", marginTop: "2px" },
  helpfulBtn: {
    backgroundColor: "rgba(var(--accent-rgb), 0.16)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.40)",
    padding: "6px 10px",
    minHeight: "34px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  replyDate: { color: "var(--muted2)", fontSize: "11px", fontWeight: "600" },
  replyComposerBox: {
    marginTop: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    padding: "10px",
  },
  replyForm: { display: "flex", gap: "10px", marginTop: "0" },
  replyAttachRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap",
  },
  replyAttachLabel: {
    border: "1px solid rgba(var(--accent2-rgb), 0.40)",
    backgroundColor: "rgba(var(--accent-rgb), 0.12)",
    color: "var(--text)",
    borderRadius: "9px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  hiddenFileInput: {
    display: "none",
  },
  replyRemoveImageBtn: {
    border: "1px solid rgba(251, 113, 133, 0.35)",
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    color: "var(--danger)",
    borderRadius: "9px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
  },
  replyImagePreview: {
    width: "100%",
    maxHeight: "240px",
    objectFit: "contain",
    borderRadius: "9px",
    display: "block",
    marginTop: "10px",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(2, 6, 23, 0.38)",
    padding: "6px",
    boxSizing: "border-box",
  },
  replyInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    fontSize: "13px",
    minHeight: "40px",
    outline: "none",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
  },
  replyBtn: {
    backgroundColor: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "10px 16px",
    minHeight: "40px",
    minWidth: "96px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
  },
  emptyState: {
    textAlign: "center",
    color: "var(--muted2)",
    padding: "40px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: "14px",
    border: "1px dashed rgba(var(--accent2-rgb), 0.35)",
  },
  reportOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    zIndex: 80,
  },
  reportModal: {
    width: "100%",
    maxWidth: "520px",
    borderRadius: "14px",
    border: "1px solid var(--panel-border)",
    backgroundColor: "#111827",
    boxShadow: "0 22px 48px rgba(0, 0, 0, 0.45)",
    padding: "18px",
  },
  reportTitle: {
    margin: 0,
    color: "var(--text)",
    fontSize: "20px",
  },
  reportHint: {
    margin: "6px 0 14px",
    color: "var(--muted)",
    fontSize: "13px",
  },
  reportActionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "10px",
  },
  reportCancelBtn: {
    border: "1px solid rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
    borderRadius: "10px",
    padding: "8px 14px",
    minHeight: "36px",
    cursor: "pointer",
    fontWeight: "700",
  },
  reportSubmitBtn: {
    border: "1px solid rgba(245, 158, 11, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.20)",
    color: "#fbbf24",
    borderRadius: "10px",
    padding: "8px 14px",
    minHeight: "36px",
    cursor: "pointer",
    fontWeight: "800",
  },
  toast: {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    borderRadius: "12px",
    border: "1px solid rgba(52, 211, 153, 0.45)",
    backgroundColor: "rgba(52, 211, 153, 0.16)",
    color: "#34d399",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "800",
    zIndex: 90,
    boxShadow: "0 14px 28px rgba(0, 0, 0, 0.35)",
  },
};

export default StudentDiscussion;
