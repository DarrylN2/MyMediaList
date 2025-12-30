# MyMediaList

Personal media tracker for movies, TV, anime, games, and music with a unified
search experience and a stats-heavy dashboard.

## Highlights

- Unified search across TMDB (movies/TV), AniList (anime), IGDB (games), and
  Spotify (tracks/albums)
- Dashboard with activity, timeline, recent additions, and category stats
- Lists, ratings, notes, and progress tracking for each entry
- Rich media detail pages with metadata, credits, and external links
- Demo mode when logged out so the UI stays fully interactive
- Supabase-backed auth and persistence with row-level security

## Tech stack

- Next.js App Router (React 19)
- Tailwind CSS + Radix UI primitives
- Supabase (Auth + Postgres)
- External data providers: TMDB, AniList, IGDB, Spotify

## Project layout

- `web/`: Next.js app (UI + API routes under `web/src/app/api`)
- `supabase/schema.sql`: database schema and RLS policies
- `docs/supabase-setup.md`: Supabase setup steps and migration notes

## Local development

1. Install dependencies:
   ```bash
   cd web
   npm install
   ```
2. Create `web/.env.local` with the required environment variables (see below).
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Environment variables

Create `web/.env.local` and add:

```
# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# TMDB (movies/TV)
TMDB_API_KEY=...

# Spotify (tracks/albums)
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# IGDB (games)
IGDB_CLIENT_ID=...
IGDB_CLIENT_SECRET=...
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only; never expose it to the browser.
- AniList uses public GraphQL, no key required.
- If IGDB credentials are missing, game search will return an error.

## Database setup

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Configure Supabase Auth (email + password).
4. Follow `docs/supabase-setup.md` for migration notes and env setup.

## Scripts

From `web/`:

- `npm run dev` - run the local dev server
- `npm run build` - build the production app
- `npm run start` - start the production build
- `npm run lint` - run eslint
