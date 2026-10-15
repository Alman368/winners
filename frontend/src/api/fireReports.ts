import { baseFetch } from '@/api/client'
import type { FireReport } from '@/types/fireReport'

export function fetchFireReport(fireId: string): Promise<FireReport> {
  return baseFetch<FireReport>(`/demo/${fireId}/report.json`)
}
