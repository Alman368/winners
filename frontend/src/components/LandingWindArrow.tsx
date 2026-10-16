import { cn } from 'cn'

import { MapMarker, MarkerContent } from '@/components/ui/map'
import type { LngLat } from '@/types/fireReport'

type LandingWindArrowProps = {
  center: LngLat
  towardsDeg: number
  label: string
  isShown: boolean
}

const fade = 'pointer-events-none transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]'

/** A wind arrow lying flat on the terrain, so it tilts and turns with the camera, with its speed floating above. */
export function LandingWindArrow({ center, towardsDeg, label, isShown }: LandingWindArrowProps) {
  const visibility = cn(fade, isShown ? 'opacity-100' : 'opacity-0')

  return (
    <>
      <MapMarker longitude={center[0]} latitude={center[1]} pitchAlignment="map" rotationAlignment="map" rotation={towardsDeg}>
        <MarkerContent className={visibility}>
          <svg viewBox="0 0 64 160" className="h-48 w-20 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]" aria-hidden="true">
            <path d="M32 0 L62 48 L42 44 L42 160 L22 160 L22 44 L2 48 Z" fill="white" fillOpacity="0.85" />
          </svg>
        </MarkerContent>
      </MapMarker>
      <MapMarker longitude={center[0]} latitude={center[1]} offset={[0, -112]}>
        <MarkerContent className={visibility}>
          <span className="rounded-full bg-black/70 px-3 py-1 text-sm font-semibold whitespace-nowrap text-white backdrop-blur">
            {label}
          </span>
        </MarkerContent>
      </MapMarker>
    </>
  )
}
