import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getAuthenticatedUserId } from '@/lib/supabase-auth-server'

type ListRow = {
  id: string
  title: string
  description: string | null
  updated_at: string
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('lists')
      .select('id,title,description,updated_at')
      .eq('user_identifier', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ lists: (data ?? []) as ListRow[] })
  } catch (error) {
    console.error('Failed to fetch lists', error)
    return NextResponse.json(
      { error: 'Unable to load lists.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    title?: string
    description?: string
  }

  const title = payload.title?.trim()
  const description = payload.description?.trim()

  const userId = await getAuthenticatedUserId(request)
  if (!userId || !title) {
    return NextResponse.json(
      { error: userId ? 'Missing title.' : 'Unauthorized.' },
      { status: userId ? 400 : 401 },
    )
  }

  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('lists')
      .insert({
        user_identifier: userId,
        title,
        description: description || null,
      })
      .select('id,title,description,updated_at')
      .single()

    if (error) throw error

    return NextResponse.json({ list: data as ListRow })
  } catch (error) {
    console.error('Failed to create list', error)
    return NextResponse.json(
      { error: 'Unable to create list.' },
      { status: 500 },
    )
  }
}
