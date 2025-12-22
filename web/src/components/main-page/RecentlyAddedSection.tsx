'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { DashboardEntry } from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'

const formatShortDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentlyAddedSection({ items }: { items: DashboardEntry[] }) {
  const cardWidth = 160
  const gridGap = 16
  const [cardsPerPage, setCardsPerPage] = useState(6)
  const [page, setPage] = useState(0)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!gridRef.current || typeof ResizeObserver === 'undefined') return
    const element = gridRef.current
    const updateCardsPerPage = () => {
      const width = element.clientWidth
      if (!width) return
      const next = Math.max(
        1,
        Math.floor((width + gridGap) / (cardWidth + gridGap)),
      )
      setCardsPerPage(next)
    }

    updateCardsPerPage()
    const observer = new ResizeObserver(updateCardsPerPage)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const maxPage = Math.max(0, Math.ceil(items.length / cardsPerPage) - 1)

  useEffect(() => {
    setPage((current) => Math.min(current, maxPage))
  }, [maxPage])

  const startIndex = page * cardsPerPage
  const visibleItems = items.slice(startIndex, startIndex + cardsPerPage)
  const showControls = items.length > cardsPerPage
  const columns = Math.max(1, cardsPerPage)

  return (
    <section className="py-3 md:py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Recently added</h2>
        <div className="flex items-center gap-2">
          {showControls ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                disabled={page === 0}
                aria-label="Previous recently added"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(maxPage, current + 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                disabled={page === maxPage}
                aria-label="Next recently added"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40"
          >
            <Plus className="h-4 w-4" />
            Add new
          </Link>
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid gap-3 md:gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          justifyContent: 'start',
        }}
      >
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <div
              key={`${item.media.provider}:${item.media.providerId}`}
              className="group relative"
            >
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div
                  className="relative w-full overflow-hidden"
                  style={{ aspectRatio: '2 / 3' }}
                >
                  {item.media.posterUrl ? (
                    <Image
                      src={item.media.posterUrl}
                      alt={item.media.title}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold text-white">
                      {item.media.title}
                    </p>
                    <p className="text-xs text-white/80">
                      {formatShortDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <Link
                  href={`/media/${buildMediaRouteId({
                    provider: item.media.provider,
                    providerId: item.media.providerId,
                    type: item.media.type,
                  })}`}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                  aria-label={`Open ${item.media.title}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
            Nothing added yet.
          </div>
        )}
      </div>
    </section>
  )
}
