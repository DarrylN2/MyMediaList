import { Suspense } from 'react'
import { TopBar } from '@/components/TopBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16" />}>
        <TopBar />
      </Suspense>
      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 md:px-6">
        {children}
      </main>
    </div>
  )
}
