import { NextResponse, type NextRequest } from 'next/server'
import type { Media } from '@/types'
import { spotifyFetchJson } from '@/lib/spotify-server'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280'
const TMDB_GALLERY_BASE = 'https://image.tmdb.org/t/p/w780'
const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'
const ANILIST_API_BASE = 'https://graphql.anilist.co'
const DETAIL_ENDPOINTS = {
  movie: 'movie',
  tv: 'tv',
} as const
type DetailType = keyof typeof DETAIL_ENDPOINTS
const SUPPORTED_TYPES = new Set<DetailType>(['movie', 'tv'])

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; id: string }> },
) {
  const { provider, id } = await params

  const typeParam = (
    request.nextUrl.searchParams.get('type') ?? 'movie'
  ).toLowerCase()

  if (provider === 'spotify') {
    const kind = id.startsWith('track-')
      ? 'track'
      : id.startsWith('album-')
        ? 'album'
        : null

    if (!kind) {
      return NextResponse.json(
        { error: 'Invalid Spotify id.' },
        { status: 400 },
      )
    }

    const spotifyId = id.replace(/^track-/, '').replace(/^album-/, '')

    try {
      if (kind === 'track') {
        const track = await spotifyFetchJson<{
          id: string
          name?: string
          duration_ms?: number
          explicit?: boolean
          artists?: Array<{ name?: string } | null>
          album?: {
            name?: string
            release_date?: string
            images?: Array<{ url?: string } | null>
          } | null
          external_urls?: { spotify?: string }
        }>(
          `https://api.spotify.com/v1/tracks/${encodeURIComponent(spotifyId)}?market=US`,
        )

        const yearValue = track.album?.release_date?.slice(0, 4)
        const year =
          yearValue && /^\d{4}$/.test(yearValue) ? Number(yearValue) : undefined

        const durationMinutes =
          typeof track.duration_ms === 'number' &&
          Number.isFinite(track.duration_ms)
            ? Math.max(0, Math.round(track.duration_ms / 60000))
            : undefined

        const artists =
          (track.artists ?? [])
            .map((a) => a?.name ?? undefined)
            .filter((name): name is string => Boolean(name)) ?? []

        const media: Media = {
          id,
          type: 'song',
          title: track.name ?? 'Untitled',
          year,
          posterUrl: track.album?.images?.[0]?.url ?? undefined,
          provider: 'spotify',
          providerId: `track-${track.id}`,
          durationMinutes,
          studios: [],
          genres: [],
          directors: [],
          writers: [],
          cast: artists,
        }

        return NextResponse.json({ media })
      }

      // album
      const album = await spotifyFetchJson<{
        id: string
        name?: string
        release_date?: string
        total_tracks?: number
        artists?: Array<{ name?: string } | null>
        images?: Array<{ url?: string } | null>
        tracks?: { items?: Array<{ duration_ms?: number } | null> }
        external_urls?: { spotify?: string }
      }>(
        `https://api.spotify.com/v1/albums/${encodeURIComponent(spotifyId)}?market=US`,
      )

      const yearValue = album.release_date?.slice(0, 4)
      const year =
        yearValue && /^\d{4}$/.test(yearValue) ? Number(yearValue) : undefined

      const totalDurationMs = (album.tracks?.items ?? []).reduce(
        (acc, item) => {
          const ms = item?.duration_ms
          if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0)
            return acc + ms
          return acc
        },
        0,
      )

      const durationMinutes =
        totalDurationMs > 0
          ? Math.max(0, Math.round(totalDurationMs / 60000))
          : undefined

      const artists =
        (album.artists ?? [])
          .map((a) => a?.name ?? undefined)
          .filter((name): name is string => Boolean(name)) ?? []

      const media: Media = {
        id,
        type: 'album',
        title: album.name ?? 'Untitled',
        year,
        posterUrl: album.images?.[0]?.url ?? undefined,
        provider: 'spotify',
        providerId: `album-${album.id}`,
        durationMinutes,
        studios: [],
        genres: [],
        directors: [],
        writers: [],
        cast: artists,
      }

      return NextResponse.json({ media })
    } catch (error) {
      console.error('Spotify media detail error', error)
      return NextResponse.json(
        { error: 'Unexpected error while contacting Spotify.' },
        { status: 500 },
      )
    }
  }

  if (provider === 'anilist') {
    if (typeParam !== 'anime') {
      return NextResponse.json(
        { error: `Unsupported media type '${typeParam}'.` },
        { status: 400 },
      )
    }

    const numericId = Number(id)
    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: 'Invalid AniList id.' },
        { status: 400 },
      )
    }

    try {
      const media = await fetchAniListAnimeDetail(numericId)
      if (!media) {
        return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
      }
      return NextResponse.json({ media })
    } catch (error) {
      console.error('AniList media detail error', error)
      return NextResponse.json(
        { error: 'Unexpected error while contacting AniList.' },
        { status: 500 },
      )
    }
  }

  if (provider !== 'tmdb') {
    return NextResponse.json(
      { error: `Unsupported provider '${provider}'` },
      { status: 400 },
    )
  }

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
    'credits,release_dates,content_ratings,images',
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

interface AniListDetailResponse {
  data?: {
    Media?: AniListAnimeDetail | null
  }
  errors?: Array<{ message?: string }>
}

interface AniListAnimeDetail {
  id: number
  type?: string | null
  isAdult?: boolean | null
  title?: {
    romaji?: string
    english?: string
    native?: string
  }
  description?: string | null
  seasonYear?: number | null
  startDate?: { year?: number | null }
  episodes?: number | null
  duration?: number | null
  genres?: string[] | null
  coverImage?: { large?: string | null }
  studios?: { nodes?: Array<{ name?: string | null } | null> | null }
  staff?: {
    edges?: Array<{
      role?: string | null
      node?: {
        id: number
        name?: { full?: string | null } | null
        image?: { large?: string | null } | null
      } | null
    } | null> | null
  } | null
}

async function fetchAniListAnimeDetail(
  anilistId: number,
): Promise<Media | null> {
  const gqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        type
        isAdult
        title { romaji english native }
        description(asHtml: false)
        seasonYear
        startDate { year }
        episodes
        duration
        genres
        coverImage { large }
        studios(isMain: true) { nodes { name } }
        staff(perPage: 25) {
          edges {
            role
            node {
              id
              name { full }
              image { large }
            }
          }
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
    body: JSON.stringify({ query: gqlQuery, variables: { id: anilistId } }),
    next: { revalidate: 0 },
  })

  const payload = (await response
    .json()
    .catch(() => null)) as AniListDetailResponse | null

  if (!response.ok) {
    const message = payload?.errors?.[0]?.message ?? 'AniList request failed.'
    throw new Error(message)
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'AniList request failed.')
  }

  const detail = payload?.data?.Media ?? null
  if (!detail) return null
  if (detail.isAdult) return null

  const title =
    detail.title?.english ??
    detail.title?.romaji ??
    detail.title?.native ??
    'Untitled'

  const year =
    detail.seasonYear ??
    (detail.startDate?.year != null ? detail.startDate.year : null)

  const studios =
    detail.studios?.nodes
      ?.map((node) => node?.name ?? undefined)
      .filter((name): name is string => Boolean(name)) ?? []

  const genres = (detail.genres ?? []).filter(Boolean) as string[]

  const staffEdges = detail.staff?.edges ?? []
  const staffCredits = staffEdges
    .map((edge) => {
      const node = edge?.node ?? null
      const name = node?.name?.full ?? undefined
      if (!name) return null
      const id = node?.id != null ? String(node.id) : undefined
      const role = edge?.role ?? undefined
      const imageUrl = node?.image?.large ?? undefined
      return {
        name,
        ...(id ? { id } : {}),
        ...(role ? { role } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      }
    })
    .filter((credit): credit is NonNullable<typeof credit> => credit != null)

  const roleContains = (role: string | undefined, fragments: string[]) => {
    const value = (role ?? '').toLowerCase()
    return fragments.some((fragment) => value.includes(fragment))
  }

  const creatorCredits = staffCredits.filter((credit) =>
    roleContains(credit.role, ['director', 'creator']),
  )

  const writerCredits = staffCredits.filter((credit) =>
    roleContains(credit.role, [
      'writer',
      'script',
      'screenplay',
      'story',
      'series composition',
      'composition',
      'original',
    ]),
  )

  const producerCredits = staffCredits.filter((credit) =>
    roleContains(credit.role, ['producer', 'executive producer']),
  )

  return {
    id: String(detail.id),
    type: 'anime',
    title,
    year: Number.isFinite(year) ? (year as number) : undefined,
    posterUrl: detail.coverImage?.large ?? undefined,
    provider: 'anilist',
    providerId: String(detail.id),
    description: stripAniListDescription(detail.description),
    episodeCount:
      Number.isFinite(detail.episodes) && detail.episodes != null
        ? (detail.episodes as number)
        : undefined,
    durationMinutes:
      Number.isFinite(detail.duration) && detail.duration != null
        ? (detail.duration as number)
        : undefined,
    creatorCredits,
    writerCredits,
    producerCredits,
    directors: creatorCredits.map((credit) => credit.name),
    writers: writerCredits.map((credit) => credit.name),
    studios,
    genres,
  }
}

interface TmdbCrewMember {
  job?: string
  name?: string
  id?: number
  profile_path?: string | null
}

interface TmdbCastMember {
  name?: string
  character?: string
  id?: number
  profile_path?: string | null
}

interface TmdbImageList {
  backdrops?: Array<{ file_path?: string | null } | null>
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
  backdrop_path?: string | null
  adult?: boolean
  genres?: TmdbGenre[]
  production_companies?: TmdbCompany[]
  credits?: {
    cast?: TmdbCastMember[]
    crew?: TmdbCrewMember[]
  }
  images?: TmdbImageList
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
  number_of_episodes?: number
  episode_run_time?: number[]
  poster_path?: string | null
  backdrop_path?: string | null
  genres?: TmdbGenre[]
  production_companies?: TmdbCompany[]
  networks?: TmdbCompany[]
  created_by?: Array<{
    id?: number
    name?: string
    profile_path?: string | null
  }>
  credits?: {
    cast?: TmdbCastMember[]
    crew?: TmdbCrewMember[]
  }
  images?: TmdbImageList
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

  const toProfileUrl = (path?: string | null) =>
    path ? `${TMDB_PROFILE_BASE}${path}` : undefined

  const castMembers = cast
    .filter((member) => Boolean(member?.name))
    .slice(0, 60)
    .map((member) => ({
      id: member.id != null ? String(member.id) : undefined,
      name: member.name ?? '',
      role: member.character || undefined,
      imageUrl: toProfileUrl(member.profile_path),
    }))
    .filter((member) => Boolean(member.name))

  const extractCrewCreditsByJob = (jobs: string[]) => {
    const normalizedJobs = new Set(jobs.map((job) => job.toLowerCase()))
    return crew
      .filter(
        (member) =>
          member.job &&
          normalizedJobs.has(member.job.toLowerCase()) &&
          Boolean(member.name),
      )
      .map((member) => ({
        id: member.id != null ? String(member.id) : undefined,
        name: member.name ?? '',
        role: member.job,
        imageUrl: toProfileUrl(member.profile_path),
      }))
      .filter((member) => Boolean(member.name))
  }

  const creatorCredits = extractCrewCreditsByJob(['Director'])
  const writerCredits = extractCrewCreditsByJob([
    'Writer',
    'Screenplay',
    'Story',
    'Author',
  ])
  const producerCredits = extractCrewCreditsByJob([
    'Producer',
    'Executive Producer',
    'Co-Producer',
    'Associate Producer',
  ])

  const additionalImages = (movie.images?.backdrops ?? [])
    .map((img) => img?.file_path ?? null)
    .filter((path): path is string => Boolean(path))
    .slice(0, 8)
    .map((path) => `${TMDB_GALLERY_BASE}${path}`)

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
    backdropUrl: movie.backdrop_path
      ? `${TMDB_BACKDROP_BASE}${movie.backdrop_path}`
      : undefined,
    additionalImages,
    provider: 'tmdb',
    providerId: String(movie.id),
    description: movie.overview,
    durationMinutes: movie.runtime ?? undefined,
    contentRating: extractMovieCertification(movie.release_dates),
    directors: extractPeopleByJob(crew, ['Director']),
    writers: extractPeopleByJob(crew, ['Screenplay', 'Writer', 'Story'])
      .concat(extractPeopleByJob(crew, ['Author']))
      .filter(Boolean),
    castMembers,
    creatorCredits,
    writerCredits,
    producerCredits,
    cast: castMembers.map((member) => member.name),
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

  const toProfileUrl = (path?: string | null) =>
    path ? `${TMDB_PROFILE_BASE}${path}` : undefined

  const castMembers = cast
    .filter((member) => Boolean(member?.name))
    .slice(0, 60)
    .map((member) => ({
      id: member.id != null ? String(member.id) : undefined,
      name: member.name ?? '',
      role: member.character || undefined,
      imageUrl: toProfileUrl(member.profile_path),
    }))
    .filter((member) => Boolean(member.name))

  const extractCrewCreditsByJob = (jobs: string[]) => {
    const normalizedJobs = new Set(jobs.map((job) => job.toLowerCase()))
    return crew
      .filter(
        (member) =>
          member.job &&
          normalizedJobs.has(member.job.toLowerCase()) &&
          Boolean(member.name),
      )
      .map((member) => ({
        id: member.id != null ? String(member.id) : undefined,
        name: member.name ?? '',
        role: member.job,
        imageUrl: toProfileUrl(member.profile_path),
      }))
      .filter((member) => Boolean(member.name))
  }

  const creatorCredits =
    (creators ?? [])
      .filter((creator) => Boolean(creator?.name))
      .map((creator) => ({
        id: creator.id != null ? String(creator.id) : undefined,
        name: creator.name ?? '',
        role: 'Creator',
        imageUrl: toProfileUrl(creator.profile_path),
      })) ?? []

  const creatorCreditsFallback =
    creatorCredits.length > 0
      ? creatorCredits
      : extractCrewCreditsByJob(['Director'])

  const writerCredits = extractCrewCreditsByJob([
    'Writer',
    'Screenplay',
    'Story',
  ])
  const producerCredits = extractCrewCreditsByJob([
    'Producer',
    'Executive Producer',
    'Co-Producer',
    'Associate Producer',
  ])

  const additionalImages = (show.images?.backdrops ?? [])
    .map((img) => img?.file_path ?? null)
    .filter((path): path is string => Boolean(path))
    .slice(0, 8)
    .map((path) => `${TMDB_GALLERY_BASE}${path}`)

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
    backdropUrl: show.backdrop_path
      ? `${TMDB_BACKDROP_BASE}${show.backdrop_path}`
      : undefined,
    additionalImages,
    provider: 'tmdb',
    providerId: String(show.id),
    description: show.overview,
    durationMinutes: show.episode_run_time?.[0],
    episodeCount: show.number_of_episodes ?? undefined,
    contentRating: extractTvCertification(show.content_ratings),
    directors: extractPeopleByJob(crew, ['Director']).concat(
      creators.map((creator) => creator.name).filter(Boolean) as string[],
    ),
    writers: extractPeopleByJob(crew, ['Writer', 'Screenplay', 'Story']),
    castMembers,
    creatorCredits: creatorCreditsFallback,
    writerCredits,
    producerCredits,
    cast: castMembers.map((member) => member.name),
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
