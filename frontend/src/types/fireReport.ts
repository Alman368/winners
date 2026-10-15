import type { MultiPolygon, Polygon } from 'geojson'

export type Composite = 'true_color' | 'swir' | 'wildfires'

export type LngLat = [number, number]

export type AreaGeometry = Polygon | MultiPolygon

export type SeverityClass = 'sin_quemar' | 'baja' | 'moderada_baja' | 'moderada_alta' | 'alta'

export type LandCover = 'broadlea' | 'conifer' | 'mixed' | 'scleroph' | 'transit' | 'othernatlc' | 'agriareas' | 'artifsurf'

export type FireReport = {
  id: string
  name: string
  scene: {
    date: string
    composites: Composite[]
    imageUrls: Partial<Record<Composite, string>>
    corners: [LngLat, LngLat, LngLat, LngLat]
  }
  burned: {
    perimeter: AreaGeometry
    areaHa: number
    perimeterKm: number
  }
  activeFire: {
    fronts: { geometry: AreaGeometry; lengthKm: number }[]
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
    roads: { name: string; roadType: string; kmInside: number }[]
    reservoirs: { areaHa: number; distanceKm: number; touches: boolean; geometry: AreaGeometry }[]
  }
  environment: {
    natura2000Pct: number
    landCoverPct: Record<LandCover, number>
    recurrencePct: number
  }
  validation: {
    agreementPct: number
    officialAreaHa: number
    officialPerimeter: AreaGeometry
  }
}

export type MapLayerId = 'severity' | 'burned' | 'fire' | 'towns' | 'reservoirs' | 'official'
