import { CheckCircleIcon, StackIcon } from '@phosphor-icons/react'

import { ChartCard3 } from '@/components/chart-card3'
import { StatsCard1 } from '@/components/stats-card1'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Map, MapControls, MapGeoJSON, MapMarker, MarkerContent, MarkerLabel } from '@/components/ui/map'
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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-balance">{t.app.title}</h1>
          {view && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{view.meta.scene}</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircleIcon weight="fill" className="text-tag-green-foreground" aria-hidden />
                {view.meta.location}
              </span>
            </p>
          )}
        </div>
        <Select value={page.fireId} onValueChange={page.selectFire}>
          <SelectTrigger aria-label={t.app.fireSelector} className="w-full md:w-80">
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

      {page.isError && <p role="alert" className="text-destructive">{t.app.loadError}</p>}

      {page.isLoading && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-12 w-3/4" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[600px] rounded-xl" />
        </div>
      )}

      {view && page.mapStyle && (
        <>
          <p className="max-w-4xl text-lg text-pretty">{view.summary}</p>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {view.kpis.map((kpi) => (
              <StatsCard1 key={kpi.id} title={kpi.title} value={kpi.value} unit={kpi.unit} description={kpi.description} />
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t.map.title}</h2>
              </CardTitle>
              <CardAction className="flex gap-2">
                <Select value={page.composite} onValueChange={(value) => page.setComposite(value as Composite)}>
                  <SelectTrigger aria-label={t.map.baseImage} className="w-48">
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
                    <Button variant="outline">
                      <StackIcon aria-hidden />
                      {t.map.layers}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] overflow-hidden rounded-lg">
                <Map
                  key={view.report.id}
                  theme="light"
                  styles={{ light: page.mapStyle }}
                  bounds={view.mapData.bounds}
                  fitBoundsOptions={{ padding: 16 }}
                >
                  <MapControls position="top-right" showCompass showFullscreen />
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
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {page.legend.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </CardFooter>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
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
          </section>

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
                      <TableHead>{t.affected.columns.type}</TableHead>
                      <TableHead>{t.affected.columns.situation}</TableHead>
                      <TableHead>{t.affected.columns.detail}</TableHead>
                      <TableHead>{t.affected.columns.official}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {view.affectedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.situation}</TableCell>
                        <TableCell className="tabular-nums">{row.detail}</TableCell>
                        <TableCell>
                          {row.official === 'confirmed' && (
                            <Badge className="bg-tag-green-background text-tag-green-foreground">{t.affected.confirmed}</Badge>
                          )}
                          {row.official === 'not_confirmed' && (
                            <Badge className="bg-tag-red-background text-tag-red-foreground">{t.affected.notConfirmed}</Badge>
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
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t.validation.agreement}</p>
                <p className="text-2xl font-semibold tabular-nums">{t.validation.percent(formatNumber(view.report.validation.agreementPct, 1))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.validation.officialArea}</p>
                <p className="text-2xl font-semibold tabular-nums">{t.validation.hectares(formatNumber(view.report.validation.officialAreaHa))}</p>
                <p className="text-xs text-muted-foreground">{t.validation.officialAreaNote}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.validation.sources}</p>
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
    </main>
  )
}
