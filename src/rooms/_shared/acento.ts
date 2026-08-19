import type { CSSProperties } from 'react'
import { luminancia } from '../../core/ui/temasUI'

/**
 * El color de una app ya no es un hex: es `var(--ui-app, <hex de fábrica>)`, que
 * `RoomOverlay` resuelve al color del cuarto abierto. Con eso, la aritmética de
 * `luminancia` no se puede hacer aquí y se delega al navegador.
 */
const esHex = (c: string) => c.startsWith('#')

/** Colores semánticos direccionales compartidos: subida verde, bajada roja. */
export const VERDE = '#34d399'
export const ROJO = '#f87171'

/**
 * Sobre colores claros (ámbar, amarillo…) el blanco no llega ni a 3:1: tinta oscura.
 * Con el color de una app la luminancia no se conoce aquí (es una variable CSS):
 * la tinta la baja `RoomOverlay` ya calculada en `--ui-app-ink`.
 */
export const tinta = (c: string) =>
  esHex(c) ? (luminancia(c) > 0.179 ? '#0b1020' : '#ffffff') : 'var(--ui-app-ink, #ffffff)'

/**
 * Pinta el chrome de `.ui-accent-bg` con un acento concreto. UN SOLO TONO por app:
 * menús y formularios comparten el color del cuarto. Antes los formularios iban
 * apagados hacia el fondo mientras su tinta se calculaba sobre el color puro, así
 * que 14 de 15 apps quedaban por debajo de 4.5:1.
 * Los contextuales (verde/rojo, áreas, modalidades) llegan tal cual y mandan.
 */
export const acento = (c?: string): CSSProperties | undefined =>
  c ? ({ '--ui-accent': c, '--ui-accent-ink': tinta(c) } as CSSProperties) : undefined
