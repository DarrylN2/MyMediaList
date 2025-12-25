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
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

type AuthStatus = 'logged-out' | 'login' | 'signup' | 'authenticated'

type User = {
  id: string
  username: string
  email: string
}

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  accessToken: string | null
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
  apiFetch: typeof fetch
  beginAppLoading: () => void
  endAppLoading: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function formatUsername(session: Session | null) {
  const email = session?.user?.email ?? ''
  const userMetadata = session?.user?.user_metadata as Record<string, unknown>
  const rawUsername =
    typeof userMetadata?.username === 'string' ? userMetadata.username : null
  return (rawUsername?.trim() || email.split('@')[0] || 'User').slice(0, 32)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('logged-out')
  const user = useMemo<User | null>(() => {
    if (!session?.user?.id || !session.user.email) return null
    return {
      id: session.user.id,
      email: session.user.email,
      username: formatUsername(session),
    }
  }, [
    session?.user?.id,
    session?.user?.email,
    (session?.user?.user_metadata as Record<string, unknown> | undefined)
      ?.username,
  ])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [appLoadingCount, setAppLoadingCount] = useState(0)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null)
        setStatus(data.session ? 'authenticated' : 'logged-out')
      })
      .catch((error) => {
        console.error('Failed to read Supabase session', error)
        setSession(null)
        setStatus('logged-out')
      })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession ?? null)
        setStatus(nextSession ? 'authenticated' : 'logged-out')
      },
    )

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

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

  const apiFetch = useCallback<AuthContextValue['apiFetch']>(
    async (input, init) => {
      const token = session?.access_token
      if (!token) {
        throw new Error('You must be logged in.')
      }

      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${token}`)
      return fetch(input, { ...init, headers })
    },
    [session?.access_token],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken: session?.access_token ?? null,
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
      login: async (email, password) => {
        const supabase = getSupabaseBrowserClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (!data.session) throw new Error('Unable to start session.')
      },
      signup: async ({ username, email, password }) => {
        const supabase = getSupabaseBrowserClient()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        })
        if (error) throw error
        if (!data.session) {
          throw new Error(
            'Account created. Check your email to confirm, then log in.',
          )
        }
      },
      logout: () => {
        const supabase = getSupabaseBrowserClient()
        void supabase.auth.signOut()
      },
      apiFetch,
      beginAppLoading,
      endAppLoading,
    }),
    [
      apiFetch,
      appLoadingCount,
      beginAppLoading,
      dialogOpen,
      endAppLoading,
      session?.access_token,
      status,
      user,
    ],
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
