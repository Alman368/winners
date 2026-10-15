export type FireOption = {
  id: string
  name: string
  province: string
}

export type DemoFire = FireOption & {
  sceneId: string
}

export const demoFires: DemoFire[] = [
  { id: 'avila', name: 'Navaluenga', province: 'Ávila', sceneId: 'madrid_avila' },
  { id: 'niebla', name: 'Niebla', province: 'Huelva', sceneId: 'niebla' },
  { id: 'la-mierla', name: 'La Mierla', province: 'Guadalajara', sceneId: 'la_mierla' },
]
