import compasWordmark from '@/assets/compas-wordmark.svg'

import { CompositeToggle } from '@/components/CompositeToggle'
import { LegendSymbolMark } from '@/components/LegendSymbolMark'
import { MapLayersPopover } from '@/components/MapLayersPopover'
import { MapLegend } from '@/components/MapLegend'
import { StatsCard1 } from '@/components/stats-card1'
import { Map, MapControls, MapGeoJSON, MapImage, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { mapLayerOrder, useFireReportPage } from '@/hooks/useFireReportPage'
import { t } from '@/i18n'
import { layerSymbols, mapColors } from '@/lib/fireReport'
import { palette } from '@/lib/palette'

export function FireReportPage() {
  const page = useFireReportPage()
  const { view } = page

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <main className="relative h-[60vh] min-w-0 flex-1 lg:h-full">
        {page.isLoading && <Skeleton className="size-full rounded-none" />}
        {view && page.basemap && (
          <>
            <Map
              key={view.report.id}
              theme="light"
              styles={{ light: page.basemap }}
              bounds={view.mapData.bounds}
              fitBoundsOptions={{ padding: 24 }}
            >
              <MapControls position="bottom-right" showCompass showFullscreen />
              {page.sceneImages.map((image) => (
                <MapImage
                  key={image.id}
                  id={image.id}
                  url={image.url}
                  coordinates={image.coordinates}
                  opacity={image.opacity}
                />
              ))}
              {page.visibleLayers.severity &&
                view.mapData.severity.map((layer) => (
                  <MapGeoJSON
                    key={layer.id}
                    id={`severity-${layer.id}`}
                    data={layer.data}
                    fillPaint={{ 'fill-color': layer.color, 'fill-opacity': 0.45 }}
                    linePaint={false}
                  />
                ))}
              {page.visibleLayers.reservoirs && (
                <MapGeoJSON
                  id="reservoirs"
                  data={view.mapData.reservoirs}
                  fillPaint={{ 'fill-color': mapColors.reservoirs, 'fill-opacity': 0.7 }}
                  linePaint={{ 'line-color': palette.white, 'line-width': 1.5 }}
                />
              )}
              {page.visibleLayers.official && (
                <MapGeoJSON
                  id="official"
                  data={view.mapData.official}
                  fillPaint={false}
                  linePaint={{ 'line-color': mapColors.official, 'line-width': 2, 'line-dasharray': [2, 2] }}
                />
              )}
              {page.visibleLayers.burned && (
                <MapGeoJSON
                  id="burned"
                  data={view.mapData.burned}
                  fillPaint={false}
                  linePaint={{ 'line-color': mapColors.burned, 'line-width': 2.5 }}
                />
              )}
              {page.visibleLayers.fire && (
                <MapGeoJSON
                  id="fire"
                  data={view.mapData.fire}
                  fillPaint={{ 'fill-color': mapColors.fire, 'fill-opacity': 1 }}
                  linePaint={{ 'line-color': palette.white, 'line-width': 1.5 }}
                />
              )}
              {page.visibleLayers.towns &&
                view.mapData.towns.map((town) => (
                  <MapMarker key={town.name} longitude={town.coordinates[0]} latitude={town.coordinates[1]}>
                    <MarkerContent>
                      <LegendSymbolMark symbol={layerSymbols.towns.symbol} colors={layerSymbols.towns.colors} />
                      <MarkerLabel className="rounded bg-card/90 px-1 py-px shadow-sm">{town.name}</MarkerLabel>
                    </MarkerContent>
                  </MapMarker>
                ))}
            </Map>

            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <div className="flex flex-col items-start gap-2">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl bg-card/95 p-1 shadow-sm ring-1 ring-foreground/10 backdrop-blur">
                  <CompositeToggle composites={page.composites} value={page.composite} onChange={page.setComposite} />
                </div>
              </div>
              <div className="pointer-events-auto">
                <MapLayersPopover
                  layers={mapLayerOrder}
                  visibleLayers={page.visibleLayers}
                  onLayerVisibleChange={page.setLayerVisible}
                />
              </div>
            </div>

            {page.legend && (
              <div className="absolute bottom-3 left-3">
                <MapLegend
                  severity={page.legend.severity}
                  layers={page.legend.layers}
                />
              </div>
            )}
          </>
        )}
      </main>

      <aside
        aria-label={t.app.panel}
        className="flex min-h-0 flex-1 flex-col border-t bg-background lg:w-[480px] lg:flex-none lg:border-t-0 lg:border-l"
      >
        <header className="flex flex-col gap-3 border-b bg-card p-4">
          <img src={compasWordmark} alt={t.app.logo} className="h-auto w-36 max-w-full self-start object-contain" />
          <Select value={page.fireId} onValueChange={page.selectFire}>
            <SelectTrigger aria-label={t.app.fireSelector} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {page.fires.map((fire) => (
                <SelectItem key={fire.id} value={fire.id}>
                  {fire.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {page.isError && <p role="alert" className="text-sm text-destructive">{t.app.loadError}</p>}

            {page.isLoading && (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-28 rounded-xl" />
                ))}
              </div>
            )}

            {view && (
              <section aria-label={t.kpis.title} className="grid grid-cols-2 gap-3">
                {view.kpis.map((kpi) => (
                  <StatsCard1
                    key={kpi.id}
                    title={kpi.title}
                    value={kpi.value}
                    unit={kpi.unit}
                    description={kpi.description}
                  />
                ))}
              </section>
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}
