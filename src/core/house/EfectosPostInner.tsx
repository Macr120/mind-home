import type { ReactElement } from 'react'
import {
  EffectComposer,
  N8AO,
  Bloom,
  SMAA,
  TiltShift2,
  HueSaturation,
  Vignette,
  Pixelation,
  ColorDepth,
  Sepia,
  Noise,
} from '@react-three/postprocessing'
import type { EfectosConfig, EfectoId } from './estilos'
import { OutlineDepth } from './efectos/OutlineDepth'

/**
 * Compone el postprocesado a partir de la config de efectos (cada efecto con su
 * intensidad 0..1, que aquí se mapea al rango real). El orden importa: oclusión y
 * contornos (usan profundidad) → brillo → color → desenfoque/píxel → viñeta/grano.
 * El efecto 'toon' no es postFX (vive en primitivas.tsx), así que aquí se ignora.
 */
export function EfectosPostInner({ config }: { config: EfectosConfig }) {
  const on = (id: EfectoId) => config[id]?.on === true
  const val = (id: EfectoId) => config[id]?.val ?? 0

  const efectos: ReactElement[] = []
  if (on('oclusion'))
    efectos.push(<N8AO key="ao" quality="performance" halfRes aoRadius={1.2} intensity={val('oclusion') * 3} />)
  if (on('contornos')) efectos.push(<OutlineDepth key="out" grosor={1.2 + val('contornos') * 2.5} />)
  if (on('bloom'))
    efectos.push(<Bloom key="bloom" mipmapBlur intensity={val('bloom') * 1.6} luminanceThreshold={0.6} radius={0.7} />)
  if (on('byn')) efectos.push(<HueSaturation key="byn" saturation={-val('byn')} />)
  if (on('sepia')) efectos.push(<Sepia key="sepia" intensity={val('sepia')} />)
  if (on('miniatura')) efectos.push(<TiltShift2 key="tilt" blur={val('miniatura') * 0.45} />)
  if (on('pixelado')) {
    efectos.push(<Pixelation key="pix" granularity={2 + val('pixelado') * 10} />)
    efectos.push(<ColorDepth key="cd" bits={12} />)
  }
  if (on('vineta')) efectos.push(<Vignette key="vin" offset={0.3} darkness={val('vineta')} />)
  if (on('grano')) efectos.push(<Noise key="noise" premultiply opacity={val('grano') * 0.5} />)
  // Antialias al final, salvo con pixelado (suavizarlo mataría el píxel).
  if (!on('pixelado')) efectos.push(<SMAA key="smaa" />)

  if (efectos.length === 0) return null
  return <EffectComposer multisampling={0}>{efectos}</EffectComposer>
}
