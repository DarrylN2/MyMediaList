'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { mockContinueWatching } from '@/mocks'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Watching':
      return 'bg-purple-100 text-purple-700'
    case 'Playing':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function ContinueWatchingSection() {
  return (
    <section className="py-8">
      <h2 className="mb-6 text-3xl font-bold">Continue watching/playing</h2>
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {mockContinueWatching.map((item) => (
            <Card
              key={item.id}
              className="min-w-[200px] shrink-0 overflow-hidden bg-white/80 backdrop-blur-sm transition-transform hover:scale-105"
            >
              {item.media.posterUrl && (
                <div className="relative h-64">
                  <Image
                    src={item.media.posterUrl}
                    alt={item.media.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="mb-2 font-semibold line-clamp-1">
                  {item.media.title}
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  {item.episode}
                </p>
                <Progress value={item.progress} className="mb-3 h-2" />
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop Carousel Controls */}
        <div className="hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm shadow-md"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm shadow-md"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  )
}
