import type { FondoId } from './fondos'
import { getFondo } from './fondos'
import type { TemaId } from './temas'
import { getTema } from './temas'
import { colorFondo, estadoCielo } from './cielo'
import type { PisoTipoId } from './pisos'
import {
  PLANO_PAPEL,
  PLANO_PAPEL_BORDE,
  PLANO_GRID_FUERTE,
  PLANO_GRID_SUAVE,
  PLANO_FONDO,
} from './planoGeometria'

export const MAPA_SUPERFICIE_ID = '__mapa_superficie__'

export type MapaSuperficieModo = 'color' | 'textura' | 'imagen' | 'ninguno'

/** Apariencia del área de dibujo (papel sepia), rejilla y base del mapa 3D. */
export interface MapaSuperficieAjustes {
  papelColor: string
  papelBorde: string
  rejillaFuerte: string
  rejillaSuave: string
  modo: MapaSuperficieModo
  colorSuelo: string
  texturaId: PisoTipoId | null
}

export const MAPA_SUPERFICIE_DEFAULT: MapaSuperficieAjustes = {
  papelColor: PLANO_PAPEL,
  papelBorde: PLANO_PAPEL_BORDE,
  rejillaFuerte: PLANO_GRID_FUERTE,
  rejillaSuave: PLANO_GRID_SUAVE,
  modo: 'color',
  colorSuelo: PLANO_PAPEL,
  texturaId: null,
}

export function parseMapaSuperficieRow(
  color?: string,
  nombre?: string,
): MapaSuperficieAjustes {
  const base = { ...MAPA_SUPERFICIE_DEFAULT }
  if (color) base.papelColor = color
  if (!nombre) return base
  try {
    const parsed = JSON.parse(nombre) as Partial<MapaSuperficieAjustes>
    return { ...base, ...parsed, papelColor: color || parsed.papelColor || base.papelColor }
  } catch {
    return base
  }
}

export function serializarMapaSuperficie(a: MapaSuperficieAjustes): { color: string; nombre: string } {
  const { papelColor, ...rest } = a
  return { color: papelColor, nombre: JSON.stringify(rest) }
}

/** Color del margen blanco del plano, sincronizado con el fondo de cielo. */
export function colorMargenPlanoDesdeCielo(opts: {
  fondoId: FondoId
  fondoImagenActivo: number | null
  temaGlobal: TemaId | null
  minutos: number
}): string {
  const { fondoId, fondoImagenActivo, temaGlobal, minutos } = opts
  if (fondoImagenActivo != null) return '#e8eaef'
  const fondoDef = getFondo(fondoId)
  if (fondoDef.id === 'auto') {
    const cielo = estadoCielo(minutos, 40)
    const tema = getTema(temaGlobal)
    const fondo = colorFondo(cielo, tema?.fondo ?? null)
    return aclararParaMargen(fondo)
  }
  return aclararParaMargen(fondoDef.gradiente[1])
}

function aclararParaMargen(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return PLANO_FONDO
  const mix = (c: number) => Math.round(c + (255 - c) * 0.82)
  const r = mix(parseInt(m[1], 16))
  const g = mix(parseInt(m[2], 16))
  const b = mix(parseInt(m[3], 16))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Relleno efectivo del papel del croquis según modo. */
export function rellenoPapelPlano(
  a: MapaSuperficieAjustes,
  imagenUrl?: string,
): {
  tipo: 'color' | 'textura' | 'imagen' | 'ninguno'
  color: string
  textura?: PisoTipoId
  imagenUrl?: string
} {
  if (a.modo === 'imagen' && imagenUrl) {
    return { tipo: 'imagen', color: a.papelColor, imagenUrl }
  }
  if (a.modo === 'ninguno') {
    return { tipo: 'ninguno', color: 'transparent' }
  }
  if (a.modo === 'textura' && a.texturaId) {
    return { tipo: 'textura', color: a.papelColor, textura: a.texturaId }
  }
  return { tipo: 'color', color: a.colorSuelo || a.papelColor }
}
