import { IconCalendar, IconFlame, IconHistory } from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { t } from '@/i18n'

type SceneFactsProps = {
  acquisition: string
  fireStart: string
  daysSinceStart: string
  preFire: string
}

export function SceneFacts({ acquisition, fireStart, daysSinceStart, preFire }: SceneFactsProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.facts.title}</h2>
        <p className="flex items-start gap-2 font-medium">
          <IconCalendar aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {acquisition}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <IconFlame aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {fireStart}
          <Badge variant="secondary">{daysSinceStart}</Badge>
        </p>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <IconHistory aria-hidden className="mt-px size-4 shrink-0" />
          {preFire}
        </p>
      </CardContent>
    </Card>
  )
}
