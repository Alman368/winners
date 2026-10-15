import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { fetchBasemapStyle } from '@/api/basemap'
import { fetchFireReport } from '@/api/fireReports'
import { demoFires } from '@/lib/demoFires'
import {
  buildAffectedRows,
  buildKpis,
  buildLandCoverChart,
  buildLegend,
  buildMapData,
  buildMapStyle,
  buildMeta,
  buildSeverityChart,
  buildSummary,
} from '@/lib/fireReport'
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

export function useFireReportPage() {
  const [fireId, setFireId] = useState(demoFires[0].id)
  const [composite, setComposite] = useState<Composite>('swir')
  const [visibleLayers, setVisibleLayers] = useState(initialLayers)

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

  const view = useMemo(() => {
    if (!reportQuery.data) {
      return null
    }
    const report = reportQuery.data
    return {
      report,
      meta: buildMeta(report),
      summary: buildSummary(report),
      kpis: buildKpis(report),
      severityChart: buildSeverityChart(report),
      landCoverChart: buildLandCoverChart(report),
      affectedRows: buildAffectedRows(report),
      mapData: buildMapData(report),
    }
  }, [reportQuery.data])

  const mapStyle = useMemo(
    () => (reportQuery.data && basemapQuery.data ? buildMapStyle(basemapQuery.data, reportQuery.data, composite) : null),
    [reportQuery.data, basemapQuery.data, composite],
  )

  const legend = useMemo(
    () => (reportQuery.data ? buildLegend(reportQuery.data, visibleLayers) : []),
    [reportQuery.data, visibleLayers],
  )

  const selectFire = (id: string) => {
    setFireId(id)
    setComposite('swir')
  }

  const setLayerVisible = (layer: MapLayerId, visible: boolean) => {
    setVisibleLayers((current) => ({ ...current, [layer]: visible }))
  }

  return {
    fires: demoFires,
    fireId,
    selectFire,
    composite,
    setComposite,
    visibleLayers,
    setLayerVisible,
    view,
    mapStyle,
    legend,
    isLoading: reportQuery.isLoading || basemapQuery.isLoading,
    isError: reportQuery.isError || basemapQuery.isError,
  }
}
