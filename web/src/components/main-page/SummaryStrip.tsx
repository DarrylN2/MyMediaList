'use client'

import { Flame } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { mockStats } from '@/mocks'

export function SummaryStrip() {
  return (
    <Card className="rounded-2xl border-0 bg-white/80 shadow-sm backdrop-blur-sm">
      <div className="px-6 py-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>
            You've tracked{' '}
            <strong className="text-foreground">
              {mockStats.totalItems} items
            </strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <strong className="text-foreground">
              {mockStats.streak}-day streak
            </strong>
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">
              {mockStats.newThisWeek} new
            </strong>{' '}
            this week
          </span>
        </div>
      </div>
    </Card>
  )
}
