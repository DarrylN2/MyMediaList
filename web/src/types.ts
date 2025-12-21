export type MediaType = 'movie' | 'tv' | 'anime' | 'game' | 'song' | 'album'

export type EntryStatus =
  | 'Planning'
  | 'Watching'
  | 'Listening'
  | 'Playing'
  | 'Completed'
  | 'Dropped'

export type MediaProvider = 'tmdb' | 'anilist' | 'igdb' | 'spotify'

export interface PersonCredit {
  id?: string
  name: string
  role?: string
  imageUrl?: string
}

export interface Media {
  id: string
  type: MediaType
  title: string
  year?: number
  posterUrl?: string
  backdropUrl?: string
  additionalImages?: string[]
  externalUrl?: string
  provider: MediaProvider
  providerId: string
  description?: string
  durationMinutes?: number
  episodeCount?: number
  contentRating?: string
  directors?: string[]
  writers?: string[]
  cast?: string[]
  castMembers?: PersonCredit[]
  creatorCredits?: PersonCredit[]
  writerCredits?: PersonCredit[]
  producerCredits?: PersonCredit[]
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
