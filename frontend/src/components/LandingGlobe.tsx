import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { Ref } from 'react'

import { LandingFireLayers } from '@/components/LandingFireLayers'
import { LandingFireMarkers } from '@/components/LandingFireMarkers'
import { LandingWindArrow } from '@/components/LandingWindArrow'
import { Map } from '@/components/ui/map'
import type { LandingFireView } from '@/hooks/useLandingFire'
import type { StoryPaints } from '@/lib/landingMap'
import type { Camera } from '@/lib/landingStory'

const globeProjection = { type: 'globe' } as const
const MAX_PITCH = 70
/** Keeps every tile of the three fires and the flights between them, so scrolling back never shows gaps. */
const TILE_CACHE_SIZE = 1500

type LandingGlobeProps = {
  mapRef: Ref<MapLibreMap>
  basemap: StyleSpecification
  initialCamera: Camera
  paints: StoryPaints
  fires: { view: LandingFireView; shown: { fire: boolean; roads: boolean; towns: boolean; wind: boolean } }[]
}

export function LandingGlobe({ mapRef, basemap, initialCamera, paints, fires }: LandingGlobeProps) {
  return (
    <Map
      ref={mapRef}
      theme="dark"
      styles={{ dark: basemap }}
      projection={globeProjection}
      center={initialCamera.center}
      zoom={initialCamera.zoom}
      pitch={initialCamera.pitch}
      bearing={initialCamera.bearing}
      maxPitch={MAX_PITCH}
      maxTileCacheSize={TILE_CACHE_SIZE}
      interactive={false}
      attributionControl={false}
    >
      {fires.map(({ view }) => (
        <LandingFireLayers key={view.id} fire={view} paints={paints} />
      ))}
      {fires.map(({ view, shown }) => (
        <LandingFireMarkers key={view.id} fire={view} shown={shown} />
      ))}
      {fires.map(
        ({ view, shown }) =>
          view.context && (
            <LandingWindArrow
              key={view.id}
              center={view.center}
              towardsDeg={view.context.weather.towardsDeg}
              label={view.context.windLabel}
              isShown={shown.wind}
            />
          ),
      )}
    </Map>
  )
}
