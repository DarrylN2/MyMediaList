'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Pause, Play, Shuffle, ExternalLink, Star } from 'lucide-react'
import type { DashboardEntry } from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'

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

const getMediaKey = (item: DashboardEntry) =>
  `${item.media.provider}:${item.media.providerId}`

export function SolarSystemHero({ items }: { items: DashboardEntry[] }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    setShuffledIds(null)
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
    if (!hoveredId) return sunItem
    return (
      planetOrder.find((planet) => getMediaKey(planet) === hoveredId) ?? sunItem
    )
  }, [hoveredId, planetOrder, sunItem])

  const orbitRadius = isMobile ? 140 : 220
  const sunSize = isMobile ? 180 : 260
  const planetSize = isMobile ? 58 : 86

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
    <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-card/80 px-4 py-8 shadow-sm md:px-8 md:py-10">
      <div className="absolute right-4 top-4 flex gap-2 md:right-6 md:top-6">
        <button
          type="button"
          onClick={() => setIsPlaying((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Orbit</span>
        </button>
        <button
          type="button"
          onClick={handleShuffle}
          className="flex items-center justify-center rounded-full border border-border bg-background/80 p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          aria-label="Shuffle orbit"
        >
          <Shuffle className="h-4 w-4" />
        </button>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="relative flex items-center justify-center"
          style={{ height: `${orbitRadius * 2 + sunSize}px` }}
        >
          <div
            className="absolute rounded-full border border-border/40"
            style={{
              width: `${orbitRadius * 2}px`,
              height: `${orbitRadius * 2}px`,
            }}
          />

          <div
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
                      onMouseEnter={() => setHoveredId(key)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(key)}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </div>

              <div className="space-y-3 px-4 pb-4 pt-3 text-white">
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${sunColor}2b`,
                      color: sunColor,
                      border: `1px solid ${sunColor}55`,
                    }}
                  >
                    {sunItem.media.type}
                  </span>
                  <span>{formatYear(sunItem.media.year)}</span>
                </div>
                <h2 className="text-xl font-semibold leading-tight md:text-2xl">
                  {sunItem.media.title}
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${sunColor}, var(--primary))`,
                    }}
                  >
                    <Star className="h-4 w-4 fill-current text-white" />
                    {sunItem.rating}/10
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/media/${buildMediaRouteId({
                      provider: sunItem.media.provider,
                      providerId: sunItem.media.providerId,
                      type: sunItem.media.type,
                    })}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#1d1514] shadow-sm transition hover:shadow-md"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-white/80 transition hover:bg-white/20"
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Now in orbit
          </p>
          {activeItem ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-12 overflow-hidden rounded-xl border border-border/60 bg-muted">
                  {activeItem.media.posterUrl ? (
                    <Image
                      src={activeItem.media.posterUrl}
                      alt={activeItem.media.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {activeItem.media.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeItem.media.type} ·{' '}
                    {formatYear(activeItem.media.year)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `${
                      categoryColorMap[activeItem.media.type] ??
                      'var(--primary)'
                    }20`,
                    color:
                      categoryColorMap[activeItem.media.type] ??
                      'var(--primary)',
                    border: `1px solid ${
                      categoryColorMap[activeItem.media.type] ??
                      'var(--primary)'
                    }40`,
                  }}
                >
                  {activeItem.media.type}
                </span>
                <span className="text-muted-foreground">
                  Rated {activeItem.rating}/10
                </span>
              </div>
              <Link
                href={`/media/${buildMediaRouteId({
                  provider: activeItem.media.provider,
                  providerId: activeItem.media.providerId,
                  type: activeItem.media.type,
                })}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open details
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
          )}
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
