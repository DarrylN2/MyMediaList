'use client'

import { useState } from 'react'
import { FiltersBar } from '@/components/FiltersBar'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeletonTable } from '@/components/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { mockEntries } from '@/mocks'
import type { EntryStatus, MediaType } from '@/types'

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<EntryStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all')
  const [isLoading] = useState(false)

  const filteredEntries = mockEntries.filter((entry) => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false
    return true
  })

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
        <LoadingSkeletonTable />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <FiltersBar
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />

      {filteredEntries.length === 0 ? (
        <EmptyState
          title="No entries found"
          description="Start tracking your media by searching and adding items to your list."
          action={
            <Button asChild>
              <a href="/search">Search Media</a>
            </Button>
          }
        />
      ) : (
        <DataTable entries={filteredEntries} />
      )}
    </div>
  )
}
