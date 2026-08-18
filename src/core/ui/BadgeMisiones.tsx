import type { PendientesApp } from '../hoy'
import { useT } from '../i18n/useT'

/**
 * El globo de notificación de una app: las misiones que le quedan hoy, como en el
 * icono de una app del teléfono. Lo llevan la pantalla de inicio y el menú lateral,
 * así que el estilo vive aquí y no duplicado en los dos.
 *
 * En ámbar cuando algún bloque agendado ya se pasó de su hora, el mismo aviso que
 * usa el botón «Misiones» del encabezado de cada cuarto.
 */
export function BadgeMisiones({ pendientes, className = '' }: { pendientes: PendientesApp; className?: string }) {
  const t = useT()
  return (
    <span
      aria-label={t('nav.rapido.pendientes', '{n} misiones pendientes', { n: pendientes.cuantos })}
      className={`pointer-events-none grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-black tabular-nums text-white shadow-lg ${
        pendientes.urgente ? 'ui-pop bg-amber-500' : 'bg-red-600'
      } ${className}`}
    >
      {pendientes.cuantos}
    </span>
  )
}
