'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  rating?: number
  maxRating?: number
  interactive?: boolean
  onRatingChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}

export function RatingStars({
  rating = 0,
  maxRating = 10,
  interactive = false,
  onRatingChange,
  size = 'md',
}: RatingStarsProps) {
  const stars = Math.round((rating / maxRating) * 5)
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      const newRating = ((index + 1) / 5) * maxRating
      onRatingChange(Math.round(newRating))
    }
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handleClick(index)}
          disabled={!interactive}
          className={cn(
            'transition-colors',
            interactive && 'cursor-pointer hover:scale-110',
            !interactive && 'cursor-default',
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              index < stars
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-muted-foreground',
            )}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {rating}/{maxRating}
        </span>
      )}
    </div>
  )
}
