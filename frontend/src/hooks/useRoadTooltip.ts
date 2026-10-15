import { useState } from 'react'

import type { MapGeoJSONEvent } from '@/components/ui/map'
import { t } from '@/i18n'
import { formatNumber, type RoadProperties } from '@/lib/fireReport'
import type { AffectedRoad, KilometrePoint } from '@/types/analysis'
import type { LngLat } from '@/types/fireReport'

type RoadHover = {
  index: number
  lngLat: LngLat
  x: number
  y: number
}

/** Interpolates between the nearest kilometre point and the nearest one with another km, by straight-line distance. */
function kilometreAt(points: KilometrePoint[], [lng, lat]: LngLat): number | null {
  const lngScale = Math.cos((lat * Math.PI) / 180)
  const distance = (point: KilometrePoint) => Math.hypot((point.lonlat[0] - lng) * lngScale, point.lonlat[1] - lat)
  const [nearest, ...rest] = [...points].sort((a, b) => distance(a) - distance(b))
  if (!nearest) {
    return null
  }
  const neighbour = rest.find((point) => point.km !== nearest.km)
  if (!neighbour) {
    return nearest.km
  }
  const share = distance(nearest) / (distance(nearest) + distance(neighbour))
  return nearest.km + (neighbour.km - nearest.km) * share
}

export function useRoadTooltip(roads: AffectedRoad[]) {
  const [hover, setHover] = useState<RoadHover | null>(null)

  const onHover = (event: MapGeoJSONEvent<RoadProperties> | null) => {
    setHover(
      event && {
        index: event.feature.properties.index,
        lngLat: [event.longitude, event.latitude],
        x: event.originalEvent.point.x,
        y: event.originalEvent.point.y,
      },
    )
  }

  const road = hover ? roads[hover.index] : undefined
  const kilometre = hover && road ? kilometreAt(road.kilometre_points, hover.lngLat) : null

  return {
    onHover,
    tooltip:
      hover && road
        ? {
            x: hover.x,
            y: hover.y,
            title: road.ref ?? road.name ?? t.kpis.unnamedRoad,
            subtitle: road.ref ? road.name : null,
            kilometre: kilometre === null ? null : t.map.roadKilometre(formatNumber(kilometre, 1)),
          }
        : null,
  }
}
