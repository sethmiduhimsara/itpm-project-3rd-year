import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api";
import {
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Clock3,
  MoreVertical,
} from "lucide-react";

const URGENCY_COLORS = {
  Low: "#34d399",
  Medium: "#fbbf24",
  High: "#ef4444",
};

function HelpRequestDashboard() {
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const navigate = useNavigate();

  const normalizeRequest = (req) => ({
    ...req,
    responses: Array.isArray(req?.responses) ? req.responses : [],
  });

  const [myRequests, setMyRequests] = useState([]);
  const [helpingRequests, setHelpingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.name) return;

    const fetchData = async () => {
      try {
        const [myRes, helpRes, targetRes] = await Promise.all([
          api.get(`/help-requests?requester=${user.name}`),
          api.get(`/help-requests?acceptedByUserId=${user._id}`),
          api.get(`/help-requests?targetStudent=${user.name}`),
        ]);
        const myData = Array.isArray(myRes.data) ? myRes.data : [];
        const helpData = Array.isArray(helpRes.data) ? helpRes.data : [];
        const targetData = Array.isArray(targetRes.data) ? targetRes.data : [];

        setMyRequests(myData.map(normalizeRequest));
        // Combine requests I accepted + private requests shared with me
        const combinedHelping = [...helpData];
        targetData.forEach((tr) => {
          if (!combinedHelping.find((ch) => ch._id === tr._id)) {
            combinedHelping.push(tr);
          }
        });
        setHelpingRequests(combinedHelping.map(normalizeRequest));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.name]);

  const stats = [
    {
      label: "My Requests",
      value: myRequests.length,
      icon: FileText,
      color: "var(--accent)",
    },
    {
      label: "Active Helping",
      value: helpingRequests.filter((r) => r.status === "In Progress").length,
      icon: Users,
      color: "var(--accent2)",
    },
    {
      label: "Completed",
      value:
        myRequests.filter((r) => r.status === "Closed").length +
        helpingRequests.filter((r) => r.status === "Closed").length,
      icon: CheckCircle2,
      color: "#10b981",
    },
    {
      label: "Urgent My Side",
      value: myRequests.filter(
        (r) => r.urgency === "High" && r.status !== "Closed",
      ).length,
      icon: AlertCircle,
      color: "#ef4444",
    },
  ];

  if (loading)
    return <div style={styles.loading}>Preparing your dashboard...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>My Help Dashboard</h1>
            <p style={styles.subtitle}>
              Track your help requests and pending tasks.
            </p>
          </div>
          <button
            style={styles.newBtn}
            onClick={() => navigate("/help-request/new")}
          >
            + Post New Request
          </button>
        </header>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          {stats.map((s, i) => (
            <div key={i} style={styles.statCard}>
              <div
                style={{
                  ...styles.statIconBox,
                  backgroundColor: `${s.color}20`,
                  color: s.color,
                }}
              >
                <s.icon size={20} />
              </div>
              <div>
                <div style={styles.statLabel}>{s.label}</div>
                <div style={styles.statValue}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tables Section */}
        <div style={styles.sectionsGrid}>
          {/* My Requests */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Manage My Requests</h2>
              <button
                style={styles.viewAll}
                onClick={() => navigate("/help-request")}
              >
                View All Feed →
              </button>
            </div>
            <div style={styles.list}>
              {myRequests.length === 0 ? (
                <div style={styles.empty}>
                  You haven't posted any help requests yet.
                </div>
              ) : (
                myRequests.slice(0, 5).map((req) => (
                  <div
                    key={req._id}
                    style={{ ...styles.listItem, cursor: "pointer" }}
                    onClick={() => navigate(`/help-request/chat/${req._id}`)}
                  >
                    <div style={styles.itemMain}>
                      <div style={styles.itemTitle}>{req.title}</div>
                      <div style={styles.itemMeta}>
                        <Clock3 size={12} style={{ marginRight: "4px" }} />
                        {new Date(req.createdAt).toLocaleDateString()} •{" "}
                        {req.subject}
                      </div>
                    </div>
                    <div style={styles.itemRight}>
                      <span
                        style={{
                          ...styles.urgencyDot,
                          backgroundColor: URGENCY_COLORS[req.urgency],
                        }}
                      />
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor:
                            req.status === "Open"
                              ? "rgba(52,211,153,0.1)"
                              : "rgba(251,191,36,0.1)",
                          color: req.status === "Open" ? "#34d399" : "#fbbf24",
                        }}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Requests I'm Helping With */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>My Tasks (Helping)</h2>
            </div>
            <div style={styles.list}>
              {helpingRequests.filter((r) => r.status !== "Closed").length ===
              0 ? (
                <div style={styles.empty}>
                  No active helping tasks. Explore the feed to help!
                </div>
              ) : (
                helpingRequests
                  .filter((r) => r.status !== "Closed")
                  .map((req) => (
                    <div key={req._id} style={styles.listItem}>
                      <div style={styles.itemMain}>
                        <div style={styles.itemTitle}>{req.title}</div>
                        <div style={styles.itemMeta}>
                          By {req.requester} • {req.responses?.length ?? 0}{" "}
                          responses
                        </div>
                      </div>
                      <div style={styles.itemRight}>
                        <button
                          style={styles.actionBtn}
                          onClick={() =>
                            navigate(`/help-request/chat/${req._id}`)
                          }
                          title="Go to chat session"
                        >
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "20px 0" },
  container: { maxWidth: "1100px", margin: "0 auto" },
  loading: {
    padding: "100px",
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "18px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
  },
  title: {
    fontSize: "28px",
    color: "var(--text)",
    fontWeight: "800",
    marginBottom: "4px",
  },
  subtitle: { color: "var(--muted)", fontSize: "15px" },
  newBtn: {
    backgroundColor: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "10px 20px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "14px",
    boxShadow: "0 10px 20px rgba(var(--accent-rgb), 0.2)",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },
  statCard: {
    backgroundColor: "var(--panel)",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid var(--panel-border)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  statIconBox: { padding: "10px", borderRadius: "12px" },
  statLabel: {
    fontSize: "12px",
    color: "var(--muted)",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: { fontSize: "24px", fontWeight: "800", color: "var(--text)" },
  sectionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "30px",
  },
  section: {
    backgroundColor: "var(--panel)",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid var(--panel-border)",
    boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  sectionTitle: { fontSize: "18px", fontWeight: "800", color: "var(--text)" },
  viewAll: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  listItem: {
    padding: "14px",
    borderRadius: "12px",
    backgroundColor: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemMain: { flex: 1 },
  itemTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "var(--text)",
    marginBottom: "4px",
  },
  itemMeta: {
    fontSize: "12px",
    color: "var(--muted2)",
    display: "flex",
    alignItems: "center",
  },
  itemRight: { display: "flex", alignItems: "center", gap: "12px" },
  urgencyDot: { width: "8px", height: "8px", borderRadius: "50%" },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "800",
  },
  empty: {
    padding: "30px",
    textAlign: "center",
    color: "var(--muted2)",
    fontSize: "13px",
    fontStyle: "italic",
  },
  actionBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid var(--panel-border)",
    backgroundColor: "transparent",
    color: "var(--accent)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default HelpRequestDashboard;
