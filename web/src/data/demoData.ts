import type { DashboardEntry } from '@/components/main-page/types'
import type { EntryStatus, Media, MediaType } from '@/types'
import { buildMediaRouteId } from '@/lib/media-route'
import { mockMedia } from '@/mocks'
import { mockLists } from '@/data/mockLists'

export type DemoRatedItem = {
  title: string
  type: MediaType
  status: EntryStatus
  rating: number
  updatedAt: string
  firstRatedAt: string | null
  note: string | null
  episodeProgress: number | null
  coverUrl: string | null
  description: string | null
  year: number | null
  durationMinutes: number | null
  episodeCount: number | null
  genres: string[] | null
  directors: string[] | null
  writers: string[] | null
  cast: string[] | null
  provider: string
  providerId: string
}

const toDashboardEntry = (
  media: Media,
  input: {
    status: EntryStatus
    rating: number | null
    note?: string | null
    episodeProgress?: number | null
    createdAt: string
    updatedAt?: string
  },
): DashboardEntry => ({
  status: input.status,
  rating: input.rating,
  note: input.note ?? null,
  episodeProgress: input.episodeProgress ?? null,
  createdAt: input.createdAt,
  updatedAt: input.updatedAt ?? input.createdAt,
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
})

export const demoDashboardEntries: DashboardEntry[] = [
  toDashboardEntry(mockMedia[0], {
    status: 'Completed',
    rating: 10,
    note: 'A no-notes sci-fi classic.',
    createdAt: '2025-12-22',
  }),
  toDashboardEntry(mockMedia[1], {
    status: 'Watching',
    rating: 9,
    episodeProgress: 7,
    createdAt: '2025-12-20',
  }),
  toDashboardEntry(mockMedia[2], {
    status: 'Playing',
    rating: 9,
    createdAt: '2025-12-19',
  }),
  toDashboardEntry(mockMedia[3], {
    status: 'Completed',
    rating: 9,
    createdAt: '2025-12-17',
  }),
  toDashboardEntry(mockMedia[4], {
    status: 'Watching',
    rating: 8,
    episodeProgress: 4,
    createdAt: '2025-12-16',
  }),
  toDashboardEntry(mockMedia[5], {
    status: 'Completed',
    rating: 9,
    createdAt: '2025-12-14',
  }),
  toDashboardEntry(mockMedia[6], {
    status: 'Planning',
    rating: 8,
    createdAt: '2025-12-10',
  }),
  toDashboardEntry(mockMedia[7], {
    status: 'Watching',
    rating: 8,
    episodeProgress: 12,
    createdAt: '2025-12-08',
  }),
]

export const demoRatedItems: DemoRatedItem[] = [
  {
    title: mockMedia[0].title,
    type: mockMedia[0].type,
    status: 'Completed',
    rating: 10,
    updatedAt: '2025-12-22',
    firstRatedAt: '2025-12-21',
    note: 'Still a benchmark for sci-fi action.',
    episodeProgress: null,
    coverUrl: mockMedia[0].posterUrl ?? null,
    description: mockMedia[0].description ?? null,
    year: mockMedia[0].year ?? null,
    durationMinutes: mockMedia[0].durationMinutes ?? null,
    episodeCount: mockMedia[0].episodeCount ?? null,
    genres: mockMedia[0].genres ?? null,
    directors: mockMedia[0].directors ?? null,
    writers: mockMedia[0].writers ?? null,
    cast: mockMedia[0].cast ?? null,
    provider: mockMedia[0].provider,
    providerId: mockMedia[0].providerId,
  },
  {
    title: mockMedia[1].title,
    type: mockMedia[1].type,
    status: 'Watching',
    rating: 9,
    updatedAt: '2025-12-21',
    firstRatedAt: '2025-12-18',
    note: 'Big stakes and even bigger payoffs.',
    episodeProgress: 7,
    coverUrl: mockMedia[1].posterUrl ?? null,
    description: mockMedia[1].description ?? null,
    year: mockMedia[1].year ?? null,
    durationMinutes: mockMedia[1].durationMinutes ?? null,
    episodeCount: mockMedia[1].episodeCount ?? null,
    genres: mockMedia[1].genres ?? null,
    directors: mockMedia[1].directors ?? null,
    writers: mockMedia[1].writers ?? null,
    cast: mockMedia[1].cast ?? null,
    provider: mockMedia[1].provider,
    providerId: mockMedia[1].providerId,
  },
  {
    title: mockMedia[2].title,
    type: mockMedia[2].type,
    status: 'Playing',
    rating: 9,
    updatedAt: '2025-12-19',
    firstRatedAt: '2025-12-17',
    note: 'Quests for days, with a perfect soundtrack.',
    episodeProgress: null,
    coverUrl: mockMedia[2].posterUrl ?? null,
    description: mockMedia[2].description ?? null,
    year: mockMedia[2].year ?? null,
    durationMinutes: mockMedia[2].durationMinutes ?? null,
    episodeCount: mockMedia[2].episodeCount ?? null,
    genres: mockMedia[2].genres ?? null,
    directors: mockMedia[2].directors ?? null,
    writers: mockMedia[2].writers ?? null,
    cast: mockMedia[2].cast ?? null,
    provider: mockMedia[2].provider,
    providerId: mockMedia[2].providerId,
  },
  {
    title: mockMedia[3].title,
    type: mockMedia[3].type,
    status: 'Completed',
    rating: 9,
    updatedAt: '2025-12-16',
    firstRatedAt: '2025-12-16',
    note: 'Every frame is a wallpaper.',
    episodeProgress: null,
    coverUrl: mockMedia[3].posterUrl ?? null,
    description: mockMedia[3].description ?? null,
    year: mockMedia[3].year ?? null,
    durationMinutes: mockMedia[3].durationMinutes ?? null,
    episodeCount: mockMedia[3].episodeCount ?? null,
    genres: mockMedia[3].genres ?? null,
    directors: mockMedia[3].directors ?? null,
    writers: mockMedia[3].writers ?? null,
    cast: mockMedia[3].cast ?? null,
    provider: mockMedia[3].provider,
    providerId: mockMedia[3].providerId,
  },
]

const demoMediaMap = new Map<string, Media>()

const addDemoMedia = (routeId: string, media: Media) => {
  if (!demoMediaMap.has(routeId)) {
    demoMediaMap.set(routeId, media)
  }
}

mockMedia.forEach((media) => {
  addDemoMedia(
    buildMediaRouteId({
      provider: media.provider,
      providerId: media.providerId,
      type: media.type,
    }),
    media,
  )
})

mockLists.forEach((list) => {
  const type: MediaType =
    list.type === 'anime' ? 'anime' : list.type === 'games' ? 'game' : 'movie'
  list.items.forEach((item) => {
    const provider =
      item.provider ??
      (type === 'anime' ? 'anilist' : type === 'game' ? 'igdb' : 'tmdb')
    addDemoMedia(item.mediaId, {
      id: `${provider}:${item.mediaId}`,
      type,
      title: item.title,
      year: item.releaseYear,
      posterUrl: item.coverUrl,
      provider,
      providerId: item.mediaId,
      description: item.note ?? list.description,
      durationMinutes: item.runtimeMinutes,
      genres: item.genres,
    })
  })
})

export const getDemoMediaById = (routeId: string): Media | null =>
  demoMediaMap.get(routeId) ?? null
