'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AuthStatus = 'logged-out' | 'login' | 'signup' | 'authenticated'

type User = {
  username: string
  email: string
}

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  switchView: (view: Extract<AuthStatus, 'login' | 'signup'>) => void
  login: (email: string, password: string) => Promise<void>
  signup: (payload: {
    username: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'mymedialist-auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('logged-out')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { user: User }
        if (parsed?.user) {
          setUser(parsed.user)
          setStatus('authenticated')
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'authenticated' && user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user }))
    } else if (!user) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [status, user])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      switchView: (view) => setStatus(view),
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
    }),
    [status, user],
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
