'use client'

import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function AuthLoadingOverlay() {
  const { isAppLoading } = useAuth()

  if (!isAppLoading) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card/90 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your data...
      </div>
    </div>
  )
}
