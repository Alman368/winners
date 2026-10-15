export type Bbox = [number, number, number, number]

export type SceneComposite = 'true_color' | 'swir'

export type ScenePass = {
  acquired_at: string
  platform: string
  tile: string
  cloud_cover: number
  epsg: number
}

export type DayOption = {
  day: string
  label: string
}
