import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchFireDays, fetchSceneAnalysis, fetchSceneContext } from '@/api/analysis'
import { baseFetchObjectUrl } from '@/api/client'
import { fetchFireReport } from '@/api/fireReports'
import { sceneImagePath } from '@/api/scenes'
import { applyAnalysis, isAnalysisInProgress } from '@/lib/analysis'
import type { DemoFire } from '@/lib/demoFires'
import {
  buildFireZones,
  buildKpis,
  buildMapData,
  buildRoadsKpi,
  buildRoadsMapData,
  buildWeatherSummary,
  formatNumber,
  geometryBounds,
  type MapColors,
  NEARBY_KM,
} from '@/lib/fireReport'
import { featherImage, windStreamlines } from '@/lib/landingMap'
import { bboxCorners, formatShortDate } from '@/lib/scenes'
import { t } from '@/i18n'
import { palette } from '@/lib/palette'
import type { AreaGeometry, LngLat, SeverityClass } from '@/types/fireReport'

const ANALYSIS_POLL_MS = 5000
const SHOWN_ZONES = 3
const SHOWN_NEARBY_TOWNS = 5
const SHOWN_ROADS = 4
const DAY_MS = 86_400_000

function boundsCenter([[west, south], [east, north]]: [LngLat, LngLat]): LngLat {
  return [(west + east) / 2, (south + north) / 2]
}

/** Share of the largest polygon's outline below which a burned patch is too small to steer the camera. */
const FRAMED_PATCH_SHARE = 0.1

/** Frames the camera on the large burned polygons, ignoring the small scattered patches around them. */
function framedBounds(perimeter: AreaGeometry): [LngLat, LngLat] {
  if (perimeter.type === 'Polygon') {
    return geometryBounds(perimeter)
  }
  const largest = Math.max(...perimeter.coordinates.map((polygon) => polygon[0].length))
  const coordinates = perimeter.coordinates.filter((polygon) => polygon[0].length >= largest * FRAMED_PATCH_SHARE)
  return geometryBounds({ type: 'MultiPolygon', coordinates })
}

function featheredQuery(path: string | null, fromApi: boolean) {
  return {
    queryKey: ['landing-feathered', path],
    queryFn: async () => featherImage(fromApi ? await baseFetchObjectUrl(path!) : path!),
    enabled: path !== null,
    staleTime: Infinity,
  }
}

export function useLandingFire(fire: DemoFire, colors: MapColors, withFirstDay: boolean) {
  const reportQuery = useQuery({
    queryKey: ['fire-report', fire.id],
    queryFn: () => fetchFireReport(fire.id),
    staleTime: Infinity,
  })
  const analysisQuery = useQuery({
    queryKey: ['fire-analysis', fire.sceneId],
    queryFn: () => fetchSceneAnalysis(fire.sceneId),
    staleTime: Infinity,
  })
  const contextQuery = useQuery({
    queryKey: ['fire-context', fire.sceneId],
    queryFn: () => fetchSceneContext(fire.sceneId),
    staleTime: Infinity,
    retry: false,
    refetchInterval: (query) => (query.state.data && isAnalysisInProgress(query.state.data) ? ANALYSIS_POLL_MS : false),
  })
  const fireDaysQuery = useQuery({
    queryKey: ['fire-days', fire.sceneId],
    queryFn: () => fetchFireDays(fire.sceneId),
    enabled: withFirstDay,
    staleTime: Infinity,
    retry: false,
    refetchInterval: (query) => (query.state.data && isAnalysisInProgress(query.state.data) ? ANALYSIS_POLL_MS : false),
  })

  const report = useMemo(
    () => (reportQuery.data && analysisQuery.data ? applyAnalysis(reportQuery.data, analysisQuery.data) : null),
    [reportQuery.data, analysisQuery.data],
  )
  const context = contextQuery.data && !isAnalysisInProgress(contextQuery.data) ? contextQuery.data : null
  const fireDays = fireDaysQuery.data && !isAnalysisInProgress(fireDaysQuery.data) ? fireDaysQuery.data : null
  const firstDayPath = report && fireDays ? sceneImagePath(report.scene.bbox, fireDays.first, 'true_color') : null

  const trueColorQuery = useQuery(featheredQuery(report ? report.scene.imageUrls.true_color : null, false))
  const swirQuery = useQuery(featheredQuery(report ? report.scene.imageUrls.swir : null, false))
  const firstDayQuery = useQuery(featheredQuery(firstDayPath, true))

  const base = useMemo(() => {
    if (!report) {
      return null
    }
    const mapData = buildMapData(report, colors)
    const bounds = framedBounds(report.burned.perimeter)
    const inside = report.affected.towns.filter((town) => town.inside)
    const outside = report.affected.towns.filter((town) => !town.inside && town.distanceKm <= NEARBY_KM)
    const nearby = outside
      .filter((town) => town.population !== null)
      .sort((first, second) => second.population! - first.population!)
      .slice(0, SHOWN_NEARBY_TOWNS)
    const [burned, severe, front] = buildKpis(report)
    const zones = buildFireZones(report).slice(0, SHOWN_ZONES)
    const severityClasses = report.severity.classes.filter(
      (item): item is typeof item & { class: Exclude<SeverityClass, 'sin_quemar'> } => item.class !== 'sin_quemar',
    )
    const severityTotalHa = severityClasses.reduce((sum, item) => sum + item.areaHa, 0)
    return {
      id: fire.id,
      place: `${fire.name}, ${fire.province}`,
      date: formatShortDate(report.scene.date),
      bounds,
      center: boundsCenter(bounds),
      mapData,
      severityIds: mapData.severity.map((layer) => layer.id),
      zones: zones.map((zone) => ({ rank: zone.rank, label: zone.length, center: boundsCenter(zone.bounds) })),
      zoneRows: zones.map((zone) => ({ label: t.landing.map.zone(zone.rank), value: zone.length, color: colors.fire, share: null })),
      severityRows: severityClasses.map((item) => ({
        label: t.severity.classes[item.class],
        value: t.legend.hectares(formatNumber(item.areaHa)),
        color: colors.severity[item.class],
        share: item.areaHa / severityTotalHa,
      })),
      towns: [...inside, ...nearby].map((town) => ({
        label: town.inside ? town.name : t.landing.map.townDistance(town.name, formatNumber(town.distanceKm, 1)),
        inside: town.inside,
        coordinates: town.coordinates,
      })),
      townsInside: inside.length,
      townRows: [
        { label: t.landing.chapters.avilaTowns.inside, value: String(inside.length), color: palette.red9, share: null },
        {
          label: t.landing.chapters.avilaTowns.nearby(formatNumber(NEARBY_KM)),
          value: String(outside.length),
          color: palette.white,
          share: null,
        },
      ],
      kpis: { burned, severe, front, perimeterKm: formatNumber(report.burned.perimeterKm) },
      final: report.validation && {
        differenceHa: report.validation.officialAreaHa - report.burned.areaHa,
        rows: [
          {
            label: t.landing.chapters.avilaFinal.snapshot(formatShortDate(report.scene.date)),
            value: t.legend.hectares(formatNumber(report.burned.areaHa)),
            color: palette.white,
            share: null,
          },
          {
            label: t.landing.chapters.avilaFinal.official,
            value: t.legend.hectares(formatNumber(report.validation.officialAreaHa)),
            color: palette.amber9,
            share: null,
          },
        ],
      },
      sceneDate: report.scene.date,
      sceneImage: report.scene.imageUrls.true_color,
      sceneCorners: report.scene.corners,
      sceneBboxCorners: bboxCorners(report.scene.bbox),
    }
  }, [report, colors, fire])

  const contextView = useMemo(() => {
    if (!base || !context) {
      return null
    }
    const weather = buildWeatherSummary(context.weather)
    const named = context.roads
      .filter((road) => road.ref ?? road.name)
      .sort((first, second) => second.km_inside - first.km_inside)
      .slice(0, SHOWN_ROADS)
    return {
      roads: buildRoadsMapData(context.roads),
      roadLabels: named.map((road) => {
        const line = road.geometry.coordinates[0]
        return {
          label: t.landing.map.road((road.ref ?? road.name)!, formatNumber(road.km_inside, 1)),
          coordinates: line[Math.floor(line.length / 2)] as LngLat,
        }
      }),
      roadsKpi: buildRoadsKpi(context.roads),
      roadRows: named.map((road) => ({
        label: (road.ref ?? road.name)!,
        value: t.legend.kilometres(formatNumber(road.km_inside, 1)),
        color: colors.roads,
        share: null,
      })),
      weather,
      windLabel: t.landing.map.wind(weather.windFrom, weather.windSpeed),
      streamlines: windStreamlines(base.bounds, context.weather.wind_towards_deg),
    }
  }, [base, context, colors])

  if (!base) {
    return null
  }
  return {
    ...base,
    context: contextView,
    firstDay: fireDays && {
      date: formatShortDate(fireDays.first),
      daysToScene: Math.round((Date.parse(base.sceneDate) - Date.parse(fireDays.first)) / DAY_MS),
    },
    images: {
      trueColor: trueColorQuery.data ? { url: trueColorQuery.data, coordinates: base.sceneCorners } : null,
      swir: swirQuery.data ? { url: swirQuery.data, coordinates: base.sceneCorners } : null,
      firstDay: firstDayQuery.data ? { url: firstDayQuery.data, coordinates: base.sceneBboxCorners } : null,
    },
  }
}

export type LandingFireView = NonNullable<ReturnType<typeof useLandingFire>>
