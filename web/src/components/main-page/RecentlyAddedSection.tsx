'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Plus, ExternalLink } from 'lucide-react'
import type { DashboardEntry } from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'

const getCategoryColor = (type: string) => {
  switch (type) {
    case 'movie':
      return 'var(--category-movie)'
    case 'tv':
      return 'var(--category-tv)'
    case 'anime':
      return 'var(--category-anime)'
    case 'song':
    case 'album':
      return 'var(--category-song)'
    case 'game':
      return 'var(--category-game)'
    default:
      return 'var(--primary)'
  }
}

const formatShortDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentlyAddedSection({ items }: { items: DashboardEntry[] }) {
  return (
    <section className="py-3 md:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Recently added</h2>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40"
        >
          <Plus className="h-4 w-4" />
          Add new
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 md:gap-4">
        {items.length ? (
          items.map((item) => {
            const color = getCategoryColor(item.media.type)
            return (
              <div
                key={`${item.media.provider}:${item.media.providerId}`}
                className="group relative flex-shrink-0"
                style={{ width: '160px' }}
              >
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="relative h-56 w-full overflow-hidden">
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
                    <div className="absolute left-2 top-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: `${color}20`,
                          color,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {item.media.type}
                      </span>
                    </div>
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
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
            Nothing added yet.
          </div>
        )}
      </div>
    </section>
  )
}
