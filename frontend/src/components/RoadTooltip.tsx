type RoadTooltipProps = {
  x: number
  y: number
  title: string
  subtitle: string | null
  kilometre: string | null
}

export function RoadTooltip({ x, y, title, subtitle, kilometre }: RoadTooltipProps) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 flex max-w-64 -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col rounded-lg bg-card/95 px-2.5 py-1.5 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur"
      style={{ left: x, top: y }}
    >
      <span className="font-medium text-foreground">
        {title}
        {kilometre && <span className="ml-1.5 tabular-nums text-muted-foreground">{kilometre}</span>}
      </span>
      {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
    </div>
  )
}
