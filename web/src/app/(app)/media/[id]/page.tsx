'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ArrowUpDown,
  Building2,
  Clock,
  Music2,
  Tags,
  Tv,
  Users,
} from 'lucide-react'
import { RatingStars } from '@/components/RatingStars'
import { StatusSelect } from '@/components/StatusSelect'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  type: 'movie' | 'tv' | 'anime' | 'song' | 'album'
  sourceId: string
}

interface SpotifyAlbumTrack {
  id: string
  title: string
  durationMs: number | null
  explicit: boolean
  discNumber: number | null
  trackNumber: number | null
  previewUrl: string | null
  externalUrl: string | null
  artists: Array<{ id: string; name: string; imageUrl: string | null }>
}

type AlbumTrackSort = 'album' | 'title' | 'duration' | 'artist'

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
  const [albumTracks, setAlbumTracks] = useState<SpotifyAlbumTrack[]>([])
  const [trackSort, setTrackSort] = useState<AlbumTrackSort>('album')
  const [pendingAddMedia, setPendingAddMedia] = useState<Media | null>(null)
  const [trackRateOpen, setTrackRateOpen] = useState(false)
  const [trackToRate, setTrackToRate] = useState<Media | null>(null)
  const [trackRateStatus, setTrackRateStatus] =
    useState<EntryStatus>('Planning')
  const [trackRateRating, setTrackRateRating] = useState<number>(0)
  const [trackRateNotes, setTrackRateNotes] = useState('')
  const [trackRateSaving, setTrackRateSaving] = useState(false)

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

        const payload = (await response.json()) as {
          media: Media
          albumTracks?: SpotifyAlbumTrack[]
        }
        if (!controller.signal.aborted) {
          setMedia(payload.media)
          setAlbumTracks(
            Array.isArray(payload.albumTracks) ? payload.albumTracks : [],
          )
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }
        console.error(fetchError)
        if (!controller.signal.aborted) {
          setError('Unable to load media details. Please try again.')
          setAlbumTracks([])
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

  const isSpotifyAlbum =
    media?.provider === 'spotify' && media?.type === 'album'

  const sortedAlbumTracks = useMemo(() => {
    if (!isSpotifyAlbum) return []

    const next = [...albumTracks]
    next.sort((a, b) => {
      if (trackSort === 'album') {
        const discDiff = (a.discNumber ?? 0) - (b.discNumber ?? 0)
        if (discDiff !== 0) return discDiff
        const trackDiff = (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
        if (trackDiff !== 0) return trackDiff
        return a.title.localeCompare(b.title)
      }

      if (trackSort === 'duration') {
        const durationDiff = (b.durationMs ?? 0) - (a.durationMs ?? 0)
        if (durationDiff !== 0) return durationDiff
        return a.title.localeCompare(b.title)
      }

      if (trackSort === 'artist') {
        const artistA = a.artists[0]?.name ?? ''
        const artistB = b.artists[0]?.name ?? ''
        const artistDiff = artistA.localeCompare(artistB)
        if (artistDiff !== 0) return artistDiff
        return a.title.localeCompare(b.title)
      }

      return a.title.localeCompare(b.title)
    })

    return next
  }, [albumTracks, isSpotifyAlbum, trackSort])

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

  const cleanDescription = stripAniListDescription(media.description)

  const openAddToList = async (overrideMedia?: Media) => {
    if (!userId) {
      toast('Log in to add items to your list.')
      return
    }

    const targetMedia = overrideMedia ?? media
    if (!targetMedia?.provider || !targetMedia.providerId) {
      toast('This item cannot be added to a list yet.')
      return
    }

    try {
      setPendingAddMedia(targetMedia)
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

  const buildTrackMedia = (track: SpotifyAlbumTrack): Media | null => {
    if (!media) return null
    return {
      id: `spotify-track-${track.id}`,
      type: 'song',
      title: track.title,
      year: media.year,
      posterUrl: media.posterUrl,
      provider: 'spotify',
      providerId: `track-${track.id}`,
      description: media.description,
      durationMinutes:
        typeof track.durationMs === 'number'
          ? Math.max(0, Math.round(track.durationMs / 60000))
          : undefined,
      cast: track.artists.map((artist) => artist.name).filter(Boolean),
    }
  }

  const openTrackAdd = (track: SpotifyAlbumTrack) => {
    const trackMedia = buildTrackMedia(track)
    if (!trackMedia) {
      toast('Track data is still loading.')
      return
    }
    void openAddToList(trackMedia)
  }

  const openTrackRateDialog = (track: SpotifyAlbumTrack) => {
    if (!userId) {
      toast('Log in to rate tracks.')
      return
    }
    const trackMedia = buildTrackMedia(track)
    if (!trackMedia) {
      toast('Track data is still loading.')
      return
    }
    setTrackToRate(trackMedia)
    setTrackRateStatus('Planning')
    setTrackRateRating(0)
    setTrackRateNotes('')
    setTrackRateOpen(true)
  }

  const saveTrackRating = async () => {
    if (!userId || !trackToRate) return
    setTrackRateSaving(true)
    try {
      const response = await fetch('/api/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          media: trackToRate,
          entry: {
            status: trackRateStatus,
            rating: trackRateRating > 0 ? trackRateRating : null,
            note: trackRateNotes,
          },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to save rating.')
      }

      toast.success(`Saved rating for ${trackToRate.title}.`)
      setTrackRateOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Unable to save rating.',
      )
    } finally {
      setTrackRateSaving(false)
    }
  }

  const addToList = async (listId: string) => {
    const targetMedia = pendingAddMedia ?? media
    if (!userId || !targetMedia?.provider || !targetMedia.providerId) return
    setAddSavingListId(listId)
    try {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          media: {
            provider: targetMedia.provider,
            providerId: targetMedia.providerId,
            type: targetMedia.type,
            title: targetMedia.title,
            posterUrl: targetMedia.posterUrl,
            description: targetMedia.description,
            year: targetMedia.year,
            durationMinutes: targetMedia.durationMinutes,
            episodeCount: targetMedia.episodeCount,
            genres: targetMedia.genres,
            directors: targetMedia.directors,
            writers: targetMedia.writers,
            cast: targetMedia.cast,
          },
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to add to list.')
      }

      toast.success(
        `Added ${
          targetMedia.title
        } to "${lists.find((l) => l.id === listId)?.title ?? 'list'}".`,
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
            description: cleanDescription,
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

  const openExternalUrl = (url: string | null | undefined) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const statusMediaType =
    media.type === 'tv' ||
    media.type === 'anime' ||
    media.type === 'game' ||
    media.type === 'song' ||
    media.type === 'album'
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

  const castLabel =
    media.type === 'album' || media.type === 'song' ? 'Artists' : 'Cast'

  const creditsTitle =
    media.type === 'album' || media.type === 'song'
      ? 'Artists'
      : 'Credits & Creative Team'

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
                  {(media.type === 'tv' || media.type === 'anime') &&
                  media.episodeCount ? (
                    <Badge variant="outline">{media.episodeCount} eps</Badge>
                  ) : null}
                  {media.contentRating ? (
                    <Badge variant="outline" className="tracking-wide">
                      {media.contentRating}
                    </Badge>
                  ) : null}
                  {media.provider === 'spotify' && media.externalUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 rounded-full bg-[#1DB954] px-3 text-xs font-semibold text-white hover:bg-[#1AA34A]"
                      onClick={() => openExternalUrl(media.externalUrl)}
                    >
                      <SpotifyIcon className="h-4 w-4" />
                      Spotify
                    </Button>
                  ) : null}
                </div>
              </div>

              {(media.type === 'album' || media.type === 'song') &&
              (media.cast ?? []).length > 0 ? (
                <p className="text-sm text-foreground/75">
                  {media.cast?.join(', ')}
                </p>
              ) : null}

              {cleanDescription ? (
                <p className="max-w-3xl text-base leading-relaxed text-foreground/85">
                  {cleanDescription}
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
          {isSpotifyAlbum ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Tracks</h2>
                    <div className="text-sm text-muted-foreground">
                      {albumTracks.length > 0
                        ? `${albumTracks.length} tracks`
                        : 'No tracks found.'}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Sort tracks</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={trackSort}
                        onValueChange={(value) =>
                          setTrackSort(value as AlbumTrackSort)
                        }
                      >
                        <DropdownMenuRadioItem value="album">
                          Album order
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="title">
                          Title (A–Z)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="artist">
                          Artist (A–Z)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="duration">
                          Duration (longest)
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedAlbumTracks.length > 0 ? (
                  sortedAlbumTracks.map((track) => (
                    <AlbumTrackCard
                      key={track.id}
                      track={track}
                      coverUrl={media.posterUrl ?? null}
                      onAdd={() => openTrackAdd(track)}
                      onRate={() => openTrackRateDialog(track)}
                      onOpenSpotify={() => openExternalUrl(track.externalUrl)}
                    />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Tracks aren’t available for this album yet.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Key Details</h2>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {media.type === 'tv'
                      ? 'Episode length'
                      : media.type === 'anime'
                        ? 'Episodes'
                        : 'Runtime'}
                  </div>
                  <div className="text-base font-medium">
                    {media.type === 'anime'
                      ? media.episodeCount
                        ? `${media.episodeCount} episodes`
                        : '—'
                      : media.durationMinutes
                        ? `${media.durationMinutes} minutes`
                        : '—'}
                  </div>
                </div>
              </div>

              {media.type === 'album' ? (
                <div className="flex items-start gap-3">
                  <Music2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tracks
                    </div>
                    <div className="text-base font-medium">
                      {albumTracks.length > 0
                        ? `${albumTracks.length} tracks`
                        : 'ƒ?"'}
                    </div>
                  </div>
                </div>
              ) : null}

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
                {creditsTitle}
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
                    {castLabel}
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
                  onClick={() => void openAddToList()}
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
            setPendingAddMedia(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Add to list: ${
              pendingAddMedia?.title ?? media.title
            }`}</DialogTitle>
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
        open={trackRateOpen}
        onOpenChange={(open) => {
          setTrackRateOpen(open)
          if (!open) {
            setTrackToRate(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Rate ${trackToRate?.title ?? 'track'}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <StatusSelect
                value={trackRateStatus}
                onChange={setTrackRateStatus}
                mediaType="song"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Rating</label>
              <RatingStars
                rating={trackRateRating}
                interactive
                onRatingChange={setTrackRateRating}
                maxRating={10}
                size="lg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <Textarea
                value={trackRateNotes}
                onChange={(event) => setTrackRateNotes(event.target.value)}
                placeholder="Add your thoughts..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTrackRateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveTrackRating}
              disabled={trackRateSaving}
            >
              {trackRateSaving ? 'Saving…' : 'Save rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.315c-.222.368-.699.485-1.067.263-2.923-1.785-6.604-2.189-10.946-1.202-.42.095-.84-.168-.936-.588-.095-.42.168-.84.588-.936 4.742-1.078 8.804-.62 12.141 1.404.368.222.485.699.263 1.059zm1.525-3.394c-.28.454-.874.599-1.328.319-3.346-2.057-8.45-2.651-12.404-1.45-.506.153-1.039-.133-1.192-.639-.153-.506.133-1.039.639-1.192 4.521-1.371 10.137-.707 13.97 1.63.454.28.599.874.319 1.332zm.131-3.535C15.446 7.95 8.116 7.72 4.458 8.869c-.586.184-1.21-.143-1.394-.729-.184-.586.143-1.21.729-1.394 4.199-1.318 11.18-1.063 15.617 1.59.544.326.721 1.031.395 1.575-.325.544-1.03.721-1.575.395z" />
    </svg>
  )
}

function formatDurationMs(durationMs: number | null): string | null {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs))
    return null
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function AlbumTrackCard({
  track,
  coverUrl,
  onAdd,
  onRate,
  onOpenSpotify,
}: {
  track: SpotifyAlbumTrack
  coverUrl: string | null
  onAdd: () => void
  onRate: () => void
  onOpenSpotify: () => void
}) {
  const durationLabel = formatDurationMs(track.durationMs)
  const artistLine = track.artists.map((artist) => artist.name).join(', ')
  const trackIndexLabel =
    track.discNumber && track.trackNumber
      ? `D${track.discNumber} · ${track.trackNumber}`
      : track.trackNumber
        ? `${track.trackNumber}`
        : null

  return (
    <article className="group relative flex items-center gap-3 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40 sm:gap-4 sm:p-4">
      <div className="shrink-0">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`${track.title} artwork`}
            width={64}
            height={64}
            className="h-14 w-14 rounded-lg border object-cover shadow-sm sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-slate-50 text-indigo-600 shadow-sm sm:h-16 sm:w-16">
            <Music2 className="h-7 w-7 opacity-50" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="space-y-0.5">
          <h3 className="truncate text-base font-semibold leading-tight">
            {track.title}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{artistLine}</p>
          <p className="min-h-4 truncate text-xs text-muted-foreground/80">
            {trackIndexLabel ?? '\u00A0'}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
            Track
          </Badge>
          {durationLabel && (
            <Badge
              variant="outline"
              className="rounded-full border-dashed px-2 py-0 text-xs"
            >
              {durationLabel}
            </Badge>
          )}
          {track.explicit && (
            <Badge
              variant="outline"
              className="rounded-full border-rose-200 px-2 py-0 text-xs text-rose-600"
            >
              Explicit
            </Badge>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full px-3 text-xs font-semibold"
            onClick={(event) => {
              event.stopPropagation()
              onRate()
            }}
          >
            Rate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="rounded-full px-3 text-xs font-semibold"
            onClick={(event) => {
              event.stopPropagation()
              onAdd()
            }}
          >
            + Add to list
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 rounded-full bg-[#1DB954] text-white hover:bg-[#1AA34A] disabled:bg-[#1DB954]/60 disabled:text-white/80"
            aria-label="Open in Spotify"
            disabled={!track.externalUrl}
            onClick={(event) => {
              event.stopPropagation()
              onOpenSpotify()
            }}
          >
            <SpotifyIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
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

  if (provider === 'spotify') {
    if (maybeType !== 'track' && maybeType !== 'album') {
      return null
    }
    const sourceId = parts.slice(1).join('-')
    if (!sourceId) return null
    return {
      provider,
      type: maybeType === 'album' ? 'album' : 'song',
      sourceId,
    }
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

function stripAniListDescription(
  input: string | null | undefined,
): string | undefined {
  if (!input) return undefined

  const withoutTags = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, '')
    .replace(/<\/?[^>]+>/g, '')

  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")

  const trimmed = decoded.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
