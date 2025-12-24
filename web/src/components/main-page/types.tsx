import type { EntryStatus, MediaProvider, MediaType } from '@/types'

export type DashboardEntry = {
  status: EntryStatus
  rating: number | null
  note: string | null
  episodeProgress: number | null
  createdAt: string
  updatedAt: string
  media: {
    title: string
    posterUrl: string | null
    description: string | null
    type: MediaType
    provider: MediaProvider
    providerId: string
    year: number | null
    durationMinutes: number | null
    episodeCount: number | null
    genres: string[] | null
  }
}

export type ContinueItem = {
  id: string
  title: string
  posterUrl: string | null
  type: MediaType
  status: EntryStatus
  progressLabel: string
  progressValue: number
  href: string
}

export type ActivityChip = {
  id: string
  label: string
  value: string
  tone: 'primary' | 'secondary' | 'accent'
}

export type TimelineGroup = {
  id: string
  year: number
  month: string
  count: number
  items: DashboardEntry[]
}

export type CategoryStat = {
  id: string
  label: string
  count: number
  percentage: number
  colorVar: string
}

export type GenreStat = {
  label: string
  count: number
}

export type DashboardStats = {
  totalItems: number
  newThisWeek: number
  averageRating: number | null
  categoryDistribution: CategoryStat[]
  topGenres: GenreStat[]
  mostWatchedGenre: string | null
  mostActiveDay: string | null
}
