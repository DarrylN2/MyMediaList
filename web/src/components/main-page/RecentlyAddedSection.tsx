'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockRecentlyAdded } from '@/mocks'
import Image from 'next/image'
import { Star, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const getMediaTypeColor = (type: string) => {
  switch (type) {
    case 'movie':
      return 'bg-blue-100 text-blue-700 border-blue-300'
    case 'anime':
      return 'bg-purple-100 text-purple-700 border-purple-300'
    case 'song':
    case 'album':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'game':
      return 'bg-green-100 text-green-700 border-green-300'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

export function RecentlyAddedSection() {
  return (
    <section className="py-8">
      <h2 className="mb-6 text-3xl font-bold">Recently added</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {mockRecentlyAdded.map((item) => (
          <Card
            key={item.id}
            className="group overflow-hidden bg-white/80 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-lg"
          >
            {item.media.posterUrl && (
              <div className="relative h-48">
                <Image
                  src={item.media.posterUrl}
                  alt={item.media.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <CardContent className="p-3">
              <h3 className="mb-1 text-sm font-semibold line-clamp-1">
                {item.media.title}
              </h3>
              <div className="flex items-center justify-between">
                <Badge className={getMediaTypeColor(item.media.type)}>
                  {item.media.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.addedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
