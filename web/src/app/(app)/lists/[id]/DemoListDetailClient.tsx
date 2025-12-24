'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List, Pencil, Table as TableIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MediaListItem } from '@/components/MediaListItem'
import { buildMediaRouteId } from '@/lib/media-route'
import {
  ensureDemoState,
  removeDemoList,
  removeDemoListItem,
  updateDemoEntry,
  updateDemoListMeta,
  type DemoList,
  type DemoListItem,
} from '@/data/demoStore'
import type { EntryStatus, MediaType } from '@/types'

type ViewMode = 'detailed' | 'grid' | 'compact'
type SortOption = 'addedAt' | 'title' | 'type'

export function DemoListDetailClient({ listId }: { listId: string }) {
  const router = useRouter()
  const [list, setList] = useState<DemoList | null>(null)
  const [items, setItems] = useState<DemoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [sortBy, setSortBy] = useState<SortOption>('addedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all')
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    ensureDemoState()
      .then((state) => {
        if (!active) return
        const found = state.lists.find((entry) => entry.id === listId) ?? null
        if (!found) {
          setError('List not found.')
          setList(null)
          setItems([])
          return
        }
        setList(found)
        setItems(found.items)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error ? err.message : 'Unable to load demo list.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [listId])

  const processedItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const normalized = items.map((item) => ({
      createdAt: item.createdAt,
      media: item.media,
      routeId: buildMediaRouteId({
        provider: item.media.provider,
        providerId: item.media.providerId,
        type: item.media.type,
      }),
      entry: item.entry,
    }))

    const filtered = normalized.filter((entry) => {
      if (typeFilter !== 'all' && entry.media.type !== typeFilter) return false
      if (!q) return true
      return (
        entry.media.title.toLowerCase().includes(q) ||
        (entry.media.description?.toLowerCase().includes(q) ?? false)
      )
    })

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
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
  }, [items, query, sortBy, sortDirection, typeFilter])

  const applyNextState = (nextState: ReturnType<typeof updateDemoEntry>) => {
    if (!nextState) return
    const nextList =
      nextState.lists.find((entry) => entry.id === listId) ?? null
    if (!nextList) {
      setList(null)
      setItems([])
      return
    }
    setList(nextList)
    setItems(nextList.items)
  }

  const handleUpdateList = async () => {
    if (!list || editSaving) return
    const title = editTitle.trim()
    if (!title) {
      setEditError('Title is required.')
      return
    }
    setEditSaving(true)
    setEditError(null)

    const nextState = updateDemoListMeta(listId, {
      title,
      description: editDescription.trim() || '',
    })
    applyNextState(nextState)
    setEditOpen(false)
    setEditSaving(false)
  }

  const handleDeleteList = async () => {
    if (deleteSaving) return
    setDeleteSaving(true)
    setDeleteError(null)
    const nextState = removeDemoList(listId)
    if (!nextState) {
      setDeleteError('Unable to delete list.')
      setDeleteSaving(false)
      return
    }
    setDeleteSaving(false)
    setDeleteOpen(false)
    setEditOpen(false)
    router.push('/lists')
  }

  const handleRemoveEntry = async (entry: (typeof processedItems)[number]) => {
    if (removingMediaId) return
    setRemovingMediaId(entry.media.id)
    const nextState = removeDemoListItem(listId, {
      provider: entry.media.provider,
      providerId: entry.media.providerId,
      type: entry.media.type,
    })
    applyNextState(nextState)
    setRemovingMediaId(null)
  }

  const handleEpisodeProgressUpdate = async (
    entry: (typeof processedItems)[number],
    next: number | null,
  ) => {
    const currentStatus = entry.entry?.status ?? 'Planning'
    const episodeCount = entry.media.episodeCount ?? null
    const clamp = (value: number) => {
      const rounded = Math.max(0, Math.round(value))
      return episodeCount != null ? Math.min(episodeCount, rounded) : rounded
    }

    let nextStatus = currentStatus
    let nextProgress = entry.entry?.episodeProgress ?? null
    let updateProgress = false

    if (currentStatus === 'Dropped') {
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

    const shouldPersist = updateProgress || nextStatus !== currentStatus
    if (!shouldPersist) return

    const nextState = updateDemoEntry(
      {
        provider: entry.media.provider,
        providerId: entry.media.providerId,
        type: entry.media.type,
        title: entry.media.title,
        posterUrl: entry.media.posterUrl ?? null,
        description: entry.media.description ?? null,
        year: entry.media.year ?? null,
        durationMinutes: entry.media.durationMinutes ?? null,
        episodeCount: entry.media.episodeCount ?? null,
        genres: entry.media.genres ?? null,
      },
      {
        status: nextStatus,
        ...(updateProgress ? { episodeProgress: nextProgress ?? null } : {}),
      },
    )
    applyNextState(nextState)
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
            {processedItems.map((entry) => (
              <MediaListItem
                key={`${entry.createdAt}-${entry.media.id}`}
                viewMode="compact"
                href={`/media/${entry.routeId}`}
                title={entry.media.title}
                type={entry.media.type}
                posterUrl={entry.media.posterUrl}
                synopsis={entry.media.description}
                year={entry.media.year ?? undefined}
                runtimeMinutes={entry.media.durationMinutes ?? undefined}
                episodeCount={entry.media.episodeCount ?? null}
                episodeProgress={entry.entry?.episodeProgress ?? null}
                genres={entry.media.genres ?? undefined}
                directors={entry.media.directors ?? undefined}
                writers={entry.media.writers ?? undefined}
                cast={entry.media.cast ?? undefined}
                status={entry.entry?.status ?? 'Planning'}
                rating={entry.entry?.rating ?? null}
                note={entry.entry?.note ?? null}
                entryDateLabel={entry.entry?.firstRatedAt ? 'Rated' : 'Added'}
                entryDateIso={entry.entry?.firstRatedAt ?? entry.createdAt}
                onChangeStatus={(next) => {
                  const nextState = updateDemoEntry(
                    {
                      provider: entry.media.provider,
                      providerId: entry.media.providerId,
                      type: entry.media.type,
                      title: entry.media.title,
                      posterUrl: entry.media.posterUrl ?? null,
                      description: entry.media.description ?? null,
                      year: entry.media.year ?? null,
                      durationMinutes: entry.media.durationMinutes ?? null,
                      episodeCount: entry.media.episodeCount ?? null,
                      genres: entry.media.genres ?? null,
                    },
                    { status: next },
                  )
                  applyNextState(nextState)
                }}
                onChangeEpisodeProgress={(next) =>
                  handleEpisodeProgressUpdate(entry, next)
                }
                onChangeRating={(next) => {
                  const nextState = updateDemoEntry(
                    {
                      provider: entry.media.provider,
                      providerId: entry.media.providerId,
                      type: entry.media.type,
                      title: entry.media.title,
                      posterUrl: entry.media.posterUrl ?? null,
                      description: entry.media.description ?? null,
                      year: entry.media.year ?? null,
                      durationMinutes: entry.media.durationMinutes ?? null,
                      episodeCount: entry.media.episodeCount ?? null,
                      genres: entry.media.genres ?? null,
                    },
                    { rating: next },
                  )
                  applyNextState(nextState)
                }}
                onSaveNote={(next) => {
                  const nextState = updateDemoEntry(
                    {
                      provider: entry.media.provider,
                      providerId: entry.media.providerId,
                      type: entry.media.type,
                      title: entry.media.title,
                      posterUrl: entry.media.posterUrl ?? null,
                      description: entry.media.description ?? null,
                      year: entry.media.year ?? null,
                      durationMinutes: entry.media.durationMinutes ?? null,
                      episodeCount: entry.media.episodeCount ?? null,
                      genres: entry.media.genres ?? null,
                    },
                    { note: next },
                  )
                  applyNextState(nextState)
                }}
                onRemove={() => handleRemoveEntry(entry)}
                busy={removingMediaId === entry.media.id}
              />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {processedItems.map((entry) => (
          <MediaListItem
            key={`${entry.createdAt}-${entry.media.id}`}
            viewMode={viewMode}
            href={`/media/${entry.routeId}`}
            title={entry.media.title}
            type={entry.media.type}
            posterUrl={entry.media.posterUrl}
            synopsis={entry.media.description}
            year={entry.media.year ?? undefined}
            runtimeMinutes={entry.media.durationMinutes ?? undefined}
            episodeCount={entry.media.episodeCount ?? null}
            episodeProgress={entry.entry?.episodeProgress ?? null}
            genres={entry.media.genres ?? undefined}
            directors={entry.media.directors ?? undefined}
            writers={entry.media.writers ?? undefined}
            cast={entry.media.cast ?? undefined}
            status={entry.entry?.status ?? 'Planning'}
            rating={entry.entry?.rating ?? null}
            note={entry.entry?.note ?? null}
            entryDateLabel={entry.entry?.firstRatedAt ? 'Rated' : 'Added'}
            entryDateIso={entry.entry?.firstRatedAt ?? entry.createdAt}
            onChangeStatus={(next) => {
              const nextState = updateDemoEntry(
                {
                  provider: entry.media.provider,
                  providerId: entry.media.providerId,
                  type: entry.media.type,
                  title: entry.media.title,
                  posterUrl: entry.media.posterUrl ?? null,
                  description: entry.media.description ?? null,
                  year: entry.media.year ?? null,
                  durationMinutes: entry.media.durationMinutes ?? null,
                  episodeCount: entry.media.episodeCount ?? null,
                  genres: entry.media.genres ?? null,
                },
                { status: next },
              )
              applyNextState(nextState)
            }}
            onChangeEpisodeProgress={(next) =>
              handleEpisodeProgressUpdate(entry, next)
            }
            onChangeRating={(next) => {
              const nextState = updateDemoEntry(
                {
                  provider: entry.media.provider,
                  providerId: entry.media.providerId,
                  type: entry.media.type,
                  title: entry.media.title,
                  posterUrl: entry.media.posterUrl ?? null,
                  description: entry.media.description ?? null,
                  year: entry.media.year ?? null,
                  durationMinutes: entry.media.durationMinutes ?? null,
                  episodeCount: entry.media.episodeCount ?? null,
                  genres: entry.media.genres ?? null,
                },
                { rating: next },
              )
              applyNextState(nextState)
            }}
            onSaveNote={(next) => {
              const nextState = updateDemoEntry(
                {
                  provider: entry.media.provider,
                  providerId: entry.media.providerId,
                  type: entry.media.type,
                  title: entry.media.title,
                  posterUrl: entry.media.posterUrl ?? null,
                  description: entry.media.description ?? null,
                  year: entry.media.year ?? null,
                  durationMinutes: entry.media.durationMinutes ?? null,
                  episodeCount: entry.media.episodeCount ?? null,
                  genres: entry.media.genres ?? null,
                },
                { note: next },
              )
              applyNextState(nextState)
            }}
            onRemove={() => handleRemoveEntry(entry)}
            busy={removingMediaId === entry.media.id}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 text-sm text-muted-foreground">
        Loading demo list...
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
              <Badge
                variant="outline"
                className="capitalize border-primary/30 bg-primary/10 text-primary"
              >
                Custom list
              </Badge>
              <Badge variant="outline">{items.length} items</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold">
              <span className="text-slate-900">{list.title}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditTitle(list.title)
                setEditDescription(list.description ?? '')
                setEditError(null)
                setDeleteError(null)
                setEditOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit list
            </Button>
            <Button variant="outline" asChild>
              <Link href="/lists">Back to lists</Link>
            </Button>
          </div>
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

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (open) {
            setEditTitle(list.title)
            setEditDescription(list.description ?? '')
          }
          setEditError(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit list</DialogTitle>
            <DialogDescription>
              Update the name or description for this list.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleUpdateList()
            }}
          >
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                placeholder="List title"
                aria-label="List title"
                required
              />
              <Textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Description (optional)"
                aria-label="List description"
                rows={3}
              />
              {editError ? (
                <p className="text-sm text-rose-700">{editError}</p>
              ) : null}
              {deleteError ? (
                <p className="text-sm text-rose-700">{deleteError}</p>
              ) : null}
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={editSaving || deleteSaving}
              >
                Delete list
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this list?</DialogTitle>
            <DialogDescription>
              This removes the list and all of its entries.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm text-rose-700">{deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteList}
              disabled={deleteSaving}
            >
              {deleteSaving ? 'Deleting...' : 'Delete list'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
