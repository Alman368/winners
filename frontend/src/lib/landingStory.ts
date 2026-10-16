import type { Map as MapLibreMap } from 'maplibre-gl'

import type { LngLat } from '@/types/fireReport'

export type LayerGroup =
  | 'trueColor'
  | 'swir'
  | 'firstDay'
  | 'severity'
  | 'burned'
  | 'fire'
  | 'wind'
  | 'roads'
  | 'towns'
  | 'reservoirs'
  | 'official'

export type StoryChapterId =
  | 'hero'
  | 'avilaPlace'
  | 'avilaInfrared'
  | 'avilaAdvance'
  | 'avilaBurned'
  | 'avilaSeverity'
  | 'avilaFire'
  | 'avilaWind'
  | 'avilaRoads'
  | 'avilaTowns'
  | 'avilaFinal'
  | 'nieblaArrive'
  | 'nieblaDetail'
  | 'mierlaArrive'
  | 'mierlaDetail'

type StoryChapter = {
  id: StoryChapterId
  fireId: string | null
  /** Zoom relative to the zoom that fits the burned perimeter. */
  zoom: number
  pitch: number
  bearing: number
  layers: Partial<Record<LayerGroup, number>>
}

export type Camera = {
  center: LngLat
  zoom: number
  pitch: number
  bearing: number
}

const scene = { trueColor: 1, burned: 1 }

export const storyChapters: StoryChapter[] = [
  { id: 'hero', fireId: null, zoom: 0, pitch: 0, bearing: 0, layers: {} },
  { id: 'avilaPlace', fireId: 'avila', zoom: -1.6, pitch: 35, bearing: 0, layers: { trueColor: 1 } },
  { id: 'avilaInfrared', fireId: 'avila', zoom: -0.6, pitch: 45, bearing: -10, layers: { swir: 1 } },
  { id: 'avilaAdvance', fireId: 'avila', zoom: -0.3, pitch: 50, bearing: -20, layers: { firstDay: 1 } },
  { id: 'avilaBurned', fireId: 'avila', zoom: 0, pitch: 55, bearing: -25, layers: scene },
  { id: 'avilaSeverity', fireId: 'avila', zoom: 0.2, pitch: 58, bearing: -35, layers: { ...scene, severity: 1 } },
  { id: 'avilaFire', fireId: 'avila', zoom: 0.5, pitch: 62, bearing: -45, layers: { ...scene, fire: 1 } },
  { id: 'avilaWind', fireId: 'avila', zoom: 0.2, pitch: 64, bearing: -60, layers: { ...scene, fire: 1, wind: 1 } },
  { id: 'avilaRoads', fireId: 'avila', zoom: 0.3, pitch: 58, bearing: -30, layers: { ...scene, roads: 1 } },
  { id: 'avilaTowns', fireId: 'avila', zoom: 0.5, pitch: 60, bearing: -10, layers: { ...scene, towns: 1, reservoirs: 1 } },
  { id: 'avilaFinal', fireId: 'avila', zoom: 0, pitch: 50, bearing: 0, layers: { ...scene, official: 1 } },
  { id: 'nieblaArrive', fireId: 'niebla', zoom: 0, pitch: 52, bearing: 20, layers: { ...scene, severity: 1 } },
  { id: 'nieblaDetail', fireId: 'niebla', zoom: 0.5, pitch: 62, bearing: 45, layers: { ...scene, fire: 1, wind: 1, roads: 1 } },
  { id: 'mierlaArrive', fireId: 'la-mierla', zoom: 0, pitch: 52, bearing: -20, layers: { ...scene, severity: 1 } },
  { id: 'mierlaDetail', fireId: 'la-mierla', zoom: 0.5, pitch: 62, bearing: -50, layers: { ...scene, fire: 1, wind: 1, towns: 1 } },
]

export const globeCamera: Camera = { center: [-32, 26], zoom: 1.5, pitch: 0, bearing: 0 }

const FIRE_PADDING = 96
/** Zoom the camera rises to halfway between two fires, so the hop reads as a flight over Spain. */
const HOP_ZOOM = 5.5
/** Pitch the camera levels to halfway through a hop, so the terrain never opens onto the sky at low zoom. */
const HOP_PITCH = 20

export function buildStoryCameras(map: MapLibreMap, fireBounds: Record<string, [LngLat, LngLat]>): Camera[] {
  return storyChapters.map((chapter) => {
    if (chapter.fireId === null) {
      return globeCamera
    }
    const bounds = fireBounds[chapter.fireId]
    const [[west, south], [east, north]] = bounds
    const fitZoom = map.cameraForBounds(bounds, { padding: FIRE_PADDING })!.zoom!
    return {
      center: [(west + east) / 2, (south + north) / 2],
      zoom: fitZoom + chapter.zoom,
      pitch: chapter.pitch,
      bearing: chapter.bearing,
    }
  })
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Chapter the scroll is leaving and how far (eased) it is into the next one. */
function segmentAt(progress: number): { index: number; t: number } {
  const position = progress * (storyChapters.length - 1)
  const index = Math.min(Math.floor(position), storyChapters.length - 2)
  return { index, t: smoothstep(position - index) }
}

export function cameraAt(cameras: Camera[], progress: number): Camera {
  const { index, t } = segmentAt(progress)
  const from = cameras[index]
  const to = cameras[index + 1]
  const fromFire = storyChapters[index].fireId
  const toFire = storyChapters[index + 1].fireId
  const hops = fromFire !== null && toFire !== null && fromFire !== toFire
  const control = 2 * HOP_ZOOM - (from.zoom + to.zoom) / 2
  return {
    center: [lerp(from.center[0], to.center[0], t), lerp(from.center[1], to.center[1], t)],
    zoom: hops ? (1 - t) ** 2 * from.zoom + 2 * t * (1 - t) * control + t ** 2 * to.zoom : lerp(from.zoom, to.zoom, t),
    pitch: hops ? (1 - t) ** 2 * from.pitch + 2 * t * (1 - t) * (2 * HOP_PITCH - (from.pitch + to.pitch) / 2) + t ** 2 * to.pitch : lerp(from.pitch, to.pitch, t),
    bearing: lerp(from.bearing, to.bearing, t),
  }
}

function chapterOpacity(chapter: StoryChapter, fireId: string, group: LayerGroup): number {
  return chapter.fireId === fireId ? (chapter.layers[group] ?? 0) : 0
}

/** Layers fade in and out with the scroll instead of popping when a chapter starts. */
export function groupOpacityAt(progress: number, fireId: string, group: LayerGroup): number {
  const { index, t } = segmentAt(progress)
  return lerp(chapterOpacity(storyChapters[index], fireId, group), chapterOpacity(storyChapters[index + 1], fireId, group), t)
}

export function chapterAt(progress: number): number {
  return Math.round(progress * (storyChapters.length - 1))
}

export function isGroupShown(chapter: number, fireId: string, group: LayerGroup): boolean {
  return chapterOpacity(storyChapters[chapter], fireId, group) > 0
}
