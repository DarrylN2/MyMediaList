import type { NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

function extractBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function getAuthenticatedUserId(request: NextRequest) {
  const token = extractBearerToken(request)
  if (!token) return null

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null

  return data.user.id
}
