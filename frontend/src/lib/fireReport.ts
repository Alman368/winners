import type { FeatureCollection, Geometry, MultiLineString } from 'geojson'

import { t } from '@/i18n'
import type { ColorMode } from '@/lib/accessibility'
import { palette } from '@/lib/palette'
import type { AffectedRoad, Weather } from '@/types/analysis'
import type { FireReport, LngLat, MapLayerId, SeverityClass } from '@/types/fireReport'

export type Kpi = {
  id: string
  title: string
  value: string
  unit: string
  description: string
}

export type FireZone = {
  id: number
  rank: number
  length: string
  detail: string
  bounds: [LngLat, LngLat]
}

const MIN_LIST_FRONT_KM = 0.5

export type LegendSymbol = 'fill' | 'line' | 'dashed' | 'fire' | 'marker' | 'ring' | 'ramp'

export type LegendItem = {
  id: string
  label: string
  detail: string | null
  symbol: LegendSymbol
  colors: string[]
  share: number | null
}

export type WeatherSummary = {
  towardsDeg: number
  windFrom: string
  windSpeed: string
  gusts: string
  maxTemperature: string
  minHumidity: string
  rain: string
}

const SEVERE_CLASSES: SeverityClass[] = ['moderada_alta', 'alta']
const LISTED_ROADS = 3
const COMPASS_SECTOR_DEG = 360 / t.weather.directions.length

export type MapColors = {
  severity: Record<Exclude<SeverityClass, 'sin_quemar'>, string>
  burned: string
  fire: string
  roads: string
  town: string
  reservoirs: string
  official: string
}

export type LayerSymbols = Record<MapLayerId, { symbol: LegendSymbol; colors: string[] }>

export const mapColors: Record<ColorMode, MapColors> = {
  standard: {
    severity: { baja: palette.amber9, moderada_baja: palette.orange9, moderada_alta: palette.pink11, alta: palette.purple11 },
    burned: palette.carbon,
    fire: palette.red9,
    roads: palette.sky9,
    town: palette.carbon,
    reservoirs: palette.water,
    official: palette.white,
  },
  colorblind: {
    severity: {
      baja: palette.viridisYellow,
      moderada_baja: palette.viridisTeal,
      moderada_alta: palette.viridisBlue,
      alta: palette.viridisPurple,
    },
    burned: palette.carbon,
    fire: palette.okabeVermillion,
    roads: palette.okabeSkyBlue,
    town: palette.carbon,
    reservoirs: palette.okabeBlue,
    official: palette.white,
  },
}

export function buildLayerSymbols(colors: MapColors): LayerSymbols {
  return {
    severity: { symbol: 'ramp', colors: Object.values(colors.severity) },
    burned: { symbol: 'line', colors: [colors.burned] },
    fire: { symbol: 'fire', colors: [colors.fire] },
    roads: { symbol: 'line', colors: [colors.roads] },
    townsInside: { symbol: 'marker', colors: [colors.town] },
    townsNearby: { symbol: 'ring', colors: [colors.town] },
    reservoirs: { symbol: 'fill', colors: [colors.reservoirs] },
    official: { symbol: 'dashed', colors: [colors.official] },
  }
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits })
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

function roadsKm(roads: AffectedRoad[]): number {
  return roads.reduce((sum, road) => sum + road.km_inside, 0)
}

function roadsDescription(roads: AffectedRoad[]): string {
  if (roads.length === 0) {
    return t.kpis.roadsNone
  }
  const names = roads.slice(0, LISTED_ROADS).map((road) => road.ref ?? road.name ?? t.kpis.unnamedRoad)
  const more = roads.length - names.length
  return more > 0 ? t.kpis.roadsMore(names.join(', '), more) : names.join(', ')
}

function townsWhere(report: FireReport, inside: boolean) {
  return report.affected.towns.filter((town) => town.inside === inside)
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
  ]
}

export function buildRoadsKpi(roads: AffectedRoad[]): Kpi {
  return {
    id: 'roads',
    title: t.kpis.roads,
    value: formatNumber(roadsKm(roads), 1),
    unit: t.kpis.km,
    description: roadsDescription(roads),
  }
}

export function buildFireZones(report: FireReport): FireZone[] {
  return report.activeFire.fronts
    .filter((front) => front.lengthKm >= MIN_LIST_FRONT_KM)
    .sort((first, second) => second.lengthKm - first.lengthKm)
    .map((front, index) => {
      const polygons = front.geometry.type === 'Polygon' ? [front.geometry.coordinates] : front.geometry.coordinates
      const first = polygons[0][0][0]
      let west = first[0]
      let east = first[0]
      let south = first[1]
      let north = first[1]
      for (const polygon of polygons) {
        for (const ring of polygon) {
          for (const [lng, lat] of ring) {
            west = Math.min(west, lng)
            east = Math.max(east, lng)
            south = Math.min(south, lat)
            north = Math.max(north, lat)
          }
        }
      }
      return {
        id: front.id,
        rank: index + 1,
        length: t.fireZones.length(formatNumber(front.lengthKm, 1)),
        detail: t.fireZones.detail(formatNumber(front.areaHa, 1)),
        bounds: [[west, south], [east, north]],
      }
    })
}

export function buildLegend(
  report: FireReport,
  roads: AffectedRoad[],
  visibleLayers: Record<MapLayerId, boolean>,
  colors: MapColors,
) {
  const symbols = buildLayerSymbols(colors)
  const classes = burnedClasses(report)
  const totalHa = classes.reduce((sum, item) => sum + item.areaHa, 0)
  const severity: LegendItem[] = visibleLayers.severity
    ? classes.map((item) => ({
        id: `severity-${item.class}`,
        label: t.severity.classes[item.class],
        detail: t.legend.hectares(formatNumber(item.areaHa)),
        symbol: 'fill',
        colors: [colors.severity[item.class]],
        share: item.areaHa / totalHa,
      }))
    : []
  const details: Record<Exclude<MapLayerId, 'severity'>, string | null> = {
    burned: t.legend.hectares(formatNumber(report.burned.areaHa)),
    fire: t.legend.front(formatNumber(report.activeFire.totalLengthKm, 1)),
    roads: t.legend.kilometres(formatNumber(roadsKm(roads), 1)),
    townsInside: t.legend.towns(townsWhere(report, true).length),
    townsNearby: t.legend.towns(townsWhere(report, false).length),
    reservoirs: null,
    official: report.validation && t.legend.hectares(formatNumber(report.validation.officialAreaHa)),
  }
  const hasData: Record<keyof typeof details, boolean> = {
    burned: true,
    fire: report.activeFire.fronts.length > 0,
    roads: roads.length > 0,
    townsInside: townsWhere(report, true).length > 0,
    townsNearby: townsWhere(report, false).length > 0,
    reservoirs: report.affected.reservoirs.length > 0,
    official: report.validation !== null,
  }
  const layers: LegendItem[] = (Object.keys(details) as (keyof typeof details)[])
    .filter((layer) => visibleLayers[layer] && hasData[layer])
    .map((layer) => ({
      id: layer,
      label: t.map.layerNames[layer],
      detail: details[layer],
      symbol: symbols[layer].symbol,
      colors: symbols[layer].colors,
      share: null,
    }))
  return { severity, layers }
}

function collection(geometries: Geometry[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })),
  }
}

export function buildMapData(report: FireReport, colors: MapColors) {
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
        color: colors.severity[item.class],
        data: collection([item.geometry as Geometry]),
      })),
    burned: collection([report.burned.perimeter]),
    fire: collection(report.activeFire.fronts.map((front) => front.geometry)),
    reservoirs: collection(report.affected.reservoirs.map((reservoir) => reservoir.geometry)),
    official: report.validation && collection([report.validation.officialPerimeter]),
    townsInside: townsWhere(report, true).map((town) => ({ name: town.name, coordinates: town.coordinates })),
    townsNearby: townsWhere(report, false).map((town) => ({ name: town.name, coordinates: town.coordinates })),
  }
}

function compassPoint(deg: number): string {
  return t.weather.directions[Math.round(deg / COMPASS_SECTOR_DEG) % t.weather.directions.length]
}

export type RoadProperties = { index: number }

export function buildRoadsMapData(roads: AffectedRoad[]): FeatureCollection<MultiLineString, RoadProperties> {
  return {
    type: 'FeatureCollection',
    features: roads.map((road, index) => ({ type: 'Feature', properties: { index }, geometry: road.geometry })),
  }
}

export function buildWeatherSummary(weather: Weather): WeatherSummary {
  return {
    towardsDeg: weather.wind_towards_deg,
    windFrom: t.weather.windFrom(compassPoint(weather.wind_from_deg)),
    windSpeed: t.weather.speed(formatNumber(weather.mean_wind_kmh)),
    gusts: t.weather.speed(formatNumber(weather.max_gust_kmh)),
    maxTemperature: t.weather.temperature(formatNumber(weather.max_temperature_c)),
    minHumidity: t.weather.humidity(formatNumber(weather.min_relative_humidity_pct)),
    rain:
      weather.total_precipitation_mm > 0
        ? t.weather.rainAmount(formatNumber(weather.total_precipitation_mm, 1))
        : t.weather.noRain,
  }
}
