'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Image from 'next/image'
import { RatingStars } from '@/components/RatingStars'
import { StatusSelect } from '@/components/StatusSelect'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { EntryStatus, Media } from '@/types'

interface ParsedMediaId {
  provider: string
  type: 'movie' | 'tv'
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

  const metadataCards = [
    media.durationMinutes && {
      label: media.type === 'tv' ? 'Episode length' : 'Duration',
      value: formatDuration(media.durationMinutes),
    },
    media.contentRating && {
      label: 'Rating',
      value: media.contentRating,
    },
    media.genres?.length && {
      label: 'Genres',
      value: media.genres.join(', '),
    },
    media.studios?.length && {
      label: media.type === 'tv' ? 'Networks' : 'Studios',
      value: media.studios.join(', '),
    },
  ].filter(Boolean) as { label: string; value: string }[]

  const creativeSections = [
    media.directors?.length && {
      label: 'Directors / Creators',
      people: media.directors,
    },
    media.writers?.length && {
      label: 'Authors / Writers',
      people: media.writers,
    },
    media.cast?.length && { label: 'Cast', people: media.cast },
  ].filter(Boolean) as { label: string; people: string[] }[]

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
    media.type === 'tv' || media.type === 'anime' || media.type === 'game'
      ? media.type
      : 'movie'

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl">
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

        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{media.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {media.year && (
                <span className="text-muted-foreground">{media.year}</span>
              )}
              <Badge className="uppercase">{media.type}</Badge>
              {media.contentRating && (
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {media.contentRating}
                </Badge>
              )}
            </div>
          </div>

          {media.description && (
            <p className="text-base text-muted-foreground">
              {media.description}
            </p>
          )}

          {metadataCards.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {metadataCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-100 bg-white/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-lg font-semibold">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Your Entry</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <StatusSelect
                  value={status}
                  onChange={setStatus}
                  mediaType={statusMediaType}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Rating</label>
                <RatingStars
                  rating={rating}
                  interactive
                  onRatingChange={setRating}
                  maxRating={10}
                  size="lg"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your thoughts..."
                  rows={4}
                />
              </div>

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
              {!user && (
                <p className="text-xs text-muted-foreground">
                  Sign in to keep track of your progress.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {creativeSections.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Creative Team</h2>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {creativeSections.map((section) => (
              <div key={section.label} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {section.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {section.people.map((person) => (
                    <Badge key={person} variant="outline">
                      {person}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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

function formatDuration(minutes?: number) {
  if (!minutes) {
    return '—'
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) {
    return `${remainingMinutes} min`
  }

  return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`
}
