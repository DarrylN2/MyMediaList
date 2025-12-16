import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { Media, MediaProvider } from '@/types'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'

interface MediaPayload {
  provider: MediaProvider
  providerId: string
  type: Media['type']
  title: string
  posterUrl?: string
  description?: string
  year?: number
  durationMinutes?: number
  genres?: string[]
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
    .select('id,year,duration_minutes,genres,metadata')
    .eq('source', provider)
    .eq('source_id', sourceId)
    .maybeSingle()

  return data
}

async function ensureMediaRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  media: MediaPayload,
) {
  const resolvedMeta = await resolveMediaMetadata(media)

  const existing = await findMediaRow(
    supabase,
    media.provider,
    media.providerId,
  )
  if (existing) {
    await patchMediaRowIfMissing(supabase, existing, resolvedMeta)
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
      year: resolvedMeta.year,
      duration_minutes: resolvedMeta.durationMinutes,
      genres: resolvedMeta.genres,
      metadata: resolvedMeta.metadata,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

type MediaRow = {
  id: string
  year: number | null
  duration_minutes: number | null
  genres: string[] | null
  metadata: unknown | null
}

async function resolveMediaMetadata(media: MediaPayload): Promise<{
  year: number | null
  durationMinutes: number | null
  genres: string[] | null
  metadata: Record<string, unknown> | null
}> {
  const base = {
    year: Number.isFinite(media.year) ? (media.year as number) : null,
    durationMinutes: Number.isFinite(media.durationMinutes)
      ? (media.durationMinutes as number)
      : null,
    genres:
      Array.isArray(media.genres) && media.genres.length > 0
        ? media.genres.filter(Boolean)
        : null,
  }

  if (media.provider !== 'tmdb') {
    return { ...base, metadata: null }
  }

  const isSupportedType = media.type === 'movie' || media.type === 'tv'
  if (!isSupportedType) return { ...base, metadata: null }

  const needsFetch =
    base.year == null || base.durationMinutes == null || base.genres == null
  if (!needsFetch) {
    return {
      ...base,
      metadata: {
        provider: media.provider,
        providerId: media.providerId,
        year: base.year,
        durationMinutes: base.durationMinutes,
        genres: base.genres,
      },
    }
  }

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return { ...base, metadata: null }

  try {
    const url = new URL(
      `${TMDB_API_BASE}/${media.type}/${encodeURIComponent(media.providerId)}`,
    )
    url.searchParams.set('language', 'en-US')
    url.searchParams.set('api_key', apiKey)
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return { ...base, metadata: null }
    const data = (await res.json()) as {
      release_date?: string
      first_air_date?: string
      runtime?: number
      episode_run_time?: number[]
      genres?: Array<{ name?: string }>
    }

    const year = base.year
      ? base.year
      : media.type === 'tv'
        ? data.first_air_date
          ? Number(data.first_air_date.slice(0, 4))
          : null
        : data.release_date
          ? Number(data.release_date.slice(0, 4))
          : null

    const durationMinutes =
      base.durationMinutes ??
      (media.type === 'tv'
        ? (data.episode_run_time?.[0] ?? null)
        : (data.runtime ?? null))

    const genres =
      base.genres ??
      ((data.genres ?? []).map((g) => g.name).filter(Boolean) as string[])

    return {
      year: Number.isFinite(year) ? (year as number) : null,
      durationMinutes:
        Number.isFinite(durationMinutes) && durationMinutes != null
          ? (durationMinutes as number)
          : null,
      genres: genres.length > 0 ? genres : null,
      metadata: {
        provider: media.provider,
        providerId: media.providerId,
        year,
        durationMinutes,
        genres,
      },
    }
  } catch {
    return { ...base, metadata: null }
  }
}

async function patchMediaRowIfMissing(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  existing: unknown,
  resolved: Awaited<ReturnType<typeof resolveMediaMetadata>>,
) {
  const row = existing as Partial<MediaRow>
  const update: Record<string, unknown> = {}

  if (row.year == null && resolved.year != null) update.year = resolved.year
  if (row.duration_minutes == null && resolved.durationMinutes != null) {
    update.duration_minutes = resolved.durationMinutes
  }
  if (
    (row.genres == null ||
      (Array.isArray(row.genres) && row.genres.length === 0)) &&
    resolved.genres != null
  ) {
    update.genres = resolved.genres
  }
  if (row.metadata == null && resolved.metadata != null) {
    update.metadata = resolved.metadata
  }

  if (Object.keys(update).length === 0) return

  await supabase
    .from('media_items')
    .update(update)
    .eq('id', row.id as string)
}
