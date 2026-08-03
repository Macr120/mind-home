import type { ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Clases compartidas por los formularios de la agenda (canon de los otros cuartos). */
export const INPUT =
  'w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-white/30'
export const TARJETA = 'rounded-xl border border-white/10 bg-white/5 p-3'
export const BTN_SEC = 'rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10'

/** Campo con etiqueta encima, como en el resto de formularios del proyecto. */
export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-white/50">
      {etiqueta}
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

/** Modal centrado; el clic fuera cierra. */
export function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{titulo}</p>
          <button type="button" onClick={onCerrar} className="rounded-lg px-2 py-1 text-white/50 hover:bg-white/10">
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Borrado en dos toques dentro de la propia fila: `confirm()` no encaja con el
 * tema de la casa y en móvil saca al usuario del contexto.
 */
export function BotonBorrar({
  confirmando,
  onPedir,
  onConfirmar,
  onCancelar,
}: {
  confirmando: boolean
  onPedir: () => void
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const t = useT()
  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={onPedir}
        title={t('agenda.borrar', 'Borrar')}
        className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
      >
        <Icono nombre="basura" />
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      {t('agenda.confirmarBorrado', '¿Borrar?')}
      <button type="button" onClick={onConfirmar} className="rounded-lg bg-red-500/20 px-2 py-1 font-semibold">
        {t('agenda.si', 'Sí')}
      </button>
      <button type="button" onClick={onCancelar} className="rounded-lg bg-white/10 px-2 py-1 font-semibold text-white/70">
        {t('agenda.no', 'No')}
      </button>
    </span>
  )
}
