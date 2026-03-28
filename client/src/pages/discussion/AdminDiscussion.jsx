import { useState, useEffect } from "react";
import api from "../../api";

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

function AdminDiscussion() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch all posts from backend on mount
  useEffect(() => {
    api
      .get("/posts")
      .then((res) => {
        setPosts(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleHide = async (id) => {
    try {
      const post = posts.find((p) => p._id === id);
      const newStatus = post.status === "Hidden" ? "Visible" : "Hidden";
      const res = await api.patch(`/posts/${id}/status`, { status: newStatus });
      setPosts(posts.map((p) => (p._id === id ? res.data : p)));
      setSuccessMsg("Post status updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this post?")) {
      try {
        await api.delete(`/posts/${id}`);
        setPosts(posts.filter((p) => p._id !== id));
        setSuccessMsg("Post deleted!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete post");
      }
    }
  };

  const filtered = posts
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

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>Total: {posts.length}</div>
          <div style={styles.statBox}>
            Visible: {posts.filter((p) => p.status === "Visible").length}
          </div>
          <div style={styles.statBox}>
            Hidden: {posts.filter((p) => p.status === "Hidden").length}
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
                <span style={styles.categoryBadge}>{post.category}</span>
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
              <h3 style={styles.postTitle}>{post.title}</h3>
              <p style={styles.postBody}>{post.body}</p>
              <p style={styles.postMeta}>
                By {post.author} •{" "}
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <div style={styles.actionRow}>
                <button
                  style={styles.hideBtn}
                  onClick={() => handleHide(post._id)}
                >
                  {post.status === "Hidden" ? "Show" : "Hide"}
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(post._id)}
                >
                  Delete
                </button>
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
    marginBottom: "8px",
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
  postTitle: { fontSize: "17px", color: "var(--text)", marginBottom: "6px" },
  postBody: {
    color: "var(--muted)",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "6px",
  },
  postMeta: { color: "var(--muted2)", fontSize: "12px", marginBottom: "12px" },
  actionRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
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
    padding: "7px 14px",
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
