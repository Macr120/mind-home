import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { descartarSubida, useSubidas } from './acciones'

/**
 * Las subidas en curso, flotando abajo a la derecha como en Drive: se pliegan
 * a su cabecera y los errores se descartan uno por uno. Va por portal al body:
 * dentro del cuarto, un ancestro con `backdrop-filter` rompería el `fixed`.
 */
export function Subidas() {
  const t = useT()
  const lista = useSubidas((s) => s.lista)
  const [plegado, setPlegado] = useState(false)
  if (!lista.length) return null
  const enCurso = lista.filter((s) => !s.error).length
  return createPortal(
    <div className="ui-panel fixed bottom-4 end-4 z-[70] w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      <button
        type="button"
        onClick={() => setPlegado((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-white/5"
      >
        <span className="truncate">
          <Icono nombre="subir" />{' '}
          {enCurso
            ? t('archivos.subiendo', 'Subiendo {n} elementos', { n: enCurso })
            : t('archivos.subidasConError', '{n} con error', { n: lista.length })}
        </span>
        <Icono nombre={plegado ? 'plegado' : 'desplegado'} className="text-white/50" />
      </button>
      {!plegado && (
        <div className="max-h-64 space-y-2 overflow-y-auto border-t border-white/10 p-3">
          {lista.map((s) => (
            <div key={s.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{s.nombre}</span>
                {s.error ? (
                  <button
                    type="button"
                    onClick={() => descartarSubida(s.id)}
                    aria-label={t('rutinas.cerrar', 'Cerrar')}
                    className="rounded px-1 text-white/50 hover:bg-white/10"
                  >
                    <Icono nombre="cerrar" />
                  </button>
                ) : (
                  <span className="shrink-0 text-white/50">{Math.round(s.fraccion * 100)} %</span>
                )}
              </div>
              {s.error ? (
                <p className="text-xs text-red-400">{s.error}</p>
              ) : (
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${s.fraccion * 100}%`, background: COLOR }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
