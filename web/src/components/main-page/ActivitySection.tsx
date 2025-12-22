'use client'

import { TrendingUp, Sparkles, Star } from 'lucide-react'
import type { ActivityChip } from '@/components/main-page/types'

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

export function ActivitySection({
  activityChips,
}: {
  activityChips: ActivityChip[]
}) {
  return (
    <section className="py-3 md:py-4">
      <h2 className="mb-3 text-2xl font-semibold">Activity</h2>
      <div className="grid gap-3">
        {activityChips.map((chip) => {
          const Icon = iconMap[chip.tone]
          const tone = toneColorMap[chip.tone]
          return (
            <div
              key={chip.id}
              className="relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm"
              style={{
                backgroundImage: `linear-gradient(120deg, ${tone}1f, transparent 55%)`,
              }}
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
                <p className="text-xs text-muted-foreground">{chip.label}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
