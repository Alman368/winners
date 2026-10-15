import { IconList } from '@tabler/icons-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { t } from '@/i18n'
import type { FireOption } from '@/lib/demoFires'

type FireSelectorProps = {
  fires: FireOption[]
  value: string
  onChange: (id: string) => void
}

export function FireSelector({ fires, value, onChange }: FireSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={t.app.fireSelector}
        className="max-w-56 data-[size=default]:h-6 gap-1 border-0 bg-background py-1 pr-2 pl-1 text-sm leading-4 font-medium text-secondary-foreground transition-colors duration-100 hover:bg-foreground/[0.04] focus-visible:ring-ring/20 data-[state=open]:bg-foreground/[0.04] data-[state=open]:hover:bg-foreground/[0.08] *:data-[slot=select-value]:gap-1 [&>svg]:size-3.5"
      >
        <span className="flex shrink-0">
          <IconList aria-hidden className="size-4 text-muted-foreground" />
        </span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={4} className="rounded-md bg-popover/50 p-1 backdrop-blur-md">
        {fires.map((fire) => (
          <SelectItem
            key={fire.id}
            value={fire.id}
            className="h-8 rounded-sm px-1 text-secondary-foreground *:[span]:last:gap-1 hover:bg-foreground/[0.04] focus:bg-foreground/[0.04] focus:text-secondary-foreground data-[state=checked]:bg-foreground/[0.04]"
          >
            <span className="truncate">{fire.name}</span>
            <span className="text-muted-foreground">· {fire.province}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
