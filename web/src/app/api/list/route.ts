import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { EntryStatus, Media, MediaProvider } from '@/types'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'

interface PersistMediaPayload {
  userId: string
  media: {
    provider: MediaProvider
    providerId: string
    type: Media['type']
    title: string
    posterUrl?: string
    description?: string
    year?: number
    durationMinutes?: number
    genres?: string[]
    directors?: string[]
    writers?: string[]
    cast?: string[]
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
      directors: resolvedMeta.directors,
      writers: resolvedMeta.writers,
      cast: resolvedMeta.cast,
      metadata: resolvedMeta.metadata,
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
    .select('id,year,duration_minutes,genres,directors,writers,cast,metadata')
    .eq('source', provider)
    .eq('source_id', sourceId)
    .maybeSingle()

  return data
}

type MediaRow = {
  id: string
  year: number | null
  duration_minutes: number | null
  genres: string[] | null
  directors: string[] | null
  writers: string[] | null
  cast: string[] | null
  metadata: unknown | null
}

async function resolveMediaMetadata(
  media: PersistMediaPayload['media'],
): Promise<{
  year: number | null
  durationMinutes: number | null
  genres: string[] | null
  directors: string[] | null
  writers: string[] | null
  cast: string[] | null
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
    directors:
      Array.isArray(media.directors) && media.directors.length > 0
        ? media.directors.filter(Boolean)
        : null,
    writers:
      Array.isArray(media.writers) && media.writers.length > 0
        ? media.writers.filter(Boolean)
        : null,
    cast:
      Array.isArray(media.cast) && media.cast.length > 0
        ? media.cast.filter(Boolean)
        : null,
  }

  if (media.provider !== 'tmdb') {
    return { ...base, metadata: null }
  }

  const isSupportedType = media.type === 'movie' || media.type === 'tv'
  if (!isSupportedType) return { ...base, metadata: null }

  const needsFetch =
    base.year == null ||
    base.durationMinutes == null ||
    base.genres == null ||
    base.directors == null ||
    base.writers == null ||
    base.cast == null
  if (!needsFetch) {
    return {
      ...base,
      metadata: {
        provider: media.provider,
        providerId: media.providerId,
        year: base.year,
        durationMinutes: base.durationMinutes,
        genres: base.genres,
        directors: base.directors,
        writers: base.writers,
        cast: base.cast,
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
    url.searchParams.set('append_to_response', 'credits')
    url.searchParams.set('api_key', apiKey)
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return { ...base, metadata: null }
    const data = (await res.json()) as {
      release_date?: string
      first_air_date?: string
      runtime?: number
      episode_run_time?: number[]
      genres?: Array<{ name?: string }>
      credits?: {
        cast?: Array<{ name?: string }>
        crew?: Array<{ job?: string; name?: string }>
      }
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

    const crew = data.credits?.crew ?? []
    const directors =
      base.directors ??
      (crew
        .filter((member) => member.job?.toLowerCase() === 'director')
        .map((member) => member.name)
        .filter(Boolean) as string[])

    const writerJobs = new Set(['writer', 'screenplay', 'story', 'author'])
    const writers =
      base.writers ??
      (crew
        .filter((member) => {
          const job = member.job?.toLowerCase()
          return job ? writerJobs.has(job) : false
        })
        .map((member) => member.name)
        .filter(Boolean) as string[])

    const cast =
      base.cast ??
      ((data.credits?.cast ?? [])
        .slice(0, 10)
        .map((member) => member.name)
        .filter(Boolean) as string[])

    return {
      year: Number.isFinite(year) ? (year as number) : null,
      durationMinutes:
        Number.isFinite(durationMinutes) && durationMinutes != null
          ? (durationMinutes as number)
          : null,
      genres: genres.length > 0 ? genres : null,
      directors: directors.length > 0 ? directors : null,
      writers: writers.length > 0 ? writers : null,
      cast: cast.length > 0 ? cast : null,
      metadata: {
        provider: media.provider,
        providerId: media.providerId,
        year,
        durationMinutes,
        genres,
        directors,
        writers,
        cast,
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
  if (
    (row.directors == null ||
      (Array.isArray(row.directors) && row.directors.length === 0)) &&
    resolved.directors != null
  ) {
    update.directors = resolved.directors
  }
  if (
    (row.writers == null ||
      (Array.isArray(row.writers) && row.writers.length === 0)) &&
    resolved.writers != null
  ) {
    update.writers = resolved.writers
  }
  if (
    (row.cast == null || (Array.isArray(row.cast) && row.cast.length === 0)) &&
    resolved.cast != null
  ) {
    update.cast = resolved.cast
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
