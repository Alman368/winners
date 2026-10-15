import { sceneImagePath } from '@/api/scenes'
import { t } from '@/i18n'
import { formatNumber } from '@/lib/fireReport'
import type { Composite, FireReport, LngLat } from '@/types/fireReport'
import type { DayOption, SceneComposite, ScenePass } from '@/types/scene'

const PASS_WINDOW_DAYS = 30
const DAY_MS = 86_400_000

export const sceneComposites: SceneComposite[] = ['true_color', 'swir']

export type SceneImageSource = {
  path: string
  coordinates: [LngLat, LngLat, LngLat, LngLat]
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

export function sceneImageSource(report: FireReport, day: string, composite: Composite): SceneImageSource {
  if (day === report.scene.date) {
    return { path: report.scene.imageUrls[composite] as string, coordinates: report.scene.corners }
  }
  const [west, south, east, north] = report.scene.bbox
  return {
    path: sceneImagePath([west, south, east, north], day, composite as SceneComposite),
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  }
}

export function neighbourDays(options: DayOption[], day: string): string[] {
  const index = options.findIndex((option) => option.day === day)
  return [options[index - 1], options[index + 1]].filter((option) => option !== undefined).map((option) => option.day)
}
