import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { importAnalysis } from '@/api/analysis'
import { ApiError } from '@/api/client'
import { t } from '@/i18n'
import type { AnalysisReport } from '@/types/analysis'

export function useFireImport(onImported: (report: AnalysisReport, place: string) => void) {
  const [isOpen, setIsOpen] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [place, setPlace] = useState('')

  const mutation = useMutation({
    mutationFn: () => importAnalysis(image!, place.trim()),
    onSuccess: (report) => {
      onImported(report, place.trim())
      setIsOpen(false)
      setImage(null)
      setPlace('')
    },
  })

  let errorMessage: string | null = null
  if (mutation.isError) {
    const detail = mutation.error instanceof ApiError ? mutation.error.detail : null
    switch (detail) {
      case 'copernicus_quota_exhausted':
        errorMessage = t.importFire.quotaError
        break
      case 'effis_unavailable':
        errorMessage = t.importFire.effisError
        break
      case 'fire_context_unavailable':
        errorMessage = t.importFire.contextError
        break
      default:
        errorMessage = t.importFire.error
    }
  }

  return {
    isOpen,
    setIsOpen,
    place,
    setPlace,
    setImage,
    canSubmit: image !== null && place.trim() !== '' && !mutation.isPending,
    submit: () => mutation.mutate(),
    isPending: mutation.isPending,
    errorMessage,
  }
}
