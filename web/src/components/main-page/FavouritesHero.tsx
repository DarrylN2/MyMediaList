'use client'

import { Sparkles, Shuffle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockFavourites } from '@/mocks'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const getMediaTypeColor = (type: string) => {
  switch (type) {
    case 'movie':
      return 'border-blue-500 bg-blue-50'
    case 'anime':
      return 'border-purple-500 bg-purple-50'
    case 'song':
      return 'border-yellow-500 bg-yellow-50'
    case 'game':
      return 'border-green-500 bg-green-50'
    default:
      return 'border-gray-500 bg-gray-50'
  }
}

export function FavouritesHero() {
  const spotlight =
    mockFavourites.find((f) => f.isSpotlight) || mockFavourites[0]
  const orbitItems = mockFavourites.filter((f) => !f.isSpotlight).slice(0, 7)

  return (
    <section className="relative py-8">
      <div className="mb-6 flex items-center justify-center gap-2">
        <h2 className="text-3xl font-bold">Your favourites</h2>
        <Sparkles className="h-6 w-6 text-yellow-500" />
      </div>

      <div className="relative flex min-h-[400px] items-center justify-center">
        {/* Orbit Cards */}
        <div className="absolute inset-0">
          {orbitItems.map((item, index) => {
            const angle = (index * 360) / orbitItems.length
            const radius = 180
            const x = Math.cos((angle * Math.PI) / 180) * radius
            const y = Math.sin((angle * Math.PI) / 180) * radius

            return (
              <div
                key={item.id}
                className="absolute animate-float"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${index * 0.2}s`,
                }}
              >
                <Card
                  className={cn(
                    'h-24 w-16 overflow-hidden border-2 p-0',
                    getMediaTypeColor(item.media.type),
                  )}
                >
                  {item.media.posterUrl && (
                    <Image
                      src={item.media.posterUrl}
                      alt={item.media.title}
                      width={64}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  )}
                </Card>
              </div>
            )
          })}
        </div>

        {/* Spotlight Card */}
        <Card className="relative z-10 w-64 overflow-hidden border-2 shadow-lg">
          {spotlight.media.posterUrl && (
            <div className="relative h-96">
              <Image
                src={spotlight.media.posterUrl}
                alt={spotlight.media.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <CardContent className="p-4">
            <h3 className="mb-2 font-semibold">{spotlight.media.title}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{spotlight.rating}/10</Badge>
              <Badge className={getMediaTypeColor(spotlight.media.type)}>
                {spotlight.media.type}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Shuffle Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4 z-20 rounded-full"
        >
          <Shuffle className="mr-2 h-4 w-4" />
          Shuffle favourite
        </Button>
      </div>
    </section>
  )
}
