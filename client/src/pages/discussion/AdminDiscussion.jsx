import { useState, useEffect, useRef } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORIES = [
  "All",
  "Exams",
  "Group Issues",
  "Lectures",
  "Campus Life",
  "General",
];
const SEARCH_MAX_LENGTH = 80;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseReportReason(rawReason) {
  const text = normalizeText(rawReason);
  if (!text) return { type: "Reported Content", details: "" };

  if (text.toLowerCase().startsWith("other:")) {
    return {
      type: "Other",
      details: normalizeText(text.slice(6)),
    };
  }

  const separator = " - ";
  const separatorIndex = text.indexOf(separator);
  if (separatorIndex >= 0) {
    return {
      type: normalizeText(text.slice(0, separatorIndex)),
      details: normalizeText(text.slice(separatorIndex + separator.length)),
    };
  }

  return { type: text, details: "" };
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

function AdminDiscussion() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [moderationFilter, setModerationFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const successTimerRef = useRef(null);

  const clearSuccessTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  const showSuccess = (message) => {
    clearSuccessTimer();
    setSuccessMsg(message);
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg("");
      successTimerRef.current = null;
    }, 3000);
  };

  // Fetch all posts from backend on mount
  useEffect(() => {
    let mounted = true;

    const loadPosts = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await api.get("/posts");
        if (!mounted) return;
        setPosts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!mounted) return;
        setLoadError(
          err.response?.data?.message || "Failed to load discussion posts.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPosts();

    return () => {
      mounted = false;
      clearSuccessTimer();
    };
  }, [reloadKey]);

  const handleHide = async (id) => {
    try {
      const post = posts.find((p) => p._id === id);
      if (!post) {
        alert("Post not found. Please refresh and try again.");
        return;
      }

      const newStatus = post.status === "Hidden" ? "Visible" : "Hidden";
      const res = await api.patch(`/posts/${id}/status`, { status: newStatus });
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
      showSuccess("Post status updated!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this post?")) {
      try {
        await api.delete(`/posts/${id}`);
        setPosts((prev) => prev.filter((p) => p._id !== id));
        showSuccess("Post deleted!");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete post");
      }
    }
  };

  const handleClearReports = async (id) => {
    try {
      const res = await api.patch(`/posts/${id}/reports/clear`);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.data : p)));
      showSuccess("Reports cleared. Post remains visible.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to clear reports");
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

  const filtered = posts
    .filter((p) =>
      moderationFilter === "reported" ? (p.reports || []).length > 0 : true,
    )
    .filter((p) => activeCategory === "All" || p.category === activeCategory)
    .filter((p) => {
      const q = normalizeText(search).slice(0, SEARCH_MAX_LENGTH).toLowerCase();
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
      );
    });

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Admin — Discussion Manager</h1>
        <p style={styles.subheading}>Review, hide, or remove student posts.</p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {loadError && (
          <div style={styles.errorBox}>
            <span>{loadError}</span>
            <button
              type="button"
              style={styles.retryBtn}
              onClick={() => setReloadKey((v) => v + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>Total: {posts.length}</div>
          <div style={styles.statBox}>
            Visible: {posts.filter((p) => p.status === "Visible").length}
          </div>
          <div style={styles.statBox}>
            Hidden: {posts.filter((p) => p.status === "Hidden").length}
          </div>
          <div style={styles.statBox}>
            Reported: {posts.filter((p) => (p.reports || []).length > 0).length}
          </div>
        </div>

        {/* Search */}
        <input
          style={styles.search}
          placeholder="Search by title or author..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value.slice(0, SEARCH_MAX_LENGTH))
          }
        />

        {/* Filter */}
        <div style={styles.moderationFilterRow}>
          <button
            type="button"
            style={{
              ...styles.moderationFilterBtn,
              ...(moderationFilter === "all"
                ? styles.moderationFilterActive
                : {}),
            }}
            onClick={() => setModerationFilter("all")}
          >
            All Posts
          </button>
          <button
            type="button"
            style={{
              ...styles.moderationFilterBtn,
              ...(moderationFilter === "reported"
                ? styles.moderationFilterActive
                : {}),
            }}
            onClick={() => setModerationFilter("reported")}
          >
            Reported Only
          </button>
        </div>

        {/* Category Filter */}
        <div style={styles.filterRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.filterBtn,
                ...(activeCategory === cat ? styles.filterActive : {}),
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div style={styles.emptyState}>Loading posts...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>No posts found.</div>
        ) : (
          filtered.map((post) => (
            <div
              key={post._id}
              style={{
                ...styles.postCard,
                opacity: post.status === "Hidden" ? 0.6 : 1,
              }}
            >
              <div style={styles.postHeader}>
                <div style={styles.badgeRow}>
                  <span style={styles.categoryBadge}>{post.category}</span>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      post.status === "Hidden"
                        ? "rgba(251, 113, 133, 0.12)"
                        : "rgba(52, 211, 153, 0.12)",
                    color:
                      post.status === "Hidden"
                        ? "var(--danger)"
                        : "var(--success)",
                  }}
                >
                  {post.status}
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
              <p style={styles.postMeta}>Moderator view</p>
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
              {(post.reports || []).length > 0 && (
                <div style={styles.reportBox}>
                  <div style={styles.reportTitle}>
                    User Reports ({post.reports.length})
                  </div>
                  {post.reports.slice(0, 4).map((report, index) => {
                    const parsedReason = parseReportReason(report.reason);
                    return (
                      <div
                        key={`${post._id}-report-${index}`}
                        style={styles.reportItemCard}
                      >
                        <div style={styles.reportMetaLine}>
                          <span style={styles.reportReporter}>
                            {report.reporterName}
                          </span>
                          <span style={styles.reportReasonBadge}>
                            {parsedReason.type}
                          </span>
                        </div>
                        {parsedReason.details ? (
                          <div style={styles.reportReasonText}>
                            {parsedReason.details}
                          </div>
                        ) : (
                          <div style={styles.reportReasonTextMuted}>
                            No additional details provided.
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {post.reports.length > 4 && (
                    <div style={styles.reportMoreText}>
                      +{post.reports.length - 4} more reports
                    </div>
                  )}
                </div>
              )}
              <div style={styles.actionClusters}>
                <div style={styles.actionPrimaryGroup}>
                  <button
                    style={styles.hidePrimaryBtn}
                    onClick={() => handleHide(post._id)}
                  >
                    {post.status === "Hidden" ? "Show" : "Hide"}
                  </button>
                </div>
                <div style={styles.actionSecondaryGroup}>
                  {(post.reports || []).length > 0 && (
                    <button
                      style={styles.clearReportBtn}
                      onClick={() => handleClearReports(post._id)}
                    >
                      Keep Post (Clear Reports)
                    </button>
                  )}
                </div>
                <div style={styles.actionDangerGroup}>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(post._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
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
  success: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    color: "#34d399",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontWeight: "600",
    border: "1px solid rgba(52, 211, 153, 0.25)",
  },
  errorBox: {
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    color: "var(--danger)",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontWeight: "600",
    border: "1px solid rgba(251, 113, 133, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  retryBtn: {
    border: "1px solid rgba(var(--accent2-rgb), 0.5)",
    backgroundColor: "rgba(var(--accent-rgb), 0.16)",
    color: "var(--text)",
    borderRadius: "10px",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  statsRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  statBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
    padding: "10px 18px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "14px",
    border: "1px solid rgba(255, 255, 255, 0.10)",
  },
  search: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid var(--panel-border)",
    marginBottom: "16px",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text)",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  moderationFilterRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  moderationFilterBtn: {
    padding: "7px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(var(--accent2-rgb), 0.30)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--muted)",
    fontWeight: "700",
  },
  moderationFilterActive: {
    backgroundColor: "rgba(var(--accent-rgb), 0.22)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.55)",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid var(--panel-border)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--muted)",
  },
  filterActive: {
    backgroundColor: "rgba(var(--accent-rgb), 0.20)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.45)",
  },
  postCard: {
    backgroundColor: "var(--panel)",
    borderRadius: "14px",
    padding: "20px",
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
  statusBadge: {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    color: "var(--text)",
  },
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
    marginBottom: "8px",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  postMeta: {
    color: "var(--muted2)",
    fontSize: "12px",
    marginBottom: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: "700",
  },
  reactionRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "14px",
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
  reportBox: {
    marginBottom: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(245, 158, 11, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: "10px 12px",
  },
  reportTitle: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#fbbf24",
    marginBottom: "8px",
  },
  reportItemCard: {
    backgroundColor: "rgba(2, 6, 23, 0.38)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    borderRadius: "10px",
    padding: "8px 10px",
    marginBottom: "8px",
  },
  reportMetaLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "6px",
    flexWrap: "wrap",
  },
  reportReporter: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#fef3c7",
  },
  reportReasonBadge: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#fbbf24",
    borderRadius: "999px",
    padding: "2px 10px",
    border: "1px solid rgba(245, 158, 11, 0.50)",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  reportReasonText: {
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--text)",
    lineHeight: "1.45",
  },
  reportReasonTextMuted: {
    fontSize: "13px",
    color: "var(--muted2)",
  },
  reportMoreText: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#fcd34d",
  },
  actionClusters: {
    display: "flex",
    gap: "10px 12px",
    alignItems: "flex-start",
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
  hidePrimaryBtn: {
    backgroundColor: "rgba(var(--accent-rgb), 0.24)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accent2-rgb), 0.55)",
    padding: "9px 15px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "800",
    boxShadow: "0 10px 20px rgba(var(--accent-rgb), 0.2)",
  },
  clearReportBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.13)",
    color: "#93c5fd",
    border: "1px solid rgba(59, 130, 246, 0.35)",
    padding: "9px 15px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "800",
  },
  hideBtn: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    color: "#fbbf24",
    border: "1px solid rgba(251, 191, 36, 0.35)",
    padding: "7px 14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "800",
  },
  deleteBtn: {
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    color: "var(--danger)",
    border: "1px solid rgba(251, 113, 133, 0.35)",
    padding: "9px 15px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "13px",
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
};

export default AdminDiscussion;
