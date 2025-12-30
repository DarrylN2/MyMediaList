import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getAuthenticatedUserId } from '@/lib/supabase-auth-server'
import type { EntryStatus, MediaProvider, MediaType } from '@/types'

const MEDIA_TYPES = [
  'movie',
  'tv',
  'anime',
  'game',
  'song',
  'album',
] as const satisfies readonly MediaType[]

function isMediaType(value: string): value is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(value)
}

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

async function findMediaRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  provider: string,
  providerId: string,
  type: MediaType,
) {
  const { data } = await supabase
    .from('media_items')
    .select('id')
    .eq('source', provider)
    .eq('source_id', providerId)
    .eq('type', type)
    .maybeSingle()

  return data
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
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

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')
  const providerId = searchParams.get('providerId')
  const type = searchParams.get('type')

  if (!provider || !providerId || !type) {
    return NextResponse.json(
      { error: 'Missing provider, providerId, or type.' },
      { status: 400 },
    )
  }

  if (!isMediaType(type)) {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
  }

  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const mediaRow = await findMediaRow(supabase, provider, providerId, type)

    if (!mediaRow) {
      return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
    }

    const { error } = await supabase
      .from('user_media')
      .delete()
      .eq('user_identifier', userId)
      .eq('media_id', mediaRow.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete entry', error)
    return NextResponse.json(
      { error: 'Unable to delete entry.' },
      { status: 500 },
    )
  }
}
