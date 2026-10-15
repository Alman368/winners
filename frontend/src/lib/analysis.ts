import { sceneImagePath } from '@/api/scenes'
import { bboxCorners, sceneComposites } from '@/lib/scenes'
import type {
  AnalysisInProgress,
  AnalysisReport,
  AnalysisSeverityName,
  BurnedAreaFeature,
  FireAnalysis,
} from '@/types/analysis'
import type { FireReport, SeverityClass } from '@/types/fireReport'

const severityClassByName: Record<AnalysisSeverityName, SeverityClass> = {
  low: 'baja',
  moderate_low: 'moderada_baja',
  moderate_high: 'moderada_alta',
  high: 'alta',
}

export function isAnalysisInProgress<T extends object>(response: T | AnalysisInProgress): response is AnalysisInProgress {
  return 'status' in response
}

function analysisSections(analysis: FireAnalysis): Pick<FireReport, 'burned' | 'activeFire' | 'severity'> {
  const burnedFeature = analysis.geojson.features.find(
    (feature): feature is BurnedAreaFeature => feature.properties.kind === 'burned_area',
  )!
  return {
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

export function applyAnalysis(report: FireReport, analysis: FireAnalysis): FireReport {
  return {
    ...report,
    ...analysisSections(analysis),
    scene: { ...report.scene, bbox: analysis.scene.bbox },
  }
}

export function importedReport(id: string, name: string, imported: AnalysisReport): FireReport {
  const { bbox } = imported.analysis.scene
  const date = imported.georeference.date
  return {
    id,
    name,
    scene: {
      date,
      bbox,
      composites: sceneComposites,
      imageUrls: Object.fromEntries(sceneComposites.map((composite) => [composite, sceneImagePath(bbox, date, composite)])),
      corners: bboxCorners(bbox),
    },
    ...analysisSections(imported.analysis),
    affected: { towns: [], reservoirs: [] },
    validation: null,
  }
}
