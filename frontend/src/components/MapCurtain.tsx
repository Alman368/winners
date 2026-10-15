import { IconArrowsLeftRight } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { t } from '@/i18n'

type MapCurtainProps = {
  position: number
  onPositionChange: (position: number) => void
  beforeLabel: string
  afterLabel: string
  children: ReactNode
}

const labelClassName =
  'absolute top-1/2 -translate-y-1/2 rounded-md bg-card/95 px-2 py-1 text-xs font-medium whitespace-nowrap shadow-sm ring-1 ring-foreground/10'

export function MapCurtain({ position, onPositionChange, beforeLabel, afterLabel, children }: MapCurtainProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${(1 - position) * 100}% 0 0)` }}>
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-card shadow-[0_0_4px_rgb(0_0_0/0.4)]"
        style={{ left: `${position * 100}%` }}
      />
      <SliderPrimitive.Root
        className="pointer-events-none absolute inset-0 flex touch-none items-center select-none"
        value={[position]}
        min={0}
        max={1}
        step={0.005}
        onValueChange={([value]) => onPositionChange(value)}
      >
        <SliderPrimitive.Thumb
          aria-label={t.scenes.handle}
          className="pointer-events-auto relative flex size-9 cursor-ew-resize items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-foreground/10 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-hidden"
        >
          <IconArrowsLeftRight aria-hidden className="size-4" />
          <span className={`${labelClassName} right-full mr-2`}>{beforeLabel}</span>
          <span className={`${labelClassName} left-full ml-2`}>{afterLabel}</span>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </>
  )
}
