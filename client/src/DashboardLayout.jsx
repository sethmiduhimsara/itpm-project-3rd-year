import { useMemo, useState, createElement } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, BookOpen, HelpCircle, LayoutDashboard,
  BellDot, Menu, MessagesSquare, Search, Shield, X, LogOut,
} from 'lucide-react'
import { useNotifications } from './contexts/NotificationContext'
import { useAuth } from './contexts/AuthContext'

function getPageTitle(pathname) {
  if (pathname.startsWith('/admin'))      return 'Admin Dashboard'
  if (pathname.startsWith('/discussion')) return 'Student Discussion'
  if (pathname.startsWith('/resources'))  return 'Resource Sharing'
  if (pathname.startsWith('/help-request')) return 'Help Requests'
  if (pathname.startsWith('/progress'))   return 'My Progress'
  return 'Dashboard'
}

function SidebarLink({ to, label, icon: Icon, active, onNavigate }) {
  return (
    <Link
      to={to}
      className={`sidebarLink ${active ? 'sidebarLinkActive' : ''}`}
      onClick={onNavigate}
    >
      {createElement(Icon, { size: 18 })}
      <span>{label}</span>
    </Link>
  )
}

function DashboardLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const { user, logout, isAdmin } = useAuth()

  const initials = useMemo(() => {
    if (!user?.name) return 'UC'
    return user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }, [user?.name])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navLinks = useMemo(() => {
    // Admin sees only Admin Panel
    if (isAdmin) {
      return [
        { to: '/admin/discussion', label: 'Admin Panel', icon: Shield }
      ]
    }
    // Students see regular navigation
    return [
      { to: '/discussion',    label: 'Discussion',   icon: MessagesSquare },
      { to: '/resources',     label: 'Resources',    icon: BookOpen },
      { to: '/help-request',  label: 'Help Requests',icon: HelpCircle },
      { to: '/progress',      label: 'My Progress',  icon: BarChart3 },
    ]
  }, [isAdmin])

  return (
    <div className={`dashboardShell ${sidebarOpen ? 'sidebarOpen' : ''}`}>
      <aside className="sidebar" aria-label="Sidebar Navigation">
        <div className="sidebarBrand">
          <div className="brandMark" aria-hidden>UC</div>
          <div>
            <div className="brandName">UniConnect</div>
            <div className="brandTag">Academic Dashboard</div>
          </div>
        </div>

        <nav className="sidebarNav">
          {navLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              icon={link.icon}
              active={pathname === link.to}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        <div className="sidebarFooter">
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
            <strong style={{ color: 'var(--text)' }}>{user?.name}</strong>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '10px', textTransform: 'capitalize' }}>
            {user?.role}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(251,113,133,0.10)', color: 'var(--danger)',
              border: '1px solid rgba(251,113,133,0.30)',
              borderRadius: '8px', padding: '7px 12px',
              cursor: 'pointer', fontSize: '12px', fontWeight: '700', width: '100%',
            }}
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>

      <div className="sidebarBackdrop" onClick={() => setSidebarOpen(false)} aria-hidden />

      <header className="topbar">
        <div className="topbarLeft">
          <button
            type="button"
            className="mobileMenuBtn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Open navigation"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="topbarTitle">
            <LayoutDashboard size={18} />
            {getPageTitle(pathname)}
          </div>
        </div>

        <div className="topbarRight">
          <div className="topbarSearch" role="search" aria-label="Search">
            <Search size={16} />
            <input placeholder="Search (coming soon)" disabled />
          </div>
          <button
            type="button"
            className="notifBtn"
            onClick={() => { setNotifOpen(v => !v); markAllRead() }}
            aria-label="Notifications"
          >
            <BellDot size={18} />
            {unreadCount > 0 && <span className="notifCount">{unreadCount}</span>}
          </button>
          <div className="userChip" aria-label="Current user">
            <span aria-hidden>{initials}</span>
          </div>
        </div>
      </header>

      {notifOpen && (
        <div className="notifDropdown" role="dialog" aria-label="Notifications list">
          <div className="notifHeader">
            <div className="notifHeaderTitle">Notifications</div>
            <button type="button" className="notifMarkRead" onClick={markAllRead}>Mark all read</button>
          </div>
          <div className="notifList">
            {notifications.length === 0 ? (
              <div className="notifEmpty">No notifications yet.</div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div key={n.id} className={`notifItem ${n.read ? 'notifItemRead' : ''}`}>
                  <div className="notifItemTitle">{n.title}</div>
                  <div className="notifItemMessage">{n.message}</div>
                  <div className="notifMeta">
                    {new Date(n.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <main className="main">
        <div className="mainContent">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
