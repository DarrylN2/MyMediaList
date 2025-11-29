'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Filter, Plus, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

const FILTER_OPTIONS = ['all', 'movies', 'anime', 'games'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]
type ListCategory = Exclude<FilterOption, 'all'>

type ListCard = {
  id: string
  title: string
  description: string
  coverUrl: string
  previewItems: string[]
  stat: {
    label: string
    value: string
    helper?: string
  }
  type: ListCategory
  updatedAt: string
  itemCount: number
}

type RatedItem = {
  id: string
  title: string
  type: ListCategory
  status: string
  rating: number
  ratedAt: string
  note: string
  coverUrl: string
}

const mockLists: ListCard[] = [
  {
    id: 'action-films',
    title: 'Action Movies',
    description:
      'Top rated set-piece heavy films for when you want adrenaline and iconic one-liners.',
    coverUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4e61K2zH6tYUDMx2.jpg',
    previewItems: ['Mad Max', 'John Wick', 'Dune Part Two'],
    stat: { label: 'Avg Rating', value: '10/10', helper: '12 films logged' },
    type: 'movies',
    updatedAt: '2 days ago',
    itemCount: 12,
  },
  {
    id: 'top-anime',
    title: 'Top Tier Anime',
    description:
      'Must-watch sagas packed with lovable casts, emotional crescendos, and wild twists.',
    coverUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
    previewItems: ['Attack on Titan', 'Fullmetal Alchemist', 'Jujutsu Kaisen'],
    stat: { label: 'Avg Rating', value: '9.5/10', helper: '10 series logged' },
    type: 'anime',
    updatedAt: 'yesterday',
    itemCount: 10,
  },
  {
    id: 'indie-games',
    title: 'Fav Indie Games',
    description:
      'Atmospheric adventures and tight combat loops from brilliant small teams.',
    coverUrl:
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
    previewItems: ['Hades', 'Hollow Knight', 'Stardew Valley'],
    stat: { label: 'Avg Rating', value: '9/10', helper: '7 games logged' },
    type: 'games',
    updatedAt: '4 days ago',
    itemCount: 7,
  },
]

const mockRatings: RatedItem[] = [
  {
    id: 'matrix',
    title: 'The Matrix',
    type: 'movies',
    status: 'Completed',
    rating: 10,
    ratedAt: 'Nov 20',
    note: 'Cyberpunk perfection with endlessly rewatchable action.',
    coverUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
  },
  {
    id: 'aot',
    title: 'Attack on Titan Final Season',
    type: 'anime',
    status: 'Watching',
    rating: 10,
    ratedAt: 'Nov 18',
    note: 'Peak storytelling—every episode lands a gut punch.',
    coverUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
  },
  {
    id: 'hades',
    title: 'Hades',
    type: 'games',
    status: 'Playing',
    rating: 9,
    ratedAt: 'Nov 15',
    note: 'Combat loop stays fresh even a hundred runs in.',
    coverUrl:
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
  },
  {
    id: 'fullmetal',
    title: 'Fullmetal Alchemist: Brotherhood',
    type: 'anime',
    status: 'Completed',
    rating: 9,
    ratedAt: 'Nov 12',
    note: 'Tightly plotted, emotional, and endlessly quotable.',
    coverUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx5114-KJT9MGf4r7jz.jpg',
  },
  {
    id: 'dune',
    title: 'Dune: Part Two',
    type: 'movies',
    status: 'Completed',
    rating: 9,
    ratedAt: 'Nov 10',
    note: 'Huge sci-fi spectacle with immaculate sound design.',
    coverUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
  },
  {
    id: 'stardew',
    title: 'Stardew Valley',
    type: 'games',
    status: 'On break',
    rating: 8,
    ratedAt: 'Nov 08',
    note: 'Comfort title—easy to get lost farming for hours.',
    coverUrl:
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co2f39.jpg',
  },
]

const badgeTone: Record<ListCategory, string> = {
  movies: 'bg-orange-100 text-orange-800 border-transparent',
  anime: 'bg-pink-100 text-pink-700 border-transparent',
  games: 'bg-violet-100 text-violet-700 border-transparent',
}

export default function ListsPage() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')

  const filteredLists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return mockLists.filter((list) => {
      const matchesCategory =
        activeFilter === 'all' || list.type === activeFilter
      if (!matchesCategory) return false
      if (!normalizedQuery) return true

      return (
        list.title.toLowerCase().includes(normalizedQuery) ||
        list.description.toLowerCase().includes(normalizedQuery) ||
        list.previewItems.some((item) =>
          item.toLowerCase().includes(normalizedQuery),
        )
      )
    })
  }, [activeFilter, query])

  const totalItems = useMemo(
    () => mockLists.reduce((sum, list) => sum + list.itemCount, 0),
    [],
  )
  const sortedRatings = useMemo(
    () =>
      [...mockRatings].sort((first, second) => {
        if (second.rating === first.rating) {
          return second.ratedAt.localeCompare(first.ratedAt)
        }
        return second.rating - first.rating
      }),
    [],
  )

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-3xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter your lists"
              className="h-auto border-0 bg-transparent px-0 text-base focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-dashed bg-white text-muted-foreground"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </Button>
          </div>

          <Button className="h-12 rounded-3xl px-5 text-base shadow-lg">
            <Plus className="h-4 w-4" />
            New List
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={option === activeFilter ? 'default' : 'secondary'}
              className={`rounded-full px-4 text-sm capitalize ${
                option === activeFilter
                  ? 'shadow-md'
                  : 'bg-white/70 text-slate-600 hover:bg-white'
              }`}
              onClick={() => setActiveFilter(option)}
            >
              {option === 'all' ? 'All lists' : option}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Tracking {totalItems} items across {mockLists.length} curated lists.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Your lists</h1>
          <p className="text-sm text-muted-foreground">
            Browse, reorder, or share your collections at a glance.
          </p>
        </div>

        {filteredLists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted-foreground/30 bg-white/80 p-10 text-center text-muted-foreground">
            No lists match your filters. Try a different search or category.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLists.map((list) => (
              <article
                key={list.id}
                className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="flex flex-1 items-center gap-4">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={list.coverUrl}
                      alt={`${list.title} cover art`}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/25 via-transparent to-black/0" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className={`capitalize ${badgeTone[list.type]}`}
                      >
                        {list.type}
                      </Badge>
                      <span>{list.itemCount} items</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {list.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {list.description}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {list.previewItems.join(', ')}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {list.updatedAt}
                    </p>
                  </div>
                </div>

                <Separator
                  orientation="vertical"
                  className="hidden h-20 self-stretch sm:block"
                />

                <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:flex-col sm:items-end sm:text-right">
                  <div className="flex flex-col text-left sm:items-end sm:text-right">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {list.stat.label}
                    </span>
                    <span className="text-3xl font-semibold leading-tight text-foreground">
                      {list.stat.value}
                    </span>
                    {list.stat.helper ? (
                      <span className="text-xs text-muted-foreground">
                        {list.stat.helper}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col text-left sm:items-end sm:text-right">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Items
                    </span>
                    <span className="text-3xl font-semibold leading-tight text-foreground">
                      {list.itemCount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {list.itemCount === 1
                        ? 'Item in this list'
                        : 'Items in this list'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Top rated items</h2>
            <p className="text-sm text-muted-foreground">
              Ordered list of everything you have scored so far.
            </p>
          </div>
          <Button variant="ghost" className="text-sm text-muted-foreground">
            View history
          </Button>
        </div>

        <div className="mt-6 divide-y divide-slate-200">
          <div className="hidden grid-cols-[auto,1fr,120px,90px] gap-4 pb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Title</span>
            <span>Summary</span>
            <span>Status</span>
            <span className="text-right">Rating</span>
          </div>
          {sortedRatings.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-[auto,1fr,120px,90px]"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={item.coverUrl}
                    alt={`${item.title} cover`}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium leading-tight">{item.title}</p>
                  <span className="text-xs capitalize text-muted-foreground">
                    {item.type}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">{item.note}</p>
              </div>

              <div className="flex items-center text-sm text-muted-foreground">
                {item.status}
              </div>

              <div className="flex items-center justify-between sm:justify-end sm:text-right">
                <span className="text-lg font-semibold text-foreground">
                  {item.rating}/10
                </span>
                <span className="text-xs text-muted-foreground sm:ml-2">
                  Rated {item.ratedAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
