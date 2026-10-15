import type { Composite, FireReport, LngLat } from '@/types/fireReport'

export type SceneImage = {
  id: string
  url: string
  coordinates: [LngLat, LngLat, LngLat, LngLat]
  opacity: number
}

export function buildSceneImage(report: FireReport, composite: Composite): SceneImage {
  return { id: 'scene', url: report.scene.imageUrls[composite] as string, coordinates: report.scene.corners, opacity: 1 }
}
