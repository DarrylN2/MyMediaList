type SpotifyTokenCache = {
  accessToken: string
  expiresAt: number
}

let cachedToken: SpotifyTokenCache | null = null

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not configured.')
  }
  return { clientId, clientSecret }
}

export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken
  }

  const { clientId, clientSecret } = getSpotifyCredentials()
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    next: { revalidate: 0 },
  })

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; token_type?: string; expires_in?: number }
    | { error?: string; error_description?: string }
    | null

  if (!response.ok) {
    const message =
      (payload as { error_description?: string } | null)?.error_description ??
      'Spotify token request failed.'
    throw new Error(message)
  }

  const accessToken = (payload as { access_token?: string } | null)
    ?.access_token
  const expiresIn = (payload as { expires_in?: number } | null)?.expires_in

  if (!accessToken || typeof expiresIn !== 'number') {
    throw new Error('Spotify token response missing fields.')
  }

  cachedToken = { accessToken, expiresAt: now + expiresIn * 1000 }
  return accessToken
}

export async function spotifyFetchJson<T>(
  url: string,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<T> {
  const token = await getSpotifyAccessToken()

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 0 },
  })

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { status?: number; message?: string } }
    | null

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      'Spotify request failed.'
    throw new Error(message)
  }

  return payload as T
}
