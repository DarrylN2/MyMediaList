import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

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
            source_id
          )
        `,
      )
      .eq('list_id', id)
      .order('created_at', { ascending: false })

    if (itemsError) throw itemsError

    return NextResponse.json({ list, items: items ?? [] })
  } catch (error) {
    console.error('Failed to fetch list detail', error)
    return NextResponse.json({ error: 'Unable to load list.' }, { status: 500 })
  }
}
