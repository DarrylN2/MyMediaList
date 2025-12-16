import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { EntryStatus } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId.' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseServerClient()

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id,title,description,updated_at')
      .eq('id', id)
      .eq('user_identifier', userId)
      .maybeSingle()

    if (listError) throw listError
    if (!list)
      return NextResponse.json({ error: 'List not found.' }, { status: 404 })

    const { data: items, error: itemsError } = await supabase
      .from('list_items')
      .select(
        `
          created_at,
          media_items (
            id,
            title,
            poster_url,
            description,
            type,
            source,
            source_id,
            year,
            duration_minutes,
            genres,
            metadata
          )
        `,
      )
      .eq('list_id', id)
      .order('created_at', { ascending: false })

    if (itemsError) throw itemsError

    const mediaIds = (items ?? [])
      .map((row) => {
        const media = Array.isArray(row.media_items)
          ? row.media_items[0]
          : row.media_items
        return (media?.id as string | undefined) ?? undefined
      })
      .filter(Boolean) as string[]

    const { data: entries, error: entryError } = mediaIds.length
      ? await supabase
          .from('user_media')
          .select('media_id,status,user_rating,note,updated_at,first_rated_at')
          .eq('user_identifier', userId)
          .in('media_id', mediaIds)
      : { data: [], error: null }

    if (entryError) throw entryError

    const entryByMediaId = new Map(
      (entries ?? []).map((entry) => [
        entry.media_id as string,
        {
          status: entry.status as EntryStatus,
          rating: (entry.user_rating as number | null) ?? null,
          note: (entry.note as string | null) ?? null,
          updatedAt: entry.updated_at as string,
          firstRatedAt: (entry.first_rated_at as string | null) ?? null,
        },
      ]),
    )

    const itemsWithEntry = (items ?? []).map((row) => {
      const media = Array.isArray(row.media_items)
        ? row.media_items[0]
        : row.media_items
      const mediaId = (media?.id as string | undefined) ?? undefined
      return {
        ...row,
        entry: mediaId ? (entryByMediaId.get(mediaId) ?? null) : null,
      }
    })

    return NextResponse.json({ list, items: itemsWithEntry })
  } catch (error) {
    console.error('Failed to fetch list detail', error)
    return NextResponse.json({ error: 'Unable to load list.' }, { status: 500 })
  }
}
