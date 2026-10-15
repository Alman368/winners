import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { fetchSceneAnalysis } from '@/api/analysis'
import { fetchBasemapStyle } from '@/api/basemap'
import { fetchFireReport } from '@/api/fireReports'
import { fetchScenePasses } from '@/api/scenes'
import { applyAnalysis } from '@/lib/analysis'
import { demoFires } from '@/lib/demoFires'
import {
  buildAffectedRows,
  buildKpis,
  buildLandCoverChart,
  buildLegend,
  buildMapData,
  buildSeverityChart,
  buildSummary,
} from '@/lib/fireReport'
import { availableComposites, buildDayOptions, buildSceneImage, passWindow, sceneBbox } from '@/lib/scenes'
import type { Composite, MapLayerId } from '@/types/fireReport'

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

export function useFireReportPage() {
  const [fireId, setFireId] = useState(demoFires[0].id)
  const [composite, setComposite] = useState<Composite>('swir')
  const [visibleLayers, setVisibleLayers] = useState(initialLayers)
  const [day, setDay] = useState<string | null>(null)
  const [compareDay, setCompareDay] = useState<string | null>(null)
  const [compareOpacity, setCompareOpacity] = useState(INITIAL_COMPARE_OPACITY)

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
  })
  const staticReport = reportQuery.data
  const analysis = analysisQuery.data
  const report = useMemo(
    () => (staticReport && analysis ? applyAnalysis(staticReport, analysis) : undefined),
    [staticReport, analysis],
  )
  const passesQuery = useQuery({
    queryKey: ['scene-passes', fireId],
    queryFn: () => {
      const window = passWindow(staticReport!)
      return fetchScenePasses(sceneBbox(staticReport!), window.start, window.end)
    },
    enabled: staticReport !== undefined,
    staleTime: Infinity,
  })

  const view = useMemo(() => {
    if (!report) {
      return null
    }
    return {
      report,
      summary: buildSummary(report),
      kpis: buildKpis(report),
      severityChart: buildSeverityChart(report),
      landCoverChart: buildLandCoverChart(report),
      affectedRows: buildAffectedRows(report),
      mapData: buildMapData(report),
    }
  }, [report])

  const selectedDay = report ? (day ?? report.scene.date) : null
  const shownDays = selectedDay ? [selectedDay, ...(compareDay ? [compareDay] : [])] : []
  const composites = report ? availableComposites(report, shownDays) : []

  const dayOptions = useMemo(
    () => (report && passesQuery.data ? buildDayOptions(report, passesQuery.data) : []),
    [report, passesQuery.data],
  )

  const sceneImages = useMemo(() => {
    if (!report || !selectedDay) {
      return []
    }
    const images = [buildSceneImage(report, 'scene', selectedDay, composite, 1)]
    if (compareDay) {
      images.push(buildSceneImage(report, 'scene-compare', compareDay, composite, compareOpacity))
    }
    return images
  }, [report, selectedDay, compareDay, composite, compareOpacity])

  const legend = useMemo(() => (report ? buildLegend(report, visibleLayers) : []), [report, visibleLayers])

  const keepCompositeAvailable = (days: string[]) => {
    if (report && !availableComposites(report, days).includes(composite)) {
      setComposite('swir')
    }
  }

  const selectFire = (id: string) => {
    setFireId(id)
    setComposite('swir')
    setDay(null)
    setCompareDay(null)
  }

  const selectDay = (value: string) => {
    const nextCompareDay = compareDay === value ? null : compareDay
    setDay(value)
    setCompareDay(nextCompareDay)
    keepCompositeAvailable([value, ...(nextCompareDay ? [nextCompareDay] : [])])
  }

  const selectCompareDay = (value: string) => {
    const nextCompareDay = value === NO_COMPARE ? null : value
    setCompareDay(nextCompareDay)
    keepCompositeAvailable([selectedDay!, ...(nextCompareDay ? [nextCompareDay] : [])])
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
    setComposite,
    visibleLayers,
    setLayerVisible,
    view,
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
      isLoading: passesQuery.isLoading,
      isError: passesQuery.isError,
    },
    isLoading: reportQuery.isLoading || analysisQuery.isLoading || basemapQuery.isLoading,
    isError: reportQuery.isError || analysisQuery.isError || basemapQuery.isError,
  }
}
