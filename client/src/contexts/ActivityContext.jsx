/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import api from '../api'

const ActivityContext = createContext(null)

export const pointsMap = { Discussion: 10, 'Help Given': 20, Resource: 15, 'Help Received': 5 }

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([])

  // Load activities from backend on mount
  useEffect(() => {
    api.get('/activities')
      .then(res => setActivities(res.data))
      .catch(() => {})
  }, [])

  const addActivity = async ({ type, description, date }) => {
    try {
      const res = await api.post('/activities', { type, description, date })
      setActivities(prev => [res.data, ...prev])
    } catch (err) {
      console.error('Failed to log activity:', err)
    }
  }

  const deleteActivity = async (id) => {
    try {
      await api.delete(`/activities/${id}`)
      setActivities(prev => prev.filter(a => a._id !== id))
    } catch (err) {
      console.error('Failed to delete activity:', err)
    }
  }

  const value = useMemo(
    () => ({ activities, addActivity, deleteActivity, pointsMap }),
    [activities],
  )

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivities() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivities must be used within ActivityProvider')
  return ctx
}
