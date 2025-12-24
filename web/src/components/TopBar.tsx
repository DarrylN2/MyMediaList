'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Home, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProfileDialog } from '@/components/ProfileDialog'
import { useAuth } from '@/context/AuthContext'

type SearchCategoryFilter =
  | 'all'
  | 'movies'
  | 'tv'
  | 'anime'
  | 'songs'
  | 'games'

const SEARCH_CATEGORY_OPTIONS: Array<{
  id: SearchCategoryFilter
  label: string
}> = [
  { id: 'all', label: 'All media' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
  { id: 'anime', label: 'Anime' },
  { id: 'songs', label: 'Songs/Albums' },
  { id: 'games', label: 'Games' },
]

function parseCategoryFilter(raw: string | null): SearchCategoryFilter {
  const value = (raw ?? 'all').toLowerCase()
  if (value === 'all') return 'all'
  if (
    value === 'movies' ||
    value === 'tv' ||
    value === 'anime' ||
    value === 'songs' ||
    value === 'games'
  ) {
    return value
  }
  return 'all'
}

export function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryFromUrl = useMemo(() => {
    if (pathname !== '/search') return ''
    return searchParams.get('query') ?? ''
  }, [pathname, searchParams])
  const [categoryDraft, setCategoryDraft] = useState<SearchCategoryFilter>(() =>
    parseCategoryFilter(searchParams.get('category')),
  )
  const {
    status,
    user,
    dialogOpen,
    setDialogOpen,
    openAuthDialog,
    switchView,
  } = useAuth()

  const category = useMemo(
    () =>
      pathname === '/search'
        ? parseCategoryFilter(searchParams.get('category'))
        : categoryDraft,
    [pathname, searchParams, categoryDraft],
  )

  const setCategoryParam = (next: SearchCategoryFilter) => {
    setCategoryDraft(next)

    if (pathname !== '/search') return
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') params.delete('category')
    else params.set('category', next)
    const qs = params.toString()
    router.replace(`/search${qs ? `?${qs}` : ''}`)
  }

  const navigateToSearch = (value: string) => {
    const trimmed = value.trim()
    const params = new URLSearchParams()
    params.set('query', trimmed)
    if (category !== 'all') params.set('category', category)
    const qs = params.toString()
    router.push(`/search${qs ? `?${qs}` : ''}`)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = String(formData.get('query') ?? '')
    navigateToSearch(value)
  }

  const profileInitial = user?.username?.[0]?.toUpperCase()

  const handleDialogChange = (isOpen: boolean) => {
    setDialogOpen(isOpen)
    if (isOpen && status !== 'authenticated' && status === 'logged-out') {
      switchView('login')
    }
    if (!isOpen && status !== 'authenticated') {
      switchView('login')
    }
  }

  const handleHomeClick = () => {
    setCategoryDraft('all')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 py-3 md:px-6">
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full border border-border bg-card"
              asChild
            >
              <Link href="/" onClick={handleHomeClick} aria-label="Home">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
            <form
              className="relative hidden w-[min(720px,70vw)] md:block"
              onSubmit={handleSubmit}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                    aria-label="Open search filters"
                  >
                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>Search type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={category}
                    onValueChange={(value) =>
                      setCategoryParam(value as SearchCategoryFilter)
                    }
                  >
                    {SEARCH_CATEGORY_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="submit"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <Input
                key={
                  pathname === '/search' ? `search:${queryFromUrl}` : 'global'
                }
                type="search"
                name="query"
                defaultValue={pathname === '/search' ? queryFromUrl : ''}
                placeholder="Search movies, anime, songs, games..."
                className="h-11 w-full rounded-2xl border border-border bg-input-background/80 pl-28 pr-12 text-sm shadow-sm focus-visible:border-primary/60 focus-visible:ring-primary/30"
                aria-label="Search media"
              />
            </form>
          </div>

          <div className="flex items-center gap-3 md:justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border bg-card md:hidden"
              asChild
            >
              <Link href="/search" aria-label="Search">
                <Search className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="hidden rounded-full border border-transparent px-4 text-sm md:inline-flex"
            >
              <Link href="/lists">My Lists</Link>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border bg-card"
                  onClick={() =>
                    user ? setDialogOpen(true) : openAuthDialog('login')
                  }
                >
                  {user ? (
                    <span className="text-sm font-semibold">
                      {profileInitial}
                    </span>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                  <span className="sr-only">Open profile dialog</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm border-none bg-background/95 backdrop-blur-md shadow-2xl">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle>
                    {user ? `Hi, ${user.username}` : 'Save your lists'}
                  </DialogTitle>
                  <DialogDescription>
                    {user
                      ? 'Manage your account and saved lists.'
                      : 'Log in or create a free account to sync across devices.'}
                  </DialogDescription>
                </DialogHeader>
                <ProfileDialog />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}
