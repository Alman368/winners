import type { AnalysisSeverityName, BurnedAreaFeature, FireAnalysis } from '@/types/analysis'
import type { FireReport, SeverityClass } from '@/types/fireReport'

const severityClassByName: Record<AnalysisSeverityName, SeverityClass> = {
  low: 'baja',
  moderate_low: 'moderada_baja',
  moderate_high: 'moderada_alta',
  high: 'alta',
}

export function applyAnalysis(report: FireReport, analysis: FireAnalysis): FireReport {
  const burnedFeature = analysis.geojson.features.find(
    (feature): feature is BurnedAreaFeature => feature.properties.kind === 'burned_area',
  )!
  return {
    ...report,
    burned: {
      perimeter: burnedFeature.geometry,
      areaHa: analysis.burned_area.area_ha,
      perimeterKm: analysis.burned_area.perimeter_km,
    },
    activeFire: {
      fronts: analysis.active_fires.map((fire) => ({ geometry: fire.geometry, lengthKm: fire.front_length_km })),
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
