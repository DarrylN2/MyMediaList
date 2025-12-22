'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

type PosterItem = {
  id: string
  url: string
  x: number
  y: number
  width: number
  height: number
  rotate: number
  opacity: number
  depth: number
  floatDuration: number
  floatDelay: number
}

export function MediaBackground() {
  const [posters, setPosters] = useState<string[]>([])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      return
    }

    let ticking = false
    const update = () => {
      const scrollY = window.scrollY || window.pageYOffset
      const offset = Math.min(scrollY * 0.12, 520)
      document.documentElement.style.setProperty('--parallax-y', `${offset}px`)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadPosters = async () => {
      try {
        const response = await fetch('/api/background-posters', {
          cache: 'no-store',
        })
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as { posters?: string[] }
        if (!cancelled) {
          setPosters(payload.posters ?? [])
        }
      } catch {
        if (!cancelled) {
          setPosters([])
        }
      }
    }

    loadPosters()

    return () => {
      cancelled = true
    }
  }, [])

  const items = useMemo(() => {
    return posters.map((url, index) => {
      const width = 140 + Math.round(Math.random() * 120)
      const height = Math.round(width * 1.45)
      return {
        id: `${index}-${url}`,
        url,
        x: -15 + Math.random() * 130,
        y: -20 + Math.random() * 160,
        width,
        height,
        rotate: -10 + Math.random() * 20,
        opacity: 0.12 + Math.random() * 0.12,
        depth: 0.4 + Math.random() * 0.8,
        floatDuration: 18 + Math.random() * 22,
        floatDelay: -Math.random() * 20,
      } satisfies PosterItem
    })
  }, [posters])

  return (
    <div className="media-float-bg" aria-hidden="true">
      {items.map((item) => (
        <img
          key={item.id}
          src={item.url}
          alt=""
          className="media-bg-poster"
          loading="lazy"
          decoding="async"
          style={
            {
              '--x': `${item.x}vw`,
              '--y': `${item.y}vh`,
              '--w': `${item.width}px`,
              '--h': `${item.height}px`,
              '--rotate': `${item.rotate}deg`,
              '--opacity': item.opacity,
              '--depth': item.depth,
              '--float-duration': `${item.floatDuration}s`,
              '--float-delay': `${item.floatDelay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
