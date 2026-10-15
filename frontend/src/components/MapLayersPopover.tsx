import { IconStack2 } from '@tabler/icons-react'

import { LegendSymbolMark } from '@/components/LegendSymbolMark'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { t } from '@/i18n'
import type { LayerSymbols } from '@/lib/fireReport'
import type { MapLayerId } from '@/types/fireReport'

type MapLayersPopoverProps = {
  layers: MapLayerId[]
  symbols: LayerSymbols
  visibleLayers: Record<MapLayerId, boolean>
  onLayerVisibleChange: (layer: MapLayerId, visible: boolean) => void
}

export function MapLayersPopover({ layers, symbols, visibleLayers, onLayerVisibleChange }: MapLayersPopoverProps) {
  const activeCount = layers.filter((layer) => visibleLayers[layer]).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="lg" className="bg-white text-foreground shadow-sm hover:bg-white/90 aria-expanded:bg-white dark:border-border dark:bg-white dark:hover:bg-white/90">
          <IconStack2 aria-hidden />
          {t.map.layers}
          <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{activeCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>{t.map.layers}</PopoverTitle>
          <PopoverDescription>{t.map.layersDescription}</PopoverDescription>
        </PopoverHeader>
        <ul className="flex flex-col">
          {layers.map((layer) => (
            <li key={layer}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <LegendSymbolMark symbol={symbols[layer].symbol} colors={symbols[layer].colors} />
                <span className="flex-1">{t.map.layerNames[layer]}</span>
                <Switch
                  size="sm"
                  checked={visibleLayers[layer]}
                  onCheckedChange={(checked) => onLayerVisibleChange(layer, checked)}
                />
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
