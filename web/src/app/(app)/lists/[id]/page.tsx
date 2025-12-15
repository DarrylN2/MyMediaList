import { notFound } from 'next/navigation'

import { mockLists } from '@/data/mockLists'

import { ListDetailClient } from './ListDetailClient'
import { SupabaseListDetailClient } from './SupabaseListDetailClient'

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
  const list = mockLists.find((entry) => entry.id === resolvedParams.id)

  if (!list) {
    notFound()
  }

  return <ListDetailClient list={list} />
}

export function generateStaticParams() {
  return mockLists.map((list) => ({ id: list.id }))
}
