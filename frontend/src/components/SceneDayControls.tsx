import { IconArrowsDiff, IconCalendar } from '@tabler/icons-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { t } from '@/i18n'
import type { DayOption } from '@/types/scene'

type SceneDayControlsProps = {
  dayOptions: DayOption[]
  compareOptions: DayOption[]
  day: string
  onDayChange: (day: string) => void
  compareDay: string
  noCompareValue: string
  onCompareDayChange: (day: string) => void
  compareOpacity: number
  onCompareOpacityChange: (opacity: number) => void
  isCompareActive: boolean
  isLocked: boolean
  isLoading: boolean
  isError: boolean
}

const triggerClassName = 'border-transparent bg-transparent shadow-none hover:bg-muted'

export function SceneDayControls({
  dayOptions,
  compareOptions,
  day,
  onDayChange,
  compareDay,
  noCompareValue,
  onCompareDayChange,
  compareOpacity,
  onCompareOpacityChange,
  isCompareActive,
  isLocked,
  isLoading,
  isError,
}: SceneDayControlsProps) {
  if (isLoading) {
    return (
      <div aria-label={t.scenes.passesLoading} className="flex items-center gap-1">
        <Skeleton className="h-7 w-44 rounded-md" />
        <Skeleton className="h-7 w-32 rounded-md" />
      </div>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="px-2 text-xs text-destructive">
        {t.scenes.passesError}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Select value={day} onValueChange={onDayChange} disabled={isLocked}>
        <SelectTrigger size="sm" aria-label={t.scenes.day} className={triggerClassName}>
          <IconCalendar aria-hidden className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dayOptions.map((option) => (
            <SelectItem key={option.day} value={option.day}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={compareDay} onValueChange={onCompareDayChange} disabled={isLocked}>
        <SelectTrigger size="sm" aria-label={t.scenes.compare} className={triggerClassName}>
          <IconArrowsDiff aria-hidden className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={noCompareValue}>{t.scenes.noCompare}</SelectItem>
          {compareOptions.map((option) => (
            <SelectItem key={option.day} value={option.day}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCompareActive && (
        <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <span className="shrink-0">{t.scenes.opacity}</span>
          <Slider
            className="w-24"
            value={[compareOpacity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([value]) => onCompareOpacityChange(value)}
          />
        </label>
      )}
    </div>
  )
}
