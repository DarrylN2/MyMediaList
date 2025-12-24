'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type AuthStatus = 'logged-out' | 'login' | 'signup' | 'authenticated'

type User = {
  username: string
  email: string
}

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  dialogOpen: boolean
  isAppLoading: boolean
  switchView: (view: Extract<AuthStatus, 'login' | 'signup'>) => void
  setDialogOpen: (isOpen: boolean) => void
  openAuthDialog: (view?: Extract<AuthStatus, 'login' | 'signup'>) => void
  login: (email: string, password: string) => Promise<void>
  signup: (payload: {
    username: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => void
  beginAppLoading: () => void
  endAppLoading: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'mymedialist-auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
      const parsed = JSON.parse(stored) as { user: User }
      return parsed?.user ?? null
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })
  const [status, setStatus] = useState<AuthStatus>(() =>
    user ? 'authenticated' : 'logged-out',
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [appLoadingCount, setAppLoadingCount] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'authenticated' && user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }))
    } else if (!user) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [status, user])

  useEffect(() => {
    if (status === 'authenticated') {
      setDialogOpen(false)
    } else {
      setAppLoadingCount(0)
    }
  }, [status])

  const beginAppLoading = useCallback(() => {
    setAppLoadingCount((count) => count + 1)
  }, [])

  const endAppLoading = useCallback(() => {
    setAppLoadingCount((count) => Math.max(0, count - 1))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      dialogOpen,
      isAppLoading: appLoadingCount > 0,
      switchView: (view) => setStatus(view),
      setDialogOpen,
      openAuthDialog: (view = 'login') => {
        if (status !== 'authenticated') {
          setStatus(view)
        }
        setDialogOpen(true)
      },
      login: async (email) => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setUser({ username: email.split('@')[0], email })
        setStatus('authenticated')
      },
      signup: async ({ username, email }) => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setUser({ username, email })
        setStatus('authenticated')
      },
      logout: () => {
        setUser(null)
        setStatus('logged-out')
      },
      beginAppLoading,
      endAppLoading,
    }),
    [appLoadingCount, beginAppLoading, dialogOpen, endAppLoading, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
