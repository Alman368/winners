import { IconLoader2, IconUpload } from '@tabler/icons-react'

import compasWordmark from '@/assets/compas-wordmark.svg'

import { FireZoneList } from '@/components/FireZoneList'
import { CompositeToggle } from '@/components/CompositeToggle'
import { CurtainToggle } from '@/components/CurtainToggle'
import { FireSelector } from '@/components/FireSelector'
import { ImportFireDialog } from '@/components/ImportFireDialog'
import { LegendSymbolMark } from '@/components/LegendSymbolMark'
import { MapLayersPopover } from '@/components/MapLayersPopover'
import { MapCurtain } from '@/components/MapCurtain'
import { MapLegend } from '@/components/MapLegend'
import { StatsCard1 } from '@/components/stats-card1'
import { WeatherBadge } from '@/components/WeatherBadge'
import { Button } from '@/components/ui/button'
import { Map, MapControls, MapGeoJSON, MapImage, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { mapLayerOrder, useFireReportPage } from '@/hooks/useFireReportPage'
import { t } from '@/i18n'
import { layerSymbols, mapColors } from '@/lib/fireReport'
import { palette } from '@/lib/palette'

export function FireReportPage() {
  const { setMap, ...page } = useFireReportPage()
  const { view } = page

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <main className="relative h-[60vh] min-w-0 flex-1 lg:h-full">
        {page.isLoading && <Skeleton className="size-full rounded-none" />}
        {view && page.basemap && (
          <>
            <Map
              ref={setMap}
              key={view.report.id}
              theme="light"
              styles={{ light: page.basemap }}
              bounds={view.mapData.bounds}
              maxBounds={view.mapData.bounds}
              onViewportChange={page.curtain.onMapViewportChange}
            >
              <MapControls position="bottom-right" showCompass showFullscreen />
              {page.originalImage && (
                <MapImage id="scene" url={page.originalImage.url} coordinates={page.originalImage.coordinates} />
              )}
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
              {page.visibleLayers.official && view.mapData.official && (
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
              {page.visibleLayers.roads && page.context.view && (
                <MapGeoJSON
                  id="roads"
                  data={page.context.view.roads}
                  fillPaint={false}
                  linePaint={{ 'line-color': mapColors.roads, 'line-width': 4 }}
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

            {page.curtain.comparison && (
              <MapCurtain
                position={page.curtain.position}
                onPositionChange={page.curtain.setPosition}
                beforeLabel={page.curtain.comparison.beforeLabel}
                afterLabel={page.curtain.comparison.afterLabel}
              >
                <Map
                  theme="light"
                  styles={{ light: page.basemap }}
                  interactive={false}
                  viewport={page.curtain.comparison.viewport}
                  onViewportChange={page.curtain.syncViewport}
                >
                  {page.curtain.firstDayImage && (
                    <MapImage
                      id="scene-first-day"
                      url={page.curtain.firstDayImage.url}
                      coordinates={page.curtain.firstDayImage.coordinates}
                    />
                  )}
                </Map>
              </MapCurtain>
            )}

            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <div className="flex flex-col items-start gap-2">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl bg-card/95 p-1 shadow-sm ring-1 ring-foreground/10 backdrop-blur">
                  <CompositeToggle composites={page.composites} value={page.composite} onChange={page.setComposite} />
                  {page.curtain.isAvailable && (
                    <>
                      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                      <CurtainToggle
                        pressed={page.curtain.isOpen}
                        onPressedChange={page.curtain.toggle}
                        isLocked={page.curtain.isLocked}
                        isLoading={page.curtain.isLoading}
                        isError={page.curtain.isError}
                      />
                    </>
                  )}
                  {page.isImageLoading && (
                    <span role="status" className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
                      <IconLoader2 aria-hidden className="size-3.5 animate-spin" />
                      {t.scenes.imageLoading}
                    </span>
                  )}
                </div>
                {page.curtain.isLocked && (
                  <p className="pointer-events-auto max-w-sm rounded-lg bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-sm ring-1 ring-foreground/10">
                    {t.scenes.lockedHint}
                  </p>
                )}
                {page.isImageError && (
                  <p role="alert" className="pointer-events-auto rounded-lg bg-card/95 px-3 py-2 text-xs text-destructive shadow-sm ring-1 ring-foreground/10">
                    {t.scenes.imageError}
                  </p>
                )}
              </div>
              <div className="pointer-events-auto flex flex-col items-end gap-2">
                <MapLayersPopover
                  layers={mapLayerOrder}
                  visibleLayers={page.visibleLayers}
                  onLayerVisibleChange={page.setLayerVisible}
                />
                {page.context.view && (
                  <WeatherBadge
                    towardsDeg={page.context.view.weather.towardsDeg}
                    wind={page.context.view.weather.wind}
                    conditions={page.context.view.weather.conditions}
                  />
                )}
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
          <div className="flex items-center justify-between gap-2">
            <FireSelector fires={page.fires} value={page.fireId} onChange={page.selectFire} />
            <Button variant="outline" size="sm" onClick={() => page.fireImport.setIsOpen(true)}>
              <IconUpload data-icon="inline-start" />
              {t.app.import}
            </Button>
          </div>
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
              <>
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
                  {page.context.view && (
                    <StatsCard1
                      title={page.context.view.roadsKpi.title}
                      value={page.context.view.roadsKpi.value}
                      unit={page.context.view.roadsKpi.unit}
                      description={page.context.view.roadsKpi.description}
                    />
                  )}
                  {page.context.isLoading && <Skeleton className="h-28 rounded-xl" />}
                </section>
                {page.context.isRunning && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t.app.contextRunning}
                  </p>
                )}
                {page.context.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {t.app.contextError}
                  </p>
                )}
                <FireZoneList
                  zones={page.fireZones.shown}
                  hiddenCount={page.fireZones.hiddenCount}
                  isExpanded={page.fireZones.isExpanded}
                  onToggleExpanded={page.fireZones.toggleExpanded}
                  onFocusZone={(zone) => page.focusZone(zone.bounds)}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </aside>

      <ImportFireDialog
        open={page.fireImport.isOpen}
        onOpenChange={page.fireImport.setIsOpen}
        place={page.fireImport.place}
        onPlaceChange={page.fireImport.setPlace}
        onImageChange={page.fireImport.setImage}
        onSubmit={page.fireImport.submit}
        canSubmit={page.fireImport.canSubmit}
        isPending={page.fireImport.isPending}
        isError={page.fireImport.isError}
      />
    </div>
  )
}
