import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { EntryStatus, MediaProvider, MediaType } from '@/types'

type EntryItem = {
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

function getEpisodeCount(metadata: unknown): number | null {
  if (
    metadata == null ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata)
  ) {
    return null
  }
  const value = (metadata as Record<string, unknown>).episodeCount
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId.' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from('user_media')
      .select(
        `
          status,
          user_rating,
          note,
          episode_progress,
          created_at,
          updated_at,
          media_items (
            title,
            poster_url,
            description,
            type,
            source,
            source_id,
            year,
            duration_minutes,
            metadata,
            genres
          )
        `,
      )
      .eq('user_identifier', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const items: EntryItem[] = (data ?? [])
      .map((row) => {
        const media = Array.isArray(row.media_items)
          ? row.media_items[0]
          : row.media_items
        if (!media) return null

        const ratingValue =
          typeof row.user_rating === 'number'
            ? row.user_rating
            : typeof row.user_rating === 'string'
              ? Number(row.user_rating)
              : null

        return {
          status: row.status as EntryStatus,
          rating:
            typeof ratingValue === 'number' && Number.isFinite(ratingValue)
              ? ratingValue
              : null,
          note: row.note ?? null,
          episodeProgress:
            typeof row.episode_progress === 'number' &&
            Number.isFinite(row.episode_progress)
              ? row.episode_progress
              : null,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          media: {
            title: media.title as string,
            posterUrl: (media.poster_url as string | null) ?? null,
            description: (media.description as string | null) ?? null,
            type: media.type as MediaType,
            provider: media.source as MediaProvider,
            providerId: media.source_id as string,
            year: (media.year as number | null) ?? null,
            durationMinutes: (media.duration_minutes as number | null) ?? null,
            episodeCount: getEpisodeCount(media.metadata),
            genres: (media.genres as string[] | null) ?? null,
          },
        }
      })
      .filter(Boolean) as EntryItem[]

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch entries', error)
    return NextResponse.json(
      { error: 'Unable to load entries.' },
      { status: 500 },
    )
  }
}
