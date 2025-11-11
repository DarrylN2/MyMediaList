import type { Entry, Media } from '@/types'

export const mockMedia: Media[] = [
  {
    id: '1',
    type: 'movie',
    title: 'The Matrix',
    year: 1999,
    posterUrl:
      'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    provider: 'tmdb',
    providerId: '603',
  },
  {
    id: '2',
    type: 'anime',
    title: 'Attack on Titan',
    year: 2013,
    posterUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
    provider: 'anilist',
    providerId: '16498',
  },
  {
    id: '3',
    type: 'game',
    title: 'The Witcher 3: Wild Hunt',
    year: 2015,
    posterUrl:
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
    provider: 'igdb',
    providerId: '1942',
  },
]

export const mockEntries: Entry[] = [
  {
    id: '1',
    userId: 'user1',
    mediaId: '1',
    status: 'Completed',
    rating: 9,
    startedAt: '2024-01-01',
    finishedAt: '2024-01-05',
    notes: 'Amazing movie!',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    userId: 'user1',
    mediaId: '2',
    status: 'Watching',
    rating: 8,
    startedAt: '2024-02-01',
    notes: 'Great anime',
    createdAt: '2024-02-01',
  },
]
