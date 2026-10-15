import { IconArrowUp } from '@tabler/icons-react'

import { t } from '@/i18n'

type WeatherBadgeProps = {
  towardsDeg: number
  wind: string
  conditions: string
}

export function WeatherBadge({ towardsDeg, wind, conditions }: WeatherBadgeProps) {
  return (
    <section
      aria-label={t.weather.title}
      className="flex w-56 shrink-0 items-center gap-2.5 rounded-xl bg-card/95 px-3 py-2 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <IconArrowUp
          role="img"
          aria-label={t.weather.windArrow}
          className="size-4"
          style={{ transform: `rotate(${towardsDeg}deg)` }}
        />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{wind}</span>
        <span className="text-muted-foreground">{conditions}</span>
      </div>
    </section>
  )
}
