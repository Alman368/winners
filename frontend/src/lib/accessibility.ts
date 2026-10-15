export type TextSize = 'normal' | 'large' | 'extraLarge'
export type ColorMode = 'standard' | 'colorblind'

export type AccessibilitySettings = {
  textSize: TextSize
  colorMode: ColorMode
}

const STORAGE_KEY = 'accessibility-settings'
const DEFAULT_SETTINGS: AccessibilitySettings = { textSize: 'normal', colorMode: 'standard' }

export const textSizes: TextSize[] = ['normal', 'large', 'extraLarge']

const ROOT_FONT_SIZE: Record<TextSize, string> = {
  normal: '100%',
  large: '112.5%',
  extraLarge: '125%',
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? (JSON.parse(stored) as AccessibilitySettings) : DEFAULT_SETTINGS
}

export function saveAccessibilitySettings(settings: AccessibilitySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function applyTextSize(textSize: TextSize) {
  document.documentElement.style.fontSize = ROOT_FONT_SIZE[textSize]
}
