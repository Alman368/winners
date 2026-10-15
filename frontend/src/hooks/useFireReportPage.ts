import { useQuery } from '@tanstack/react-query'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMemo, useState } from 'react'

import { fetchSceneAnalysis } from '@/api/analysis'
import { fetchBasemapStyle } from '@/api/basemap'
import { fetchFireReport } from '@/api/fireReports'
import { applyAnalysis } from '@/lib/analysis'
import { demoFires } from '@/lib/demoFires'
import {
  buildAffectedRows,
  buildKpis,
  buildLegend,
  buildMapData,
  type MapTarget,
} from '@/lib/fireReport'
import { buildSceneImage } from '@/lib/scenes'
import type { Composite, MapLayerId } from '@/types/fireReport'

export const mapLayerOrder: MapLayerId[] = ['severity', 'burned', 'fire', 'towns', 'reservoirs', 'official']

const initialLayers: Record<MapLayerId, boolean> = {
  severity: true,
  burned: true,
  fire: true,
  towns: true,
  reservoirs: true,
  official: false,
}

const FOCUS_ZOOM = 13
const FOCUS_PADDING = 80

export function useFireReportPage() {
  const [fireId, setFireId] = useState(demoFires[0].id)
  const [composite, setComposite] = useState<Composite>('swir')
  const [visibleLayers, setVisibleLayers] = useState(initialLayers)
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
  })
  const staticReport = reportQuery.data
  const analysis = analysisQuery.data
  const report = useMemo(
    () => (staticReport && analysis ? applyAnalysis(staticReport, analysis) : undefined),
    [staticReport, analysis],
  )

  const view = useMemo(() => {
    if (!report) {
      return null
    }
    return {
      report,
      kpis: buildKpis(report),
      affectedRows: buildAffectedRows(report),
      mapData: buildMapData(report),
    }
  }, [report])

  const composites = report ? report.scene.composites : []
  const sceneImages = report ? [buildSceneImage(report, composite)] : []

  const legend = useMemo(() => (report ? buildLegend(report, visibleLayers) : null), [report, visibleLayers])

  const selectFire = (id: string) => {
    setFireId(id)
    setComposite('swir')
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
    setMap,
    focusTarget,
    basemap: basemapQuery.data,
    sceneImages,
    legend,
    isLoading: reportQuery.isLoading || analysisQuery.isLoading || basemapQuery.isLoading,
    isError: reportQuery.isError || analysisQuery.isError || basemapQuery.isError,
  }
}
