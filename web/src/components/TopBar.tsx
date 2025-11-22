'use client'

import Link from 'next/link'
import { Search, Filter, User, Home } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function TopBar() {
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
            <div className="relative flex-1 max-w-2xl">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 rounded-full border bg-background/90 px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search movies, anime, songs, games…"
                className="h-10 w-full rounded-full pl-28 pr-10"
              />
            </div>

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
