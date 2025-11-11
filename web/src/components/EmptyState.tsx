import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  )
}
