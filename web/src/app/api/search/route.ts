import { NextResponse, type NextRequest } from 'next/server'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const ANILIST_API_BASE = 'https://graphql.anilist.co'
const TMDB_ENDPOINTS = {
  movie: 'search/movie',
  tv: 'search/tv',
} as const
type TmdbSearchType = keyof typeof TMDB_ENDPOINTS
type SearchType = TmdbSearchType | 'anime'
const SUPPORTED_TYPES = new Set<SearchType>(['movie', 'tv', 'anime'])
const FALLBACK_TAG = 'Search'

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
  type: SearchType
  provider: 'tmdb' | 'anilist'
  providerId: string
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

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY is not configured.' },
      { status: 500 },
    )
  }

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
    const items = (data.results ?? []).map((entry) =>
      type === 'movie'
        ? mapTmdbMovieToResult(entry as TmdbMovieResult)
        : mapTmdbTvToResult(entry as TmdbTvResult),
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
    description: entry.description ?? undefined,
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
  if (entry.duration) tags.push(`${entry.duration}m`)

  if (tags.length === 0) {
    tags.push(FALLBACK_TAG)
  }

  return tags
}

function mapTmdbMovieToResult(movie: TmdbMovieResult): SearchResultItem {
  const title = movie.title ?? movie.original_title ?? 'Untitled'
  const releaseYear = movie.release_date?.slice(0, 4)
  const subtitleParts = [
    releaseYear,
    'Movie',
    movie.original_language?.toUpperCase(),
  ].filter(Boolean)

  const tags = buildTags(movie)

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

function mapTmdbTvToResult(show: TmdbTvResult): SearchResultItem {
  const title = show.name ?? show.original_name ?? 'Untitled'
  const releaseYear = show.first_air_date?.slice(0, 4)
  const subtitleParts = [
    releaseYear,
    'TV Series',
    show.original_language?.toUpperCase(),
  ].filter(Boolean)

  const tags = buildTags(show)

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

interface RatingSummary {
  vote_average?: number
  vote_count?: number
  popularity?: number
}

function buildTags(entry: RatingSummary): string[] {
  const tags: string[] = []

  if (entry.vote_average) {
    tags.push(`${entry.vote_average.toFixed(1)} avg`)
  }

  if (entry.vote_count) {
    tags.push(`${entry.vote_count.toLocaleString()} votes`)
  }

  if (entry.popularity) {
    tags.push(`Pop ${Math.round(entry.popularity)}`)
  }

  if (tags.length === 0) {
    tags.push(FALLBACK_TAG)
  }

  return tags
}
