export type MediaType = 'movie' | 'tv' | 'anime' | 'game' | 'song'

export type EntryStatus =
  | 'Planning'
  | 'Watching'
  | 'Playing'
  | 'Completed'
  | 'Dropped'

export type MediaProvider = 'tmdb' | 'anilist' | 'igdb' | 'spotify'

export interface Media {
  id: string
  type: MediaType
  title: string
  year?: number
  posterUrl?: string
  provider: MediaProvider
  providerId: string
  description?: string
  durationMinutes?: number
  contentRating?: string
  directors?: string[]
  writers?: string[]
  cast?: string[]
  studios?: string[]
  genres?: string[]
}

export interface Entry {
  id: string
  userId: string
  mediaId: string
  status: EntryStatus
  rating?: number
  startedAt?: Date | string
  finishedAt?: Date | string
  notes?: string
  createdAt: Date | string
}
