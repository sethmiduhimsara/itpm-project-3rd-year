import React, { useState, useEffect, useMemo } from 'react'
import { useActivities } from '../../../contexts/ActivityContext'
import './Dashboard.css'

// Activity type to color mapping
const TYPE_COLORS = {
  'Discussion': '#a78bfa',
  'Help Given': '#4f8ef7',
  'Help Received': '#fb923c',
  'Resource': '#34d399',
}

const TYPE_TAGS = {
  'Discussion': 'Discussion',
  'Help Given': 'Peer Help',
  'Help Received': 'Peer Help',
  'Resource': 'Resource',
}

// Robust date parsing - normalizes to midnight to avoid timezone surprises
function parseISODate(dateStr) {
  return new Date(`${dateStr}T00:00:00`)
}

// Calculate start of week (Monday)
function startOfWeekMonday(d) {
  const date = new Date(d)
  const day = date.getDay() // 0=Sun..6=Sat
  const diff = (day + 6) % 7 // days since Monday
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// Transform activities to week data
function getWeekData(activities) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()
  const weekStart = startOfWeekMonday(today)

  const weekCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }

  activities.forEach(a => {
    if (!a.date) return
    const actDate = parseISODate(a.date)
    const daysDiff = Math.floor((actDate - weekStart) / (1000 * 60 * 60 * 24))
    if (daysDiff >= 0 && daysDiff <= 6) {
      const dayName = DAYS[daysDiff]
      weekCounts[dayName]++
    }
  })

  const maxCount = Math.max(...Object.values(weekCounts), 1)
  return DAYS.map(day => ({
    day,
    value: Math.min((weekCounts[day] / maxCount) * 100, 100),
    color: '#4f8ef7',
  }))
}

// Transform activities to recent activity list
function getRecentActivities(activities) {
  return activities.slice(0, 5).map(a => ({
    color: TYPE_COLORS[a.type] || '#4f8ef7',
    text: a.description,
    time: new Date(a.date).toLocaleDateString(),
    tag: TYPE_TAGS[a.type] || a.type,
  }))
}

// Calculate module engagement percentages from activities
function getModuleEngagement(activities) {
  const total = Math.max(activities.length, 1)
  const helpGiven = activities.filter(a => a.type === 'Help Given').length
  const discussions = activities.filter(a => a.type === 'Discussion').length
  const resources = activities.filter(a => a.type === 'Resource').length

  return [
    { label: 'Peer Support',    pct: Math.round((helpGiven / total) * 100), color: '#4f8ef7' },
    { label: 'Discussions',     pct: Math.round((discussions / total) * 100), color: '#a78bfa' },
    { label: 'Resource Access', pct: Math.round((resources / total) * 100), color: '#34d399' },
    { label: 'Other Activities',pct: Math.round((Math.max(0, total - helpGiven - discussions - resources) / total) * 100), color: '#fb923c' },
  ]
}

const BADGES = [
  { icon: '🤝', label: 'Helper x5',    bg: 'rgba(79,142,247,0.12)',  color: '#4f8ef7' },
  { icon: '📚', label: 'Sharer',       bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  { icon: '🔥', label: '7-Day Streak', bg: 'rgba(251,146,60,0.12)',  color: '#fb923c' },
  { icon: '⭐', label: 'Top Student',  bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
]

const STREAK_DATA = Array.from({ length: 60 }, (_, i) =>
  i >= 53 ? 0.95 : Math.random()
)

// Calculate stats from activities
function calculateStats(activities) {
  const helpGiven = activities.filter(a => a.type === 'Help Given').length
  const resources = activities.filter(a => a.type === 'Resource').length
  const discussions = activities.filter(a => a.type === 'Discussion').length
  const total = activities.length

  return [
    { icon: '🤝', label: 'Peer Help Given',    value: helpGiven.toString(), change: 'Times helped', up: true,  color: '#4f8ef7' },
    { icon: '📁', label: 'Resources Used',     value: resources.toString(), change: 'Resources',  up: true,  color: '#34d399' },
    { icon: '💬', label: 'Discussions Joined', value: discussions.toString(), change: 'Discussions', up: true, color: '#a78bfa' },
    { icon: '⚡', label: 'Total Activities',   value: total.toString(),     change: 'Overall',     up: true,  color: '#fb923c' },
  ]
}

// ── Helper ────────────────────────────────────────────────────
const streakColor = (v) => {
  if (v > 0.8)  return '#4f8ef7'
  if (v > 0.6)  return 'rgba(79,142,247,0.55)'
  if (v > 0.35) return 'rgba(79,142,247,0.25)'
  return 'var(--surface2)'
}

// ── Component ─────────────────────────────────────────────────
const Dashboard = () => {
  const { activities } = useActivities()
  const [period,     setPeriod]     = useState('Week')
  const [barHeights, setBarHeights] = useState([])
  const [progFills,  setProgFills]  = useState([])

  const WEEK_DATA = useMemo(() => getWeekData(activities), [activities])
  const ACTIVITIES = useMemo(() => getRecentActivities(activities), [activities])
  const STAT_CARDS = useMemo(() => calculateStats(activities), [activities])
  const MODULES = useMemo(() => getModuleEngagement(activities), [activities])

  // Animate bars & progress bars on mount
  useEffect(() => {
    const t1 = setTimeout(() => setBarHeights(WEEK_DATA.map(d => d.value)), 300)
    const t2 = setTimeout(() => setProgFills(MODULES.map(m => m.pct)),      500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [WEEK_DATA, MODULES])

  return (
    <div className="dashboard-wrapper">

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <div className="dash-title">My Academic Dashboard</div>
          <div className="dash-sub">Track your progress, activity &amp; engagement</div>
        </div>

        <div className="dash-header-right">
          <div className="period-tabs">
            {['Week', 'Month', 'Semester'].map(p => (
              <button
                key={p}
                className={`period-tab ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          {/* <div className="notif-dot">3</div> */}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        {STAT_CARDS.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-glow" style={{ background: s.color }} />
            <div className="stat-icon-wrap" style={{ background: `${s.color}22` }}>
              {s.icon}
            </div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-change ${s.up ? 'up' : 'down'}`}>
              {s.up ? '↑' : '↓'} {s.change}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2 : Bar Chart + Activity Feed ── */}
      <div className="dash-grid-2">

        {/* Weekly bar chart */}
        <div className="dash-card">
          <div className="dash-card-title">
            Weekly Activity
            <a>View report →</a>
          </div>
          <div className="bar-chart">
            {WEEK_DATA.map((d, i) => (
              <div className="bar-col" key={i}>
                <div className="bar-track" style={{ height: 90 }}>
                  <div
                    className="bar-fill"
                    style={{ height: `${barHeights[i]}%`, background: d.color }}
                  />
                </div>
                <div className="bar-day">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="dash-card">
          <div className="dash-card-title">
            Recent Activity
            <a>View all →</a>
          </div>
          {ACTIVITIES.map((a, i) => (
            <div className="activity-item" key={i}>
              <div className="activity-dot" style={{ background: a.color }} />
              <div>
                <div className="activity-text">{a.text}</div>
                <div className="activity-tag">{a.tag}</div>
              </div>
              <div className="activity-time">{a.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3 : Module Engagement + Streak Calendar ── */}
      <div className="dash-grid-2">

        {/* Module progress + badges */}
        <div className="dash-card">
          <div className="dash-card-title">Module Engagement</div>
          {MODULES.map((m, i) => (
            <div className="progress-row" key={i}>
              <div className="progress-label">{m.label}</div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progFills[i]}%`, background: m.color }}
                />
              </div>
              <div className="progress-pct">{m.pct}%</div>
            </div>
          ))}

          <div className="dash-card-title" style={{ marginTop: 20, marginBottom: 10 }}>
            Badges Earned
          </div>
          <div className="badge-row">
            {BADGES.map((b, i) => (
              <div
                className="badge"
                key={i}
                style={{ background: b.bg, color: b.color, borderColor: `${b.color}30` }}
              >
                {b.icon} {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Streak calendar */}
        <div className="dash-card">
          <div className="dash-card-title">Activity Streak Calendar</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Last 60 days —{' '}
            <span style={{ color: '#fb923c', fontWeight: 600 }}>🔥 7-day streak</span>
          </div>
          <div className="streak-grid">
            {STREAK_DATA.map((v, i) => (
              <div
                key={i}
                className="streak-cell"
                style={{ background: streakColor(v) }}
              />
            ))}
          </div>
          <div className="streak-footer">
            <span>60 days ago</span>
            <span>Today.</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard