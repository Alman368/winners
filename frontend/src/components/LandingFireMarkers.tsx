import { cn } from 'cn'

import { MapMarker, MarkerContent } from '@/components/ui/map'
import type { LandingFireView } from '@/hooks/useLandingFire'

type LandingFireMarkersProps = {
  fire: LandingFireView
  shown: { fire: boolean; roads: boolean; towns: boolean }
}

const fade = 'transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]'

function visibility(isShown: boolean): string {
  return cn(fade, isShown ? 'opacity-100' : 'pointer-events-none opacity-0')
}

export function LandingFireMarkers({ fire, shown }: LandingFireMarkersProps) {
  return (
    <>
      {fire.zones.map((zone) => (
        <MapMarker key={zone.rank} longitude={zone.center[0]} latitude={zone.center[1]}>
          <MarkerContent className={cn('flex items-center gap-2', visibility(shown.fire))}>
            <span className="flex size-6 items-center justify-center rounded-full bg-[#e5484d] text-xs font-semibold text-white ring-2 ring-white">
              {zone.rank}
            </span>
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white backdrop-blur">
              {zone.label}
            </span>
          </MarkerContent>
        </MapMarker>
      ))}
      {fire.context &&
        fire.context.roadLabels.map((road, index) => (
          <MapMarker key={`${road.label}-${index}`} longitude={road.coordinates[0]} latitude={road.coordinates[1]}>
            <MarkerContent className={visibility(shown.roads)}>
              <span className="rounded-full border border-[#7ce2fe] bg-black/70 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-white backdrop-blur">
                {road.label}
              </span>
            </MarkerContent>
          </MapMarker>
        ))}
      {fire.towns.map((town, index) => (
        <MapMarker key={`${town.label}-${index}`} longitude={town.coordinates[0]} latitude={town.coordinates[1]}>
          <MarkerContent className={cn('group flex items-center gap-2', visibility(shown.towns))}>
            <span
              className={cn(
                'size-3 rounded-full ring-2 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-150',
                town.inside ? 'bg-[#e5484d] ring-white' : 'bg-white ring-black/60',
              )}
            />
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white backdrop-blur">
              {town.label}
            </span>
          </MarkerContent>
        </MapMarker>
      ))}
    </>
  )
}
