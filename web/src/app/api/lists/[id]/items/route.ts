import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { Media, MediaProvider } from '@/types'

interface MediaPayload {
  provider: MediaProvider
  providerId: string
  type: Media['type']
  title: string
  posterUrl?: string
  description?: string
}

function isValidBody(
  body: unknown,
): body is { userId: string; media: MediaPayload } {
  const payload = body as { userId?: unknown; media?: Partial<MediaPayload> }
  return Boolean(
    typeof payload?.userId === 'string' &&
    payload.userId.length > 0 &&
    payload.media &&
    payload.media.provider &&
    payload.media.providerId &&
    payload.media.type &&
    payload.media.title,
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listId } = await params
  const body = (await request.json()) as unknown

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseServerClient()

    // Verify list ownership
    const { data: listRow, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listId)
      .eq('user_identifier', body.userId)
      .maybeSingle()
    if (listError) throw listError
    if (!listRow) {
      return NextResponse.json({ error: 'List not found.' }, { status: 404 })
    }

    const mediaRow = await ensureMediaRow(supabase, body.media)

    const { error: insertError } = await supabase
      .from('list_items')
      .insert({ list_id: listId, media_id: mediaRow.id })

    if (insertError) throw insertError

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to add list item', error)
    return NextResponse.json(
      { error: 'Unable to add item to list.' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listId } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const mediaId = searchParams.get('mediaId')

  if (!userId || !mediaId) {
    return NextResponse.json(
      { error: 'Missing userId or mediaId.' },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseServerClient()

    const { data: listRow, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listId)
      .eq('user_identifier', userId)
      .maybeSingle()
    if (listError) throw listError
    if (!listRow) {
      return NextResponse.json({ error: 'List not found.' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('media_id', mediaId)

    if (deleteError) throw deleteError

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to remove list item', error)
    return NextResponse.json(
      { error: 'Unable to remove item from list.' },
      { status: 500 },
    )
  }
}

async function findMediaRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  provider: string,
  sourceId: string,
) {
  const { data } = await supabase
    .from('media_items')
    .select('id')
    .eq('source', provider)
    .eq('source_id', sourceId)
    .maybeSingle()

  return data
}

async function ensureMediaRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  media: MediaPayload,
) {
  const existing = await findMediaRow(
    supabase,
    media.provider,
    media.providerId,
  )
  if (existing) return existing

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      source: media.provider,
      source_id: media.providerId,
      type: media.type,
      title: media.title,
      poster_url: media.posterUrl ?? null,
      description: media.description ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}
