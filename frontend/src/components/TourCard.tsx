import { IconX } from '@tabler/icons-react'
import type { RefObject } from 'react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
import type { TourSide } from '@/hooks/useOnboardingTour'
import { t } from '@/i18n'

type TourCardProps = {
  anchor: RefObject<Element>
  side: TourSide
  title: string
  description: string
  progress: string
  isFirst: boolean
  isLast: boolean
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

export function TourCard({
  anchor,
  side,
  title,
  description,
  progress,
  isFirst,
  isLast,
  onBack,
  onNext,
  onClose,
}: TourCardProps) {
  return (
    <Popover open modal onOpenChange={onClose}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent side={side} sideOffset={14} collisionPadding={16} className="relative w-80 gap-4 p-4">
        <PopoverHeader className="gap-1 pr-6">
          <PopoverTitle className="text-base">{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{progress}</span>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                {t.tour.back}
              </Button>
            )}
            <Button size="sm" onClick={onNext}>
              {isLast ? t.tour.finish : t.tour.next}
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t.tour.close} className="absolute top-2 right-2" onClick={onClose}>
          <IconX />
        </Button>
      </PopoverContent>
    </Popover>
  )
}
