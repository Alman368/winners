import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n'
import type { Composite } from '@/types/fireReport'

type CompositeToggleProps = {
  composites: Composite[]
  value: Composite
  onChange: (composite: Composite) => void
}

export function CompositeToggle({ composites, value, onChange }: CompositeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      spacing={1}
      value={value}
      onValueChange={(next) => next && onChange(next as Composite)}
      aria-label={t.map.baseImage}
    >
      {composites.map((composite) => (
        <ToggleGroupItem
          key={composite}
          value={composite}
          className="data-[state=on]:bg-foreground data-[state=on]:text-background"
        >
          {t.map.composites[composite]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
