import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMemo, useState } from 'react'

import { fetchFireDays, fetchSceneAnalysis, fetchSceneContext } from '@/api/analysis'
import { fetchBasemapStyle } from '@/api/basemap'
import { baseFetchObjectUrl } from '@/api/client'
import { fetchFireReport } from '@/api/fireReports'
import type { MapViewport } from '@/components/ui/map'
import { useFireImport } from '@/hooks/useFireImport'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import { useRoadTooltip } from '@/hooks/useRoadTooltip'
import { t } from '@/i18n'
import { applyAnalysis, importedReport, isAnalysisInProgress } from '@/lib/analysis'
import { demoFires, type FireOption } from '@/lib/demoFires'
import {
  buildFireZones,
  buildKpis,
  buildLegend,
  buildMapData,
  buildRoadsKpi,
  buildRoadsMapData,
  buildWeatherSummary,
} from '@/lib/fireReport'
import { formatShortDate, sceneComposites, sceneImageSource } from '@/lib/scenes'
import type { AnalysisReport, FireContext } from '@/types/analysis'
import type { Composite, FireReport, LngLat, MapLayerId } from '@/types/fireReport'
import type { SceneComposite } from '@/types/scene'

export const mapLayerOrder: MapLayerId[] = ['severity', 'burned', 'fire', 'roads', 'towns', 'reservoirs', 'official']

type ImportedFire = FireOption & {
  report: FireReport
  context: FireContext
}

const VISIBLE_FIRE_ZONES = 5
const FOCUS_PADDING = 64
const FOCUS_ZOOM = 13

const initialLayers: Record<MapLayerId, boolean> = {
  severity: true,
  burned: true,
  fire: true,
  roads: true,
  towns: true,
  reservoirs: true,
  official: false,
}

const INITIAL_CURTAIN_POSITION = 0.5
const ANALYSIS_POLL_MS = 5000

function sceneImageQuery(path: string) {
  return queryOptions({
    queryKey: ['scene-image', path],
    queryFn: () => baseFetchObjectUrl(path),
    staleTime: Infinity,
  })
}

export function useFireReportPage() {
  const [fireId, setFireId] = useState(demoFires[0].id)
  const [composite, setComposite] = useState<Composite>('swir')
  const [visibleLayers, setVisibleLayers] = useState(initialLayers)
  const [areFireZonesExpanded, setAreFireZonesExpanded] = useState(false)
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(true)
  const [isCurtainOpen, setIsCurtainOpen] = useState(false)
  const [curtainPosition, setCurtainPosition] = useState(INITIAL_CURTAIN_POSITION)
  const [viewport, setViewport] = useState<MapViewport | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [importedFires, setImportedFires] = useState<ImportedFire[]>([])

  const demoFire = demoFires.find((fire) => fire.id === fireId)
  const importedFire = importedFires.find((fire) => fire.id === fireId)
  const sceneId = demoFire ? demoFire.sceneId : null

  const reportQuery = useQuery({
    queryKey: ['fire-report', fireId],
    queryFn: () => fetchFireReport(fireId),
    enabled: demoFire !== undefined,
    staleTime: Infinity,
  })
  const basemapQuery = useQuery({
    queryKey: ['basemap-style'],
    queryFn: fetchBasemapStyle,
    staleTime: Infinity,
  })
  const analysisQuery = useQuery({
    queryKey: ['fire-analysis', sceneId],
    queryFn: () => fetchSceneAnalysis(sceneId!),
    enabled: sceneId !== null,
    staleTime: Infinity,
  })
  const contextQuery = useQuery({
    queryKey: ['fire-context', sceneId],
    queryFn: () => fetchSceneContext(sceneId!),
    enabled: sceneId !== null,
    staleTime: Infinity,
    retry: false,
    refetchInterval: (query) => (query.state.data && isAnalysisInProgress(query.state.data) ? ANALYSIS_POLL_MS : false),
  })
  const fireDaysQuery = useQuery({
    queryKey: ['fire-days', sceneId],
    queryFn: () => fetchFireDays(sceneId!),
    enabled: sceneId !== null,
    staleTime: Infinity,
    retry: false,
    refetchInterval: (query) => (query.state.data && isAnalysisInProgress(query.state.data) ? ANALYSIS_POLL_MS : false),
  })
  const staticReport = reportQuery.data
  const analysis = analysisQuery.data
  const isContextRunning = contextQuery.data !== undefined && isAnalysisInProgress(contextQuery.data)
  const demoContext = contextQuery.data && !isAnalysisInProgress(contextQuery.data) ? contextQuery.data : undefined
  const demoReport = useMemo(
    () => (staticReport && analysis ? applyAnalysis(staticReport, analysis) : undefined),
    [staticReport, analysis],
  )
  const report = importedFire ? importedFire.report : demoReport
  const context = importedFire ? importedFire.context : demoContext
  const view = useMemo(() => {
    if (!report) {
      return null
    }
    return {
      report,
      kpis: buildKpis(report),
      fireZones: buildFireZones(report),
      mapData: buildMapData(report),
    }
  }, [report])
  const contextView = useMemo(() => {
    if (!context) {
      return null
    }
    return {
      roadsKpi: buildRoadsKpi(context.roads),
      roads: buildRoadsMapData(context.roads),
      weather: buildWeatherSummary(context.weather),
    }
  }, [context])

  const fireDays = fireDaysQuery.data && !isAnalysisInProgress(fireDaysQuery.data) ? fireDaysQuery.data : undefined
  const composites = report ? (isCurtainOpen ? sceneComposites : report.scene.composites) : []
  const isCurtainLocked = !sceneComposites.includes(composite as SceneComposite)

  const originalSource = report ? sceneImageSource(report, report.scene.date, composite) : null
  const firstDaySource = report && fireDays && isCurtainOpen ? sceneImageSource(report, fireDays.first, composite) : null
  const originalImageQuery = useQuery({
    ...sceneImageQuery(originalSource ? originalSource.path : ''),
    enabled: originalSource !== null,
    placeholderData: keepPreviousData,
  })
  const firstDayImageQuery = useQuery({
    ...sceneImageQuery(firstDaySource ? firstDaySource.path : ''),
    enabled: firstDaySource !== null,
    placeholderData: keepPreviousData,
  })

  const roadTooltip = useRoadTooltip(context ? context.roads : [])

  const legend = useMemo(
    () => (report ? buildLegend(report, context ? context.roads : [], visibleLayers) : null),
    [report, context, visibleLayers],
  )

  const fireZones = view ? view.fireZones : []
  const shownFireZones = areFireZonesExpanded ? fireZones : fireZones.slice(0, VISIBLE_FIRE_ZONES)

  const selectFire = (id: string) => {
    setFireId(id)
    setComposite('swir')
    setAreFireZonesExpanded(false)
    setIsCurtainOpen(false)
  }

  const addImportedFire = (imported: AnalysisReport, place: string) => {
    const id = crypto.randomUUID()
    const fire = {
      id,
      name: place,
      province: formatShortDate(imported.georeference.date),
      report: importedReport(id, place, imported),
      context: imported.context,
    }
    setImportedFires((current) => [...current, fire])
    selectFire(id)
  }

  const fireImport = useFireImport(addImportedFire)
  const tour = useOnboardingTour()

  const toggleCurtain = (open: boolean) => {
    if (open) {
      const center = map!.getCenter()
      setViewport({ center: [center.lng, center.lat], zoom: map!.getZoom(), bearing: map!.getBearing(), pitch: map!.getPitch() })
    }
    setIsCurtainOpen(open)
  }

  const focusZone = (bounds: [LngLat, LngLat]) => {
    if (!map) {
      return
    }
    map.fitBounds(bounds, { padding: FOCUS_PADDING, maxZoom: FOCUS_ZOOM })
  }

  const setLayerVisible = (layer: MapLayerId, visible: boolean) => {
    setVisibleLayers((current) => ({ ...current, [layer]: visible }))
  }

  return {
    fires: [...demoFires, ...importedFires],
    fireImport,
    tour,
    fireId,
    selectFire,
    composite,
    composites,
    setComposite,
    visibleLayers,
    setLayerVisible,
    view,
    setMap,
    focusZone,
    fireZones: {
      shown: shownFireZones,
      hiddenCount: fireZones.length - shownFireZones.length,
      isExpanded: areFireZonesExpanded,
      toggleExpanded: () => setAreFireZonesExpanded((current) => !current),
    },
    basemap: basemapQuery.data,
    originalImage:
      originalSource && originalImageQuery.data
        ? { url: originalImageQuery.data, coordinates: originalSource.coordinates }
        : null,
    legend,
    curtain: {
      isOpen: isCurtainOpen,
      toggle: toggleCurtain,
      position: curtainPosition,
      setPosition: setCurtainPosition,
      syncViewport: setViewport,
      onMapViewportChange: isCurtainOpen ? setViewport : undefined,
      firstDayImage:
        firstDaySource && firstDayImageQuery.data
          ? { url: firstDayImageQuery.data, coordinates: firstDaySource.coordinates }
          : null,
      comparison: isCurtainOpen
        ? {
            viewport: viewport!,
            beforeLabel: t.scenes.before(formatShortDate(fireDays!.first)),
            afterLabel: t.scenes.after(formatShortDate(report!.scene.date)),
          }
        : null,
      isAvailable: sceneId !== null,
      isLocked: isCurtainLocked,
      isLoading: fireDays === undefined && !fireDaysQuery.isError,
      isError: fireDaysQuery.isError,
    },
    isImageLoading: originalImageQuery.isFetching || firstDayImageQuery.isFetching,
    isImageError: originalImageQuery.isError || firstDayImageQuery.isError,
    roadTooltip,
    context: {
      view: contextView,
      isRunning: isContextRunning,
      isLoading: contextQuery.isLoading || isContextRunning,
      isError: contextQuery.isError,
    },
    weather: {
      isExpanded: isWeatherExpanded,
      toggleExpanded: () => setIsWeatherExpanded((current) => !current),
    },
    isLoading: reportQuery.isLoading || analysisQuery.isLoading || basemapQuery.isLoading,
    isError: reportQuery.isError || analysisQuery.isError || basemapQuery.isError,
  }
}
