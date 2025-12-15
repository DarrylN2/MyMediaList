'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MediaType } from '@/types'

type ListDetail = {
  id: string
  title: string
  description: string | null
  updated_at: string
}

type ListItem = {
  created_at: string
  media_items:
    | {
        id: string
        title: string
        poster_url: string | null
        description: string | null
        type: MediaType
        source: string
        source_id: string
      }
    | Array<{
        id: string
        title: string
        poster_url: string | null
        description: string | null
        type: MediaType
        source: string
        source_id: string
      }>
}

function buildMediaRouteId(media: {
  source: string
  source_id: string
  type: MediaType
}) {
  if (media.source === 'tmdb') {
    if (media.type === 'tv') return `tmdb-tv-${media.source_id}`
    return `tmdb-${media.source_id}`
  }
  return `${media.source}-${media.source_id}`
}

type ViewMode = 'detailed' | 'grid' | 'compact'
type SortOption = 'addedAt' | 'title' | 'type'

export function SupabaseListDetailClient({ listId }: { listId: string }) {
  const { user } = useAuth()
  const [list, setList] = useState<ListDetail | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [sortBy, setSortBy] = useState<SortOption>('addedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all')

  useEffect(() => {
    if (!user?.email) {
      setError('Log in to view this list.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const res = await fetch(
          `/api/lists/${listId}?userId=${encodeURIComponent(user.email)}`,
          { signal: controller.signal },
        )
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error ?? 'Unable to load list.')
        }

        const payload = (await res.json()) as {
          list: ListDetail
          items: ListItem[]
        }
        if (!controller.signal.aborted) {
          setList(payload.list)
          setItems(payload.items ?? [])
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setError(
          error instanceof Error ? error.message : 'Unable to load list.',
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [listId, user?.email])

  const processedItems = useMemo(() => {
    const q = query.trim().toLowerCase()

    const normalized = items
      .map((item) => {
        const media = Array.isArray(item.media_items)
          ? item.media_items[0]
          : item.media_items
        if (!media) return null
        return {
          createdAt: item.created_at,
          media,
          routeId: buildMediaRouteId(media),
        }
      })
      .filter(Boolean) as Array<{
      createdAt: string
      media: NonNullable<Exclude<ListItem['media_items'], Array<unknown>>>
      routeId: string
    }>

    const filtered = normalized.filter((entry) => {
      if (typeFilter !== 'all' && entry.media.type !== typeFilter) return false
      if (!q) return true
      return (
        entry.media.title.toLowerCase().includes(q) ||
        (entry.media.description?.toLowerCase().includes(q) ?? false)
      )
    })

    const direction = sortDirection === 'asc' ? 1 : -1
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'addedAt':
          return direction * a.createdAt.localeCompare(b.createdAt)
        case 'title':
          return (
            direction *
            a.media.title.localeCompare(b.media.title, undefined, {
              sensitivity: 'base',
            })
          )
        case 'type':
          return direction * a.media.type.localeCompare(b.media.type)
        default:
          return 0
      }
    })

    return sorted
  }, [items, query, sortBy, sortDirection, typeFilter])

  const formatAddedAt = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderView = () => {
    if (processedItems.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
          No entries match your filters.
        </div>
      )
    }

    if (viewMode === 'compact') {
      return (
        <div className="overflow-x-auto rounded-2xl border bg-white/95 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedItems.map((entry) => (
                <TableRow key={`${entry.createdAt}-${entry.media.id}`}>
                  <TableCell>
                    <Link
                      href={`/media/${entry.routeId}`}
                      className="font-medium hover:underline"
                    >
                      {entry.media.title}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">
                    {entry.media.type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatAddedAt(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {processedItems.map((entry) => (
            <Link
              key={`${entry.createdAt}-${entry.media.id}`}
              href={`/media/${entry.routeId}`}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="relative aspect-[2/3] w-full bg-muted">
                  {entry.media.poster_url ? (
                    <Image
                      src={entry.media.poster_url}
                      alt={entry.media.title}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-semibold">
                      {entry.media.title}
                    </h3>
                    <Badge variant="secondary" className="capitalize">
                      {entry.media.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added {formatAddedAt(entry.createdAt)}
                  </p>
                  {entry.media.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {entry.media.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )
    }

    // detailed
    return (
      <div className="space-y-4">
        {processedItems.map((entry) => (
          <article
            key={`${entry.createdAt}-${entry.media.id}`}
            className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:flex-row"
          >
            <Link
              href={`/media/${entry.routeId}`}
              className="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted md:h-44 md:w-32"
            >
              {entry.media.poster_url ? (
                <Image
                  src={entry.media.poster_url}
                  alt={entry.media.title}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : null}
            </Link>

            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/media/${entry.routeId}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {entry.media.title}
                </Link>
                <Badge variant="secondary" className="capitalize">
                  {entry.media.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Added {formatAddedAt(entry.createdAt)}
              </p>
              {entry.media.description ? (
                <p className="text-sm text-muted-foreground">
                  {entry.media.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 text-sm text-muted-foreground">
        Loading list…
      </div>
    )
  }

  if (error || !list) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-6 text-sm text-rose-700">
        {error ?? 'List not found.'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3 rounded-3xl border border-white/70 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                Custom list
              </Badge>
              <Badge variant="outline">{processedItems.length} items</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold">{list.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.description ?? '—'}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/lists">Back to lists</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search within this list"
            className="md:flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="addedAt">Added</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
              }
            >
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </Button>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as MediaType | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="movie">Movie</SelectItem>
                <SelectItem value="tv">TV</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="game">Game</SelectItem>
                <SelectItem value="song">Song</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {(['detailed', 'grid', 'compact'] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={viewMode === mode ? 'default' : 'outline'}
                  onClick={() => setViewMode(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
          No items yet.
        </div>
      ) : (
        renderView()
      )}
    </div>
  )
}
