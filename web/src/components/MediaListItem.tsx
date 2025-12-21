'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Calendar, MessageSquareText, Pencil, Star } from 'lucide-react'

import type { EntryStatus, MediaType } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  episodeCount?: number | null
  episodeProgress?: number | null
  genres?: string[] | null
  directors?: string[] | null
  writers?: string[] | null
  cast?: string[] | null

  status?: EntryStatus
  rating?: number | null
  note?: string | null
  entryDateLabel?: EntryDateLabel
  entryDateIso?: string | null

  onChangeStatus?: (next: EntryStatus) => Promise<void> | void
  onChangeRating?: (next: number) => Promise<void> | void
  onSaveNote?: (next: string) => Promise<void> | void
  onChangeEpisodeProgress?: (next: number | null) => Promise<void> | void

  busy?: boolean
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
  episodeCount,
  episodeProgress,
  genres,
  directors,
  writers,
  cast,
  status,
  rating,
  note,
  entryDateLabel = 'Rated',
  entryDateIso,
  onChangeStatus,
  onChangeRating,
  onSaveNote,
  onChangeEpisodeProgress,
  busy = false,
}: MediaListItemProps) {
  const [editingStatus, setEditingStatus] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState(note ?? '')

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

  const isEpisodeTrackable =
    (type === 'tv' || type === 'anime') &&
    (status === 'Watching' || status === 'Dropped')
  const episodeCountValue =
    typeof episodeCount === 'number' && Number.isFinite(episodeCount)
      ? Math.max(0, Math.round(episodeCount))
      : null
  const episodeProgressValue =
    typeof episodeProgress === 'number' && Number.isFinite(episodeProgress)
      ? Math.max(0, Math.round(episodeProgress))
      : null
  const showEpisodeProgress =
    isEpisodeTrackable &&
    (onChangeEpisodeProgress || episodeProgressValue != null)

  const episodeTriggerLabel =
    episodeProgressValue != null
      ? episodeCountValue != null
        ? `EP ${episodeProgressValue}/${episodeCountValue}`
        : `EP ${episodeProgressValue}`
      : episodeCountValue != null
        ? `EP ?/${episodeCountValue}`
        : 'Set EP'

  const handleEpisodeProgressInput = (raw: string) => {
    if (!onChangeEpisodeProgress) return
    const trimmed = raw.trim()
    if (!trimmed) {
      onChangeEpisodeProgress(null)
      return
    }
    const next = Number(trimmed)
    if (!Number.isFinite(next)) return
    onChangeEpisodeProgress(next)
  }

  const handleEpisodeProgressSlider = (raw: string) => {
    if (!onChangeEpisodeProgress) return
    const next = Number(raw)
    if (!Number.isFinite(next)) return
    onChangeEpisodeProgress(next)
  }

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
                  className="text-foreground"
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
            : type === 'album'
              ? 'ALBUM'
              : type === 'song'
                ? 'TRACK'
                : 'MUSIC'

  const genreParts = (genres ?? []).filter(Boolean).map(String)
  const visibleGenres = genreParts.slice(0, 3)
  const remainingGenreCount = Math.max(
    0,
    genreParts.length - visibleGenres.length,
  )

  const detailedGenres = genreParts.slice(0, 2)
  const detailedRemainingGenreCount = Math.max(
    0,
    genreParts.length - detailedGenres.length,
  )

  const compactGenres = genreParts.slice(0, 2)
  const compactRemainingGenreCount = Math.max(
    0,
    genreParts.length - compactGenres.length,
  )

  const metaSuffixParts: string[] = []
  if (year != null) metaSuffixParts.push(String(year))
  if (type === 'tv' || type === 'anime') {
    if (episodeCount != null && episodeCount > 0) {
      metaSuffixParts.push(`${episodeCount} eps`)
    }
  } else if (runtimeMinutes != null) {
    metaSuffixParts.push(formatDuration(runtimeMinutes))
  }
  const metaSuffix = metaSuffixParts.join(' • ')

  const renderPeopleLine = (label: string, people?: string[] | null) => {
    const cleaned = (people ?? []).filter(Boolean).map(String)
    if (cleaned.length === 0) return null
    const shown = cleaned.slice(0, 3)
    const remaining = Math.max(0, cleaned.length - shown.length)
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-semibold text-foreground">{label}:</span>
        <span className="text-xs text-muted-foreground">
          {shown.join(', ')}
          {remaining > 0 ? ` +${remaining}` : ''}
        </span>
      </div>
    )
  }

  if (viewMode === 'compact') {
    const ratingValue =
      rating != null && rating > 0 ? String(rating) : String(0)

    return (
      <div className="grid grid-cols-[96px_260px_1fr_80px_100px_140px_120px_160px_120px] items-start gap-3 px-2 py-3">
        <div className="flex flex-col items-start">
          <Link
            href={href}
            className="relative w-16 overflow-hidden bg-muted aspect-[2/3]"
          >
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={`${title} cover`}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : null}
          </Link>
        </div>

        <div className="min-w-0">
          <Link
            href={href}
            className="font-medium leading-tight hover:underline"
          >
            <span className="line-clamp-1">{title}</span>
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              {typeLabel}
            </span>
          </div>

          {compactGenres.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {compactGenres.map((g) => (
                <Badge
                  key={`compact-genre-${href}-${g}`}
                  variant="outline"
                  className="px-1 py-0 text-[10px]"
                >
                  {g}
                </Badge>
              ))}
              {compactRemainingGenreCount > 0 ? (
                <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                  +{compactRemainingGenreCount}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="line-clamp-4 text-sm leading-snug text-muted-foreground">
            {synopsis ?? '—'}
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {year ?? '—'}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {type === 'tv' || type === 'anime'
            ? episodeCount != null && episodeCount > 0
              ? `${episodeCount} eps`
              : '—'
            : runtimeMinutes != null
              ? formatDuration(runtimeMinutes)
              : '—'}
        </div>

        <div className="flex justify-center">
          {showEpisodeProgress ? (
            onChangeEpisodeProgress ? (
              <Input
                type="number"
                min={0}
                max={episodeCountValue ?? undefined}
                value={
                  episodeProgressValue != null
                    ? String(episodeProgressValue)
                    : ''
                }
                onChange={(event) =>
                  handleEpisodeProgressInput(event.target.value)
                }
                className="h-8 w-20 text-center"
                disabled={busy}
                aria-label="Episode progress"
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                {episodeProgressValue ?? '-'}
                {episodeCountValue != null ? `/${episodeCountValue}` : ''}
              </span>
            )
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>

        <div className="flex justify-center">{statusNode}</div>

        <div className="flex items-center justify-center gap-2">
          {onChangeRating ? (
            <Select
              value={ratingValue}
              onValueChange={async (nextValue) => {
                const next = Number(nextValue)
                if (!Number.isFinite(next) || next < 1 || next > 10) return
                await onChangeRating(next)
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-0"
                aria-label="Edit rating"
              >
                <SelectValue>
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold text-foreground">
                    {(rating ?? '—') as string | number}/10
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}/10
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-foreground">
                {(rating ?? '—') as string | number}/10
              </span>
            </div>
          )}

          <div className="flex items-center">{noteButton}</div>
        </div>

        <div>{entryDate}</div>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <Link href={href} className="block">
          <div className="relative aspect-[3/4] w-full bg-muted">
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

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div>{statusNode}</div>
              {showEpisodeProgress ? (
                onChangeEpisodeProgress ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        asChild
                        variant="outline"
                        className="cursor-pointer select-none"
                      >
                        <button
                          type="button"
                          disabled={busy}
                          className="disabled:pointer-events-none disabled:opacity-50"
                        >
                          {episodeTriggerLabel}
                        </button>
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel>Episode progress</DropdownMenuLabel>
                      <div className="space-y-2 p-2">
                        {episodeCountValue != null ? (
                          <input
                            type="range"
                            min={0}
                            max={episodeCountValue}
                            value={episodeProgressValue ?? 0}
                            onChange={(event) =>
                              handleEpisodeProgressSlider(event.target.value)
                            }
                            className="w-full"
                            aria-label="Episode progress slider"
                            disabled={busy}
                          />
                        ) : null}
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={episodeCountValue ?? undefined}
                            value={
                              episodeProgressValue != null
                                ? String(episodeProgressValue)
                                : ''
                            }
                            onChange={(event) =>
                              handleEpisodeProgressInput(event.target.value)
                            }
                            className="h-9 w-24"
                            disabled={busy}
                            aria-label="Episode progress"
                          />
                          <span className="text-xs text-muted-foreground">
                            {episodeCountValue != null
                              ? `/ ${episodeCountValue}`
                              : 'episodes'}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge variant="outline">{episodeTriggerLabel}</Badge>
                )
              ) : null}
            </div>
            <div className="text-right">{entryDate}</div>
          </div>
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
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3 md:flex md:flex-col md:space-y-0 md:gap-3">
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={href}
            className="min-w-0 text-2xl font-bold leading-tight hover:underline"
          >
            <span className="line-clamp-2">{title}</span>
          </Link>
        </div>

        {detailedGenres.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {detailedGenres.map((g) => (
              <Badge
                key={`detailed-genre-${href}-${g}`}
                variant="outline"
                className="text-xs"
              >
                {g}
              </Badge>
            ))}
            {detailedRemainingGenreCount > 0 ? (
              <Badge variant="secondary" className="text-xs">
                +{detailedRemainingGenreCount}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <p className="line-clamp-5 text-base text-muted-foreground">
          {synopsis ?? '—'}
        </p>

        <div className="space-y-1 md:mt-auto">
          {renderPeopleLine('Directors', directors)}
          {renderPeopleLine('Writers', writers)}
          {renderPeopleLine('Actors', cast)}
        </div>
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
          {showEpisodeProgress ? (
            onChangeEpisodeProgress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge
                    asChild
                    variant="outline"
                    className="cursor-pointer select-none"
                  >
                    <button
                      type="button"
                      disabled={busy}
                      className="disabled:pointer-events-none disabled:opacity-50"
                    >
                      {episodeProgressValue != null
                        ? episodeCountValue != null
                          ? `EP ${episodeProgressValue}/${episodeCountValue}`
                          : `EP ${episodeProgressValue}`
                        : episodeCountValue != null
                          ? `EP —/${episodeCountValue}`
                          : 'Set EP'}
                    </button>
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Episode progress</DropdownMenuLabel>
                  <div className="space-y-2 p-2">
                    {episodeCountValue != null ? (
                      <input
                        type="range"
                        min={0}
                        max={episodeCountValue}
                        value={episodeProgressValue ?? 0}
                        onChange={(event) =>
                          handleEpisodeProgressSlider(event.target.value)
                        }
                        className="w-full"
                        aria-label="Episode progress slider"
                        disabled={busy}
                      />
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={episodeCountValue ?? undefined}
                        value={
                          episodeProgressValue != null
                            ? String(episodeProgressValue)
                            : ''
                        }
                        onChange={(event) =>
                          handleEpisodeProgressInput(event.target.value)
                        }
                        className="h-9 w-24"
                        disabled={busy}
                        aria-label="Episode progress"
                      />
                      <span className="text-xs text-muted-foreground">
                        {episodeCountValue != null
                          ? `/ ${episodeCountValue}`
                          : 'episodes'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge variant="outline">
                {episodeProgressValue != null
                  ? episodeCountValue != null
                    ? `EP ${episodeProgressValue}/${episodeCountValue}`
                    : `EP ${episodeProgressValue}`
                  : episodeCountValue != null
                    ? `EP —/${episodeCountValue}`
                    : 'EP'}
              </Badge>
            )
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
