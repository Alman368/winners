import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, Point } from 'geojson'

export type AnalysisSeverityName = 'low' | 'moderate_low' | 'moderate_high' | 'high'

export type FireAnalysis = {
  scene: {
    bbox: [number, number, number, number]
    acquisition_date: string
    pre_fire_window: [string, string]
  }
  burned_area: {
    area_ha: number
    perimeter_km: number
    severity: { name: AnalysisSeverityName; area_ha: number; geometry: MultiPolygon }[]
  }
  active_fires: {
    id: number
    centroid: { lonlat: [number, number] }
    area_ha: number
    front_length_km: number
    geometry: MultiPolygon
  }[]
  active_front_km: number
  geojson: FeatureCollection<MultiPolygon | Point, { kind: AnalysisFeatureKind }>
}

export type AnalysisFeatureKind = 'burned_area' | 'smoke' | 'active_fire'

export type BurnedAreaFeature = Feature<MultiPolygon, { kind: 'burned_area' }>

export type AnalysisInProgress = { status: 'processing' }

export type FireDays = {
  first: string
  last: string
}

export type AffectedRoad = {
  ref: string | null
  name: string | null
  road_type: string
  km_inside: number
  geometry: MultiLineString
}

export type Weather = {
  wind_from_deg: number
  wind_towards_deg: number
  mean_wind_kmh: number
  max_gust_kmh: number
  max_temperature_c: number
  min_relative_humidity_pct: number
  total_precipitation_mm: number
}

export type FireContext = {
  roads: AffectedRoad[]
  weather: Weather
}

export type AnalysisReport = {
  georeference: { date: string }
  fire_start: string
  analysis: FireAnalysis
  context: FireContext
}
