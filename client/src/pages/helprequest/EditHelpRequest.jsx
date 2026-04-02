import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNotifications } from '../../contexts/NotificationContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

const URGENCY_LEVELS = ['Low', 'Medium', 'High']
const VISIBILITY_MODES = ['Public', 'Private']

function EditHelpRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pushNotification } = useNotifications()
  const { user } = useAuth()

  const [form, setForm] = useState({
    subject: '',
    title: '',
    description: '',
    visibility: 'Public',
    urgency: 'Medium',
    file: null,
    targetStudent: ''
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await api.get(`/help-requests/${id}`)
        const data = res.data

        // Authorization check
        if (user.role !== 'admin' && data.requester !== user.name) {
          pushNotification({ title: 'Access Denied', message: 'You cannot edit this request.' })
          navigate('/help-request')
          return
        }

        setForm({
          subject: data.subject,
          title: data.title,
          description: data.description,
          visibility: data.visibility || 'Public',
          urgency: data.urgency || 'Medium',
          targetStudent: data.targetStudent || '',
          file: null // Files are handled separately if re-uploaded
        })
      } catch (err) {
        setServerError('Failed to load help request data.')
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [id, user, navigate, pushNotification])

  const validateField = (name, value) => {
    if (name === 'subject' || name === 'title') {
      const regex = /^[a-zA-Z\s]*$/
      if (!regex.test(value)) {
        return 'Only letters and spaces are allowed.'
      }
    }
    return ''
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))

    const fieldError = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: fieldError }))
  }

  const validate = () => {
    const newErrors = {}

    // Check required and alphabetic for subject
    if (!form.subject.trim()) {
      newErrors.subject = 'Subject is required.'
    } else if (!/^[a-zA-Z\s]+$/.test(form.subject)) {
      newErrors.subject = 'Only letters and spaces are allowed.'
    }

    // Check required and alphabetic for title
    if (!form.title.trim()) {
      newErrors.title = 'Title is required.'
    } else if (!/^[a-zA-Z\s]+$/.test(form.title)) {
      newErrors.title = 'Only letters and spaces are allowed.'
    } else if (form.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters.'
    }

    if (!form.description.trim()) newErrors.description = 'Description is required.'
    else if (form.description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters.'

    if (form.visibility === 'Private' && !form.targetStudent.trim()) {
      newErrors.targetStudent = 'Target student name is required for private requests.'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }

    setSubmitting(true)
    setServerError('')
    try {
      const formData = new FormData()
      formData.append('subject', form.subject)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('visibility', form.visibility)
      formData.append('urgency', form.urgency)
      if (form.visibility === 'Private') {
        formData.append('targetStudent', form.targetStudent.trim())
      }
      if (form.file) {
        formData.append('file', form.file)
      }

      await api.patch(`/help-requests/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      pushNotification({
        title: 'Help Request Updated',
        message: `Your request "${form.title}" has been updated.`
      })

      navigate('/help-request')
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to update help request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={styles.loading}>Loading request data...</div>

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/help-request')}>← Back</button>
          <h1 style={styles.heading}>Edit Help Request</h1>
          <p style={styles.subheading}>Update the details of your request.</p>
        </div>

        <form style={styles.card} onSubmit={handleSubmit}>
          {serverError && <div style={styles.serverError}>{serverError}</div>}

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Subject *</label>
              <input
                name="subject"
                style={{ ...styles.input, ...(errors.subject ? styles.inputError : {}) }}
                placeholder="e.g., Mathematics, Database, ITPM"
                value={form.subject}
                onChange={handleInputChange}
              />
              {errors.subject && <span style={styles.error}>{errors.subject}</span>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Urgency *</label>
              <div style={styles.toggleGroup}>
                {URGENCY_LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      ...(form.urgency === level ? styles.toggleActive : {})
                    }}
                    onClick={() => setForm({ ...form, urgency: level })}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label style={styles.label}>Title *</label>
          <input
            name="title"
            style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
            placeholder="Sumarize your question"
            value={form.title}
            onChange={handleInputChange}
          />
          {errors.title && <span style={styles.error}>{errors.title}</span>}

          <label style={styles.label}>Description *</label>
          <textarea
            style={{ ...styles.textarea, ...(errors.description ? styles.inputError : {}) }}
            placeholder="Provide context..."
            rows={6}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          {errors.description && <span style={styles.error}>{errors.description}</span>}

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Replace Attachment (Optional)</label>
              <input
                type="file"
                style={styles.fileInput}
                onChange={e => setForm({ ...form, file: e.target.files[0] })}
                accept="image/*,.pdf"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Visibility *</label>
              <div style={styles.toggleGroup}>
                {VISIBILITY_MODES.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      ...(form.visibility === mode ? styles.toggleActive : {})
                    }}
                    onClick={() => setForm({ ...form, visibility: mode })}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.visibility === 'Private' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Target Student Name *</label>
              <input
                style={{ ...styles.input, ...(errors.targetStudent ? styles.inputError : {}) }}
                placeholder="Enter the name of the student"
                value={form.targetStudent}
                onChange={e => setForm({ ...form, targetStudent: e.target.value })}
              />
              {errors.targetStudent && <span style={styles.error}>{errors.targetStudent}</span>}
            </div>
          )}

          <div style={styles.footer}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => navigate('/help-request')}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100%', padding: '20px 0' },
  container: { maxWidth: '800px', margin: '0 auto' },
  loading: { padding: '100px', textAlign: 'center', color: 'var(--muted)', fontSize: '18px' },
  header: { marginBottom: '30px' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '14px', fontWeight: '700', marginBottom: '10px', padding: 0 },
  heading: { fontSize: '32px', color: 'var(--text)', marginBottom: '8px' },
  subheading: { color: 'var(--muted)', fontSize: '16px' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '20px', padding: '32px', border: '1px solid var(--panel-border)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)' },
  row: { display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: '250px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--panel-border)', fontSize: '15px', backgroundColor: 'rgba(255, 255, 255, 0.03)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--panel-border)', fontSize: '15px', backgroundColor: 'rgba(255, 255, 255, 0.03)', color: 'var(--text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px' },
  fileInput: { color: 'var(--muted2)', fontSize: '13px' },
  inputError: { border: '1.5px solid var(--danger)' },
  error: { color: 'var(--danger)', fontSize: '12px', marginTop: '-5px', marginBottom: '15px', display: 'block', fontWeight: '600' },
  serverError: { backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)' },
  toggleGroup: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--panel-border)' },
  toggleBtn: { flex: 1, padding: '8px 12px', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s' },
  toggleActive: { backgroundColor: 'var(--accent)', color: 'var(--bg)' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' },
  cancelBtn: { padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--panel-border)', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  submitBtn: { padding: '12px 32px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontWeight: '900', fontSize: '14px', boxShadow: '0 10px 20px rgba(var(--accent-rgb), 0.3)' },
}

export default EditHelpRequest
