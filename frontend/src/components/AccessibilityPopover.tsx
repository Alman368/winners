import { IconSettings } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n'
import { type ColorMode, type TextSize, textSizes } from '@/lib/accessibility'

type AccessibilityPopoverProps = {
  textSize: TextSize
  onTextSizeChange: (textSize: TextSize) => void
  colorMode: ColorMode
  onColorModeChange: (colorMode: ColorMode) => void
}

export function AccessibilityPopover({ textSize, onTextSizeChange, colorMode, onColorModeChange }: AccessibilityPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t.accessibility.open}>
          <IconSettings aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-4 p-4">
        <PopoverHeader>
          <PopoverTitle>{t.accessibility.title}</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-2">
          <span id="accessibility-text-size" className="font-medium">
            {t.accessibility.textSize}
          </span>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={1}
            value={textSize}
            onValueChange={(next) => next && onTextSizeChange(next as TextSize)}
            aria-labelledby="accessibility-text-size"
            className="w-full"
          >
            {textSizes.map((size) => (
              <ToggleGroupItem
                key={size}
                value={size}
                className="flex-1 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                {t.accessibility.textSizes[size]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span id="accessibility-colorblind" className="flex-1 font-medium">
            {t.accessibility.colorblind}
          </span>
          <Switch
            aria-labelledby="accessibility-colorblind"
            checked={colorMode === 'colorblind'}
            onCheckedChange={(checked) => onColorModeChange(checked ? 'colorblind' : 'standard')}
          />
        </label>
      </PopoverContent>
    </Popover>
  )
}
