import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useActivities } from '../../contexts/ActivityContext'

function parseISODate(dateStr) {
  // Normalizes dates to midnight to avoid timezone surprises.
  return new Date(`${dateStr}T00:00:00`)
}

function startOfWeekMonday(d) {
  const date = new Date(d)
  const day = date.getDay() // 0=Sun..6=Sat
  const diff = (day + 6) % 7 // days since Monday
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d, days) {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  return date
}

function monthKey(d) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function formatMonthLabel(d) {
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

function buildWeeklyChartData(activities, periodsCount = 4) {
  const acts = Array.isArray(activities) ? activities : []
  if (acts.length === 0) {
    return Array.from({ length: periodsCount }, (_, idx) => ({
      week: `Week ${idx + 1}`,
      posts: 0,
      replies: 0,
      helpGiven: 0,
    }))
  }

  const dates = acts.map((a) => parseISODate(a.date)).filter(Boolean)
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const maxWeekStart = startOfWeekMonday(maxDate)

  const weekStarts = Array.from({ length: periodsCount }, (_, i) => {
    // oldest -> newest
    return addDays(maxWeekStart, -7 * (periodsCount - 1 - i))
  })

  const buckets = new Map(
    weekStarts.map((ws) => {
      const key = ws.toISOString().slice(0, 10)
      return [
        key,
        { posts: 0, replies: 0, helpGiven: 0 },
      ]
    }),
  )

  for (const a of acts) {
    const d = parseISODate(a.date)
    const ws = startOfWeekMonday(d).toISOString().slice(0, 10)
    if (!buckets.has(ws)) continue

    if (a.type === 'Discussion') buckets.get(ws).posts += 1
    else if (a.type === 'Help Given' || a.type === 'Help Received') buckets.get(ws).replies += 1
    else if (a.type === 'Resource') buckets.get(ws).helpGiven += 1
  }

  return weekStarts.map((ws, idx) => {
    const key = ws.toISOString().slice(0, 10)
    const b = buckets.get(key)
    return {
      week: `Week ${idx + 1}`,
      posts: b.posts,
      replies: b.replies,
      helpGiven: b.helpGiven,
    }
  })
}

function buildMonthlyChartData(activities, periodsCount = 4) {
  const acts = Array.isArray(activities) ? activities : []
  if (acts.length === 0) {
    return Array.from({ length: periodsCount }, (_, idx) => ({
      month: `Month ${idx + 1}`,
      activities: 0,
    }))
  }

  const dates = acts.map((a) => parseISODate(a.date)).filter(Boolean)
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const maxMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)

  const monthStarts = Array.from({ length: periodsCount }, (_, i) => {
    const monthsBack = periodsCount - 1 - i
    const d = new Date(maxMonthStart)
    d.setMonth(d.getMonth() - monthsBack)
    return d
  })

  const buckets = new Map(
    monthStarts.map((ms) => {
      const key = monthKey(ms)
      return [key, 0]
    }),
  )

  for (const a of acts) {
    const d = parseISODate(a.date)
    const key = monthKey(d)
    if (!buckets.has(key)) continue
    buckets.set(key, buckets.get(key) + 1)
  }

  return monthStarts.map((ms) => ({
    month: formatMonthLabel(ms),
    activities: buckets.get(monthKey(ms)),
  }))
}

const TYPE_COLORS = {
  Discussion: '#0284c7',
  'Help Given': '#22d3ee',
  Resource: '#60a5fa',
  'Help Received': '#fb7185',
}

function AcademicProgress() {
  const { activities, addActivity, deleteActivity, pointsMap } = useActivities()
  const [form, setForm] = useState({ type: 'Discussion', description: '' })
  const [errors, setErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [view, setView] = useState('weekly')

  const totalPoints = useMemo(() => activities.reduce((sum, a) => sum + a.points, 0), [activities])
  const level = totalPoints >= 100 ? 'Expert' : totalPoints >= 50 ? 'Intermediate' : 'Beginner'

  const weeklyChartData = useMemo(() => buildWeeklyChartData(activities, 4), [activities])
  const monthlyChartData = useMemo(() => buildMonthlyChartData(activities, 4), [activities])

  const validate = () => {
    const newErrors = {}
    if (!form.description.trim()) newErrors.description = 'Description is required.'
    else if (form.description.trim().length < 5) newErrors.description = 'Description must be at least 5 characters.'
    else if (form.description.trim().length > 150) newErrors.description = 'Description must be under 150 characters.'
    return newErrors
  }

  const handleAddActivity = () => {
    const foundErrors = validate()
    if (Object.keys(foundErrors).length > 0) { setErrors(foundErrors); return }
    addActivity({ type: form.type, description: form.description })
    setForm({ type: 'Discussion', description: '' })
    setErrors({})
    setShowForm(false)
    setSuccessMsg('Activity logged successfully!')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleDelete = (id) => {
    if (window.confirm('Remove this activity?')) {
      deleteActivity(id)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Academic Progress & Activity</h1>
        <p style={styles.subheading}>Track your academic engagement and participation over time.</p>

        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {/* Summary Cards */}
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryNum}>{activities.length}</div>
            <div style={styles.summaryLabel}>Total Activities</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryNum}>{totalPoints}</div>
            <div style={styles.summaryLabel}>Total Points</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryNum}>{activities.filter(a => a.type === 'Help Given').length}</div>
            <div style={styles.summaryLabel}>Peers Helped</div>
          </div>
          <div style={{ ...styles.summaryCard, backgroundColor: 'rgba(var(--accent-rgb), 0.14)' }}>
            <div style={{ ...styles.summaryNum, color: 'var(--accent2)' }}>{level}</div>
            <div style={{ ...styles.summaryLabel, color: 'var(--muted2)' }}>Your Level</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressCard}>
          <div style={styles.progressHeader}>
            <span>Progress to next level</span>
            <span>{Math.min(totalPoints, 100)}/100 pts</span>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${Math.min((totalPoints / 100) * 100, 100)}%` }} />
          </div>
        </div>

        {/* Chart Toggle */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3 style={styles.cardTitle}>Activity Overview</h3>
            <div style={styles.toggleRow}>
              <button style={{ ...styles.toggleBtn, ...(view === 'weekly' ? styles.toggleActive : {}) }} onClick={() => setView('weekly')}>Weekly</button>
              <button style={{ ...styles.toggleBtn, ...(view === 'monthly' ? styles.toggleActive : {}) }} onClick={() => setView('monthly')}>Monthly</button>
            </div>
          </div>

          {view === 'weekly' ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="posts" fill="#22d3ee" name="Posts" />
                <Bar dataKey="replies" fill="#0284c7" name="Replies" />
                <Bar dataKey="helpGiven" fill="#34d399" name="Help Given" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="activities" stroke="#0284c7" strokeWidth={2} name="Total Activities" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Log Activity */}
        <button style={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Log Activity'}
        </button>

        {showForm && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Log New Activity</h3>

            <label style={styles.label}>Activity Type *</label>
            <select style={styles.input} value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              {Object.keys(pointsMap).map(t => (
                <option key={t} value={t}>{t} (+{pointsMap[t]} pts)</option>
              ))}
            </select>

            <label style={styles.label}>Description *</label>
            <input
              style={{ ...styles.input, ...(errors.description ? styles.inputError : {}) }}
              placeholder="Briefly describe the activity"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
            {errors.description && <span style={styles.error}>{errors.description}</span>}

            <button style={styles.submitBtn} onClick={handleAddActivity}>Log Activity</button>
          </div>
        )}

        {/* Activity History */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Activity History</h3>
          {activities.length === 0 ? (
            <p style={{ color: 'var(--muted2)', textAlign: 'center', fontWeight: '700' }}>No activities logged yet.</p>
          ) : (
            activities.map(a => (
              <div key={a._id} style={styles.activityItem}>
                <div style={styles.activityLeft}>
                  <span style={{ ...styles.typeDot, backgroundColor: TYPE_COLORS[a.type] || '#999' }} />
                  <div>
                    <div style={styles.activityDesc}>{a.description}</div>
                    <div style={styles.activityMeta}>{a.type} • {a.date}</div>
                  </div>
                </div>
                <div style={styles.activityRight}>
                  <span style={styles.pointsBadge}>+{a.points} pts</span>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(a._id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
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
  summaryRow: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' },
  summaryCard: { flex: '1 1 140px', backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '20px', textAlign: 'center', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.16)', border: '1px solid var(--panel-border)' },
  summaryNum: { fontSize: '28px', fontWeight: '900', color: 'var(--text)' },
  summaryLabel: { fontSize: '13px', color: 'var(--muted)', marginTop: '4px', fontWeight: '700' },
  progressCard: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.16)', border: '1px solid var(--panel-border)' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--muted)' },
  progressBarBg: { backgroundColor: 'rgba(255, 255, 255, 0.10)', borderRadius: '20px', height: '12px' },
  progressBarFill: { backgroundColor: 'var(--accent)', borderRadius: '20px', height: '12px', transition: 'width 0.5s ease' },
  chartCard: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.16)', border: '1px solid var(--panel-border)' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontSize: '17px', color: 'var(--text)' },
  toggleRow: { display: 'flex', gap: '6px' },
  toggleBtn: { padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'rgba(255, 255, 255, 0.04)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', fontWeight: '800' },
  toggleActive: { backgroundColor: 'rgba(var(--accent-rgb), 0.20)', color: 'var(--text)', border: '1px solid rgba(var(--accent2-rgb), 0.45)' },
  newBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', marginBottom: '20px', fontSize: '14px', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.25)' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.16)', border: '1px solid var(--panel-border)' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '13px', color: 'var(--muted)', marginTop: '8px' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--panel-border)', marginBottom: '4px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' },
  inputError: { border: '1.5px solid rgba(251, 113, 133, 0.85)' },
  error: { color: 'var(--danger)', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: '600' },
  submitBtn: { backgroundColor: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '11px 22px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', marginTop: '8px' },
  activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.10)' },
  activityLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  typeDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  activityDesc: { fontSize: '14px', color: 'var(--text)', fontWeight: '700' },
  activityMeta: { fontSize: '12px', color: 'var(--muted2)', marginTop: '2px', fontWeight: '600' },
  activityRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  pointsBadge: { backgroundColor: 'rgba(var(--accent-rgb), 0.14)', color: 'var(--text)', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '900', border: '1px solid rgba(var(--accent2-rgb), 0.35)' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted2)' },
}

export default AcademicProgress