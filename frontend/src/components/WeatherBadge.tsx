import {
  IconArrowUp,
  IconChevronDown,
  IconChevronUp,
  IconCloudRain,
  IconDroplet,
  IconTemperature,
  IconWind,
} from '@tabler/icons-react'

import { t } from '@/i18n'
import type { WeatherSummary } from '@/lib/fireReport'

type WeatherBadgeProps = {
  weather: WeatherSummary
  isExpanded: boolean
  onToggleExpanded: () => void
}

export function WeatherBadge({ weather, isExpanded, onToggleExpanded }: WeatherBadgeProps) {
  const rows = [
    { icon: IconWind, label: t.weather.gusts, value: weather.gusts },
    { icon: IconTemperature, label: t.weather.maxTemperature, value: weather.maxTemperature },
    { icon: IconDroplet, label: t.weather.minHumidity, value: weather.minHumidity },
    { icon: IconCloudRain, label: t.weather.rain, value: weather.rain },
  ]
  const windArrow = (
    <IconArrowUp
      role="img"
      aria-label={t.weather.windArrow}
      className="size-4"
      style={{ transform: `rotate(${weather.towardsDeg}deg)` }}
    />
  )

  if (!isExpanded) {
    return (
      <button
        type="button"
        aria-label={t.weather.expand}
        aria-expanded={false}
        onClick={onToggleExpanded}
        className="flex shrink-0 items-center gap-2 rounded-xl bg-card/95 px-3 py-2 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur hover:bg-muted"
      >
        {windArrow}
        <span className="font-semibold tabular-nums">{weather.windSpeed}</span>
        <IconChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </button>
    )
  }

  return (
    <section
      aria-label={t.weather.title}
      className="flex w-56 shrink-0 flex-col gap-2 rounded-xl bg-card/95 p-3 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur"
    >
      <button
        type="button"
        aria-label={t.weather.collapse}
        aria-expanded
        onClick={onToggleExpanded}
        className="-m-1 flex items-center justify-between rounded-md p-1 hover:bg-muted"
      >
        <h3 className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">{t.weather.title}</h3>
        <IconChevronUp aria-hidden className="size-3.5 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">{windArrow}</span>
        <div className="flex flex-col">
          <span className="text-muted-foreground">{weather.windFrom}</span>
          <span className="text-sm font-semibold tabular-nums">{weather.windSpeed}</span>
        </div>
      </div>
      <dl className="flex flex-col gap-1.5 border-t border-foreground/10 pt-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="ml-auto font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
