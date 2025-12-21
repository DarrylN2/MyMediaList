const IGDB_AUTH_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_API_BASE = 'https://api.igdb.com/v4'
const IGDB_IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload'
const TOKEN_BUFFER_MS = 60 * 1000

type IgdbTokenCache = {
  value: string
  expiresAt: number
}

let cachedToken: IgdbTokenCache | null = null

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }
  return value
}

async function getIgdbAccessToken() {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt - TOKEN_BUFFER_MS > now) {
    return cachedToken.value
  }

  const clientId = requireEnv('IGDB_CLIENT_ID')
  const clientSecret = requireEnv('IGDB_CLIENT_SECRET')
  const url = new URL(IGDB_AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('grant_type', 'client_credentials')

  const response = await fetch(url, {
    method: 'POST',
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`IGDB auth failed (${response.status}). ${text}`)
  }

  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }

  if (!payload.access_token || !payload.expires_in) {
    throw new Error('IGDB auth response missing access token.')
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  }

  return cachedToken.value
}

export async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const clientId = requireEnv('IGDB_CLIENT_ID')
  const token = await getIgdbAccessToken()
  const response = await fetch(`${IGDB_API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`IGDB request failed (${response.status}). ${text}`)
  }

  return (await response.json()) as T
}

export function buildIgdbImageUrl(imageId: string, size: string) {
  return `${IGDB_IMAGE_BASE}/${size}/${imageId}.jpg`
}
