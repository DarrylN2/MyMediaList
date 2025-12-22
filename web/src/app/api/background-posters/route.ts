import { NextResponse } from 'next/server'
import { buildIgdbImageUrl, igdbFetch } from '@/lib/igdb-server'
import { spotifyFetchJson } from '@/lib/spotify-server'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const ANILIST_API_URL = 'https://graphql.anilist.co'
const SPOTIFY_NEW_RELEASES_URL =
  'https://api.spotify.com/v1/browse/new-releases?limit=24'

export const dynamic = 'force-dynamic'

type PosterResponse = { posters: string[] }

async function fetchTmdbPosters(type: 'movie' | 'tv') {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is not configured.')
  }

  const url = new URL(`${TMDB_API_BASE}/trending/${type}/week`)
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!response.ok) {
    throw new Error(`TMDB ${type} fetch failed.`)
  }

  const payload = (await response.json()) as {
    results?: { poster_path?: string | null }[]
  }

  return (
    payload.results
      ?.map((item) =>
        item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      )
      .filter((url): url is string => Boolean(url)) ?? []
  )
}

async function fetchAniListPosters() {
  const page = Math.floor(Math.random() * 6) + 1
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          coverImage {
            extraLarge
          }
        }
      }
    }
  `

  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables: { page, perPage: 24 } }),
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error('AniList request failed.')
  }

  const payload = (await response.json()) as {
    data?: { Page?: { media?: { coverImage?: { extraLarge?: string } }[] } }
  }

  return (
    payload.data?.Page?.media
      ?.map((entry) => entry.coverImage?.extraLarge ?? null)
      .filter((url): url is string => Boolean(url)) ?? []
  )
}

async function fetchIgdbPosters() {
  const offset = Math.floor(Math.random() * 120)
  const body = [
    'fields cover.image_id;',
    'where cover.image_id != null & rating_count > 10;',
    'sort rating_count desc;',
    'limit 24;',
    `offset ${offset};`,
  ].join(' ')

  const payload = await igdbFetch<{ cover?: { image_id?: string | null } }[]>(
    'games',
    body,
  )

  return payload
    .map((entry) =>
      entry.cover?.image_id
        ? buildIgdbImageUrl(entry.cover.image_id, 't_cover_big')
        : null,
    )
    .filter((url): url is string => Boolean(url))
}

async function fetchSpotifyPosters() {
  const payload = await spotifyFetchJson<{
    albums?: { items?: { images?: { url?: string }[] }[] }
  }>(SPOTIFY_NEW_RELEASES_URL)

  return (
    payload.albums?.items
      ?.map((item) => item.images?.[0]?.url ?? null)
      .filter((url): url is string => Boolean(url)) ?? []
  )
}

function shuffle<T>(items: T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export async function GET() {
  const results = await Promise.allSettled([
    fetchTmdbPosters('movie'),
    fetchTmdbPosters('tv'),
    fetchAniListPosters(),
    fetchIgdbPosters(),
    fetchSpotifyPosters(),
  ])

  const posters = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)

  const unique = Array.from(new Set(posters))
  const selection = shuffle(unique).slice(0, 20)

  return NextResponse.json<PosterResponse>(
    { posters: selection },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
