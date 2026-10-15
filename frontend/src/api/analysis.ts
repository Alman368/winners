import { baseFetch } from '@/api/client'
import type { AnalysisInProgress, AnalysisReport, FireAnalysis, FireContext, FireDays } from '@/types/analysis'

export function fetchSceneAnalysis(sceneId: string): Promise<FireAnalysis> {
  return baseFetch<FireAnalysis>(`/api/analysis/scenes/${sceneId}`)
}

export function fetchFireDays(sceneId: string): Promise<FireDays | AnalysisInProgress> {
  return baseFetch<FireDays | AnalysisInProgress>(`/api/analysis/scenes/${sceneId}/fire-days`)
}

export function fetchSceneContext(sceneId: string): Promise<FireContext | AnalysisInProgress> {
  return baseFetch<FireContext | AnalysisInProgress>(`/api/analysis/scenes/${sceneId}/context`)
}

export function importAnalysis(image: File, place: string): Promise<AnalysisReport> {
  const body = new FormData()
  body.append('image', image)
  body.append('place', place)
  return baseFetch<AnalysisReport>('/api/analysis', { method: 'POST', body })
}
