import type { Bbox, SceneComposite } from '@/types/scene'

export function sceneImagePath([west, south, east, north]: Bbox, day: string, composite: SceneComposite): string {
  const params = new URLSearchParams({
    west: String(west),
    south: String(south),
    east: String(east),
    north: String(north),
    day,
    composite,
  })
  return `/api/scenes/image?${params}`
}
