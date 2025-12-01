'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EntryStatus } from '@/types'

interface StatusSelectProps {
  value: EntryStatus
  onChange: (value: EntryStatus) => void
  mediaType?: 'movie' | 'tv' | 'anime' | 'game'
}

export function StatusSelect({
  value,
  onChange,
  mediaType = 'movie',
}: StatusSelectProps) {
  const getStatusOptions = (): EntryStatus[] => {
    if (mediaType === 'game') {
      return ['Planning', 'Playing', 'Completed', 'Dropped']
    }
    if (mediaType === 'anime' || mediaType === 'tv') {
      return ['Planning', 'Watching', 'Completed', 'Dropped']
    }
    return ['Planning', 'Watching', 'Completed', 'Dropped']
  }

  const statusOptions = getStatusOptions()

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
