import type { Rutina } from '../../data/db'
import { localeActual, useT, type TFunc } from '../../i18n/useT'
import { diasParaFin, rangoDe } from '../../metas'

/**
 * Lo que falta para que se acabe una meta, como píldora. El plazo ya vivía en
 * `fechaFin`, pero había que abrir la ficha y restar a mano; leído como cuenta
 * regresiva es lo que empuja a ponerse.
 *
 * Va donde la meta ya se ve —su fila de la lista y su barra del calendario—, no
 * en la ficha desplegada: ahí el plazo lo dicen los dos campos de fecha, y el
 * número solo servía a quien ya había ido a buscarlo.
 */

/**
 * Cuánto falta en la unidad que se lee de un vistazo: días de cerca, y meses o
 * años cuando queda lejos («faltan 743 días» no dice nada). Mismo criterio que
 * los trámites del garage.
 */
function corto(dias: number, t: TFunc): string {
  const n = Math.abs(dias)
  if (n > 400) return t('cal.meta.cuentaAnios', '{n} a', { n: Math.round(n / 365) })
  if (n > 60) return t('cal.meta.cuentaMeses', '{n} m', { n: Math.round(n / 30) })
  return t('cal.meta.cuentaDias', '{n} d', { n })
}

/** Día en que se acaba, escrito para leerse (sigue al idioma de Configuraciones). */
function fechaFin(meta: Rutina): string {
  const fin = rangoDe(meta)?.fin
  if (!fin) return ''
  return new Date(fin + 'T12:00').toLocaleDateString(localeActual(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * El número, y el resto en el `title`. Ámbar en la última semana —es cuando el
 * plazo deja de ser un dato y pasa a ser un aviso— y rojo cuando ya se pasó.
 */
export function PildoraCuenta({ meta, sobreColor }: { meta: Rutina; sobreColor?: boolean }) {
  const t = useT()
  const dias = diasParaFin(meta)
  if (dias == null) return null

  const tono =
    dias < 0
      ? 'text-red-400/90'
      : dias <= 7
        ? 'text-amber-300/90'
        : sobreColor
          ? 'text-white/60'
          : 'text-white/40'

  return (
    <span
      title={
        dias < 0
          ? t('cal.meta.cuentaTermino', 'Se acabó el {fecha}', { fecha: fechaFin(meta) })
          : t('cal.meta.cuentaTitulo', 'Cuenta regresiva: se acaba el {fecha}', { fecha: fechaFin(meta) })
      }
      className={`shrink-0 rounded-full bg-black/25 px-1.5 text-[10px] font-bold leading-4 tabular-nums ${tono}`}
    >
      {dias === 0 ? t('cal.meta.cuentaHoy', '¡hoy!') : corto(dias, t)}
    </span>
  )
}
