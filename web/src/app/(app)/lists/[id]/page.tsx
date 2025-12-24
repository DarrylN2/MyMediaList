import { notFound } from 'next/navigation'

import { SupabaseListDetailClient } from './SupabaseListDetailClient'
import { DemoListDetailClient } from './DemoListDetailClient'
import { demoListDefinitions } from '@/data/demoStore'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  if (UUID_RE.test(resolvedParams.id)) {
    return <SupabaseListDetailClient listId={resolvedParams.id} />
  }
  const exists = demoListDefinitions.some(
    (entry) => entry.id === resolvedParams.id,
  )
  if (!exists) {
    notFound()
  }
  return <DemoListDetailClient listId={resolvedParams.id} />
}

export function generateStaticParams() {
  return demoListDefinitions.map((list) => ({ id: list.id }))
}
