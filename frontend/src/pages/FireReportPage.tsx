import { IconLoader2 } from '@tabler/icons-react'

import compasWordmark from '@/assets/compas-wordmark.svg'

import { ChartCard3 } from '@/components/chart-card3'
import { CompositeToggle } from '@/components/CompositeToggle'
import { FireZoneList } from '@/components/FireZoneList'
import { LegendSymbolMark } from '@/components/LegendSymbolMark'
import { MapLayersPopover } from '@/components/MapLayersPopover'
import { MapLegend } from '@/components/MapLegend'
import { SceneDayControls } from '@/components/SceneDayControls'
import { SceneFacts } from '@/components/SceneFacts'
import { StatsCard1 } from '@/components/stats-card1'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Map, MapControls, MapGeoJSON, MapImage, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mapLayerOrder, NO_COMPARE, useFireReportPage } from '@/hooks/useFireReportPage'
import { t } from '@/i18n'
import { formatNumber, layerSymbols, mapColors } from '@/lib/fireReport'
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
                  {page.scenes.day && (
                    <>
                      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                      <SceneDayControls
                        dayOptions={page.scenes.dayOptions}
                        compareOptions={page.scenes.compareOptions}
                        day={page.scenes.day}
                        onDayChange={page.scenes.selectDay}
                        compareDay={page.scenes.compareDay}
                        noCompareValue={NO_COMPARE}
                        onCompareDayChange={page.scenes.selectCompareDay}
                        compareOpacity={page.scenes.compareOpacity}
                        onCompareOpacityChange={page.scenes.setCompareOpacity}
                        isCompareActive={page.scenes.isCompareActive}
                        isLocked={page.scenes.isLocked}
                        isLoading={page.scenes.isLoading}
                        isError={page.scenes.isError}
                      />
                    </>
                  )}
                  {page.scenes.isImageLoading && (
                    <span role="status" className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
                      <IconLoader2 aria-hidden className="size-3.5 animate-spin" />
                      {t.scenes.imageLoading}
                    </span>
                  )}
                </div>
                {page.scenes.isLocked && (
                  <p className="pointer-events-auto max-w-sm rounded-lg bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-sm ring-1 ring-foreground/10">
                    {t.scenes.lockedHint}
                  </p>
                )}
                {page.scenes.isImageError && (
                  <p role="alert" className="pointer-events-auto rounded-lg bg-card/95 px-3 py-2 text-xs text-destructive shadow-sm ring-1 ring-foreground/10">
                    {t.scenes.imageError}
                  </p>
                )}
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

            {page.isAnalysisRunning && (
              <p role="status" className="text-sm text-muted-foreground">
                {t.app.analysisRunning}
              </p>
            )}

            {page.isLoading && (
              <>
                <Skeleton className="h-20 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-28 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-64 rounded-xl" />
              </>
            )}

            {view && (
              <>
                <SceneFacts
                  acquisition={view.facts.acquisition}
                  fireStart={view.facts.fireStart}
                  daysSinceStart={view.facts.daysSinceStart}
                  preFire={view.facts.preFire}
                />

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

                <FireZoneList
                  zones={page.fireZones.shown}
                  hiddenCount={page.fireZones.hiddenCount}
                  isExpanded={page.fireZones.isExpanded}
                  onToggleExpanded={page.fireZones.toggleExpanded}
                  onFocusZone={(zone) => page.focusTarget(zone.target)}
                />

                <ChartCard3
                  title={t.environment.title}
                  description={t.environment.description}
                  valueLabel={t.environment.valueLabel}
                  data={view.landCoverChart.data}
                  footer={view.landCoverChart.footer}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>{t.affected.title}</h2>
                    </CardTitle>
                    <CardDescription>{t.affected.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {view.affectedRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.affected.empty}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.affected.columns.name}</TableHead>
                            <TableHead>{t.affected.columns.situation}</TableHead>
                            <TableHead>{t.affected.columns.official}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {view.affectedRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-normal">
                                {row.target ? (
                                  <Button
                                    variant="link"
                                    aria-label={t.affected.focus(row.name)}
                                    className="h-auto p-0 font-medium text-foreground"
                                    onClick={() => page.focusTarget(row.target!)}
                                  >
                                    {row.name}
                                  </Button>
                                ) : (
                                  <span className="block font-medium">{row.name}</span>
                                )}
                                <span className="block text-xs text-muted-foreground">
                                  {row.type} · {row.detail}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-normal text-xs">{row.situation}</TableCell>
                              <TableCell>
                                {row.official === 'confirmed' && (
                                  <Badge className="bg-tag-green-background text-tag-green-foreground">
                                    {t.affected.confirmed}
                                  </Badge>
                                )}
                                {row.official === 'not_confirmed' && (
                                  <Badge className="bg-tag-red-background text-tag-red-foreground">
                                    {t.affected.notConfirmed}
                                  </Badge>
                                )}
                                {row.official === null && t.affected.notApplicable}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <h2>{t.validation.title}</h2>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t.validation.agreement}</p>
                        <p className="text-xl font-semibold tabular-nums">
                          {t.validation.percent(formatNumber(view.report.validation.agreementPct, 1))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t.validation.officialArea}</p>
                        <p className="text-xl font-semibold tabular-nums">
                          {t.validation.hectares(formatNumber(view.report.validation.officialAreaHa))}
                        </p>
                        <p className="text-xs text-muted-foreground">{t.validation.officialAreaNote}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t.validation.sources}</p>
                      <ul className="text-sm">
                        {t.validation.sourceList.map((source) => (
                          <li key={source}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}
