import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Entry } from '@/types'

interface DataTableProps {
  entries: Entry[]
  onRowClick?: (entry: Entry) => void
}

export function DataTable({ entries, onRowClick }: DataTableProps) {
  return (
    <div className="rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Finished</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                No entries found
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow
                key={entry.id}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick?.(entry)}
              >
                <TableCell className="font-medium">Media Title</TableCell>
                <TableCell>movie</TableCell>
                <TableCell>{entry.status}</TableCell>
                <TableCell>{entry.rating || '-'}</TableCell>
                <TableCell>
                  {entry.startedAt
                    ? new Date(entry.startedAt).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  {entry.finishedAt
                    ? new Date(entry.finishedAt).toLocaleDateString()
                    : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
