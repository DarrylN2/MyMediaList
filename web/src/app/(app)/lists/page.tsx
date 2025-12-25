'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  Search,
  Table as TableIcon,
} from 'lucide-react'

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
import {
  MediaListItem,
  type MediaListItemViewMode,
} from '@/components/MediaListItem'
import { ListPosterCollage } from '@/components/ListPosterCollage'
import { useAuth } from '@/context/AuthContext'
import {
  buildDemoRatedItems,
  ensureDemoState,
  updateDemoEntry,
} from '@/data/demoStore'
import type { EntryStatus, MediaProvider, MediaType } from '@/types'

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
  firstRatedAt: string | null
  note: string | null
  episodeProgress: number | null
  coverUrl: string | null
  description: string | null
  year: number | null
  durationMinutes: number | null
  episodeCount: number | null
  genres: string[] | null
  directors: string[] | null
  writers: string[] | null
  cast: string[] | null
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

function buildMediaRouteId(media: {
  provider: string
  providerId: string
  type: MediaType
}) {
  if (media.provider === 'tmdb') {
    if (media.type === 'tv') return `tmdb-tv-${media.providerId}`
    return `tmdb-${media.providerId}`
  }
  if (media.provider === 'anilist') {
    return `anilist-anime-${media.providerId}`
  }
  if (media.provider === 'igdb') {
    return `igdb-game-${media.providerId}`
  }
  return `${media.provider}-${media.providerId}`
}

export default function ListsPage() {
  const router = useRouter()
  const { user, apiFetch, openAuthDialog, beginAppLoading, endAppLoading } =
    useAuth()
  const [query, setQuery] = useState('')
  const [listSort, setListSort] = useState<ListSort>('recent')
  const [userLists, setUserLists] = useState<
    Array<{
      id: string
      title: string
      description: string | null
      updatedAt: string
      itemCount: number
      posterUrls: string[]
    }>
  >([])
  const [userListsLoading, setUserListsLoading] = useState(false)
  const [userListsError, setUserListsError] = useState<string | null>(null)
  const [ratedQuery, setRatedQuery] = useState('')
  const [ratedType, setRatedType] = useState<MediaType | 'all'>('all')
  const [ratedStatus, setRatedStatus] = useState<EntryStatus | 'all'>('all')
  const [ratedSort, setRatedSort] = useState<RatedSort>('recent')
  const [ratedViewMode, setRatedViewMode] =
    useState<MediaListItemViewMode>('detailed')
  const [ratedItems, setRatedItems] = useState<RatedItem[]>([])
  const [ratedLoading, setRatedLoading] = useState(false)
  const [ratedError, setRatedError] = useState<string | null>(null)
  const [demoLists, setDemoLists] = useState<
    Array<{
      id: string
      title: string
      description: string
      updatedAt: string
      itemCount: number
      posterUrls: string[]
    }>
  >([])
  const [demoRatedItems, setDemoRatedItems] = useState<RatedItem[]>([])
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

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

  const toDemoListSummaries = (
    lists: Array<{
      id: string
      title: string
      description: string
      updatedAt: string
      items: Array<{ media: { posterUrl?: string | null } }>
    }>,
  ) =>
    lists.map((list) => ({
      id: list.id,
      title: list.title,
      description: list.description,
      updatedAt: list.updatedAt,
      itemCount: list.items.length,
      posterUrls: list.items
        .map((item) => item.media.posterUrl ?? null)
        .filter(Boolean)
        .slice(0, 4) as string[],
    }))

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

  const filteredDemoLists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return demoLists.filter((list) => {
      if (!normalizedQuery) return true
      return (
        list.title.toLowerCase().includes(normalizedQuery) ||
        list.description.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [demoLists, query])

  const visibleDemoLists = useMemo(() => {
    const sorted = [...filteredDemoLists].sort((a, b) => {
      switch (listSort) {
        case 'recent':
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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
  }, [filteredDemoLists, listSort])

  const totalItems = useMemo(() => {
    if (user) {
      return userLists.reduce((sum, list) => sum + list.itemCount, 0)
    }
    return demoLists.reduce((sum, list) => sum + list.itemCount, 0)
  }, [demoLists, user, userLists])

  useEffect(() => {
    if (!user) {
      setUserLists([])
      setUserListsError(null)
      setUserListsLoading(false)
      return
    }

    const controller = new AbortController()
    setUserListsLoading(true)
    setUserListsError(null)
    beginAppLoading()

    const load = async () => {
      try {
        const res = await apiFetch('/api/lists', { signal: controller.signal })
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
        const listSummaries = await Promise.all(
          lists.map(async (list) => {
            const countRes = await apiFetch(`/api/lists/${list.id}`, {
              signal: controller.signal,
            })
            if (!countRes.ok)
              return { itemCount: 0, posterUrls: [] as string[] }

            const detail = (await countRes.json()) as {
              items?: Array<{
                media_items:
                  | { poster_url: string | null }
                  | Array<{ poster_url: string | null }>
              }>
            }

            const items = Array.isArray(detail.items) ? detail.items : []
            const posterUrls = items
              .map((row) => {
                const media = Array.isArray(row.media_items)
                  ? row.media_items[0]
                  : row.media_items
                return media?.poster_url ?? null
              })
              .filter(Boolean)
              .slice(0, 4) as string[]

            return { itemCount: items.length, posterUrls }
          }),
        )

        if (!controller.signal.aborted) {
          setUserLists(
            lists.map((list, idx) => ({
              id: list.id,
              title: list.title,
              description: list.description,
              updatedAt: list.updated_at,
              itemCount: listSummaries[idx]?.itemCount ?? 0,
              posterUrls: listSummaries[idx]?.posterUrls ?? [],
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
        endAppLoading()
      }
    }

    load()
    return () => controller.abort()
  }, [apiFetch, beginAppLoading, endAppLoading, user])

  useEffect(() => {
    if (!user) {
      setRatedItems([])
      setRatedError(null)
      setRatedLoading(false)
      return
    }

    const controller = new AbortController()
    setRatedLoading(true)
    setRatedError(null)
    beginAppLoading()

    const load = async () => {
      try {
        const response = await apiFetch('/api/ratings', {
          signal: controller.signal,
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Failed to load rated items.')
        }

        const payload = (await response.json()) as {
          items: Array<{
            status: EntryStatus
            rating: number
            note: string | null
            episodeProgress: number | null
            updatedAt: string
            firstRatedAt: string | null
            media: {
              title: string
              posterUrl: string | null
              description: string | null
              type: MediaType
              provider: string
              providerId: string
              year: number | null
              durationMinutes: number | null
              episodeCount: number | null
              genres: string[] | null
              directors: string[] | null
              writers: string[] | null
              cast: string[] | null
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
              firstRatedAt: item.firstRatedAt ?? null,
              note: item.note,
              episodeProgress: item.episodeProgress ?? null,
              coverUrl: item.media.posterUrl,
              description: item.media.description ?? null,
              year: item.media.year ?? null,
              durationMinutes: item.media.durationMinutes ?? null,
              episodeCount: item.media.episodeCount ?? null,
              genres: item.media.genres ?? null,
              directors: item.media.directors ?? null,
              writers: item.media.writers ?? null,
              cast: item.media.cast ?? null,
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
        endAppLoading()
      }
    }

    load()
    return () => controller.abort()
  }, [apiFetch, beginAppLoading, endAppLoading, user])

  useEffect(() => {
    if (user) {
      setDemoLists([])
      setDemoRatedItems([])
      setDemoError(null)
      setDemoLoading(false)
      return
    }

    let active = true
    setDemoLoading(true)
    setDemoError(null)

    ensureDemoState()
      .then((state) => {
        if (!active) return
        setDemoLists(toDemoListSummaries(state.lists))
        setDemoRatedItems(buildDemoRatedItems(state.entries))
      })
      .catch((err) => {
        if (!active) return
        setDemoError(
          err instanceof Error ? err.message : 'Failed to load demo lists.',
        )
      })
      .finally(() => {
        if (active) setDemoLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('mml:ratedViewMode')
      if (stored === 'detailed' || stored === 'grid' || stored === 'compact') {
        setRatedViewMode(stored)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('mml:ratedViewMode', ratedViewMode)
    } catch {
      // ignore
    }
  }, [ratedViewMode])

  const ratedItemsSource = user ? ratedItems : demoRatedItems

  const visibleRatedItems = useMemo(() => {
    const q = ratedQuery.trim().toLowerCase()

    const filtered = ratedItemsSource.filter((item) => {
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
  }, [ratedItemsSource, ratedQuery, ratedSort, ratedStatus, ratedType])

  const applyDemoPatch = (
    item: RatedItem,
    entry: Partial<{
      status: EntryStatus
      rating: number | null
      note: string | null
      episodeProgress: number | null
    }>,
  ) => {
    const nextState = updateDemoEntry(
      {
        provider: item.provider as MediaProvider,
        providerId: item.providerId,
        type: item.type,
        title: item.title,
        posterUrl: item.coverUrl,
        description: item.description,
        year: item.year ?? undefined,
        durationMinutes: item.durationMinutes ?? undefined,
        episodeCount: item.episodeCount ?? undefined,
        genres: item.genres ?? undefined,
      },
      entry,
    )
    if (nextState) {
      setDemoLists(toDemoListSummaries(nextState.lists))
      setDemoRatedItems(buildDemoRatedItems(nextState.entries))
    }
  }

  const persistRatedPatch = async (
    item: RatedItem,
    entry: Partial<{
      status: EntryStatus
      rating: number | null
      note: string
      episodeProgress: number | null
    }>,
  ) => {
    if (!user) {
      applyDemoPatch(item, entry)
      return
    }

    const res = await apiFetch('/api/list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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

  const handleEpisodeProgressUpdate = async (
    item: RatedItem,
    next: number | null,
  ) => {
    const episodeCount =
      typeof item.episodeCount === 'number' && item.episodeCount > 0
        ? Math.round(item.episodeCount)
        : null
    const clamp = (value: number) => {
      const rounded = Math.max(0, Math.round(value))
      return episodeCount != null ? Math.min(episodeCount, rounded) : rounded
    }

    let nextStatus = item.status
    let nextProgress = item.episodeProgress
    let updateProgress = false

    if (item.status === 'Dropped') {
      if (next != null && next > 0) {
        nextProgress = clamp(next)
        updateProgress = true
      }
    } else if (next == null || next <= 0) {
      nextStatus = 'Planning'
    } else {
      const clamped = clamp(next)
      nextProgress = clamped
      updateProgress = true
      if (episodeCount != null && clamped >= episodeCount) {
        nextStatus = 'Completed'
      } else {
        nextStatus = 'Watching'
      }
    }

    const shouldPersist = updateProgress || nextStatus !== item.status
    if (!shouldPersist) return

    if (!user) {
      applyDemoPatch(item, {
        status: nextStatus,
        ...(updateProgress ? { episodeProgress: nextProgress ?? null } : {}),
      })
      return
    }

    const prev = ratedItems
    setRatedItems((items) =>
      items.map((x) =>
        x.providerId === item.providerId && x.type === item.type
          ? {
              ...x,
              status: nextStatus,
              episodeProgress: updateProgress
                ? (nextProgress ?? null)
                : x.episodeProgress,
            }
          : x,
      ),
    )

    try {
      await persistRatedPatch(item, {
        status: nextStatus,
        ...(updateProgress ? { episodeProgress: nextProgress ?? null } : {}),
      })
    } catch {
      setRatedItems(prev)
    }
  }

  const createList = async () => {
    if (!user) {
      openAuthDialog('login')
      return
    }
    if (newListSaving) return

    const title = newListTitle.trim()
    const description = newListDescription.trim()
    if (!title) {
      setNewListError('Title is required.')
      return
    }

    setNewListSaving(true)
    setNewListError(null)

    try {
      const res = await apiFetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
            posterUrls: [],
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
          <div
            className="flex flex-1 items-center gap-3 rounded-3xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur"
            style={{
              backgroundImage:
                'linear-gradient(120deg, rgba(255,90,111,0.14), rgba(90,169,255,0.12) 45%, rgba(255,255,255,0) 70%)',
            }}
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your lists"
              className="h-auto border-0 bg-transparent px-0 text-base focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 rounded-full border border-dashed border-primary/30 bg-white/80 px-3 py-1 text-primary">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={listSort}
                onChange={(event) =>
                  setListSort(event.target.value as ListSort)
                }
                className="h-8 bg-transparent text-sm text-primary focus:outline-none"
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

          {user ? (
            <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
              <DialogTrigger asChild>
                <Button
                  className="h-12 rounded-3xl px-5 text-base shadow-lg"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #FF5A6F, #6CC6FF)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New List
                </Button>
              </DialogTrigger>
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
                      {newListSaving ? 'Creating...' : 'Create list'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-12 rounded-3xl px-5 text-base shadow-lg"
                  onClick={() => openAuthDialog('login')}
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #FF5A6F, #6CC6FF)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New List
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log In / Sign up to create lists.</TooltipContent>
            </Tooltip>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Tracking {totalItems} items across{' '}
          {user ? userLists.length : demoLists.length} lists.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Your <span className="text-primary">lists</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse, reorder, or share your collections at a glance.
          </p>
        </div>

        {user ? (
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
                  <article className="hover-lift fade-up flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md transition group-hover:shadow-lg sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex flex-1 items-center gap-4">
                      {list.posterUrls.length > 0 ? (
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                          <ListPosterCollage
                            posterUrls={list.posterUrls}
                            className="h-full w-full"
                            sizes="96px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-xl font-semibold text-indigo-700">
                          {list.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-2">
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
                        <span className="text-3xl font-semibold leading-tight text-primary">
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
        ) : demoLoading ? (
          <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
            Loading demo lists...
          </div>
        ) : demoError ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-10 text-center text-rose-700">
            {demoError}
          </div>
        ) : visibleDemoLists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
            No lists match your filters. Try a different search or category.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleDemoLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <article className="hover-lift fade-up flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md transition group-hover:shadow-lg sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex flex-1 items-center gap-4">
                    {list.posterUrls.length > 0 ? (
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                        <ListPosterCollage
                          posterUrls={list.posterUrls}
                          className="h-full w-full"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-xl font-semibold text-indigo-700">
                        {list.title.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {list.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {list.description}
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
                      <span className="text-3xl font-semibold leading-tight text-primary">
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
            <h2 className="text-xl font-semibold">
              <span className="text-primary">Rated</span> items
            </h2>
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
              <option value="song">Tracks</option>
              <option value="album">Albums</option>
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
            <div className="flex items-center gap-2">
              {(['detailed', 'grid', 'compact'] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="icon"
                  variant={ratedViewMode === mode ? 'default' : 'outline'}
                  onClick={() => setRatedViewMode(mode)}
                  aria-label={
                    mode === 'detailed'
                      ? 'List view'
                      : mode === 'grid'
                        ? 'Grid view'
                        : 'Table view'
                  }
                  title={
                    mode === 'detailed'
                      ? 'List'
                      : mode === 'grid'
                        ? 'Grid'
                        : 'Table'
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

        <div className="mt-6">
          {user && ratedLoading ? (
            <div className="py-6 text-sm text-muted-foreground">
              Loading rated items…
            </div>
          ) : user && ratedError ? (
            <div className="py-6 text-sm text-rose-700">{ratedError}</div>
          ) : !user && demoLoading ? (
            <div className="py-6 text-sm text-muted-foreground">
              Loading demo ratings...
            </div>
          ) : !user && demoError ? (
            <div className="py-6 text-sm text-rose-700">{demoError}</div>
          ) : visibleRatedItems.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              No rated items yet.
            </div>
          ) : ratedViewMode === 'compact' ? (
            <div className="overflow-x-auto rounded-2xl border bg-white/95 shadow-sm">
              <div className="min-w-[1360px] divide-y divide-slate-200 p-2">
                <div className="grid grid-cols-[96px_260px_1fr_80px_100px_140px_120px_160px_120px] items-start gap-3 px-2 pb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span />
                  <span>Title</span>
                  <span>Synopsis</span>
                  <span>Year</span>
                  <span>Runtime</span>
                  <span>Episode</span>
                  <span>Status</span>
                  <span>Rating</span>
                  <span>Date</span>
                </div>
                {visibleRatedItems.map((item) => {
                  const href = `/media/${buildMediaRouteId({
                    provider: item.provider,
                    providerId: item.providerId,
                    type: item.type,
                  })}`

                  return (
                    <MediaListItem
                      key={`${item.type}-${item.providerId}-${item.updatedAt}`}
                      viewMode="compact"
                      href={href}
                      title={item.title}
                      type={item.type}
                      posterUrl={item.coverUrl}
                      synopsis={item.description ?? null}
                      year={item.year ?? undefined}
                      runtimeMinutes={item.durationMinutes ?? undefined}
                      episodeCount={item.episodeCount ?? null}
                      episodeProgress={item.episodeProgress ?? null}
                      genres={item.genres ?? undefined}
                      directors={item.directors ?? undefined}
                      writers={item.writers ?? undefined}
                      cast={item.cast ?? undefined}
                      status={item.status}
                      rating={item.rating}
                      note={item.note}
                      entryDateLabel="Rated"
                      entryDateIso={item.firstRatedAt ?? item.updatedAt}
                      onChangeStatus={async (next) => {
                        if (!user) {
                          await persistRatedPatch(item, { status: next })
                          return
                        }
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
                      onChangeEpisodeProgress={(next) =>
                        handleEpisodeProgressUpdate(item, next)
                      }
                      onChangeRating={async (next) => {
                        if (!user) {
                          await persistRatedPatch(item, { rating: next })
                          return
                        }
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
                        if (!user) {
                          await persistRatedPatch(item, { note: next })
                          return
                        }
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
                  )
                })}
              </div>
            </div>
          ) : ratedViewMode === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {visibleRatedItems.map((item) => {
                const href = `/media/${buildMediaRouteId({
                  provider: item.provider,
                  providerId: item.providerId,
                  type: item.type,
                })}`

                return (
                  <MediaListItem
                    key={`${item.type}-${item.providerId}-${item.updatedAt}`}
                    viewMode="grid"
                    href={href}
                    title={item.title}
                    type={item.type}
                    posterUrl={item.coverUrl}
                    synopsis={item.description ?? null}
                    year={item.year ?? undefined}
                    runtimeMinutes={item.durationMinutes ?? undefined}
                    episodeCount={item.episodeCount ?? null}
                    episodeProgress={item.episodeProgress ?? null}
                    genres={item.genres ?? undefined}
                    directors={item.directors ?? undefined}
                    writers={item.writers ?? undefined}
                    cast={item.cast ?? undefined}
                    status={item.status}
                    rating={item.rating}
                    note={item.note}
                    entryDateLabel="Rated"
                    entryDateIso={item.firstRatedAt ?? item.updatedAt}
                    onChangeStatus={async (next) => {
                      if (!user) {
                        await persistRatedPatch(item, { status: next })
                        return
                      }
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
                    onChangeEpisodeProgress={(next) =>
                      handleEpisodeProgressUpdate(item, next)
                    }
                    onChangeRating={async (next) => {
                      if (!user) {
                        await persistRatedPatch(item, { rating: next })
                        return
                      }
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
                      if (!user) {
                        await persistRatedPatch(item, { note: next })
                        return
                      }
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
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRatedItems.map((item) => {
                const href = `/media/${buildMediaRouteId({
                  provider: item.provider,
                  providerId: item.providerId,
                  type: item.type,
                })}`

                return (
                  <MediaListItem
                    key={`${item.type}-${item.providerId}-${item.updatedAt}`}
                    viewMode="detailed"
                    href={href}
                    title={item.title}
                    type={item.type}
                    posterUrl={item.coverUrl}
                    synopsis={item.description ?? null}
                    year={item.year ?? undefined}
                    runtimeMinutes={item.durationMinutes ?? undefined}
                    episodeCount={item.episodeCount ?? null}
                    episodeProgress={item.episodeProgress ?? null}
                    genres={item.genres ?? undefined}
                    directors={item.directors ?? undefined}
                    writers={item.writers ?? undefined}
                    cast={item.cast ?? undefined}
                    status={item.status}
                    rating={item.rating}
                    note={item.note}
                    entryDateLabel="Rated"
                    entryDateIso={item.firstRatedAt ?? item.updatedAt}
                    onChangeStatus={async (next) => {
                      if (!user) {
                        await persistRatedPatch(item, { status: next })
                        return
                      }
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
                    onChangeEpisodeProgress={(next) =>
                      handleEpisodeProgressUpdate(item, next)
                    }
                    onChangeRating={async (next) => {
                      if (!user) {
                        await persistRatedPatch(item, { rating: next })
                        return
                      }
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
                      if (!user) {
                        await persistRatedPatch(item, { note: next })
                        return
                      }
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
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
