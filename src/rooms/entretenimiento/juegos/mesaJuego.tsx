// Piezas de interfaz que comparten los cuatro juegos de mesa en línea: la
// tarjeta «En línea» del selector de modo y la línea de asientos del tablero.
import { Icono } from '../../../core/ui/iconos/Icono'
import { etiquetaAsiento, type Asiento } from '../../../core/partida/mesa'
import type { JugadorSala } from '../../../core/partida/tipos'
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
