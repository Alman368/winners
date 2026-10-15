import type { FeatureCollection, Geometry } from 'geojson'
import type { StyleSpecification } from 'maplibre-gl'

import type { ChartCard3Datum } from '@/components/chart-card3'
import { t } from '@/i18n'
import { palette } from '@/lib/palette'
import type { Composite, FireReport, LandCover, MapLayerId, SeverityClass } from '@/types/fireReport'

export type Kpi = {
  id: string
  title: string
  value: string
  unit: string
  description: string
}

export type AffectedRow = {
  id: string
  name: string
  type: string
  situation: string
  detail: string
  official: 'confirmed' | 'not_confirmed' | null
}

const SEVERE_CLASSES: SeverityClass[] = ['moderada_alta', 'alta']
const MIN_LAND_COVER_PCT = 1
const MIN_NEARBY_POPULATION = 500
const EDGE_KM = 0.1

export const mapLayerSwatches = {
  burned: palette.carbon,
  fire: palette.red9,
  towns: palette.blue9,
  reservoirs: palette.blue9,
  official: palette.gray11,
}

export type LegendItem = {
  id: string
  label: string
  color: string
}

export function buildLegend(report: FireReport, visibleLayers: Record<MapLayerId, boolean>): LegendItem[] {
  const severity = visibleLayers.severity
    ? report.severity.classes
        .filter((item) => item.class !== 'sin_quemar')
        .map((item) => ({ id: `severity-${item.class}`, label: t.severity.classes[item.class], color: severityColors[item.class] }))
    : []
  const layers = (Object.keys(mapLayerSwatches) as (keyof typeof mapLayerSwatches)[])
    .filter((layer) => visibleLayers[layer])
    .map((layer) => ({ id: layer, label: t.map.layerNames[layer], color: mapLayerSwatches[layer] }))
  return [...severity, ...layers]
}

export const severityColors: Record<SeverityClass, string> = {
  sin_quemar: palette.green9,
  baja: palette.amber11,
  moderada_baja: palette.red9,
  moderada_alta: palette.pink11,
  alta: palette.purple11,
}

const severityChartVars: Record<SeverityClass, string> = {
  sin_quemar: 'var(--chart-5)',
  baja: 'var(--chart-1)',
  moderada_baja: 'var(--chart-2)',
  moderada_alta: 'var(--chart-3)',
  alta: 'var(--chart-4)',
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatPasses(report: FireReport): string {
  return report.scene.passes
    .map((pass) => {
      const time = new Date(pass.acquiredAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      return `${pass.platform} ${time} UTC`
    })
    .join(' + ')
}

function burnedSeverityHa(report: FireReport): number {
  return report.severity.classes.filter((item) => item.class !== 'sin_quemar').reduce((sum, item) => sum + item.areaHa, 0)
}

function severeHa(report: FireReport): number {
  return report.severity.classes.filter((item) => SEVERE_CLASSES.includes(item.class)).reduce((sum, item) => sum + item.areaHa, 0)
}

function severeSharePct(report: FireReport): number {
  const total = report.severity.classes.reduce((sum, item) => sum + item.areaHa, 0)
  return (severeHa(report) / total) * 100
}

function townsInside(report: FireReport) {
  return report.affected.towns.filter((town) => town.inside)
}

function roadsKm(report: FireReport): number {
  return report.affected.roads.reduce((sum, road) => sum + road.kmInside, 0)
}

export function buildMeta(report: FireReport): { scene: string; location: string } {
  return {
    scene: t.app.sceneMeta(formatDate(report.scene.date), formatPasses(report)),
    location: t.app.locationVerified(report.scene.georeferenceInliers),
  }
}

export function buildSummary(report: FireReport): string {
  const towns = townsInside(report).length
  const roads = roadsKm(report)
  const roadsText = formatNumber(roads, 1)
  const inside =
    towns > 0 && roads > 0
      ? t.summary.townsAndRoads(towns, roadsText)
      : towns > 0
        ? t.summary.townsOnly(towns)
        : roads > 0
          ? t.summary.roadsOnly(roadsText)
          : t.summary.nothingInside
  return [
    t.summary.burned(formatDate(report.scene.date), report.name, formatNumber(report.burned.areaHa)),
    t.summary.severity(formatNumber(severeSharePct(report))),
    inside,
  ].join(' ')
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
      description: t.kpis.fireDescription(report.activeFire.fronts.length),
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

export function buildSeverityChart(report: FireReport): { description: string; data: ChartCard3Datum[]; footer: string[] } {
  const unburned = report.severity.classes.find((item) => item.class === 'sin_quemar')
  const total = burnedSeverityHa(report) + (unburned ? unburned.areaHa : 0)
  return {
    description: t.severity.description(formatDate(report.severity.preFireDate), formatDate(report.scene.date)),
    data: report.severity.classes
      .filter((item) => item.class !== 'sin_quemar')
      .map((item) => ({ label: t.severity.classes[item.class], value: item.areaHa, fill: severityChartVars[item.class] })),
    footer: unburned ? [t.severity.footer(formatNumber((unburned.areaHa / total) * 100))] : [],
  }
}

export function buildLandCoverChart(report: FireReport): { data: ChartCard3Datum[]; footer: string[] } {
  return {
    data: (Object.entries(report.environment.landCoverPct) as [LandCover, number][])
      .filter(([, pct]) => pct >= MIN_LAND_COVER_PCT)
      .sort(([, a], [, b]) => b - a)
      .map(([type, pct]) => ({ label: t.environment.landCover[type], value: Math.round(pct), fill: 'var(--muted-foreground)' })),
    footer: [
      t.environment.natura(formatNumber(report.environment.natura2000Pct)),
      t.environment.recurrence(formatNumber(report.environment.recurrencePct)),
    ],
  }
}

export function buildAffectedRows(report: FireReport): AffectedRow[] {
  const relevantTowns = report.affected.towns
    .filter((town) => town.inside || (town.population !== null && town.population >= MIN_NEARBY_POPULATION))
    .sort((a, b) => Number(b.inside && b.confirmedOfficial) - Number(a.inside && a.confirmedOfficial) || Number(b.inside) - Number(a.inside) || a.distanceKm - b.distanceKm)
  const towns = relevantTowns.map<AffectedRow>((town) => ({
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
  }))
  const roads = report.affected.roads.map<AffectedRow>((road) => ({
    id: `road-${road.name}`,
    name: road.name,
    type: t.affected.types.road,
    situation: t.affected.inside,
    detail: t.affected.kmInside(formatNumber(road.kmInside, 1)),
    official: null,
  }))
  const reservoirs = report.affected.reservoirs.map<AffectedRow>((reservoir, index) => ({
    id: `reservoir-${index}`,
    name: t.affected.reservoirName(formatNumber(reservoir.areaHa)),
    type: t.affected.types.reservoir,
    situation: reservoir.touches ? t.affected.edge : t.affected.near(formatNumber(reservoir.distanceKm, 1)),
    detail: t.affected.notApplicable,
    official: null,
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
  const severityClasses = report.severity.classes.filter((item) => item.class !== 'sin_quemar' && item.geometry)
  return {
    bounds: [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]],
    severity: severityClasses.map((item) => ({
      id: item.class,
      color: severityColors[item.class],
      data: collection([item.geometry as Geometry]),
    })),
    burned: collection([report.burned.perimeter]),
    fire: collection(report.activeFire.fronts.map((front) => front.geometry)),
    reservoirs: collection(report.affected.reservoirs.map((reservoir) => reservoir.geometry)),
    official: collection([report.validation.officialPerimeter]),
    towns: report.affected.towns.filter((town) => town.inside),
  }
}

export function buildMapStyle(basemap: StyleSpecification, report: FireReport, composite: Composite): StyleSpecification {
  const firstLabelIndex = basemap.layers.findIndex((layer) => layer.type === 'symbol')
  return {
    ...basemap,
    sources: {
      ...basemap.sources,
      scene: {
        type: 'image',
        url: report.scene.imageUrls[composite] as string,
        coordinates: report.scene.corners,
      },
    },
    layers: [
      ...basemap.layers.slice(0, firstLabelIndex),
      { id: 'scene', type: 'raster', source: 'scene' },
      ...basemap.layers.slice(firstLabelIndex),
    ],
  }
}
