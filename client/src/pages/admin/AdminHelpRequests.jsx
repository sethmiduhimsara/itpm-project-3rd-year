import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useNotifications } from '../../contexts/NotificationContext'
import { Trash2, Eye, EyeOff, Search, Filter } from 'lucide-react'

function AdminHelpRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterVisibility, setFilterVisibility] = useState('All')
  
  const { pushNotification } = useNotifications()
  const navigate = useNavigate()

  const fetchRequests = async () => {
    try {
      const res = await api.get('/help-requests')
      setRequests(res.data)
    } catch (err) {
      console.error(err)
      pushNotification('Failed to fetch requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    try {
      await api.delete(`/help-requests/${id}`)
      pushNotification('Request deleted successfully', 'success')
      fetchRequests()
    } catch (err) {
      pushNotification('Failed to delete request', 'error')
    }
  }

  const handleToggleVisibility = async (req) => {
    const newVisibility = req.visibility === 'Public' ? 'Private' : 'Public'
    try {
      await api.patch(`/help-requests/${req._id}`, { visibility: newVisibility })
      pushNotification(`Visibility changed to ${newVisibility}`, 'success')
      fetchRequests()
    } catch (err) {
      pushNotification('Failed to update visibility', 'error')
    }
  }



  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const s = searchTerm.toLowerCase()
      const matchesSearch = 
        (req.title || '').toLowerCase().includes(s) || 
        (req.requester || '').toLowerCase().includes(s) ||
        (req.subject || '').toLowerCase().includes(s)
      
      const matchesStatus = filterStatus === 'All' || req.status === filterStatus
      const matchesVisibility = filterVisibility === 'All' || req.visibility === filterVisibility

      return matchesSearch && matchesStatus && matchesVisibility
    })
  }, [requests, searchTerm, filterStatus, filterVisibility])

  if (loading) return <div style={styles.loading}>Loading Help Requests...</div>

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Admin Help Request Monitor</h1>
          <p style={styles.subtitle}>Monitor, manage, and moderate all student help requests.</p>
        </div>

        {/* Filters and Search Bar */}
        <div style={styles.controlsBar}>
          <div style={styles.searchBox}>
            <Search size={18} color="var(--muted)" />
            <input 
              type="text" 
              placeholder="Search by title, student, or subject..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filters}>
            <div style={styles.filterBox}>
              <Filter size={16} color="var(--muted)" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={styles.select}>
                <option value="All" style={styles.option}>All Statuses</option>
                <option value="Open" style={styles.option}>Open</option>
                <option value="In Progress" style={styles.option}>In Progress</option>
                <option value="Closed" style={styles.option}>Closed</option>
              </select>
            </div>
            <div style={styles.filterBox}>
              <Eye size={16} color="var(--muted)" />
              <select value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)} style={styles.select}>
                <option value="All" style={styles.option}>All Visibility</option>
                <option value="Public" style={styles.option}>Public</option>
                <option value="Private" style={styles.option}>Private</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.list}>
          {filteredRequests.length === 0 ? (
            <div style={styles.empty}>No help requests found matching your filters.</div>
          ) : (
            filteredRequests.map(req => (
              <div key={req._id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>{req.title}</h3>
                    <p style={styles.cardMeta}>
                      By <strong style={{color:'var(--text)'}}>{req.requester}</strong> • 
                      Subject: {req.subject} • 
                      Status: <span style={{color: req.status==='Closed' ? '#10b981' : '#fbbf24'}}>{req.status}</span> •
                      Visibility: <span style={{color: req.visibility==='Private' ? '#ef4444' : '#34d399'}}>{req.visibility}</span>
                    </p>
                  </div>
                  <div style={styles.actions}>
                    <button 
                      style={styles.actionBtn} 
                      onClick={() => handleToggleVisibility(req)}
                      title={req.visibility === 'Public' ? "Make Invisible (Private)" : "Make Visible (Public)"}
                    >
                      {req.visibility === 'Public' ? <Eye size={18} /> : <EyeOff size={18} color="#ef4444" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(req._id, req.title)}
                      style={{...styles.actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)'}}
                      title="Delete Request"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div style={styles.cardBody}>
                  {req.description}
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
  page: { padding: '20px 0' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { marginBottom: '30px' },
  title: { fontSize: '28px', color: 'var(--text)', fontWeight: '800', marginBottom: '8px' },
  subtitle: { color: 'var(--muted)', fontSize: '15px' },
  controlsBar: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--panel)', padding: '16px', borderRadius: '16px', border: '1px solid var(--panel-border)' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '10px 16px', flex: '1', minWidth: '250px' },
  searchInput: { border: 'none', backgroundColor: 'transparent', color: 'var(--text)', outline: 'none', width: '100%', fontSize: '14px' },
  filters: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  filterBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '8px 12px' },
  select: { border: 'none', backgroundColor: 'transparent', color: 'var(--text)', outline: 'none', cursor: 'pointer', fontSize: '14px' },
  option: { backgroundColor: '#000000', color: '#ffffff' },
  loading: { padding: '50px', textAlign: 'center', color: 'var(--muted)' },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--muted)', backgroundColor: 'var(--panel)', borderRadius: '12px' },
  card: { backgroundColor: 'var(--panel)', borderRadius: '16px', padding: '20px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' },
  cardMeta: { fontSize: '13px', color: 'var(--muted)' },
  actions: { display: 'flex', gap: '8px' },
  actionBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', backgroundColor: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', transition: 'all 0.2s' },
  cardBody: { fontSize: '14px', color: 'var(--muted2)', lineHeight: '1.6', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }
}

export default AdminHelpRequests
