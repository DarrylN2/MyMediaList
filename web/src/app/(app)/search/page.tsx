'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
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
import type { LucideIcon } from 'lucide-react'
import {
  Clapperboard,
  Filter,
  Gamepad2,
  Heart,
  Music2,
  Search as SearchIcon,
  Sparkles,
  Tv,
} from 'lucide-react'
import { toast } from 'sonner'

type CategoryId = 'movies' | 'tv' | 'anime' | 'songs' | 'games'
type CategoryFilter = 'all' | CategoryId

function parseCategoryFilter(raw: string | null): CategoryFilter {
  const value = (raw ?? 'all').toLowerCase()
  if (value === 'all') return 'all'
  if (
    value === 'movies' ||
    value === 'tv' ||
    value === 'anime' ||
    value === 'songs' ||
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
  game: Gamepad2,
}

const STATIC_COLLECTION: SearchCategory[] = [
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
  { id: 'tv', label: 'TV Shows' },
  { id: 'anime', label: 'Anime' },
  { id: 'songs', label: 'Songs/Albums' },
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

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [ratedKeys, setRatedKeys] = useState<Set<string>>(() => new Set())
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paramQuery = searchParams.get('query') ?? ''
  const searchQuery = searchParams.has('query') ? paramQuery : DEFAULT_QUERY
  const [queryDraft, setQueryDraft] = useState(searchQuery)

  useEffect(() => {
    setQueryDraft(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (!user?.email) {
      setRatedKeys(new Set())
      return
    }

    const controller = new AbortController()

    const load = async () => {
      try {
        const response = await fetch(
          `/api/ratings?userId=${encodeURIComponent(user.email)}`,
          { signal: controller.signal },
        )
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Unable to load ratings.')
        }

        const payload = (await response.json()) as {
          items?: Array<{
            media?: { provider?: string; providerId?: string } | null
          }>
        }

        const next = new Set<string>()
        for (const item of payload.items ?? []) {
          const provider = item.media?.provider
          const providerId = item.media?.providerId
          if (provider && providerId) {
            next.add(`${provider}:${providerId}`)
          }
        }
        setRatedKeys(next)
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        console.error(error)
      }
    }

    void load()
    return () => controller.abort()
  }, [user?.email])

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
      setError(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setMovieCategory(MOVIE_CATEGORY_BASE)
    setTvCategory(TV_CATEGORY_BASE)
    setAnimeCategory(ANIME_CATEGORY_BASE)
    setIsLoading(true)
    setError(null)

    const fetchCategory = async (categoryType: 'movie' | 'tv' | 'anime') => {
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
        } else {
          setAnimeCategory((current) => ({
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
          setError(
            (previous) =>
              previous ?? 'Unable to load results. Try again in a moment.',
          )
        }
      }
    }

    const shouldFetchMovie = activeFilter === 'all' || activeFilter === 'movies'
    const shouldFetchTv = activeFilter === 'all' || activeFilter === 'tv'
    const shouldFetchAnime = activeFilter === 'all' || activeFilter === 'anime'
    const tasks: Array<Promise<void>> = []
    if (shouldFetchMovie) tasks.push(fetchCategory('movie'))
    if (shouldFetchTv) tasks.push(fetchCategory('tv'))
    if (shouldFetchAnime) tasks.push(fetchCategory('anime'))

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
  }, [searchQuery, activeFilter])

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

    categories.push(...filteredStaticCategories)

    return categories
  }, [movieCategory, tvCategory, animeCategory, filteredStaticCategories])

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

    router.push(`/search${queryString ? `?${queryString}` : ''}`, {
      scroll: false,
    })
  }

  const handleAdd = async (item: SearchResultItem) => {
    if (!user) {
      toast('Log in to add items to your list.')
      return
    }

    if (!item.provider || !item.providerId) {
      toast(
        'Live saving is currently available for movie/anime search results only.',
      )
      return
    }

    try {
      setAddItem(item)
      setAddOpen(true)
      setListsLoading(true)
      setListsError(null)

      const response = await fetch(
        `/api/lists?userId=${encodeURIComponent(user.email)}`,
      )
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
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
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
      const createRes = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
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
      toast('Log in to rate items.')
      return
    }

    if (!item.provider || !item.providerId) {
      toast(
        'Rating is currently available for movie/anime search results only.',
      )
      return
    }

    setRateItem(item)
    setRateOpen(true)
    setRateLoading(true)

    try {
      const response = await fetch(
        `/api/list?provider=${encodeURIComponent(
          item.provider,
        )}&sourceId=${encodeURIComponent(
          item.providerId,
        )}&userId=${encodeURIComponent(user.email)}`,
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
      const response = await fetch('/api/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
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

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur">
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
              {isLoading && (
                <p className="text-xs text-muted-foreground">
                  Fetching live TMDB results…
                </p>
              )}
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
            <Badge className="rounded-full border border-indigo-100 bg-indigo-50 text-xs font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" />
              Smart suggestions on
            </Badge>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-full border-dashed px-6"
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
                onClick={() => updateCategoryFilter(filter.id)}
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
}

function SearchCategorySection({
  category,
  onAdd,
  onSelect,
  onRate,
  ratedKeys,
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
    </section>
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
      className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:flex-row md:items-stretch"
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
          {isRated ? 'Rated' : 'Rate'}
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
          Add to list
        </Button>
      </div>
    </div>
  )
}
