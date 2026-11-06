import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMe, loginAdmin, logoutAdmin } from '../api/endpoints'
import { clearToken, getToken, setToken } from '../api/token'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)

      return undefined
    }

    let active = true

    fetchMe()
      .then((admin) => {
        if (active) {
          setUser(admin)
        }
      })
      .catch(() => {
        if (active) {
          clearToken()
          setUser(null)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await loginAdmin({
      email,
      password,
      device_name: 'keyosk-admin',
    })

    setToken(data.token)
    setUser(data.user)

    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutAdmin()
    } catch {
      // A revoked or expired token still signs the user out locally.
    } finally {
      clearToken()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
