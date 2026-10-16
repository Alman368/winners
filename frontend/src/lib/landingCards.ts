import type { LandingFireView } from '@/hooks/useLandingFire'
import { t } from '@/i18n'
import { formatNumber, type Kpi } from '@/lib/fireReport'
import { storyChapters, type StoryChapterId } from '@/lib/landingStory'

export type ChapterStat = {
  label: string
  value: string
  unit: string
  description: string | null
}

export type ChapterRow = {
  label: string
  value: string | null
  color: string | null
  share: number | null
}

export type ChapterCard = {
  eyebrow: string
  title: string
  stats: ChapterStat[]
  rows: ChapterRow[]
}

/** Swatches of how the shortwave infrared composite paints each surface. */
const INFRARED_SWATCHES = { burned: '#8c2f2a', healthy: '#3fcf4f', smoke: '#a9d6e5' }

function kpiStat(kpi: Kpi, description = kpi.description): ChapterStat {
  return { label: kpi.title, value: kpi.value, unit: kpi.unit, description }
}

function plainStat(label: string, value: string): ChapterStat {
  return { label, value, unit: '', description: null }
}

function burnedStat(fire: LandingFireView): ChapterStat {
  return kpiStat(fire.kpis.burned, t.landing.chapters.avilaBurned.perimeter(fire.kpis.perimeterKm))
}

type FireContextView = NonNullable<LandingFireView['context']>

function windStat(context: FireContextView): ChapterStat {
  return plainStat(context.weather.windFrom, context.weather.windSpeed)
}

function card(id: Exclude<StoryChapterId, 'hero'>, fires: Record<string, LandingFireView | null>): ChapterCard | null {
  const copy = t.landing.chapters
  const avila = fires.avila
  const niebla = fires.niebla
  const mierla = fires['la-mierla']
  switch (id) {
    case 'avilaPlace':
      return avila && { eyebrow: copy.avilaPlace.eyebrow, title: avila.place, stats: [plainStat(copy.avilaPlace.date, avila.date)], rows: [] }
    case 'avilaInfrared':
      return {
        eyebrow: copy.avilaInfrared.eyebrow,
        title: copy.avilaInfrared.title,
        stats: [],
        rows: [
          { label: copy.avilaInfrared.burned, value: null, color: INFRARED_SWATCHES.burned, share: null },
          { label: copy.avilaInfrared.healthy, value: null, color: INFRARED_SWATCHES.healthy, share: null },
          { label: copy.avilaInfrared.smoke, value: null, color: INFRARED_SWATCHES.smoke, share: null },
        ],
      }
    case 'avilaAdvance':
      return avila && avila.firstDay
        ? {
            eyebrow: copy.avilaAdvance.eyebrow,
            title: copy.avilaAdvance.title,
            stats: [
              plainStat(copy.avilaAdvance.start, avila.firstDay.date),
              plainStat(copy.avilaAdvance.elapsed, copy.avilaAdvance.days(avila.firstDay.daysToScene)),
            ],
            rows: [],
          }
        : null
    case 'avilaBurned':
      return avila && { eyebrow: copy.avilaBurned.eyebrow, title: copy.avilaBurned.title, stats: [burnedStat(avila)], rows: [] }
    case 'avilaSeverity':
      return avila && { ...copy.avilaSeverity, stats: [kpiStat(avila.kpis.severe)], rows: avila.severityRows }
    case 'avilaFire':
      return avila && { ...copy.avilaFire, stats: [kpiStat(avila.kpis.front)], rows: avila.zoneRows }
    case 'avilaWind':
      return avila && avila.context
        ? {
            eyebrow: copy.avilaWind.eyebrow,
            title: copy.avilaWind.title(avila.context.weather.windFrom, avila.context.weather.windSpeed),
            stats: [
              plainStat(t.weather.gusts, avila.context.weather.gusts),
              plainStat(t.weather.maxTemperature, avila.context.weather.maxTemperature),
              plainStat(t.weather.minHumidity, avila.context.weather.minHumidity),
              plainStat(t.weather.rain, avila.context.weather.rain),
            ],
            rows: [],
          }
        : null
    case 'avilaRoads':
      return avila && avila.context
        ? { ...copy.avilaRoads, stats: [kpiStat(avila.context.roadsKpi, null)], rows: avila.context.roadRows }
        : null
    case 'avilaTowns':
      return avila && { eyebrow: copy.avilaTowns.eyebrow, title: copy.avilaTowns.title, stats: [], rows: avila.townRows }
    case 'avilaFinal':
      return avila && avila.final
        ? {
            eyebrow: copy.avilaFinal.eyebrow,
            title: copy.avilaFinal.title,
            stats: [
              {
                label: copy.avilaFinal.difference,
                value: `+${formatNumber(avila.final.differenceHa)}`,
                unit: t.kpis.ha,
                description: copy.avilaFinal.differenceDescription,
              },
            ],
            rows: avila.final.rows,
          }
        : null
    case 'nieblaArrive':
      return niebla && { eyebrow: copy.nieblaArrive.eyebrow(niebla.date), title: niebla.place, stats: [burnedStat(niebla), kpiStat(niebla.kpis.severe)], rows: [] }
    case 'nieblaDetail':
      return niebla && niebla.context
        ? {
            eyebrow: niebla.place,
            title: copy.nieblaDetail.title,
            stats: [kpiStat(niebla.kpis.front, null), windStat(niebla.context), kpiStat(niebla.context.roadsKpi)],
            rows: [],
          }
        : null
    case 'mierlaArrive':
      return mierla && { eyebrow: copy.mierlaArrive.eyebrow(mierla.date), title: mierla.place, stats: [burnedStat(mierla), kpiStat(mierla.kpis.severe)], rows: [] }
    case 'mierlaDetail':
      return mierla && mierla.context
        ? {
            eyebrow: mierla.place,
            title: copy.mierlaDetail.title,
            stats: [kpiStat(mierla.kpis.front, null), windStat(mierla.context), plainStat(copy.avilaTowns.inside, String(mierla.townsInside))],
            rows: [],
          }
        : null
  }
}

/** One card per chapter after the hero; null while that chapter's data is still loading. */
export function buildChapterCards(fires: Record<string, LandingFireView | null>): (ChapterCard | null)[] {
  return storyChapters.slice(1).map((chapter) => card(chapter.id as Exclude<StoryChapterId, 'hero'>, fires))
}

type RailFireId = keyof typeof t.landing.rail.fires

/** Chapters after the hero grouped by fire, for the side navigation. */
export const railGroups = storyChapters.reduce<{ label: string; chapters: { index: number; label: string; ariaLabel: string }[] }[]>(
  (groups, chapter, index) => {
    if (chapter.fireId === null) {
      return groups
    }
    const fireLabel = t.landing.rail.fires[chapter.fireId as RailFireId]
    const label = t.landing.rail.chapters[chapter.id]
    const item = { index, label, ariaLabel: t.landing.rail.go(`${fireLabel}, ${label}`) }
    const last = groups[groups.length - 1]
    if (last && last.label === fireLabel) {
      last.chapters.push(item)
      return groups
    }
    return [...groups, { label: fireLabel, chapters: [item] }]
  },
  [],
)
