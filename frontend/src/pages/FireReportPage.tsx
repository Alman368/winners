import { IconHelpCircle, IconLoader2, IconUpload } from '@tabler/icons-react'

import compasWordmark from '@/assets/compas-wordmark.svg'

import { AccessibilityPopover } from '@/components/AccessibilityPopover'
import { FireZoneList } from '@/components/FireZoneList'
import { CompositeToggle } from '@/components/CompositeToggle'
import { CurtainToggle } from '@/components/CurtainToggle'
import { FireSelector } from '@/components/FireSelector'
import { ImportFireDialog } from '@/components/ImportFireDialog'
import { LegendSymbolMark } from '@/components/LegendSymbolMark'
import { MapLayersPopover } from '@/components/MapLayersPopover'
import { MapCurtain } from '@/components/MapCurtain'
import { MapLegend } from '@/components/MapLegend'
import { RoadTooltip } from '@/components/RoadTooltip'
import { StatsCard1 } from '@/components/stats-card1'
import { TourCard } from '@/components/TourCard'
import { TourSpotlight } from '@/components/TourSpotlight'
import { WeatherBadge } from '@/components/WeatherBadge'
import { Button } from '@/components/ui/button'
import { Map, MapControls, MapGeoJSON, MapImage, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { mapLayerOrder, useFireReportPage } from '@/hooks/useFireReportPage'
import { t } from '@/i18n'
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
                  fillPaint={{ 'fill-color': page.colors.reservoirs, 'fill-opacity': 0.7 }}
                  linePaint={{ 'line-color': palette.white, 'line-width': 1.5 }}
                />
              )}
              {page.visibleLayers.official && view.mapData.official && (
                <MapGeoJSON
                  id="official"
                  data={view.mapData.official}
                  fillPaint={false}
                  linePaint={{ 'line-color': page.colors.official, 'line-width': 2, 'line-dasharray': [2, 2] }}
                />
              )}
              {page.visibleLayers.burned && (
                <MapGeoJSON
                  id="burned"
                  data={view.mapData.burned}
                  fillPaint={false}
                  linePaint={{ 'line-color': page.colors.burned, 'line-width': 2.5 }}
                />
              )}
              {page.visibleLayers.roads && page.context.view && (
                <MapGeoJSON
                  id="roads"
                  data={page.context.view.roads}
                  fillPaint={false}
                  linePaint={{ 'line-color': page.colors.roads, 'line-width': 4 }}
                  interactive
                  onHover={page.roadTooltip.onHover}
                />
              )}
              {page.visibleLayers.fire && (
                <MapGeoJSON
                  id="fire"
                  data={view.mapData.fire}
                  fillPaint={{ 'fill-color': page.colors.fire, 'fill-opacity': 1 }}
                  linePaint={{ 'line-color': palette.white, 'line-width': 1.5 }}
                />
              )}
              {page.visibleLayers.towns &&
                view.mapData.towns.map((town) => (
                  <MapMarker key={town.name} longitude={town.coordinates[0]} latitude={town.coordinates[1]}>
                    <MarkerContent>
                      <LegendSymbolMark symbol={page.layerSymbols.towns.symbol} colors={page.layerSymbols.towns.colors} />
                      <MarkerLabel className="rounded bg-card/90 px-1 py-px shadow-sm">{town.name}</MarkerLabel>
                    </MarkerContent>
                  </MapMarker>
                ))}
            </Map>

            {page.roadTooltip.tooltip && (
              <RoadTooltip
                x={page.roadTooltip.tooltip.x}
                y={page.roadTooltip.tooltip.y}
                title={page.roadTooltip.tooltip.title}
                subtitle={page.roadTooltip.tooltip.subtitle}
                kilometre={page.roadTooltip.tooltip.kilometre}
              />
            )}

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
                  <div data-tour="composites">
                    <CompositeToggle composites={page.composites} value={page.composite} onChange={page.setComposite} />
                  </div>
                  {page.curtain.isAvailable && (
                    <>
                      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                      <div data-tour="curtain">
                        <CurtainToggle
                          pressed={page.curtain.isOpen}
                          onPressedChange={page.curtain.toggle}
                          isLocked={page.curtain.isLocked}
                          isLoading={page.curtain.isLoading}
                          isError={page.curtain.isError}
                        />
                      </div>
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
                <div data-tour="layers">
                  <MapLayersPopover
                    layers={mapLayerOrder}
                    symbols={page.layerSymbols}
                    visibleLayers={page.visibleLayers}
                    onLayerVisibleChange={page.setLayerVisible}
                  />
                </div>
                {page.context.view && (
                  <div data-tour="weather">
                    <WeatherBadge
                      weather={page.context.view.weather}
                      isExpanded={page.weather.isExpanded}
                      onToggleExpanded={page.weather.toggleExpanded}
                    />
                  </div>
                )}
              </div>
            </div>

            {page.legend && (
              <div data-tour="legend" className="absolute bottom-3 left-3">
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
          <div className="flex items-center justify-between gap-2">
            <img src={compasWordmark} alt={t.app.logo} className="h-auto w-36 max-w-full object-contain" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={!view} onClick={page.tour.start}>
                <IconHelpCircle data-icon="inline-start" />
                {t.tour.start}
              </Button>
              <AccessibilityPopover
                textSize={page.accessibility.textSize}
                onTextSizeChange={page.accessibility.setTextSize}
                colorMode={page.accessibility.colorMode}
                onColorModeChange={page.accessibility.setColorMode}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <FireSelector fires={page.fires} value={page.fireId} onChange={page.selectFire} />
            <Button data-tour="import" variant="outline" size="sm" onClick={() => page.fireImport.setIsOpen(true)}>
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
                <section data-tour="kpis" aria-label={t.kpis.title} className="grid grid-cols-2 gap-3">
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
                <div data-tour="fireZones">
                  <FireZoneList
                    zones={page.fireZones.shown}
                    markerColor={page.colors.fire}
                    hiddenCount={page.fireZones.hiddenCount}
                    isExpanded={page.fireZones.isExpanded}
                    onToggleExpanded={page.fireZones.toggleExpanded}
                    onFocusZone={(zone) => page.focusZone(zone.bounds)}
                  />
                </div>
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
        imageName={page.fireImport.imageName}
        onImageChange={page.fireImport.setImage}
        onSubmit={page.fireImport.submit}
        canSubmit={page.fireImport.canSubmit}
        isPending={page.fireImport.isPending}
        errorMessage={page.fireImport.errorMessage}
      />

      {page.tour.step && (
        <>
          <TourSpotlight highlight={page.tour.step.highlight} />
          <TourCard
            anchor={page.tour.step.anchor}
            side={page.tour.step.side}
            title={page.tour.step.title}
            description={page.tour.step.description}
            progress={page.tour.step.progress}
            isFirst={page.tour.step.isFirst}
            isLast={page.tour.step.isLast}
            onBack={page.tour.back}
            onNext={page.tour.next}
            onClose={page.tour.close}
          />
        </>
      )}
    </div>
  )
}
