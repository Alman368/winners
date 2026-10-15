import { baseFetch } from '@/api/client'
import type { FireAnalysis } from '@/types/analysis'

export function fetchSceneAnalysis(sceneId: string): Promise<FireAnalysis> {
  return baseFetch<FireAnalysis>(`/api/analysis/scenes/${sceneId}`)
}
