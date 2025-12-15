import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { EntryStatus, MediaType } from '@/types'

type RatedEntry = {
  status: EntryStatus
  rating: number
  note: string | null
  updatedAt: string
  media: {
    title: string
    posterUrl: string | null
    type: MediaType
    provider: string
    providerId: string
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
          media_items (
            title,
            poster_url,
            type,
            source,
            source_id
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
          media: {
            title: media.title as string,
            posterUrl: (media.poster_url as string | null) ?? null,
            type: media.type as MediaType,
            provider: media.source as string,
            providerId: media.source_id as string,
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
