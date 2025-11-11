'use client'

import { useState } from 'react'
import { MediaCard } from '@/components/MediaCard'
import { FiltersBar } from '@/components/FiltersBar'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { mockMedia } from '@/mocks'
import type { Media } from '@/types'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading] = useState(false)

  const filteredMedia = mockMedia.filter((media) =>
    media.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAdd = (media: Media) => {
    console.log('Add to list:', media)
    // TODO: Implement add to list
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <FiltersBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredMedia.length === 0 ? (
        <EmptyState
          title="No results found"
          description="Try adjusting your search query."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMedia.map((media) => (
            <MediaCard key={media.id} media={media} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  )
}
