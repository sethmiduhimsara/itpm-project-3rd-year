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

function StudentDiscussion() {
  const { addActivity } = useActivities();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", category: "Exams" });
  const [errors, setErrors] = useState({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [replyInputs, setReplyInputs] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [searchText, setSearchText] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });
  const [reportDialog, setReportDialog] = useState({
    open: false,
    postId: "",
    reasonOption: REPORT_REASONS[0],
    details: "",
    error: "",
  });
  const toastTimerRef = useRef(null);

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
    if (["feed", "thread", "mine", "create"].includes(view)) return view;
    return "feed";
  }, [searchParams]);

  const selectedPostId = searchParams.get("postId");

  useEffect(() => {
    setShowForm(activeView === "create");
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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
    return newErrors;
  };

  const handleSubmit = async () => {
    const foundErrors = validate();
    if (Object.keys(foundErrors).length > 0) {
      setErrors(foundErrors);
      return;
    }
    try {
      const payload = {
        title: normalizeText(form.title),
        body: normalizeText(form.body),
        category: form.category,
      };
      const res = await api.post("/posts", payload);
      setPosts((prev) => [res.data, ...prev]);
      setForm({ title: "", body: "", category: "Exams" });
      setErrors({});
      setShowForm(false);
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
    if (post?.discussionStatus === "Resolved") {
      setReplyErrors({
        ...replyErrors,
        [postId]: "This discussion is resolved. Reopen it to add replies.",
      });
      return;
    }

    const target = post;
    try {
      const res = await api.post(`/posts/${postId}/replies`, { text: reply });
      setPosts((prev) => prev.map((p) => (p._id === postId ? res.data : p)));
      setReplyInputs({ ...replyInputs, [postId]: "" });
      setReplyErrors({ ...replyErrors, [postId]: "" });
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

  const openThread = (postId) => {
    navigate(`/discussion?view=thread&postId=${postId}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Student Discussion Board</h1>
        <p style={styles.subheading}>
          Ask questions, share ideas, and help each other!
        </p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <div style={styles.controlPanel}>
          <div style={styles.controlTopRow}>
            <div style={styles.sectionLabel}>Discussion Views</div>
            {activeView !== "thread" && (
              <button
                style={styles.newPostBtn}
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? "Cancel" : "New Post"}
              </button>
            )}
          </div>

          <div style={styles.viewTabs}>
            {[
              { key: "feed", label: "Community Feed" },
              { key: "thread", label: "Thread View" },
              { key: "mine", label: "My Posts" },
              { key: "create", label: "Create Post" },
            ].map((tab) => (
              <button
                key={tab.key}
                style={{
                  ...styles.viewTabBtn,
                  ...(activeView === tab.key ? styles.viewTabActive : {}),
                }}
                onClick={() => navigate(`/discussion?view=${tab.key}`)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={styles.searchRow}>
            <input
              style={styles.search}
              placeholder="Search discussions by title, content, or author..."
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value.slice(0, SEARCH_MAX_LENGTH))
              }
            />
          </div>

          <div style={styles.sectionLabel}>Categories</div>
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
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Post Form */}
        {showForm && (
          <div style={styles.card}>
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

            <button style={styles.submitBtn} onClick={handleSubmit}>
              Post Discussion
            </button>
          </div>
        )}

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

        {/* Community feed / My posts list */}
        {activeView !== "thread" &&
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
    backgroundColor: "var(--panel)",
    border: "1px solid var(--panel-border)",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "18px",
    boxShadow: "0 14px 35px rgba(0, 0, 0, 0.14)",
  },
  controlTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  sectionLabel: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: "800",
    color: "var(--muted2)",
  },
  viewTabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  viewTabBtn: {
    padding: "9px 14px",
    minHeight: "38px",
    borderRadius: "20px",
    border: "1px solid var(--panel-border)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--muted)",
    fontWeight: "700",
  },
  viewTabActive: {
    backgroundColor: "rgba(var(--accent-rgb), 0.20)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.45)",
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
    minHeight: "44px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    color: "var(--text)",
  },
  searchRow: { marginBottom: "12px" },
  categoryRow: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    marginTop: "8px",
    marginBottom: "4px",
    flexWrap: "wrap",
  },
  categorySelect: {
    flex: "1 1 auto",
    minWidth: "220px",
    minHeight: "40px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    padding: "8px 12px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: "700",
    colorScheme: "dark",
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
    backgroundColor: "#0f172a",
    color: "#e7eaf2",
  },
  categoryResetBtn: {
    minHeight: "40px",
    borderRadius: "10px",
    border: "1px solid rgba(var(--accent2-rgb), 0.35)",
    padding: "0 14px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--muted)",
    fontWeight: "700",
  },
  newPostBtn: {
    backgroundColor: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "8px 14px",
    minHeight: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "12px",
    boxShadow: "0 10px 24px rgba(var(--accent-rgb), 0.25)",
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
