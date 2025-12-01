import { NextResponse, type NextRequest } from 'next/server'
import type { Media } from '@/types'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const DETAIL_ENDPOINTS = {
  movie: 'movie',
  tv: 'tv',
} as const
type DetailType = keyof typeof DETAIL_ENDPOINTS
const SUPPORTED_TYPES = new Set<DetailType>(['movie', 'tv'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; id: string }> },
) {
  const { provider, id } = await params

  if (provider !== 'tmdb') {
    return NextResponse.json(
      { error: `Unsupported provider '${provider}'` },
      { status: 400 },
    )
  }

  const typeParam = (
    request.nextUrl.searchParams.get('type') ?? 'movie'
  ).toLowerCase()
  const type = SUPPORTED_TYPES.has(typeParam as DetailType)
    ? (typeParam as DetailType)
    : null

  if (!type) {
    return NextResponse.json(
      { error: `Unsupported media type '${typeParam}'.` },
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

  const tmdbUrl = new URL(
    `${TMDB_API_BASE}/${DETAIL_ENDPOINTS[type]}/${encodeURIComponent(id)}`,
  )
  tmdbUrl.searchParams.set('language', 'en-US')
  tmdbUrl.searchParams.set(
    'append_to_response',
    'credits,release_dates,content_ratings',
  )
  tmdbUrl.searchParams.set('api_key', apiKey)

  try {
    const response = await fetch(tmdbUrl, {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: body.status_message ?? 'TMDB detail request failed.' },
        { status: response.status },
      )
    }

    const data = await response.json()
    const media =
      type === 'movie'
        ? mapMovieDetail(data, { provider, id })
        : mapTvDetail(data, { provider, id })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('TMDB media detail error', error)
    return NextResponse.json(
      { error: 'Unexpected error while contacting TMDB.' },
      { status: 500 },
    )
  }
}

interface TmdbCrewMember {
  job?: string
  name?: string
}

interface TmdbCastMember {
  name?: string
  character?: string
}

interface TmdbGenre {
  name?: string
}

interface TmdbCompany {
  name?: string
}

interface TmdbMovieDetail {
  id: number
  title?: string
  original_title?: string
  overview?: string
  release_date?: string
  runtime?: number
  poster_path?: string | null
  adult?: boolean
  genres?: TmdbGenre[]
  production_companies?: TmdbCompany[]
  credits?: {
    cast?: TmdbCastMember[]
    crew?: TmdbCrewMember[]
  }
  release_dates?: {
    results?: Array<{
      iso_3166_1: string
      release_dates?: Array<{ certification?: string }>
    }>
  }
}

interface TmdbTvDetail {
  id: number
  name?: string
  original_name?: string
  overview?: string
  first_air_date?: string
  episode_run_time?: number[]
  poster_path?: string | null
  genres?: TmdbGenre[]
  production_companies?: TmdbCompany[]
  networks?: TmdbCompany[]
  created_by?: Array<{ name?: string }>
  credits?: {
    cast?: TmdbCastMember[]
    crew?: TmdbCrewMember[]
  }
  content_ratings?: {
    results?: Array<{
      iso_3166_1: string
      rating?: string
    }>
  }
}

function mapMovieDetail(
  movie: TmdbMovieDetail,
  params: { provider: string; id: string },
): Media {
  const crew = movie.credits?.crew ?? []
  const cast = movie.credits?.cast ?? []

  return {
    id: params.id,
    type: 'movie',
    title: movie.title ?? movie.original_title ?? 'Untitled',
    year: movie.release_date
      ? Number(movie.release_date.slice(0, 4))
      : undefined,
    posterUrl: movie.poster_path
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
      : undefined,
    provider: 'tmdb',
    providerId: String(movie.id),
    description: movie.overview,
    durationMinutes: movie.runtime ?? undefined,
    contentRating: extractMovieCertification(movie.release_dates),
    directors: extractPeopleByJob(crew, ['Director']),
    writers: extractPeopleByJob(crew, ['Screenplay', 'Writer', 'Story'])
      .concat(extractPeopleByJob(crew, ['Author']))
      .filter(Boolean),
    cast: cast
      .slice(0, 10)
      .map((member) => member.name)
      .filter(Boolean) as string[],
    studios: (movie.production_companies ?? [])
      .map((company) => company.name)
      .filter(Boolean) as string[],
    genres: (movie.genres ?? [])
      .map((genre) => genre.name)
      .filter(Boolean) as string[],
  }
}

function mapTvDetail(
  show: TmdbTvDetail,
  params: { provider: string; id: string },
): Media {
  const crew = show.credits?.crew ?? []
  const cast = show.credits?.cast ?? []
  const creators = show.created_by ?? []

  return {
    id: params.id,
    type: 'tv',
    title: show.name ?? show.original_name ?? 'Untitled',
    year: show.first_air_date
      ? Number(show.first_air_date.slice(0, 4))
      : undefined,
    posterUrl: show.poster_path
      ? `${TMDB_IMAGE_BASE}${show.poster_path}`
      : undefined,
    provider: 'tmdb',
    providerId: String(show.id),
    description: show.overview,
    durationMinutes: show.episode_run_time?.[0],
    contentRating: extractTvCertification(show.content_ratings),
    directors: extractPeopleByJob(crew, ['Director']).concat(
      creators.map((creator) => creator.name).filter(Boolean) as string[],
    ),
    writers: extractPeopleByJob(crew, ['Writer', 'Screenplay', 'Story']),
    cast: cast
      .slice(0, 10)
      .map((member) => member.name)
      .filter(Boolean) as string[],
    studios: (show.production_companies ?? [])
      .concat(show.networks ?? [])
      .map((company) => company.name)
      .filter(Boolean) as string[],
    genres: (show.genres ?? [])
      .map((genre) => genre.name)
      .filter(Boolean) as string[],
  }
}

function extractPeopleByJob(crew: TmdbCrewMember[], jobs: string[]): string[] {
  const normalizedJobs = new Set(jobs.map((job) => job.toLowerCase()))
  return crew
    .filter(
      (member) => member.job && normalizedJobs.has(member.job.toLowerCase()),
    )
    .map((member) => member.name)
    .filter(Boolean) as string[]
}

function extractMovieCertification(
  releaseDates?: TmdbMovieDetail['release_dates'],
): string | undefined {
  const entries = releaseDates?.results ?? []
  if (entries.length === 0) {
    return undefined
  }

  const preferred =
    entries.find((entry) => entry.iso_3166_1 === 'US') ?? entries[0]

  const certification = preferred.release_dates?.find(
    (release) => release.certification,
  )?.certification

  return certification || undefined
}

function extractTvCertification(
  contentRatings?: TmdbTvDetail['content_ratings'],
): string | undefined {
  const entries = contentRatings?.results ?? []
  if (entries.length === 0) {
    return undefined
  }

  const preferred =
    entries.find((entry) => entry.iso_3166_1 === 'US') ?? entries[0]

  return preferred?.rating || undefined
}
