import { NextResponse, type NextRequest } from 'next/server'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_ENDPOINTS = {
  movie: 'search/movie',
  tv: 'search/tv',
} as const
type SearchType = keyof typeof TMDB_ENDPOINTS
const SUPPORTED_TYPES = new Set<SearchType>(['movie', 'tv'])
const FALLBACK_TAG = 'TMDB'

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
  provider: 'tmdb'
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
