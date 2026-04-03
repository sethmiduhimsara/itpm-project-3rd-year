import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ActivityProvider } from './contexts/ActivityContext'
import { NotificationProvider } from './contexts/NotificationContext'
import DashboardLayout from './DashboardLayout'
import StudentDiscussion from './pages/discussion/StudentDiscussion'
import AdminDiscussion from './pages/discussion/AdminDiscussion'
import ResourceDashboard from './pages/resources/ResourceDashboard'
import ResourceUpload from './pages/resources/ResourceUpload'
import ResourceBrowse from './pages/resources/ResourceBrowse'
import HelpRequest from './pages/helprequest/HelpRequest'
import PostHelpRequest from './pages/helprequest/PostHelpRequest'
import EditHelpRequest from './pages/helprequest/EditHelpRequest'
import AcceptedRequests from './pages/helprequest/AcceptedRequests'
import ChatSession from './pages/helprequest/ChatSession'
import HelpRequestDashboard from './pages/helprequest/HelpRequestDashboard'
import ProgressTabs from './pages/progress/ProgressTabs'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Redirect to /login if not logged in
function PrivateRoute() {
  const { user } = useAuth()
  return user ? <DashboardLayout /> : <Navigate to="/login" replace />
}

// Redirect students away from admin routes
function AdminRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/discussion" replace />
  return <Outlet />
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ActivityProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected dashboard routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<Navigate to="/discussion" replace />} />
                <Route path="/discussion" element={<StudentDiscussion />} />
                <Route path="/resources" element={<Navigate to="/resources/dashboard" replace />} />
                <Route path="/resources/dashboard" element={<ResourceDashboard />} />
                <Route path="/resources/upload" element={<ResourceUpload />} />
                <Route path="/resources/browse" element={<ResourceBrowse />} />
                <Route path="/help-request" element={<HelpRequest />} />
                <Route path="/help-request/new" element={<PostHelpRequest />} />
                <Route path="/help-request/edit/:id" element={<EditHelpRequest />} />
                <Route path="/help-request/accepted" element={<AcceptedRequests />} />
                <Route path="/help-request/chat/:id" element={<ChatSession />} />
                <Route path="/help-request/dashboard" element={<HelpRequestDashboard />} />
                <Route path="/progress" element={<ProgressTabs />} />

                {/* Admin-only route */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/discussion" element={<AdminDiscussion />} />
                </Route>
              </Route>

              {/* Catch-all → login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </ActivityProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App