import { CheckCircleIcon, StackIcon } from '@phosphor-icons/react'

import { ChartCard3 } from '@/components/chart-card3'
import { StatsCard1 } from '@/components/stats-card1'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Map, MapControls, MapGeoJSON, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mapLayerOrder, useFireReportPage } from '@/hooks/useFireReportPage'
import { t } from '@/i18n'
import { formatNumber } from '@/lib/fireReport'
import { palette } from '@/lib/palette'
import type { Composite } from '@/types/fireReport'

export function FireReportPage() {
  const page = useFireReportPage()
  const { view } = page

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <main className="relative h-[60vh] min-w-0 flex-1 lg:h-full">
        {page.isLoading && <Skeleton className="size-full rounded-none" />}
        {view && page.mapStyle && (
          <>
            <Map
              key={view.report.id}
              theme="light"
              styles={{ light: page.mapStyle }}
              bounds={view.mapData.bounds}
              fitBoundsOptions={{ padding: 24 }}
            >
              <MapControls position="bottom-right" showCompass showFullscreen />
              {page.visibleLayers.severity &&
                view.mapData.severity.map((layer) => (
                  <MapGeoJSON
                    key={layer.id}
                    id={`severity-${layer.id}`}
                    data={layer.data}
                    fillPaint={{ 'fill-color': layer.color, 'fill-opacity': 0.6 }}
                    linePaint={false}
                  />
                ))}
              {page.visibleLayers.reservoirs && (
                <MapGeoJSON
                  id="reservoirs"
                  data={view.mapData.reservoirs}
                  fillPaint={{ 'fill-color': palette.blue9, 'fill-opacity': 0.7 }}
                  linePaint={{ 'line-color': palette.white, 'line-width': 1.5 }}
                />
              )}
              {page.visibleLayers.official && (
                <MapGeoJSON
                  id="official"
                  data={view.mapData.official}
                  fillPaint={false}
                  linePaint={{ 'line-color': palette.white, 'line-width': 2, 'line-dasharray': [2, 2] }}
                />
              )}
              {page.visibleLayers.burned && (
                <MapGeoJSON
                  id="burned"
                  data={view.mapData.burned}
                  fillPaint={false}
                  linePaint={{ 'line-color': palette.carbon, 'line-width': 2.5 }}
                />
              )}
              {page.visibleLayers.fire && (
                <MapGeoJSON
                  id="fire"
                  data={view.mapData.fire}
                  fillPaint={{ 'fill-color': palette.red9, 'fill-opacity': 1 }}
                  linePaint={{ 'line-color': palette.white, 'line-width': 1 }}
                />
              )}
              {page.visibleLayers.towns &&
                view.mapData.towns.map((town) => (
                  <MapMarker key={town.name} longitude={town.coordinates[0]} latitude={town.coordinates[1]}>
                    <MarkerContent />
                    <MarkerLabel>{town.name}</MarkerLabel>
                  </MapMarker>
                ))}
            </Map>

            <div className="absolute top-4 left-4 flex gap-2">
              <Select value={page.composite} onValueChange={(value) => page.setComposite(value as Composite)}>
                <SelectTrigger aria-label={t.map.baseImage} className="w-48 bg-card shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {view.report.scene.composites.map((composite) => (
                    <SelectItem key={composite} value={composite}>
                      {t.map.composites[composite]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-card shadow-sm">
                    <StackIcon aria-hidden />
                    {t.map.layers}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>{t.map.layers}</DropdownMenuLabel>
                  {mapLayerOrder.map((layer) => (
                    <DropdownMenuCheckboxItem
                      key={layer}
                      checked={page.visibleLayers[layer]}
                      onCheckedChange={(checked) => page.setLayerVisible(layer, checked)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {t.map.layerNames[layer]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Card size="sm" className="absolute bottom-4 left-4 max-w-sm shadow-sm">
              <CardContent className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {page.legend.map((item) => (
                  <span key={item.id} className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <aside
        aria-label={t.app.title}
        className="flex min-h-0 flex-1 flex-col border-t bg-background lg:w-[480px] lg:flex-none lg:border-t-0 lg:border-l"
      >
        <header className="flex flex-col gap-3 border-b bg-card p-4">
          <h1 className="text-lg font-semibold">{t.app.title}</h1>
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
          {view && (
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>{view.meta.scene}</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircleIcon weight="fill" className="text-tag-green-foreground" aria-hidden />
                {view.meta.location}
              </span>
            </div>
          )}
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {page.isError && <p role="alert" className="text-sm text-destructive">{t.app.loadError}</p>}

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
                <Card size="sm">
                  <CardContent className="text-sm leading-relaxed text-pretty">{view.summary}</CardContent>
                </Card>

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

                <ChartCard3
                  title={t.severity.title}
                  description={view.severityChart.description}
                  valueLabel={t.severity.valueLabel}
                  data={view.severityChart.data}
                  footer={view.severityChart.footer}
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
                                <span className="block font-medium">{row.name}</span>
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
