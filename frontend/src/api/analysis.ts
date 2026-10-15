import { baseFetch } from '@/api/client'
import type { AnalysisInProgress, FireAnalysis } from '@/types/analysis'

export function fetchSceneAnalysis(sceneId: string): Promise<FireAnalysis | AnalysisInProgress> {
  return baseFetch<FireAnalysis | AnalysisInProgress>(`/api/analysis/scenes/${sceneId}`)
}
