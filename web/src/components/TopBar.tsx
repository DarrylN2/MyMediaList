'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, User, Home } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('query') ?? '',
  )

  useEffect(() => {
    if (pathname === '/search') {
      setSearchTerm(searchParams.get('query') ?? '')
    } else {
      setSearchTerm('')
    }
  }, [pathname, searchParams])

  const navigateToSearch = () => {
    const trimmed = searchTerm.trim()
    const queryString = trimmed ? `?query=${encodeURIComponent(trimmed)}` : ''
    router.push(`/search${queryString}`)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigateToSearch()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex w-full justify-center">
          <div className="flex w-full max-w-4xl items-center gap-4">
            {/* Home Logo */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              asChild
            >
              <Link href="/">
                <Home className="h-5 w-5" />
                <span className="sr-only">Home</span>
              </Link>
            </Button>

            {/* Search Box with Filter */}
            <form className="relative flex-1 max-w-2xl" onSubmit={handleSubmit}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 rounded-full border bg-background/90 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <Input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search movies, anime, songs, games…"
                className="h-10 w-full rounded-full pl-28 pr-12"
                aria-label="Search media"
              />
            </form>

            {/* My Lists & Avatar */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="text-sm">
                <Link href="/lists">My Lists</Link>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
