import type { Feature, FeatureCollection, MultiPolygon, Point } from 'geojson'

export type AnalysisSeverityName = 'low' | 'moderate_low' | 'moderate_high' | 'high'

export type FireAnalysis = {
  scene: {
    acquisition_date: string
    pre_fire_window: [string, string]
  }
  burned_area: {
    area_ha: number
    perimeter_km: number
    severity: { name: AnalysisSeverityName; area_ha: number; geometry: MultiPolygon }[]
  }
  active_fires: { id: number; front_length_km: number; geometry: MultiPolygon }[]
  active_front_km: number
  geojson: FeatureCollection<MultiPolygon | Point, { kind: AnalysisFeatureKind }>
}

export type AnalysisFeatureKind = 'burned_area' | 'smoke' | 'active_fire'

export type BurnedAreaFeature = Feature<MultiPolygon, { kind: 'burned_area' }>
