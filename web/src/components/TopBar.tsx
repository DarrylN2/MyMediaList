'use client'

import Link from 'next/link'
import { Search, Filter, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Filter Button */}
          <Button variant="ghost" size="sm" className="rounded-full">
            <Filter className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Filter</span>
          </Button>

          {/* Search Box */}
          <div className="flex-1 relative max-w-2xl">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search movies, anime, songs, games…"
              className="w-full rounded-full pl-4 pr-10 h-10"
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
    </header>
  )
}
