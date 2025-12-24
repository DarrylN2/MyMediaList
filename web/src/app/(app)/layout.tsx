import { Suspense } from 'react'
import { TopBar } from '@/components/TopBar'
import { MediaBackground } from '@/components/MediaBackground'
import { DemoBanner } from '@/components/DemoBanner'
import { AuthLoadingOverlay } from '@/components/AuthLoadingOverlay'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <MediaBackground />
      <div className="relative z-10">
        <Suspense fallback={<div className="h-16" />}>
          <TopBar />
        </Suspense>
        <div className="mx-auto max-w-[1440px] px-4 pt-4 md:px-6">
          <DemoBanner />
        </div>
        <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 md:px-6">
          {children}
        </main>
      </div>
      <AuthLoadingOverlay />
    </div>
  )
}
