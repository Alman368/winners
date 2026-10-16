import type { StyleSpecification } from 'maplibre-gl'

import { baseFetch } from '@/api/client'

const BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const DARK_BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export function fetchBasemapStyle(): Promise<StyleSpecification> {
  return baseFetch<StyleSpecification>(BASEMAP_STYLE_URL)
}

export function fetchDarkBasemapStyle(): Promise<StyleSpecification> {
  return baseFetch<StyleSpecification>(DARK_BASEMAP_STYLE_URL)
}
