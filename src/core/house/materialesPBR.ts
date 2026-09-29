import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { useAjustes, type Realismo } from '../state/ajustesStore'
import { esGamaBaja } from '../gamaDispositivo'

/**
 * Materiales PBR opcionales (Configuraciones › Realismo). Cada uno trae color,
 * relieve (normal) y rugosidad de 512 px en `public/textures/<carpeta>_*.jpg`.
 * El color viene en gris con brillo medio fijo: el color del cuarto o del mueble
 * lo tiñe, así la paleta del tema sigue mandando. Las UV van en metros, de modo
 * que una sola textura (con `repeat = 1/tam`) sirve para todas las piezas.
 */
export interface MaterialPBR {
  carpeta: string
  /** Metros que cubre una repetición de la textura. */
  tam: number
  metalness?: number
  /** Su mapa de relieve sería plano: no se descarga (ahorra ~1,3 MB de VRAM). */
  sinRelieve?: true
}

export const MATERIALES_PBR = {
  'muro.yeso': { carpeta: 'muros/yeso', tam: 2 },
  'muro.ladrillo': { carpeta: 'muros/ladrillo', tam: 1.4 },
  'muro.madera': { carpeta: 'muros/madera', tam: 1.6 },
  'muro.concreto': { carpeta: 'muros/concreto', tam: 2 },
  'muro.azulejo': { carpeta: 'muros/azulejo', tam: 1, sinRelieve: true },
  'muro.piedra': { carpeta: 'muros/piedra', tam: 1.5 },
  'mueble.madera': { carpeta: 'muebles/madera', tam: 0.9 },
  'mueble.madera_clara': { carpeta: 'muebles/madera_clara', tam: 0.9, sinRelieve: true },
  'mueble.metal': { carpeta: 'muebles/metal', tam: 0.6, metalness: 0.8, sinRelieve: true },
  'mueble.tela': { carpeta: 'muebles/tela', tam: 0.4 },
  'mueble.cuero': { carpeta: 'muebles/cuero', tam: 0.5 },
  'mueble.plastico': { carpeta: 'muebles/plastico', tam: 0.5, sinRelieve: true },
  // Plantas (no se ofrecen a la IA como material de mueble).
  'planta.barro': { carpeta: 'muebles/barro', tam: 0.35 },
  'planta.follaje': { carpeta: 'muebles/follaje', tam: 0.5 },
  // Techos (con el interruptor de muros).
  'techo.tejas': { carpeta: 'techos/tejas', tam: 2.5 },
  'techo.pizarra': { carpeta: 'techos/pizarra', tam: 2.5 },
  'techo.lamina': { carpeta: 'techos/lamina', tam: 2, metalness: 0.7 },
  'techo.paja': { carpeta: 'techos/paja', tam: 2 },
  // Cuerpos de personajes y animales (procedurales; tampoco van a la IA).
  'cuerpo.piel': { carpeta: 'cuerpo/piel', tam: 0.3 },
  'cuerpo.pelaje': { carpeta: 'cuerpo/pelaje', tam: 0.35 },
  'cuerpo.plumas': { carpeta: 'cuerpo/plumas', tam: 0.3 },
} satisfies Record<string, MaterialPBR>

export type MaterialPbrId = keyof typeof MATERIALES_PBR

export const MATERIALES_MURO = Object.keys(MATERIALES_PBR).filter((k) => k.startsWith('muro.')) as MaterialPbrId[]
export const MATERIALES_MUEBLE = Object.keys(MATERIALES_PBR).filter((k) => k.startsWith('mueble.')) as MaterialPbrId[]

export function esMaterialPbr(id: unknown): id is MaterialPbrId {
  return typeof id === 'string' && id in MATERIALES_PBR
}

/** ¿Está encendida esta mejora del motor? En gama baja nunca. */
export function useRealismo(clave: keyof Realismo): boolean {
  const on = useAjustes((s) => s.realismo[clave])
  return on && !esGamaBaja()
}

export interface MapasPBR {
  map: Texture
  normalMap?: Texture
  roughnessMap: Texture
  metalness: number
}

/**
 * Texturas del material (suspende mientras cargan: úsese bajo <Suspense>). drei
 * las cachea por URL, así que todas las piezas comparten los mismos objetos.
 */
export function useMapasPBR(id: MaterialPbrId): MapasPBR {
  const { carpeta, tam, sinRelieve, ...resto } = MATERIALES_PBR[id] as MaterialPBR
  const base = `/textures/${carpeta}`
  const t: Record<string, Texture> = useTexture({
    map: `${base}_color.jpg`,
    roughnessMap: `${base}_roughness.jpg`,
    ...(sinRelieve ? {} : { normalMap: `${base}_normal.jpg` }),
  })
  return useMemo(() => {
    for (const tex of Object.values(t)) {
      tex.wrapS = tex.wrapT = RepeatWrapping
      tex.repeat.set(1 / tam, 1 / tam)
    }
    t.map.colorSpace = SRGBColorSpace
    return { map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalness: resto.metalness ?? 0 }
  }, [t, tam, resto.metalness])
}
