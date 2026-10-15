import { useState, useSyncExternalStore } from 'react'

import { t } from '@/i18n'

export type TourSide = 'top' | 'bottom'

type TourTarget = keyof typeof t.tour.steps

type TourStep = {
  target: TourTarget
  side: TourSide
  element: Element
}

const tourSteps: { target: TourTarget; side: TourSide }[] = [
  { target: 'legend', side: 'top' },
  { target: 'composites', side: 'bottom' },
  { target: 'curtain', side: 'bottom' },
  { target: 'layers', side: 'bottom' },
  { target: 'weather', side: 'bottom' },
  { target: 'kpis', side: 'top' },
  { target: 'fireZones', side: 'top' },
  { target: 'import', side: 'bottom' },
]

function subscribeToResize(onResize: () => void) {
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}

function viewportSize() {
  return `${window.innerWidth}x${window.innerHeight}`
}

export function useOnboardingTour() {
  const [steps, setSteps] = useState<TourStep[]>([])
  const [index, setIndex] = useState(0)
  // Re-renders on resize so the highlight follows its target.
  useSyncExternalStore(subscribeToResize, viewportSize)

  const goTo = (available: TourStep[], next: number) => {
    available[next].element.scrollIntoView({ block: 'nearest' })
    setIndex(next)
  }

  const start = () => {
    const available = tourSteps.flatMap((step) => {
      const element = document.querySelector(`[data-tour="${step.target}"]`)
      return element ? [{ ...step, element }] : []
    })
    setSteps(available)
    goTo(available, 0)
  }

  const close = () => setSteps([])

  const step = steps.length > 0 ? steps[index] : null
  const isLast = index === steps.length - 1

  return {
    start,
    close,
    back: () => goTo(steps, index - 1),
    next: () => (isLast ? close() : goTo(steps, index + 1)),
    step: step && {
      anchor: { current: step.element },
      highlight: step.element.getBoundingClientRect(),
      side: step.side,
      title: t.tour.steps[step.target].title,
      description: t.tour.steps[step.target].description,
      progress: t.tour.progress(index + 1, steps.length),
      isFirst: index === 0,
      isLast,
    },
  }
}
