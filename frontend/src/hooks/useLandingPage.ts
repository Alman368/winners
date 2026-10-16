import { useQuery } from '@tanstack/react-query'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useAnimationFrame, useInView, useMotionValueEvent, useScroll } from 'motion/react'
import { useMemo, useRef, useState } from 'react'

import { fetchDarkBasemapStyle } from '@/api/basemap'
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings'
import { useLandingFire, type LandingFireView } from '@/hooks/useLandingFire'
import { t } from '@/i18n'
import { demoFires } from '@/lib/demoFires'
import { mapColors } from '@/lib/fireReport'
import { buildChapterCards, railGroups } from '@/lib/landingCards'
import { applyStoryOpacity, applyWindDash, buildStoryPaints, copyPadding, earthStyle, windDashSteps } from '@/lib/landingMap'
import {
  buildStoryCameras,
  type Camera,
  cameraAt,
  chapterAt,
  globeCamera,
  isGroupShown,
  storyChapters,
} from '@/lib/landingStory'

const [avilaFire, nieblaFire, mierlaFire] = demoFires
const taglineLines = t.landing.tagline.map((line) => line.split(' '))
const WIND_STEP_MS = 60

export function useLandingPage() {
  const storyRef = useRef<HTMLElement>(null)
  const windStepRef = useRef(-1)
  const cameraRef = useRef<{ progress: number; cameras: Camera[] | null }>({ progress: -1, cameras: null })
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [chapter, setChapter] = useState(0)
  const { colorMode } = useAccessibilitySettings()
  const colors = mapColors[colorMode]

  const avila = useLandingFire(avilaFire, colors, true)
  const niebla = useLandingFire(nieblaFire, colors, false)
  const mierla = useLandingFire(mierlaFire, colors, false)
  const fires = [avila, niebla, mierla].filter((fire): fire is LandingFireView => fire !== null)

  const basemapQuery = useQuery({
    queryKey: ['basemap-style', 'dark'],
    queryFn: fetchDarkBasemapStyle,
    staleTime: Infinity,
    select: earthStyle,
  })
  const paints = useMemo(() => buildStoryPaints(colors), [colors])

  const avilaBounds = avila && avila.bounds
  const nieblaBounds = niebla && niebla.bounds
  const mierlaBounds = mierla && mierla.bounds
  const cameras = useMemo(
    () =>
      map && avilaBounds && nieblaBounds && mierlaBounds
        ? buildStoryCameras(map, { avila: avilaBounds, niebla: nieblaBounds, 'la-mierla': mierlaBounds })
        : null,
    [map, avilaBounds, nieblaBounds, mierlaBounds],
  )
  const storyFires = fires.map((fire) => ({ id: fire.id, severityIds: fire.severityIds }))

  const isStoryInView = useInView(storyRef)
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (progress) => setChapter(chapterAt(progress)))

  const currentChapter = storyChapters[chapter]
  const isWindShown = (currentChapter.layers.wind ?? 0) > 0
  /** Data and layers arrive after the first scroll, so every frame re-syncs the camera and the layers that are new or stale. */
  useAnimationFrame((time) => {
    if (!map || !cameras) {
      return
    }
    const progress = scrollYProgress.get()
    if (cameraRef.current.progress !== progress || cameraRef.current.cameras !== cameras) {
      cameraRef.current = { progress, cameras }
      map.jumpTo(cameraAt(cameras, progress))
    }
    applyStoryOpacity(map, storyFires, progress)
    const step = Math.floor(time / WIND_STEP_MS) % windDashSteps.length
    if (isWindShown && step !== windStepRef.current) {
      windStepRef.current = step
      applyWindDash(map, storyFires.map((fire) => fire.id), step)
    }
  })

  const attachMap = (instance: MapLibreMap | null) => {
    if (instance) {
      const container = instance.getContainer()
      instance.setPadding(copyPadding(container.clientWidth, container.clientHeight))
    }
    setMap(instance)
  }

  return {
    storyRef,
    attachMap,
    initialCamera: globeCamera,
    paints,
    fires: fires.map((fire) => ({
      view: fire,
      shown: {
        fire: isGroupShown(chapter, fire.id, 'fire'),
        roads: isGroupShown(chapter, fire.id, 'roads'),
        towns: isGroupShown(chapter, fire.id, 'towns'),
        wind: isGroupShown(chapter, fire.id, 'wind'),
      },
    })),
    storyCards: buildChapterCards({ avila, niebla, 'la-mierla': mierla }).map((card, index) => ({
      id: storyChapters[index + 1].id,
      card,
    })),
    rail: {
      groups: railGroups,
      current: chapter,
      isShown: isStoryInView && chapter > 0,
      select: (index: number) => window.scrollTo({ top: storyRef.current!.offsetTop + index * window.innerHeight, behavior: 'smooth' }),
    },
    recap:
      avila && niebla && mierla
        ? [avila, niebla, mierla].map((fire) => ({
            id: fire.id,
            place: fire.place,
            date: fire.date,
            image: fire.sceneImage,
            imageAlt: t.landing.recap.imageAlt(fire.place),
            stats: [fire.kpis.burned, fire.kpis.severe, fire.kpis.front].map((kpi) => ({
              label: kpi.title,
              value: kpi.value,
              unit: kpi.unit,
              description: null,
            })),
          }))
        : null,
    basemap: basemapQuery.data,
    taglineLines,
    isMapReady: avila !== null && basemapQuery.data !== undefined,
    isError: basemapQuery.isError,
  }
}
