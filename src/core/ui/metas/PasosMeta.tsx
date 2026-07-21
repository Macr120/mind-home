import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { useT } from '../../i18n/useT'
import { agregarPaso, borrarPaso, renombrarPaso, togglePasoMeta } from '../../metas'
import { Icono } from '../iconos/Icono'

/**
 * Checklist de una meta. Los pasos se palomean aquí mismo, tenga fecha o no: una
 * meta se cumple una vez, así que su estado es suyo y no del día (a diferencia de
 * una rutina, que lo lleva por fecha en la rejilla).
 */
export function PasosMeta({ meta, sangria }: { meta: Rutina; sangria: number }) {
  const t = useT()
  const [nuevo, setNuevo] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const hechos = new Set(meta.pasosHechos ?? [])

  const confirmarNuevo = () => {
    if (!nuevo.trim()) return
    void agregarPaso(meta, nuevo)
    setNuevo('')
  }

  const cerrarNuevo = () => {
    confirmarNuevo()
    setAgregando(false)
  }

  return (
    <div style={{ paddingLeft: sangria }} className="space-y-0.5 py-0.5 pr-1">
      {meta.pasos.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void togglePasoMeta(meta, i)}
            title={t('cal.marcarHecho', 'Marcar como hecho')}
            className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border text-[9px] transition ${
              hechos.has(i)
                ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
                : 'border-white/25 hover:border-white/50'
            }`}
          >
            {hechos.has(i) ? '✓' : ''}
          </button>
          {editando === i ? (
            <input
              autoFocus
              defaultValue={p.titulo}
              onBlur={(e) => {
                void renombrarPaso(meta, i, e.target.value)
                setEditando(null)
              }}
              // Enter guarda por su cuenta: delegar en blur() falla si el input perdió el foco.
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void renombrarPaso(meta, i, e.currentTarget.value)
                  setEditando(null)
                } else if (e.key === 'Escape') setEditando(null)
              }}
              className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[11px] text-white/90 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditando(i)}
              title={t('cal.meta.pasoRenombrar', 'Doble clic para renombrar el paso')}
              className={`min-w-0 flex-1 truncate text-left text-[11px] text-white/70 ${
                hechos.has(i) ? 'line-through opacity-50' : ''
              }`}
            >
              {p.titulo}
            </button>
          )}
          <button
            type="button"
            onClick={() => void borrarPaso(meta, i)}
            title={t('rutinas.borrar', 'Borrar')}
            className="shrink-0 px-1 text-[10px] text-white/25 transition hover:text-red-400"
          >
            <Icono nombre="basura" />
          </button>
        </div>
      ))}
      {agregando ? (
        <input
          autoFocus
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          // Enter deja la caja lista para el siguiente: los pasos se escriben en ráfaga.
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmarNuevo()
            else if (e.key === 'Escape') setAgregando(false)
          }}
          onBlur={cerrarNuevo}
          placeholder={t('cal.meta.pasoNuevo', 'Agregar un paso…')}
          className="w-full rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[11px] text-white/85 placeholder:text-white/25 focus:outline-none"
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAgregando(true)}
            className="px-1 text-[10px] text-white/35 transition hover:text-white/80"
          >
            + {t('cal.meta.etiquetaPaso', 'paso')}
          </button>
        </div>
      )}
    </div>
  )
}
