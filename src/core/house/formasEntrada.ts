import type { Pieza3D } from '../chat/mascotas'
import type { EnlaceObjetoApp } from '../data/db'

/**
 * Objetos que REPRESENTAN una entrada de app en la casa (un libro por obra, un
 * frasco por receta, una mancuerna por ejercicio…): su forma, sus medidas y sus
 * piezas, que se regeneran de la forma, el color y el enlace cada vez que la
 * entrada cambia. Puro, sin stores: lo usan el store, la siembra y el acomodo.
 */

export type FormaEntrada = 'libro' | 'caja' | 'mancuerna' | 'frasco' | 'trofeo' | 'marco'

/** Estantes de entradas: módulos del taller que crecen a lo largo del muro. */
export type TipoEstante = 'librero' | 'estante' | 'rack-mancuernas' | 'especiero' | 'vitrina' | 'repisa-marcos'

/** Tonos de lomo/tapa: se elige uno por título, estable entre sesiones. */
const PALETA = ['#b91c1c', '#c2410c', '#a16207', '#15803d', '#0f766e', '#1d4ed8', '#6d28d9', '#be185d', '#334155']

export function colorDe(texto: string): string {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0
  return PALETA[Math.abs(h) % PALETA.length]
}

/**
 * Qué entrada es, para no enlazarla a dos objetos: la `ref` del grafo o, sin
 * ella, el registro (`dato`). La app entera o una sección no son una entrada y
 * pueden repetirse (null).
 */
export function claveEntrada(e?: EnlaceObjetoApp | null): string | null {
  if (!e) return null
  if (e.ref) return e.ref
  return e.dato ? `${e.plantillaId}|${e.seccion ?? ''}|${e.dato}` : null
}

/** ¿Llevan al mismo sitio? Por la entrada si la hay; si no, por app y sección. */
export function mismaEntrada(a?: EnlaceObjetoApp | null, b?: EnlaceObjetoApp | null): boolean {
  if (!a || !b) return false
  const ka = claveEntrada(a)
  const kb = claveEntrada(b)
  if (ka || kb) return ka === kb
  return a.plantillaId === b.plantillaId && (a.seccion ?? '') === (b.seccion ?? '')
}

/** Disco de la mancuerna: crece con la carga (un récord de 80 kg es más grande que uno de 10). */
function radioMancuerna(kg = 0): number {
  return Math.min(0.12, 0.045 + 0.0011 * Math.max(0, kg))
}
function gruesoDisco(kg = 0): number {
  return 0.03 + Math.min(0.03, 0.0006 * Math.max(0, kg))
}
/** Mitad del agarre entre discos. */
const AGARRE = 0.075

/**
 * Color del disco por carga, en tramos como los discos de un gimnasio: de un
 * vistazo se distingue el ejercicio ligero del pesado.
 */
function colorDisco(kg = 0): string {
  if (kg >= 70) return '#dc2626'
  if (kg >= 50) return '#7c3aed'
  if (kg >= 30) return '#2563eb'
  if (kg >= 20) return '#eab308'
  if (kg >= 10) return '#16a34a'
  return '#6b7280'
}

/** Medidas (m) de cada forma: ancho en la fila, alto y fondo. */
export function medidasEntrada(forma: FormaEntrada, e?: Pick<EnlaceObjetoApp, 'pesoKg'> | null): [number, number, number] {
  switch (forma) {
    case 'libro':
      return [0.05, 0.26, 0.19]
    case 'caja':
      return [0.28, 0.07, 0.28]
    case 'mancuerna': {
      const r = radioMancuerna(e?.pesoKg)
      return [2 * r, 2 * r, 2 * (AGARRE + gruesoDisco(e?.pesoKg)) + 0.03]
    }
    case 'frasco':
      return [0.1, 0.15, 0.1]
    case 'trofeo':
      return [0.12, 0.17, 0.08]
    case 'marco':
      return [0.18, 0.2, 0.1]
  }
}

type V3 = [number, number, number]

/** Lo que dice la mancuerna en su disco: el peso, o «PC» (peso corporal) con 0 kg. */
function textoPeso(e: EnlaceObjetoApp): string {
  if (e.detalle) return e.detalle
  if (e.pesoKg == null) return ''
  return e.pesoKg > 0 ? `${Math.round(e.pesoKg * 10) / 10} kg` : 'PC'
}

/**
 * Piezas del objeto, con la base en y=0 (el apoyo lo sube a la repisa). Sin
 * enlace sale en blanco; con él, el título va pintado donde se ve desde la casa:
 * el lomo del libro, la tapa y el canto de la caja, la etiqueta del frasco, la
 * placa del trofeo, la lámina del marco y, en la mancuerna, el peso en el disco
 * y el ejercicio en una etiqueta al frente.
 */
export function piezasEntrada(forma: FormaEntrada, color: string, e?: EnlaceObjetoApp | null): Pieza3D[] {
  const texto = (e?.titulo ?? '').trim()
  const [w, h, d] = medidasEntrada(forma, e)
  switch (forma) {
    case 'libro':
      return [
        { tipo: 'caja', pos: [0, h / 2, 0], tam: [w, h, d], color },
        // Las hojas: un canto claro un poco hundido respecto a las tapas.
        { tipo: 'caja', pos: [0, h / 2, -0.006], tam: [w * 0.8, h * 0.94, d], color: '#f5f0e1' },
        // El lomo: el plano va girado 90° para que el texto corra a lo alto.
        ...(texto
          ? [{ tipo: 'plano' as const, pos: [0, h / 2, d / 2 + 0.001] as V3, rot: [0, 0, Math.PI / 2] as V3, tam: [h * 0.86, w * 0.8], color, tinta: '#ffffff', texto }]
          : []),
      ]
    case 'caja': {
      const etiqueta = { color: '#f8fafc', tinta: '#111827', texto }
      return [
        { tipo: 'caja', pos: [0, h / 2, 0], tam: [w, h, d], color },
        // La tapa con el título (o, sin título, una franja clara).
        texto
          ? { tipo: 'plano', pos: [0, h + 0.002, 0], rot: [-Math.PI / 2, 0, 0], tam: [w * 0.86, d * 0.6], ...etiqueta }
          : { tipo: 'caja', pos: [0, h + 0.002, 0], tam: [w * 0.8, 0.004, d * 0.6], color: '#f8fafc' },
        // El canto de delante, que es lo que se lee con la caja en la repisa.
        ...(texto ? [{ tipo: 'plano' as const, pos: [0, h / 2, d / 2 + 0.001] as V3, tam: [w * 0.9, h * 0.7], ...etiqueta }] : []),
      ]
    }
    case 'mancuerna': {
      // Acostada a lo hondo de la repisa: el disco de delante mira a la casa.
      const kg = e?.pesoKg ?? 0
      const r = w / 2
      const t = gruesoDisco(kg)
      const zDisco = AGARRE + t / 2
      const frente = AGARRE + t
      const disco = e?.pesoKg != null ? colorDisco(kg) : '#1f2937'
      const peso = e ? textoPeso(e) : ''
      const eje: V3 = [Math.PI / 2, 0, 0]
      return [
        { tipo: 'cilindro', pos: [0, r, 0], rot: eje, tam: [0.016, 0.016, d], color: '#9ca3af', mat: 'metal' },
        { tipo: 'cilindro', pos: [0, r, zDisco], rot: eje, tam: [r, r, t], color: disco },
        { tipo: 'cilindro', pos: [0, r, -zDisco], rot: eje, tam: [r, r, t], color: disco },
        ...(peso ? [{ tipo: 'plano' as const, pos: [0, r, frente + 0.001] as V3, tam: [r * 1.3, r * 0.55], color: disco, tinta: '#ffffff', texto: peso }] : []),
        // El nombre del ejercicio, en una etiqueta parada al pie del disco.
        ...(texto
          ? [{ tipo: 'plano' as const, pos: [0, 0.024, frente + 0.03] as V3, rot: [-0.35, 0, 0] as V3, tam: [w * 0.96, 0.045], color: '#f8fafc', tinta: '#111827', texto }]
          : []),
      ]
    }
    case 'frasco':
      return [
        { tipo: 'cilindro', pos: [0, 0.06, 0], tam: [0.045, 0.045, 0.12], color: '#e0f2fe', mat: 'vidrio' },
        { tipo: 'cilindro', pos: [0, 0.045, 0], tam: [0.04, 0.04, 0.085], color },
        { tipo: 'cilindro', pos: [0, 0.1325, 0], tam: [0.047, 0.047, 0.025], color: '#92400e' },
        ...(texto ? [{ tipo: 'plano' as const, pos: [0, 0.06, 0.046] as V3, tam: [0.07, 0.045], color: '#fef3c7', tinta: '#1f2937', texto }] : []),
      ]
    case 'trofeo': {
      // Dorado si la meta se cumplió; plateado mientras sigue en curso.
      const metal = e?.clase === 'cumplida' ? '#eab308' : '#cbd5e1'
      return [
        { tipo: 'caja', pos: [0, 0.02, 0], tam: [0.09, 0.04, 0.07], color: '#3f2a1d' },
        { tipo: 'cilindro', pos: [0, 0.065, 0], tam: [0.01, 0.014, 0.05], color: metal, mat: 'metal' },
        { tipo: 'cilindro', pos: [0, 0.125, 0], tam: [0.045, 0.018, 0.07], color: metal, mat: 'metal' },
        { tipo: 'caja', pos: [0.05, 0.13, 0], tam: [0.012, 0.03, 0.008], color: metal, mat: 'metal' },
        { tipo: 'caja', pos: [-0.05, 0.13, 0], tam: [0.012, 0.03, 0.008], color: metal, mat: 'metal' },
        ...(texto ? [{ tipo: 'plano' as const, pos: [0, 0.02, 0.0355] as V3, tam: [0.08, 0.03], color: metal, tinta: '#111827', texto }] : []),
      ]
    }
    case 'marco': {
      // Recargado hacia atrás sobre su pata; la lámina va pegada al frente.
      const incl: V3 = [-0.2, 0, 0]
      return [
        { tipo: 'caja', pos: [0, 0.1, 0], rot: incl, tam: [0.16, 0.2, 0.015], color },
        { tipo: 'caja', pos: [0, 0.07, -0.04], rot: [0.35, 0, 0], tam: [0.02, 0.15, 0.01], color },
        {
          tipo: 'plano',
          pos: [0, 0.1015, 0.0076],
          rot: incl,
          tam: [0.13, 0.17],
          color: '#f8fafc',
          ...(texto ? { tinta: '#1f2937', texto } : {}),
        },
      ]
    }
  }
}
