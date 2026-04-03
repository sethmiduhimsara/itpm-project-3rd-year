import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { SUBJECTS } from './resourceConstants'

// ── Report Detail Modal ───────────────────────────────────────────────────────
function ReportDetailModal({ resource, onClose }) {
  const count = resource.reports?.length ?? 0
  return (
    <div onClick={onClose} style={s.modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={s.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--text)', fontSize: 15, marginBottom: 4 }}>
              {resource.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted2)' }}>
              {resource.subject} • {resource.type}
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalCountRow}>
          {resource.blocked
            ? <span style={s.blockedBadge}>🚫 Blocked</span>
            : <span style={s.warnBadge}>⚠ Reported</span>
          }
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
            {count} report{count !== 1 ? 's' : ''} received
          </span>
        </div>

        {count === 0 ? (
          <div style={{ color: 'var(--muted2)', fontSize: 13, padding: '12px 0' }}>No reports on record.</div>
        ) : (
          <div style={s.reasonsList}>
            {resource.reports.map((rep, i) => (
              <div key={i} style={s.reasonRow}>
                <span style={s.reasonNum}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={s.reasonText}>
                    {rep.reason?.trim() ? rep.reason.trim() : <em style={{ color: 'var(--muted2)' }}>No reason provided</em>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ResourceDashboard() {
  const navigate = useNavigate()

  const [recent,   setRecent]   = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)

  const [myCount,          setMyCount]          = useState(null)  // null = still loading
  const [myCountErr,       setMyCountErr]       = useState(false)
  const [reported,         setReported]         = useState([])
  const [reportedLoading,  setReportedLoading]  = useState(true)
  const [reportModal,      setReportModal]      = useState(null)

  useEffect(() => {
    api.get('/resources?limit=6')
      .then(res => {
        setRecent(res.data.resources)
        setTotal(res.data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    api.get('/resources/my-count')
      .then(res => setMyCount(res.data.count))
      .catch(() => setMyCountErr(true))

    api.get('/resources?reported=true&limit=50')
      .then(res => setReported(res.data.resources))
      .catch(() => {})
      .finally(() => setReportedLoading(false))
  }, [])

  const newThisWeek = recent.filter(r => {
    return (Date.now() - new Date(r.createdAt)) < 7 * 24 * 60 * 60 * 1000
  }).length

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource permanently?')) return
    try {
      await api.delete(`/resources/${id}`)
      setReported(prev => prev.filter(r => r._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete resource')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.heading}>Resources Dashboard</h1>
        <p style={s.sub}>Discover and share study materials with your peers.</p>

        {/* ── Stats ── */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statNum}>{total}</div>
            <div style={s.statLabel}>Total Resources</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{SUBJECTS.length - 1}</div>
            <div style={s.statLabel}>Subjects</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#34d399' }}>{newThisWeek}</div>
            <div style={s.statLabel}>New This Week</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>
              {myCountErr ? '—' : myCount === null ? '…' : myCount}
            </div>
            <div style={s.statLabel}>My Resources</div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={s.actionRow}>
          <button style={s.primaryBtn} onClick={() => navigate('/resources/upload')}>
            ＋ Upload Resource
          </button>
          <button style={s.secondaryBtn} onClick={() => navigate('/resources/browse')}>
            Browse All Resources →
          </button>
        </div>

        {/* ── My Reported Resources ── */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>
            My Reported Resources
            {reported.length > 0 && (
              <span style={s.reportedCount}>{reported.length}</span>
            )}
          </h2>
          {reportedLoading ? (
            <div style={s.empty}>Loading…</div>
          ) : reported.length === 0 ? (
            <div style={{ ...s.empty, borderColor: 'rgba(52,211,153,0.35)', color: '#34d399' }}>
              ✓ None of your resources have been reported.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reported.map(r => (
                <div key={r._id} style={{ ...s.reportedCard, ...(r.blocked ? s.blockedCard : {}) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={s.typeBadge}>{r.type}</span>
                      {r.blocked
                        ? <span style={s.blockedBadge}>🚫 Blocked</span>
                        : <span style={s.warnBadge}>⚠ Reported ({r.reports.length})</span>
                      }
                    </div>
                    <span style={s.meta}>{r.subject} • {r.semester}</span>
                  </div>

                  <div style={s.reportedTitle}>{r.title}</div>
                  {r.keywords && (
                    <div style={{ ...s.meta, fontStyle: 'italic', marginTop: 2 }}>
                      {r.keywords}
                    </div>
                  )}
                  <div style={{ ...s.meta, marginTop: 6 }}>
                    Uploaded {new Date(r.createdAt).toLocaleDateString()}
                    &nbsp;·&nbsp;
                    👍 {r.likes?.length ?? 0} &nbsp; 👎 {r.dislikes?.length ?? 0}
                  </div>

                  {/* Report reasons */}
                  {r.reports.length > 0 && (
                    <div style={s.reasonsBox}>
                      <div style={s.reasonsTitle}>
                        {r.reports.length} report{r.reports.length !== 1 ? 's' : ''} received:
                      </div>
                      {r.reports.map((rep, i) => (
                        <div key={i} style={s.reasonRow}>
                          <span style={s.reasonNum}>{i + 1}</span>
                          <span style={s.reasonText}>
                            {rep.reason?.trim() ? rep.reason.trim() : 'No reason provided'}
                          </span>
                          <span style={s.reasonDate}>
                            {new Date(rep.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <button style={s.deleteBtn} onClick={() => handleDelete(r._id)}>
                      🗑 Delete Resource
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Subject Shortcuts ── */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Browse by Subject</h2>
          <div style={s.subjectGrid}>
            {SUBJECTS.filter(subj => subj !== 'All').map(subj => (
              <button
                key={subj}
                style={s.subjectBtn}
                onClick={() => navigate(`/resources/browse?subject=${encodeURIComponent(subj)}`)}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent Uploads ── */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Recently Uploaded</h2>
          {loading ? (
            <div style={s.empty}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={s.empty}>No resources yet. Be the first to upload!</div>
          ) : (
            <>
              <div style={s.recentGrid}>
                {recent.map(r => {
                  const repCount = r.reports?.length ?? 0
                  return (
                    <div key={r._id} style={s.recentCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={s.badge}>{r.type}</span>
                        <span style={s.meta}>{r.subject}</span>
                      </div>
                      <div style={s.recentTitle}>{r.title}</div>
                      {r.keywords && (
                        <div style={{ ...s.meta, fontStyle: 'italic', marginTop: 4 }}>
                          {r.keywords}
                        </div>
                      )}
                      <div style={{ ...s.meta, marginTop: 6 }}>
                        by <strong style={{ color: 'var(--text)' }}>{r.uploader}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                        <span style={s.meta}>{new Date(r.createdAt).toLocaleDateString()}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={s.voteChip}>👍 {r.likes?.length ?? 0}</span>
                          {repCount > 0 && (
                            <button
                              style={s.reportChip}
                              onClick={() => setReportModal(r)}
                              title="View report details"
                            >
                              ⚠ {repCount}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {total > 6 && (
                <div style={{ marginTop: 14 }}>
                  <button style={s.secondaryBtn} onClick={() => navigate('/resources/browse')}>
                    View all {total} resources →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {reportModal && (
        <ReportDetailModal resource={reportModal} onClose={() => setReportModal(null)} />
      )}
    </div>
  )
}


const s = {
  page:         { padding: 0, backgroundColor: 'transparent' },
  container:    { maxWidth: '920px', margin: '0 auto' },
  heading:      { fontSize: '28px', color: 'var(--text)', marginBottom: '6px' },
  sub:          { color: 'var(--muted)', marginBottom: '24px' },

  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 },
  statCard:     { backgroundColor: 'var(--panel)', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--panel-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
  statNum:      { fontSize: 34, fontWeight: 900, color: 'var(--accent2)', marginBottom: 4, lineHeight: 1 },
  statLabel:    { fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },

  actionRow:    { display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' },
  primaryBtn:   { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 30px rgba(var(--accent-rgb),0.25)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text)', border: '1px solid var(--panel-border)', padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },

  section:      { marginBottom: 28 },
  sectionTitle: { fontSize: 18, color: 'var(--text)', marginBottom: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 },
  reportedCount: { backgroundColor: 'rgba(251,191,36,0.18)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.40)', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 800 },

  // Reported resource cards
  reportedCard: { backgroundColor: 'var(--panel)', borderRadius: 14, padding: '18px', border: '1.5px solid rgba(251,191,36,0.40)', backgroundColor: 'rgba(251,191,36,0.04)' },
  blockedCard:  { border: '1.5px solid rgba(251,113,133,0.45)', backgroundColor: 'rgba(251,113,133,0.04)' },
  reportedTitle: { fontSize: 16, color: 'var(--text)', fontWeight: 700, marginBottom: 2 },
  typeBadge:    { backgroundColor: 'rgba(var(--accent-rgb),0.16)', color: 'var(--text)', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, border: '1px solid rgba(var(--accent2-rgb),0.40)' },
  warnBadge:    { fontSize: 12, color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.14)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(251,191,36,0.35)', fontWeight: 700 },
  blockedBadge: { fontSize: 12, color: 'var(--danger)', backgroundColor: 'rgba(251,113,133,0.14)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(251,113,133,0.35)', fontWeight: 700 },

  reasonsBox:   { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)' },
  reasonsTitle: { fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' },
  reasonRow:    { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  reasonNum:    { fontSize: 11, color: 'var(--muted2)', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 999, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 },
  reasonText:   { fontSize: 13, color: 'var(--text)', flex: 1, lineHeight: 1.5 },
  reasonDate:   { fontSize: 11, color: 'var(--muted2)', flexShrink: 0, paddingTop: 2 },

  deleteBtn:    { backgroundColor: 'rgba(251,113,133,0.12)', color: 'var(--danger)', border: '1px solid rgba(251,113,133,0.35)', padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 800 },

  subjectGrid:  { display: 'flex', gap: 8, flexWrap: 'wrap' },
  subjectBtn:   { padding: '7px 16px', borderRadius: 20, border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontWeight: 700 },

  recentGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  recentCard:   { backgroundColor: 'var(--panel)', borderRadius: 14, padding: '16px', border: '1px solid var(--panel-border)' },
  recentTitle:  { fontSize: 15, color: 'var(--text)', fontWeight: 700, lineHeight: 1.4 },
  badge:        { backgroundColor: 'rgba(var(--accent-rgb),0.16)', color: 'var(--text)', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, border: '1px solid rgba(var(--accent2-rgb),0.40)' },
  meta:         { fontSize: 12, color: 'var(--muted2)' },
  voteChip:     { fontSize: 12, color: 'var(--muted)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 20, border: '1px solid var(--panel-border)' },

  empty:        { textAlign: 'center', color: 'var(--muted2)', padding: 40, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px dashed rgba(var(--accent2-rgb),0.35)' },

  reportChip:   { fontSize: 12, color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.14)', padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(251,191,36,0.35)', fontWeight: 700, cursor: 'pointer' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalBox:     { width: 'min(520px,100%)', background: 'rgba(10,15,30,0.98)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', padding: 22 },
  closeBtn:     { background: 'rgba(255,255,255,0.07)', border: '1px solid var(--panel-border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', padding: '4px 10px', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  modalCountRow:{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--panel-border)' },
  reasonsList:  { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' },
  reasonRow:    { display: 'flex', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' },
  reasonNum:    { fontSize: 11, color: 'var(--muted2)', backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 999, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 },
  reasonText:   { fontSize: 13, color: 'var(--text)', lineHeight: 1.5 },
}

export default ResourceDashboard
