/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const NotificationContext = createContext(null)

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

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

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.reduce((sum, n) => sum + (n.read ? 0 : 1), 0)

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pushNotification,
      markAllRead,
    }),
    [notifications, unreadCount],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

