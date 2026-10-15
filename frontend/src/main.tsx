import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import '@/index.css'
import { applyTextSize, loadAccessibilitySettings } from '@/lib/accessibility'
import '@/lib/maplibre'

applyTextSize(loadAccessibilitySettings().textSize)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
