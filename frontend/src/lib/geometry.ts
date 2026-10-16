import type { Position } from 'geojson'

import type { AreaGeometry, LngLat } from '@/types/fireReport'

const KM_PER_DEGREE_LAT = 110.57
const KM_PER_DEGREE_LNG_AT_EQUATOR = 111.32

function polygons(area: AreaGeometry): Position[][][] {
  return area.type === 'Polygon' ? [area.coordinates] : area.coordinates
}

function ringContains([lng, lat]: LngLat, ring: Position[]): boolean {
  let contains = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[previous]
    if (y1 > lat !== y2 > lat && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) {
      contains = !contains
    }
  }
  return contains
}

/** Inside the outer ring of some polygon and outside all of its holes. */
export function areaContains(point: LngLat, area: AreaGeometry): boolean {
  return polygons(area).some(([outer, ...holes]) => ringContains(point, outer) && !holes.some((hole) => ringContains(point, hole)))
}

/** Distance to the closest edge, on a flat projection centred on the point: accurate enough at a few kilometres. */
export function distanceToAreaKm([lng, lat]: LngLat, area: AreaGeometry): number {
  const kmPerDegreeLng = KM_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((lat * Math.PI) / 180)
  let closest = Infinity
  for (const polygon of polygons(area)) {
    for (const ring of polygon) {
      for (let index = 1; index < ring.length; index++) {
        const ax = (ring[index - 1][0] - lng) * kmPerDegreeLng
        const ay = (ring[index - 1][1] - lat) * KM_PER_DEGREE_LAT
        const bx = (ring[index][0] - lng) * kmPerDegreeLng
        const by = (ring[index][1] - lat) * KM_PER_DEGREE_LAT
        const dx = bx - ax
        const dy = by - ay
        const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)))
        closest = Math.min(closest, Math.hypot(ax + t * dx, ay + t * dy))
      }
    }
  }
  return closest
}
