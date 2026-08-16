import type { CSSProperties } from 'react'
import { luminancia } from '../../core/ui/temasUI'

/** Fondo oscuro base de la app: los tonos se apagan mezclando hacia él. */
const FONDO = '#0f1115'

/** Mezcla lineal simple de dos hex #rrggbb (t = peso del primero). */
function mezcla(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + ca.map((v, i) => Math.round(v * t + cb[i] * (1 - t)).toString(16).padStart(2, '0')).join('')
}

/**
 * DOS tonos por app: los menús (niveles 1 y 2, los «títulos» de arriba) van con
 * el color puro y los formularios (nivel 3) con el tono apagado hacia el fondo.
 * Los colores contextuales (verde/rojo, áreas, sangrado…) NO pasan por aquí.
 */
export function tono(c: string, nivel: 1 | 2 | 3): string {
  return nivel === 3 ? mezcla(c, FONDO, 0.58) : c
}

/** Colores semánticos direccionales compartidos: subida verde, bajada roja. */
export const VERDE = '#34d399'
export const ROJO = '#f87171'

/** Sobre colores claros (ámbar, amarillo…) el blanco no llega ni a 3:1: tinta oscura. */
export const tinta = (c: string) => (luminancia(c) > 0.179 ? '#0b1020' : '#ffffff')

/** Pinta el chrome de `.ui-accent-bg` con un acento concreto (color de app ya entonado). */
export const acento = (c?: string): CSSProperties | undefined =>
  c ? ({ '--ui-accent': c, '--ui-accent-ink': tinta(c) } as CSSProperties) : undefined
