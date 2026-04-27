import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivities } from '../../contexts/ActivityContext'
import api from '../../api'
import { SUBJECTS, SEMESTERS, FILE_TYPES } from './resourceConstants'

function ResourceUpload() {
  const navigate = useNavigate()
  const { addActivity } = useActivities()

  const [form, setForm] = useState({
    title: '', subject: 'Mathematics', semester: 'Semester 1',
    type: 'PDF', url: '', file: null, notesText: '', keywords: '',
  })
  const [errors,     setErrors]     = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [uploading,  setUploading]  = useState(false)

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.title.trim())                    e.title = 'Resource title is required.'
    else if (form.title.trim().length < 3)     e.title = 'Title must be at least 3 characters.'
    else if (form.title.trim().length > 100)   e.title = 'Title must be under 100 characters.'
    else if (!/^[A-Za-z\s]+$/.test(form.title.trim())) e.title = 'Title can only include letters and spaces.'
    if (form.type === 'Link') {
      if (!form.url.trim())                    e.url = 'URL is required for Link type.'
      else if (!/^https?:\/\/.+/.test(form.url.trim())) e.url = 'Enter a valid URL starting with http(s)://'
    }
    if (form.type === 'PDF' && !form.file)     e.file = 'PDF file is required.'
    if (form.type === 'Notes') {
      if (!form.notesText.trim())              e.notesText = 'Notes content is required.'
      else if (form.notesText.trim().length < 20) e.notesText = 'Notes must be at least 20 characters.'
    }
    return e
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }
    setUploading(true)
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
      addActivity({ type: 'Resource', description: `Uploaded: ${res.data.title}` })
      setForm({ title: '', subject: 'Mathematics', semester: 'Semester 1', type: 'PDF', url: '', file: null, notesText: '', keywords: '' })
      setErrors({})
      setSuccessMsg(`"${res.data.title}" uploaded successfully!`)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload resource')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.heading}>Upload New Resource</h1>
        <p style={s.sub}>Share your study materials with peers.</p>

        {successMsg && (
          <div style={s.success}>
            <span>{successMsg}</span>
            <button style={s.browseLink} onClick={() => navigate('/resources/browse')}>
              View in Browse →
            </button>
          </div>
        )}

        <div style={s.card}>
          <h3 style={s.cardTitle}>Resource Details</h3>

          <label style={s.label}>Resource Title *</label>
          <input
            style={{ ...s.input, ...(errors.title ? s.inputErr : {}) }}
            placeholder="e.g. Database ERD Notes"
            value={form.title}
            onKeyDown={e => {
              const allowedControlKeys = ['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Home','End']
              if (allowedControlKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) return
              if (!/^[A-Za-z\s]$/.test(e.key)) {
                e.preventDefault()
                setErrors(prev => ({ ...prev, title: 'Only letters and spaces are allowed.' }))
              }
            }}
            onChange={e => {
              const val = e.target.value.replace(/[^A-Za-z\s]/g, '');
              setForm({ ...form, title: val });
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
          />
          {errors.title && <span style={s.error}>{errors.title}</span>}

          <label style={s.label}>Keywords (optional)</label>
          <input
            style={s.input}
            placeholder="e.g. normalization, ER diagram, SQL"
            value={form.keywords}
            onChange={e => setForm({ ...form, keywords: e.target.value })}
          />

          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Subject *</label>
              <select style={s.select} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.filter(subj => subj !== 'All').map(subj => <option key={subj} style={s.option}>{subj}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Semester *</label>
              <select style={s.select} value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                {SEMESTERS.filter(sem => sem !== 'All').map(sem => <option key={sem} style={s.option}>{sem}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Type *</label>
              <select style={s.select} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {FILE_TYPES.map(t => <option key={t} style={s.option}>{t}</option>)}
              </select>
            </div>
          </div>

          {form.type === 'Link' && (
            <>
              <label style={s.label}>URL *</label>
              <input
                style={{ ...s.input, ...(errors.url ? s.inputErr : {}) }}
                placeholder="https://example.com"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
              />
              {errors.url && <span style={s.error}>{errors.url}</span>}
            </>
          )}
          {form.type === 'PDF' && (
            <>
              <label style={s.label}>Upload PDF *</label>
              <input
                style={s.input}
                type="file"
                accept="application/pdf"
                onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
              />
              {errors.file && <span style={s.error}>{errors.file}</span>}
            </>
          )}
          {form.type === 'Notes' && (
            <>
              <label style={s.label}>Notes content *</label>
              <textarea
                style={{ ...s.textarea, ...(errors.notesText ? s.inputErr : {}) }}
                placeholder="Paste your lecture notes..."
                rows={6}
                value={form.notesText}
                onChange={e => setForm({ ...form, notesText: e.target.value })}
              />
              {errors.notesText && <span style={s.error}>{errors.notesText}</span>}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button style={s.submitBtn} onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Resource'}
            </button>
            <button style={s.cancelBtn} onClick={() => navigate('/resources/browse')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:       { padding: 0, backgroundColor: 'transparent' },
  container:  { maxWidth: '720px', margin: '0 auto' },
  heading:    { fontSize: '28px', color: 'var(--text)', marginBottom: '6px' },
  sub:        { color: 'var(--muted)', marginBottom: '24px' },

  success:    { backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 600, border: '1px solid rgba(52,211,153,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  browseLink: { backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.4)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },

  card:       { backgroundColor: 'var(--panel)', borderRadius: 14, padding: '24px', boxShadow: '0 18px 45px rgba(0,0,0,0.25)', border: '1px solid var(--panel-border)' },
  cardTitle:  { marginBottom: 18, color: 'var(--text)', fontSize: 18, fontWeight: 800 },
  label:      { display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: 13, color: 'var(--muted)', marginTop: 8 },
  input:      { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--panel-border)', marginBottom: 4, fontSize: 14, boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text)' },
  select:     { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--panel-border)', marginBottom: 4, fontSize: 14, boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text)', cursor: 'pointer', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'none', backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' },
  option:     { backgroundColor: 'var(--panel)', color: 'var(--text)' },
  textarea:   { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--panel-border)', marginBottom: 4, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text)' },
  inputErr:   { border: '1.5px solid rgba(251,113,133,0.85)' },
  error:      { color: 'var(--danger)', fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600 },
  row:        { display: 'flex', gap: 12, flexWrap: 'wrap' },
  submitBtn:  { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14 },
  cancelBtn:  { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--muted)', border: '1px solid var(--panel-border)', padding: '11px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
}

export default ResourceUpload
