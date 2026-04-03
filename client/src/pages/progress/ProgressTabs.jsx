import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useActivities } from '../../contexts/ActivityContext'
import Dashboard from './Dashboard/Dashboard'
import History from './Activity_history/History'
// import Badges from './Badges/Badges'
import Progress from './Progress/Progress'

const ProgressTabs = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const { activities, refetchActivities } = useActivities()

  const tabs = ['Dashboard', 'Activity History', 'Progress']

  // Refetch activities when component mounts
  useEffect(() => {
    refetchActivities()
  }, [refetchActivities])

  // Handle URL query params on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'history') setActiveTab('Activity History')
    else if (tabParam === 'badges') setActiveTab('Badges')
    else if (tabParam === 'progress') setActiveTab('Progress')
    else setActiveTab('Dashboard')
  }, [searchParams])

  const searchTerm = searchParams.get('search') || ''

  return (
    <div style={styles.wrapper}>
      {/* Horizontal Tabs */}
      <div style={styles.tabsContainer}>
        {tabs.map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {activeTab === 'Dashboard' && <Dashboard />}
        {activeTab === 'Activity History' && (
          <History activities={activities} searchTerm={searchTerm} />
        )}
        {/* {activeTab === 'Badges' && <Badges activities={activities} />} */}
        {activeTab === 'Progress' && <Progress activities={activities} />}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: 'transparent',
    padding: '0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--panel-border)',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    color: 'var(--muted)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: 'var(--accent)',
    color: 'var(--bg)',
    border: '1px solid var(--accent)',
  },
  content: {
    animation: 'fadeIn 0.3s ease',
  },
}

export default ProgressTabs
