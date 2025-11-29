'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MediaType } from '@/types'
import type { LucideIcon } from 'lucide-react'
import {
  Clapperboard,
  Filter,
  Gamepad2,
  Heart,
  Music2,
  Search as SearchIcon,
  Sparkles,
} from 'lucide-react'

type CategoryId = 'movies' | 'anime' | 'songs' | 'games'
type CategoryFilter = 'all' | CategoryId

interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  description?: string
  coverUrl?: string
  status?: string
  tags: string[]
  type: MediaType
}

interface SearchCategory {
  id: CategoryId
  title: string
  helper?: string
  items: SearchResultItem[]
}

const DEFAULT_QUERY = 'Arcane'

const typeIconMap: Record<MediaType, LucideIcon> = {
  movie: Clapperboard,
  anime: Sparkles,
  song: Music2,
  game: Gamepad2,
}

const SEARCH_COLLECTION: SearchCategory[] = [
  {
    id: 'movies',
    title: 'Movies',
    helper: 'Where Piltover and Zaun first collide on-screen',
    items: [
      {
        id: 'arcane-series',
        title: 'Arcane: League of Legends',
        subtitle: '2021 • TV Series • Animated, Action',
        description:
          'Fortiche and Riot weave the origins of Vi, Jinx, Caitlyn, and Viktor.',
        coverUrl:
          'https://image.tmdb.org/t/p/w500/fqldf2t8ztS4BNP3cMB0DaZhXry.jpg',
        status: 'In favourites',
        tags: ['Netflix', '9 episodes'],
        type: 'movie',
      },
      {
        id: 'arcane-chronicles',
        title: 'Arcane: Zaun Chronicles',
        subtitle: '2023 • Special • Documentary',
        description: "Behind-the-scenes look at Fortiche and Riot's collab.",
        coverUrl:
          'https://image.tmdb.org/t/p/w500/fqldf2t8ztS4BNP3cMB0DaZhXry.jpg',
        tags: ['Featurette', 'Fortiche'],
        type: 'movie',
      },
    ],
  },
  {
    id: 'anime',
    title: 'Anime',
    helper: 'Stylised adaptations and theatrical cuts',
    items: [
      {
        id: 'arcane-anime',
        title: 'Arcane (Anime adaptation)',
        subtitle: '2024 • Movie • Fantasy',
        description:
          'A feature-length re-imagining with bespoke fight sequences.',
        coverUrl:
          'https://image.tmdb.org/t/p/w500/fqldf2t8ztS4BNP3cMB0DaZhXry.jpg',
        tags: ['Fortiche Lab', 'Experimental'],
        type: 'anime',
      },
    ],
  },
  {
    id: 'songs',
    title: 'Songs/Albums',
    helper: 'Soundtracks and playlists from the series',
    items: [
      {
        id: 'arcane-soundtrack',
        title: 'Arcane: Season 1 Soundtrack',
        subtitle: 'Various Artists • 2021 • Album',
        description:
          'Imagine Dragons, Bea Miller, Denzel Curry, and more Runeterra vibes.',
        tags: ['34 tracks', 'Spotify'],
        type: 'song',
      },
    ],
  },
  {
    id: 'games',
    title: 'Games',
    helper: 'Jump straight into Runeterra',
    items: [
      {
        id: 'league-of-legends',
        title: 'League of Legends',
        subtitle: '2009 • MOBA • Riot Games',
        description:
          'Where the stories of Vi, Jinx, Caitlyn, and Viktor began.',
        tags: ['PC', 'Multiplayer'],
        type: 'game',
      },
    ],
  },
]

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies' },
  { id: 'anime', label: 'Anime' },
  { id: 'songs', label: 'Songs/Albums' },
  { id: 'games', label: 'Games' },
]

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const addTimerRef = useRef<NodeJS.Timeout | null>(null)
  const paramQuery = searchParams.get('query') ?? ''
  const searchQuery = searchParams.has('query') ? paramQuery : DEFAULT_QUERY

  useEffect(() => {
    return () => {
      if (addTimerRef.current) {
        clearTimeout(addTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!searchParams.has('query')) {
      router.replace(`/search?query=${encodeURIComponent(DEFAULT_QUERY)}`, {
        scroll: false,
      })
    }
  }, [router, searchParams])

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return SEARCH_COLLECTION.map((category) => {
      const items = query
        ? category.items.filter((item) =>
            item.title.toLowerCase().includes(query),
          )
        : category.items

      return { ...category, items }
    }).filter((category) => category.items.length > 0)
  }, [searchQuery])

  const visibleCategories = useMemo(() => {
    if (activeFilter === 'all') {
      return filteredCategories
    }

    return filteredCategories.filter((category) => category.id === activeFilter)
  }, [activeFilter, filteredCategories])

  const totalMatches = filteredCategories.reduce(
    (acc, category) => acc + category.items.length,
    0,
  )

  const getCategoryCount = (id: CategoryId) =>
    filteredCategories.find((category) => category.id === id)?.items.length ?? 0

  const filterCounts: Record<CategoryFilter, number> = {
    all: totalMatches,
    movies: getCategoryCount('movies'),
    anime: getCategoryCount('anime'),
    songs: getCategoryCount('songs'),
    games: getCategoryCount('games'),
  }

  const queryLabel = searchQuery.trim()
    ? `'${searchQuery.trim()}'`
    : 'all media'
  const summaryText = totalMatches
    ? `${totalMatches} match${totalMatches === 1 ? '' : 'es'} • ${
        filteredCategories.length
      } categor${filteredCategories.length === 1 ? 'y' : 'ies'}`
    : 'No matches yet — try a different phrase'

  const updateSearchQuery = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value.length > 0) {
      params.set('query', value)
    } else {
      params.set('query', '')
    }

    const queryString = params.toString()

    router.replace(`/search${queryString ? `?${queryString}` : ''}`, {
      scroll: false,
    })
  }

  const handleAdd = (item: SearchResultItem) => {
    if (addTimerRef.current) {
      clearTimeout(addTimerRef.current)
    }

    setPendingId(item.id)
    console.log('Add to list:', item.title)

    addTimerRef.current = setTimeout(() => {
      setPendingId((current) => (current === item.id ? null : current))
    }, 900)
  }

  const handleSelect = (item: SearchResultItem) => {
    router.push(`/media/${item.id}`)
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-3xl border bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Stitch Search Results
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Results for {queryLabel}
              </h1>
              <p className="text-sm text-muted-foreground">{summaryText}</p>
            </div>
            <Badge className="rounded-full border border-indigo-100 bg-indigo-50 text-xs font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" />
              Smart suggestions on
            </Badge>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 rounded-full border-dashed px-6"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => updateSearchQuery(event.target.value)}
                placeholder="Search movies, anime, songs, games…"
                aria-label="Search media"
                className="h-11 w-full rounded-full border border-slate-200 bg-white/70 pl-12 pr-4 text-base"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                type="button"
                size="sm"
                variant={activeFilter === filter.id ? 'default' : 'ghost'}
                className="rounded-full px-4"
                disabled={filterCounts[filter.id] === 0}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
                <span className="ml-2 text-xs text-muted-foreground">
                  {filterCounts[filter.id]}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {visibleCategories.length === 0 ? (
        <EmptyState
          title="No results found"
          description="We couldn't find anything with that combination. Try clearing filters or another title."
        />
      ) : (
        <div className="space-y-10">
          {visibleCategories.map((category) => (
            <SearchCategorySection
              key={category.id}
              category={category}
              onAdd={handleAdd}
              onSelect={handleSelect}
              pendingId={pendingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SearchCategorySectionProps {
  category: SearchCategory
  pendingId: string | null
  onAdd: (item: SearchResultItem) => void
  onSelect: (item: SearchResultItem) => void
}

function SearchCategorySection({
  category,
  onAdd,
  onSelect,
  pendingId,
}: SearchCategorySectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{category.title}</h2>
          {category.helper && (
            <p className="text-sm text-muted-foreground">{category.helper}</p>
          )}
        </div>
        <Badge
          variant="secondary"
          className="rounded-full border border-slate-200 bg-white text-xs text-muted-foreground"
        >
          {category.items.length}{' '}
          {category.items.length === 1 ? 'result' : 'results'}
        </Badge>
      </div>

      <div className="space-y-4">
        {category.items.map((item) => (
          <SearchResultCard
            key={item.id}
            item={item}
            isLoading={pendingId === item.id}
            onAdd={() => onAdd(item)}
            onSelect={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  )
}

interface SearchResultCardProps {
  item: SearchResultItem
  onAdd: () => void
  onSelect: () => void
  isLoading: boolean
}

function SearchResultCard({
  item,
  onAdd,
  onSelect,
  isLoading,
}: SearchResultCardProps) {
  const TypeIcon = typeIconMap[item.type]

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${item.title}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:flex-row md:items-center"
    >
      <div className="flex flex-1 gap-4">
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
          {item.coverUrl ? (
            <Image
              src={item.coverUrl}
              alt={item.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-indigo-600">
              <TypeIcon className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold leading-tight">
              {item.title}
            </h3>
            {item.status && (
              <Badge className="rounded-full border-0 bg-rose-50 text-rose-600">
                <Heart className="h-3.5 w-3.5" fill="currentColor" />
                {item.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{item.subtitle}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="rounded-full border-dashed px-3 py-1 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onAdd()
        }}
        disabled={isLoading}
        className="w-full rounded-full px-6 py-2 text-sm font-semibold md:w-auto"
      >
        {isLoading ? 'Added' : 'Add to list'}
      </Button>
    </div>
  )
}
