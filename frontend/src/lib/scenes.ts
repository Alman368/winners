import { sceneImageUrl } from '@/api/scenes'
import { t } from '@/i18n'
import { formatNumber } from '@/lib/fireReport'
import type { Composite, FireReport, LngLat } from '@/types/fireReport'
import type { Bbox, DayOption, SceneComposite, ScenePass } from '@/types/scene'

const PASS_WINDOW_DAYS = 30
const DAY_MS = 86_400_000

export const sceneComposites: SceneComposite[] = ['true_color', 'swir']

export type SceneImage = {
  id: string
  url: string
  coordinates: [LngLat, LngLat, LngLat, LngLat]
  opacity: number
}

export function sceneBbox(report: FireReport): Bbox {
  const lngs = report.scene.corners.map(([lng]) => lng)
  const lats = report.scene.corners.map(([, lat]) => lat)
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}

function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10)
}

export function passWindow(report: FireReport): { start: string; end: string } {
  return {
    start: shiftDay(report.severity.preFireDate, -PASS_WINDOW_DAYS),
    end: shiftDay(report.scene.date, PASS_WINDOW_DAYS),
  }
}

function formatShortDate(day: string): string {
  return new Date(day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function buildDayOptions(report: FireReport, passes: ScenePass[]): DayOption[] {
  const cloudByDay = new Map<string, number>()
  for (const pass of passes) {
    const day = pass.acquired_at.slice(0, 10)
    cloudByDay.set(day, Math.max(cloudByDay.get(day) ?? 0, pass.cloud_cover))
  }
  const days = [...new Set([...cloudByDay.keys(), report.scene.date])].sort()
  return days.map((day) => {
    const cloud = cloudByDay.get(day)
    const date = formatShortDate(day)
    return {
      day,
      label: cloud === undefined ? date : t.scenes.dayOption(date, formatNumber(cloud)),
    }
  })
}

export function availableComposites(report: FireReport, days: string[]): Composite[] {
  return days.every((day) => day === report.scene.date) ? report.scene.composites : sceneComposites
}

export function buildSceneImage(
  report: FireReport,
  id: string,
  day: string,
  composite: Composite,
  opacity: number,
): SceneImage {
  if (day === report.scene.date) {
    return { id, url: report.scene.imageUrls[composite] as string, coordinates: report.scene.corners, opacity }
  }
  const [west, south, east, north] = sceneBbox(report)
  return {
    id,
    url: sceneImageUrl([west, south, east, north], day, composite as SceneComposite),
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    opacity,
  }
}
