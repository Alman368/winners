import { LegendSymbolMark } from '@/components/LegendSymbolMark'
import { t } from '@/i18n'
import type { LegendItem } from '@/lib/fireReport'

type MapLegendProps = {
  severity: LegendItem[]
  layers: LegendItem[]
}

export function MapLegend({ severity, layers }: MapLegendProps) {
  if (severity.length === 0 && layers.length === 0) {
    return null
  }

  return (
    <section
      aria-label={t.legend.title}
      className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl bg-card/95 p-3 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur"
    >
      {severity.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div>
            <h2 className="text-sm font-medium">{t.legend.severityTitle}</h2>
            <p className="text-muted-foreground">{t.legend.severityDescription}</p>
          </div>
          <ul className="flex flex-col gap-1">
            {severity.map((item) => (
              <li key={item.id} className="grid grid-cols-[auto_6rem_1fr_auto] items-center gap-2">
                <LegendSymbolMark symbol={item.symbol} colors={item.colors} />
                <span>{item.label}</span>
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(item.share as number) * 100}%`, backgroundColor: item.colors[0] }}
                  />
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {severity.length > 0 && layers.length > 0 && <hr className="border-border" />}
      {layers.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {layers.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <LegendSymbolMark symbol={item.symbol} colors={item.colors} />
              <span className="flex-1">{item.label}</span>
              {item.detail && <span className="tabular-nums text-muted-foreground">{item.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
