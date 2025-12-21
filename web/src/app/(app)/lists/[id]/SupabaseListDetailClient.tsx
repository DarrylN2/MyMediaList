'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List, Table as TableIcon } from 'lucide-react'
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
import { MediaListItem } from '@/components/MediaListItem'
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
        year: number | null
        duration_minutes: number | null
        genres: string[] | null
        directors: string[] | null
        writers: string[] | null
        cast: string[] | null
        metadata: unknown | null
      }
    | Array<{
        id: string
        title: string
        poster_url: string | null
        description: string | null
        type: MediaType
        source: string
        source_id: string
        year: number | null
        duration_minutes: number | null
        genres: string[] | null
        directors: string[] | null
        writers: string[] | null
        cast: string[] | null
        metadata: unknown | null
      }>
  entry?: {
    status: import('@/types').EntryStatus
    rating: number | null
    note: string | null
    updatedAt: string
    firstRatedAt?: string | null
  } | null
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
  if (media.source === 'anilist') {
    return `anilist-anime-${media.source_id}`
  }
  if (media.source === 'igdb') {
    return `igdb-game-${media.source_id}`
  }
  return `${media.source}-${media.source_id}`
}

type ViewMode = 'detailed' | 'grid' | 'compact'
type SortOption = 'addedAt' | 'title' | 'type'

function getEpisodeCount(metadata: unknown): number | null {
  if (
    metadata == null ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata)
  ) {
    return null
  }
  const value = (metadata as Record<string, unknown>).episodeCount
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

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
          entry: item.entry ?? null,
        }
      })
      .filter(Boolean) as Array<{
      createdAt: string
      media: NonNullable<Exclude<ListItem['media_items'], Array<unknown>>>
      routeId: string
      entry: NonNullable<ListItem['entry']> | null
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

  const mergeEpisodeCountForMedia = (mediaId: string, episodeCount: number) => {
    setItems((prev) =>
      prev.map((row) => {
        const media = Array.isArray(row.media_items)
          ? row.media_items[0]
          : row.media_items
        if (!media || media.id !== mediaId) return row

        const patchOne = (
          current: NonNullable<
            Exclude<ListItem['media_items'], Array<unknown>>
          >,
        ) => {
          const existingMeta = isRecord(current.metadata)
            ? current.metadata
            : {}
          if (typeof existingMeta.episodeCount === 'number') return current
          return { ...current, metadata: { ...existingMeta, episodeCount } }
        }

        return {
          ...row,
          media_items: Array.isArray(row.media_items)
            ? row.media_items.map((item) =>
                item.id === mediaId ? patchOne(item) : item,
              )
            : patchOne(row.media_items),
        }
      }),
    )
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
          <div className="min-w-[1280px] divide-y divide-slate-200 p-2">
            <div className="grid grid-cols-[96px_260px_1fr_80px_100px_120px_160px_120px] items-start gap-3 px-2 pb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span />
              <span>Title</span>
              <span>Synopsis</span>
              <span>Year</span>
              <span>Runtime</span>
              <span>Status</span>
              <span>Rating</span>
              <span>Date</span>
            </div>
            {processedItems.map((entry) => (
              <MediaListItem
                key={`${entry.createdAt}-${entry.media.id}`}
                viewMode="compact"
                href={`/media/${entry.routeId}`}
                title={entry.media.title}
                type={entry.media.type}
                posterUrl={entry.media.poster_url}
                synopsis={entry.media.description}
                year={entry.media.year ?? undefined}
                runtimeMinutes={entry.media.duration_minutes ?? undefined}
                episodeCount={getEpisodeCount(entry.media.metadata)}
                genres={entry.media.genres ?? undefined}
                directors={entry.media.directors ?? undefined}
                writers={entry.media.writers ?? undefined}
                cast={entry.media.cast ?? undefined}
                status={
                  (entry.entry?.status as import('@/types').EntryStatus) ??
                  'Planning'
                }
                rating={entry.entry?.rating ?? null}
                note={entry.entry?.note ?? null}
                entryDateLabel={entry.entry?.firstRatedAt ? 'Rated' : 'Added'}
                entryDateIso={entry.entry?.firstRatedAt ?? entry.createdAt}
                onChangeStatus={async (next) => {
                  if (!user?.email) return
                  setItems((prev) =>
                    prev.map((row) => {
                      const media = Array.isArray(row.media_items)
                        ? row.media_items[0]
                        : row.media_items
                      if (!media) return row
                      if (media.id !== entry.media.id) return row
                      return {
                        ...row,
                        entry: {
                          status: next,
                          rating: row.entry?.rating ?? null,
                          note: row.entry?.note ?? null,
                          updatedAt:
                            row.entry?.updatedAt ?? new Date().toISOString(),
                          firstRatedAt: row.entry?.firstRatedAt ?? null,
                        },
                      }
                    }),
                  )
                  const res = await fetch('/api/list', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.email,
                      media: {
                        provider: entry.media.source,
                        providerId: entry.media.source_id,
                        type: entry.media.type,
                        title: entry.media.title,
                        posterUrl: entry.media.poster_url ?? undefined,
                        description: entry.media.description ?? undefined,
                        episodeCount:
                          getEpisodeCount(entry.media.metadata) ?? undefined,
                      },
                      entry: { status: next },
                    }),
                  })
                  if (res.ok) {
                    const payload = (await res.json().catch(() => null)) as {
                      mediaMeta?: { episodeCount?: unknown } | null
                    } | null
                    const episodeCount =
                      typeof payload?.mediaMeta?.episodeCount === 'number'
                        ? payload.mediaMeta.episodeCount
                        : null
                    if (episodeCount != null) {
                      mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                    }
                  }
                }}
                onChangeRating={async (next) => {
                  if (!user?.email) return
                  setItems((prev) =>
                    prev.map((row) => {
                      const media = Array.isArray(row.media_items)
                        ? row.media_items[0]
                        : row.media_items
                      if (!media) return row
                      if (media.id !== entry.media.id) return row
                      const nextFirstRatedAt =
                        row.entry?.firstRatedAt ??
                        (next ? new Date().toISOString() : null)
                      return {
                        ...row,
                        entry: {
                          status: row.entry?.status ?? 'Planning',
                          rating: next,
                          note: row.entry?.note ?? null,
                          updatedAt:
                            row.entry?.updatedAt ?? new Date().toISOString(),
                          firstRatedAt: nextFirstRatedAt,
                        },
                      }
                    }),
                  )
                  const res = await fetch('/api/list', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.email,
                      media: {
                        provider: entry.media.source,
                        providerId: entry.media.source_id,
                        type: entry.media.type,
                        title: entry.media.title,
                        posterUrl: entry.media.poster_url ?? undefined,
                        description: entry.media.description ?? undefined,
                        episodeCount:
                          getEpisodeCount(entry.media.metadata) ?? undefined,
                      },
                      entry: { rating: next },
                    }),
                  })
                  if (res.ok) {
                    const payload = (await res.json().catch(() => null)) as {
                      mediaMeta?: { episodeCount?: unknown } | null
                    } | null
                    const episodeCount =
                      typeof payload?.mediaMeta?.episodeCount === 'number'
                        ? payload.mediaMeta.episodeCount
                        : null
                    if (episodeCount != null) {
                      mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                    }
                  }
                }}
                onSaveNote={async (next) => {
                  if (!user?.email) return
                  setItems((prev) =>
                    prev.map((row) => {
                      const media = Array.isArray(row.media_items)
                        ? row.media_items[0]
                        : row.media_items
                      if (!media) return row
                      if (media.id !== entry.media.id) return row
                      return {
                        ...row,
                        entry: {
                          status: row.entry?.status ?? 'Planning',
                          rating: row.entry?.rating ?? null,
                          note: next,
                          updatedAt:
                            row.entry?.updatedAt ?? new Date().toISOString(),
                          firstRatedAt: row.entry?.firstRatedAt ?? null,
                        },
                      }
                    }),
                  )
                  const res = await fetch('/api/list', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.email,
                      media: {
                        provider: entry.media.source,
                        providerId: entry.media.source_id,
                        type: entry.media.type,
                        title: entry.media.title,
                        posterUrl: entry.media.poster_url ?? undefined,
                        description: entry.media.description ?? undefined,
                        episodeCount:
                          getEpisodeCount(entry.media.metadata) ?? undefined,
                      },
                      entry: { note: next },
                    }),
                  })
                  if (res.ok) {
                    const payload = (await res.json().catch(() => null)) as {
                      mediaMeta?: { episodeCount?: unknown } | null
                    } | null
                    const episodeCount =
                      typeof payload?.mediaMeta?.episodeCount === 'number'
                        ? payload.mediaMeta.episodeCount
                        : null
                    if (episodeCount != null) {
                      mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                    }
                  }
                }}
              />
            ))}
          </div>
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {processedItems.map((entry) => (
            <MediaListItem
              key={`${entry.createdAt}-${entry.media.id}`}
              viewMode="grid"
              href={`/media/${entry.routeId}`}
              title={entry.media.title}
              type={entry.media.type}
              posterUrl={entry.media.poster_url}
              synopsis={entry.media.description}
              year={entry.media.year ?? undefined}
              runtimeMinutes={entry.media.duration_minutes ?? undefined}
              episodeCount={getEpisodeCount(entry.media.metadata)}
              genres={entry.media.genres ?? undefined}
              directors={entry.media.directors ?? undefined}
              writers={entry.media.writers ?? undefined}
              cast={entry.media.cast ?? undefined}
              status={
                (entry.entry?.status as import('@/types').EntryStatus) ??
                'Planning'
              }
              rating={entry.entry?.rating ?? null}
              note={entry.entry?.note ?? null}
              entryDateLabel={entry.entry?.firstRatedAt ? 'Rated' : 'Added'}
              entryDateIso={entry.entry?.firstRatedAt ?? entry.createdAt}
              onChangeStatus={async (next) => {
                if (!user?.email) return
                setItems((prev) =>
                  prev.map((row) => {
                    const media = Array.isArray(row.media_items)
                      ? row.media_items[0]
                      : row.media_items
                    if (!media) return row
                    if (media.id !== entry.media.id) return row
                    return {
                      ...row,
                      entry: {
                        status: next,
                        rating: row.entry?.rating ?? null,
                        note: row.entry?.note ?? null,
                        updatedAt:
                          row.entry?.updatedAt ?? new Date().toISOString(),
                        firstRatedAt: row.entry?.firstRatedAt ?? null,
                      },
                    }
                  }),
                )
                const res = await fetch('/api/list', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.email,
                    media: {
                      provider: entry.media.source,
                      providerId: entry.media.source_id,
                      type: entry.media.type,
                      title: entry.media.title,
                      posterUrl: entry.media.poster_url ?? undefined,
                      description: entry.media.description ?? undefined,
                      episodeCount:
                        getEpisodeCount(entry.media.metadata) ?? undefined,
                    },
                    entry: { status: next },
                  }),
                })
                if (res.ok) {
                  const payload = (await res.json().catch(() => null)) as {
                    mediaMeta?: { episodeCount?: unknown } | null
                  } | null
                  const episodeCount =
                    typeof payload?.mediaMeta?.episodeCount === 'number'
                      ? payload.mediaMeta.episodeCount
                      : null
                  if (episodeCount != null) {
                    mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                  }
                }
              }}
              onChangeRating={async (next) => {
                if (!user?.email) return
                setItems((prev) =>
                  prev.map((row) => {
                    const media = Array.isArray(row.media_items)
                      ? row.media_items[0]
                      : row.media_items
                    if (!media) return row
                    if (media.id !== entry.media.id) return row
                    const nextFirstRatedAt =
                      row.entry?.firstRatedAt ??
                      (next ? new Date().toISOString() : null)
                    return {
                      ...row,
                      entry: {
                        status: row.entry?.status ?? 'Planning',
                        rating: next,
                        note: row.entry?.note ?? null,
                        updatedAt:
                          row.entry?.updatedAt ?? new Date().toISOString(),
                        firstRatedAt: nextFirstRatedAt,
                      },
                    }
                  }),
                )
                const res = await fetch('/api/list', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.email,
                    media: {
                      provider: entry.media.source,
                      providerId: entry.media.source_id,
                      type: entry.media.type,
                      title: entry.media.title,
                      posterUrl: entry.media.poster_url ?? undefined,
                      description: entry.media.description ?? undefined,
                      episodeCount:
                        getEpisodeCount(entry.media.metadata) ?? undefined,
                    },
                    entry: { rating: next },
                  }),
                })
                if (res.ok) {
                  const payload = (await res.json().catch(() => null)) as {
                    mediaMeta?: { episodeCount?: unknown } | null
                  } | null
                  const episodeCount =
                    typeof payload?.mediaMeta?.episodeCount === 'number'
                      ? payload.mediaMeta.episodeCount
                      : null
                  if (episodeCount != null) {
                    mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                  }
                }
              }}
              onSaveNote={async (next) => {
                if (!user?.email) return
                setItems((prev) =>
                  prev.map((row) => {
                    const media = Array.isArray(row.media_items)
                      ? row.media_items[0]
                      : row.media_items
                    if (!media) return row
                    if (media.id !== entry.media.id) return row
                    return {
                      ...row,
                      entry: {
                        status: row.entry?.status ?? 'Planning',
                        rating: row.entry?.rating ?? null,
                        note: next,
                        updatedAt:
                          row.entry?.updatedAt ?? new Date().toISOString(),
                        firstRatedAt: row.entry?.firstRatedAt ?? null,
                      },
                    }
                  }),
                )
                const res = await fetch('/api/list', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.email,
                    media: {
                      provider: entry.media.source,
                      providerId: entry.media.source_id,
                      type: entry.media.type,
                      title: entry.media.title,
                      posterUrl: entry.media.poster_url ?? undefined,
                      description: entry.media.description ?? undefined,
                      episodeCount:
                        getEpisodeCount(entry.media.metadata) ?? undefined,
                    },
                    entry: { note: next },
                  }),
                })
                if (res.ok) {
                  const payload = (await res.json().catch(() => null)) as {
                    mediaMeta?: { episodeCount?: unknown } | null
                  } | null
                  const episodeCount =
                    typeof payload?.mediaMeta?.episodeCount === 'number'
                      ? payload.mediaMeta.episodeCount
                      : null
                  if (episodeCount != null) {
                    mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                  }
                }
              }}
            />
          ))}
        </div>
      )
    }

    // detailed
    return (
      <div className="space-y-4">
        {processedItems.map((entry) => (
          <MediaListItem
            key={`${entry.createdAt}-${entry.media.id}`}
            viewMode="detailed"
            href={`/media/${entry.routeId}`}
            title={entry.media.title}
            type={entry.media.type}
            posterUrl={entry.media.poster_url}
            synopsis={entry.media.description}
            year={entry.media.year ?? undefined}
            runtimeMinutes={entry.media.duration_minutes ?? undefined}
            episodeCount={getEpisodeCount(entry.media.metadata)}
            genres={entry.media.genres ?? undefined}
            directors={entry.media.directors ?? undefined}
            writers={entry.media.writers ?? undefined}
            cast={entry.media.cast ?? undefined}
            status={
              (entry.entry?.status as import('@/types').EntryStatus) ??
              'Planning'
            }
            rating={entry.entry?.rating ?? null}
            note={entry.entry?.note ?? null}
            entryDateLabel={entry.entry?.firstRatedAt ? 'Rated' : 'Added'}
            entryDateIso={entry.entry?.firstRatedAt ?? entry.createdAt}
            onChangeStatus={async (next) => {
              if (!user?.email) return
              setItems((prev) =>
                prev.map((row) => {
                  const media = Array.isArray(row.media_items)
                    ? row.media_items[0]
                    : row.media_items
                  if (!media) return row
                  if (media.id !== entry.media.id) return row
                  return {
                    ...row,
                    entry: {
                      status: next,
                      rating: row.entry?.rating ?? null,
                      note: row.entry?.note ?? null,
                      updatedAt:
                        row.entry?.updatedAt ?? new Date().toISOString(),
                      firstRatedAt: row.entry?.firstRatedAt ?? null,
                    },
                  }
                }),
              )
              const res = await fetch('/api/list', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.email,
                  media: {
                    provider: entry.media.source,
                    providerId: entry.media.source_id,
                    type: entry.media.type,
                    title: entry.media.title,
                    posterUrl: entry.media.poster_url ?? undefined,
                    description: entry.media.description ?? undefined,
                    episodeCount:
                      getEpisodeCount(entry.media.metadata) ?? undefined,
                  },
                  entry: { status: next },
                }),
              })
              if (res.ok) {
                const payload = (await res.json().catch(() => null)) as {
                  mediaMeta?: { episodeCount?: unknown } | null
                } | null
                const episodeCount =
                  typeof payload?.mediaMeta?.episodeCount === 'number'
                    ? payload.mediaMeta.episodeCount
                    : null
                if (episodeCount != null) {
                  mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                }
              }
            }}
            onChangeRating={async (next) => {
              if (!user?.email) return
              setItems((prev) =>
                prev.map((row) => {
                  const media = Array.isArray(row.media_items)
                    ? row.media_items[0]
                    : row.media_items
                  if (!media) return row
                  if (media.id !== entry.media.id) return row
                  const nextFirstRatedAt =
                    row.entry?.firstRatedAt ??
                    (next ? new Date().toISOString() : null)
                  return {
                    ...row,
                    entry: {
                      status: row.entry?.status ?? 'Planning',
                      rating: next,
                      note: row.entry?.note ?? null,
                      updatedAt:
                        row.entry?.updatedAt ?? new Date().toISOString(),
                      firstRatedAt: nextFirstRatedAt,
                    },
                  }
                }),
              )
              const res = await fetch('/api/list', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.email,
                  media: {
                    provider: entry.media.source,
                    providerId: entry.media.source_id,
                    type: entry.media.type,
                    title: entry.media.title,
                    posterUrl: entry.media.poster_url ?? undefined,
                    description: entry.media.description ?? undefined,
                    episodeCount:
                      getEpisodeCount(entry.media.metadata) ?? undefined,
                  },
                  entry: { rating: next },
                }),
              })
              if (res.ok) {
                const payload = (await res.json().catch(() => null)) as {
                  mediaMeta?: { episodeCount?: unknown } | null
                } | null
                const episodeCount =
                  typeof payload?.mediaMeta?.episodeCount === 'number'
                    ? payload.mediaMeta.episodeCount
                    : null
                if (episodeCount != null) {
                  mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                }
              }
            }}
            onSaveNote={async (next) => {
              if (!user?.email) return
              setItems((prev) =>
                prev.map((row) => {
                  const media = Array.isArray(row.media_items)
                    ? row.media_items[0]
                    : row.media_items
                  if (!media) return row
                  if (media.id !== entry.media.id) return row
                  return {
                    ...row,
                    entry: {
                      status: row.entry?.status ?? 'Planning',
                      rating: row.entry?.rating ?? null,
                      note: next,
                      updatedAt:
                        row.entry?.updatedAt ?? new Date().toISOString(),
                      firstRatedAt: row.entry?.firstRatedAt ?? null,
                    },
                  }
                }),
              )
              const res = await fetch('/api/list', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.email,
                  media: {
                    provider: entry.media.source,
                    providerId: entry.media.source_id,
                    type: entry.media.type,
                    title: entry.media.title,
                    posterUrl: entry.media.poster_url ?? undefined,
                    description: entry.media.description ?? undefined,
                    episodeCount:
                      getEpisodeCount(entry.media.metadata) ?? undefined,
                  },
                  entry: { note: next },
                }),
              })
              if (res.ok) {
                const payload = (await res.json().catch(() => null)) as {
                  mediaMeta?: { episodeCount?: unknown } | null
                } | null
                const episodeCount =
                  typeof payload?.mediaMeta?.episodeCount === 'number'
                    ? payload.mediaMeta.episodeCount
                    : null
                if (episodeCount != null) {
                  mergeEpisodeCountForMedia(entry.media.id, episodeCount)
                }
              }
            }}
          />
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
                <SelectItem value="song">Track</SelectItem>
                <SelectItem value="album">Album</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {(['detailed', 'grid', 'compact'] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="icon"
                  variant={viewMode === mode ? 'default' : 'outline'}
                  onClick={() => setViewMode(mode)}
                  aria-label={
                    mode === 'detailed'
                      ? 'Detailed view'
                      : mode === 'grid'
                        ? 'Grid view'
                        : 'Compact view'
                  }
                  title={
                    mode === 'detailed'
                      ? 'Detailed'
                      : mode === 'grid'
                        ? 'Grid'
                        : 'Compact'
                  }
                >
                  {mode === 'detailed' ? (
                    <List className="h-4 w-4" />
                  ) : mode === 'grid' ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <TableIcon className="h-4 w-4" />
                  )}
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
