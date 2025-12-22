'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { TimelineGroup } from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TimelineSection({ groups }: { groups: TimelineGroup[] }) {
  return (
    <section className="py-3 md:py-4">
      <h2 className="mb-4 text-center text-2xl font-semibold">Timeline</h2>
      {groups.length ? (
        <div className="relative mx-auto max-w-3xl">
          <div
            className="absolute left-6 top-0 h-full w-px opacity-50 md:left-8"
            style={{
              background:
                'linear-gradient(180deg, var(--primary), var(--category-tv), var(--category-song))',
            }}
          />
          <div className="space-y-8">
            {groups.map((group, index) => (
              <div key={group.id} className="relative flex items-start gap-6">
                {index === 0 ? (
                  <div className="absolute -top-6 left-0 text-xs font-semibold text-muted-foreground">
                    {group.year}
                  </div>
                ) : null}
                <div className="flex w-14 flex-col items-center md:w-16">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                    {group.month.slice(0, 1)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {group.month}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    +{group.count} items
                  </div>
                  {group.items.map((item) => (
                    <Link
                      key={`${item.media.provider}:${item.media.providerId}`}
                      href={`/media/${buildMediaRouteId({
                        provider: item.media.provider,
                        providerId: item.media.providerId,
                        type: item.media.type,
                      })}`}
                      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex gap-4 p-4">
                        {item.media.posterUrl ? (
                          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                            <Image
                              src={item.media.posterUrl}
                              alt={item.media.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold group-hover:underline">
                                <span className="line-clamp-1">
                                  {item.media.title}
                                </span>
                              </h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.media.type} •{' '}
                                {item.media.year ?? 'Unknown'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.rating != null && item.rating > 0 ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                  {item.rating}/10
                                </span>
                              ) : null}
                              <span className="text-xs text-muted-foreground">
                                {formatShortDate(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {item.media.description ? (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {item.media.description}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {item.status}
                            </span>
                            {(item.media.genres ?? [])
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((genre) => (
                                <span
                                  key={`${item.media.provider}:${item.media.providerId}:genre:${genre}`}
                                  className="rounded-full border border-secondary/40 bg-secondary/70 px-2 py-0.5 text-xs text-secondary-foreground"
                                >
                                  {genre}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
          No timeline entries yet.
        </div>
      )}
    </section>
  )
}
