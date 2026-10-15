import type { MultiPolygon, Polygon } from 'geojson'

export type Composite = 'true_color' | 'swir' | 'wildfires'

export type LngLat = [number, number]

export type AreaGeometry = Polygon | MultiPolygon

export type SeverityClass = 'sin_quemar' | 'baja' | 'moderada_baja' | 'moderada_alta' | 'alta'

export type FireReport = {
  id: string
  name: string
  scene: {
    date: string
    composites: Composite[]
    imageUrls: Partial<Record<Composite, string>>
    corners: [LngLat, LngLat, LngLat, LngLat]
    bbox: [number, number, number, number]
  }
  burned: {
    perimeter: AreaGeometry
    areaHa: number
    perimeterKm: number
  }
  activeFire: {
    fronts: { id: number; geometry: AreaGeometry; lengthKm: number; areaHa: number; centroid: LngLat }[]
    totalLengthKm: number
  }
  severity: {
    preFireDate: string
    classes: { class: SeverityClass; areaHa: number; geometry: AreaGeometry | null }[]
  }
  affected: {
    towns: {
      name: string
      population: number | null
      inside: boolean
      confirmedOfficial: boolean
      distanceKm: number
      coordinates: LngLat
    }[]
    reservoirs: { areaHa: number; distanceKm: number; touches: boolean; geometry: AreaGeometry }[]
  }
  validation: {
    agreementPct: number
    officialAreaHa: number
    officialPerimeter: AreaGeometry
  } | null
}

export type MapLayerId = 'severity' | 'burned' | 'fire' | 'roads' | 'towns' | 'reservoirs' | 'official'
