import { MapGeoJSON, MapImage } from '@/components/ui/map'
import type { LandingFireView } from '@/hooks/useLandingFire'
import type { StoryPaints } from '@/lib/landingMap'

type LandingFireLayersProps = {
  fire: LandingFireView
  paints: StoryPaints
}

/** Every layer of one fire, invisible until the scroll fades it in. */
export function LandingFireLayers({ fire, paints }: LandingFireLayersProps) {
  const { id, images, mapData, context } = fire

  return (
    <>
      {images.firstDay && <MapImage id={`${id}-firstDay`} url={images.firstDay.url} coordinates={images.firstDay.coordinates} opacity={0} />}
      {images.swir && <MapImage id={`${id}-swir`} url={images.swir.url} coordinates={images.swir.coordinates} opacity={0} />}
      {images.trueColor && (
        <MapImage id={`${id}-trueColor`} url={images.trueColor.url} coordinates={images.trueColor.coordinates} opacity={0} />
      )}
      {mapData.severity.map((layer) => (
        <MapGeoJSON
          key={layer.id}
          id={`${id}-severity-${layer.id}`}
          data={layer.data}
          fillPaint={paints.severity[layer.id]}
          linePaint={false}
        />
      ))}
      {mapData.reservoirs.features.length > 0 && (
        <MapGeoJSON id={`${id}-reservoirs`} data={mapData.reservoirs} fillPaint={paints.reservoirsFill} linePaint={paints.reservoirsLine} />
      )}
      {context && (
        <>
          <MapGeoJSON id={`${id}-roads-glow`} data={context.roads} fillPaint={false} linePaint={paints.roadsGlow} />
          <MapGeoJSON id={`${id}-roads`} data={context.roads} fillPaint={false} linePaint={paints.roads} />
        </>
      )}
      <MapGeoJSON id={`${id}-burned`} data={mapData.burned} fillPaint={false} linePaint={paints.burned} />
      {mapData.official && <MapGeoJSON id={`${id}-official`} data={mapData.official} fillPaint={false} linePaint={paints.official} />}
      <MapGeoJSON id={`${id}-fire-glow`} data={mapData.fire} fillPaint={false} linePaint={paints.fireGlow} />
      <MapGeoJSON id={`${id}-fire`} data={mapData.fire} fillPaint={paints.fireFill} linePaint={paints.fireLine} />
      {context && <MapGeoJSON id={`${id}-wind`} data={context.streamlines} fillPaint={false} linePaint={paints.wind} />}
    </>
  )
}
