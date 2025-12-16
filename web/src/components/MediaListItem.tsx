'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Calendar, MessageSquareText, Pencil, Star } from 'lucide-react'

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
  runtimeMinutes?: number
  genres?: string[] | null

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

function formatLongDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(minutes?: number) {
  if (!minutes) return '—'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes}m`
  return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`
}

export function MediaListItem({
  viewMode,
  href,
  title,
  type,
  posterUrl,
  synopsis,
  year,
  runtimeMinutes,
  genres,
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

  const openNoteEditor = () => {
    setNoteDraft(note ?? '')
    setNoteOpen(true)
  }

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
              onClick={openNoteEditor}
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

        <Dialog
          open={noteOpen}
          onOpenChange={(open) => {
            setNoteOpen(open)
            if (open) setNoteDraft(note ?? '')
          }}
        >
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

  const typeLabel =
    type === 'movie'
      ? 'FILM'
      : type === 'tv'
        ? 'TV'
        : type === 'anime'
          ? 'ANIME'
          : type === 'game'
            ? 'GAME'
            : 'MUSIC'

  const genreParts = (genres ?? []).filter(Boolean).map(String)
  const visibleGenres = genreParts.slice(0, 3)
  const remainingGenreCount = Math.max(
    0,
    genreParts.length - visibleGenres.length,
  )

  const metaSuffixParts: string[] = []
  if (year != null) metaSuffixParts.push(String(year))
  if (runtimeMinutes != null)
    metaSuffixParts.push(formatDuration(runtimeMinutes))
  const metaSuffix = metaSuffixParts.join(' • ')

  if (viewMode === 'compact') {
    return (
      <div className="grid grid-cols-[64px_1fr_120px_130px_120px_44px] items-center gap-3 py-3">
        <div className="flex flex-col items-start gap-1">
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

          <div className="flex w-full flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {typeLabel}
              </span>
              {metaSuffix ? (
                <span className="text-[10px] text-muted-foreground">
                  • {metaSuffix}
                </span>
              ) : null}
            </div>

            {visibleGenres.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {visibleGenres.map((g) => (
                  <Badge
                    key={`compact-genre-${href}-${g}`}
                    variant="outline"
                    className="px-1 py-0 text-[10px]"
                  >
                    {g}
                  </Badge>
                ))}
                {remainingGenreCount > 0 ? (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    +{remainingGenreCount}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <Link
            href={href}
            className="font-medium leading-tight hover:underline"
          >
            <span className="line-clamp-1">{title}</span>
          </Link>
        </div>

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
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {typeLabel}
              </span>
              {metaSuffix ? (
                <span className="text-xs text-muted-foreground">
                  • {metaSuffix}
                </span>
              ) : null}
            </div>

            {visibleGenres.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {visibleGenres.map((g) => (
                  <Badge
                    key={`grid-genre-${href}-${g}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {g}
                  </Badge>
                ))}
                {remainingGenreCount > 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    +{remainingGenreCount}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={href} className="hover:underline">
                <h3 className="line-clamp-2 font-semibold">{title}</h3>
              </Link>
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

  const noteBody =
    note?.trim() != null && note.trim().length > 0
      ? note
      : 'No notes yet. Click edit to add.'

  const ratingNumber = rating != null && rating > 0 ? rating : null

  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:flex-row md:items-stretch">
      <div className="flex w-28 flex-col items-start gap-2 md:w-36">
        <Link
          href={href}
          className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-muted md:h-52 md:w-36"
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

        <div className="w-full space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="h-4 w-1 rounded-full bg-amber-500" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {typeLabel}
            </span>
            {metaSuffix ? (
              <span className="text-xs text-muted-foreground">
                • {metaSuffix}
              </span>
            ) : null}
          </div>

          {visibleGenres.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {visibleGenres.map((g) => (
                <Badge
                  key={`detailed-genre-${href}-${g}`}
                  variant="outline"
                  className="text-[10px]"
                >
                  {g}
                </Badge>
              ))}
              {remainingGenreCount > 0 ? (
                <Badge variant="secondary" className="text-[10px]">
                  +{remainingGenreCount}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={href}
            className="min-w-0 text-2xl font-bold leading-tight hover:underline"
          >
            <span className="line-clamp-2">{title}</span>
          </Link>
        </div>

        <p className="line-clamp-4 text-sm text-muted-foreground">
          {synopsis ?? '—'}
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 md:w-[360px] md:flex-shrink-0">
        <section className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquareText className="h-4 w-4" />
              Notes
            </div>
            <button
              type="button"
              className="rounded-lg border bg-white px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={openNoteEditor}
              disabled={busy}
              aria-label="Edit notes"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          {/* Mount the existing dialog implementation (used by other view modes). */}
          {noteButton ? <div className="hidden">{noteButton}</div> : null}
          <p
            className={`mt-3 whitespace-pre-wrap text-sm ${
              note?.trim() ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {noteBody}
          </p>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold uppercase leading-none tracking-wide text-amber-700">
              Rating
            </div>

            <div className="mt-1">
              <div className="text-2xl font-bold text-amber-700">
                {(ratingNumber ?? '—') as string | number}/10
              </div>
            </div>

            <div className="mt-2">
              {onChangeRating ? (
                <RatingStars
                  rating={ratingNumber ?? 0}
                  interactive
                  onRatingChange={onChangeRating}
                  size="md"
                  showLabel={false}
                />
              ) : (
                <RatingStars
                  rating={ratingNumber ?? 0}
                  size="md"
                  showLabel={false}
                />
              )}
            </div>
          </div>

          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200/60">
            <Star className="h-6 w-6 text-amber-700" />
          </div>
        </section>

        <div className="mt-auto flex items-center justify-end gap-2 text-xs">
          {statusNode ? (
            <div className="text-foreground">{statusNode}</div>
          ) : null}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatLongDate(entryDateIso)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
