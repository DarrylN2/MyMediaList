import { TopBar } from '@/components/TopBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-purple-50">
      <TopBar />
      <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
