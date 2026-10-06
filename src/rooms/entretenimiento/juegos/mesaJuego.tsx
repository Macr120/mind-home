// Piezas que comparten los juegos de mesa en línea: la tarjeta «En línea» del
// selector de modo, la línea de asientos del tablero y lo que necesitan los de
// acción (mesa en vivo) para leer lo que les llega.
import { useEffect, useRef } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { escucharVivo, etiquetaAsiento, type Asiento } from '../../../core/partida/mesa'
import type { JuegoMesa, JugadorSala } from '../../../core/partida/tipos'
import { useT, type TFunc } from '../../../core/i18n/useT'
import type { OpcionModo } from './ElegirModo'

export interface AsientosMesa {
  a: JugadorSala | null
  b: JugadorSala | null
}

/** Cómo se llama al ocupante de un asiento: «Tú» si es el mío, «@alias» si no. */
export function nombreAsiento(
  t: TFunc,
  asientos: AsientosMesa,
  asiento: Asiento,
  miAsiento: Asiento | null,
): string {
  if (asiento === miAsiento) return t('entre.j.tu', 'Tú')
  const j = asientos[asiento]
  return j ? etiquetaAsiento(j) : t('entre.j.mesa.libre', 'Libre')
}

/** Tarjeta «En línea» de `ElegirModo`. Solo se ofrece con sala y alguien más. */
export function opcionEnLinea(t: TFunc, asientos: AsientosMesa, alElegir: () => void): OpcionModo {
  return {
    clave: 'online',
    icono: <Icono nombre="red" />,
    titulo: t('entre.j.modo.online', 'En línea'),
    desc: asientos.a
      ? t('entre.j.modo.onlineDesc', 'Con {n}, por turnos', { n: etiquetaAsiento(asientos.a) })
      : t('entre.j.modo.onlineAbrir', 'Abre la mesa y espera'),
    alElegir,
  }
}

/** Quién está sentado en la mesa, encima del tablero. */
export function BarraMesa({
  abierta,
  cerrada,
  asientos,
  miAsiento,
}: {
  abierta: boolean
  cerrada: boolean
  asientos: AsientosMesa
  miAsiento: Asiento | null
}) {
  const t = useT()
  if (!abierta)
    return (
      <p className="text-xs text-white/45">
        {cerrada ? t('entre.j.mesa.cerrada', 'La mesa se cerró') : t('entre.j.mesa.esperando', 'Abriendo la mesa…')}
      </p>
    )
  return (
    <p className="text-xs text-white/45">
      <Icono nombre="red" /> {nombreAsiento(t, asientos, 'a', miAsiento)} ·{' '}
      {nombreAsiento(t, asientos, 'b', miAsiento)}
      {miAsiento === null && ` · ${t('entre.j.mesa.mirando', 'estás mirando')}`}
    </p>
  )
}

/** Periodo del cuadro y del mando de la mesa en vivo (~15 Hz). */
export const PERIODO_VIVO = 66

/** Número que llega de la otra pantalla: si no es finito, el de respaldo. */
export function numVivo(v: unknown, respaldo: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : respaldo
}

/**
 * Lo último que llegó por la mesa en vivo, en refs: lo lee el bucle del juego
 * sin provocar renders. `llegada` es el `performance.now()` de recepción,
 * para adelantar la pelota el tiempo que lleva en camino.
 */
export function useRecibidoVivo(g: JuegoMesa) {
  const cuadro = useRef<{ d: Record<string, unknown>; llegada: number } | null>(null)
  const mando = useRef<Record<string, unknown> | null>(null)
  useEffect(
    () =>
      escucharVivo(g, (k, d) => {
        if (typeof d !== 'object' || d === null) return
        if (k === 'cuadro') cuadro.current = { d: d as Record<string, unknown>, llegada: performance.now() }
        else mando.current = d as Record<string, unknown>
      }),
    [g],
  )
  return { cuadro, mando }
}
