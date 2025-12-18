'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Image from 'next/image'
import { Building2, Clock, Tags, Tv, Users } from 'lucide-react'
import { RatingStars } from '@/components/RatingStars'
import { StatusSelect } from '@/components/StatusSelect'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { EntryStatus, Media } from '@/types'

interface ParsedMediaId {
  provider: string
  type: 'movie' | 'tv' | 'anime'
  sourceId: string
}

export default function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const userId = user?.email ?? null

  const [media, setMedia] = useState<Media | null>(null)
  const [status, setStatus] = useState<EntryStatus>('Planning')
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [lists, setLists] = useState<
    Array<{ id: string; title: string; description: string | null }>
  >([])
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [createAndAddSaving, setCreateAndAddSaving] = useState(false)
  const [addSavingListId, setAddSavingListId] = useState<string | null>(null)

  useEffect(() => {
    const parsed = parseMediaRouteId(id)

    if (!parsed) {
      setError('Unsupported media identifier.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    const loadMedia = async () => {
      try {
        const response = await fetch(
          `/api/media/${parsed.provider}/${parsed.sourceId}?type=${parsed.type}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Failed to load media details.')
        }

        const payload = (await response.json()) as { media: Media }
        if (!controller.signal.aborted) {
          setMedia(payload.media)
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }
        console.error(fetchError)
        if (!controller.signal.aborted) {
          setError('Unable to load media details. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadMedia()

    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!userId) {
      setStatus('Planning')
      setRating(0)
      setNotes('')
      return
    }

    const parsed = parseMediaRouteId(id)
    if (!parsed) {
      return
    }

    const controller = new AbortController()

    const loadEntry = async () => {
      try {
        const response = await fetch(
          `/api/list?provider=${parsed.provider}&sourceId=${parsed.sourceId}&userId=${encodeURIComponent(
            userId,
          )}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Failed to load saved entry.')
        }

        const payload = (await response.json()) as {
          entry: { status?: EntryStatus; rating?: number; note?: string } | null
        }

        if (controller.signal.aborted) {
          return
        }

        if (payload.entry) {
          setStatus(payload.entry.status ?? 'Planning')
          setRating(payload.entry.rating ?? 0)
          setNotes(payload.entry.note ?? '')
        } else {
          setStatus('Planning')
          setRating(0)
          setNotes('')
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          console.error(fetchError)
        }
      }
    }

    loadEntry()

    return () => controller.abort()
  }, [id, userId])

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 text-sm text-muted-foreground">
        Fetching media details…
      </div>
    )
  }

  if (error || !media) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-6 text-sm text-rose-700">
        {error ?? 'Media not found.'}
      </div>
    )
  }

  const openAddToList = async () => {
    if (!userId) {
      toast('Log in to add items to your list.')
      return
    }

    if (!media.provider || !media.providerId) {
      toast('This item cannot be added to a list yet.')
      return
    }

    try {
      setAddOpen(true)
      setListsLoading(true)
      setListsError(null)

      const response = await fetch(
        `/api/lists?userId=${encodeURIComponent(userId)}`,
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to load lists.')
      }

      const payload = (await response.json()) as {
        lists: Array<{ id: string; title: string; description: string | null }>
      }
      setLists(payload.lists ?? [])
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Unable to load lists.',
      )
      setListsError(error instanceof Error ? error.message : 'Unable to load.')
    } finally {
      setListsLoading(false)
    }
  }

  const addToList = async (listId: string) => {
    if (!userId || !media.provider || !media.providerId) return
    setAddSavingListId(listId)
    try {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          media: {
            provider: media.provider,
            providerId: media.providerId,
            type: media.type,
            title: media.title,
            posterUrl: media.posterUrl,
            description: media.description,
            year: media.year,
            durationMinutes: media.durationMinutes,
            episodeCount: media.episodeCount,
            genres: media.genres,
            directors: media.directors,
            writers: media.writers,
            cast: media.cast,
          },
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to add to list.')
      }

      toast.success(
        `Added ${media.title} to "${lists.find((l) => l.id === listId)?.title ?? 'list'}".`,
      )
      setAddOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Unable to add.')
    } finally {
      setAddSavingListId(null)
    }
  }

  const createListAndAdd = async () => {
    if (!userId || !media) return
    const title = newListTitle.trim()
    if (!title) {
      toast('List title is required.')
      return
    }

    setCreateAndAddSaving(true)
    try {
      const createRes = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          description: newListDescription.trim(),
        }),
      })
      if (!createRes.ok) {
        const payload = await createRes.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to create list.')
      }

      const createPayload = (await createRes.json()) as {
        list: { id: string; title: string; description: string | null }
      }

      const listId = createPayload.list.id
      await addToList(listId)
      setNewListTitle('')
      setNewListDescription('')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Unable to create.')
    } finally {
      setCreateAndAddSaving(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!userId) {
      toast('Log in to save entries.')
      return
    }

    if (!media) {
      toast('Media details are still loading.')
      return
    }

    const parsed = parseMediaRouteId(id)
    if (!parsed) {
      toast('Unsupported media identifier.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          media: {
            provider: media.provider,
            providerId: media.providerId,
            type: media.type,
            title: media.title,
            posterUrl: media.posterUrl,
            description: media.description,
            year: media.year,
            durationMinutes: media.durationMinutes,
            episodeCount: media.episodeCount,
            genres: media.genres,
          },
          entry: {
            status,
            rating,
            note: notes,
          },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to save entry.')
      }

      toast.success('Entry saved to your list.')
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Unable to save entry.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const statusMediaType =
    media.type === 'tv' ||
    media.type === 'anime' ||
    media.type === 'game' ||
    media.type === 'song'
      ? media.type
      : 'movie'

  const castMembers = (media.castMembers ?? []).filter(
    (
      member,
    ): member is {
      id?: string
      name: string
      role?: string
      imageUrl?: string
    } => Boolean(member?.name),
  )
  const castFallback = (media.cast ?? []).filter(Boolean).map((name) => ({
    id: undefined,
    name,
    role: undefined as string | undefined,
    imageUrl: undefined,
  }))
  const cast = (castMembers.length > 0 ? castMembers : castFallback).slice(
    0,
    60,
  )

  const galleryImages = (media.additionalImages ?? [])
    .filter(Boolean)
    .slice(0, 8)

  const creatorCredits =
    (media.creatorCredits ?? [])
      .filter((credit) => Boolean(credit?.name))
      .map((credit) => ({
        id: credit.id,
        name: credit.name,
        role: credit.role,
        imageUrl: credit.imageUrl,
      })) ?? []

  const writerCredits =
    (media.writerCredits ?? [])
      .filter((credit) => Boolean(credit?.name))
      .map((credit) => ({
        id: credit.id,
        name: credit.name,
        role: credit.role,
        imageUrl: credit.imageUrl,
      })) ?? []

  const producerCredits =
    (media.producerCredits ?? [])
      .filter((credit) => Boolean(credit?.name))
      .map((credit) => ({
        id: credit.id,
        name: credit.name,
        role: credit.role,
        imageUrl: credit.imageUrl,
      })) ?? []

  const creatorFallback = (media.directors ?? [])
    .filter(Boolean)
    .map((name) => ({
      id: undefined,
      name,
      role: media.type === 'movie' ? 'Director' : 'Creator',
      imageUrl: undefined,
    }))

  const writerFallback = (media.writers ?? []).filter(Boolean).map((name) => ({
    id: undefined,
    name,
    role: 'Writer',
    imageUrl: undefined,
  }))

  const creators = (
    creatorCredits.length > 0 ? creatorCredits : creatorFallback
  ).slice(0, 12)
  const writers = (
    writerCredits.length > 0 ? writerCredits : writerFallback
  ).slice(0, 30)
  const producers = producerCredits.slice(0, 30)

  return (
    <div className="space-y-8">
      {/* Hero section (backdrop + header content on top) */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-6 w-screen overflow-hidden">
        {/* Backdrop background */}
        {media.backdropUrl ? (
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                maskImage:
                  'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
              }}
            >
              <Image
                src={media.backdropUrl}
                alt={`${media.title} backdrop`}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>

            {/* Light wash so text stays readable; fades out into page background */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/25 to-transparent" />
          </div>
        ) : null}

        {/* Content aligned to main container */}
        <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-12">
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border bg-card shadow-sm aspect-[2/3] md:mx-0">
              {media.posterUrl ? (
                <Image
                  src={media.posterUrl}
                  alt={media.title}
                  fill
                  className="object-cover"
                  sizes="300px"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No poster</span>
                </div>
              )}
            </div>

            <div
              className={
                media.backdropUrl
                  ? 'flex flex-col justify-center gap-4 rounded-3xl bg-background/6 p-6 backdrop-blur-md'
                  : 'flex flex-col justify-center gap-4'
              }
            >
              <div>
                <h1 className="text-4xl font-bold tracking-tight drop-shadow-md sm:text-5xl">
                  {media.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground/75">
                  <Badge variant="secondary" className="uppercase">
                    {media.type}
                  </Badge>
                  {media.year ? (
                    <Badge variant="outline">{media.year}</Badge>
                  ) : null}
                  {media.contentRating ? (
                    <Badge variant="outline" className="tracking-wide">
                      {media.contentRating}
                    </Badge>
                  ) : null}
                  {media.type === 'tv' && media.episodeCount ? (
                    <span>• {media.episodeCount} eps</span>
                  ) : null}
                </div>
              </div>

              {media.description ? (
                <p className="max-w-3xl text-base leading-relaxed text-foreground/85">
                  {media.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* Left column */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Key Details</h2>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {media.type === 'tv' ? 'Episode length' : 'Runtime'}
                  </div>
                  <div className="text-base font-medium">
                    {media.durationMinutes
                      ? `${media.durationMinutes} minutes`
                      : '—'}
                  </div>
                </div>
              </div>

              {media.type === 'tv' && media.episodeCount ? (
                <div className="flex items-start gap-3">
                  <Tv className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Episodes
                    </div>
                    <div className="text-base font-medium">
                      {media.episodeCount} episodes
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-3">
                <Tags className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Genres
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(media.genres ?? []).length > 0 ? (
                      (media.genres ?? []).map((g) => (
                        <Badge key={g} variant="outline">
                          {g}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {media.type === 'tv' ? 'Networks' : 'Studios'}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {(media.studios ?? []).length > 0
                      ? (media.studios ?? []).join(', ')
                      : '—'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5 text-muted-foreground" />
                Credits & Creative Team
              </h2>
            </CardHeader>
            <CardContent className="space-y-6">
              {creators.length > 0 ||
              writers.length > 0 ||
              producers.length > 0 ? (
                <div className="space-y-6">
                  {creators.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {media.type === 'movie' ? 'Director' : 'Creator'}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {creators.map((person) => (
                          <div
                            key={`${person.id ?? person.name}-${person.role ?? ''}`}
                            className="flex items-center gap-3 rounded-full border bg-card/60 px-3 py-2"
                          >
                            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-primary">
                              {person.imageUrl ? (
                                <Image
                                  src={person.imageUrl}
                                  alt={person.name}
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-primary-foreground">
                                  <span className="text-sm font-semibold">
                                    {person.name.slice(0, 1).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="max-w-[220px] truncate text-sm font-medium">
                                {person.name}
                              </div>
                              <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                                {person.role ?? '\u00A0'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {writers.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {media.type === 'anime'
                          ? 'Writers / Original Author'
                          : 'Writers'}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {writers.map((person) => (
                          <div
                            key={`${person.id ?? person.name}-${person.role ?? ''}`}
                            className="flex items-center gap-3 rounded-full border bg-card/60 px-3 py-2"
                          >
                            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-primary">
                              {person.imageUrl ? (
                                <Image
                                  src={person.imageUrl}
                                  alt={person.name}
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-primary-foreground">
                                  <span className="text-sm font-semibold">
                                    {person.name.slice(0, 1).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="max-w-[220px] truncate text-sm font-medium">
                                {person.name}
                              </div>
                              <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                                {person.role ?? 'Writer'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {producers.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Producers
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {producers.map((person) => (
                          <div
                            key={`${person.id ?? person.name}-${person.role ?? ''}`}
                            className="flex items-center gap-3 rounded-full border bg-card/60 px-3 py-2"
                          >
                            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-primary">
                              {person.imageUrl ? (
                                <Image
                                  src={person.imageUrl}
                                  alt={person.name}
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-primary-foreground">
                                  <span className="text-sm font-semibold">
                                    {person.name.slice(0, 1).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="max-w-[220px] truncate text-sm font-medium">
                                {person.name}
                              </div>
                              <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                                {person.role ?? '\u00A0'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {cast.length > 0 ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cast
                  </div>
                  <div className="mt-3 max-h-[560px] overflow-y-auto pr-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {cast.map((member) => (
                        <div
                          key={`${member.id ?? member.name}-${member.role ?? ''}`}
                          className="flex items-start gap-3 rounded-2xl border bg-card/60 p-3"
                        >
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-primary">
                            {member.imageUrl ? (
                              <Image
                                src={member.imageUrl}
                                alt={member.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-primary-foreground">
                                <span className="text-sm font-semibold">
                                  {member.name.slice(0, 1).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {member.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {member.role || '\u00A0'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <div className="sticky top-24 space-y-8">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Your Entry</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Status
                  </label>
                  <StatusSelect
                    value={status}
                    onChange={setStatus}
                    mediaType={statusMediaType}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Rating
                  </label>
                  <RatingStars
                    rating={rating}
                    interactive
                    onRatingChange={setRating}
                    maxRating={10}
                    size="lg"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your thoughts..."
                    rows={4}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={openAddToList}
                  disabled={!user || isSaving}
                >
                  Add to list
                </Button>

                <Button
                  className="w-full"
                  onClick={handleSaveEntry}
                  disabled={isSaving}
                >
                  {isSaving
                    ? 'Saving…'
                    : user
                      ? 'Save Changes'
                      : 'Log in to save'}
                </Button>
                {!user ? (
                  <p className="text-xs text-muted-foreground">
                    Sign in to keep track of your progress.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {galleryImages.length > 0 ? (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Photos & Backdrops</h2>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {galleryImages.map((src, index) => (
                      <button
                        key={`${src}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(src)}
                        className="relative aspect-video overflow-hidden rounded-2xl border bg-muted transition hover:ring-2 hover:ring-ring"
                        aria-label={`Open image ${index + 1}`}
                      >
                        <Image
                          src={src}
                          alt={`${media.title} image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setListsError(null)
            setNewListTitle('')
            setNewListDescription('')
            setAddSavingListId(null)
            setCreateAndAddSaving(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Add to list: ${media.title}`}</DialogTitle>
          </DialogHeader>

          {listsLoading ? (
            <div className="text-sm text-muted-foreground">Loading lists…</div>
          ) : listsError ? (
            <div className="text-sm text-rose-700">{listsError}</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {lists.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    You don’t have any lists yet. Create one below.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {lists.map((list) => (
                      <Button
                        key={list.id}
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => addToList(list.id)}
                        disabled={
                          addSavingListId === list.id || createAndAddSaving
                        }
                      >
                        {addSavingListId === list.id ? 'Adding…' : list.title}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-3">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Create a new list</div>
                  <Input
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="List title"
                  />
                  <Textarea
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={3}
                  />
                  <Button
                    type="button"
                    onClick={createListAndAdd}
                    disabled={createAndAddSaving}
                    className="w-full"
                  >
                    {createAndAddSaving ? 'Creating…' : 'Create list & add'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedImage)}
        onOpenChange={(open) => {
          if (!open) setSelectedImage(null)
        }}
      >
        <DialogContent className="max-w-5xl p-2">
          <div className="relative h-[70vh] w-full overflow-hidden rounded-xl bg-muted">
            {selectedImage ? (
              <Image
                src={selectedImage}
                alt={media.title}
                fill
                className="object-contain"
                sizes="80vw"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function parseMediaRouteId(routeId: string): ParsedMediaId | null {
  const parts = routeId.split('-')
  if (parts.length < 2) {
    return null
  }

  const [provider, maybeType, maybeId] = parts
  if (!provider) {
    return null
  }

  if (provider === 'anilist') {
    if (maybeType !== 'anime' || !maybeId) {
      return null
    }
    return { provider, type: 'anime', sourceId: maybeId }
  }

  if (provider !== 'tmdb') {
    return null
  }

  if (maybeType === 'tv') {
    if (!maybeId) {
      return null
    }
    return { provider, type: 'tv', sourceId: maybeId }
  }

  if (maybeType === 'movie') {
    const sourceId = parts.slice(2).join('-')
    if (!sourceId) {
      return null
    }
    return { provider, type: 'movie', sourceId }
  }

  return { provider, type: 'movie', sourceId: parts.slice(1).join('-') }
}
