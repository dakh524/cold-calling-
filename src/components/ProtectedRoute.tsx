import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role, status, onboardingCompleted } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role === 'employee') {
    if (!onboardingCompleted && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />
    }
    
    if (onboardingCompleted && status === 'pending' && location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />
    }
  }

  return <>{children}</>
}
