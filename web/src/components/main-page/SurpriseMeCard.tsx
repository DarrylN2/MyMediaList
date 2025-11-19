'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shuffle } from 'lucide-react'

export function SurpriseMeCard() {
  return (
    <Card className="rounded-2xl border-2 border-dashed bg-gradient-to-br from-purple-50 to-pink-50">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <h3 className="text-2xl font-bold">Don't know what to watch?</h3>
        <Button size="lg" className="rounded-full">
          <Shuffle className="mr-2 h-5 w-5" />
          Shuffle recommendation
        </Button>
      </CardContent>
    </Card>
  )
}
