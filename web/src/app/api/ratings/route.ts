import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { EntryStatus, MediaType } from '@/types'

type RatedEntry = {
  status: EntryStatus
  rating: number
  note: string | null
  updatedAt: string
  firstRatedAt: string | null
  media: {
    title: string
    posterUrl: string | null
    description: string | null
    type: MediaType
    provider: string
    providerId: string
    year: number | null
    durationMinutes: number | null
    genres: string[] | null
    directors: string[] | null
    writers: string[] | null
    cast: string[] | null
  }
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
          updated_at,
          first_rated_at,
          media_items (
            title,
            poster_url,
            description,
            type,
            source,
            source_id,
            year,
            duration_minutes,
            genres,
            directors,
            writers,
            cast
          )
        `,
      )
      .eq('user_identifier', userId)
      .not('user_rating', 'is', null)
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    const items: RatedEntry[] = (data ?? [])
      .map((row) => {
        const media = Array.isArray(row.media_items)
          ? row.media_items[0]
          : row.media_items
        if (!media || row.user_rating == null) return null

        return {
          status: row.status as EntryStatus,
          rating: Number(row.user_rating),
          note: row.note ?? null,
          updatedAt: row.updated_at as string,
          firstRatedAt: (row.first_rated_at as string | null) ?? null,
          media: {
            title: media.title as string,
            posterUrl: (media.poster_url as string | null) ?? null,
            description: (media.description as string | null) ?? null,
            type: media.type as MediaType,
            provider: media.source as string,
            providerId: media.source_id as string,
            year: (media.year as number | null) ?? null,
            durationMinutes: (media.duration_minutes as number | null) ?? null,
            genres: (media.genres as string[] | null) ?? null,
            directors: (media.directors as string[] | null) ?? null,
            writers: (media.writers as string[] | null) ?? null,
            cast: (media.cast as string[] | null) ?? null,
          },
        }
      })
      .filter(Boolean) as RatedEntry[]

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch ratings', error)
    return NextResponse.json(
      { error: 'Unable to load rated entries.' },
      { status: 500 },
    )
  }
}
