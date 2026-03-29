import { useState, useEffect, useCallback } from 'react'
import { useActivities } from '../../contexts/ActivityContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

const SUBJECTS  = ['All', 'Mathematics', 'Software Engineering', 'Database', 'Networks', 'ITPM', 'Other']
const SEMESTERS = ['All', 'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6']
const FILE_TYPES = ['PDF', 'Link', 'Notes']
const FILE_BASE  = 'http://localhost:5000'

// ── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ resource, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    await onSubmit(resource._id, reason)
    setSubmitting(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={styles.modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={styles.modalBox}>
        <h3 style={{ color: 'var(--text)', marginBottom: 6, fontSize: 16 }}>
          Report Resource
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          <strong style={{ color: 'var(--text)' }}>{resource.title}</strong>
        </p>
        <label style={styles.label}>Reason (optional)</label>
        <textarea
          style={{ ...styles.textarea, marginBottom: 14 }}
          rows={3}
          placeholder="e.g. Wrong content, spam, inappropriate material..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.reportSubmitBtn} onClick={submit} disabled={submitting}>
            {submitting ? 'Reporting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resource Card ─────────────────────────────────────────────────────────────
function ResourceCard({ r, user, onLike, onDislike, onReport, onRemove, onViewNotes, onDownloadNotes }) {
  const isOwner   = user && (r.uploaderId === user._id || r.uploaderId?._id === user._id)
  const isAdmin   = user?.role === 'admin'
  const canDelete = isOwner || isAdmin

  const userId       = user?._id
  const hasLiked     = userId && r.likes?.includes(userId)
  const hasDisliked  = userId && r.dislikes?.includes(userId)
  const hasReported  = userId && r.reports?.some(rep => rep.reportedBy === userId || rep.reportedBy?._id === userId)

  const likeCount    = r.likes?.length ?? 0
  const dislikeCount = r.dislikes?.length ?? 0
  const reportCount  = r.reports?.length ?? 0

  return (
    <div style={{ ...styles.resourceCard, ...(r.reported && !r.blocked ? styles.reportedCard : {}) }}>
      <div style={styles.resourceHeader}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={styles.typeBadge}>{r.type}</span>
          {r.reported && (
            <span style={styles.reportedBadge}>
              ⚠ Reported ({reportCount})
            </span>
          )}
        </div>
        <span style={styles.resourceMeta}>{r.subject} • {r.semester}</span>
      </div>

      <h3 style={styles.resourceTitle}>{r.title}</h3>
      {r.keywords && (
        <p style={{ ...styles.resourceMeta2, fontStyle: 'italic' }}>
          Keywords: {r.keywords}
        </p>
      )}
      <p style={styles.resourceMeta2}>
        Uploaded by <strong style={{ color: 'var(--text)' }}>{r.uploader}</strong>
        {' '}• {new Date(r.createdAt).toLocaleDateString()}
      </p>

      {/* Like / Dislike bar */}
      <div style={styles.voteBar}>
        <button
          style={{ ...styles.voteBtn, ...(hasLiked ? styles.voteBtnActive : {}) }}
          onClick={() => onLike(r._id)}
          title="Like"
        >
          👍 {likeCount}
        </button>
        <button
          style={{ ...styles.voteBtn, ...(hasDisliked ? styles.voteBtnDislikeActive : {}) }}
          onClick={() => onDislike(r._id)}
          title="Dislike"
        >
          👎 {dislikeCount}
        </button>
        <div style={styles.voteRatio}>
          {likeCount + dislikeCount > 0
            ? `${Math.round((likeCount / (likeCount + dislikeCount)) * 100)}% positive`
            : 'No votes yet'}
        </div>
      </div>

      {/* Action row */}
      <div style={styles.actionRow}>
        {r.type === 'Link' && r.url && (
          <a href={r.url} target="_blank" rel="noreferrer" style={styles.viewBtn}>Visit Link</a>
        )}
        {r.type === 'PDF' && r.filePath && (
          <>
            <a href={`${FILE_BASE}${r.filePath}`} target="_blank" rel="noreferrer" style={styles.viewBtn}>View</a>
            <a href={`${FILE_BASE}${r.filePath}`} download={r.title} style={styles.viewBtn}>Download</a>
          </>
        )}
        {r.type === 'Notes' && (
          <>
            <button type="button" style={styles.viewBtn} onClick={() => onViewNotes(r)}>View Notes</button>
            <button type="button" style={styles.viewBtn} onClick={() => onDownloadNotes(r.notesText || '', `${r.title}.txt`)}>Download</button>
          </>
        )}

        {/* Report button — hide if already reported by this user */}
        {!hasReported ? (
          <button style={styles.reportBtn} onClick={() => onReport(r)}>⚑ Report</button>
        ) : (
          <span style={{ ...styles.reportedBadge, cursor: 'default' }}>Reported</span>
        )}

        {/* Delete — owner or admin only */}
        {canDelete && (
          <button style={styles.removeBtn} onClick={() => onRemove(r._id)}>🗑 Delete</button>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
function ResourceSharing() {
  const { addActivity } = useActivities()
  const { user }        = useAuth()

  const [resources,       setResources]       = useState([])
  const [total,           setTotal]           = useState(0)
  const [page,            setPage]            = useState(1)
  const [pages,           setPages]           = useState(1)
  const [loading,         setLoading]         = useState(true)
  const [form,            setForm]            = useState({
    title: '', subject: 'Mathematics', semester: 'Semester 1',
    type: 'PDF', url: '', file: null, notesText: '', keywords: '',
  })
  const [errors,          setErrors]          = useState({})
  const [filterSubject,   setFilterSubject]   = useState('All')
  const [filterSemester,  setFilterSemester]  = useState('All')
  const [sortBy,          setSortBy]          = useState('newest')
  const [search,          setSearch]          = useState('')
  const [searchInput,     setSearchInput]     = useState('')
  const [showForm,        setShowForm]        = useState(false)
  const [successMsg,      setSuccessMsg]      = useState('')
  const [notesModal,      setNotesModal]      = useState(null)
  const [reportTarget,    setReportTarget]    = useState(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchResources = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSubject  !== 'All') params.set('subject',  filterSubject)
      if (filterSemester !== 'All') params.set('semester', filterSemester)
      if (search.trim())            params.set('search',   search.trim())
      if (sortBy === 'likes')       params.set('sort',     'likes')
      params.set('page',  page)
      params.set('limit', 12)

      const res = await api.get(`/resources?${params}`)
      setResources(res.data.resources)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [filterSubject, filterSemester, search, sortBy, page])

  useEffect(() => { fetchResources() }, [fetchResources])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [filterSubject, filterSemester, search, sortBy])

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.title.trim())               e.title = 'Resource title is required.'
    else if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters.'
    else if (form.title.trim().length > 100) e.title = 'Title must be under 100 characters.'
    if (form.type === 'Link') {
      if (!form.url.trim())               e.url = 'URL is required for Link type.'
      else if (!/^https?:\/\/.+/.test(form.url.trim())) e.url = 'Enter a valid URL starting with http(s)://'
    }
    if (form.type === 'PDF' && !form.file) e.file = 'PDF file is required.'
    if (form.type === 'Notes') {
      if (!form.notesText.trim())          e.notesText = 'Notes content is required.'
      else if (form.notesText.trim().length < 20) e.notesText = 'Notes must be at least 20 characters.'
    }
    return e
  }

  // ── Submit upload ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }

    try {
      const fd = new FormData()
      fd.append('title',    form.title.trim())
      fd.append('subject',  form.subject)
      fd.append('semester', form.semester)
      fd.append('type',     form.type)
      fd.append('keywords', form.keywords.trim())
      if (form.type === 'Link')  fd.append('url', form.url.trim())
      if (form.type === 'PDF' && form.file) fd.append('file', form.file)
      if (form.type === 'Notes') fd.append('notesText', form.notesText.trim())

      const res = await api.post('/resources', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResources(prev => [res.data, ...prev])
      setForm({ title: '', subject: 'Mathematics', semester: 'Semester 1', type: 'PDF', url: '', file: null, notesText: '', keywords: '' })
      setErrors({})
      setShowForm(false)
      setSuccessMsg('Resource uploaded successfully! 🎉')
      setTimeout(() => setSuccessMsg(''), 4000)
      addActivity({ type: 'Resource', description: `Uploaded: ${res.data.title}` })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload resource')
    }
  }

  // ── Like / Dislike ─────────────────────────────────────────────────────────
  const handleLike = async (id) => {
    try {
      const res = await api.patch(`/resources/${id}/like`)
      setResources(prev => prev.map(r => r._id === id ? res.data : r))
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  const handleDislike = async (id) => {
    try {
      const res = await api.patch(`/resources/${id}/dislike`)
      setResources(prev => prev.map(r => r._id === id ? res.data : r))
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const handleReport = (resource) => setReportTarget(resource)

  const submitReport = async (id, reason) => {
    try {
      const res = await api.patch(`/resources/${id}/report`, { reason })
      setResources(prev => prev.map(r => r._id === id ? res.data : r))
      setSuccessMsg('Resource reported. Thank you for keeping the platform safe.')
      setTimeout(() => setSuccessMsg(''), 4000)
      // Remove from list if now blocked
      if (res.data.blocked) {
        setResources(prev => prev.filter(r => r._id !== id))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to report resource')
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleRemove = async (id) => {
    if (!window.confirm('Delete this resource permanently?')) return
    try {
      await api.delete(`/resources/${id}`)
      setResources(prev => prev.filter(r => r._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove resource')
    }
  }

  // ── Notes helpers ──────────────────────────────────────────────────────────
  const downloadNotes = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  // ── Search submit ──────────────────────────────────────────────────────────
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Resource Sharing</h1>
        <p style={styles.subheading}>Upload and discover study materials shared by your peers.</p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* ── Search Bar ── */}
        <form onSubmit={handleSearchSubmit} style={styles.searchRow}>
          <input
            style={styles.searchInput}
            placeholder="Search by title, subject or keywords…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" style={styles.searchBtn}>Search</button>
          {search && (
            <button type="button" style={styles.clearBtn}
              onClick={() => { setSearch(''); setSearchInput('') }}>
              ✕ Clear
            </button>
          )}
        </form>

        {/* ── Filters + Sort ── */}
        <div style={styles.filterSection}>
          <div>
            <label style={styles.label}>Subject</label>
            <div style={styles.filterRow}>
              {SUBJECTS.map(s => (
                <button key={s}
                  style={{ ...styles.filterBtn, ...(filterSubject === s ? styles.filterActive : {}) }}
                  onClick={() => setFilterSubject(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={styles.label}>Semester</label>
            <div style={styles.filterRow}>
              {SEMESTERS.map(s => (
                <button key={s}
                  style={{ ...styles.filterBtn, ...(filterSemester === s ? styles.filterActive : {}) }}
                  onClick={() => setFilterSemester(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <label style={{ ...styles.label, marginTop: 0 }}>Sort:</label>
            <button style={{ ...styles.filterBtn, ...(sortBy === 'newest' ? styles.filterActive : {}) }}
              onClick={() => setSortBy('newest')}>Newest</button>
            <button style={{ ...styles.filterBtn, ...(sortBy === 'likes' ? styles.filterActive : {}) }}
              onClick={() => setSortBy('likes')}>Most Liked</button>
          </div>
        </div>

        {/* ── Upload toggle ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button style={styles.newBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '＋ Upload Resource'}
          </button>
          {total > 0 && (
            <span style={styles.totalBadge}>{total} resource{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* ── Upload Form ── */}
        {showForm && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Upload New Resource</h3>

            <label style={styles.label}>Resource Title *</label>
            <input style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
              placeholder="e.g. Database ERD Notes" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
            {errors.title && <span style={styles.error}>{errors.title}</span>}

            <label style={styles.label}>Keywords (optional)</label>
            <input style={styles.input}
              placeholder="e.g. normalization, ER diagram, SQL"
              value={form.keywords}
              onChange={e => setForm({ ...form, keywords: e.target.value })} />

            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Subject *</label>
                <select style={styles.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                  {SUBJECTS.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Semester *</label>
                <select style={styles.input} value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                  {SEMESTERS.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Type *</label>
                <select style={styles.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {FILE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {form.type === 'Link' && (
              <>
                <label style={styles.label}>URL *</label>
                <input style={{ ...styles.input, ...(errors.url ? styles.inputError : {}) }}
                  placeholder="https://example.com" value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })} />
                {errors.url && <span style={styles.error}>{errors.url}</span>}
              </>
            )}
            {form.type === 'PDF' && (
              <>
                <label style={styles.label}>Upload PDF *</label>
                <input style={styles.input} type="file" accept="application/pdf"
                  onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
                {errors.file && <span style={styles.error}>{errors.file}</span>}
              </>
            )}
            {form.type === 'Notes' && (
              <>
                <label style={styles.label}>Notes content *</label>
                <textarea style={{ ...styles.textarea, ...(errors.notesText ? styles.inputError : {}) }}
                  placeholder="Paste your lecture notes..." rows={5}
                  value={form.notesText} onChange={e => setForm({ ...form, notesText: e.target.value })} />
                {errors.notesText && <span style={styles.error}>{errors.notesText}</span>}
              </>
            )}

            <button style={styles.submitBtn} onClick={handleSubmit}>Upload Resource</button>
          </div>
        )}

        {/* ── Resource Cards ── */}
        {loading ? (
          <div style={styles.emptyState}>Loading resources…</div>
        ) : resources.length === 0 ? (
          <div style={styles.emptyState}>
            {search ? `No results for "${search}". Try different keywords.` : 'No resources found. Be the first to upload!'}
          </div>
        ) : (
          <>
            {resources.map(r => (
              <ResourceCard
                key={r._id}
                r={r}
                user={user}
                onLike={handleLike}
                onDislike={handleDislike}
                onReport={handleReport}
                onRemove={handleRemove}
                onViewNotes={res => setNotesModal({ title: res.title, content: res.notesText || '' })}
                onDownloadNotes={downloadNotes}
              />
            ))}

            {/* Pagination */}
            {pages > 1 && (
              <div style={styles.pagination}>
                <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p}
                    style={{ ...styles.pageBtn, ...(p === page ? styles.pageActive : {}) }}
                    onClick={() => setPage(p)}>{p}</button>
                ))}
                <button style={styles.pageBtn} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              </div>
            )}
          </>
        )}

        {/* ── Notes Modal ── */}
        {notesModal && (
          <div role="dialog" aria-label="Notes viewer" onClick={() => setNotesModal(null)}
            style={styles.modalOverlay}>
            <div onClick={e => e.stopPropagation()} style={{ ...styles.modalBox, maxWidth: 860, width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--text)' }}>{notesModal.title}</div>
                <button type="button" style={styles.closeModalBtn} onClick={() => setNotesModal(null)}>Close</button>
              </div>
              <pre style={styles.notesContent}>{notesModal.content}</pre>
            </div>
          </div>
        )}

        {/* ── Report Modal ── */}
        {reportTarget && (
          <ReportModal
            resource={reportTarget}
            onClose={() => setReportTarget(null)}
            onSubmit={submitReport}
          />
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page:               { minHeight: '0', padding: 0, backgroundColor: 'transparent' },
  container:          { maxWidth: '920px', margin: '0 auto' },
  heading:            { fontSize: '28px', color: 'var(--text)', marginBottom: '6px' },
  subheading:         { color: 'var(--muted)', marginBottom: '20px' },
  success:            { backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600', border: '1px solid rgba(52,211,153,0.25)' },

  // Search
  searchRow:          { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  searchInput:        { flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text)' },
  searchBtn:          { padding: '9px 18px', borderRadius: '10px', border: 'none', backgroundColor: 'var(--accent)', color: 'var(--bg)', fontWeight: '800', cursor: 'pointer', fontSize: '14px' },
  clearBtn:           { padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(251,113,133,0.35)', backgroundColor: 'rgba(251,113,133,0.10)', color: 'var(--danger)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },

  // Filters
  filterSection:      { marginBottom: '16px' },
  filterRow:          { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' },
  filterBtn:          { padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)' },
  filterActive:       { backgroundColor: 'rgba(var(--accent-rgb),0.20)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb),0.45)' },

  newBtn:             { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 10px 30px rgba(var(--accent-rgb),0.25)' },
  totalBadge:         { alignSelf: 'center', padding: '5px 12px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--muted)', fontSize: '13px', border: '1px solid var(--panel-border)' },

  // Form
  card:               { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '24px', marginBottom: '24px', boxShadow: '0 18px 45px rgba(0,0,0,0.25)', border: '1px solid var(--panel-border)' },
  cardTitle:          { marginBottom: '16px', color: 'var(--text)', fontSize: '18px' },
  label:              { display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '13px', color: 'var(--muted)', marginTop: '8px' },
  input:              { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text)' },
  textarea:           { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text)' },
  inputError:         { border: '1.5px solid rgba(251,113,133,0.85)' },
  error:              { color: 'var(--danger)', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: '600' },
  row:                { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  submitBtn:          { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '11px 22px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginTop: '10px' },

  // Resource card
  resourceCard:       { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '18px', marginBottom: '14px', boxShadow: '0 18px 45px rgba(0,0,0,0.18)', border: '1px solid var(--panel-border)' },
  reportedCard:       { border: '1.5px solid rgba(251,191,36,0.50)', backgroundColor: 'rgba(251,191,36,0.05)' },
  resourceHeader:     { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: 6 },
  typeBadge:          { backgroundColor: 'rgba(var(--accent-rgb),0.16)', color: 'var(--text)', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(var(--accent2-rgb),0.40)' },
  reportedBadge:      { fontSize: '12px', color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.14)', padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(251,191,36,0.35)', fontWeight: '700' },
  resourceTitle:      { fontSize: '16px', color: 'var(--text)', marginBottom: '4px' },
  resourceMeta:       { color: 'var(--muted2)', fontSize: '12px' },
  resourceMeta2:      { color: 'var(--muted2)', fontSize: '12px', marginBottom: '8px' },

  // Vote bar
  voteBar:            { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 },
  voteBtn:            { padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', fontWeight: '700' },
  voteBtnActive:      { backgroundColor: 'rgba(52,211,153,0.18)', color: '#34d399', border: '1px solid rgba(52,211,153,0.40)' },
  voteBtnDislikeActive: { backgroundColor: 'rgba(251,113,133,0.18)', color: 'var(--danger)', border: '1px solid rgba(251,113,133,0.40)' },
  voteRatio:          { fontSize: '11px', color: 'var(--muted2)', marginLeft: 4 },

  actionRow:          { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  viewBtn:            { backgroundColor: 'rgba(var(--accent-rgb),0.14)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb),0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', textDecoration: 'none', fontWeight: '800' },
  reportBtn:          { backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  removeBtn:          { backgroundColor: 'rgba(251,113,133,0.12)', color: 'var(--danger)', border: '1px solid rgba(251,113,133,0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  emptyState:         { textAlign: 'center', color: 'var(--muted2)', padding: '40px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px dashed rgba(var(--accent2-rgb),0.35)' },

  // Pagination
  pagination:         { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' },
  pageBtn:            { padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  pageActive:         { backgroundColor: 'rgba(var(--accent-rgb),0.20)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb),0.45)' },

  // Modals
  modalOverlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.60)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalBox:           { width: 'min(480px,100%)', background: 'rgba(10,15,30,0.98)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 20 },
  cancelBtn:          { padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--muted)', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  reportSubmitBtn:    { padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: 'rgba(251,191,36,0.85)', color: '#1a1200', cursor: 'pointer', fontWeight: '800', fontSize: '13px' },
  closeModalBtn:      { backgroundColor: 'rgba(var(--accent2-rgb),0.18)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb),0.35)', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' },
  notesContent:       { whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: 'var(--text)', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, maxHeight: '60vh', overflow: 'auto' },
}

export default ResourceSharing