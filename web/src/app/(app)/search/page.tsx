'use client'

import Image from 'next/image'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '@/components/EmptyState'
import { RatingStars } from '@/components/RatingStars'
import { StatusSelect } from '@/components/StatusSelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import type { EntryStatus, MediaProvider, MediaType } from '@/types'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  Clapperboard,
  Disc3,
  Filter,
  Gamepad2,
  Heart,
  Music2,
  Search as SearchIcon,
  Sparkles,
  Star,
  Tv,
} from 'lucide-react'
import { toast } from 'sonner'

type CategoryId = 'movies' | 'tv' | 'anime' | 'tracks' | 'albums' | 'games'
type CategoryFilter = 'all' | CategoryId
type LiveCategoryType = 'movie' | 'tv' | 'anime' | 'track' | 'album' | 'game'

const LIVE_CATEGORY_LABELS: Record<LiveCategoryType, string> = {
  movie: 'Movies',
  tv: 'TV Shows',
  anime: 'Anime',
  track: 'Tracks',
  album: 'Albums',
  game: 'Games',
}

function parseCategoryFilter(raw: string | null): CategoryFilter {
  const value = (raw ?? 'all').toLowerCase()
  if (value === 'all') return 'all'
  if (
    value === 'movies' ||
    value === 'tv' ||
    value === 'anime' ||
    value === 'tracks' ||
    value === 'albums' ||
    value === 'games'
  ) {
    return value
  }
  return 'all'
}

interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  description?: string
  coverUrl?: string
  status?: string
  tags: string[]
  type: MediaType
  provider?: MediaProvider
  providerId?: string
  externalUrl?: string
  artist?: string
  album?: string
  year?: number
  durationSeconds?: number
  explicit?: boolean
}

interface SearchCategory {
  id: CategoryId
  title: string
  helper?: string
  items: SearchResultItem[]
}

interface SearchApiResponse {
  items: SearchResultItem[]
  query: string
  type: string
}

const DEFAULT_QUERY = 'Arcane'

const typeIconMap: Record<MediaType, LucideIcon> = {
  movie: Clapperboard,
  tv: Tv,
  anime: Sparkles,
  song: Music2,
  album: Disc3,
  game: Gamepad2,
}

const STATIC_COLLECTION: SearchCategory[] = []
const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
  { id: 'anime', label: 'Anime' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'albums', label: 'Albums' },
  { id: 'games', label: 'Games' },
]

const MOVIE_CATEGORY_BASE: SearchCategory = {
  id: 'movies',
  title: 'Movies',
  helper: 'Live data from TMDB',
  items: [],
}

const TV_CATEGORY_BASE: SearchCategory = {
  id: 'tv',
  title: 'TV Shows',
  helper: 'Live data from TMDB',
  items: [],
}

const ANIME_CATEGORY_BASE: SearchCategory = {
  id: 'anime',
  title: 'Anime',
  helper: 'Live data from AniList',
  items: [],
}

const TRACKS_CATEGORY_BASE: SearchCategory = {
  id: 'tracks',
  title: 'Tracks',
  helper: 'Live data from Spotify',
  items: [],
}

const ALBUMS_CATEGORY_BASE: SearchCategory = {
  id: 'albums',
  title: 'Albums',
  helper: 'Live data from Spotify',
  items: [],
}

const GAMES_CATEGORY_BASE: SearchCategory = {
  id: 'games',
  title: 'Games',
  helper: 'Live data from IGDB',
  items: [],
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 text-sm text-muted-foreground">
          Loading search…
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  )
}

function SearchPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, apiFetch, openAuthDialog } = useAuth()
  const [ratedKeys, setRatedKeys] = useState<Set<string>>(() => new Set())
  const [ratedValues, setRatedValues] = useState<Map<string, number>>(
    () => new Map(),
  )
  const [addedKeys, setAddedKeys] = useState<Set<string>>(() => new Set())
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(() =>
    parseCategoryFilter(searchParams.get('category')),
  )
  const [addOpen, setAddOpen] = useState(false)
  const [addItem, setAddItem] = useState<SearchResultItem | null>(null)
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [lists, setLists] = useState<
    Array<{ id: string; title: string; description: string | null }>
  >([])
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [createAndAddSaving, setCreateAndAddSaving] = useState(false)
  const [addSavingListId, setAddSavingListId] = useState<string | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const [rateItem, setRateItem] = useState<SearchResultItem | null>(null)
  const [rateStatus, setRateStatus] = useState<EntryStatus>('Planning')
  const [rateRating, setRateRating] = useState<number>(0)
  const [rateNotes, setRateNotes] = useState('')
  const [rateLoading, setRateLoading] = useState(false)
  const [rateSaving, setRateSaving] = useState(false)
  const [movieCategory, setMovieCategory] =
    useState<SearchCategory>(MOVIE_CATEGORY_BASE)
  const [tvCategory, setTvCategory] = useState<SearchCategory>(TV_CATEGORY_BASE)
  const [animeCategory, setAnimeCategory] =
    useState<SearchCategory>(ANIME_CATEGORY_BASE)
  const [tracksCategory, setTracksCategory] =
    useState<SearchCategory>(TRACKS_CATEGORY_BASE)
  const [albumsCategory, setAlbumsCategory] =
    useState<SearchCategory>(ALBUMS_CATEGORY_BASE)
  const [gamesCategory, setGamesCategory] =
    useState<SearchCategory>(GAMES_CATEGORY_BASE)
  const [isLoading, setIsLoading] = useState(false)
  const [categoryErrors, setCategoryErrors] = useState<
    Partial<Record<LiveCategoryType, string>>
  >({})
  const paramQuery = searchParams.get('query') ?? ''
  const searchQuery = searchParams.has('query') ? paramQuery : DEFAULT_QUERY
  const [queryDraft, setQueryDraft] = useState(searchQuery)

  useEffect(() => {
    setQueryDraft(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (!user) {
      setRatedKeys(new Set())
      setRatedValues(new Map())
      setAddedKeys(new Set())
      return
    }

    const controller = new AbortController()

    const load = async () => {
      try {
        const response = await apiFetch('/api/ratings', {
          signal: controller.signal,
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Unable to load ratings.')
        }

        const payload = (await response.json()) as {
          items?: Array<{
            rating?: number
            media?: { provider?: string; providerId?: string } | null
          }>
        }

        const next = new Set<string>()
        const nextValues = new Map<string, number>()
        for (const item of payload.items ?? []) {
          const provider = item.media?.provider
          const providerId = item.media?.providerId
          if (provider && providerId) {
            const key = `${provider}:${providerId}`
            next.add(key)
            const rating =
              typeof item.rating === 'number' && Number.isFinite(item.rating)
                ? item.rating
                : null
            if (rating !== null) {
              nextValues.set(key, rating)
            }
          }
        }
        setRatedKeys(next)
        setRatedValues(nextValues)
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error(error)
      }
    }

    void load()
    return () => controller.abort()
  }, [apiFetch, user])

  useEffect(() => {
    const next = parseCategoryFilter(searchParams.get('category'))
    setActiveFilter((prev) => (prev === next ? prev : next))
  }, [searchParams])

  const updateCategoryFilter = (next: CategoryFilter) => {
    setActiveFilter(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') params.delete('category')
    else params.set('category', next)
    const queryString = params.toString()
    router.replace(`/search${queryString ? `?${queryString}` : ''}`, {
      scroll: false,
    })
  }

  useEffect(() => {
    if (!searchParams.has('query')) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('query', DEFAULT_QUERY)
      router.replace(`/search?${params.toString()}`, { scroll: false })
    }
  }, [router, searchParams])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()

    if (!trimmedQuery) {
      setMovieCategory(MOVIE_CATEGORY_BASE)
      setTvCategory(TV_CATEGORY_BASE)
      setAnimeCategory(ANIME_CATEGORY_BASE)
      setTracksCategory(TRACKS_CATEGORY_BASE)
      setAlbumsCategory(ALBUMS_CATEGORY_BASE)
      setGamesCategory(GAMES_CATEGORY_BASE)
      setCategoryErrors({})
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setMovieCategory(MOVIE_CATEGORY_BASE)
    setTvCategory(TV_CATEGORY_BASE)
    setAnimeCategory(ANIME_CATEGORY_BASE)
    setTracksCategory(TRACKS_CATEGORY_BASE)
    setAlbumsCategory(ALBUMS_CATEGORY_BASE)
    setGamesCategory(GAMES_CATEGORY_BASE)
    setIsLoading(true)
    setCategoryErrors({})

    const fetchCategory = async (categoryType: LiveCategoryType) => {
      try {
        const response = await fetch(
          `/api/search?type=${categoryType}&query=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Search failed.')
        }

        const payload = (await response.json()) as SearchApiResponse

        if (controller.signal.aborted) {
          return
        }

        if (categoryType === 'movie') {
          setMovieCategory((current) => ({
            ...current,
            items: payload.items,
          }))
        } else if (categoryType === 'tv') {
          setTvCategory((current) => ({
            ...current,
            items: payload.items,
          }))
        } else if (categoryType === 'anime') {
          setAnimeCategory((current) => ({
            ...current,
            items: payload.items,
          }))
        } else if (categoryType === 'track') {
          setTracksCategory((current) => ({
            ...current,
            items: payload.items,
          }))
        } else if (categoryType === 'album') {
          setAlbumsCategory((current) => ({
            ...current,
            items: payload.items,
          }))
        } else {
          setGamesCategory((current) => ({
            ...current,
            items: payload.items,
          }))
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }
        console.error(fetchError)
        if (!controller.signal.aborted) {
          setCategoryErrors((previous) => ({
            ...previous,
            [categoryType]:
              fetchError instanceof Error && fetchError.message
                ? fetchError.message
                : 'Unable to load results. Try again in a moment.',
          }))
        }
      }
    }

    const tasks: Array<Promise<void>> = []
    tasks.push(fetchCategory('movie'))
    tasks.push(fetchCategory('tv'))
    tasks.push(fetchCategory('anime'))
    tasks.push(fetchCategory('track'))
    tasks.push(fetchCategory('album'))
    tasks.push(fetchCategory('game'))

    if (tasks.length === 0) {
      setIsLoading(false)
      return () => controller.abort()
    }

    Promise.allSettled(tasks).finally(() => {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    })

    return () => controller.abort()
  }, [searchQuery])

  const filteredStaticCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return STATIC_COLLECTION.map((category) => {
      const items = query
        ? category.items.filter((item) =>
            item.title.toLowerCase().includes(query),
          )
        : category.items

      return { ...category, items }
    }).filter((category) => category.items.length > 0)
  }, [searchQuery])

  const filteredCategories = useMemo(() => {
    const categories: SearchCategory[] = []

    if (movieCategory.items.length > 0) {
      categories.push(movieCategory)
    }

    if (tvCategory.items.length > 0) {
      categories.push(tvCategory)
    }

    if (animeCategory.items.length > 0) {
      categories.push(animeCategory)
    }

    if (tracksCategory.items.length > 0) {
      categories.push(tracksCategory)
    }

    if (albumsCategory.items.length > 0) {
      categories.push(albumsCategory)
    }

    if (gamesCategory.items.length > 0) {
      categories.push(gamesCategory)
    }

    categories.push(...filteredStaticCategories)

    return categories
  }, [
    movieCategory,
    tvCategory,
    animeCategory,
    tracksCategory,
    albumsCategory,
    gamesCategory,
    filteredStaticCategories,
  ])

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
    tv: getCategoryCount('tv'),
    anime: getCategoryCount('anime'),
    tracks: getCategoryCount('tracks'),
    albums: getCategoryCount('albums'),
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

    router.push(`/search${queryString ? `?${queryString}` : ''}`, {
      scroll: false,
    })
  }

  const handleAdd = async (item: SearchResultItem) => {
    if (!user) {
      openAuthDialog('login')
      return
    }

    if (!item.provider || !item.providerId) {
      toast('This item cannot be added to a list yet.')
      return
    }

    try {
      setAddItem(item)
      setAddOpen(true)
      setListsLoading(true)
      setListsError(null)

      const response = await apiFetch('/api/lists')
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
        error instanceof Error ? error.message : 'Unable to save entry.',
      )
      setListsError(error instanceof Error ? error.message : 'Unable to load.')
    } finally {
      setListsLoading(false)
    }
  }

  const addToList = async (listId: string) => {
    if (!user || !addItem?.provider || !addItem?.providerId) return
    setAddSavingListId(listId)
    try {
      const response = await apiFetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media: {
            provider: addItem.provider,
            providerId: addItem.providerId,
            type: addItem.type,
            title: addItem.title,
            posterUrl: addItem.coverUrl,
            description: addItem.description,
          },
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to add to list.')
      }

      toast.success(
        `Added ${addItem.title} to "${lists.find((l) => l.id === listId)?.title ?? 'list'}".`,
      )
      setAddedKeys((prev) => {
        const next = new Set(prev)
        next.add(`${addItem.provider}:${addItem.providerId}`)
        return next
      })
      setAddOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Unable to add.')
    } finally {
      setAddSavingListId(null)
    }
  }

  const createListAndAdd = async () => {
    if (!user || !addItem) return
    const title = newListTitle.trim()
    if (!title) {
      toast('List title is required.')
      return
    }

    setCreateAndAddSaving(true)
    try {
      const createRes = await apiFetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  const handleSelect = (item: SearchResultItem) => {
    router.push(`/media/${item.id}`)
  }

  const handleRate = async (item: SearchResultItem) => {
    if (!user) {
      openAuthDialog('login')
      return
    }

    if (!item.provider || !item.providerId) {
      toast('This item cannot be rated yet.')
      return
    }

    setRateItem(item)
    setRateOpen(true)
    setRateLoading(true)

    try {
      const response = await apiFetch(
        `/api/list?provider=${encodeURIComponent(
          item.provider,
        )}&sourceId=${encodeURIComponent(item.providerId)}`,
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to load saved entry.')
      }

      const payload = (await response.json()) as {
        entry: { status?: EntryStatus; rating?: number; note?: string } | null
      }

      setRateStatus(payload.entry?.status ?? 'Planning')
      setRateRating(payload.entry?.rating ?? 0)
      setRateNotes(payload.entry?.note ?? '')
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Unable to load saved entry.',
      )
      setRateStatus('Planning')
      setRateRating(0)
      setRateNotes('')
    } finally {
      setRateLoading(false)
    }
  }

  const saveRate = async () => {
    if (!user || !rateItem?.provider || !rateItem?.providerId) return
    setRateSaving(true)
    try {
      const response = await apiFetch('/api/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media: {
            provider: rateItem.provider,
            providerId: rateItem.providerId,
            type: rateItem.type,
            title: rateItem.title,
            posterUrl: rateItem.coverUrl,
            description: rateItem.description,
          },
          entry: {
            status: rateStatus,
            rating: rateRating > 0 ? rateRating : null,
            note: rateNotes,
          },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to save rating.')
      }

      setRatedKeys((prev) => {
        const next = new Set(prev)
        const key = `${rateItem.provider}:${rateItem.providerId}`
        if (rateRating > 0) next.add(key)
        else next.delete(key)
        return next
      })
      setRatedValues((prev) => {
        const next = new Map(prev)
        const key = `${rateItem.provider}:${rateItem.providerId}`
        if (rateRating > 0) next.set(key, rateRating)
        else next.delete(key)
        return next
      })

      toast.success(`Saved your rating for ${rateItem.title}.`)
      setRateOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Unable to save.')
    } finally {
      setRateSaving(false)
    }
  }

  const showEmptyState = !isLoading && visibleCategories.length === 0

  const searchError = useMemo(() => {
    const entries = Object.entries(categoryErrors).filter(
      (entry): entry is [LiveCategoryType, string] =>
        entry[0] in LIVE_CATEGORY_LABELS &&
        Boolean(entry[1] && entry[1].trim()),
    )

    if (entries.length === 0) return null
    if (entries.length === 1) {
      const [categoryType, message] = entries[0]
      return `${LIVE_CATEGORY_LABELS[categoryType]}: ${message}`
    }

    if (entries.length <= 2) {
      return entries
        .map(
          ([categoryType, message]) =>
            `${LIVE_CATEGORY_LABELS[categoryType]}: ${message}`,
        )
        .join(' \u2022 ')
    }

    const failedLabels = entries
      .map(([categoryType]) => LIVE_CATEGORY_LABELS[categoryType])
      .join(', ')
    return `Some results couldn't be loaded (${failedLabels}).`
  }, [categoryErrors])

  return (
    <div className="space-y-8 pb-12">
      <div
        className="rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur"
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(255,90,111,0.12), rgba(90,169,255,0.12) 45%, rgba(255,255,255,0) 75%)',
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Results for <span className="text-primary">{queryLabel}</span>
              </h1>
              <p className="text-sm text-muted-foreground">{summaryText}</p>
              {isLoading && (
                <p className="text-xs text-muted-foreground">
                  Fetching live results…
                </p>
              )}
              {searchError && (
                <p className="text-xs text-rose-600">{searchError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full border-dashed border-primary/30 bg-primary/10 px-6 text-primary hover:bg-primary/15"
                  aria-label="Open filters"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Search type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={activeFilter}
                  onValueChange={(value) =>
                    updateCategoryFilter(value as CategoryFilter)
                  }
                >
                  {CATEGORY_FILTERS.map((filter) => (
                    <DropdownMenuRadioItem key={filter.id} value={filter.id}>
                      {filter.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    updateSearchQuery(queryDraft)
                  }
                }}
                placeholder="Search movies, TV, anime, tracks, albums…"
                aria-label="Search media"
                className="h-11 w-full rounded-full border border-primary/20 bg-white/80 pl-12 pr-4 text-base focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id
              return (
                <Button
                  key={filter.id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'default' : 'ghost'}
                  className={`rounded-full px-4 ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'border border-white/70 bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                  onClick={() => updateCategoryFilter(filter.id)}
                  style={
                    isActive
                      ? {
                          backgroundImage:
                            'linear-gradient(90deg, #FF5A6F, #6CC6FF)',
                        }
                      : undefined
                  }
                >
                  {filter.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {filterCounts[filter.id]}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {showEmptyState ? (
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
              onRate={handleRate}
              ratedKeys={ratedKeys}
              ratedValues={ratedValues}
              addedKeys={addedKeys}
            />
          ))}
        </div>
      )}

      <Dialog
        open={rateOpen}
        onOpenChange={(open) => {
          setRateOpen(open)
          if (!open) {
            setRateItem(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rateItem ? `Rate: ${rateItem.title}` : 'Rate item'}
            </DialogTitle>
          </DialogHeader>

          {rateLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <StatusSelect
                  value={rateStatus}
                  onChange={setRateStatus}
                  mediaType={rateItem?.type ?? 'movie'}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Rating</label>
                <RatingStars
                  rating={rateRating}
                  interactive
                  onRatingChange={setRateRating}
                  maxRating={10}
                  size="lg"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <Textarea
                  value={rateNotes}
                  onChange={(e) => setRateNotes(e.target.value)}
                  placeholder="Add your thoughts..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRateOpen(false)}
              disabled={rateSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveRate}
              disabled={rateSaving || rateLoading || !rateItem}
            >
              {rateSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setAddItem(null)
            setListsError(null)
            setNewListTitle('')
            setNewListDescription('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addItem ? `Add to list: ${addItem.title}` : 'Add to list'}
            </DialogTitle>
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
                    disabled={createAndAddSaving || !addItem}
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
    </div>
  )
}

interface SearchCategorySectionProps {
  category: SearchCategory
  onAdd: (item: SearchResultItem) => void
  onSelect: (item: SearchResultItem) => void
  onRate: (item: SearchResultItem) => void
  ratedKeys: Set<string>
  ratedValues: Map<string, number>
  addedKeys: Set<string>
}

function SearchCategorySection({
  category,
  onAdd,
  onSelect,
  onRate,
  ratedKeys,
  ratedValues,
  addedKeys,
}: SearchCategorySectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            <span className="text-primary">{category.title}</span>
          </h2>
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

      {category.id === 'tracks' || category.id === 'albums' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {category.items.map((item) => {
            const key =
              item.provider && item.providerId
                ? `${item.provider}:${item.providerId}`
                : null
            const isRated = Boolean(key && ratedKeys.has(key))
            const ratingValue = key ? ratedValues.get(key) : undefined
            const isAdded = Boolean(key && addedKeys.has(key))
            return category.id === 'tracks' ? (
              <TrackSearchResultCard
                key={item.id}
                item={item}
                onAdd={() => onAdd(item)}
                onRate={() => onRate(item)}
                onSelect={() => onSelect(item)}
                isRated={isRated}
                ratingValue={ratingValue}
                isAdded={isAdded}
              />
            ) : (
              <AlbumSearchResultCard
                key={item.id}
                item={item}
                onAdd={() => onAdd(item)}
                onRate={() => onRate(item)}
                onSelect={() => onSelect(item)}
                isRated={isRated}
                ratingValue={ratingValue}
                isAdded={isAdded}
              />
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {category.items.map((item) => (
            <SearchResultCard
              key={item.id}
              item={item}
              onAdd={() => onAdd(item)}
              onRate={() => onRate(item)}
              onSelect={() => onSelect(item)}
              isRated={
                Boolean(item.provider && item.providerId) &&
                ratedKeys.has(`${item.provider}:${item.providerId}`)
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

function formatDuration(seconds: number | undefined): string | null {
  if (
    typeof seconds !== 'number' ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null
  }
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
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

interface TrackSearchResultCardProps {
  item: SearchResultItem
  onAdd: () => void
  onRate: () => void
  onSelect: () => void
  isRated: boolean
  ratingValue?: number
  isAdded: boolean
}

function TrackSearchResultCard({
  item,
  onAdd,
  onRate,
  isRated,
  ratingValue,
  isAdded,
}: TrackSearchResultCardProps) {
  const durationLabel = formatDuration(item.durationSeconds)
  const yearLabel =
    typeof item.year === 'number' && Number.isFinite(item.year)
      ? item.year
      : null

  const artistLine = item.artist ?? item.subtitle
  const tertiaryText = item.album
    ? `${item.album}${yearLabel ? ` • ${yearLabel}` : ''}`
    : yearLabel
      ? String(yearLabel)
      : ''

  const ratedText =
    typeof ratingValue === 'number' && Number.isFinite(ratingValue)
      ? `★ ${Math.round(ratingValue)}/10`
      : 'Rated'

  const openInSpotify = () => {
    if (!item.externalUrl) return
    window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className="hover-lift fade-up group relative flex items-center gap-3 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-sm transition hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40 sm:gap-4 sm:p-4">
      <div className="shrink-0">
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt={`${item.title} artwork`}
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

      <div className="min-w-0 flex-1" data-card-content>
        <div className="space-y-0.5">
          <h3 className="truncate text-base font-semibold leading-tight">
            {item.title}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{artistLine}</p>
          <p className="min-h-4 truncate text-xs text-muted-foreground/80">
            {tertiaryText}
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
          {item.explicit && (
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
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden h-9 w-36 rounded-full px-4 text-xs font-semibold sm:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              onRate()
            }}
          >
            {isRated ? ratedText : '☆ Rate'}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full sm:hidden"
            aria-label={isRated ? ratedText : 'Rate track'}
            onClick={(event) => {
              event.stopPropagation()
              onRate()
            }}
          >
            <Star
              className={cn(
                'h-4 w-4',
                isRated && 'fill-yellow-500 text-yellow-500',
              )}
            />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={isAdded ? 'outline' : 'default'}
            className="hidden h-9 w-36 rounded-full px-4 text-xs font-semibold sm:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              onAdd()
            }}
          >
            {isAdded ? '+ Added' : '+ Add to list'}
          </Button>
          <Button
            type="button"
            size="icon"
            variant={isAdded ? 'outline' : 'default'}
            className="h-9 w-9 rounded-full sm:hidden"
            aria-label={isAdded ? 'Added to list' : 'Add to list'}
            onClick={(event) => {
              event.stopPropagation()
              onAdd()
            }}
          >
            <span className="text-base leading-none">+</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!item.externalUrl}
            className="hidden h-9 w-36 rounded-full bg-[#1DB954] px-4 text-xs font-semibold text-white hover:bg-[#1AA34A] disabled:bg-[#1DB954]/60 disabled:text-white/80 sm:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              openInSpotify()
            }}
          >
            <SpotifyIcon className="h-4 w-4" />
            Spotify
          </Button>
          <Button
            type="button"
            size="icon"
            disabled={!item.externalUrl}
            className="h-9 w-9 rounded-full bg-[#1DB954] text-white hover:bg-[#1AA34A] disabled:bg-[#1DB954]/60 disabled:text-white/80 sm:hidden"
            aria-label="Open in Spotify"
            onClick={(event) => {
              event.stopPropagation()
              openInSpotify()
            }}
          >
            <SpotifyIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

interface AlbumSearchResultCardProps {
  item: SearchResultItem
  onAdd: () => void
  onRate: () => void
  onSelect: () => void
  isRated: boolean
  ratingValue?: number
  isAdded: boolean
}

function AlbumSearchResultCard({
  item,
  onAdd,
  onRate,
  onSelect,
  isRated,
  ratingValue,
  isAdded,
}: AlbumSearchResultCardProps) {
  const yearLabel =
    typeof item.year === 'number' && Number.isFinite(item.year)
      ? item.year
      : null

  const artistLine = item.artist ?? item.subtitle
  const metadataLine = yearLabel
    ? `${artistLine} • ${yearLabel} • Album`
    : `${artistLine} • Album`

  const ratedText =
    typeof ratingValue === 'number' && Number.isFinite(ratingValue)
      ? `★ ${Math.round(ratingValue)}/10`
      : 'Rated'

  const openInSpotify = () => {
    if (!item.externalUrl) return
    window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <article
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
      className="hover-lift fade-up group relative flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-sm transition hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40 focus-visible:outline-none sm:gap-4 sm:p-4"
    >
      <div className="shrink-0">
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt={`${item.title} artwork`}
            width={64}
            height={64}
            className="h-14 w-14 rounded-lg border object-cover shadow-sm sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-slate-50 text-indigo-600 shadow-sm sm:h-16 sm:w-16">
            <Disc3 className="h-7 w-7 opacity-50" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1" data-card-content>
        <div className="space-y-0.5">
          <h3 className="truncate text-base font-semibold leading-tight">
            {item.title}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {metadataLine}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="rounded-full border-dashed px-2 py-0 text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="shrink-0">
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden h-9 w-36 rounded-full px-4 text-xs font-semibold sm:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              onRate()
            }}
          >
            {isRated ? ratedText : '☆ Rate'}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full sm:hidden"
            aria-label={isRated ? ratedText : 'Rate album'}
            onClick={(event) => {
              event.stopPropagation()
              onRate()
            }}
          >
            <Star
              className={cn(
                'h-4 w-4',
                isRated && 'fill-yellow-500 text-yellow-500',
              )}
            />
          </Button>

          <Button
            type="button"
            size="sm"
            variant={isAdded ? 'outline' : 'default'}
            className="hidden h-9 w-36 rounded-full px-4 text-xs font-semibold sm:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              onAdd()
            }}
          >
            {isAdded ? '+ Added' : '+ Add to list'}
          </Button>
          <Button
            type="button"
            size="icon"
            variant={isAdded ? 'outline' : 'default'}
            className="h-9 w-9 rounded-full sm:hidden"
            aria-label={isAdded ? 'Added to list' : 'Add to list'}
            onClick={(event) => {
              event.stopPropagation()
              onAdd()
            }}
          >
            <span className="text-base leading-none">+</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!item.externalUrl}
            className="hidden h-9 w-36 rounded-full bg-[#1DB954] px-4 text-xs font-semibold text-white hover:bg-[#1AA34A] disabled:bg-[#1DB954]/60 disabled:text-white/80 sm:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              openInSpotify()
            }}
          >
            <SpotifyIcon className="h-4 w-4" />
            Spotify
          </Button>
          <Button
            type="button"
            size="icon"
            disabled={!item.externalUrl}
            className="h-9 w-9 rounded-full bg-[#1DB954] text-white hover:bg-[#1AA34A] disabled:bg-[#1DB954]/60 disabled:text-white/80 sm:hidden"
            aria-label="Open in Spotify"
            onClick={(event) => {
              event.stopPropagation()
              openInSpotify()
            }}
          >
            <SpotifyIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

interface SearchResultCardProps {
  item: SearchResultItem
  onAdd: () => void
  onRate: () => void
  onSelect: () => void
  isRated: boolean
}

function SearchResultCard({
  item,
  onAdd,
  onRate,
  onSelect,
  isRated,
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
      className="hover-lift fade-up flex flex-col gap-3 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-sm transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:flex-row md:items-stretch"
    >
      <div className="flex flex-1 gap-4">
        <div className="relative w-24 aspect-[2/3] flex-shrink-0 overflow-hidden rounded-xl">
          {item.coverUrl ? (
            <Image
              src={item.coverUrl}
              alt={item.title}
              fill
              sizes="96px"
              className="object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-indigo-600">
              <TypeIcon className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex h-full flex-col gap-1 md:self-stretch">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="h-7 line-clamp-1 text-lg font-semibold leading-tight">
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
          <p className="h-10 line-clamp-2 text-sm text-muted-foreground">
            {item.description ?? ''}
          </p>
          <div className="mt-auto flex h-7 flex-wrap gap-2 overflow-hidden">
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
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 md:w-36 md:self-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onRate()
          }}
          className="w-full rounded-full text-sm font-semibold"
        >
          {isRated ? '★ Rated' : '☆ Rate'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
          className="w-full rounded-full text-sm font-semibold"
        >
          + Add to list
        </Button>
      </div>
    </div>
  )
}
