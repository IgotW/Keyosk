import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui/States'
import { useAuth } from './authContext'

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState label="Checking your session..." />
  }

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return children
}
