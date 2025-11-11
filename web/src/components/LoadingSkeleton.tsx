import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[2/3] w-full" />
          <div className="p-4">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function LoadingSkeletonTable() {
  return (
    <div className="rounded-2xl border">
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
