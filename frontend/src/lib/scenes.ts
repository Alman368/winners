import { sceneImagePath } from '@/api/scenes'
import type { Composite, FireReport, LngLat } from '@/types/fireReport'
import type { Bbox } from '@/types/scene'

export const sceneComposites: Composite[] = ['true_color', 'swir']

export type SceneImageSource = {
  path: string
  coordinates: [LngLat, LngLat, LngLat, LngLat]
}

export function formatShortDate(day: string): string {
  return new Date(day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function bboxCorners([west, south, east, north]: Bbox): [LngLat, LngLat, LngLat, LngLat] {
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ]
}

export function sceneImageSource(report: FireReport, day: string, composite: Composite): SceneImageSource {
  if (day === report.scene.date) {
    return { path: report.scene.imageUrls[composite], coordinates: report.scene.corners }
  }
  return {
    path: sceneImagePath(report.scene.bbox, day, composite),
    coordinates: bboxCorners(report.scene.bbox),
  }
}
