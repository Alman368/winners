import type { FeatureCollection, Geometry, Position } from 'geojson'

import type { ChartCard3Datum } from '@/components/chart-card3'
import { t } from '@/i18n'
import { palette } from '@/lib/palette'
import type { AreaGeometry, FireReport, LandCover, LngLat, MapLayerId, SeverityClass } from '@/types/fireReport'

export type Kpi = {
  id: string
  title: string
  value: string
  unit: string
  description: string
}

export type MapTarget = { kind: 'point'; center: LngLat } | { kind: 'bounds'; bounds: [LngLat, LngLat] }

export type AffectedRow = {
  id: string
  name: string
  type: string
  situation: string
  detail: string
  official: 'confirmed' | 'not_confirmed' | null
  target: MapTarget | null
}

export type FireZone = {
  id: number
  rank: number
  length: string
  detail: string
  target: MapTarget
}

export type LegendSymbol = 'fill' | 'line' | 'dashed' | 'fire' | 'marker' | 'ramp'

export type LegendItem = {
  id: string
  label: string
  detail: string | null
  symbol: LegendSymbol
  colors: string[]
  share: number | null
}

const SEVERE_CLASSES: SeverityClass[] = ['moderada_alta', 'alta']
const MIN_LAND_COVER_PCT = 1
const MIN_NEARBY_POPULATION = 500
const EDGE_KM = 0.1

export const severityColors: Record<Exclude<SeverityClass, 'sin_quemar'>, string> = {
  baja: palette.amber9,
  moderada_baja: palette.orange9,
  moderada_alta: palette.pink11,
  alta: palette.purple11,
}

export const mapColors = {
  burned: palette.carbon,
  fire: palette.red9,
  town: palette.carbon,
  reservoirs: palette.water,
  official: palette.white,
}

export const layerSymbols: Record<MapLayerId, { symbol: LegendSymbol; colors: string[] }> = {
  severity: { symbol: 'ramp', colors: Object.values(severityColors) },
  burned: { symbol: 'line', colors: [mapColors.burned] },
  fire: { symbol: 'fire', colors: [mapColors.fire] },
  towns: { symbol: 'marker', colors: [mapColors.town] },
  reservoirs: { symbol: 'fill', colors: [mapColors.reservoirs] },
  official: { symbol: 'dashed', colors: [mapColors.official] },
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function burnedClasses(report: FireReport) {
  return report.severity.classes.filter(
    (item): item is typeof item & { class: Exclude<SeverityClass, 'sin_quemar'> } => item.class !== 'sin_quemar',
  )
}

function severeHa(report: FireReport): number {
  return report.severity.classes.filter((item) => SEVERE_CLASSES.includes(item.class)).reduce((sum, item) => sum + item.areaHa, 0)
}

function severeSharePct(report: FireReport): number {
  const total = burnedClasses(report).reduce((sum, item) => sum + item.areaHa, 0)
  return (severeHa(report) / total) * 100
}

function townsInside(report: FireReport) {
  return report.affected.towns.filter((town) => town.inside)
}

function roadsKm(report: FireReport): number {
  return report.affected.roads.reduce((sum, road) => sum + road.kmInside, 0)
}

function relevantTowns(report: FireReport) {
  return report.affected.towns
    .filter((town) => town.inside || (town.population !== null && town.population >= MIN_NEARBY_POPULATION))
    .sort(
      (a, b) =>
        Number(b.inside && b.confirmedOfficial) - Number(a.inside && a.confirmedOfficial) ||
        Number(b.inside) - Number(a.inside) ||
        a.distanceKm - b.distanceKm,
    )
}

function geometryBounds(geometry: AreaGeometry): [LngLat, LngLat] {
  const rings: Position[][] = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
  const points = rings.flat()
  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

function formatCoordinates([lng, lat]: LngLat): string {
  return t.fireZones.coordinates(formatNumber(Math.abs(lat), 3), lat >= 0 ? 'N' : 'S', formatNumber(Math.abs(lng), 3), lng >= 0 ? 'E' : 'O')
}

export function buildKpis(report: FireReport): Kpi[] {
  return [
    {
      id: 'burned',
      title: t.kpis.burned,
      value: formatNumber(report.burned.areaHa),
      unit: t.kpis.ha,
      description: t.kpis.burnedDescription(formatNumber(report.burned.perimeterKm)),
    },
    {
      id: 'severe',
      title: t.kpis.severe,
      value: formatNumber(severeHa(report)),
      unit: t.kpis.ha,
      description: t.kpis.severeDescription(formatNumber(severeSharePct(report))),
    },
    {
      id: 'fire',
      title: t.kpis.fire,
      value: formatNumber(report.activeFire.totalLengthKm, 1),
      unit: t.kpis.km,
      description: t.kpis.fireDescription,
    },
    {
      id: 'affected',
      title: t.kpis.affected,
      value: String(townsInside(report).length),
      unit: '',
      description: t.kpis.affectedDescription(formatNumber(roadsKm(report), 1)),
    },
  ]
}

export function buildFireZones(report: FireReport): FireZone[] {
  return [...report.activeFire.fronts]
    .sort((a, b) => b.lengthKm - a.lengthKm)
    .map((front, index) => ({
      id: front.id,
      rank: index + 1,
      length: t.fireZones.length(formatNumber(front.lengthKm, 1)),
      detail: t.fireZones.detail(formatNumber(front.areaHa, 1), formatCoordinates(front.centroid)),
      target: { kind: 'point', center: front.centroid },
    }))
}

export function buildLegend(report: FireReport, visibleLayers: Record<MapLayerId, boolean>) {
  const classes = burnedClasses(report)
  const totalHa = classes.reduce((sum, item) => sum + item.areaHa, 0)
  const severity: LegendItem[] = visibleLayers.severity
    ? classes.map((item) => ({
        id: `severity-${item.class}`,
        label: t.severity.classes[item.class],
        detail: t.legend.hectares(formatNumber(item.areaHa)),
        symbol: 'fill',
        colors: [severityColors[item.class]],
        share: item.areaHa / totalHa,
      }))
    : []
  const details: Record<Exclude<MapLayerId, 'severity'>, string | null> = {
    burned: t.legend.hectares(formatNumber(report.burned.areaHa)),
    fire: t.legend.front(formatNumber(report.activeFire.totalLengthKm, 1)),
    towns: null,
    reservoirs: null,
    official: t.legend.hectares(formatNumber(report.validation.officialAreaHa)),
  }
  const hasData: Record<keyof typeof details, boolean> = {
    burned: true,
    fire: report.activeFire.fronts.length > 0,
    towns: relevantTowns(report).length > 0,
    reservoirs: report.affected.reservoirs.length > 0,
    official: true,
  }
  const layers: LegendItem[] = (Object.keys(details) as (keyof typeof details)[])
    .filter((layer) => visibleLayers[layer] && hasData[layer])
    .map((layer) => ({
      id: layer,
      label: t.map.layerNames[layer],
      detail: details[layer],
      symbol: layerSymbols[layer].symbol,
      colors: layerSymbols[layer].colors,
      share: null,
    }))
  return { severity, layers }
}

export function buildLandCoverChart(report: FireReport): { data: ChartCard3Datum[]; footer: string[] } {
  return {
    data: (Object.entries(report.environment.landCoverPct) as [LandCover, number][])
      .filter(([, pct]) => pct >= MIN_LAND_COVER_PCT)
      .sort(([, a], [, b]) => b - a)
      .map(([type, pct]) => ({ label: t.environment.landCover[type], value: Math.round(pct), fill: 'var(--chart-vegetation)' })),
    footer: [
      t.environment.natura(formatNumber(report.environment.natura2000Pct)),
      t.environment.recurrence(formatNumber(report.environment.recurrencePct)),
    ],
  }
}

export function buildAffectedRows(report: FireReport): AffectedRow[] {
  const towns = relevantTowns(report).map<AffectedRow>((town) => ({
    id: `town-${town.name}`,
    name: town.name,
    type: t.affected.types.town,
    situation: town.inside
      ? t.affected.inside
      : town.distanceKm < EDGE_KM
        ? t.affected.edge
        : t.affected.near(formatNumber(town.distanceKm, 1)),
    detail: town.population === null ? t.affected.noPopulation : t.affected.population(formatNumber(town.population)),
    official: town.inside ? (town.confirmedOfficial ? 'confirmed' : 'not_confirmed') : null,
    target: { kind: 'point', center: town.coordinates },
  }))
  const roads = report.affected.roads.map<AffectedRow>((road) => ({
    id: `road-${road.name}`,
    name: road.name,
    type: t.affected.types.road,
    situation: t.affected.inside,
    detail: t.affected.kmInside(formatNumber(road.kmInside, 1)),
    official: null,
    target: null,
  }))
  const reservoirs = report.affected.reservoirs.map<AffectedRow>((reservoir, index) => ({
    id: `reservoir-${index}`,
    name: t.affected.reservoirName(formatNumber(reservoir.areaHa)),
    type: t.affected.types.reservoir,
    situation: reservoir.touches ? t.affected.edge : t.affected.near(formatNumber(reservoir.distanceKm, 1)),
    detail: t.affected.notApplicable,
    official: null,
    target: { kind: 'bounds', bounds: geometryBounds(reservoir.geometry) },
  }))
  return [...towns, ...roads, ...reservoirs]
}

function collection(geometries: Geometry[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })),
  }
}

export function buildMapData(report: FireReport) {
  const lngs = report.scene.corners.map(([lng]) => lng)
  const lats = report.scene.corners.map(([, lat]) => lat)
  return {
    bounds: [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]],
    severity: burnedClasses(report)
      .filter((item) => item.geometry)
      .map((item) => ({
        id: item.class,
        color: severityColors[item.class],
        data: collection([item.geometry as Geometry]),
      })),
    burned: collection([report.burned.perimeter]),
    fire: collection(report.activeFire.fronts.map((front) => front.geometry)),
    reservoirs: collection(report.affected.reservoirs.map((reservoir) => reservoir.geometry)),
    official: collection([report.validation.officialPerimeter]),
    towns: relevantTowns(report).map((town) => ({ name: town.name, coordinates: town.coordinates, inside: town.inside })),
  }
}
