import { useState } from 'react'

import {
  type AccessibilitySettings,
  type ColorMode,
  type TextSize,
  applyTextSize,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from '@/lib/accessibility'

export function useAccessibilitySettings() {
  const [settings, setSettings] = useState(loadAccessibilitySettings)

  const update = (next: AccessibilitySettings) => {
    saveAccessibilitySettings(next)
    applyTextSize(next.textSize)
    setSettings(next)
  }

  return {
    textSize: settings.textSize,
    colorMode: settings.colorMode,
    setTextSize: (textSize: TextSize) => update({ ...settings, textSize }),
    setColorMode: (colorMode: ColorMode) => update({ ...settings, colorMode }),
  }
}
