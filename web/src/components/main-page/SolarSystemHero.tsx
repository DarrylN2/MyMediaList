'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Pause, Play, Shuffle, ExternalLink } from 'lucide-react'
import type { DashboardEntry } from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'
import { Badge } from '@/components/ui/badge'
import { RatingStars } from '@/components/RatingStars'

type RatedItem = DashboardEntry & { rating: number }

const categoryColorMap: Record<string, string> = {
  movie: 'var(--category-movie)',
  tv: 'var(--category-tv)',
  anime: 'var(--category-anime)',
  song: 'var(--category-song)',
  album: 'var(--category-song)',
  game: 'var(--category-game)',
}

const formatYear = (value: number | null) => {
  if (!value) return 'Unknown year'
  return String(value)
}

const formatShortDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getMediaKey = (item: DashboardEntry) =>
  `${item.media.provider}:${item.media.providerId}`

export function SolarSystemHero({ items }: { items: DashboardEntry[] }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [lastHoveredId, setLastHoveredId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null)
  const [orbitEpoch, setOrbitEpoch] = useState(0)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShuffledIds(null))
    return () => cancelAnimationFrame(raf)
  }, [items])

  const { sunItem, planets } = useMemo(() => {
    const rated = items
      .filter((entry) => typeof entry.rating === 'number' && entry.rating > 0)
      .map((entry) => entry as RatedItem)
    const sorted = [...rated].sort((a, b) => b.rating - a.rating)
    const sun = sorted.find((entry) => entry.rating === 10) ?? sorted[0]
    const orbit = sorted.filter((entry) => entry !== sun).slice(0, 8)
    return { sunItem: sun, planets: orbit }
  }, [items])

  const planetOrder = useMemo(() => {
    if (!planets.length) return []
    if (!shuffledIds) return planets
    const map = new Map(planets.map((planet) => [getMediaKey(planet), planet]))
    return shuffledIds.map((id) => map.get(id)).filter(Boolean) as RatedItem[]
  }, [planets, shuffledIds])

  const activeItem = useMemo(() => {
    if (!sunItem) return null
    const id = hoveredId ?? lastHoveredId
    if (!id) return sunItem
    return planetOrder.find((planet) => getMediaKey(planet) === id) ?? sunItem
  }, [hoveredId, lastHoveredId, planetOrder, sunItem])

  const orbitRadius = isMobile ? 140 : 220
  const sunSize = isMobile ? 180 : 260
  const planetSize = isMobile ? 58 : 86

  const typeLabel = activeItem
    ? activeItem.media.type === 'movie'
      ? 'FILM'
      : activeItem.media.type === 'tv'
        ? 'TV'
        : activeItem.media.type === 'anime'
          ? 'ANIME'
          : activeItem.media.type === 'game'
            ? 'GAME'
            : activeItem.media.type === 'album'
              ? 'ALBUM'
              : activeItem.media.type === 'song'
                ? 'TRACK'
                : 'MUSIC'
    : ''

  const activeGenres = (activeItem?.media.genres ?? [])
    .filter(Boolean)
    .slice(0, 3)

  const calculatePlanetPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2
    return {
      x: Math.cos(angle) * orbitRadius,
      y: Math.sin(angle) * orbitRadius,
    }
  }

  const handleShuffle = () => {
    const ids = planets.map((planet) => getMediaKey(planet))
    const next = [...ids].sort(() => Math.random() - 0.5)
    setShuffledIds(next)
    setOrbitEpoch((value) => value + 1)
  }

  if (!sunItem) {
    return (
      <section className="rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-sm">
        <h2 className="text-2xl font-semibold">Top rated solar system</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Rate a few items to unlock your orbit.
        </p>
        <ButtonLink href="/search">Find something to rate</ButtonLink>
      </section>
    )
  }

  const sunColor = categoryColorMap[sunItem.media.type] ?? 'var(--primary)'

  return (
    <section className="relative py-4 md:py-6">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
          Your personal list for{' '}
          <span className="bg-gradient-to-r from-primary via-[var(--category-tv)] to-[var(--category-song)] bg-clip-text text-transparent">
            medias
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Track what you&apos;re watching, rate favourites, and jump back in.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <div className="self-center text-center lg:text-left">
          <p className="text-3xl font-semibold leading-snug md:text-4xl">
            These are your <span className="text-primary">favourites</span> →
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The center card is your top-rated pick. Hover an orbiting cover to
            preview details.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="relative flex items-center justify-center"
            style={{ height: `${orbitRadius * 2 + sunSize}px` }}
          >
            <div
              className="absolute rounded-full border border-border/40"
              style={{
                width: `${orbitRadius * 2}px`,
                height: `${orbitRadius * 2}px`,
                boxShadow: `0 0 0 1px ${sunColor}26 inset`,
              }}
            />

            <div
              key={orbitEpoch}
              className={`absolute ${isPlaying ? 'orbit-rotate' : ''}`}
              style={{
                width: `${orbitRadius * 2}px`,
                height: `${orbitRadius * 2}px`,
              }}
            >
              {planetOrder.map((planet, index) => {
                const pos = calculatePlanetPosition(index, planetOrder.length)
                const key = getMediaKey(planet)
                const color =
                  categoryColorMap[planet.media.type] ?? 'var(--primary)'
                return (
                  <div
                    key={key}
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '50%',
                      marginLeft: `${pos.x - planetSize / 2}px`,
                      marginTop: `${pos.y - planetSize / 2}px`,
                    }}
                  >
                    <div className={isPlaying ? 'orbit-counter' : ''}>
                      <button
                        type="button"
                        onMouseEnter={() => {
                          setHoveredId(key)
                          setLastHoveredId(key)
                        }}
                        onMouseLeave={() => setHoveredId(null)}
                        onFocus={() => {
                          setHoveredId(key)
                          setLastHoveredId(key)
                        }}
                        onBlur={() => setHoveredId(null)}
                        className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        style={{
                          width: `${planetSize}px`,
                          height: `${planetSize * 1.4}px`,
                          boxShadow: `0 10px 24px ${color}1a`,
                        }}
                        aria-label={`View ${planet.media.title}`}
                      >
                        {planet.media.posterUrl ? (
                          <Image
                            src={planet.media.posterUrl}
                            alt={planet.media.title}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="relative z-10 flex flex-col items-center"
              style={{ width: `${sunSize}px` }}
            >
              <div
                className="absolute -inset-6 -z-10 rounded-full blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${sunColor}40 0%, ${sunColor}15 60%, transparent 100%)`,
                }}
              />
              <div className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl">
                <div
                  className="relative"
                  style={{ height: isMobile ? '260px' : '360px' }}
                >
                  {sunItem.media.posterUrl ? (
                    <Image
                      src={sunItem.media.posterUrl}
                      alt={sunItem.media.title}
                      fill
                      className="object-cover"
                      sizes="320px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>{isPlaying ? 'Pause orbit' : 'Play orbit'}</span>
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
              aria-label="Shuffle orbit"
            >
              <Shuffle className="h-4 w-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        <div className="self-center">
          <div className="rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Now in orbit
            </p>
            {activeItem ? (
              <article className="mt-3 overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-sm">
                <Link
                  href={`/media/${buildMediaRouteId({
                    provider: activeItem.media.provider,
                    providerId: activeItem.media.providerId,
                    type: activeItem.media.type,
                  })}`}
                  className="block"
                >
                  <div className="relative aspect-[3/4] w-full bg-muted">
                    {activeItem.media.posterUrl ? (
                      <Image
                        src={activeItem.media.posterUrl}
                        alt={activeItem.media.title}
                        fill
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                </Link>

                <div className="space-y-2 p-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {typeLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {formatYear(activeItem.media.year)}
                      </span>
                    </div>
                    {activeGenres.length ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {activeGenres.map((genre) => (
                          <Badge
                            key={`orbit-genre-${genre}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/media/${buildMediaRouteId({
                          provider: activeItem.media.provider,
                          providerId: activeItem.media.providerId,
                          type: activeItem.media.type,
                        })}`}
                        className="hover:underline"
                      >
                        <h3 className="line-clamp-2 font-semibold">
                          {activeItem.media.title}
                        </h3>
                      </Link>
                    </div>
                  </div>

                  {activeItem.media.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {activeItem.media.description}
                    </p>
                  ) : null}

                  <RatingStars rating={activeItem.rating ?? 0} size="sm" />

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {activeItem.status}
                    </Badge>
                    <span>Rated {formatShortDate(activeItem.createdAt)}</span>
                  </div>

                  <Link
                    href={`/media/${buildMediaRouteId({
                      provider: activeItem.media.provider,
                      providerId: activeItem.media.providerId,
                      type: activeItem.media.type,
                    })}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/15"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open details
                  </Link>
                </div>
              </article>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ButtonLink({ href, children }: { href: string; children: string }) {
  return (
    <div className="mt-5 flex justify-center">
      <Link
        href={href}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:shadow-md"
      >
        {children}
      </Link>
    </div>
  )
}
