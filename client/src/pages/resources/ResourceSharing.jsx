import { useState, useEffect } from 'react'
import { useActivities } from '../../contexts/ActivityContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

const SUBJECTS = ['All', 'Mathematics', 'Software Engineering', 'Database', 'Networks', 'ITPM', 'Other']
const SEMESTERS = ['All', 'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6']
const FILE_TYPES = ['PDF', 'Link', 'Notes']
const FILE_BASE = 'http://localhost:5000'

function ResourceSharing() {
  const { addActivity } = useActivities()
  const { user } = useAuth()

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', subject: 'Mathematics', semester: 'Semester 1',
    type: 'PDF', url: '', file: null, notesText: '',
  })
  const [errors, setErrors] = useState({})
  const [filterSubject, setFilterSubject] = useState('All')
  const [filterSemester, setFilterSemester] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [notesModal, setNotesModal] = useState(null)

  // Fetch resources from backend on mount
  useEffect(() => {
    api.get('/resources')
      .then(res => { setResources(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const validate = () => {
    const newErrors = {}
    if (!form.title.trim()) newErrors.title = 'Resource title is required.'
    else if (form.title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters.'
    else if (form.title.trim().length > 100) newErrors.title = 'Title must be under 100 characters.'
    if (form.type === 'Link') {
      if (!form.url.trim()) newErrors.url = 'URL is required for Link type.'
      else if (!/^https?:\/\/.+/.test(form.url.trim())) newErrors.url = 'Please enter a valid URL starting with http:// or https://'
    }
    if (form.type === 'PDF') {
      if (!form.file) newErrors.file = 'PDF file is required.'
    }
    if (form.type === 'Notes') {
      if (!form.notesText.trim()) newErrors.notesText = 'Notes content is required.'
      else if (form.notesText.trim().length < 20) newErrors.notesText = 'Notes must be at least 20 characters.'
    }
    return newErrors
  }

  const handleSubmit = async () => {
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }

    try {
      const formData = new FormData()
      formData.append('title', form.title)
      formData.append('subject', form.subject)
      formData.append('semester', form.semester)
      formData.append('type', form.type)
      formData.append('uploader', user.name)
      if (form.type === 'Link') formData.append('url', form.url.trim())
      if (form.type === 'PDF' && form.file) formData.append('file', form.file)
      if (form.type === 'Notes') formData.append('notesText', form.notesText.trim())

      const res = await api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setResources([res.data, ...resources])
      setForm({ title: '', subject: 'Mathematics', semester: 'Semester 1', type: 'PDF', url: '', file: null, notesText: '' })
      setErrors({})
      setShowForm(false)
      setSuccessMsg('Resource uploaded successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
      addActivity({ type: 'Resource', description: `Uploaded: ${res.data.title}` })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload resource')
    }
  }

  const handleReport = async (id) => {
    if (window.confirm('Report this resource as inappropriate?')) {
      try {
        const res = await api.patch(`/resources/${id}/report`)
        setResources(resources.map(r => r._id === id ? res.data : r))
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to report resource')
      }
    }
  }

  const handleRemove = async (id) => {
    if (window.confirm('Remove this resource?')) {
      try {
        await api.delete(`/resources/${id}`)
        setResources(resources.filter(r => r._id !== id))
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to remove resource')
      }
    }
  }

  const filtered = resources.filter(r =>
    (filterSubject === 'All' || r.subject === filterSubject) &&
    (filterSemester === 'All' || r.semester === filterSemester)
  )

  const downloadNotes = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Resource Sharing</h1>
        <p style={styles.subheading}>Upload and discover study materials shared by your peers.</p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* Filters */}
        <div style={styles.filterSection}>
          <div>
            <label style={styles.label}>Subject</label>
            <div style={styles.filterRow}>
              {SUBJECTS.map(s => (
                <button key={s} style={{ ...styles.filterBtn, ...(filterSubject === s ? styles.filterActive : {}) }} onClick={() => setFilterSubject(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={styles.label}>Semester</label>
            <div style={styles.filterRow}>
              {SEMESTERS.map(s => (
                <button key={s} style={{ ...styles.filterBtn, ...(filterSemester === s ? styles.filterActive : {}) }} onClick={() => setFilterSemester(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <button style={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Upload Resource'}
        </button>

        {/* Form */}
        {showForm && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Upload New Resource</h3>

            <label style={styles.label}>Resource Title *</label>
            <input style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
              placeholder="e.g. Database ERD Notes" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
            {errors.title && <span style={styles.error}>{errors.title}</span>}

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

        {/* Resource Cards */}
        {loading ? (
          <div style={styles.emptyState}>Loading resources...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>No resources found. Be the first to upload!</div>
        ) : (
          filtered.map(r => (
            <div key={r._id} style={{ ...styles.resourceCard, ...(r.reported ? styles.reportedCard : {}) }}>
              <div style={styles.resourceHeader}>
                <span style={styles.typeBadge}>{r.type}</span>
                <span style={styles.resourceMeta}>{r.subject} • {r.semester}</span>
              </div>
              <h3 style={styles.resourceTitle}>{r.title}</h3>
              <p style={styles.resourceMeta2}>Uploaded by {r.uploader} • {new Date(r.createdAt).toLocaleDateString()}</p>
              {r.reported && <span style={styles.reportedBadge}>Reported</span>}
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
                    <button type="button" style={styles.viewBtn}
                      onClick={() => setNotesModal({ title: r.title, content: r.notesText || '' })}>
                      View Notes
                    </button>
                    <button type="button" style={styles.viewBtn}
                      onClick={() => downloadNotes(r.notesText || '', `${r.title}.txt`)}>
                      Download
                    </button>
                  </>
                )}
                {!r.reported && (
                  <button style={styles.reportBtn} onClick={() => handleReport(r._id)}>Report</button>
                )}
                <button style={styles.removeBtn} onClick={() => handleRemove(r._id)}>Remove</button>
              </div>
            </div>
          ))
        )}

        {notesModal && (
          <div role="dialog" aria-label="Notes viewer" onClick={() => setNotesModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: 'min(860px, 100%)', background: 'rgba(10, 15, 30, 0.96)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--text)' }}>{notesModal.title}</div>
                <button type="button" style={styles.closeModalBtn} onClick={() => setNotesModal(null)}>Close</button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: 'var(--text)', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, maxHeight: '60vh', overflow: 'auto' }}>
                {notesModal.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '0', padding: 0, backgroundColor: 'transparent' },
  container: { maxWidth: '920px', margin: '0 auto' },
  heading: { fontSize: '28px', color: 'var(--text)', marginBottom: '6px' },
  subheading: { color: 'var(--muted)', marginBottom: '20px' },
  success: { backgroundColor: 'rgba(52, 211, 153, 0.12)', color: '#34d399', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600', border: '1px solid rgba(52, 211, 153, 0.25)' },
  filterSection: { marginBottom: '16px' },
  filterRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' },
  filterBtn: { padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255, 255, 255, 0.04)', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)' },
  filterActive: { backgroundColor: 'rgba(var(--accent-rgb), 0.20)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.45)' },
  newBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginBottom: '20px', fontSize: '14px', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.25)' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '24px', marginBottom: '24px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.25)', border: '1px solid var(--panel-border)' },
  cardTitle: { marginBottom: '16px', color: 'var(--text)', fontSize: '18px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '13px', color: 'var(--muted)', marginTop: '8px' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  inputError: { border: '1.5px solid rgba(251, 113, 133, 0.85)' },
  error: { color: 'var(--danger)', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: '600' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  submitBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '11px 22px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginTop: '10px' },
  closeModalBtn: { backgroundColor: 'rgba(var(--accent2-rgb), 0.18)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.35)', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' },
  resourceCard: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '18px', marginBottom: '14px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.18)', border: '1px solid var(--panel-border)' },
  reportedCard: { border: '1.5px solid rgba(251, 191, 36, 0.50)', backgroundColor: 'rgba(251, 191, 36, 0.08)' },
  resourceHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  typeBadge: { backgroundColor: 'rgba(var(--accent-rgb), 0.16)', color: 'var(--text)', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(var(--accent2-rgb), 0.40)' },
  resourceMeta: { color: 'var(--muted2)', fontSize: '12px' },
  resourceTitle: { fontSize: '16px', color: 'var(--text)', marginBottom: '4px' },
  resourceMeta2: { color: 'var(--muted2)', fontSize: '12px', marginBottom: '8px' },
  reportedBadge: { fontSize: '12px', color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.14)', padding: '3px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '8px', border: '1px solid rgba(251, 191, 36, 0.35)', fontWeight: '700' },
  actionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  viewBtn: { backgroundColor: 'rgba(var(--accent-rgb), 0.14)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', textDecoration: 'none', fontWeight: '800' },
  reportBtn: { backgroundColor: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  removeBtn: { backgroundColor: 'rgba(251, 113, 133, 0.12)', color: 'var(--danger)', border: '1px solid rgba(251, 113, 133, 0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  emptyState: { textAlign: 'center', color: 'var(--muted2)', padding: '40px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', border: '1px dashed rgba(var(--accent2-rgb), 0.35)' },
}

export default ResourceSharing