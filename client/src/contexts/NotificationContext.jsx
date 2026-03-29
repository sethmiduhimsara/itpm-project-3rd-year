/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import api from '../api'

const NotificationContext = createContext(null)

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  // ── Fetch persisted notifications from backend ──────────────────────────
  const fetchFromBackend = useCallback(async () => {
    try {
      const res = await api.get('/notifications')
      // Merge: backend notifications come first, then deduplicate by id
      setNotifications(prev => {
        const backendIds = new Set(res.data.map(n => n._id))
        // Keep local-only (in-memory) notifications not yet in backend
        const localOnly = prev.filter(n => !n._id && !backendIds.has(n.id))
        return [...res.data.map(n => ({
          id:        n._id,
          _id:       n._id,
          title:     n.title,
          message:   n.message,
          read:      n.read,
          createdAt: n.createdAt,
        })), ...localOnly]
      })
    } catch {
      // Not logged in yet or network error — silent fail
    }
  }, [])

  // Fetch on mount and every 60 seconds (polling)
  useEffect(() => {
    fetchFromBackend()
    const interval = setInterval(fetchFromBackend, 60_000)
    return () => clearInterval(interval)
  }, [fetchFromBackend])

  // ── Push an in-memory notification (for actions in the same session) ────
  const pushNotification = ({ title, message }) => {
    setNotifications((prev) => [
      {
        id: uid(),
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ])
  }

  // ── Mark all read (backend + local) ─────────────────────────────────────
  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try { await api.patch('/notifications/mark-read') } catch { /* ignore */ }
  }

  const unreadCount = notifications.reduce((sum, n) => sum + (n.read ? 0 : 1), 0)

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pushNotification,
      markAllRead,
      refetchNotifications: fetchFromBackend,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, unreadCount, fetchFromBackend],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
