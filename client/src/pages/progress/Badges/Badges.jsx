import React, { useState, useEffect, useMemo } from 'react'
import './Badges.css'

// Calculate badge progress from activities
function calculateBadgeProgress(activities) {
  const total = activities.length
  const helpGiven = activities.filter(a => a.type === 'Help Given').length
  const resources = activities.filter(a => a.type === 'Resource').length
  const discussions = activities.filter(a => a.type === 'Discussion').length

  return {
    totalXP: Math.floor(total * 10),
    badgesEarned: Math.min(8, Math.floor(total / 10)),
    inProgress: Math.max(0, 5 - Math.floor(total / 8)),
    peerHelped: helpGiven,
    resourcesShared: resources,
  }
}

const LEVELS = [
  { label: 'Newcomer',     icon: '🌱', color: '#6b7a99', done: true,    current: false },
  { label: 'Active',       icon: '⚡', color: '#34d399', done: true,    current: false },
  { label: 'Contributor',  icon: '🚀', color: '#4f8ef7', done: false,   current: true  },
  { label: 'Top Student',  icon: '🏆', color: '#fb923c', done: false,   current: false },
  { label: 'Legend',       icon: '👑', color: '#a78bfa', done: false,   current: false },
]

const BADGE_STATS = [
  { val: '8',   label: 'Badges Earned',   color: '#a78bfa' },
  { val: '5',   label: 'In Progress',     color: '#4f8ef7' },
  { val: '740', label: 'Total XP',        color: '#34d399' },
  { val: '#4',  label: 'Class Rank',      color: '#fb923c' },
]

const ALL_BADGES = [
  // Earned
  {
    id: 1, earned: true, category: 'peer',
    icon: '🤝', color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)',
    name: 'First Helper',
    desc: 'Answered your first peer help request',
    date: 'Mar 3, 2026',
    delay: 0.05,
  },
  {
    id: 2, earned: true, category: 'streak',
    icon: '🔥', color: '#fb923c', bg: 'rgba(251,146,60,0.15)',
    name: '7-Day Streak',
    desc: 'Logged activity for 7 days in a row',
    date: 'Mar 20, 2026',
    delay: 0.10,
  },
  {
    id: 3, earned: true, category: 'resource',
    icon: '📚', color: '#34d399', bg: 'rgba(52,211,153,0.15)',
    name: 'Knowledge Sharer',
    desc: 'Uploaded 5 study resources',
    date: 'Feb 28, 2026',
    delay: 0.15,
  },
  {
    id: 4, earned: true, category: 'discussion',
    icon: '💬', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',
    name: 'Discussion Starter',
    desc: 'Started 3 community discussions',
    date: 'Mar 10, 2026',
    delay: 0.20,
  },
  {
    id: 5, earned: true, category: 'peer',
    icon: '🌟', color: '#fb923c', bg: 'rgba(251,146,60,0.15)',
    name: 'Helper x5',
    desc: 'Helped 5 different students',
    date: 'Mar 15, 2026',
    delay: 0.25,
  },
  {
    id: 6, earned: true, category: 'streak',
    icon: '📅', color: '#34d399', bg: 'rgba(52,211,153,0.15)',
    name: 'Consistent',
    desc: 'Active for 3 consecutive weeks',
    date: 'Mar 18, 2026',
    delay: 0.30,
  },
  {
    id: 7, earned: true, category: 'resource',
    icon: '🔖', color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)',
    name: 'Bookworm',
    desc: 'Downloaded 20 study resources',
    date: 'Mar 12, 2026',
    delay: 0.35,
  },
  {
    id: 8, earned: true, category: 'discussion',
    icon: '🎯', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',
    name: 'On Point',
    desc: 'Got 10 upvotes across discussions',
    date: 'Mar 8, 2026',
    delay: 0.40,
  },

  // In progress / locked
  {
    id: 9, earned: false, category: 'peer',
    icon: '🏅', color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)',
    name: 'Helper x10',
    desc: 'Help 10 different students',
    progress: 18, target: 25,
    delay: 0.10,
  },
  {
    id: 10, earned: false, category: 'streak',
    icon: '⚡', color: '#fb923c', bg: 'rgba(251,146,60,0.15)',
    name: '30-Day Streak',
    desc: 'Log activity for 30 days straight',
    progress: 7, target: 30,
    delay: 0.15,
  },
  {
    id: 11, earned: false, category: 'resource',
    icon: '🗂️', color: '#34d399', bg: 'rgba(52,211,153,0.15)',
    name: 'Resource Master',
    desc: 'Upload 20 study resources',
    progress: 9, target: 20,
    delay: 0.20,
  },
  {
    id: 12, earned: false, category: 'discussion',
    icon: '🔭', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',
    name: 'Deep Thinker',
    desc: 'Receive 50 upvotes on your posts',
    progress: 27, target: 50,
    delay: 0.25,
  },
  {
    id: 13, earned: false, category: 'peer',
    icon: '👑', color: '#fb923c', bg: 'rgba(251,146,60,0.15)',
    name: 'Top Helper',
    desc: 'Close 25 peer help requests',
    progress: 0, target: 25,
    delay: 0.30,
  },
]

const LEADERBOARD = [
  { rank: 1,  name: 'Tharushi M.', initials: 'TM', level: 'Top Student',  badges: 14, xp: '1240', color: '#fb923c', me: false },
  { rank: 2,  name: 'Kavindu R.',  initials: 'KR', level: 'Contributor',  badges: 11, xp: '1050', color: '#34d399', me: false },
  { rank: 3,  name: 'Sithara P.',  initials: 'SP', level: 'Contributor',  badges: 9,  xp: '920',  color: '#a78bfa', me: false },
  { rank: 4,  name: 'Asel Silva',  initials: 'AS', level: 'Contributor',  badges: 8,  xp: '740',  color: '#4f8ef7', me: true  },
  { rank: 5,  name: 'Dilshan W.',  initials: 'DW', level: 'Active',       badges: 6,  xp: '610',  color: '#34d399', me: false },
]

const TABS = ['All', 'Earned', 'In Progress']
const CATEGORIES = ['All', 'Peer Help', 'Resources', 'Discussions', 'Streaks']

// ── Component ─────────────────────────────────────────────────
const Badges = ({ activities = [] }) => {
  const [tab,       setTab]       = useState('All')
  const [category,  setCategory]  = useState('All')
  const [xpFill,    setXpFill]    = useState(0)
  const [progFills, setProgFills] = useState({})

  const badgeProgress = useMemo(() => calculateBadgeProgress(activities), [activities])
  const XP_PCT = Math.min(Math.floor((badgeProgress.totalXP / 1100) * 100), 100)

  // Update BADGE_STATS with real data
  const BADGE_STATS = useMemo(() => [
    { val: badgeProgress.badgesEarned.toString(),   label: 'Badges Earned',   color: '#a78bfa' },
    { val: badgeProgress.inProgress.toString(),     label: 'In Progress',     color: '#4f8ef7' },
    { val: badgeProgress.totalXP.toString(),        label: 'Total XP',        color: '#34d399' },
    { val: '#4',  label: 'Class Rank',      color: '#fb923c' },
  ], [badgeProgress])

  useEffect(() => {
    const t1 = setTimeout(() => setXpFill(XP_PCT), 300)
    const t2 = setTimeout(() => {
      const fills = {}
      ALL_BADGES.forEach(b => {
        if (!b.earned && b.target) {
          fills[b.id] = Math.round((b.progress / b.target) * 100)
        }
      })
      setProgFills(fills)
    }, 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [XP_PCT])

  // Filter
  const catMap = { 'Peer Help': 'peer', 'Resources': 'resource', 'Discussions': 'discussion', 'Streaks': 'streak' }

  const visible = ALL_BADGES.filter(b => {
    const matchTab = tab === 'All' || (tab === 'Earned' ? b.earned : !b.earned)
    const matchCat = category === 'All' || b.category === catMap[category]
    return matchTab && matchCat
  })

  return (
    <div className="badges-wrapper">

      {/* ── Header ── */}
      <div className="badges-header">
        <div>
          <div className="badges-title">Badges &amp; Achievements</div>
          <div className="badges-sub">Your engagement level, earned badges and class ranking</div>
        </div>
      </div>

      {/* ── Engagement Level Hero ── */}
      <div className="level-hero">
        <div className="level-emblem">🚀</div>

        <div className="level-info">
          <div className="level-name">Contributor</div>
          <div className="level-desc">You're actively helping peers and sharing knowledge. Keep it up!</div>

          <div className="xp-bar-label">
            <span>XP Progress</span>
            <strong>740 / 1100 XP</strong>
          </div>
          <div className="xp-track">
            <div className="xp-fill" style={{ width: `${xpFill}%` }} />
          </div>
          <div className="xp-next">360 XP to reach <strong style={{ color: 'var(--accent4)' }}>Top Student</strong> 🏆</div>
        </div>

        {/* Level ladder */}
        <div className="level-steps">
          {LEVELS.map((l, i) => (
            <div
              key={i}
              className={`level-step ${l.current ? 'current' : ''} ${l.done && !l.current ? 'done' : ''}`}
            >
              <div className="step-dot" style={{ background: l.color }} />
              <span>{l.icon} {l.label}</span>
              {l.done && !l.current && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
              {l.current && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent2)' }}>NOW</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="badge-stats">
        {BADGE_STATS.map((s, i) => (
          <div className="badge-stat" key={i}>
            <div className="bs-val" style={{ color: s.color }}>{s.val}</div>
            <div className="bs-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs + Category filters ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="badge-tabs">
          {TABS.map(t => (
            <button key={t} className={`badge-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="badge-tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`badge-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Badge Grid ── */}
      <div className="badge-grid" style={{ marginBottom: 24 }}>
        {visible.map((b, i) => (
          <div
            key={b.id}
            className={`badge-card ${b.earned ? 'earned' : 'locked'}`}
            style={{ animationDelay: `${b.delay}s` }}
          >
            <div className="badge-glow" style={{ background: b.color }} />

            {/* Icon */}
            <div className="badge-icon-wrap" style={{ background: b.bg }}>
              {b.icon}
              {b.earned && (
                <div className="badge-earned-tick">✓</div>
              )}
            </div>

            <div className="badge-name" style={{ color: b.earned ? b.color : 'var(--text)' }}>{b.name}</div>
            <div className="badge-desc">{b.desc}</div>

            {/* Earned date OR progress bar */}
            {b.earned ? (
              <div className="badge-earned-date">✦ Earned {b.date}</div>
            ) : b.target ? (
              <div className="badge-progress-wrap">
                <div className="badge-progress-label">
                  <span>Progress</span>
                  <span>{b.progress} / {b.target}</span>
                </div>
                <div className="badge-progress-track">
                  <div
                    className="badge-progress-fill"
                    style={{ width: `${progFills[b.id] ?? 0}%`, background: b.color }}
                  />
                </div>
              </div>
            ) : (
              <div className="badge-locked-label">🔒 Locked</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Leaderboard ── */}
      <div className="leaderboard-card">
        <div className="lb-card-title">
          Class Leaderboard
          <span>Top students this semester</span>
        </div>
        {LEADERBOARD.map((p, i) => (
          <div key={i} className={`lb-row ${p.me ? 'me' : ''}`}>
            <div className="lb-rank" style={{
              color: p.rank === 1 ? '#fb923c' : p.rank === 2 ? '#a78bfa' : p.rank === 3 ? '#34d399' : 'var(--muted)'
            }}>
              {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
            </div>

            <div className="lb-avatar" style={{ background: p.color }}>{p.initials}</div>

            <div className="lb-info">
              <div className="lb-name">
                {p.name}
                {p.me && <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 6, fontWeight: 600 }}>YOU</span>}
              </div>
              <div className="lb-level">{p.level}</div>
            </div>

            <div className="lb-badges-count">
              🏅 {p.badges}
            </div>

            <div className="lb-xp">{p.xp} XP</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Badges