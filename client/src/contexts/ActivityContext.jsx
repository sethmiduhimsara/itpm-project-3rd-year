/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import api from '../api'

const ActivityContext = createContext(null)

export const pointsMap = { Discussion: 10, 'Help Given': 20, Resource: 15, 'Help Received': 5 }

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([])

  const normalizeDate = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10)
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
    return d.toISOString().slice(0, 10)
  }

  const buildActivitiesFromSources = async () => {
    try {
      const [postsRes, helpRes, resourcesRes] = await Promise.all([
        api.get('/posts'),
        api.get('/help-requests'),
        api.get('/resources'),
      ])

      const posts = Array.isArray(postsRes.data) ? postsRes.data : []
      const helpRequests = Array.isArray(helpRes.data) ? helpRes.data : []
      const resources = Array.isArray(resourcesRes.data) ? resourcesRes.data : []

      const postActivities = posts.map((p) => ({
        _id: `post:${p._id}`,
        type: 'Discussion',
        description: `Posted: ${p.title}`,
        date: normalizeDate(p.createdAt),
        points: pointsMap.Discussion,
      }))

      const replyActivities = posts.flatMap((p) => (
        (p.replies || []).map((r, idx) => ({
          _id: `reply:${p._id}:${idx}`,
          type: 'Help Given',
          description: `Replied to: ${p.title}`,
          date: normalizeDate(r.date || p.createdAt),
          points: pointsMap['Help Given'],
        }))
      ))

      const helpRequestActivities = helpRequests.map((h) => ({
        _id: `help:${h._id}`,
        type: 'Help Received',
        description: `Help request: ${h.subject} — ${h.topic}`,
        date: normalizeDate(h.createdAt),
        points: pointsMap['Help Received'],
      }))

      const helpResponseActivities = helpRequests.flatMap((h) => (
        (h.responses || []).map((r, idx) => ({
          _id: `help-response:${h._id}:${idx}`,
          type: 'Help Given',
          description: `Help response: ${h.subject}`,
          date: normalizeDate(r.date || h.createdAt),
          points: pointsMap['Help Given'],
        }))
      ))

      const resourceActivities = resources.map((r) => ({
        _id: `resource:${r._id}`,
        type: 'Resource',
        description: `Shared resource: ${r.title}`,
        date: normalizeDate(r.createdAt),
        points: pointsMap.Resource,
      }))

      const merged = [
        ...postActivities,
        ...replyActivities,
        ...helpRequestActivities,
        ...helpResponseActivities,
        ...resourceActivities,
      ]

      merged.sort((a, b) => new Date(b.date) - new Date(a.date))
      return merged
    } catch (err) {
      console.error('Failed to build activities from sources:', err)
      return []
    }
  }

  const mergeActivities = (stored, derived) => {
    const merged = []
    const seen = new Set()
    const add = (items) => {
      items.forEach((a) => {
        const key = `${a.type}|${a.description}|${normalizeDate(a.date)}`
        if (seen.has(key)) return
        seen.add(key)
        merged.push({ ...a, date: normalizeDate(a.date) })
      })
    }
    add(stored)
    add(derived)
    merged.sort((a, b) => new Date(b.date) - new Date(a.date))
    return merged
  }

  // Load activities from backend on mount
  useEffect(() => {
    api.get('/activities')
      .then(async res => {
        const stored = Array.isArray(res.data) ? res.data : []
        const derived = await buildActivitiesFromSources()
        setActivities(mergeActivities(stored, derived))
      })
      .catch(async () => {
        const derived = await buildActivitiesFromSources()
        setActivities(mergeActivities([], derived))
      })
  }, [])

  const refetchActivities = async () => {
    try {
      const res = await api.get('/activities')
      const stored = Array.isArray(res.data) ? res.data : []
      const derived = await buildActivitiesFromSources()
      setActivities(mergeActivities(stored, derived))
    } catch (err) {
      console.error('Failed to refetch activities:', err)
      const derived = await buildActivitiesFromSources()
      setActivities(mergeActivities([], derived))
    }
  }

  const addActivity = async ({ type, description, date }) => {
    try {
      const safeDescription = String(description ?? '').trim().slice(0, 150)
      const safeDate = (date ? String(date) : new Date().toISOString()).slice(0, 10)
      if (!type || safeDescription.length < 5) return
      const res = await api.post('/activities', {
        type,
        description: safeDescription,
        date: safeDate,
      })
      setActivities(prev => [res.data, ...prev])
      await refetchActivities() // Refetch to sync with backend
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
    () => ({ activities, addActivity, deleteActivity, refetchActivities, pointsMap }),
    [activities],
  )

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivities() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivities must be used within ActivityProvider')
  return ctx
}
