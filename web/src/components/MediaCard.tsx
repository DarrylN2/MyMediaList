import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Media } from '@/types'

interface MediaCardProps {
  media: Media
  onAdd?: (media: Media) => void
}

export function MediaCard({ media, onAdd }: MediaCardProps) {
  return (
    <Card className="overflow-hidden">
      <Link href={`/media/${media.id}`}>
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {media.posterUrl ? (
            <Image
              src={media.posterUrl}
              alt={media.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <span className="text-muted-foreground">No poster</span>
            </div>
          )}
        </div>
      </Link>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold">{media.title}</h3>
          <Badge variant="secondary">{media.type}</Badge>
        </div>
        {media.year && (
          <p className="text-sm text-muted-foreground">{media.year}</p>
        )}
      </CardHeader>
      {onAdd && (
        <CardFooter>
          <button
            onClick={() => onAdd(media)}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add to List
          </button>
        </CardFooter>
      )}
    </Card>
  )
}
