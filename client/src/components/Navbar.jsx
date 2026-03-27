import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const navLinks = [
  { path: '/discussion', label: 'Discussion' },
  { path: '/admin/discussion', label: 'Admin Panel' },
  { path: '/resources', label: 'Resources' },
  { path: '/help-request', label: 'Help Requests' },
  { path: '/progress', label: 'My Progress' },
]

function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>UniConnect</div>

      <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      <ul style={{ ...styles.ul, ...(menuOpen ? styles.ulOpen : {}) }}>
        {navLinks.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              style={{
                ...styles.link,
                ...(location.pathname === link.path ? styles.activeLink : {}),
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const styles = {
  nav: {
    backgroundColor: '#1a1a2e',
    padding: '0 30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    minHeight: '60px',
  },
  brand: {
    color: 'var(--accent)',
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
  },
  ul: {
    listStyle: 'none',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  ulOpen: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: '10px',
  },
  link: {
    color: '#ccc',
    textDecoration: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'block',
  },
  activeLink: {
    backgroundColor: 'var(--accent)',
    color: '#fff',
  },
}

export default Navbar