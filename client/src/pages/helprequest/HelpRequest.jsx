import { useState, useEffect } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import { useActivities } from '../../contexts/ActivityContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

const SUBJECTS = ['Mathematics', 'Software Engineering', 'Database', 'Networks', 'ITPM', 'Other']
const STATUS_COLORS = {
  Open: 'rgba(52, 211, 153, 0.18)',
  'In Progress': 'rgba(251, 191, 36, 0.18)',
  Closed: 'rgba(255, 255, 255, 0.08)',
}

function HelpRequest() {
  const { pushNotification } = useNotifications()
  const { addActivity } = useActivities()
  const { user } = useAuth()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ subject: 'Mathematics', topic: '' })
  const [errors, setErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [responseInputs, setResponseInputs] = useState({})
  const [responseErrors, setResponseErrors] = useState({})
  const [helperNames, setHelperNames] = useState({})
  const [filterStatus, setFilterStatus] = useState('All')

  // Fetch help requests from backend on mount
  useEffect(() => {
    api.get('/help-requests')
      .then(res => { setRequests(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const validate = () => {
    const newErrors = {}
    if (!form.topic.trim()) newErrors.topic = 'Topic/question is required.'
    else if (form.topic.trim().length < 10) newErrors.topic = 'Please describe your question in at least 10 characters.'
    else if (form.topic.trim().length > 200) newErrors.topic = 'Question must be under 200 characters.'
    return newErrors
  }

  const handleSubmit = async () => {
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }
    try {
      const res = await api.post('/help-requests', { ...form, requester: user.name })
      setRequests([res.data, ...requests])
      setForm({ subject: 'Mathematics', topic: '' })
      setErrors({})
      setShowForm(false)
      setSuccessMsg('Help request posted!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post help request')
    }
  }

  const handleAccept = async (id) => {
    const helper = helperNames[id] || ''
    const req = requests.find(r => r._id === id)
    const newErrors = {}
    if (!helper.trim()) newErrors.helper = 'Your name is required.'
    else if (helper.trim().length < 2) newErrors.helper = 'Name must be at least 2 characters.'
    if (Object.keys(newErrors).length > 0) { setResponseErrors({ ...responseErrors, [id]: newErrors }); return }

    try {
      const res = await api.patch(`/help-requests/${id}/accept`, { acceptedBy: helper.trim() })
      setRequests(requests.map(r => r._id === id ? res.data : r))
      pushNotification({
        title: 'Help request accepted',
        message: `${helper.trim()} accepted: ${req?.subject ?? ''} — ${req?.topic ?? ''}`.trim(),
      })
      addActivity({ type: 'Help Given', description: `Accepted help request: ${req?.subject} — ${req?.topic}` })
      setResponseErrors({ ...responseErrors, [id]: {} })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept request')
    }
  }

  const handleRespond = async (id) => {
    const text = responseInputs[id] || ''
    const req = requests.find(r => r._id === id)
    const helper = (req?.acceptedBy || helperNames[id] || '').trim()
    const newErrors = {}
    if (!helper) newErrors.helper = 'Your name is required.'
    if (!text.trim()) newErrors.text = 'Response cannot be empty.'
    else if (text.trim().length < 5) newErrors.text = 'Response must be at least 5 characters.'
    if (Object.keys(newErrors).length > 0) { setResponseErrors({ ...responseErrors, [id]: newErrors }); return }

    try {
      const res = await api.post(`/help-requests/${id}/responses`, { text, helper })
      setRequests(requests.map(r => r._id === id ? res.data : r))
      setResponseInputs({ ...responseInputs, [id]: '' })
      setResponseErrors({ ...responseErrors, [id]: {} })
      pushNotification({
        title: 'New help response',
        message: `${helper} responded: ${req?.subject ?? ''} — ${req?.topic ?? ''}`.trim(),
      })
      addActivity({ type: 'Help Given', description: `Responded to help request: ${req?.subject} — ${req?.topic}` })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post response')
    }
  }

  const handleClose = async (id) => {
    const req = requests.find(r => r._id === id)
    try {
      const res = await api.patch(`/help-requests/${id}/close`)
      setRequests(requests.map(r => r._id === id ? res.data : r))
      pushNotification({
        title: 'Help request closed',
        message: req ? `${req.subject} — ${req.topic}` : 'Help request closed',
      })
      addActivity({ type: 'Help Received', description: `Help request closed: ${req?.subject} — ${req?.topic}` })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close request')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this help request?')) {
      try {
        await api.delete(`/help-requests/${id}`)
        setRequests(requests.filter(r => r._id !== id))
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete request')
      }
    }
  }

  const filtered = filterStatus === 'All' ? requests : requests.filter(r => r.status === filterStatus)

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Peer Help Requests</h1>
        <p style={styles.subheading}>Post academic questions and help your peers!</p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* Stats */}
        <div style={styles.statsRow}>
          {['Open', 'In Progress', 'Closed'].map(s => (
            <div key={s} style={{ ...styles.statBox, backgroundColor: STATUS_COLORS[s] }}>
              {s}: {requests.filter(r => r.status === s).length}
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={styles.filterRow}>
          {['All', 'Open', 'In Progress', 'Closed'].map(s => (
            <button key={s} style={{ ...styles.filterBtn, ...(filterStatus === s ? styles.filterActive : {}) }}
              onClick={() => setFilterStatus(s)}>{s}</button>
          ))}
        </div>

        <button style={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Post Help Request'}
        </button>

        {/* Form */}
        {showForm && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Post a Help Request</h3>
            <label style={styles.label}>Subject *</label>
            <select style={styles.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <label style={styles.label}>Your Question / Topic *</label>
            <textarea style={{ ...styles.textarea, ...(errors.topic ? styles.inputError : {}) }}
              placeholder="Describe what you need help with (min 10 characters)"
              value={form.topic} rows={4} onChange={e => setForm({ ...form, topic: e.target.value })} />
            {errors.topic && <span style={styles.error}>{errors.topic}</span>}
            <button style={styles.submitBtn} onClick={handleSubmit}>Post Request</button>
          </div>
        )}

        {/* Request Cards */}
        {loading ? (
          <div style={styles.emptyState}>Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>No help requests found.</div>
        ) : (
          filtered.map(req => (
            <div key={req._id} style={styles.reqCard}>
              <div style={styles.reqHeader}>
                <span style={styles.subjectBadge}>{req.subject}</span>
                <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[req.status] }}>
                  {req.status}
                </span>
              </div>
              <h3 style={styles.reqTopic}>{req.topic}</h3>
              <p style={styles.reqMeta}>Posted by {req.requester} • {new Date(req.createdAt).toLocaleDateString()}</p>

              {/* Responses */}
              {req.responses.length > 0 && (
                <div style={styles.responsesSection}>
                  <strong>Responses ({req.responses.length})</strong>
                  {req.responses.map((resp, i) => (
                    <div key={i} style={styles.responseItem}>
                      <div style={styles.responseText}>{resp.text}</div>
                      <div style={styles.responseMeta}>— {resp.helper} • {resp.date}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Accept workflow */}
              {req.status === 'Open' && (
                <div style={styles.replySection}>
                  <input
                    style={{ ...styles.replyInput, ...(responseErrors[req._id]?.helper ? styles.inputError : {}) }}
                    placeholder="Your name"
                    value={helperNames[req._id] || ''}
                    onChange={e => setHelperNames({ ...helperNames, [req._id]: e.target.value })}
                  />
                  {responseErrors[req._id]?.helper && <span style={styles.error}>{responseErrors[req._id].helper}</span>}
                  <button style={styles.acceptBtn} onClick={() => handleAccept(req._id)}>Accept</button>
                </div>
              )}

              {/* Respond workflow */}
              {req.status === 'In Progress' && (
                <div style={styles.replySection}>
                  <input style={styles.replyInput} placeholder="Helper name" value={req.acceptedBy || ''} disabled />
                  <textarea
                    style={{ ...styles.textarea, ...(responseErrors[req._id]?.text ? styles.inputError : {}) }}
                    placeholder="Write your response..." rows={2}
                    value={responseInputs[req._id] || ''}
                    onChange={e => setResponseInputs({ ...responseInputs, [req._id]: e.target.value })}
                  />
                  {responseErrors[req._id]?.text && <span style={styles.error}>{responseErrors[req._id].text}</span>}
                  <button style={styles.respondBtn} onClick={() => handleRespond(req._id)}>Respond</button>
                </div>
              )}

              <div style={styles.actionRow}>
                {req.status === 'In Progress' && (
                  <button style={styles.closeBtn} onClick={() => handleClose(req._id)}>Mark Closed</button>
                )}
                <button style={styles.deleteBtn} onClick={() => handleDelete(req._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '0', padding: 0, backgroundColor: 'transparent' },
  container: { maxWidth: '860px', margin: '0 auto' },
  heading: { fontSize: '28px', color: 'var(--text)', marginBottom: '6px' },
  subheading: { color: 'var(--muted)', marginBottom: '20px' },
  success: { backgroundColor: 'rgba(52, 211, 153, 0.12)', color: '#34d399', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600', border: '1px solid rgba(52, 211, 153, 0.25)' },
  statsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' },
  statBox: { color: 'var(--text)', padding: '10px 18px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', border: '1px solid rgba(255, 255, 255, 0.12)' },
  filterRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  filterBtn: { padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255, 255, 255, 0.04)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)' },
  filterActive: { backgroundColor: 'rgba(var(--accent-rgb), 0.20)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.45)' },
  newBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginBottom: '20px', fontSize: '14px', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.25)' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '24px', marginBottom: '24px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.25)', border: '1px solid var(--panel-border)' },
  cardTitle: { marginBottom: '16px', color: 'var(--text)', fontSize: '18px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '13px', color: 'var(--muted)', marginTop: '8px' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  inputError: { border: '1.5px solid rgba(251, 113, 133, 0.85)' },
  error: { color: 'var(--danger)', fontSize: '12px', display: 'block', marginBottom: '6px', fontWeight: '600' },
  submitBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '11px 22px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginTop: '8px' },
  reqCard: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '20px', marginBottom: '16px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.18)', border: '1px solid var(--panel-border)' },
  reqHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  subjectBadge: { backgroundColor: 'rgba(var(--accent-rgb), 0.16)', color: 'var(--text)', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(var(--accent2-rgb), 0.40)' },
  statusBadge: { color: 'var(--text)', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(255, 255, 255, 0.12)' },
  reqTopic: { fontSize: '16px', color: 'var(--text)', marginBottom: '4px' },
  reqMeta: { color: 'var(--muted2)', fontSize: '12px', marginBottom: '12px' },
  responsesSection: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '12px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.10)' },
  responseItem: { marginTop: '8px', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.10)', borderLeft: '3px solid rgba(var(--accent2-rgb), 0.55)' },
  responseText: { fontSize: '14px', color: 'var(--text)' },
  responseMeta: { fontSize: '11px', color: 'var(--muted2)', marginTop: '4px', fontWeight: '600' },
  replySection: { marginBottom: '12px' },
  replyInput: { width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '6px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  acceptBtn: { backgroundColor: 'rgba(var(--accent2-rgb), 0.22)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.35)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', marginTop: '4px', fontWeight: '900' },
  respondBtn: { backgroundColor: 'rgba(var(--accent2-rgb), 0.30)', color: 'var(--bg)', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', marginTop: '4px', fontWeight: '900' },
  actionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' },
  closeBtn: { backgroundColor: 'rgba(var(--accent-rgb), 0.16)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.35)', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  deleteBtn: { backgroundColor: 'rgba(251, 113, 133, 0.12)', color: 'var(--danger)', border: '1px solid rgba(251, 113, 133, 0.35)', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  emptyState: { textAlign: 'center', color: 'var(--muted2)', padding: '40px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', border: '1px dashed rgba(var(--accent2-rgb), 0.35)' },
}

export default HelpRequest