'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { MessageSquareText, Star } from 'lucide-react'

import type { EntryStatus, MediaType } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RatingStars } from '@/components/RatingStars'
import { StatusSelect } from '@/components/StatusSelect'

export type MediaListItemViewMode = 'detailed' | 'grid' | 'compact'
export type EntryDateLabel = 'Rated' | 'Added' | 'Logged'

export interface MediaListItemProps {
  viewMode: MediaListItemViewMode

  href: string
  title: string
  type: MediaType
  posterUrl?: string | null
  synopsis?: string | null
  year?: number

  status?: EntryStatus
  rating?: number | null
  note?: string | null
  entryDateLabel?: EntryDateLabel
  entryDateIso?: string | null

  onChangeStatus?: (next: EntryStatus) => Promise<void> | void
  onChangeRating?: (next: number) => Promise<void> | void
  onSaveNote?: (next: string) => Promise<void> | void

  busy?: boolean
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function MediaListItem({
  viewMode,
  href,
  title,
  type,
  posterUrl,
  synopsis,
  year,
  status,
  rating,
  note,
  entryDateLabel = 'Rated',
  entryDateIso,
  onChangeStatus,
  onChangeRating,
  onSaveNote,
  busy = false,
}: MediaListItemProps) {
  const [editingStatus, setEditingStatus] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState(note ?? '')
  const [compactRatingOpen, setCompactRatingOpen] = useState(false)

  useEffect(() => {
    if (!noteOpen) setNoteDraft(note ?? '')
  }, [note, noteOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingStatus(false)
    }
    if (editingStatus) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [editingStatus])

  const hasEntry = useMemo(
    () => status != null || rating != null || note != null,
    [status, rating, note],
  )

  const noteTooltipBody =
    note?.trim() != null && note.trim().length > 0
      ? note
      : 'No notes yet. Click to add.'

  const handleSaveNote = async () => {
    if (!onSaveNote) return
    await onSaveNote(noteDraft.trim())
    setNoteOpen(false)
  }

  const statusNode =
    status && onChangeStatus ? (
      editingStatus ? (
        <div className="min-w-[140px]">
          <StatusSelect
            value={status}
            mediaType={type}
            onChange={async (next) => {
              await onChangeStatus(next)
              setEditingStatus(false)
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditingStatus(true)}
          disabled={busy}
          className="text-left"
          aria-label="Edit status"
        >
          <Badge variant="outline" className="capitalize">
            {status}
          </Badge>
        </button>
      )
    ) : status ? (
      <Badge variant="outline" className="capitalize">
        {status}
      </Badge>
    ) : null

  const noteButton =
    onSaveNote || note ? (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setNoteOpen(true)}
              disabled={busy}
              aria-label="Open notes"
            >
              <MessageSquareText className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8} className="max-w-[360px]">
            <div className="space-y-2">
              <div className="text-xs font-medium">My notes</div>
              <div className="whitespace-pre-wrap text-sm">
                {noteTooltipBody}
              </div>
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteOpen(true)}
                >
                  {note?.trim() ? 'Edit' : 'Add note'}
                </Button>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notes</DialogTitle>
              <DialogDescription>
                These are your personal notes for this media.
              </DialogDescription>
            </DialogHeader>

            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Write your notes…"
              className="min-h-[140px]"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNoteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveNote}
                disabled={!onSaveNote || busy}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    ) : null

  const entryDate = (
    <span className="text-xs text-muted-foreground">
      {hasEntry ? `${entryDateLabel} ${formatShortDate(entryDateIso)}` : null}
    </span>
  )

  if (viewMode === 'compact') {
    return (
      <div className="grid grid-cols-[48px,1fr,90px,80px,120px,130px,120px,44px] items-center gap-3 py-3">
        <Link
          href={href}
          className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`${title} cover`}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="min-w-0">
          <Link
            href={href}
            className="font-medium leading-tight hover:underline"
          >
            <span className="line-clamp-1">{title}</span>
          </Link>
        </div>

        <div>
          <Badge variant="secondary" className="capitalize">
            {type}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground">{year ?? ''}</div>

        <div>{statusNode}</div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCompactRatingOpen((v) => !v)}
            disabled={busy || !onChangeRating}
            className="flex items-center gap-1 text-sm"
            aria-label="Edit rating"
          >
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold text-foreground">
              {(rating ?? '—') as string | number}/10
            </span>
          </button>

          {compactRatingOpen && onChangeRating ? (
            <select
              className="h-8 rounded-md border bg-white px-2 text-sm"
              value={rating ?? 0}
              onChange={async (e) => {
                const next = Number(e.target.value)
                if (!Number.isFinite(next) || next < 1 || next > 10) return
                await onChangeRating(next)
                setCompactRatingOpen(false)
              }}
              aria-label="Select rating"
            >
              <option value={0} disabled>
                —
              </option>
              {Array.from({ length: 10 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}/10
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div>{entryDate}</div>

        <div className="flex justify-end">{noteButton}</div>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <Link href={href} className="block">
          <div className="relative aspect-[2/3] w-full bg-muted">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                fill
                sizes="(max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            ) : null}
          </div>
        </Link>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={href} className="hover:underline">
                <h3 className="line-clamp-2 font-semibold">{title}</h3>
              </Link>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {type}
                </Badge>
                {year ? <Badge variant="outline">{year}</Badge> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">{noteButton}</div>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {synopsis ?? '—'}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div>{statusNode}</div>
            <div className="text-right">{entryDate}</div>
          </div>

          {onChangeRating ? (
            <RatingStars
              rating={rating ?? 0}
              interactive
              size="sm"
              onRatingChange={onChangeRating}
            />
          ) : (
            <RatingStars rating={rating ?? 0} size="sm" />
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:flex-row">
      <Link
        href={href}
        className="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted md:h-44 md:w-32"
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="text-lg font-semibold hover:underline">
            {title}
          </Link>
          <Badge variant="secondary" className="capitalize">
            {type}
          </Badge>
          {year ? <Badge variant="outline">{year}</Badge> : null}
          <div className="ml-auto flex items-center gap-2">{noteButton}</div>
        </div>

        <p className="text-sm text-muted-foreground">{synopsis ?? '—'}</p>
      </div>

      <div className="flex flex-col justify-between gap-3 md:w-64 md:text-right">
        <div className="flex justify-start md:justify-end">{statusNode}</div>

        {onChangeRating ? (
          <div className="flex justify-start md:justify-end">
            <RatingStars
              rating={rating ?? 0}
              interactive
              onRatingChange={onChangeRating}
            />
          </div>
        ) : (
          <div className="flex justify-start md:justify-end">
            <RatingStars rating={rating ?? 0} />
          </div>
        )}

        <div>{entryDate}</div>
      </div>
    </article>
  )
}
