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
            directors,
            writers,
            cast,
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
          .select(
            'media_id,status,user_rating,note,episode_progress,updated_at,first_rated_at',
          )
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
          episodeProgress:
            typeof entry.episode_progress === 'number' &&
            Number.isFinite(entry.episode_progress)
              ? entry.episode_progress
              : null,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const payload = (await request.json()) as {
    userId?: string
    title?: string
    description?: string | null
  }

  const userId = payload.userId?.trim()
  const title = payload.title?.trim()
  const description = payload.description?.trim()

  if (!userId || !title) {
    return NextResponse.json(
      { error: 'Missing userId or title.' },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('lists')
      .update({
        title,
        description: description || null,
      })
      .eq('id', id)
      .eq('user_identifier', userId)
      .select('id,title,description,updated_at')
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'List not found.' }, { status: 404 })
    }

    return NextResponse.json({ list: data })
  } catch (error) {
    console.error('Failed to update list', error)
    return NextResponse.json(
      { error: 'Unable to update list.' },
      { status: 500 },
    )
  }
}

export async function DELETE(
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
    const { data: listRow, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', id)
      .eq('user_identifier', userId)
      .maybeSingle()

    if (listError) throw listError
    if (!listRow) {
      return NextResponse.json({ error: 'List not found.' }, { status: 404 })
    }

    const { error: itemDeleteError } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', id)

    if (itemDeleteError) throw itemDeleteError

    const { error: deleteError } = await supabase
      .from('lists')
      .delete()
      .eq('id', id)
      .eq('user_identifier', userId)

    if (deleteError) throw deleteError

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete list', error)
    return NextResponse.json(
      { error: 'Unable to delete list.' },
      { status: 500 },
    )
  }
}
