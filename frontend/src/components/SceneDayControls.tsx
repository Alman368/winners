import { IconCalendar, IconArrowsDiff } from '@tabler/icons-react'

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
  isLoading: boolean
  isError: boolean
}

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
  isLoading,
  isError,
}: SceneDayControlsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-9 rounded-md" />
        <Skeleton className="h-9 rounded-md" />
      </div>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {t.scenes.passesError}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Select value={day} onValueChange={onDayChange}>
          <SelectTrigger aria-label={t.scenes.day} className="w-full">
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
        <Select value={compareDay} onValueChange={onCompareDayChange}>
          <SelectTrigger aria-label={t.scenes.compare} className="w-full">
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
      </div>
      {isCompareActive && (
        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">{t.scenes.opacity}</span>
          <Slider
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
