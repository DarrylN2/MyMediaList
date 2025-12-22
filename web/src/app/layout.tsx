import type { Metadata } from 'next'
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'MyMediaList',
  description: 'Personal tracker for anime, movies, and games',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
