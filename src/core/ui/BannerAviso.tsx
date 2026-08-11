import type { ReactNode } from 'react'
import { vivo } from './estilos'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

/**
 * Aviso que ya sonó: se queda arriba de la app hasta que lo cierras.
 *
 * Vivía dentro de `rooms/descanso/DescansoApp.tsx`; se movió aquí al necesitarla
 * también el aviso de las actividades agendadas, que desde entonces es una fila
 * más de la lista de hoy (`ui/hoy/FilaHoy.tsx`). `acciones` se le añadió para
 * aquello: un aviso puede ofrecer registrar de un toque, no solo enterarse.
 */
export function BannerAviso({
  icono,
  titulo,
  cuerpo,
  color,
  ok,
  onCerrar,
  acciones,
}: {
  icono: NombreIcono
  titulo: string
  cuerpo: string
  color: string
  ok: string
  onCerrar: () => void
  /** Botones antes del de cerrar (registrar, ir a la sección…). */
  acciones?: ReactNode
}) {
  return (
    <div
      className="ui-pop flex items-center gap-3 rounded-xl border p-3"
      style={{ borderColor: `${color}66`, background: `${color}1f` }}
    >
      <span className="text-2xl">
        <Icono nombre={icono} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold texto-vivo" style={vivo(color)}>
          {titulo}
        </p>
        <p className="text-xs text-white/60">{cuerpo}</p>
      </div>
      {acciones}
      <button
        type="button"
        onClick={onCerrar}
        className="shrink-0 rounded-lg border border-white/15 px-3 py-1 text-xs font-bold text-white/70 transition hover:text-white"
      >
        {ok}
      </button>
    </div>
  )
}
