import { IconArrowsLeftRight } from '@tabler/icons-react'

import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { t } from '@/i18n'

type CurtainToggleProps = {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  isLocked: boolean
  isLoading: boolean
  isError: boolean
}

export function CurtainToggle({ pressed, onPressedChange, isLocked, isLoading, isError }: CurtainToggleProps) {
  if (isLoading) {
    return <Skeleton aria-label={t.scenes.fireDaysLoading} className="h-7 w-44 rounded-md" />
  }

  if (isError) {
    return (
      <p role="alert" className="px-2 text-xs text-destructive">
        {t.scenes.fireDaysError}
      </p>
    )
  }

  return (
    <Toggle
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={isLocked}
      className="data-[state=on]:bg-foreground data-[state=on]:text-background"
    >
      <IconArrowsLeftRight data-icon="inline-start" />
      {t.scenes.curtain}
    </Toggle>
  )
}
