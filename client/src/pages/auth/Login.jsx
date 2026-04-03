import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const email = form.email.trim()
    if (!email || !form.password) { setError('All fields are required.'); return }
    if (!emailPattern.test(email)) { setError('Enter a valid email address.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (/\s/.test(form.password)) { setError('Password cannot contain spaces.'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password: form.password })
      login(res.data.user, res.data.token)
      navigate(res.data.user.role === 'admin' ? '/admin/discussion' : '/discussion', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandMark}>UC</div>
          <div>
            <div style={s.brandName}>UniConnect</div>
            <div style={s.brandTag}>Academic Platform</div>
          </div>
        </div>

        <h2 style={s.title}>Welcome back</h2>
        <p style={s.subtitle}>Sign in to continue to your dashboard</p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email Address</label>
          <input
            style={s.input}
            type="email"
            placeholder="you@university.edu"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
          />

          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={s.switchText}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={s.link}>Register here</Link>
        </p>

        <div style={s.adminHint}>
          <strong>Admin?</strong> Use your admin credentials above — no separate page needed.
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1729 50%, #130d2b 100%)',
    padding: '20px',
  },
  card: {
    width: '100%', maxWidth: '420px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '20px',
    padding: '40px 36px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(12px)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' },
  brandMark: {
    width: '44px', height: '44px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '900', fontSize: '16px', color: '#fff',
  },
  brandName: { fontSize: '18px', fontWeight: '900', color: '#f1f5f9' },
  brandTag: { fontSize: '12px', color: '#94a3b8' },
  title: { fontSize: '24px', fontWeight: '900', color: '#f1f5f9', margin: '0 0 6px' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: '0 0 24px' },
  errorBox: {
    background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.4)',
    color: '#fb7185', borderRadius: '10px', padding: '12px 14px',
    fontSize: '13px', fontWeight: '600', marginBottom: '16px',
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', marginTop: '14px' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '14px',
    border: '1.5px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btn: {
    width: '100%', padding: '13px', marginTop: '24px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontWeight: '800', fontSize: '15px', cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(124,58,237,0.35)',
    transition: 'opacity 0.2s',
  },
  switchText: { textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '20px' },
  link: { color: '#7c3aed', fontWeight: '700', textDecoration: 'none' },
  adminHint: {
    marginTop: '20px', padding: '12px 14px',
    background: 'rgba(124,58,237,0.08)', borderRadius: '10px',
    border: '1px solid rgba(124,58,237,0.25)',
    fontSize: '12px', color: '#94a3b8', textAlign: 'center',
  },
}

export default Login
