'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type Props = {
  posterUrls: Array<string | null | undefined>
  className?: string
  sizes?: string
}

function PosterCell({
  url,
  className,
  sizes,
}: {
  url: string
  className?: string
  sizes?: string
}) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <Image src={url} alt="" fill sizes={sizes} className="object-cover" />
    </div>
  )
}

export function ListPosterCollage({
  posterUrls,
  className,
  sizes = '96px',
}: Props) {
  const urls = posterUrls.filter(Boolean).slice(0, 4) as string[]

  if (urls.length === 0) return null

  if (urls.length === 1) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden', className)}>
        <Image
          src={urls[0]}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/0" />
      </div>
    )
  }

  const cells =
    urls.length === 2
      ? [
          { url: urls[0], className: 'row-span-2' },
          { url: urls[1], className: 'row-span-2' },
        ]
      : urls.length === 3
        ? [
            { url: urls[0], className: 'row-span-2' },
            { url: urls[1], className: '' },
            { url: urls[2], className: '' },
          ]
        : urls.map((url) => ({ url, className: '' }))

  return (
    <div
      className={cn(
        'relative grid h-full w-full grid-cols-2 grid-rows-2 overflow-hidden',
        className,
      )}
    >
      {cells.map((cell, idx) => (
        <PosterCell
          key={`${cell.url}-${idx}`}
          url={cell.url}
          className={cell.className}
          sizes={sizes}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/0" />
    </div>
  )
}
