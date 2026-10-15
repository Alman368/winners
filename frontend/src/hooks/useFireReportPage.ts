import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMemo, useState } from 'react'

import { fetchSceneAnalysis } from '@/api/analysis'
import { fetchBasemapStyle } from '@/api/basemap'
import { baseFetchObjectUrl } from '@/api/client'
import { fetchFireReport } from '@/api/fireReports'
import { fetchScenePasses } from '@/api/scenes'
import { applyAnalysis, buildSceneFacts, isAnalysisInProgress } from '@/lib/analysis'
import { demoFires } from '@/lib/demoFires'
import {
  buildAffectedRows,
  buildFireZones,
  buildKpis,
  buildLandCoverChart,
  buildLegend,
  buildMapData,
  type MapTarget,
} from '@/lib/fireReport'
import {
  availableComposites,
  buildDayOptions,
  neighbourDays,
  passWindow,
  sceneComposites,
  sceneImageSource,
} from '@/lib/scenes'
import type { Composite, MapLayerId } from '@/types/fireReport'
import type { SceneComposite } from '@/types/scene'

export const mapLayerOrder: MapLayerId[] = ['severity', 'burned', 'fire', 'towns', 'reservoirs', 'official']

export const NO_COMPARE = 'none'

const initialLayers: Record<MapLayerId, boolean> = {
  severity: true,
  burned: true,
  fire: true,
  towns: true,
  reservoirs: true,
  official: false,
}

const INITIAL_COMPARE_OPACITY = 0.5
const ANALYSIS_POLL_MS = 5000
const VISIBLE_FIRE_ZONES = 5
const FOCUS_ZOOM = 13
const FOCUS_PADDING = 80

function sceneImageQuery(path: string) {
  return queryOptions({
    queryKey: ['scene-image', path],
    queryFn: () => baseFetchObjectUrl(path),
    staleTime: Infinity,
  })
}

export function useFireReportPage() {
  const queryClient = useQueryClient()
  const [fireId, setFireId] = useState(demoFires[0].id)
  const [composite, setComposite] = useState<Composite>('swir')
  const [visibleLayers, setVisibleLayers] = useState(initialLayers)
  const [day, setDay] = useState<string | null>(null)
  const [compareDay, setCompareDay] = useState<string | null>(null)
  const [compareOpacity, setCompareOpacity] = useState(INITIAL_COMPARE_OPACITY)
  const [areFireZonesExpanded, setAreFireZonesExpanded] = useState(false)
  const [map, setMap] = useState<MapLibreMap | null>(null)

  const reportQuery = useQuery({
    queryKey: ['fire-report', fireId],
    queryFn: () => fetchFireReport(fireId),
    staleTime: Infinity,
  })
  const basemapQuery = useQuery({
    queryKey: ['basemap-style'],
    queryFn: fetchBasemapStyle,
    staleTime: Infinity,
  })
  const sceneId = demoFires.find((fire) => fire.id === fireId)!.sceneId
  const analysisQuery = useQuery({
    queryKey: ['fire-analysis', sceneId],
    queryFn: () => fetchSceneAnalysis(sceneId),
    staleTime: Infinity,
    retry: false,
    refetchInterval: (query) => (query.state.data && isAnalysisInProgress(query.state.data) ? ANALYSIS_POLL_MS : false),
  })
  const staticReport = reportQuery.data
  const isAnalysisRunning = analysisQuery.data !== undefined && isAnalysisInProgress(analysisQuery.data)
  const analysis = analysisQuery.data && !isAnalysisInProgress(analysisQuery.data) ? analysisQuery.data : undefined
  const report = useMemo(
    () => (staticReport && analysis ? applyAnalysis(staticReport, analysis) : undefined),
    [staticReport, analysis],
  )
  const passesQuery = useQuery({
    queryKey: ['scene-passes', fireId],
    queryFn: () => {
      const window = passWindow(report!)
      return fetchScenePasses(report!.scene.bbox, window.start, window.end)
    },
    enabled: report !== undefined,
    staleTime: Infinity,
  })

  const view = useMemo(() => {
    if (!report || !analysis) {
      return null
    }
    return {
      report,
      facts: buildSceneFacts(report, analysis),
      kpis: buildKpis(report),
      fireZones: buildFireZones(report),
      landCoverChart: buildLandCoverChart(report),
      affectedRows: buildAffectedRows(report),
      mapData: buildMapData(report),
    }
  }, [report, analysis])

  const fireZones = view ? view.fireZones : []
  const shownFireZones = areFireZonesExpanded ? fireZones : fireZones.slice(0, VISIBLE_FIRE_ZONES)

  const selectedDay = report ? (day ?? report.scene.date) : null
  const shownDays = selectedDay ? [selectedDay, ...(compareDay ? [compareDay] : [])] : []
  const composites = report ? availableComposites(report, shownDays) : []
  const isDaySelectionLocked = !sceneComposites.includes(composite as SceneComposite)

  const dayOptions = useMemo(
    () => (report && passesQuery.data ? buildDayOptions(report, passesQuery.data) : []),
    [report, passesQuery.data],
  )

  const baseSource = report && selectedDay ? sceneImageSource(report, selectedDay, composite) : null
  const compareSource = report && compareDay ? sceneImageSource(report, compareDay, composite) : null
  const baseImageQuery = useQuery({
    ...sceneImageQuery(baseSource ? baseSource.path : ''),
    enabled: baseSource !== null,
    placeholderData: keepPreviousData,
  })
  const compareImageQuery = useQuery({
    ...sceneImageQuery(compareSource ? compareSource.path : ''),
    enabled: compareSource !== null,
    placeholderData: keepPreviousData,
  })

  const prefetchImages = (days: string[], shownComposites: Composite[]) => {
    for (const shownDay of days) {
      for (const shownComposite of shownComposites) {
        queryClient.prefetchQuery(sceneImageQuery(sceneImageSource(report!, shownDay, shownComposite).path))
      }
    }
  }

  const sceneImages = [
    ...(baseSource && baseImageQuery.data
      ? [{ id: 'scene', url: baseImageQuery.data, coordinates: baseSource.coordinates, opacity: 1 }]
      : []),
    ...(compareSource && compareImageQuery.data
      ? [{ id: 'scene-compare', url: compareImageQuery.data, coordinates: compareSource.coordinates, opacity: compareOpacity }]
      : []),
  ]

  const legend = useMemo(() => (report ? buildLegend(report, visibleLayers) : null), [report, visibleLayers])

  const selectFire = (id: string) => {
    setFireId(id)
    setComposite('swir')
    setDay(null)
    setCompareDay(null)
    setAreFireZonesExpanded(false)
  }

  const focusTarget = (target: MapTarget) => {
    if (!map) {
      return
    }
    if (target.kind === 'point') {
      map.flyTo({ center: target.center, zoom: FOCUS_ZOOM })
    } else {
      map.fitBounds(target.bounds, { padding: FOCUS_PADDING, maxZoom: FOCUS_ZOOM })
    }
  }

  const selectComposite = (value: Composite) => {
    setComposite(value)
    if (sceneComposites.includes(value as SceneComposite)) {
      prefetchImages(neighbourDays(dayOptions, selectedDay!), [value])
    }
  }

  const selectDay = (value: string) => {
    setDay(value)
    if (compareDay === value) {
      setCompareDay(null)
    }
    prefetchImages(neighbourDays(dayOptions, value), [composite])
    prefetchImages([value], sceneComposites)
  }

  const selectCompareDay = (value: string) => {
    setCompareDay(value === NO_COMPARE ? null : value)
    if (value !== NO_COMPARE) {
      prefetchImages([value], sceneComposites)
    }
  }

  const setLayerVisible = (layer: MapLayerId, visible: boolean) => {
    setVisibleLayers((current) => ({ ...current, [layer]: visible }))
  }

  return {
    fires: demoFires,
    fireId,
    selectFire,
    composite,
    composites,
    setComposite: selectComposite,
    visibleLayers,
    setLayerVisible,
    view,
    setMap,
    focusTarget,
    fireZones: {
      shown: shownFireZones,
      hiddenCount: fireZones.length - shownFireZones.length,
      isExpanded: areFireZonesExpanded,
      toggleExpanded: () => setAreFireZonesExpanded((current) => !current),
    },
    basemap: basemapQuery.data,
    sceneImages,
    legend,
    scenes: {
      dayOptions,
      compareOptions: dayOptions.filter((option) => option.day !== selectedDay),
      day: selectedDay,
      selectDay,
      compareDay: compareDay ?? NO_COMPARE,
      selectCompareDay,
      compareOpacity,
      setCompareOpacity,
      isCompareActive: compareDay !== null,
      isLocked: isDaySelectionLocked,
      isLoading: passesQuery.isLoading,
      isError: passesQuery.isError,
      isImageLoading: baseImageQuery.isFetching || compareImageQuery.isFetching,
      isImageError: baseImageQuery.isError || compareImageQuery.isError,
    },
    isAnalysisRunning,
    isLoading: reportQuery.isLoading || analysisQuery.isLoading || isAnalysisRunning || basemapQuery.isLoading,
    isError: reportQuery.isError || analysisQuery.isError || basemapQuery.isError,
  }
}
