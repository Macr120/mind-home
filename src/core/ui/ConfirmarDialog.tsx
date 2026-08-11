import { useState } from 'react'
import { useConfirmar, type PeticionConfirmar } from '../state/confirmarStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * El único modal de confirmación de la app (montado en `App.tsx`). Lo abre
 * `confirmar()` / `pedirTexto()` de `confirmarStore`, que reemplazan a
 * `window.confirm` / `window.prompt` — poco fiables en WebView/Capacitor.
 *
 * `z-[75]`: por encima de todo lo que puede pedir una confirmación (el tope del
 * resto de la app es `z-[70]`).
 */
export function ConfirmarDialog() {
  const pendiente = useConfirmar((s) => s.pendiente)
  if (!pendiente) return null
  // La `key` reinicia el input en cada pregunta nueva: más barato que sincronizarlo
  // con un efecto, y sin el repintado en cascada que eso arrastra.
  return <Dialogo key={pendiente.id} pendiente={pendiente} />
}

function Dialogo({ pendiente }: { pendiente: PeticionConfirmar }) {
  const t = useT()
  const responder = useConfirmar((s) => s.responder)
  const [texto, setTexto] = useState(pendiente.valor ?? '')

  const esTexto = pendiente.tipo === 'texto'
  const cancelar = () => responder(esTexto ? null : false)
  const aceptar = () => {
    if (!esTexto) return responder(true)
    const limpio = texto.trim()
    responder(limpio || null)
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cancelar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancelar()
        }}
      >
        <header className="mb-4 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
              pendiente.peligro ? 'bg-red-500/20' : 'bg-white/10'
            }`}
          >
            <Icono nombre={pendiente.peligro ? 'basura' : 'ayuda'} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black">{pendiente.titulo}</p>
            {pendiente.mensaje && <p className="text-[11px] text-white/45">{pendiente.mensaje}</p>}
          </div>
          <button
            onClick={cancelar}
            title={t('rutinas.cerrar', 'Cerrar')}
            className="ml-auto shrink-0 rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>

        {esTexto && (
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aceptar()}
            className="mb-4 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/35"
          />
        )}

        <div className="flex gap-2">
          <button
            onClick={cancelar}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            {t('ui.cancelar', 'Cancelar')}
          </button>
          <button
            autoFocus={!esTexto}
            onClick={aceptar}
            disabled={esTexto && !texto.trim()}
            className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition disabled:opacity-40 ${
              pendiente.peligro
                ? 'border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
            }`}
          >
            {pendiente.textoOk ?? t('ui.confirmar', 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  )
}
