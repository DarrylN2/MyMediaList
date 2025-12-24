'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

const DISMISS_KEY = 'mml:demoBannerDismissed'

export function DemoBanner() {
  const { user, openAuthDialog } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(DISMISS_KEY)
    setDismissed(stored === 'true')
  }, [])

  if (user || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true')
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          You&apos;re viewing demo data. Log in to save and track your own list.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="rounded-full px-4 text-sm"
            onClick={() => openAuthDialog('login')}
            style={{
              backgroundImage: 'linear-gradient(90deg, #FF5A6F, #6CC6FF)',
            }}
          >
            Log In / Sign up
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Dismiss demo banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
