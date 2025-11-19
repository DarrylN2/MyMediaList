'use client'

import { Trophy, Calendar, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockStats } from '@/mocks'

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'movies':
      return 'fill-blue-500'
    case 'anime':
      return 'fill-purple-500'
    case 'songs':
      return 'fill-yellow-500'
    case 'games':
      return 'fill-green-500'
    default:
      return 'fill-gray-500'
  }
}

export function StatsSection() {
  let currentAngle = 0

  return (
    <section className="py-8">
      <h2 className="mb-8 text-center text-3xl font-bold">Stats</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card className="rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>All media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 100 100" className="h-32 w-32">
                {mockStats.pieData.map((item) => {
                  const percentage = item.percentage
                  const angle = (percentage / 100) * 360
                  const startAngle = currentAngle
                  currentAngle += angle

                  const x1 =
                    50 + 50 * Math.cos(((startAngle - 90) * Math.PI) / 180)
                  const y1 =
                    50 + 50 * Math.sin(((startAngle - 90) * Math.PI) / 180)
                  const x2 =
                    50 + 50 * Math.cos(((currentAngle - 90) * Math.PI) / 180)
                  const y2 =
                    50 + 50 * Math.sin(((currentAngle - 90) * Math.PI) / 180)
                  const largeArcFlag = angle > 180 ? 1 : 0

                  return (
                    <path
                      key={item.category}
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                      className={getCategoryColor(item.category)}
                    />
                  )
                })}
              </svg>
              <div className="space-y-2">
                {mockStats.pieData.map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${getCategoryColor(item.category).replace('fill-', 'bg-')}`}
                    />
                    <span className="text-sm">
                      {item.percentage}% {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat Tiles */}
        <div className="space-y-4">
          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Most watched genre
                </p>
                <p className="text-xl font-bold">
                  {mockStats.mostWatchedGenre}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Most active day</p>
                <p className="text-xl font-bold">{mockStats.mostActiveDay}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average rating</p>
                <p className="text-xl font-bold">
                  {mockStats.averageRating} / 10
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
