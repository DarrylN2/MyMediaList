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
import { mockMedia, mockEntries } from '@/mocks'
import type { EntryStatus } from '@/types'

export default function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [status, setStatus] = useState<EntryStatus>('Planning')
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')

  // In real app, fetch media and entry by ID
  const media = mockMedia[0]
  const entry = mockEntries[0]

  if (!media) {
    return <div>Media not found</div>
  }

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

        <div className="space-y-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{media.title}</h1>
            <div className="flex items-center gap-2">
              {media.year && (
                <span className="text-muted-foreground">{media.year}</span>
              )}
              <Badge>{media.type}</Badge>
            </div>
          </div>

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
