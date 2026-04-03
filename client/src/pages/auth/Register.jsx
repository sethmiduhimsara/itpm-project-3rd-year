import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'

function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const name = form.name.trim()
    const email = form.email.trim()
    if (!name || !email || !form.password || !form.confirmPassword)
      { setError('All fields are required.'); return }
    if (name.length < 2)
      { setError('Name must be at least 2 characters.'); return }
    if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(name))
      { setError('Name can only contain letters, spaces, apostrophes, hyphens, and periods.'); return }
    if (!emailPattern.test(email))
      { setError('Enter a valid email address.'); return }
    if (form.password.length < 6)
      { setError('Password must be at least 6 characters.'); return }
    if (/\s/.test(form.password))
      { setError('Password cannot contain spaces.'); return }
    if (form.password !== form.confirmPassword)
      { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password: form.password,
      })
      login(res.data.user, res.data.token)
      navigate('/discussion', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
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

        <h2 style={s.title}>Create account</h2>
        <p style={s.subtitle}>Join the student community today</p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Full Name</label>
          <input
            style={s.input} type="text" placeholder="Your full name"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />

          <label style={s.label}>Email Address</label>
          <input
            style={s.input} type="email" placeholder="you@university.edu"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input} type="password" placeholder="Min. 6 characters"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />

          <label style={s.label}>Confirm Password</label>
          <input
            style={s.input} type="password" placeholder="Repeat your password"
            value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            autoComplete="new-password"
          />

          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={s.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in</Link>
        </p>
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
  brand: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
  brandMark: {
    width: '44px', height: '44px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '900', fontSize: '16px', color: '#fff',
  },
  brandName: { fontSize: '18px', fontWeight: '900', color: '#f1f5f9' },
  brandTag: { fontSize: '12px', color: '#94a3b8' },
  title: { fontSize: '24px', fontWeight: '900', color: '#f1f5f9', margin: '0 0 6px' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: '0 0 20px' },
  errorBox: {
    background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.4)',
    color: '#fb7185', borderRadius: '10px', padding: '12px 14px',
    fontSize: '13px', fontWeight: '600', marginBottom: '12px',
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', marginTop: '12px' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '14px',
    border: '1.5px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '13px', marginTop: '20px',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontWeight: '800', fontSize: '15px', cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(124,58,237,0.35)',
  },
  switchText: { textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '20px' },
  link: { color: '#7c3aed', fontWeight: '700', textDecoration: 'none' },
}

export default Register
