import { useState } from 'react'
import type { NodoPlan, PlanMeta } from '../../data/db'
import { isoMasDias } from '../../fechaLocal'
import { useT } from '../../i18n/useT'
import {
  agregarNodoPlan,
  borrarNodoPlan,
  fecharNodoPlan,
  nodoFechado,
  nodoIncoherente,
  quitarFechasNodoPlan,
  rangoDeNodo,
  renombrarNodoPlan,
} from '../../planMeta'
import { Icono } from '../iconos/Icono'

/** La misma sangría que `FilaMeta`: el plan se lee como la lista que va a ser. */
const SANGRIA = 14

/**
 * UN nodo propuesto en la columna de la lista. Mientras el plan siga siendo
 * propuesta (`plan` presente) el nodo se personaliza aquí: renombrar, mover su
 * periodo, borrarlo o colgarle una sub-meta. Sin `plan` (aceptado) vuelve a ser
 * inerte: lo editable pasan a ser las sub-metas reales.
 */
export function FilaPlanNodo({
  nodo,
  profundidad,
  color,
  plan,
}: {
  nodo: NodoPlan
  profundidad: number
  color: string
  /** El plan dueño, SOLO cuando el nodo es editable (propuesta sin aceptar). */
  plan?: PlanMeta
}) {
  const t = useT()
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(nodo.nombre)
  const [fechas, setFechas] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [nombreHijo, setNombreHijo] = useState('')

  const rango = plan ? rangoDeNodo(plan, nodo) : undefined
  const incoherente = plan ? nodoIncoherente(plan, nodo) : false

  const guardarNombre = () => {
    setEditando(false)
    if (plan && nombre.trim() && nombre.trim() !== nodo.nombre) void renombrarNodoPlan(plan, nodo.id, nombre)
  }

  const crearHijo = () => {
    if (plan && nombreHijo.trim()) void agregarNodoPlan(plan, nodo.id, nombreHijo)
    setNombreHijo('')
  }

  return (
    <div style={{ paddingLeft: profundidad * SANGRIA + 4 }} className="py-0.5 pr-1">
      <div className="group flex items-center gap-1.5">
        <span className="shrink-0 text-[9px]" style={{ color: `${color}cc` }}>
          <Icono nombre="brillo" />
        </span>
        {plan && editando ? (
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={(e) => e.key === 'Enter' && guardarNombre()}
            className="min-w-0 flex-1 rounded border border-white/20 bg-black/40 px-1 py-0 text-[11px] text-white/80 outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] italic text-white/55">{nodo.nombre}</span>
        )}
        {incoherente && (
          <span
            title={t('cal.plan.incoherente', 'Se sale del periodo de su fase')}
            className="shrink-0 text-[9px] text-amber-400"
          >
            <Icono nombre="alerta" />
          </span>
        )}
        {plan && !editando && (
          <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              type="button"
              onClick={() => {
                setNombre(nodo.nombre)
                setEditando(true)
              }}
              title={t('cal.plan.renombrar', 'Renombrar')}
              className="px-0.5 text-[10px] text-white/30 transition hover:text-white/80"
            >
              <Icono nombre="editar" />
            </button>
            <button
              type="button"
              onClick={() => setFechas((v) => !v)}
              title={t('cal.plan.fechasNodo', 'Poner o cambiar fechas')}
              className={`px-0.5 text-[10px] transition hover:text-white/80 ${
                rango ? 'text-white/30' : 'text-violet-300/60'
              }`}
            >
              <Icono nombre="calendario" />
            </button>
            {profundidad === 0 && (
              <button
                type="button"
                onClick={() => setAgregando((v) => !v)}
                title={t('cal.plan.agregarNodo', 'Agregar sub-meta a la fase')}
                className={`px-0.5 text-[10px] transition hover:text-white/80 ${
                  agregando ? 'text-emerald-400' : 'text-white/30'
                }`}
              >
                <Icono nombre="agregar" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void borrarNodoPlan(plan, nodo.id)}
              title={t('rutinas.borrar', 'Borrar')}
              className="px-0.5 text-[10px] text-white/30 transition hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </span>
        )}
      </div>
      {plan && agregando && (
        <div className="mt-0.5" style={{ paddingLeft: 14 }}>
          <input
            autoFocus
            value={nombreHijo}
            onChange={(e) => setNombreHijo(e.target.value)}
            onBlur={() => {
              crearHijo()
              setAgregando(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') crearHijo()
              else if (e.key === 'Escape') setAgregando(false)
            }}
            placeholder={t('cal.plan.nuevoNodo', 'Sub-meta…')}
            className="w-full rounded border border-white/15 bg-black/30 px-1 py-0.5 text-[11px] text-white/90 placeholder:text-white/25 focus:outline-none"
          />
        </div>
      )}

      {plan && fechas && (
        <div className="mt-0.5 flex items-center gap-1" style={{ paddingLeft: 14 }}>
          <input
            type="date"
            value={rango?.ini ?? ''}
            onChange={(e) => {
              if (!e.target.value) return
              // Mover el inicio corre el nodo entero conservando su duración.
              const dias = nodoFechado(nodo) ? nodo.fin - nodo.ini : 0
              void fecharNodoPlan(plan, nodo.id, e.target.value, isoMasDias(e.target.value, dias))
            }}
            title={t('cal.plan.nodoIni', 'Empieza')}
            className="w-[86px] shrink-0 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[9px] tabular-nums text-white/60 focus:outline-none"
          />
          <span className="text-[9px] text-white/30">→</span>
          <input
            type="date"
            value={rango?.fin ?? ''}
            min={rango?.ini}
            disabled={!rango}
            onChange={(e) => {
              if (e.target.value && rango) void fecharNodoPlan(plan, nodo.id, rango.ini, e.target.value)
            }}
            title={t('cal.plan.nodoFin', 'Termina')}
            className="w-[86px] shrink-0 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[9px] tabular-nums text-white/60 focus:outline-none disabled:opacity-40"
          />
          {rango && (
            <button
              type="button"
              onClick={() => void quitarFechasNodoPlan(plan, nodo.id)}
              title={t('cal.plan.quitarFechas', 'Quitarle las fechas')}
              className="px-0.5 text-[9px] text-white/30 transition hover:text-white/80"
            >
              <Icono nombre="quitar" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
