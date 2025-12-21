import { NextResponse, type NextRequest } from 'next/server'
import type { MediaProvider, MediaType } from '@/types'
import { buildIgdbImageUrl, igdbFetch } from '@/lib/igdb-server'
import { spotifyFetchJson } from '@/lib/spotify-server'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const ANILIST_API_BASE = 'https://graphql.anilist.co'
const TMDB_ENDPOINTS = {
  movie: 'search/movie',
  tv: 'search/tv',
} as const
type TmdbSearchType = keyof typeof TMDB_ENDPOINTS
type SearchType = TmdbSearchType | 'anime' | 'track' | 'album' | 'game'
const SUPPORTED_TYPES = new Set<SearchType>([
  'movie',
  'tv',
  'anime',
  'track',
  'album',
  'game',
])
const FALLBACK_TAG = 'Search'
const TMDB_DETAIL_LIMIT = 10
const TMDB_CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h
const TMDB_DETAIL_CONCURRENCY = 4

type GenreMap = Map<number, string>
type TmdbDetailsCacheValue = { value: number | null; fetchedAt: number }

let movieGenreCache: { map: GenreMap; fetchedAt: number } | null = null
let tvGenreCache: { map: GenreMap; fetchedAt: number } | null = null
const movieRuntimeCache = new Map<number, TmdbDetailsCacheValue>()
const tvEpisodeCountCache = new Map<number, TmdbDetailsCacheValue>()

function cacheGet(map: Map<number, TmdbDetailsCacheValue>, id: number) {
  const hit = map.get(id)
  if (!hit) return null
  if (Date.now() - hit.fetchedAt > TMDB_CACHE_TTL_MS) {
    map.delete(id)
    return null
  }
  return hit.value
}

function cacheSet(
  map: Map<number, TmdbDetailsCacheValue>,
  id: number,
  value: number | null,
) {
  map.set(id, { value, fetchedAt: Date.now() })
}

async function getTmdbGenreMap(type: 'movie' | 'tv', apiKey: string) {
  const cache = type === 'movie' ? movieGenreCache : tvGenreCache
  if (cache && Date.now() - cache.fetchedAt < TMDB_CACHE_TTL_MS)
    return cache.map

  const url = new URL(`${TMDB_API_BASE}/genre/${type}/list`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'en-US')

  const res = await fetch(url, { next: { revalidate: 0 } })
  const json = (await res.json().catch(() => null)) as {
    genres?: Array<{ id: number; name: string }>
  } | null

  const map: GenreMap = new Map()
  for (const g of json?.genres ?? []) {
    if (typeof g?.id === 'number' && typeof g?.name === 'string' && g.name) {
      map.set(g.id, g.name)
    }
  }

  const nextCache = { map, fetchedAt: Date.now() }
  if (type === 'movie') movieGenreCache = nextCache
  else tvGenreCache = nextCache

  return map
}

function buildGenreTags(
  genreIds: number[] | undefined,
  genreMap: GenreMap,
): string[] {
  const names = (genreIds ?? [])
    .map((id) => genreMap.get(id))
    .filter((v): v is string => Boolean(v))
    .slice(0, 5)
  return names.length ? names : [FALLBACK_TAG]
}

function buildTagList(values: Array<string | undefined>, limit = 5) {
  const tags = values.filter((value): value is string => Boolean(value))
  return tags.slice(0, limit).length ? tags.slice(0, limit) : [FALLBACK_TAG]
}

async function getTmdbMovieRuntimeMinutes(id: number, apiKey: string) {
  const cached = cacheGet(movieRuntimeCache, id)
  if (cached !== null) return cached

  const url = new URL(`${TMDB_API_BASE}/movie/${id}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'en-US')

  const res = await fetch(url, { next: { revalidate: 0 } })
  const json = (await res.json().catch(() => null)) as {
    runtime?: number | null
  } | null

  const runtime =
    typeof json?.runtime === 'number' && Number.isFinite(json.runtime)
      ? Math.max(0, Math.round(json.runtime))
      : null
  cacheSet(movieRuntimeCache, id, runtime)
  return runtime
}

async function getTmdbTvEpisodeCount(id: number, apiKey: string) {
  const cached = cacheGet(tvEpisodeCountCache, id)
  if (cached !== null) return cached

  const url = new URL(`${TMDB_API_BASE}/tv/${id}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'en-US')

  const res = await fetch(url, { next: { revalidate: 0 } })
  const json = (await res.json().catch(() => null)) as {
    number_of_episodes?: number | null
  } | null

  const episodes =
    typeof json?.number_of_episodes === 'number' &&
    Number.isFinite(json.number_of_episodes)
      ? Math.max(0, Math.round(json.number_of_episodes))
      : null
  cacheSet(tvEpisodeCountCache, id, episodes)
  return episodes
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const workers = Array.from({
    length: Math.max(1, Math.min(limit, items.length)),
  }).map(async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++
      results[current] = await mapper(items[current], current)
    }
  })

  await Promise.all(workers)
  return results
}

interface TmdbMovieResult {
  id: number
  title?: string
  original_title?: string
  overview?: string
  release_date?: string
  poster_path?: string | null
  vote_average?: number
  vote_count?: number
  popularity?: number
  original_language?: string
  genre_ids?: number[]
}

interface TmdbTvResult {
  id: number
  name?: string
  original_name?: string
  overview?: string
  first_air_date?: string
  poster_path?: string | null
  vote_average?: number
  vote_count?: number
  popularity?: number
  origin_country?: string[]
  original_language?: string
  genre_ids?: number[]
}

interface SearchResponse {
  items: SearchResultItem[]
  query: string
  type: string
}

interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  description?: string
  coverUrl?: string
  tags: string[]
  type: MediaType
  provider: MediaProvider
  providerId: string
  externalUrl?: string
  artist?: string
  album?: string
  year?: number
  durationSeconds?: number
  explicit?: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('query') ?? '').trim()
  const typeParam = (searchParams.get('type') ?? 'movie').toLowerCase()
  const type = SUPPORTED_TYPES.has(typeParam as SearchType)
    ? (typeParam as SearchType)
    : null

  if (!query) {
    return NextResponse.json(
      { error: 'Missing query parameter.' },
      { status: 400 },
    )
  }

  if (!type) {
    return NextResponse.json(
      { error: `Unsupported type '${typeParam}'.` },
      { status: 400 },
    )
  }

  if (type === 'anime') {
    try {
      const items = await searchAniListAnime(query)
      return NextResponse.json<SearchResponse>({ query, type, items })
    } catch (error) {
      console.error('AniList search error', error)
      return NextResponse.json(
        { error: 'Unexpected error while contacting AniList.' },
        { status: 500 },
      )
    }
  }

  if (type === 'game') {
    try {
      const items = await searchIgdbGames(query)
      return NextResponse.json<SearchResponse>({ query, type, items })
    } catch (error) {
      console.error('IGDB search error', error)
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unexpected error while contacting IGDB.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  if (type === 'track' || type === 'album') {
    try {
      const items =
        type === 'track'
          ? await searchSpotifyTracks(query)
          : await searchSpotifyAlbums(query)
      return NextResponse.json<SearchResponse>({ query, type, items })
    } catch (error) {
      console.error('Spotify search error', error)
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unexpected error while contacting Spotify.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY is not configured.' },
      { status: 500 },
    )
  }

  const [movieGenreMap, tvGenreMap] = await Promise.all([
    getTmdbGenreMap('movie', apiKey),
    getTmdbGenreMap('tv', apiKey),
  ])

  const tmdbUrl = new URL(`${TMDB_API_BASE}/${TMDB_ENDPOINTS[type]}`)
  tmdbUrl.searchParams.set('query', query)
  tmdbUrl.searchParams.set('include_adult', 'false')
  tmdbUrl.searchParams.set('language', 'en-US')
  tmdbUrl.searchParams.set('page', '1')
  tmdbUrl.searchParams.set('api_key', apiKey)

  try {
    const response = await fetch(tmdbUrl, {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: body.status_message ?? 'TMDB request failed.' },
        { status: response.status },
      )
    }

    const data = (await response.json()) as {
      results?: TmdbMovieResult[] | TmdbTvResult[]
    }
    const results = data.results ?? []
    const detailTargets = results.slice(0, TMDB_DETAIL_LIMIT)

    const details = await mapWithConcurrency(
      detailTargets,
      TMDB_DETAIL_CONCURRENCY,
      async (entry) => {
        if (type === 'movie') {
          const movie = entry as TmdbMovieResult
          return {
            id: movie.id,
            runtimeMinutes: await getTmdbMovieRuntimeMinutes(movie.id, apiKey),
          }
        }
        const show = entry as TmdbTvResult
        return {
          id: show.id,
          episodeCount: await getTmdbTvEpisodeCount(show.id, apiKey),
        }
      },
    )

    const runtimeById = new Map<number, number | null>()
    const episodeCountById = new Map<number, number | null>()
    for (const item of details) {
      if ('runtimeMinutes' in item)
        runtimeById.set(item.id, item.runtimeMinutes ?? null)
      if ('episodeCount' in item)
        episodeCountById.set(item.id, item.episodeCount ?? null)
    }

    const items = results.map((entry) =>
      type === 'movie'
        ? mapTmdbMovieToResult(
            entry as TmdbMovieResult,
            movieGenreMap,
            runtimeById.get((entry as TmdbMovieResult).id) ?? null,
          )
        : mapTmdbTvToResult(
            entry as TmdbTvResult,
            tvGenreMap,
            episodeCountById.get((entry as TmdbTvResult).id) ?? null,
          ),
    )

    return NextResponse.json<SearchResponse>({
      query,
      type,
      items,
    })
  } catch (error) {
    console.error('TMDB search error', error)
    return NextResponse.json(
      { error: 'Unexpected error while contacting TMDB.' },
      { status: 500 },
    )
  }
}

interface IgdbGameSummary {
  id: number
  name?: string
  summary?: string | null
  first_release_date?: number | null
  url?: string | null
  cover?: { image_id?: string | null } | null
  genres?: Array<{ name?: string | null } | null> | null
  platforms?: Array<{ name?: string | null } | null> | null
  involved_companies?: Array<{
    developer?: boolean | null
    publisher?: boolean | null
    company?: { name?: string | null } | null
  } | null> | null
}

async function searchIgdbGames(query: string): Promise<SearchResultItem[]> {
  const safeQuery = query.replace(/"/g, '')
  const baseFields =
    'fields id,name,summary,first_release_date,cover.image_id,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,url;'
  const baseSearch = `search "${safeQuery}";`

  const primaryBody = [
    baseSearch,
    baseFields,
    'where category = 0;',
    'limit 20;',
  ].join(' ')

  let results = await igdbFetch<IgdbGameSummary[]>('games', primaryBody)

  if (!results || results.length === 0) {
    const fallbackBody = [baseSearch, baseFields, 'limit 20;'].join(' ')
    results = await igdbFetch<IgdbGameSummary[]>('games', fallbackBody)
  }

  return (results ?? [])
    .filter((game) => typeof game?.id === 'number')
    .map((game) => {
      const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getUTCFullYear()
        : undefined

      const platforms = (game.platforms ?? [])
        .map((platform) => platform?.name ?? undefined)
        .filter((name): name is string => Boolean(name))
      const platformLabel = platforms.slice(0, 3).join(', ')

      const companies = (game.involved_companies ?? [])
        .filter((entry) => Boolean(entry?.company?.name))
        .map((entry) => ({
          name: entry?.company?.name ?? '',
          developer: Boolean(entry?.developer),
          publisher: Boolean(entry?.publisher),
        }))
        .filter((entry) => Boolean(entry.name))

      const studioLabel = companies
        .filter((entry) => entry.developer || entry.publisher)
        .map((entry) => entry.name)
        .slice(0, 2)
        .join(', ')

      const subtitle = [releaseYear, platformLabel, studioLabel]
        .filter(Boolean)
        .join(' | ')

      const genres = (game.genres ?? [])
        .map((genre) => genre?.name ?? undefined)
        .filter((name): name is string => Boolean(name))

      const tags = buildTagList([...genres, ...platforms])

      return {
        id: `igdb-game-${game.id}`,
        title: game.name ?? 'Untitled',
        subtitle: subtitle || 'Game',
        description: game.summary ?? undefined,
        coverUrl: game.cover?.image_id
          ? buildIgdbImageUrl(game.cover.image_id, 't_cover_big')
          : undefined,
        tags,
        type: 'game',
        provider: 'igdb',
        providerId: String(game.id),
        externalUrl: game.url ?? undefined,
        year: releaseYear,
      }
    })
}

interface AniListSearchResponse {
  data?: {
    Page?: {
      media?: AniListMediaSummary[]
    }
  }
  errors?: Array<{ message?: string }>
}

interface AniListMediaSummary {
  id: number
  title?: {
    romaji?: string
    english?: string
    native?: string
  }
  description?: string | null
  seasonYear?: number | null
  format?: string | null
  episodes?: number | null
  duration?: number | null
  isAdult?: boolean | null
  coverImage?: {
    large?: string | null
  }
  genres?: string[] | null
}

async function searchAniListAnime(query: string): Promise<SearchResultItem[]> {
  const gqlQuery = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { romaji english native }
          description(asHtml: false)
          seasonYear
          format
          episodes
          duration
          isAdult
          coverImage { large }
          genres
        }
      }
    }
  `

  const response = await fetch(ANILIST_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: gqlQuery,
      variables: { search: query, perPage: 20 },
    }),
    next: { revalidate: 0 },
  })

  const payload = (await response
    .json()
    .catch(() => null)) as AniListSearchResponse | null

  if (!response.ok) {
    const message = payload?.errors?.[0]?.message ?? 'AniList request failed.'
    throw new Error(message)
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'AniList request failed.')
  }

  const media = payload?.data?.Page?.media ?? []
  return media.filter((entry) => !entry?.isAdult).map(mapAniListAnimeToResult)
}

function stripAniListDescription(
  input: string | null | undefined,
): string | undefined {
  if (!input) return undefined

  const withoutTags = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, '')
    .replace(/<\/?[^>]+>/g, '')

  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")

  const trimmed = decoded.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function mapAniListAnimeToResult(entry: AniListMediaSummary): SearchResultItem {
  const title =
    entry.title?.english ??
    entry.title?.romaji ??
    entry.title?.native ??
    'Untitled'

  const year = entry.seasonYear ? String(entry.seasonYear) : undefined
  const formatLabel =
    entry.format?.toUpperCase() === 'MOVIE'
      ? 'Anime Film'
      : entry.format
        ? entry.format.replaceAll('_', ' ').toLowerCase()
        : 'Anime'

  const subtitleParts = [year, formatLabel].filter(Boolean)
  const tags = buildAniListTags(entry)

  return {
    id: `anilist-anime-${entry.id}`,
    title,
    subtitle: subtitleParts.join(' • '),
    description: stripAniListDescription(entry.description),
    coverUrl: entry.coverImage?.large ?? undefined,
    tags,
    type: 'anime',
    provider: 'anilist',
    providerId: String(entry.id),
  }
}

function buildAniListTags(entry: AniListMediaSummary): string[] {
  const tags: string[] = []

  const genres = entry.genres ?? []
  for (const genre of genres.slice(0, 3)) {
    if (genre) tags.push(genre)
  }

  if (entry.episodes) tags.push(`${entry.episodes} eps`)

  if (tags.length === 0) {
    tags.push(FALLBACK_TAG)
  }

  return tags
}

function mapTmdbMovieToResult(
  movie: TmdbMovieResult,
  genreMap: GenreMap,
  runtimeMinutes: number | null,
): SearchResultItem {
  const title = movie.title ?? movie.original_title ?? 'Untitled'
  const releaseYear = movie.release_date?.slice(0, 4)
  const runtimeLabel =
    typeof runtimeMinutes === 'number' && runtimeMinutes > 0
      ? `${runtimeMinutes}m`
      : undefined
  const subtitleParts = [
    releaseYear,
    'Movie',
    runtimeLabel,
    movie.original_language?.toUpperCase(),
  ].filter(Boolean)

  const tags = buildGenreTags(movie.genre_ids, genreMap)

  return {
    id: `tmdb-${movie.id}`,
    title,
    subtitle: subtitleParts.join(' • '),
    description: movie.overview,
    coverUrl: movie.poster_path
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
      : undefined,
    tags,
    type: 'movie',
    provider: 'tmdb',
    providerId: String(movie.id),
  }
}

function mapTmdbTvToResult(
  show: TmdbTvResult,
  genreMap: GenreMap,
  episodeCount: number | null,
): SearchResultItem {
  const title = show.name ?? show.original_name ?? 'Untitled'
  const releaseYear = show.first_air_date?.slice(0, 4)
  const episodeLabel =
    typeof episodeCount === 'number' && episodeCount > 0
      ? `${episodeCount} eps`
      : undefined
  const subtitleParts = [
    releaseYear,
    'TV Series',
    episodeLabel,
    show.original_language?.toUpperCase(),
  ].filter(Boolean)

  const tags = buildGenreTags(show.genre_ids, genreMap)

  return {
    id: `tmdb-tv-${show.id}`,
    title,
    subtitle: subtitleParts.join(' • '),
    description: show.overview,
    coverUrl: show.poster_path
      ? `${TMDB_IMAGE_BASE}${show.poster_path}`
      : undefined,
    tags,
    type: 'tv',
    provider: 'tmdb',
    providerId: String(show.id),
  }
}

interface SpotifyImage {
  url?: string
}

interface SpotifyArtist {
  name?: string
}

interface SpotifyAlbumSummary {
  id: string
  name?: string
  release_date?: string
  total_tracks?: number
  album_type?: string
  images?: SpotifyImage[]
  artists?: SpotifyArtist[]
  external_urls?: { spotify?: string }
}

interface SpotifyTrackSummary {
  id: string
  name?: string
  duration_ms?: number
  explicit?: boolean
  artists?: SpotifyArtist[]
  external_urls?: { spotify?: string }
  album?: {
    name?: string
    release_date?: string
    images?: SpotifyImage[]
  }
}

interface SpotifySearchResponse {
  tracks?: { items?: SpotifyTrackSummary[] }
  albums?: { items?: SpotifyAlbumSummary[] }
}

function formatSpotifyYear(releaseDate?: string): string | undefined {
  const year = releaseDate?.slice(0, 4)
  return year && /^\d{4}$/.test(year) ? year : undefined
}

function formatTrackDurationTag(durationMs?: number): string | null {
  if (
    typeof durationMs !== 'number' ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return null
  }
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

async function searchSpotifyTracks(query: string): Promise<SearchResultItem[]> {
  const url = new URL('https://api.spotify.com/v1/search')
  url.searchParams.set('q', query)
  url.searchParams.set('type', 'track')
  url.searchParams.set('limit', '20')
  url.searchParams.set('market', 'US')

  const payload = await spotifyFetchJson<SpotifySearchResponse>(url.toString())
  const tracks = payload.tracks?.items ?? []

  return tracks
    .filter((track) => Boolean(track?.id))
    .map((track) => {
      const artists = (track.artists ?? [])
        .map((a) => a?.name)
        .filter((v): v is string => Boolean(v))
      const artistLabel = artists.length ? artists.join(', ') : 'Unknown artist'
      const year = formatSpotifyYear(track.album?.release_date)
      const durationTag = formatTrackDurationTag(track.duration_ms)
      const tags = ['Spotify', 'Track']
      if (durationTag) tags.push(durationTag)
      if (track.explicit) tags.push('Explicit')

      const providerId = `track-${track.id}`
      const durationSeconds =
        typeof track.duration_ms === 'number' &&
        Number.isFinite(track.duration_ms) &&
        track.duration_ms > 0
          ? Math.max(1, Math.round(track.duration_ms / 1000))
          : undefined

      return {
        id: `spotify-${providerId}`,
        title: track.name ?? 'Untitled',
        subtitle: [artistLabel, year, 'Track'].filter(Boolean).join(' • '),
        coverUrl: track.album?.images?.[0]?.url ?? undefined,
        tags,
        type: 'song',
        provider: 'spotify',
        providerId,
        externalUrl: track.external_urls?.spotify ?? undefined,
        artist: artistLabel,
        album: track.album?.name ?? undefined,
        year: year ? Number(year) : undefined,
        durationSeconds,
        explicit: track.explicit ?? undefined,
      }
    })
}

async function searchSpotifyAlbums(query: string): Promise<SearchResultItem[]> {
  const url = new URL('https://api.spotify.com/v1/search')
  url.searchParams.set('q', query)
  url.searchParams.set('type', 'album')
  url.searchParams.set('limit', '20')
  url.searchParams.set('market', 'US')

  const payload = await spotifyFetchJson<SpotifySearchResponse>(url.toString())
  const albums = payload.albums?.items ?? []

  return albums
    .filter((album) => Boolean(album?.id))
    .map((album) => {
      const artists = (album.artists ?? [])
        .map((a) => a?.name)
        .filter((v): v is string => Boolean(v))
      const artistLabel = artists.length ? artists.join(', ') : 'Unknown artist'
      const year = formatSpotifyYear(album.release_date)

      const tags = ['Spotify', 'Album']
      if (typeof album.total_tracks === 'number' && album.total_tracks > 0) {
        tags.push(`${album.total_tracks} tracks`)
      }

      const providerId = `album-${album.id}`
      return {
        id: `spotify-${providerId}`,
        title: album.name ?? 'Untitled',
        subtitle: [artistLabel, year, 'Album'].filter(Boolean).join(' • '),
        coverUrl: album.images?.[0]?.url ?? undefined,
        tags,
        type: 'album',
        provider: 'spotify',
        providerId,
        externalUrl: album.external_urls?.spotify ?? undefined,
      }
    })
}
