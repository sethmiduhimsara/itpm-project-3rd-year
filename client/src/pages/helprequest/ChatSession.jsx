import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import api from '../../api'
import {
  Send, ArrowLeft, CheckCircle, Info,
  FileText, Clock, User, Download
} from 'lucide-react'

function ChatSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { pushNotification } = useNotifications()
  const [request, setRequest] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    fetchChat()
    const interval = setInterval(fetchChat, 5000) // Poll every 5s for messages
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages])

  const fetchChat = async () => {
    try {
      const res = await api.get(`/help-requests/${id}`)
      setRequest(res.data)
      setMessages(res.data.responses || [])
    } catch (err) {
      console.error('Failed to fetch chat:', err)
    } finally {
      if (loading) setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await api.post(`/help-requests/${id}/messages`, { text: newMessage.trim() })
      setMessages(res.data.responses)
      setNewMessage('')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleCloseSession = async () => {
    if (window.confirm('Mark this help request as closed?')) {
      try {
        await api.patch(`/help-requests/${id}/close`)
        fetchChat()
        pushNotification({ title: 'Session Closed', message: 'Task marked as completed.' })
      } catch (err) {
        alert('Failed to close session')
      }
    }
  }

  if (loading) return <div style={styles.loading}>Opening session...</div>
  if (!request) return <div style={styles.loading}>Request not found.</div>

  const isRequester = user?.name === request.requester
  const isHelper = user?.name === request.acceptedBy

  return (
    <div style={styles.chatShell}>
      {/* Header */}
      <header style={styles.chatHeader}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={styles.chatTitle}>{request.title}</h2>
            <div style={styles.chatSubtitle}>
              <span style={styles.statusDot(request.status)} />
              {request.status} • {request.subject}
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {(isHelper || isRequester) && request.status !== 'Closed' && (
            <button style={styles.resolveBtn} onClick={handleCloseSession}>
              <CheckCircle size={16} /> End Chat
            </button>
          )}
        </div>
      </header>

      {/* Main Area */}
      <div style={styles.mainContent}>
        {/* Info Column */}
        <aside style={styles.infoCol}>
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}><Info size={14} /> Request Info</h4>
            <p style={styles.infoDesc}>{request.description}</p>
          </div>
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}><FileText size={14} /> Attachments</h4>
            {request.fileUrl ? (
              <a
                href={`http://localhost:5000${request.fileUrl}`}
                target="_blank"
                rel="noreferrer"
                style={styles.attachmentLink}
              >
                <Download size={14} /> View Document
              </a>
            ) : <span style={styles.noFile}>No files attached</span>}
          </div>
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}><User size={14} /> Participants</h4>
            <div style={styles.userItem}>
              <span style={styles.userRole}>Requester</span>
              <span style={styles.userName}>{request.requester}</span>
            </div>
            <div style={styles.userItem}>
              <span style={styles.userRole}>Helper</span>
              <span style={styles.userName}>{request.acceptedBy || 'Assigning...'}</span>
            </div>
          </div>
        </aside>

        {/* Messaging Area */}
        <main style={styles.messageArea}>
          <div style={styles.scrollArea}>
            <div style={styles.systemMsg}>
              <Clock size={12} /> Session started on {new Date(request.createdAt).toLocaleDateString()}
            </div>

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.msgRow,
                  justifyContent: msg.sender === user?.name ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  ...styles.bubble,
                  backgroundColor: msg.sender === user?.name ? 'var(--accent2)' : 'var(--panel)',
                  color: msg.sender === user?.name ? '#000' : 'var(--text)',
                  border: msg.sender === user?.name ? 'none' : '1px solid var(--panel-border)'
                }}>
                  <div style={styles.msgText}>{msg.text}</div>
                  <div style={{
                    ...styles.msgTime,
                    color: msg.sender === user?.name ? 'rgba(0,0,0,0.5)' : 'var(--muted2)'
                  }}>
                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form style={styles.inputBar} onSubmit={handleSendMessage}>
            <input
              style={styles.textInput}
              placeholder={request.status === 'Closed' ? 'This session is closed' : 'Type a message...'}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              disabled={request.status === 'Closed' || sending}
            />
            <button
              type="submit"
              style={{
                ...styles.sendBtn,
                backgroundColor: (newMessage.trim() && request.status !== 'Closed') ? 'var(--accent2)' : 'var(--muted2)'
              }}
              disabled={!newMessage.trim() || request.status === 'Closed' || sending}
            >
              <Send size={18} />
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}

const styles = {
  chatShell: { height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' },
  chatHeader: { height: '80px', backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  backBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  chatTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' },
  chatSubtitle: { fontSize: '12px', color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: '6px' },
  statusDot: (status) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status === 'Closed' ? '#64748b' : '#10b981' }),
  headerRight: {},
  resolveBtn: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  mainContent: { flex: 1, display: 'flex', minHeight: 0 },
  infoCol: { width: '300px', backgroundColor: 'rgba(30, 41, 59, 0.4)', padding: '24px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' },
  infoSection: {},
  infoTitle: { fontSize: '12px', fontWeight: '800', color: 'var(--muted2)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  infoDesc: { fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' },
  attachmentLink: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent2)', fontSize: '13px', fontWeight: '700', textDecoration: 'none' },
  noFile: { fontSize: '12px', color: 'var(--muted2)', fontStyle: 'italic' },
  userItem: { marginBottom: '12px', display: 'flex', flexDirection: 'column' },
  userRole: { fontSize: '10px', color: 'var(--muted2)', marginBottom: '2px' },
  userName: { fontSize: '13px', fontWeight: '700', color: 'var(--text)' },
  messageArea: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.95)' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  systemMsg: { textAlign: 'center', fontSize: '11px', color: 'var(--muted2)', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  msgRow: { display: 'flex' },
  bubble: { maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  msgText: { fontSize: '14px', lineHeight: '1.5' },
  msgTime: { fontSize: '10px', marginTop: '4px', textAlign: 'right', fontWeight: '800' },
  inputBar: { height: '80px', backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', padding: '14px 20px', borderRadius: '14px', outline: 'none', fontSize: '14px' },
  sendBtn: { width: '48px', height: '48px', borderRadius: '14px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
  loading: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '18px' }
}

export default ChatSession
