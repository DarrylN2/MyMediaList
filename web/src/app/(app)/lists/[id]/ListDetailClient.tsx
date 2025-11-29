'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpDown, SlidersHorizontal, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import type { EntryStatus } from '@/types'
import type { MediaList } from '@/data/mockLists'

type ViewMode = 'detailed' | 'grid' | 'compact'

const sortOptions = [
  { value: 'ranking', label: 'Ranking' },
  { value: 'userRating', label: 'Your rating' },
  { value: 'averageRating', label: 'Average rating' },
  { value: 'releaseDate', label: 'Release date' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'votes', label: 'Number of ratings' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'loggedAt', label: 'Recently logged' },
]

const statusOptions: EntryStatus[] = [
  'Planning',
  'Watching',
  'Playing',
  'Completed',
  'Dropped',
]

const viewModes: { value: ViewMode; label: string }[] = [
  { value: 'detailed', label: 'Detailed' },
  { value: 'grid', label: 'Grid' },
  { value: 'compact', label: 'Compact' },
]

export function ListDetailClient({ list }: { list: MediaList }) {
  const [sortBy, setSortBy] = useState(sortOptions[0].value)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [ratingMin, setRatingMin] = useState('1')
  const [ratingMax, setRatingMax] = useState('10')
  const [searchQuery, setSearchQuery] = useState('')

  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>()
    list.items.forEach((item) => {
      item.genres.forEach((genre) => genreSet.add(genre))
    })
    return Array.from(genreSet).sort((a, b) => a.localeCompare(b))
  }, [list.items])

  const availableKeywords = useMemo(() => {
    const keywordSet = new Set<string>()
    list.items.forEach((item) => {
      ;(item.keywords ?? []).forEach((keyword) => keywordSet.add(keyword))
    })
    return Array.from(keywordSet).sort((a, b) => a.localeCompare(b))
  }, [list.items])

  const activeFiltersCount =
    selectedGenres.length +
    selectedKeywords.length +
    (statusFilter !== 'all' ? 1 : 0) +
    (yearMin ? 1 : 0) +
    (yearMax ? 1 : 0) +
    (ratingMin !== '1' ? 1 : 0) +
    (ratingMax !== '10' ? 1 : 0)

  const processedItems = useMemo(() => {
    const minYear = yearMin ? Number(yearMin) : undefined
    const maxYear = yearMax ? Number(yearMax) : undefined
    const minRating = ratingMin ? Number(ratingMin) : undefined
    const maxRating = ratingMax ? Number(ratingMax) : undefined
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const filtered = list.items.filter((item) => {
      const matchesSearch = normalizedQuery
        ? item.title.toLowerCase().includes(normalizedQuery) ||
          item.note?.toLowerCase().includes(normalizedQuery)
        : true

      const matchesGenres = selectedGenres.length
        ? selectedGenres.every((genre) => item.genres.includes(genre))
        : true

      const matchesKeywords = selectedKeywords.length
        ? selectedKeywords.every((keyword) =>
            (item.keywords ?? []).includes(keyword),
          )
        : true

      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter

      const year = item.releaseYear
      if (typeof minYear === 'number' && year < minYear) return false
      if (typeof maxYear === 'number' && year > maxYear) return false

      if (typeof minRating === 'number' && item.userRating < minRating)
        return false
      if (typeof maxRating === 'number' && item.userRating > maxRating)
        return false

      return matchesSearch && matchesGenres && matchesKeywords && matchesStatus
    })

    const sorted = [...filtered].sort((first, second) => {
      const getDirection = (value: number) =>
        sortDirection === 'asc' ? value : -value

      switch (sortBy) {
        case 'ranking':
          return getDirection(first.rank - second.rank)
        case 'userRating':
          return getDirection(first.userRating - second.userRating)
        case 'averageRating':
          return getDirection(first.averageRating - second.averageRating)
        case 'releaseDate': {
          const firstDate = new Date(
            first.releaseDate ?? `${first.releaseYear}`,
          )
          const secondDate = new Date(
            second.releaseDate ?? `${second.releaseYear}`,
          )
          return getDirection(firstDate.getTime() - secondDate.getTime())
        }
        case 'alphabetical':
          return getDirection(
            first.title.localeCompare(second.title, undefined, {
              sensitivity: 'base',
            }),
          )
        case 'popularity':
          return getDirection(first.popularity - second.popularity)
        case 'votes':
          return getDirection(first.votes - second.votes)
        case 'runtime':
          return getDirection(
            (first.runtimeMinutes ?? 0) - (second.runtimeMinutes ?? 0),
          )
        case 'loggedAt': {
          const firstDate = new Date(first.loggedAt)
          const secondDate = new Date(second.loggedAt)
          return getDirection(firstDate.getTime() - secondDate.getTime())
        }
        default:
          return 0
      }
    })

    return sorted
  }, [
    list.items,
    ratingMax,
    ratingMin,
    searchQuery,
    selectedGenres,
    selectedKeywords,
    sortBy,
    sortDirection,
    statusFilter,
    yearMax,
    yearMin,
  ])

  const toggleSelection = (
    value: string,
    collection: string[],
    setter: (value: string[]) => void,
  ) => {
    setter(
      collection.includes(value)
        ? collection.filter((item) => item !== value)
        : [...collection, value],
    )
  }

  const clearFilters = () => {
    setSelectedGenres([])
    setSelectedKeywords([])
    setStatusFilter('all')
    setYearMin('')
    setYearMax('')
    setRatingMin('1')
    setRatingMax('10')
  }

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const remaining = minutes % 60
    if (hours === 0) return `${remaining}m`
    return `${hours}h${remaining ? ` ${remaining}m` : ''}`
  }

  const formatDate = (input: string) => {
    const date = new Date(input)
    if (Number.isNaN(date.getTime())) return input
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderView = () => {
    if (processedItems.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-white/80 p-8 text-center text-muted-foreground">
          No entries match your filters. Try clearing them for the full list.
        </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {processedItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={item.coverUrl}
                  alt={`${item.title} poster`}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 shadow">
                  #{item.rank}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <Link
                    href={`/media/${item.mediaId}`}
                    className="text-base font-semibold leading-tight hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.releaseYear} •{' '}
                    {formatRuntime(item.runtimeMinutes) ?? '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.genres.slice(0, 3).map((genre) => (
                    <Badge key={genre} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Avg
                    </p>
                    <p className="font-semibold">
                      {item.averageRating.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground">
                      Yours
                    </p>
                    <p className="font-semibold">{item.userRating}/10</p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (viewMode === 'compact') {
      return (
        <div className="overflow-x-auto rounded-2xl border bg-white/95 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Your rating</TableHead>
                <TableHead>Avg rating</TableHead>
                <TableHead>Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">#{item.rank}</TableCell>
                  <TableCell>
                    <Link
                      href={`/media/${item.mediaId}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {item.genres.slice(0, 2).join(', ')}
                    </div>
                  </TableCell>
                  <TableCell>{item.releaseYear}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.userRating}/10</TableCell>
                  <TableCell>{item.averageRating.toFixed(1)}</TableCell>
                  <TableCell>{formatDate(item.loggedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {processedItems.map((item) => (
          <article
            key={item.id}
            className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:flex-row"
          >
            <div className="flex items-center gap-4 md:w-48 md:flex-col md:text-center">
              <div className="text-3xl font-semibold text-slate-900">
                #{item.rank}
              </div>
              <div className="relative h-32 w-24 overflow-hidden rounded-2xl bg-muted md:h-44 md:w-full">
                <Image
                  src={item.coverUrl}
                  alt={`${item.title} artwork`}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/media/${item.mediaId}`}
                  className="text-lg font-semibold text-foreground hover:underline"
                >
                  {item.title}
                </Link>
                <Badge variant="outline">{item.releaseYear}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[formatRuntime(item.runtimeMinutes), item.genres.join(', ')]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.genres.map((genre) => (
                  <Badge
                    key={`${item.id}-${genre}`}
                    variant="secondary"
                    className="text-xs"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
              {item.note && (
                <p className="text-sm text-muted-foreground">{item.note}</p>
              )}
            </div>

            <Separator className="md:hidden" />

            <div className="flex flex-col justify-between gap-4 md:w-56 md:text-right">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Average rating
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {item.averageRating.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Intl.NumberFormat('en-US', {
                    notation: 'compact',
                  }).format(item.votes)}{' '}
                  votes
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Your rating
                </p>
                <p className="text-2xl font-semibold">{item.userRating}/10</p>
                <Badge
                  variant="outline"
                  className="mt-2 self-start capitalize md:self-end"
                >
                  {item.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Logged {formatDate(item.loggedAt)}
              </p>
            </div>
          </article>
        ))}
      </div>
    )
  }

  const filterChips = (
    <div className="flex flex-wrap gap-2">
      {selectedGenres.map((genre) => (
        <Badge
          key={`genre-${genre}`}
          variant="secondary"
          className="flex items-center gap-1"
        >
          {genre}
          <button
            type="button"
            onClick={() =>
              toggleSelection(genre, selectedGenres, setSelectedGenres)
            }
            aria-label={`Remove genre ${genre}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {selectedKeywords.map((keyword) => (
        <Badge
          key={`keyword-${keyword}`}
          variant="secondary"
          className="flex items-center gap-1"
        >
          {keyword}
          <button
            type="button"
            onClick={() =>
              toggleSelection(keyword, selectedKeywords, setSelectedKeywords)
            }
            aria-label={`Remove keyword ${keyword}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {statusFilter !== 'all' && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 capitalize"
        >
          {statusFilter}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            aria-label="Clear status filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="relative h-48 w-full overflow-hidden rounded-3xl bg-muted md:w-60">
            <Image
              src={list.coverUrl}
              alt={`${list.title} cover`}
              fill
              sizes="240px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-4">
            <Badge variant="secondary" className="capitalize">
              {list.type}
            </Badge>
            <div>
              <h1 className="text-3xl font-bold">{list.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {list.description}
              </p>
            </div>
            {list.tags && (
              <div className="flex flex-wrap gap-2">
                {list.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {list.stat.label}
                </p>
                <p className="text-2xl font-semibold">{list.stat.value}</p>
                {list.stat.helper && (
                  <p className="text-xs text-muted-foreground">
                    {list.stat.helper}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Items</p>
                <p className="text-2xl font-semibold">{list.itemCount}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {list.updatedAt}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Avg score
                </p>
                <p className="text-2xl font-semibold">
                  {list.averageRating.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Custom list</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ranking" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setSortDirection((direction) =>
                    direction === 'asc' ? 'desc' : 'asc',
                  )
                }
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle sort direction</span>
              </Button>
            </div>

            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2">{activeFiltersCount}</Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filter entries</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Genres</p>
                    <div className="flex flex-wrap gap-2">
                      {availableGenres.map((genre) => (
                        <Button
                          key={genre}
                          type="button"
                          size="sm"
                          variant={
                            selectedGenres.includes(genre)
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            toggleSelection(
                              genre,
                              selectedGenres,
                              setSelectedGenres,
                            )
                          }
                        >
                          {genre}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Release year</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="From"
                        value={yearMin}
                        onChange={(event) => setYearMin(event.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="To"
                        value={yearMax}
                        onChange={(event) => setYearMax(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your rating</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        placeholder="Min"
                        value={ratingMin}
                        onChange={(event) => setRatingMin(event.target.value)}
                      />
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        placeholder="Max"
                        value={ratingMax}
                        onChange={(event) => setRatingMax(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={
                            statusFilter === status ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() => setStatusFilter(status)}
                        >
                          {status}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                      >
                        Any status
                      </Button>
                    </div>
                  </div>

                  {availableKeywords.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {availableKeywords.map((keyword) => (
                          <Button
                            key={keyword}
                            type="button"
                            size="sm"
                            variant={
                              selectedKeywords.includes(keyword)
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() =>
                              toggleSelection(
                                keyword,
                                selectedKeywords,
                                setSelectedKeywords,
                              )
                            }
                          >
                            {keyword}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                    <Button type="button" onClick={() => setFiltersOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {viewModes.map((mode) => (
                <Button
                  key={mode.value}
                  type="button"
                  size="sm"
                  variant={viewMode === mode.value ? 'default' : 'outline'}
                  onClick={() => setViewMode(mode.value)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Search within this list"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-[200px] flex-1"
            />
          </div>
        </div>

        {activeFiltersCount > 0 && filterChips}

        {renderView()}
      </section>
    </div>
  )
}
