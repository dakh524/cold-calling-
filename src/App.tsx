import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import PendingApproval from './pages/PendingApproval'
import Employees from './pages/Employees'
import Leads from './pages/Leads'
import Commissions from './pages/Commissions'
import Learn from './pages/Learn'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/pending-approval" element={
          <ProtectedRoute>
            <PendingApproval />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
          <Route path="employees" element={<Employees />} />
          <Route path="leads" element={<Leads />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="learn" element={<Learn />} />
        </Route>
        {/* Placeholder for other routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
