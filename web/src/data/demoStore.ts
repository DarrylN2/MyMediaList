import type { DashboardEntry } from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'
import type { EntryStatus, Media, MediaProvider, MediaType } from '@/types'

const DEMO_VERSION = 1
const DEMO_STORAGE_KEY = 'mml:demoState:v1'
const DEMO_SEED_KEY = 'mml:demoSeed:v1'

type DemoEntry = {
  status: EntryStatus
  rating: number | null
  note: string | null
  episodeProgress: number | null
  updatedAt: string
  firstRatedAt: string | null
}

export type DemoListItem = {
  id: string
  createdAt: string
  media: Media
  entry: DemoEntry | null
}

export type DemoList = {
  id: string
  title: string
  description: string
  updatedAt: string
  items: DemoListItem[]
}

export type DemoState = {
  version: number
  seed: number
  entries: DashboardEntry[]
  lists: DemoList[]
}

export const demoListDefinitions: Array<{
  id: string
  title: string
  description: string
  types: MediaType[]
}> = [
  {
    id: 'demo-movies',
    title: 'Movies List',
    description: 'A mix of standout films across styles and eras.',
    types: ['movie', 'tv'],
  },
  {
    id: 'demo-anime',
    title: 'Anime List',
    description: 'Big stories, bold characters, and binge-worthy arcs.',
    types: ['anime'],
  },
  {
    id: 'demo-games',
    title: 'Games List',
    description: 'Adventures, combat loops, and late-night sessions.',
    types: ['game'],
  },
  {
    id: 'demo-music',
    title: 'Tracks List',
    description: 'Albums and tracks on repeat right now.',
    types: ['song', 'album'],
  },
]

type SearchResultItem = {
  title: string
  description?: string
  coverUrl?: string
  tags?: string[]
  type: MediaType
  provider: MediaProvider
  providerId: string
  year?: number
  durationSeconds?: number
}

const DEMO_QUERIES: Record<MediaType, string[]> = {
  movie: ['matrix', 'inception', 'dune', 'interstellar', 'mad max'],
  tv: ['breaking bad', 'stranger things', 'the office', 'severance'],
  anime: ['attack on titan', 'demon slayer', 'jujutsu kaisen', 'fullmetal'],
  game: ['elden ring', 'witcher 3', 'hades', 'celeste', 'stardew valley'],
  song: ['billie eilish', 'the weeknd', 'daft punk', 'arctic monkeys'],
  album: ['taylor swift', 'kendrick lamar', 'radiohead', 'drake'],
}

const STATUS_BY_TYPE: Record<MediaType, EntryStatus[]> = {
  movie: ['Completed', 'Watching', 'Planning'],
  tv: ['Watching', 'Completed', 'Planning'],
  anime: ['Watching', 'Completed', 'Planning'],
  game: ['Playing', 'Completed', 'Planning'],
  song: ['Listening', 'Completed'],
  album: ['Listening', 'Completed'],
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function loadStoredState(): DemoState | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DemoState
    if (parsed?.version !== DEMO_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function storeState(state: DemoState) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write errors
  }
}

function getSeed(): number {
  if (!isBrowser()) return 1
  try {
    const raw = window.localStorage.getItem(DEMO_SEED_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) return parsed
    }
    const seed = Math.floor(Math.random() * 1000000000)
    window.localStorage.setItem(DEMO_SEED_KEY, String(seed))
    return seed
  } catch {
    return Math.floor(Math.random() * 1000000000)
  }
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithRng<T>(items: T[], rng: () => number) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function mediaKey(media: {
  provider: MediaProvider
  providerId: string
  type: MediaType
}) {
  return `${media.provider}:${media.type}:${media.providerId}`
}

async function fetchSearchResults(
  type: MediaType,
  query: string,
): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(
      `/api/search?type=${encodeURIComponent(
        type === 'song' ? 'track' : type,
      )}&query=${encodeURIComponent(query)}`,
    )
    if (!res.ok) return []
    const payload = (await res.json()) as { items?: SearchResultItem[] }
    return Array.isArray(payload.items) ? payload.items : []
  } catch {
    return []
  }
}

async function fetchMediaDetail(item: SearchResultItem): Promise<Media | null> {
  try {
    const res = await fetch(
      `/api/media/${encodeURIComponent(
        item.provider,
      )}/${encodeURIComponent(item.providerId)}?type=${encodeURIComponent(
        item.type,
      )}`,
    )
    if (!res.ok) return null
    const payload = (await res.json()) as { media?: Media }
    return payload.media ?? null
  } catch {
    return null
  }
}

async function fetchMediaByProviderId(
  provider: MediaProvider,
  providerId: string,
  type: MediaType,
): Promise<Media | null> {
  try {
    const res = await fetch(
      `/api/media/${encodeURIComponent(provider)}/${encodeURIComponent(
        providerId,
      )}?type=${encodeURIComponent(type)}`,
    )
    if (!res.ok) return null
    const payload = (await res.json()) as { media?: Media }
    return payload.media ?? null
  } catch {
    return null
  }
}

const DEMO_MEDIA_REPLACEMENTS: Array<{
  matchTitle: string
  provider: MediaProvider
  providerId: string
  type: MediaType
  fallback: Media
}> = [
  {
    matchTitle: 'container interstellar',
    provider: 'tmdb',
    providerId: '299536',
    type: 'movie',
    fallback: {
      id: buildMediaRouteId({
        provider: 'tmdb',
        providerId: '299536',
        type: 'movie',
      }),
      type: 'movie',
      title: 'Avengers: Infinity War',
      year: 2018,
      posterUrl:
        'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
      backdropUrl:
        'https://image.tmdb.org/t/p/w1280/52AfXWuXCHn3UjD17rBruA9f5qb.jpg',
      provider: 'tmdb',
      providerId: '299536',
      description:
        'The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos.',
      genres: ['Action', 'Adventure', 'Sci-Fi'],
    },
  },
]

async function resolveReplacement(media: Media): Promise<Media> {
  const match = DEMO_MEDIA_REPLACEMENTS.find(
    (entry) => media.title.toLowerCase() === entry.matchTitle,
  )
  if (!match) return media
  const replacement = await fetchMediaByProviderId(
    match.provider,
    match.providerId,
    match.type,
  )
  return replacement ?? match.fallback
}

function fallbackMedia(item: SearchResultItem): Media {
  return {
    id: buildMediaRouteId({
      provider: item.provider,
      providerId: item.providerId,
      type: item.type,
    }),
    type: item.type,
    title: item.title,
    year: item.year,
    posterUrl: item.coverUrl,
    provider: item.provider,
    providerId: item.providerId,
    description: item.description,
    durationMinutes:
      typeof item.durationSeconds === 'number'
        ? Math.max(1, Math.round(item.durationSeconds / 60))
        : undefined,
    genres: item.tags ?? [],
  }
}

async function collectMediaByType(
  type: MediaType,
  count: number,
  rng: () => number,
) {
  const queries = DEMO_QUERIES[type]
  const ordered = shuffleWithRng(queries, rng)
  const results: SearchResultItem[] = []
  const seen = new Set<string>()

  for (const query of ordered) {
    const items = await fetchSearchResults(type, query)
    for (const item of items) {
      const key = mediaKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      results.push(item)
    }
    if (results.length >= count) break
  }

  const withImages = results.filter((item) => item.coverUrl)
  const pool = withImages.length >= count ? withImages : results
  return shuffleWithRng(pool, rng).slice(0, count)
}

function toDashboardEntry(
  media: Media,
  input: {
    status: EntryStatus
    rating: number | null
    note?: string | null
    episodeProgress?: number | null
    createdAt: string
    updatedAt: string
  },
): DashboardEntry {
  return {
    status: input.status,
    rating: input.rating,
    note: input.note ?? null,
    episodeProgress: input.episodeProgress ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    media: {
      title: media.title,
      posterUrl: media.posterUrl ?? null,
      description: media.description ?? null,
      type: media.type,
      provider: media.provider,
      providerId: media.providerId,
      year: media.year ?? null,
      durationMinutes: media.durationMinutes ?? null,
      episodeCount: media.episodeCount ?? null,
      genres: media.genres ?? null,
    },
  }
}

function ratingForStatus(
  status: EntryStatus,
  rng: () => number,
  preferred: number | null = null,
) {
  if (status === 'Planning' || status === 'Dropped') return null
  if (preferred != null) return preferred
  return Math.max(6, Math.round(rng() * 4 + 6))
}

function episodeProgressForStatus(
  status: EntryStatus,
  media: Media,
  rng: () => number,
) {
  if (status !== 'Watching' && status !== 'Dropped') return null
  const max =
    typeof media.episodeCount === 'number' && media.episodeCount > 0
      ? media.episodeCount
      : 12
  return Math.max(1, Math.min(max, Math.round(rng() * max)))
}

function buildDemoLists(entries: DashboardEntry[], now: Date): DemoList[] {
  return demoListDefinitions.map((definition) => {
    const items = entries
      .filter((entry) => definition.types.includes(entry.media.type))
      .map((entry, index) => {
        const entryDate = entry.createdAt
        const routeId = buildMediaRouteId({
          provider: entry.media.provider,
          providerId: entry.media.providerId,
          type: entry.media.type,
        })
        const media: Media = {
          id: routeId,
          type: entry.media.type,
          title: entry.media.title,
          year: entry.media.year ?? undefined,
          posterUrl: entry.media.posterUrl ?? undefined,
          provider: entry.media.provider,
          providerId: entry.media.providerId,
          description: entry.media.description ?? undefined,
          durationMinutes: entry.media.durationMinutes ?? undefined,
          episodeCount: entry.media.episodeCount ?? undefined,
          genres: entry.media.genres ?? undefined,
        }

        return {
          id: `${definition.id}-${index}`,
          createdAt: entryDate,
          media,
          entry: {
            status: entry.status,
            rating: entry.rating ?? null,
            note: entry.note ?? null,
            episodeProgress: entry.episodeProgress ?? null,
            updatedAt: entry.updatedAt,
            firstRatedAt: entry.rating ? entryDate : null,
          },
        }
      })

    const updatedAt =
      items.find((item) => item.entry?.updatedAt)?.entry?.updatedAt ??
      now.toISOString()

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      updatedAt,
      items,
    }
  })
}

async function createDemoState(): Promise<DemoState> {
  const seed = getSeed()
  const rng = mulberry32(seed)

  const plans: Array<{ type: MediaType; count: number }> = [
    { type: 'movie', count: 6 },
    { type: 'tv', count: 4 },
    { type: 'anime', count: 6 },
    { type: 'game', count: 6 },
    { type: 'album', count: 3 },
    { type: 'song', count: 3 },
  ]

  const searchItems = await Promise.all(
    plans.map((plan) => collectMediaByType(plan.type, plan.count, rng)),
  )
  const flatItems = searchItems.flat()
  const uniqueMap = new Map<string, SearchResultItem>()
  for (const item of flatItems) {
    uniqueMap.set(mediaKey(item), item)
  }

  const uniqueItems = shuffleWithRng(Array.from(uniqueMap.values()), rng)
  const mediaDetails = await Promise.all(
    uniqueItems.map(async (item) => {
      const detail = await fetchMediaDetail(item)
      return detail ?? fallbackMedia(item)
    }),
  )
  const normalizedMedia = await Promise.all(
    mediaDetails.map((media) => resolveReplacement(media)),
  )

  const now = new Date()
  const entries: DashboardEntry[] = []
  const statusesByType = STATUS_BY_TYPE

  normalizedMedia.forEach((media, index) => {
    const statusOptions = statusesByType[media.type]
    const status =
      statusOptions[Math.floor(rng() * statusOptions.length)] ?? 'Planning'
    const createdAt = new Date(now.getTime() - index * 86400000).toISOString()
    const updatedAt = createdAt
    const rating = index === 0 ? 10 : ratingForStatus(status, rng, null)
    const episodeProgress = episodeProgressForStatus(status, media, rng)

    entries.push(
      toDashboardEntry(media, {
        status,
        rating,
        note: rating ? 'Saved to demo list.' : null,
        episodeProgress,
        createdAt,
        updatedAt,
      }),
    )
  })

  const lists = buildDemoLists(entries, now)

  return { version: DEMO_VERSION, seed, entries, lists }
}

async function normalizeDemoState(state: DemoState): Promise<DemoState> {
  const needsReplacement = state.entries.some((entry) =>
    DEMO_MEDIA_REPLACEMENTS.some(
      (replacement) =>
        entry.media.title.toLowerCase() === replacement.matchTitle,
    ),
  )
  if (!needsReplacement) return state

  const replacements = new Map<string, Media>()
  for (const entry of state.entries) {
    const media = entry.media
    const match = DEMO_MEDIA_REPLACEMENTS.find(
      (replacement) => media.title.toLowerCase() === replacement.matchTitle,
    )
    if (!match) continue
    const replacement =
      (await fetchMediaByProviderId(
        match.provider,
        match.providerId,
        match.type,
      )) ?? match.fallback
    replacements.set(match.matchTitle, replacement)
  }

  const replaceMedia = (media: DashboardEntry['media']) => {
    const replacement = replacements.get(media.title.toLowerCase())
    if (!replacement) return media
    return {
      title: replacement.title,
      posterUrl: replacement.posterUrl ?? null,
      description: replacement.description ?? null,
      type: replacement.type,
      provider: replacement.provider,
      providerId: replacement.providerId,
      year: replacement.year ?? null,
      durationMinutes: replacement.durationMinutes ?? null,
      episodeCount: replacement.episodeCount ?? null,
      genres: replacement.genres ?? null,
    }
  }

  const entries = state.entries.map((entry) => ({
    ...entry,
    media: replaceMedia(entry.media),
  }))

  const lists = state.lists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      const replacement = replacements.get(item.media.title.toLowerCase())
      if (!replacement) return item
      return {
        ...item,
        media: replacement,
      }
    }),
  }))

  return { ...state, entries, lists }
}

export async function ensureDemoState(): Promise<DemoState> {
  const stored = loadStoredState()
  if (stored) {
    const normalized = await normalizeDemoState(stored)
    storeState(normalized)
    return normalized
  }
  const fresh = await createDemoState()
  storeState(fresh)
  return fresh
}

export function getDemoState(): DemoState | null {
  return loadStoredState()
}

export function updateDemoEntry(
  media: {
    provider: MediaProvider
    providerId: string
    type: MediaType
    title: string
    posterUrl?: string | null
    description?: string | null
    year?: number | null
    durationMinutes?: number | null
    episodeCount?: number | null
    genres?: string[] | null
  },
  patch: Partial<{
    status: EntryStatus
    rating: number | null
    note: string | null
    episodeProgress: number | null
  }>,
): DemoState | null {
  const state = loadStoredState()
  if (!state) return null

  const now = new Date().toISOString()
  const key = mediaKey(media)

  const entries = state.entries.map((entry) => {
    if (mediaKey(entry.media) !== key) return entry
    return {
      ...entry,
      status: patch.status ?? entry.status,
      rating:
        patch.rating !== undefined ? patch.rating : (entry.rating ?? null),
      note: patch.note !== undefined ? patch.note : (entry.note ?? null),
      episodeProgress:
        patch.episodeProgress !== undefined
          ? patch.episodeProgress
          : (entry.episodeProgress ?? null),
      updatedAt: now,
    }
  })

  const existing = entries.find((entry) => mediaKey(entry.media) === key)

  const nextEntries =
    existing != null
      ? entries
      : [
          toDashboardEntry(
            {
              id: buildMediaRouteId(media),
              type: media.type,
              title: media.title,
              year: media.year ?? undefined,
              posterUrl: media.posterUrl ?? undefined,
              provider: media.provider,
              providerId: media.providerId,
              description: media.description ?? undefined,
              durationMinutes: media.durationMinutes ?? undefined,
              episodeCount: media.episodeCount ?? undefined,
              genres: media.genres ?? undefined,
            },
            {
              status: patch.status ?? 'Planning',
              rating: patch.rating ?? null,
              note: patch.note ?? null,
              episodeProgress: patch.episodeProgress ?? null,
              createdAt: now,
              updatedAt: now,
            },
          ),
          ...entries,
        ]

  const lists = state.lists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      if (mediaKey(item.media) !== key || !item.entry) return item
      const rating =
        patch.rating !== undefined ? patch.rating : item.entry.rating
      return {
        ...item,
        entry: {
          ...item.entry,
          status: patch.status ?? item.entry.status,
          rating,
          note: patch.note !== undefined ? patch.note : item.entry.note,
          episodeProgress:
            patch.episodeProgress !== undefined
              ? patch.episodeProgress
              : item.entry.episodeProgress,
          updatedAt: now,
          firstRatedAt:
            rating && !item.entry.firstRatedAt
              ? item.createdAt
              : item.entry.firstRatedAt,
        },
      }
    }),
  }))

  const nextState: DemoState = {
    ...state,
    entries: nextEntries,
    lists,
  }
  storeState(nextState)
  return nextState
}

export function updateDemoListMeta(
  listId: string,
  patch: Partial<{ title: string; description: string }>,
): DemoState | null {
  const state = loadStoredState()
  if (!state) return null
  const lists = state.lists.map((list) =>
    list.id === listId
      ? {
          ...list,
          title: patch.title ?? list.title,
          description: patch.description ?? list.description,
          updatedAt: new Date().toISOString(),
        }
      : list,
  )
  const nextState = { ...state, lists }
  storeState(nextState)
  return nextState
}

export function removeDemoListItem(
  listId: string,
  media: { provider: MediaProvider; providerId: string; type: MediaType },
): DemoState | null {
  const state = loadStoredState()
  if (!state) return null
  const key = mediaKey(media)
  const lists = state.lists.map((list) => {
    if (list.id !== listId) return list
    return {
      ...list,
      items: list.items.filter((item) => mediaKey(item.media) !== key),
      updatedAt: new Date().toISOString(),
    }
  })
  const nextState = { ...state, lists }
  storeState(nextState)
  return nextState
}

export function removeDemoList(listId: string): DemoState | null {
  const state = loadStoredState()
  if (!state) return null
  const lists = state.lists.filter((list) => list.id !== listId)
  const nextState = { ...state, lists }
  storeState(nextState)
  return nextState
}

export function getDemoEntryByMedia(media: {
  provider: MediaProvider
  providerId: string
  type: MediaType
}) {
  const state = loadStoredState()
  if (!state) return null
  return (
    state.entries.find((entry) => mediaKey(entry.media) === mediaKey(media)) ??
    null
  )
}

export function buildDemoRatedItems(entries: DashboardEntry[]) {
  return entries
    .filter((entry) => (entry.rating ?? 0) > 0)
    .map((entry) => ({
      title: entry.media.title,
      type: entry.media.type,
      status: entry.status,
      rating: entry.rating ?? 0,
      updatedAt: entry.updatedAt,
      firstRatedAt: entry.createdAt,
      note: entry.note,
      episodeProgress: entry.episodeProgress ?? null,
      coverUrl: entry.media.posterUrl ?? null,
      description: entry.media.description ?? null,
      year: entry.media.year ?? null,
      durationMinutes: entry.media.durationMinutes ?? null,
      episodeCount: entry.media.episodeCount ?? null,
      genres: entry.media.genres ?? null,
      directors: null,
      writers: null,
      cast: null,
      provider: entry.media.provider,
      providerId: entry.media.providerId,
    }))
}
