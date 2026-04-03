import React, { useState, useEffect, useMemo } from 'react'
import './History.css'

// Activity type to display mapping
const TYPE_MAP = {
  'Discussion': { icon: '💬', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', type: 'discussion' },
  'Help Given': { icon: '🤝', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)', type: 'peer' },
  'Help Received': { icon: '🤝', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)', type: 'peer' },
  'Resource': { icon: '📁', color: '#34d399', bg: 'rgba(52,211,153,0.12)', type: 'resource' },
}

const FILTERS = [
  { label: 'All',        value: 'all',        icon: '⚡', color: '#f0f4ff' },
  { label: 'Peer Help',  value: 'peer',       icon: '🤝', color: '#4f8ef7' },
  { label: 'Resources',  value: 'resource',   icon: '📁', color: '#34d399' },
  { label: 'Discussions',value: 'discussion', icon: '💬', color: '#a78bfa' },
]

// Transform activities to history format
function transformActivities(activities) {
  return activities.map((a, idx) => {
    const typeInfo = TYPE_MAP[a.type] || { icon: '📝', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)', type: 'other' }
    const date = new Date(a.date)
    const now = new Date()
    let dayLabel = 'Other'

    const getDayDiff = () => {
      const diff = now.getDate() - date.getDate()
      if (diff === 0) return 'Today'
      if (diff === 1) return 'Yesterday'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    dayLabel = getDayDiff()

    return {
      id: a._id || idx,
      day: dayLabel,
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: typeInfo.type,
      ...typeInfo,
      title: a.description,
      subject: a.type,
      status: null,
    }
  }).sort((a, b) => new Date(b.date) - new Date(a.date))
}

const CATEGORIES = [
  { label: 'Peer Help',   count: 0, color: '#4f8ef7', pct: 0 },
  { label: 'Resources',   count: 0, color: '#34d399', pct: 0 },
  { label: 'Discussions', count: 0, color: '#a78bfa', pct: 0 },
]

// Mini calendar helpers
const CAL_DAYS   = ['S','M','T','W','T','F','S']
const MONTH_NAME = 'March 2026'
const MARCH_START_DOW = 0
const MARCH_DAYS      = 31
const TODAY_DATE      = 22
const ACTIVE_DAYS = new Set([3,5,7,8,10,12,14,15,17,18,19,20,21,22])

// ── Component ─────────────────────────────────────────────────
const History = ({ activities = [], searchTerm = '' }) => {
  const [activeFilter, setActiveFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [selectedDay,  setSelectedDay]  = useState(new Date().getDate())
  const [catFills,     setCatFills]     = useState(CATEGORIES.map(() => 0))
  const [visibleCount, setVisibleCount] = useState(10)

  const ALL_ACTIVITIES = useMemo(() => transformActivities(activities), [activities])

  useEffect(() => {
    const t = setTimeout(() => setCatFills(CATEGORIES.map(c => c.pct)), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (searchTerm) setSearch(searchTerm)
  }, [searchTerm])

  // Calculate stats from activities
  const STATS = useMemo(() => {
    const total = ALL_ACTIVITIES.length
    const peer = ALL_ACTIVITIES.filter(a => a.type === 'peer').length
    const disc = ALL_ACTIVITIES.filter(a => a.type === 'discussion').length
    const res = ALL_ACTIVITIES.filter(a => a.type === 'resource').length

    return [
      { icon: '⚡', label: 'Total Activities', val: total.toString(),  color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)'  },
      { icon: '🤝', label: 'Peer Help',        val: peer.toString(),   color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)'  },
      { icon: '💬', label: 'Discussions',      val: disc.toString(),   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
      { icon: '📁', label: 'Resources',        val: res.toString(),    color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
    ]
  }, [ALL_ACTIVITIES])

  // Filter logic
  const filtered = ALL_ACTIVITIES.filter(a => {
    const matchType   = activeFilter === 'all' || a.type === activeFilter
    const matchSearch = search === '' || a.title.toLowerCase().includes(search.toLowerCase()) || a.subject.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  // Group by day
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.day]) acc[item.day] = []
    acc[item.day].push(item)
    return acc
  }, {})

  const dayOrder = ['Today', 'Yesterday', 'Mar 19', 'Mar 18']
  const visibleDays = dayOrder.filter(d => grouped[d])

  // Calendar cells
  const calCells = []
  for (let i = 0; i < MARCH_START_DOW; i++) calCells.push(null)
  for (let d = 1; d <= MARCH_DAYS; d++) calCells.push(d)

  return (
    <div className="history-wrapper">

      {/* ── Header ── */}
      <div className="hist-header">
        <div>
          <div className="hist-title">Activity History</div>
          <div className="hist-sub">A full log of your academic interactions</div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="hist-controls">
        <div className="hist-search">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search activities, subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-chip ${activeFilter === f.value ? 'active' : ''}`}
              style={activeFilter === f.value ? { background: f.color, borderColor: f.color } : {}}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="hist-stats">
        {STATS.map((s, i) => (
          <div className="hist-stat" key={i}>
            <div className="hist-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="hist-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="hist-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="hist-grid">

        {/* Timeline */}
        <div className="hist-card">
          <div className="hist-card-title">
            Timeline
            <span>Sorted by most recent</span>
          </div>
          <div className="hist-result-count">
            Showing {Math.min(filtered.length, visibleCount)} of {filtered.length} activities
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 14 }}>
              No activities found for that filter.
            </div>
          ) : (
            <div className="timeline">
              {visibleDays.map(day => {
                const entries = grouped[day]
                const shown   = entries.slice(0, visibleCount)
                return (
                  <div key={day}>
                    <div className="timeline-day-label">{day}</div>
                    {shown.map((a, i) => (
                      <div
                        className="timeline-entry"
                        key={a.id}
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        {/* Dot on line */}
                        <div className="timeline-dot" style={{ background: a.color }} />

                        {/* Icon */}
                        <div className="entry-icon" style={{ background: a.bg }}>{a.icon}</div>

                        {/* Body */}
                        <div className="entry-body">
                          <div className="entry-title">{a.title}</div>
                          <div className="entry-meta">
                            <span
                              className="entry-tag"
                              style={{ background: a.bg, color: a.color }}
                            >
                              {FILTERS.find(f => f.value === a.type)?.label}
                            </span>
                            <span className="entry-subject">{a.subject}</span>
                            {a.status && (
                              <span className={`entry-status status-${a.status}`}>
                                {a.status === 'open' ? 'Open' : a.status === 'closed' ? 'Closed' : 'In Progress'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Time */}
                        <div className="entry-time">{a.time}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* Load more */}
          {visibleCount < filtered.length && (
            <div className="load-more">
              <button className="load-more-btn" onClick={() => setVisibleCount(v => v + 10)}>
                Load more activities
              </button>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="right-panel">

          {/* Mini Calendar */}
          <div className="mini-cal">
            <div className="mini-cal-header">
              <button className="cal-nav">‹</button>
              <div className="mini-cal-month">{MONTH_NAME}</div>
              <button className="cal-nav">›</button>
            </div>
            <div className="cal-grid">
              {CAL_DAYS.map((d, i) => (
                <div className="cal-day-name" key={i}>{d}</div>
              ))}
              {calCells.map((d, i) =>
                d === null ? (
                  <div className="cal-cell empty" key={i} />
                ) : (
                  <div
                    key={i}
                    className={[
                      'cal-cell',
                      d === TODAY_DATE   ? 'today'    : '',
                      d === selectedDay  ? 'selected' : '',
                      ACTIVE_DAYS.has(d) ? 'has-activity' : '',
                    ].join(' ')}
                    onClick={() => setSelectedDay(d)}
                  >
                    {d}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Category Summary */}
          <div className="cat-card">
            <div className="cat-card-title">By Category</div>
            {CATEGORIES.map((c, i) => (
              <div className="cat-row" key={i}>
                <div className="cat-left">
                  <div className="cat-dot" style={{ background: c.color }} />
                  <div className="cat-name">{c.label}</div>
                </div>
                <div className="cat-right">
                  <div className="cat-bar-mini">
                    <div
                      className="cat-bar-fill"
                      style={{ width: `${catFills[i]}%`, background: c.color }}
                    />
                  </div>
                  <div className="cat-count" style={{ color: c.color }}>{c.count}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

export default History