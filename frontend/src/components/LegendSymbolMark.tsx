import type { LegendSymbol } from '@/lib/fireReport'

type LegendSymbolMarkProps = {
  symbol: LegendSymbol
  colors: string[]
}

export function LegendSymbolMark({ symbol, colors }: LegendSymbolMarkProps) {
  if (symbol === 'ramp') {
    return (
      <span aria-hidden className="flex h-3 w-5 shrink-0 overflow-hidden rounded-sm">
        {colors.map((color) => (
          <span key={color} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </span>
    )
  }
  if (symbol === 'line') {
    return <span aria-hidden className="block h-[3px] w-5 shrink-0 rounded-full" style={{ backgroundColor: colors[0] }} />
  }
  if (symbol === 'dashed') {
    return (
      <span aria-hidden className="flex h-3 w-5 shrink-0 items-center rounded-sm bg-foreground/70 px-0.5">
        <span className="w-full border-t-2 border-dashed" style={{ borderColor: colors[0] }} />
      </span>
    )
  }
  if (symbol === 'marker') {
    return (
      <span
        aria-hidden
        className="block size-3 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-foreground/20"
        style={{ backgroundColor: colors[0] }}
      />
    )
  }
  if (symbol === 'ring') {
    return (
      <span
        aria-hidden
        className="block size-3 shrink-0 rounded-full border-[2.5px] bg-white shadow-sm ring-1 ring-white"
        style={{ borderColor: colors[0] }}
      />
    )
  }
  if (symbol === 'fire') {
    return (
      <span
        aria-hidden
        className="block size-3 shrink-0 rounded-[3px] border-[1.5px] border-white shadow-sm ring-1 ring-foreground/20"
        style={{ backgroundColor: colors[0] }}
      />
    )
  }
  return <span aria-hidden className="block size-3 shrink-0 rounded-[3px]" style={{ backgroundColor: colors[0] }} />
}
