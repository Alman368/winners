import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { importAnalysis } from '@/api/analysis'
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

  return {
    isOpen,
    setIsOpen,
    place,
    setPlace,
    setImage,
    canSubmit: image !== null && place.trim() !== '' && !mutation.isPending,
    submit: () => mutation.mutate(),
    isPending: mutation.isPending,
    isError: mutation.isError,
  }
}
