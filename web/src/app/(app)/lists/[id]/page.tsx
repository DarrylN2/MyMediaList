import { notFound } from 'next/navigation'

import { mockLists } from '@/data/mockLists'

import { ListDetailClient } from './ListDetailClient'

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const list = mockLists.find((entry) => entry.id === resolvedParams.id)

  if (!list) {
    notFound()
  }

  return <ListDetailClient list={list} />
}

export function generateStaticParams() {
  return mockLists.map((list) => ({ id: list.id }))
}
