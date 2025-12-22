import type { MediaProvider, MediaType } from '@/types'

export function buildMediaRouteId(media: {
  provider: MediaProvider
  providerId: string
  type: MediaType
}) {
  if (media.provider === 'tmdb') {
    if (media.type === 'tv') return `tmdb-tv-${media.providerId}`
    return `tmdb-${media.providerId}`
  }
  if (media.provider === 'anilist') {
    return `anilist-anime-${media.providerId}`
  }
  if (media.provider === 'igdb') {
    return `igdb-game-${media.providerId}`
  }
  return `${media.provider}-${media.providerId}`
}
