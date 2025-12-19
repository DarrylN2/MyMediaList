'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { EntryStatus, MediaType } from '@/types'

interface FiltersBarProps {
  statusFilter?: EntryStatus | 'all'
  typeFilter?: MediaType | 'all'
  searchQuery?: string
  onStatusChange?: (status: EntryStatus | 'all') => void
  onTypeChange?: (type: MediaType | 'all') => void
  onSearchChange?: (query: string) => void
}

export function FiltersBar({
  statusFilter = 'all',
  typeFilter = 'all',
  searchQuery = '',
  onStatusChange,
  onTypeChange,
  onSearchChange,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-4 rounded-2xl border p-4">
      {onSearchChange && (
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
      )}
      {onStatusChange && (
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusChange(value as EntryStatus | 'all')
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Planning">Planning</SelectItem>
            <SelectItem value="Watching">Watching</SelectItem>
            <SelectItem value="Listening">Listening</SelectItem>
            <SelectItem value="Playing">Playing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Dropped">Dropped</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onTypeChange && (
        <Select
          value={typeFilter}
          onValueChange={(value) => onTypeChange(value as MediaType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="movie">Movie</SelectItem>
            <SelectItem value="tv">TV</SelectItem>
            <SelectItem value="anime">Anime</SelectItem>
            <SelectItem value="game">Game</SelectItem>
            <SelectItem value="song">Track</SelectItem>
            <SelectItem value="album">Album</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
