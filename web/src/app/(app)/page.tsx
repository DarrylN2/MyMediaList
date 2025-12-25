'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { SolarSystemHero } from '@/components/main-page/SolarSystemHero'
import { TodaySection } from '@/components/main-page/TodaySection'
import { ActivitySection } from '@/components/main-page/ActivitySection'
import { TimelineSection } from '@/components/main-page/TimelineSection'
import { StatsSection } from '@/components/main-page/StatsSection'
import { RecentlyAddedSection } from '@/components/main-page/RecentlyAddedSection'
import type {
  ActivityChip,
  ContinueItem,
  DashboardEntry,
  DashboardStats,
  TimelineGroup,
} from '@/components/main-page/types'
import { buildMediaRouteId } from '@/lib/media-route'
import type { MediaType } from '@/types'
import { ensureDemoState } from '@/data/demoStore'

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const CATEGORY_GROUPS: Array<{
  id: string
  label: string
  types: MediaType[]
  colorVar: string
}> = [
  {
    id: 'movies',
    label: 'Movies',
    types: ['movie', 'tv'],
    colorVar: '--category-movie',
  },
  {
    id: 'anime',
    label: 'Anime',
    types: ['anime'],
    colorVar: '--category-anime',
  },
  {
    id: 'games',
    label: 'Games',
    types: ['game'],
    colorVar: '--category-game',
  },
  {
    id: 'music',
    label: 'Music',
    types: ['song', 'album'],
    colorVar: '--category-song',
  },
]

export default function Home() {
  const { user, apiFetch, beginAppLoading, endAppLoading } = useAuth()
  const [entries, setEntries] = useState<DashboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoEntries, setDemoEntries] = useState<DashboardEntry[]>([])
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setEntries([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    beginAppLoading()

    const load = async () => {
      try {
        const response = await apiFetch('/api/entries', {
          signal: controller.signal,
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Unable to load entries.')
        }
        const payload = (await response.json()) as { items?: DashboardEntry[] }
        setEntries(Array.isArray(payload.items) ? payload.items : [])
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unable to load entries.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
        endAppLoading()
      }
    }

    void load()
    return () => controller.abort()
  }, [apiFetch, beginAppLoading, endAppLoading, user])

  useEffect(() => {
    if (user) {
      setDemoEntries([])
      setDemoError(null)
      setDemoLoading(false)
      return
    }

    let active = true
    setDemoLoading(true)
    setDemoError(null)

    ensureDemoState()
      .then((state) => {
        if (active) setDemoEntries(state.entries)
      })
      .catch((err) => {
        if (!active) return
        setDemoError(
          err instanceof Error ? err.message : 'Unable to load demo data.',
        )
      })
      .finally(() => {
        if (active) setDemoLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  const entriesSource = user ? entries : demoEntries

  const entriesByCreated = useMemo(() => {
    return [...entriesSource].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [entriesSource])

  const ratedEntries = useMemo(
    () => entriesSource.filter((entry) => (entry.rating ?? 0) > 0),
    [entriesSource],
  )

  const continueItems = useMemo<ContinueItem[]>(() => {
    return entriesByCreated
      .filter((entry) =>
        ['Watching', 'Playing', 'Listening'].includes(entry.status),
      )
      .map((entry) => {
        const episodeCount = entry.media.episodeCount ?? null
        const episodeProgress = entry.episodeProgress ?? 0
        const progressValue =
          episodeCount && episodeProgress
            ? Math.min(100, (episodeProgress / episodeCount) * 100)
            : episodeProgress
              ? Math.min(100, episodeProgress)
              : 0
        const progressLabel =
          episodeCount && episodeProgress
            ? `EP ${episodeProgress}/${episodeCount}`
            : episodeProgress
              ? `Progress ${episodeProgress}`
              : 'In progress'

        return {
          id: `${entry.media.provider}:${entry.media.providerId}`,
          title: entry.media.title,
          posterUrl: entry.media.posterUrl,
          type: entry.media.type,
          status: entry.status,
          progressLabel,
          progressValue,
          href: `/media/${buildMediaRouteId({
            provider: entry.media.provider,
            providerId: entry.media.providerId,
            type: entry.media.type,
          })}`,
        }
      })
  }, [entriesByCreated])

  const recentItems = useMemo(() => entriesByCreated, [entriesByCreated])

  const timelineGroups = useMemo<TimelineGroup[]>(() => {
    const groups = new Map<
      string,
      {
        id: string
        year: number
        monthIndex: number
        month: string
        items: DashboardEntry[]
      }
    >()

    entriesByCreated.forEach((entry) => {
      const date = new Date(entry.createdAt)
      if (Number.isNaN(date.getTime())) return
      const year = date.getFullYear()
      const monthIndex = date.getMonth()
      const month = date.toLocaleString('en-US', { month: 'short' })
      const key = `${year}-${monthIndex}`
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          year,
          monthIndex,
          month,
          items: [],
        })
      }
      groups.get(key)?.items.push(entry)
    })

    return Array.from(groups.values())
      .sort((a, b) =>
        a.year === b.year ? b.monthIndex - a.monthIndex : b.year - a.year,
      )
      .map((group) => ({
        id: group.id,
        year: group.year,
        month: group.month,
        count: group.items.length,
        items: group.items.slice(0, 3),
      }))
  }, [entriesByCreated])

  const stats = useMemo<DashboardStats>(() => {
    const totalItems = entriesSource.length
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const newThisWeek = entriesSource.filter((entry) => {
      const created = new Date(entry.createdAt).getTime()
      return Number.isFinite(created) && created >= weekAgo
    }).length

    const ratingValues = ratedEntries
      .map((entry) => entry.rating)
      .filter((rating): rating is number => typeof rating === 'number')
    const averageRating = ratingValues.length
      ? ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length
      : null

    const categoryCounts = CATEGORY_GROUPS.map((group) => {
      const count = entriesSource.filter((entry) =>
        group.types.includes(entry.media.type),
      ).length
      return {
        id: group.id,
        label: group.label,
        count,
        colorVar: group.colorVar,
      }
    })
    const categoryTotal = categoryCounts.reduce(
      (sum, item) => sum + item.count,
      0,
    )
    const categoryDistribution = categoryCounts.map((item) => ({
      ...item,
      percentage: categoryTotal
        ? Math.round((item.count / categoryTotal) * 100)
        : 0,
    }))

    const genreCounts = new Map<string, number>()
    entriesSource.forEach((entry) => {
      ;(entry.media.genres ?? []).forEach((genre) => {
        if (!genre) return
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)
      })
    })
    const topGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }))

    const dayCounts = new Map<number, number>()
    entriesSource.forEach((entry) => {
      const created = new Date(entry.createdAt)
      if (Number.isNaN(created.getTime())) return
      const day = created.getDay()
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
    })
    const mostActiveDayEntry = Array.from(dayCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]
    const mostActiveDay =
      mostActiveDayEntry != null ? DAY_LABELS[mostActiveDayEntry[0]] : null

    return {
      totalItems,
      newThisWeek,
      averageRating,
      categoryDistribution,
      topGenres,
      mostWatchedGenre: topGenres[0]?.label ?? null,
      mostActiveDay,
    }
  }, [entriesSource, ratedEntries])

  const activityChips = useMemo<ActivityChip[]>(
    () => [
      {
        id: 'tracked',
        label: 'Tracked items',
        value: `${stats.totalItems} items`,
        tone: 'primary',
      },
      {
        id: 'new',
        label: 'New this week',
        value: `${stats.newThisWeek} new`,
        tone: 'secondary',
      },
      {
        id: 'avg',
        label: 'Avg rating',
        value:
          stats.averageRating != null
            ? `${stats.averageRating.toFixed(1)} / 10`
            : 'No ratings',
        tone: 'accent',
      },
    ],
    [stats],
  )

  return (
    <div className="space-y-8 pb-6">
      {user && error ? (
        <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm text-muted-foreground">
          {error}
        </div>
      ) : null}
      {!user && demoError ? (
        <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm text-muted-foreground">
          {demoError}
        </div>
      ) : null}
      {user && loading && !entries.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
          Loading your dashboard...
        </div>
      ) : null}
      {!user && demoLoading && !demoEntries.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
          Loading demo dashboard...
        </div>
      ) : null}
      <SolarSystemHero items={entriesSource} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <TodaySection continueItems={continueItems} />
          <RecentlyAddedSection items={recentItems} />
        </div>
        <ActivitySection activityChips={activityChips} />
      </div>
      <TimelineSection groups={timelineGroups} />
      <StatsSection stats={stats} />
    </div>
  )
}
