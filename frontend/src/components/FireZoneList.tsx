import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/i18n'
import type { FireZone } from '@/lib/fireReport'

type FireZoneListProps = {
  zones: FireZone[]
  hiddenCount: number
  isExpanded: boolean
  onToggleExpanded: () => void
  onFocusZone: (zone: FireZone) => void
}

export function FireZoneList({ zones, hiddenCount, isExpanded, onToggleExpanded, onFocusZone }: FireZoneListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t.fireZones.title}</h2>
        </CardTitle>
        <CardDescription>{t.fireZones.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {zones.length === 0 && <p className="text-sm text-muted-foreground">{t.fireZones.empty}</p>}
        <ol className="flex flex-col gap-0.5">
          {zones.map((zone) => (
            <li key={zone.id}>
              <Button
                variant="ghost"
                aria-label={t.fireZones.focus(zone.rank)}
                className="h-auto w-full justify-start gap-3 py-2 text-left whitespace-normal"
                onClick={() => onFocusZone(zone)}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--palette-red-9)] text-xs font-semibold text-white tabular-nums">
                  {zone.rank}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{zone.length}</span>
                  <span className="text-xs font-normal text-muted-foreground">{zone.detail}</span>
                </span>
              </Button>
            </li>
          ))}
        </ol>
        {(hiddenCount > 0 || isExpanded) && (
          <Button variant="outline" size="sm" className="self-start" onClick={onToggleExpanded}>
            {isExpanded ? t.fireZones.showLess : t.fireZones.showMore(hiddenCount)}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
