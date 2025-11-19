'use client'

import { SummaryStrip } from '@/components/main-page/SummaryStrip'
import { FavouritesHero } from '@/components/main-page/FavouritesHero'
import { TimelineSection } from '@/components/main-page/TimelineSection'
import { StatsSection } from '@/components/main-page/StatsSection'
import { ContinueWatchingSection } from '@/components/main-page/ContinueWatchingSection'
import { RecentlyAddedSection } from '@/components/main-page/RecentlyAddedSection'
import { SurpriseMeCard } from '@/components/main-page/SurpriseMeCard'

export default function Home() {
  return (
    <div className="space-y-12 pb-12">
      <SummaryStrip />
      <FavouritesHero />
      <TimelineSection />
      <StatsSection />
      <ContinueWatchingSection />
      <RecentlyAddedSection />
      <SurpriseMeCard />
    </div>
  )
}
