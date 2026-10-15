import { baseFetch } from '@/api/client'
import type { Bbox, SceneComposite, ScenePass } from '@/types/scene'

function bboxParams([west, south, east, north]: Bbox): Record<string, string> {
  return { west: String(west), south: String(south), east: String(east), north: String(north) }
}

export function fetchScenePasses(bbox: Bbox, start: string, end: string): Promise<ScenePass[]> {
  const params = new URLSearchParams({ ...bboxParams(bbox), start, end })
  return baseFetch<ScenePass[]>(`/api/scenes/passes?${params}`)
}

export function sceneImagePath(bbox: Bbox, day: string, composite: SceneComposite): string {
  const params = new URLSearchParams({ ...bboxParams(bbox), day, composite })
  return `/api/scenes/image?${params}`
}
