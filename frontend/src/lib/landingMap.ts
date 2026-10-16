import type { FeatureCollection, LineString } from 'geojson'
import type {
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  Map as MapLibreMap,
  PaddingOptions,
  StyleSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl'

import type { MapColors } from '@/lib/fireReport'
import { groupOpacityAt, type LayerGroup } from '@/lib/landingStory'
import { palette } from '@/lib/palette'
import type { LngLat } from '@/types/fireReport'

type FillPaint = NonNullable<FillLayerSpecification['paint']>
type LinePaint = NonNullable<LineLayerSpecification['paint']>
type SeverityKey = keyof MapColors['severity']

const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const TERRAIN_EXAGGERATION = 1.6
/** Average tone of the Iberian satellite imagery, shown while a tile is still loading instead of a black hole. */
const GROUND_COLOR = '#8a7a5c'
const spanishName: ExpressionSpecification = ['coalesce', ['get', 'name:es'], ['get', 'name']]

/** Satellite imagery draped over real relief, with only the place names of the Carto style on top. */
export function earthStyle(labels: StyleSpecification): StyleSpecification {
  return {
    version: 8,
    glyphs: labels.glyphs,
    sprite: labels.sprite,
    sources: {
      ...labels.sources,
      satellite: {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Esri, Maxar, Earthstar Geographics',
      },
      terrain: {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        tileSize: 256,
        maxzoom: 15,
        encoding: 'terrarium',
        attribution: 'Mapzen Terrain Tiles',
      },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': GROUND_COLOR } },
      { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-fade-duration': 0 } },
      ...labels.layers
        .filter((layer): layer is SymbolLayerSpecification => layer.id.startsWith('place_'))
        .map((layer) => ({ ...layer, layout: { ...layer.layout, 'text-field': spanishName } })),
    ],
    terrain: { source: 'terrain', exaggeration: TERRAIN_EXAGGERATION },
    sky: {
      'sky-color': '#4f86c6',
      'horizon-color': '#b9d1ea',
      'fog-color': '#dbe7f2',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.7,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 13, 0.6],
    },
    transition: { duration: 0, delay: 0 },
  }
}

const DESKTOP_MIN_WIDTH_PX = 640
/** Card width plus its side gutter on desktop. */
const DESKTOP_COPY_PX = 520
const MOBILE_COPY_SHARE = 0.45
const MOBILE_NAV_PX = 120

/** Keeps the globe and the fire clear of the copy: copy sits on the left on desktop and at the bottom on phones. */
export function copyPadding(width: number, height: number): PaddingOptions {
  return width >= DESKTOP_MIN_WIDTH_PX
    ? { top: 0, right: 0, bottom: 0, left: Math.min(DESKTOP_COPY_PX, width / 2) }
    : { top: MOBILE_NAV_PX, right: 0, bottom: height * MOBILE_COPY_SHARE, left: 0 }
}

const FEATHER_SHARE = 0.08

/** Fades the edges of a scene to transparent so it melts into the satellite basemap instead of showing a hard frame. */
export async function featherImage(url: string): Promise<string> {
  const image = new Image()
  image.src = url
  await image.decode()
  const { naturalWidth: width, naturalHeight: height } = image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  context.globalCompositeOperation = 'destination-in'
  const feather = Math.round(Math.min(width, height) * FEATHER_SHARE)
  const edges: [number, number, number, number][] = [
    [0, 0, feather, 0],
    [width, 0, width - feather, 0],
    [0, 0, 0, feather],
    [0, height, 0, height - feather],
  ]
  for (const [x0, y0, x1, y1] of edges) {
    const gradient = context.createLinearGradient(x0, y0, x1, y1)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((result) => resolve(result!), 'image/webp', 0.9))
  return URL.createObjectURL(blob)
}

const WIND_LINES = 11

/** Parallel streaks across the fire pointing where the wind pushed it. */
export function windStreamlines([[west, south], [east, north]]: [LngLat, LngLat], towardsDeg: number): FeatureCollection<LineString> {
  const center: LngLat = [(west + east) / 2, (south + north) / 2]
  const cosLat = Math.cos((center[1] * Math.PI) / 180)
  const halfSpan = Math.max((east - west) * cosLat, north - south) * 0.6
  const angle = (towardsDeg * Math.PI) / 180
  const direction = [Math.sin(angle), Math.cos(angle)]
  const across = [direction[1], -direction[0]]
  const toLngLat = (x: number, y: number): LngLat => [center[0] + x / cosLat, center[1] + y]
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: WIND_LINES }, (_, index) => {
      const offset = (index / (WIND_LINES - 1) - 0.5) * 2 * halfSpan
      const shift = (index % 3) * 0.15 * halfSpan
      const length = halfSpan * (0.6 + (index % 2) * 0.3)
      const midX = offset * across[0] + shift * direction[0]
      const midY = offset * across[1] + shift * direction[1]
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [-1, -0.5, 0, 0.5, 1].map((k) => toLngLat(midX + k * length * direction[0], midY + k * length * direction[1])),
        },
      }
    }),
  }
}

/** Dash patterns that, stepped in order, make the streaks look like they flow. */
export const windDashSteps: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
]

const MAX_OPACITY = {
  severity: 0.6,
  fireFill: 0.85,
  fireGlow: 0.8,
  roadsGlow: 0.5,
  reservoirsFill: 0.7,
  wind: 0.9,
}

/** Paint starts invisible: the scroll drives every opacity through applyStoryOpacity. */
export function buildStoryPaints(colors: MapColors) {
  const severityKeys = Object.keys(colors.severity) as SeverityKey[]
  return {
    severity: Object.fromEntries(
      severityKeys.map((key) => [key, { 'fill-color': colors.severity[key], 'fill-opacity': 0 }]),
    ) as Record<SeverityKey, FillPaint>,
    burned: { 'line-color': palette.white, 'line-width': 2, 'line-opacity': 0 } satisfies LinePaint,
    fireFill: { 'fill-color': colors.fire, 'fill-opacity': 0 } satisfies FillPaint,
    fireLine: { 'line-color': colors.fire, 'line-width': 1.5, 'line-opacity': 0 } satisfies LinePaint,
    fireGlow: { 'line-color': colors.fire, 'line-width': 16, 'line-blur': 12, 'line-opacity': 0 } satisfies LinePaint,
    wind: {
      'line-color': palette.white,
      'line-width': 3,
      'line-blur': 1,
      'line-dasharray': windDashSteps[0],
      'line-opacity': 0,
    } satisfies LinePaint,
    roads: { 'line-color': colors.roads, 'line-width': 3, 'line-opacity': 0 } satisfies LinePaint,
    roadsGlow: { 'line-color': colors.roads, 'line-width': 12, 'line-blur': 8, 'line-opacity': 0 } satisfies LinePaint,
    reservoirsFill: { 'fill-color': colors.reservoirs, 'fill-opacity': 0 } satisfies FillPaint,
    reservoirsLine: { 'line-color': colors.reservoirs, 'line-width': 2, 'line-opacity': 0 } satisfies LinePaint,
    official: { 'line-color': palette.amber9, 'line-width': 2.5, 'line-dasharray': [2, 2], 'line-opacity': 0 } satisfies LinePaint,
  }
}

export type StoryPaints = ReturnType<typeof buildStoryPaints>

export type StoryFireLayers = {
  id: string
  severityIds: string[]
}

type OpacityTarget = { layer: string; property: 'fill-opacity' | 'line-opacity' | 'raster-opacity'; max: number }

const fill = (id: string, max = 1): OpacityTarget => ({ layer: `geojson-fill-${id}`, property: 'fill-opacity', max })
const line = (id: string, max = 1): OpacityTarget => ({ layer: `geojson-line-${id}`, property: 'line-opacity', max })
const raster = (id: string): OpacityTarget => ({ layer: `image-layer-${id}`, property: 'raster-opacity', max: 1 })

function storyTargets({ id, severityIds }: StoryFireLayers): [LayerGroup, OpacityTarget[]][] {
  return [
    ['trueColor', [raster(`${id}-trueColor`)]],
    ['swir', [raster(`${id}-swir`)]],
    ['firstDay', [raster(`${id}-firstDay`)]],
    ['severity', severityIds.map((severity) => fill(`${id}-severity-${severity}`, MAX_OPACITY.severity))],
    ['burned', [line(`${id}-burned`)]],
    ['fire', [fill(`${id}-fire`, MAX_OPACITY.fireFill), line(`${id}-fire`), line(`${id}-fire-glow`, MAX_OPACITY.fireGlow)]],
    ['wind', [line(`${id}-wind`, MAX_OPACITY.wind)]],
    ['roads', [line(`${id}-roads`), line(`${id}-roads-glow`, MAX_OPACITY.roadsGlow)]],
    ['reservoirs', [fill(`${id}-reservoirs`, MAX_OPACITY.reservoirsFill), line(`${id}-reservoirs`)]],
    ['official', [line(`${id}-official`)]],
  ]
}

/** Runs every frame: targets not on the map yet are skipped, and unchanged values are left alone so the map does not repaint. */
export function applyStoryOpacity(map: MapLibreMap, fires: StoryFireLayers[], progress: number) {
  for (const fire of fires) {
    for (const [group, targets] of storyTargets(fire)) {
      const opacity = groupOpacityAt(progress, fire.id, group)
      for (const target of targets) {
        const value = opacity * target.max
        if (map.getLayer(target.layer) && map.getPaintProperty(target.layer, target.property) !== value) {
          map.setPaintProperty(target.layer, target.property, value)
        }
      }
    }
  }
}

export function applyWindDash(map: MapLibreMap, fireIds: string[], step: number) {
  for (const id of fireIds) {
    const layer = `geojson-line-${id}-wind`
    if (map.getLayer(layer)) {
      map.setPaintProperty(layer, 'line-dasharray', windDashSteps[step])
    }
  }
}
