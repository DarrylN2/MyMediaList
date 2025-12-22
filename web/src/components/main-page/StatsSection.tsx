'use client'

import { Trophy, Calendar, Star } from 'lucide-react'
import type { DashboardStats } from '@/components/main-page/types'

export function StatsSection({ stats }: { stats: DashboardStats }) {
  const segments = stats.categoryDistribution.reduce<
    Array<{
      id: string
      startAngle: number
      endAngle: number
      angle: number
      colorVar: string
    }>
  >((acc, item) => {
    const angle = (item.percentage / 100) * 360
    const startAngle = acc.length ? acc[acc.length - 1]!.endAngle : 0
    const endAngle = startAngle + angle
    acc.push({
      id: item.id,
      startAngle,
      endAngle,
      angle,
      colorVar: item.colorVar,
    })
    return acc
  }, [])

  return (
    <section className="py-6 md:py-8">
      <h2 className="mb-5 text-2xl font-semibold">Stats</h2>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Category distribution</h3>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <svg viewBox="0 0 100 100" className="h-32 w-32">
              {segments.map((segment) => {
                const x1 =
                  50 +
                  50 * Math.cos(((segment.startAngle - 90) * Math.PI) / 180)
                const y1 =
                  50 +
                  50 * Math.sin(((segment.startAngle - 90) * Math.PI) / 180)
                const x2 =
                  50 + 50 * Math.cos(((segment.endAngle - 90) * Math.PI) / 180)
                const y2 =
                  50 + 50 * Math.sin(((segment.endAngle - 90) * Math.PI) / 180)
                const largeArcFlag = segment.angle > 180 ? 1 : 0

                return (
                  <path
                    key={segment.id}
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={`var(${segment.colorVar})`}
                  />
                )
              })}
            </svg>
            <div className="flex flex-1 flex-col gap-2">
              {stats.categoryDistribution.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: `var(${item.colorVar})` }}
                    />
                    {item.label}
                  </div>
                  <span className="text-sm font-semibold">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Top genres</h3>
          <div className="space-y-3">
            {stats.topGenres.length ? (
              stats.topGenres.map((genre) => (
                <div key={genre.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{genre.label}</span>
                    <span className="font-semibold text-foreground">
                      {genre.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${
                          stats.topGenres[0]?.count
                            ? (genre.count / stats.topGenres[0].count) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No genre data yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Most watched genre"
          value={stats.mostWatchedGenre ?? 'Unknown'}
          helper="Top genre in your list"
          Icon={Trophy}
        />
        <StatCard
          label="Most active day"
          value={stats.mostActiveDay ?? 'Unknown'}
          helper="Based on items added"
          Icon={Calendar}
        />
        <StatCard
          label="Average rating"
          value={
            stats.averageRating != null
              ? `${stats.averageRating.toFixed(1)} / 10`
              : 'No ratings'
          }
          helper="Across rated entries"
          Icon={Star}
        />
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  helper,
  Icon,
}: {
  label: string
  value: string
  helper: string
  Icon: typeof Trophy
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{helper}</div>
    </div>
  )
}
