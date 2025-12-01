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
import { mockEntries } from '@/mocks'
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
  const entry = mockEntries[0]

  const [media, setMedia] = useState<Media | null>(null)
  const [status, setStatus] = useState<EntryStatus>(entry?.status ?? 'Planning')
  const [rating, setRating] = useState<number>(entry?.rating ?? 0)
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                  mediaType={media.type}
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

              <Button className="w-full">Save Changes</Button>
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

      {entry && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">History</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Started:</span>{' '}
                {entry.startedAt
                  ? new Date(entry.startedAt).toLocaleDateString()
                  : 'Not started'}
              </div>
              <div>
                <span className="font-medium">Finished:</span>{' '}
                {entry.finishedAt
                  ? new Date(entry.finishedAt).toLocaleDateString()
                  : 'Not finished'}
              </div>
            </div>
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
