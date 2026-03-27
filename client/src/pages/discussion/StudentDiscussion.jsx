import { useState, useEffect } from 'react'
import { useActivities } from '../../contexts/ActivityContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

const CATEGORIES = ['All', 'Exams', 'Group Issues', 'Lectures', 'Campus Life', 'General']

function StudentDiscussion() {
  const { addActivity } = useActivities()
  const { user } = useAuth()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', body: '', category: 'Exams' })
  const [errors, setErrors] = useState({})
  const [activeCategory, setActiveCategory] = useState('All')
  const [replyInputs, setReplyInputs] = useState({})
  const [replyErrors, setReplyErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Fetch posts from backend on mount
  useEffect(() => {
    api.get('/posts')
      .then(res => { setPosts(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const validate = () => {
    const newErrors = {}
    if (!form.title.trim()) newErrors.title = 'Title is required.'
    else if (form.title.trim().length < 5) newErrors.title = 'Title must be at least 5 characters.'
    else if (form.title.trim().length > 100) newErrors.title = 'Title must be under 100 characters.'
    if (!form.body.trim()) newErrors.body = 'Description is required.'
    else if (form.body.trim().length < 10) newErrors.body = 'Description must be at least 10 characters.'
    if (!form.category) newErrors.category = 'Please select a category.'
    return newErrors
  }

  const handleSubmit = async () => {
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }
    try {
      const res = await api.post('/posts', { ...form, author: user.name })
      setPosts([res.data, ...posts])
      setForm({ title: '', body: '', category: 'Exams' })
      setErrors({})
      setShowForm(false)
      setSuccessMsg('Post created successfully!')
      addActivity({ type: 'Discussion', description: `Posted: ${res.data.title}`, date: new Date().toISOString() })
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create post')
    }
  }

  const handleReplySubmit = async (postId) => {
    const reply = replyInputs[postId] || ''
    if (!reply.trim()) { setReplyErrors({ ...replyErrors, [postId]: 'Reply cannot be empty.' }); return }
    if (reply.trim().length < 3) { setReplyErrors({ ...replyErrors, [postId]: 'Reply must be at least 3 characters.' }); return }
    const target = posts.find(p => p._id === postId)
    try {
      const res = await api.post(`/posts/${postId}/replies`, { text: reply })
      setPosts(posts.map(p => p._id === postId ? res.data : p))
      setReplyInputs({ ...replyInputs, [postId]: '' })
      setReplyErrors({ ...replyErrors, [postId]: '' })
      addActivity({ type: 'Help Given', description: `Replied to: ${target?.title ?? 'discussion'}` })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`/posts/${id}`)
        setPosts(posts.filter(p => p._id !== id))
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete post')
      }
    }
  }

  const filtered = activeCategory === 'All' ? posts : posts.filter(p => p.category === activeCategory)

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Student Discussion Board</h1>
        <p style={styles.subheading}>Ask questions, share ideas, and help each other!</p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* Category Filter */}
        <div style={styles.filterRow}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              style={{ ...styles.filterBtn, ...(activeCategory === cat ? styles.filterActive : {}) }}
              onClick={() => setActiveCategory(cat)}
            >{cat}</button>
          ))}
        </div>

        {/* Toggle Form */}
        <button style={styles.newPostBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Post'}
        </button>

        {/* Post Form */}
        {showForm && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Create a New Post</h3>

            <label style={styles.label}>Category *</label>
            <select
              style={{ ...styles.input, ...(errors.category ? styles.inputError : {}) }}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <span style={styles.error}>{errors.category}</span>}

            <label style={styles.label}>Post Title *</label>
            <input
              style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
              placeholder="Enter a clear title (min 5 characters)"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && <span style={styles.error}>{errors.title}</span>}

            <label style={styles.label}>Description *</label>
            <textarea
              style={{ ...styles.textarea, ...(errors.body ? styles.inputError : {}) }}
              placeholder="Describe your topic in detail (min 10 characters)"
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              rows={4}
            />
            {errors.body && <span style={styles.error}>{errors.body}</span>}

            <button style={styles.submitBtn} onClick={handleSubmit}>Post Discussion</button>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div style={styles.emptyState}>Loading posts...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>No posts in this category yet.</div>
        ) : (
          filtered.map(post => (
            <div key={post._id} style={styles.postCard}>
              <div style={styles.postHeader}>
                <span style={styles.categoryBadge}>{post.category}</span>
                <span style={styles.postMeta}>{post.author} • {new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 style={styles.postTitle}>{post.title}</h3>
              <p style={styles.postBody}>{post.body}</p>

              <button style={styles.deleteBtn} onClick={() => handleDelete(post._id)}>Delete</button>

              {/* Replies */}
              <div style={styles.repliesSection}>
                <strong>Replies ({post.replies.length})</strong>
                {post.replies.map((r, i) => (
                  <div key={i} style={styles.replyItem}>
                    <span>{r.text}</span>
                    <span style={styles.replyDate}>{r.date}</span>
                  </div>
                ))}
                <div style={styles.replyForm}>
                  <input
                    style={{ ...styles.replyInput, ...(replyErrors[post._id] ? styles.inputError : {}) }}
                    placeholder="Write a reply..."
                    value={replyInputs[post._id] || ''}
                    onChange={e => setReplyInputs({ ...replyInputs, [post._id]: e.target.value })}
                  />
                  <button style={styles.replyBtn} onClick={() => handleReplySubmit(post._id)}>Reply</button>
                </div>
                {replyErrors[post._id] && <span style={styles.error}>{replyErrors[post._id]}</span>}
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
  filterRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  filterBtn: { padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255, 255, 255, 0.04)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)' },
  filterActive: { backgroundColor: 'rgba(var(--accent-rgb), 0.20)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.45)' },
  newPostBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginBottom: '20px', fontSize: '14px', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.25)' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '24px', marginBottom: '24px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.25)', border: '1px solid var(--panel-border)' },
  cardTitle: { marginBottom: '16px', color: 'var(--text)', fontSize: '18px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '14px', color: 'var(--muted)' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '5px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  textarea: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '5px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  inputError: { border: '1.5px solid rgba(251, 113, 133, 0.85)' },
  error: { color: 'var(--danger)', fontSize: '12px', marginBottom: '10px', display: 'block', fontWeight: '600' },
  submitBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginTop: '8px', fontSize: '14px' },
  postCard: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '20px', marginBottom: '16px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.18)', border: '1px solid var(--panel-border)' },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  categoryBadge: { backgroundColor: 'rgba(var(--accent-rgb), 0.18)', color: 'var(--text)', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', border: '1px solid rgba(var(--accent2-rgb), 0.40)' },
  postMeta: { color: 'var(--muted2)', fontSize: '12px' },
  postTitle: { fontSize: '17px', color: 'var(--text)', marginBottom: '6px' },
  postBody: { color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' },
  deleteBtn: { backgroundColor: 'rgba(251, 113, 133, 0.12)', color: 'var(--danger)', border: '1px solid rgba(251, 113, 133, 0.35)', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', marginBottom: '12px', fontWeight: '700' },
  repliesSection: { borderTop: '1px solid rgba(255, 255, 255, 0.10)', paddingTop: '12px' },
  replyItem: { display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '8px 12px', borderRadius: '12px', marginTop: '8px', fontSize: '13px', border: '1px solid rgba(255, 255, 255, 0.08)' },
  replyDate: { color: 'var(--muted2)', fontSize: '11px', fontWeight: '600' },
  replyForm: { display: 'flex', gap: '8px', marginTop: '10px' },
  replyInput: { flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', fontSize: '13px', outline: 'none', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  replyBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' },
  emptyState: { textAlign: 'center', color: 'var(--muted2)', padding: '40px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', border: '1px dashed rgba(var(--accent2-rgb), 0.35)' },
}

export default StudentDiscussion