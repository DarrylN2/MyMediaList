'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockTimeline } from '@/mocks'
import Image from 'next/image'

export function TimelineSection() {
  return (
    <section className="py-8">
      <h2 className="mb-8 text-center text-3xl font-bold">Timeline</h2>
      <div className="relative mx-auto max-w-2xl">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 h-full w-0.5 bg-border" />

        {/* Timeline Items */}
        <div className="space-y-12">
          {mockTimeline.map((item, index) => (
            <div
              key={`${item.month}-${item.year}`}
              className="relative flex items-start gap-6"
            >
              {/* Year Label (first item only) */}
              {index === 0 && (
                <div className="absolute -top-6 left-0 text-sm font-semibold text-muted-foreground">
                  2024
                </div>
              )}

              {/* Month Label & Dot */}
              <div className="flex w-16 flex-col items-center">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                  {item.month.slice(0, 1)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.month}
                </div>
                {index === mockTimeline.length - 1 && (
                  <div className="mt-2 text-xs font-semibold text-muted-foreground">
                    2025
                  </div>
                )}
              </div>

              {/* Featured Media Cards */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">+{item.count} items</Badge>
                </div>
                {item.featured.map((media) => (
                  <Card
                    key={media.id}
                    className="overflow-hidden bg-white/80 backdrop-blur-sm"
                  >
                    <div className="flex gap-4">
                      {media.posterUrl && (
                        <div className="relative h-24 w-16 shrink-0">
                          <Image
                            src={media.posterUrl}
                            alt={media.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="flex-1 p-4">
                        <h3 className="font-semibold">{media.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {media.type} · {media.year}
                        </p>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
