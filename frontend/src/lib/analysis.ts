import { t } from '@/i18n'
import { formatDate } from '@/lib/fireReport'
import type { AnalysisInProgress, AnalysisSeverityName, BurnedAreaFeature, FireAnalysis } from '@/types/analysis'
import type { FireReport, SeverityClass } from '@/types/fireReport'

const severityClassByName: Record<AnalysisSeverityName, SeverityClass> = {
  low: 'baja',
  moderate_low: 'moderada_baja',
  moderate_high: 'moderada_alta',
  high: 'alta',
}

export function isAnalysisInProgress(response: FireAnalysis | AnalysisInProgress): response is AnalysisInProgress {
  return 'status' in response
}

export function applyAnalysis(report: FireReport, analysis: FireAnalysis): FireReport {
  const burnedFeature = analysis.geojson.features.find(
    (feature): feature is BurnedAreaFeature => feature.properties.kind === 'burned_area',
  )!
  return {
    ...report,
    scene: { ...report.scene, bbox: analysis.scene.bbox },
    burned: {
      perimeter: burnedFeature.geometry,
      areaHa: analysis.burned_area.area_ha,
      perimeterKm: analysis.burned_area.perimeter_km,
    },
    activeFire: {
      fronts: analysis.active_fires.map((fire) => ({
        id: fire.id,
        geometry: fire.geometry,
        lengthKm: fire.front_length_km,
        areaHa: fire.area_ha,
        centroid: fire.centroid.lonlat,
      })),
      totalLengthKm: analysis.active_front_km,
    },
    severity: {
      preFireDate: analysis.scene.pre_fire_window[1],
      classes: analysis.burned_area.severity.map((item) => ({
        class: severityClassByName[item.name],
        areaHa: item.area_ha,
        geometry: item.geometry,
      })),
    },
  }
}

const DAY_MS = 86_400_000

function formatPassTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export function buildSceneFacts(report: FireReport, analysis: FireAnalysis) {
  const fireStart = new Date(Date.parse(analysis.scene.pre_fire_window[1]) + DAY_MS).toISOString().slice(0, 10)
  return {
    acquisition: t.facts.acquisition(
      formatDate(report.scene.date),
      report.scene.passes.map((pass) => formatPassTime(pass.acquiredAt)).join(t.facts.and),
      report.scene.passes.map((pass) => pass.platform).join(t.facts.and),
    ),
    fireStart: t.facts.fireStart(formatDate(fireStart)),
    daysSinceStart: t.facts.daysSinceStart(Math.round((Date.parse(report.scene.date) - Date.parse(fireStart)) / DAY_MS)),
    preFire: t.facts.preFire(formatDate(analysis.scene.pre_fire_window[0]), formatDate(analysis.scene.pre_fire_window[1])),
  }
}
