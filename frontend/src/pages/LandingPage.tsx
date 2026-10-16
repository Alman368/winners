import { MotionConfig } from 'motion/react'

import { LandingChapter } from '@/components/LandingChapter'
import { LandingChapterSkeleton } from '@/components/LandingChapterSkeleton'
import { LandingFinalCta } from '@/components/LandingFinalCta'
import { LandingGlobe } from '@/components/LandingGlobe'
import { LandingHero } from '@/components/LandingHero'
import { LandingNav } from '@/components/LandingNav'
import { LandingProgressRail } from '@/components/LandingProgressRail'
import { LandingRecap } from '@/components/LandingRecap'
import { LandingTagline } from '@/components/LandingTagline'
import { Skeleton } from '@/components/ui/skeleton'
import { useLandingPage } from '@/hooks/useLandingPage'
import { t } from '@/i18n'
import { appRoutes } from '@/lib/routes'

export function LandingPage() {
  const { storyRef, ...page } = useLandingPage()
  const { landing } = t

  return (
    <MotionConfig reducedMotion="user">
      <title>{landing.title}</title>
      <LandingNav homeTo={appRoutes.landing} homeLabel={landing.nav.home} appTo={appRoutes.app} appLabel={landing.nav.open} />
      <LandingProgressRail
        label={landing.rail.label}
        groups={page.rail.groups}
        current={page.rail.current}
        isShown={page.rail.isShown}
        onSelect={page.rail.select}
      />
      <main className="bg-black text-white [--background:#000000]">
        <section ref={storyRef} className="relative">
          <div className="sticky top-0 h-dvh overflow-hidden">
            {page.isError && (
              <p className="flex size-full items-center justify-center px-4 text-center text-base text-white/70">
                {landing.loadError}
              </p>
            )}
            {!page.isError && !page.isMapReady && <Skeleton className="size-full rounded-none bg-[#181818]" />}
            {page.isMapReady && (
              <LandingGlobe
                mapRef={page.attachMap}
                basemap={page.basemap!}
                initialCamera={page.initialCamera}
                paints={page.paints}
                fires={page.fires}
              />
            )}
            <p className="absolute right-4 bottom-2 left-4 text-right text-xs text-white/40 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
              {landing.credits}
            </p>
          </div>
          <div className="pointer-events-none relative z-10 -mt-[100dvh]">
            <LandingHero
              eyebrow={landing.hero.eyebrow}
              titleLines={landing.hero.title}
              description={landing.hero.description}
              ctaTo={appRoutes.app}
              ctaLabel={landing.hero.cta}
              scrollHint={landing.hero.scrollHint}
            />
            {page.storyCards.map(({ id, card }) => (
              <div key={id} className="flex h-dvh items-end px-4 pb-8 sm:items-center sm:px-12 sm:pb-0">
                {card ? <LandingChapter {...card} /> : <LandingChapterSkeleton />}
              </div>
            ))}
          </div>
        </section>
        <LandingTagline lines={page.taglineLines} />
        <LandingRecap eyebrow={landing.recap.eyebrow} title={landing.recap.title} items={page.recap} />
        <LandingFinalCta
          title={landing.final.title}
          description={landing.final.description}
          ctaTo={appRoutes.app}
          ctaLabel={landing.final.cta}
        />
      </main>
    </MotionConfig>
  )
}
