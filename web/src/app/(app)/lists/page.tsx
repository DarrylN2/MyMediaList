'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Plus, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MediaListItem } from '@/components/MediaListItem'
import { useAuth } from '@/context/AuthContext'
import { mockLists } from '@/data/mockLists'
import type { EntryStatus, MediaType } from '@/types'

const FILTER_OPTIONS = ['all', 'movies', 'anime', 'games'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

const LIST_SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'title', label: 'Title (A → Z)' },
  { value: 'items_desc', label: 'Items (high → low)' },
  { value: 'items_asc', label: 'Items (low → high)' },
] as const
type ListSort = (typeof LIST_SORT_OPTIONS)[number]['value']

type RatedItem = {
  title: string
  type: MediaType
  status: EntryStatus
  rating: number
  updatedAt: string
  note: string | null
  coverUrl: string | null
  provider: string
  providerId: string
}

const RATED_SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'rating_desc', label: 'Rating (high → low)' },
  { value: 'rating_asc', label: 'Rating (low → high)' },
  { value: 'title', label: 'Title (A → Z)' },
] as const
type RatedSort = (typeof RATED_SORT_OPTIONS)[number]['value']

function parseMockUpdatedAtDaysAgo(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'today') return 0
  if (normalized === 'yesterday') return 1
  const match = normalized.match(/(\d+)\s+day/)
  if (match?.[1]) return Number(match[1])
  return Number.POSITIVE_INFINITY
}

function buildMediaRouteId(media: {
  provider: string
  providerId: string
  type: MediaType
}) {
  if (media.provider === 'tmdb') {
    if (media.type === 'tv') return `tmdb-tv-${media.providerId}`
    return `tmdb-${media.providerId}`
  }
  return `${media.provider}-${media.providerId}`
}

export default function ListsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [listSort, setListSort] = useState<ListSort>('recent')
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [userLists, setUserLists] = useState<
    Array<{
      id: string
      title: string
      description: string | null
      updatedAt: string
      itemCount: number
    }>
  >([])
  const [userListsLoading, setUserListsLoading] = useState(false)
  const [userListsError, setUserListsError] = useState<string | null>(null)
  const [ratedQuery, setRatedQuery] = useState('')
  const [ratedType, setRatedType] = useState<MediaType | 'all'>('all')
  const [ratedStatus, setRatedStatus] = useState<EntryStatus | 'all'>('all')
  const [ratedSort, setRatedSort] = useState<RatedSort>('recent')
  const [ratedItems, setRatedItems] = useState<RatedItem[]>([])
  const [ratedLoading, setRatedLoading] = useState(false)
  const [ratedError, setRatedError] = useState<string | null>(null)

  const [newListOpen, setNewListOpen] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [newListSaving, setNewListSaving] = useState(false)
  const [newListError, setNewListError] = useState<string | null>(null)

  const formatShortDate = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  const filteredUserLists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return userLists
    return userLists.filter((list) => {
      return (
        list.title.toLowerCase().includes(normalizedQuery) ||
        (list.description?.toLowerCase().includes(normalizedQuery) ?? false)
      )
    })
  }, [query, userLists])

  const visibleUserLists = useMemo(() => {
    const sorted = [...filteredUserLists].sort((a, b) => {
      switch (listSort) {
        case 'recent':
          return b.updatedAt.localeCompare(a.updatedAt)
        case 'title':
          return a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
          })
        case 'items_desc':
          return b.itemCount - a.itemCount
        case 'items_asc':
          return a.itemCount - b.itemCount
        default:
          return 0
      }
    })
    return sorted
  }, [filteredUserLists, listSort])

  const filteredMockLists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return mockLists.filter((list) => {
      const matchesCategory =
        activeFilter === 'all' || list.type === activeFilter
      if (!matchesCategory) return false
      if (!normalizedQuery) return true

      return (
        list.title.toLowerCase().includes(normalizedQuery) ||
        list.description.toLowerCase().includes(normalizedQuery) ||
        list.previewItems.some((item) =>
          item.toLowerCase().includes(normalizedQuery),
        )
      )
    })
  }, [activeFilter, query])

  const visibleMockLists = useMemo(() => {
    const sorted = [...filteredMockLists].sort((a, b) => {
      switch (listSort) {
        case 'recent':
          return (
            parseMockUpdatedAtDaysAgo(a.updatedAt) -
            parseMockUpdatedAtDaysAgo(b.updatedAt)
          )
        case 'title':
          return a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
          })
        case 'items_desc':
          return b.itemCount - a.itemCount
        case 'items_asc':
          return a.itemCount - b.itemCount
        default:
          return 0
      }
    })
    return sorted
  }, [filteredMockLists, listSort])

  const totalItems = useMemo(() => {
    if (user?.email) {
      return userLists.reduce((sum, list) => sum + list.itemCount, 0)
    }
    return mockLists.reduce((sum, list) => sum + list.itemCount, 0)
  }, [user?.email, userLists])

  useEffect(() => {
    if (!user?.email) {
      setUserLists([])
      setUserListsError(null)
      setUserListsLoading(false)
      return
    }

    const controller = new AbortController()
    setUserListsLoading(true)
    setUserListsError(null)

    const load = async () => {
      try {
        const res = await fetch(
          `/api/lists?userId=${encodeURIComponent(user.email)}`,
          { signal: controller.signal },
        )
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error ?? 'Failed to load lists.')
        }
        const payload = (await res.json()) as {
          lists: Array<{
            id: string
            title: string
            description: string | null
            updated_at: string
          }>
        }

        const lists = payload.lists ?? []
        const counts = await Promise.all(
          lists.map(async (list) => {
            const countRes = await fetch(
              `/api/lists/${list.id}?userId=${encodeURIComponent(user.email)}`,
              { signal: controller.signal },
            )
            if (!countRes.ok) return 0
            const detail = (await countRes.json()) as { items?: unknown[] }
            return Array.isArray(detail.items) ? detail.items.length : 0
          }),
        )

        if (!controller.signal.aborted) {
          setUserLists(
            lists.map((list, idx) => ({
              id: list.id,
              title: list.title,
              description: list.description,
              updatedAt: list.updated_at,
              itemCount: counts[idx] ?? 0,
            })),
          )
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setUserListsError(
          error instanceof Error ? error.message : 'Failed to load lists.',
        )
      } finally {
        if (!controller.signal.aborted) setUserListsLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [user?.email])

  useEffect(() => {
    if (!user?.email) {
      setRatedItems([])
      setRatedError(null)
      setRatedLoading(false)
      return
    }

    const controller = new AbortController()
    setRatedLoading(true)
    setRatedError(null)

    const load = async () => {
      try {
        const response = await fetch(
          `/api/ratings?userId=${encodeURIComponent(user.email)}`,
          { signal: controller.signal },
        )
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Failed to load rated items.')
        }

        const payload = (await response.json()) as {
          items: Array<{
            status: EntryStatus
            rating: number
            note: string | null
            updatedAt: string
            media: {
              title: string
              posterUrl: string | null
              type: MediaType
              provider: string
              providerId: string
            }
          }>
        }

        if (!controller.signal.aborted) {
          setRatedItems(
            payload.items.map((item) => ({
              title: item.media.title,
              type: item.media.type,
              status: item.status,
              rating: item.rating,
              updatedAt: item.updatedAt,
              note: item.note,
              coverUrl: item.media.posterUrl,
              provider: item.media.provider,
              providerId: item.media.providerId,
            })),
          )
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setRatedError(
          error instanceof Error ? error.message : 'Failed to load.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setRatedLoading(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [user?.email])

  const visibleRatedItems = useMemo(() => {
    const q = ratedQuery.trim().toLowerCase()

    const filtered = ratedItems.filter((item) => {
      if (ratedType !== 'all' && item.type !== ratedType) return false
      if (ratedStatus !== 'all' && item.status !== ratedStatus) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.note?.toLowerCase().includes(q) ?? false)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      switch (ratedSort) {
        case 'recent':
          return b.updatedAt.localeCompare(a.updatedAt)
        case 'rating_desc':
          return b.rating - a.rating
        case 'rating_asc':
          return a.rating - b.rating
        case 'title':
          return a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
          })
        default:
          return 0
      }
    })

    return sorted
  }, [ratedItems, ratedQuery, ratedSort, ratedStatus, ratedType])

  const persistRatedPatch = async (
    item: RatedItem,
    entry: Partial<{
      status: EntryStatus
      rating: number | null
      note: string
    }>,
  ) => {
    if (!user?.email) return

    const res = await fetch('/api/list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.email,
        media: {
          provider: item.provider,
          providerId: item.providerId,
          type: item.type,
          title: item.title,
          posterUrl: item.coverUrl ?? undefined,
          description: undefined,
        },
        entry,
      }),
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      throw new Error(payload?.error ?? 'Unable to save changes.')
    }
  }

  const createList = async () => {
    if (!user?.email || newListSaving) return

    const title = newListTitle.trim()
    const description = newListDescription.trim()
    if (!title) {
      setNewListError('Title is required.')
      return
    }

    setNewListSaving(true)
    setNewListError(null)

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          title,
          description: description || undefined,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to create list.')
      }

      const payload = (await res.json()) as {
        list: {
          id: string
          title: string
          description: string | null
          updated_at: string
        }
      }

      const created = payload.list
      setUserLists((prev) => {
        const exists = prev.some((list) => list.id === created.id)
        if (exists) return prev
        return [
          {
            id: created.id,
            title: created.title,
            description: created.description,
            updatedAt: created.updated_at,
            itemCount: 0,
          },
          ...prev,
        ]
      })

      setNewListOpen(false)
      setNewListTitle('')
      setNewListDescription('')
      router.push(`/lists/${created.id}`)
    } catch (error) {
      setNewListError(
        error instanceof Error ? error.message : 'Unable to create list.',
      )
    } finally {
      setNewListSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-3xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your lists"
              className="h-auto border-0 bg-transparent px-0 text-base focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 rounded-full border border-dashed bg-white px-3 py-1 text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={listSort}
                onChange={(event) =>
                  setListSort(event.target.value as ListSort)
                }
                className="h-8 bg-transparent text-sm focus:outline-none"
                aria-label="Sort lists"
              >
                {LIST_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    className="h-12 rounded-3xl px-5 text-base shadow-lg"
                    disabled={!user?.email}
                  >
                    <Plus className="h-4 w-4" />
                    New List
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              {!user?.email ? (
                <TooltipContent>Log in to create lists.</TooltipContent>
              ) : null}
            </Tooltip>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a new list</DialogTitle>
                <DialogDescription>
                  Give it a name and (optionally) a description.
                </DialogDescription>
              </DialogHeader>

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void createList()
                }}
              >
                <div className="space-y-2">
                  <Input
                    value={newListTitle}
                    onChange={(event) => setNewListTitle(event.target.value)}
                    placeholder="List title"
                    aria-label="List title"
                    autoFocus
                    required
                  />
                  <Textarea
                    value={newListDescription}
                    onChange={(event) =>
                      setNewListDescription(event.target.value)
                    }
                    placeholder="Description (optional)"
                    aria-label="List description"
                    rows={3}
                  />
                  {newListError ? (
                    <p className="text-sm text-rose-700">{newListError}</p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setNewListOpen(false)}
                    disabled={newListSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={newListSaving}>
                    {newListSaving ? 'Creating…' : 'Create list'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!user?.email ? (
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                variant={option === activeFilter ? 'default' : 'secondary'}
                className={`rounded-full px-4 text-sm capitalize ${
                  option === activeFilter
                    ? 'shadow-md'
                    : 'bg-white/70 text-slate-600 hover:bg-white'
                }`}
                onClick={() => setActiveFilter(option)}
              >
                {option === 'all' ? 'All lists' : option}
              </Button>
            ))}
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Tracking {totalItems} items across{' '}
          {user?.email ? userLists.length : mockLists.length} lists.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Your lists</h1>
          <p className="text-sm text-muted-foreground">
            Browse, reorder, or share your collections at a glance.
          </p>
        </div>

        {user?.email ? (
          userListsLoading ? (
            <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
              Loading your lists…
            </div>
          ) : userListsError ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-10 text-center text-rose-700">
              {userListsError}
            </div>
          ) : visibleUserLists.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
              No lists match your search. Try a different query.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleUserLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <article className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md transition group-hover:-translate-y-0.5 group-hover:shadow-lg sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-xl font-semibold text-indigo-700">
                        {list.title.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="capitalize">
                            Custom
                          </Badge>
                          <span>{list.itemCount} items</span>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {list.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {list.description ?? '—'}
                          </p>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Updated {formatShortDate(list.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <Separator
                      orientation="vertical"
                      className="hidden h-20 self-stretch sm:block"
                    />

                    <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:flex-col sm:items-end sm:text-right">
                      <div className="flex flex-col text-left sm:items-end sm:text-right">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Items
                        </span>
                        <span className="text-3xl font-semibold leading-tight text-foreground">
                          {list.itemCount}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {list.itemCount === 1
                            ? 'Item in this list'
                            : 'Items in this list'}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )
        ) : visibleMockLists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
            No lists match your filters. Try a different search or category.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleMockLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <article className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md transition group-hover:-translate-y-0.5 group-hover:shadow-lg sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                      <Image
                        src={list.coverUrl}
                        alt={`${list.title} cover art`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-black/25 via-transparent to-black/0" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="capitalize">
                          {list.type}
                        </Badge>
                        <span>{list.itemCount} items</span>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {list.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {list.description}
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {list.previewItems.join(', ')}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {list.updatedAt}
                      </p>
                    </div>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="hidden h-20 self-stretch sm:block"
                  />

                  <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:flex-col sm:items-end sm:text-right">
                    <div className="flex flex-col text-left sm:items-end sm:text-right">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {list.stat.label}
                      </span>
                      <span className="text-3xl font-semibold leading-tight text-foreground">
                        {list.stat.value}
                      </span>
                      {list.stat.helper ? (
                        <span className="text-xs text-muted-foreground">
                          {list.stat.helper}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col text-left sm:items-end sm:text-right">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Items
                      </span>
                      <span className="text-3xl font-semibold leading-tight text-foreground">
                        {list.itemCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {list.itemCount === 1
                          ? 'Item in this list'
                          : 'Items in this list'}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Rated items</h2>
            <p className="text-sm text-muted-foreground">
              Everything you have rated so far, with quick filtering and
              sorting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={ratedQuery}
              onChange={(event) => setRatedQuery(event.target.value)}
              placeholder="Search ratings"
              className="h-9 w-[220px]"
            />
            <select
              value={ratedSort}
              onChange={(event) =>
                setRatedSort(event.target.value as RatedSort)
              }
              className="h-9 rounded-md border bg-white px-3 text-sm"
              aria-label="Sort rated items"
            >
              {RATED_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={ratedType}
              onChange={(event) =>
                setRatedType(event.target.value as MediaType | 'all')
              }
              className="h-9 rounded-md border bg-white px-3 text-sm capitalize"
              aria-label="Filter rated items by type"
            >
              <option value="all">All types</option>
              <option value="movie">Movies</option>
              <option value="tv">TV</option>
              <option value="anime">Anime</option>
              <option value="game">Games</option>
              <option value="song">Songs</option>
            </select>
            <select
              value={ratedStatus}
              onChange={(event) =>
                setRatedStatus(event.target.value as EntryStatus | 'all')
              }
              className="h-9 rounded-md border bg-white px-3 text-sm"
              aria-label="Filter rated items by status"
            >
              <option value="all">Any status</option>
              <option value="Planning">Planning</option>
              <option value="Watching">Watching</option>
              <option value="Listening">Listening</option>
              <option value="Playing">Playing</option>
              <option value="Completed">Completed</option>
              <option value="Dropped">Dropped</option>
            </select>
          </div>
        </div>

        <div className="mt-6 divide-y divide-slate-200">
          <div className="hidden grid-cols-[48px,1fr,90px,80px,120px,130px,120px,44px] items-center gap-3 pb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span />
            <span>Title</span>
            <span>Type</span>
            <span>Year</span>
            <span>Status</span>
            <span>Rating</span>
            <span>Date</span>
            <span className="text-right">Notes</span>
          </div>
          {!user ? (
            <div className="py-6 text-sm text-muted-foreground">
              Log in to see your rated items.
            </div>
          ) : ratedLoading ? (
            <div className="py-6 text-sm text-muted-foreground">
              Loading rated items…
            </div>
          ) : ratedError ? (
            <div className="py-6 text-sm text-rose-700">{ratedError}</div>
          ) : visibleRatedItems.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              No rated items yet.
            </div>
          ) : (
            visibleRatedItems.map((item) => (
              <div key={`${item.type}-${item.providerId}-${item.updatedAt}`}>
                <div className="hidden lg:block">
                  <MediaListItem
                    viewMode="compact"
                    href={`/media/${buildMediaRouteId({
                      provider: item.provider,
                      providerId: item.providerId,
                      type: item.type,
                    })}`}
                    title={item.title}
                    type={item.type}
                    posterUrl={item.coverUrl}
                    synopsis={null}
                    year={undefined}
                    status={item.status}
                    rating={item.rating}
                    note={item.note}
                    entryDateLabel="Rated"
                    entryDateIso={item.updatedAt}
                    onChangeStatus={async (next) => {
                      const prev = ratedItems
                      setRatedItems((items) =>
                        items.map((x) =>
                          x.providerId === item.providerId &&
                          x.type === item.type
                            ? { ...x, status: next }
                            : x,
                        ),
                      )
                      try {
                        await persistRatedPatch(item, { status: next })
                      } catch {
                        setRatedItems(prev)
                      }
                    }}
                    onChangeRating={async (next) => {
                      const prev = ratedItems
                      setRatedItems((items) =>
                        items.map((x) =>
                          x.providerId === item.providerId &&
                          x.type === item.type
                            ? { ...x, rating: next }
                            : x,
                        ),
                      )
                      try {
                        await persistRatedPatch(item, { rating: next })
                      } catch {
                        setRatedItems(prev)
                      }
                    }}
                    onSaveNote={async (next) => {
                      const prev = ratedItems
                      setRatedItems((items) =>
                        items.map((x) =>
                          x.providerId === item.providerId &&
                          x.type === item.type
                            ? { ...x, note: next }
                            : x,
                        ),
                      )
                      try {
                        await persistRatedPatch(item, { note: next })
                      } catch {
                        setRatedItems(prev)
                      }
                    }}
                  />
                </div>

                <div className="lg:hidden">
                  <MediaListItem
                    viewMode="detailed"
                    href={`/media/${buildMediaRouteId({
                      provider: item.provider,
                      providerId: item.providerId,
                      type: item.type,
                    })}`}
                    title={item.title}
                    type={item.type}
                    posterUrl={item.coverUrl}
                    synopsis={null}
                    year={undefined}
                    status={item.status}
                    rating={item.rating}
                    note={item.note}
                    entryDateLabel="Rated"
                    entryDateIso={item.updatedAt}
                    onChangeStatus={async (next) => {
                      const prev = ratedItems
                      setRatedItems((items) =>
                        items.map((x) =>
                          x.providerId === item.providerId &&
                          x.type === item.type
                            ? { ...x, status: next }
                            : x,
                        ),
                      )
                      try {
                        await persistRatedPatch(item, { status: next })
                      } catch {
                        setRatedItems(prev)
                      }
                    }}
                    onChangeRating={async (next) => {
                      const prev = ratedItems
                      setRatedItems((items) =>
                        items.map((x) =>
                          x.providerId === item.providerId &&
                          x.type === item.type
                            ? { ...x, rating: next }
                            : x,
                        ),
                      )
                      try {
                        await persistRatedPatch(item, { rating: next })
                      } catch {
                        setRatedItems(prev)
                      }
                    }}
                    onSaveNote={async (next) => {
                      const prev = ratedItems
                      setRatedItems((items) =>
                        items.map((x) =>
                          x.providerId === item.providerId &&
                          x.type === item.type
                            ? { ...x, note: next }
                            : x,
                        ),
                      )
                      try {
                        await persistRatedPatch(item, { note: next })
                      } catch {
                        setRatedItems(prev)
                      }
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
