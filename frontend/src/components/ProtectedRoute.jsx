import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { PageLoader } from './ui.jsx'

// Gate routes that require an authenticated user.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
