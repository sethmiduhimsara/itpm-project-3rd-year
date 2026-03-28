import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import { MessageSquare, Clock, CheckCircle, ExternalLink, User } from 'lucide-react'

function AcceptedRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.name) return
    const fetchAccepted = async () => {
      try {
        const res = await api.get(`/help-requests?acceptedByUserId=${user._id}`)
        setRequests(res.data)
      } catch (err) {
        console.error('Failed to fetch accepted requests:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAccepted()
  }, [user?.name])

  const activeRequests = requests.filter(r => r.status === 'In Progress')
  const completedRequests = requests.filter(r => r.status === 'Closed')

  if (loading) return <div style={styles.loading}>Loading your tasks...</div>

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Accepted Tasks</h1>
          <p style={styles.subtitle}>Manage requests you are helping with.</p>
        </header>

        {/* Active Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <Clock size={18} /> Active Helping Sessions
          </h2>
          <div style={styles.grid}>
            {activeRequests.length === 0 ? (
              <div style={styles.empty}>No active sessions. Helpful students are always in demand!</div>
            ) : (
              activeRequests.map(req => (
                <div key={req._id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.subjectBadge}>{req.subject}</span>
                    <span style={styles.urgencyBadge}>{req.urgency}</span>
                  </div>
                  <h3 style={styles.cardTitle}>{req.title}</h3>
                  <div style={styles.cardMeta}>
                    <User size={14} /> Requester: {req.requester}
                  </div>
                  <button 
                    style={styles.chatBtn} 
                    onClick={() => navigate(`/help-request/chat/${req._id}`)}
                  >
                    <MessageSquare size={16} /> Open Chat Session
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Completed Section */}
        {completedRequests.length > 0 && (
          <section style={{ ...styles.section, marginTop: '40px' }}>
            <h2 style={{ ...styles.sectionTitle, color: 'var(--muted)' }}>
              <CheckCircle size={18} /> Completed Sessions
            </h2>
            <div style={styles.grid}>
              {completedRequests.map(req => (
                <div key={req._id} style={{ ...styles.card, opacity: 0.7 }}>
                   <div style={styles.cardHeader}>
                    <span style={styles.subjectBadge}>{req.subject}</span>
                  </div>
                  <h3 style={styles.cardTitle}>{req.title}</h3>
                  <div style={styles.cardMeta}>Completed on {new Date(req.updatedAt).toLocaleDateString()}</div>
                  <button 
                    style={{ ...styles.chatBtn, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }} 
                    onClick={() => navigate(`/help-request/chat/${req._id}`)}
                  >
                    View History
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '20px 0' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  loading: { padding: '100px', textAlign: 'center', color: 'var(--muted)', fontSize: '18px' },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', color: 'var(--text)', fontWeight: '800', marginBottom: '4px' },
  subtitle: { color: 'var(--muted)', fontSize: '16px' },
  section: { },
  sectionTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--accent2)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '16px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  subjectBadge: { backgroundColor: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' },
  urgencyBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900', border: '1px solid var(--panel-border)', color: 'var(--muted)' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px', lineHeight: '1.4' },
  cardMeta: { fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' },
  chatBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--accent2)', color: '#000', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--muted2)', fontSize: '14px', fontStyle: 'italic', border: '1px dashed var(--panel-border)', borderRadius: '16px' }
}

export default AcceptedRequests
