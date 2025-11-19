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
  {
    id: '4',
    type: 'movie',
    title: 'Spider-Man: Across the Spider-Verse',
    year: 2023,
    posterUrl:
      'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4e61K2zH6tYUDMx2.jpg',
    provider: 'tmdb',
    providerId: '569094',
  },
  {
    id: '5',
    type: 'anime',
    title: 'Demon Slayer',
    year: 2019,
    posterUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg',
    provider: 'anilist',
    providerId: '101922',
  },
  {
    id: '6',
    type: 'movie',
    title: 'Inception',
    year: 2010,
    posterUrl:
      'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    provider: 'tmdb',
    providerId: '27205',
  },
  {
    id: '7',
    type: 'game',
    title: 'Elden Ring',
    year: 2022,
    posterUrl:
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
    provider: 'igdb',
    providerId: '119133',
  },
  {
    id: '8',
    type: 'anime',
    title: 'My Hero Academia',
    year: 2016,
    posterUrl:
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-RoPwgrZ32gM3.jpg',
    provider: 'anilist',
    providerId: '21459',
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

// Mock data for favourites section
export const mockFavourites = [
  {
    id: 'fav1',
    media: mockMedia[0], // The Matrix
    rating: 9.5,
    isSpotlight: true,
  },
  {
    id: 'fav2',
    media: mockMedia[1], // Attack on Titan
    rating: 9.0,
    isSpotlight: false,
  },
  {
    id: 'fav3',
    media: mockMedia[2], // The Witcher 3
    rating: 8.5,
    isSpotlight: false,
  },
  {
    id: 'fav4',
    media: mockMedia[4], // Spider-Man
    rating: 9.8,
    isSpotlight: false,
  },
  {
    id: 'fav5',
    media: mockMedia[5], // Demon Slayer
    rating: 9.2,
    isSpotlight: false,
  },
  {
    id: 'fav6',
    media: mockMedia[6], // Inception
    rating: 9.5,
    isSpotlight: false,
  },
  {
    id: 'fav7',
    media: mockMedia[7], // Elden Ring
    rating: 9.0,
    isSpotlight: false,
  },
]

// Mock data for timeline
export const mockTimeline = [
  {
    month: 'Jan',
    year: 2024,
    count: 12,
    featured: [mockMedia[0]],
  },
  {
    month: 'June',
    year: 2024,
    count: 8,
    featured: [mockMedia[4]],
  },
  {
    month: 'Sept',
    year: 2024,
    count: 15,
    featured: [mockMedia[2]],
  },
  {
    month: 'Dec',
    year: 2024,
    count: 5,
    featured: [mockMedia[6]],
  },
]

// Mock data for stats
export const mockStats = {
  totalItems: 124,
  streak: 4,
  newThisWeek: 3,
  pieData: [
    { category: 'games', count: 45, percentage: 36 },
    { category: 'movies', count: 38, percentage: 31 },
    { category: 'songs', count: 25, percentage: 20 },
    { category: 'anime', count: 16, percentage: 13 },
  ],
  mostWatchedGenre: 'Sci-Fi',
  mostActiveDay: 'Saturday',
  averageRating: 8.2,
}

// Mock data for continue watching/playing
export const mockContinueWatching = [
  {
    id: 'cw1',
    media: mockMedia[1],
    progress: 58,
    episode: 'EP 7/12',
    status: 'Watching' as const,
  },
  {
    id: 'cw2',
    media: mockMedia[2],
    progress: 60,
    episode: '60% complete',
    status: 'Playing' as const,
  },
  {
    id: 'cw3',
    media: mockMedia[7],
    progress: 75,
    episode: 'EP 18/24',
    status: 'Watching' as const,
  },
]

// Mock data for recently added
export const mockRecentlyAdded = [
  {
    id: 'ra1',
    media: mockMedia[0],
    addedDate: '2024-11-15',
  },
  {
    id: 'ra2',
    media: mockMedia[1],
    addedDate: '2024-11-14',
  },
  {
    id: 'ra3',
    media: mockMedia[2],
    addedDate: '2024-11-13',
  },
  {
    id: 'ra4',
    media: mockMedia[4],
    addedDate: '2024-11-12',
  },
]
