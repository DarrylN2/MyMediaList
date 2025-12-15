import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { EntryStatus, Media, MediaProvider } from '@/types'

interface PersistMediaPayload {
  userId: string
  media: {
    provider: MediaProvider
    providerId: string
    type: Media['type']
    title: string
    posterUrl?: string
    description?: string
  }
  entry?: {
    status?: EntryStatus
    rating?: number | null
    note?: string
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const provider = searchParams.get('provider')
  const sourceId = searchParams.get('sourceId')

  if (!userId || !provider || !sourceId) {
    return NextResponse.json(
      { error: 'Missing userId, provider, or sourceId.' },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseServerClient()
    const mediaRow = await findMediaRow(supabase, provider, sourceId)

    if (!mediaRow) {
      return NextResponse.json({ entry: null })
    }

    const { data: entry, error } = await supabase
      .from('user_media')
      .select('status, user_rating, note')
      .eq('user_identifier', userId)
      .eq('media_id', mediaRow.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    return NextResponse.json({
      entry: entry
        ? {
            status: entry.status as EntryStatus,
            rating: entry.user_rating,
            note: entry.note,
          }
        : null,
    })
  } catch (error) {
    console.error('Failed to fetch entry', error)
    return NextResponse.json(
      { error: 'Unable to load saved entry.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as PersistMediaPayload

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  try {
    const entry = await upsertMediaEntry(payload)
    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Failed to upsert media entry', error)
    return NextResponse.json(
      { error: 'Unable to save media entry.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as PersistMediaPayload

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  try {
    const entry = await upsertMediaEntry(payload)
    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Failed to update media entry', error)
    return NextResponse.json(
      { error: 'Unable to update media entry.' },
      { status: 500 },
    )
  }
}

function isValidPayload(
  payload: PersistMediaPayload,
): payload is PersistMediaPayload {
  return Boolean(
    payload.userId &&
    payload.media?.provider &&
    payload.media.providerId &&
    payload.media.title &&
    payload.media.type,
  )
}

async function upsertMediaEntry(payload: PersistMediaPayload) {
  const supabase = getSupabaseServerClient()

  const mediaRow = await ensureMediaRow(supabase, payload.media)

  const { data: entry, error } = await supabase
    .from('user_media')
    .upsert(
      {
        user_identifier: payload.userId,
        media_id: mediaRow.id,
        status: payload.entry?.status ?? 'Planning',
        user_rating: payload.entry?.rating ?? null,
        note: payload.entry?.note ?? null,
      },
      { onConflict: 'user_identifier,media_id' },
    )
    .select('status, user_rating, note')
    .single()

  if (error) {
    throw error
  }

  return {
    status: entry.status as EntryStatus,
    rating: entry.user_rating,
    note: entry.note,
  }
}

async function ensureMediaRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  media: PersistMediaPayload['media'],
) {
  const existing = await findMediaRow(
    supabase,
    media.provider,
    media.providerId,
  )
  if (existing) {
    return existing
  }

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

  if (error) {
    throw error
  }

  return data
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
