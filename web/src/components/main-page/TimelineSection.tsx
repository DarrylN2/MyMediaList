'use client'

import Image from 'next/image'
import type { TimelineGroup } from '@/components/main-page/types'

export function TimelineSection({ groups }: { groups: TimelineGroup[] }) {
  return (
    <section className="py-6 md:py-8">
      <h2 className="mb-6 text-center text-2xl font-semibold">Timeline</h2>
      {groups.length ? (
        <div className="relative mx-auto max-w-3xl">
          <div className="absolute left-6 top-0 h-full w-px bg-border/70 md:left-8" />
          <div className="space-y-10">
            {groups.map((group, index) => (
              <div key={group.id} className="relative flex items-start gap-6">
                {index === 0 && (
                  <div className="absolute -top-6 left-0 text-xs font-semibold text-muted-foreground">
                    {group.year}
                  </div>
                )}
                <div className="flex w-14 flex-col items-center md:w-16">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                    {group.month.slice(0, 1)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {group.month}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                    +{group.count} items
                  </div>
                  {group.items.map((item) => (
                    <div
                      key={`${item.media.provider}:${item.media.providerId}`}
                      className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm"
                    >
                      <div className="flex gap-4">
                        {item.media.posterUrl ? (
                          <div className="relative h-24 w-16 shrink-0">
                            <Image
                              src={item.media.posterUrl}
                              alt={item.media.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-24 w-16 shrink-0 items-center justify-center bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        <div className="flex-1 p-4">
                          <h3 className="text-sm font-semibold">
                            {item.media.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {item.media.type} · {item.media.year ?? 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
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
