'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Play, TrendingUp, Sparkles, Star } from 'lucide-react'
import type { ActivityChip, ContinueItem } from '@/components/main-page/types'

const statusToneMap: Record<string, string> = {
  Watching: 'var(--category-anime)',
  Playing: 'var(--category-game)',
  Listening: 'var(--category-song)',
}

const iconMap = {
  primary: TrendingUp,
  secondary: Sparkles,
  accent: Star,
}

const toneColorMap = {
  primary: 'var(--primary)',
  secondary: 'var(--category-anime)',
  accent: 'var(--category-game)',
}

export function TodaySection({
  continueItems,
  activityChips,
}: {
  continueItems: ContinueItem[]
  activityChips: ActivityChip[]
}) {
  return (
    <section className="py-3 md:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Today</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Continue
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {continueItems.length ? (
              continueItems.map((item) => {
                const tone =
                  statusToneMap[item.status] ?? 'var(--category-movie)'
                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex gap-3 p-4">
                      <div className="relative h-20 w-14 overflow-hidden rounded-xl border border-border/60 bg-muted">
                        {item.posterUrl ? (
                          <Image
                            src={item.posterUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="72px"
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <p className="mb-1 text-sm font-semibold">
                            {item.title}
                          </p>
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: `${tone}20`,
                              color: tone,
                              border: `1px solid ${tone}40`,
                            }}
                          >
                            {item.status}
                          </span>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.progressLabel}
                          </p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.progressValue}%`,
                              background: `linear-gradient(90deg, ${tone}, var(--primary))`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Resume
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
                Nothing in progress yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {activityChips.map((chip) => {
              const Icon = iconMap[chip.tone]
              const tone = toneColorMap[chip.tone]
              return (
                <div
                  key={chip.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${tone}1a`,
                      color: tone,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{chip.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {chip.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
