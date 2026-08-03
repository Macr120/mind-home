import { useState } from 'react'
import type { NodoPlan, PlanMeta } from '../../data/db'
import { DIA_MS, deIso, isoMasDias } from '../../fechaLocal'
import { useT } from '../../i18n/useT'
import { agregarNodoPlan, borrarNodoPlan, moverNodoPlan, renombrarNodoPlan } from '../../planMeta'
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

  const guardarNombre = () => {
    setEditando(false)
    if (plan && nombre.trim() && nombre.trim() !== nodo.nombre) void renombrarNodoPlan(plan, nodo.id, nombre)
  }

  // Los inputs hablan en fechas; el plan guarda días relativos a su arranque.
  const diaDe = (iso: string) =>
    plan ? Math.round((deIso(iso).getTime() - deIso(plan.inicioISO).getTime()) / DIA_MS) : 0

  const agregarHijo = () => {
    if (!plan) return
    const texto = window.prompt(t('cal.plan.nuevoNodo', 'Nombre de la sub-meta'))
    if (texto?.trim()) void agregarNodoPlan(plan, nodo.id, texto)
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
              title={t('cal.plan.fechasNodo', 'Cambiar fechas')}
              className="px-0.5 text-[10px] text-white/30 transition hover:text-white/80"
            >
              <Icono nombre="calendario" />
            </button>
            {profundidad === 0 && (
              <button
                type="button"
                onClick={agregarHijo}
                title={t('cal.plan.agregarNodo', 'Agregar sub-meta a la fase')}
                className="px-0.5 text-[10px] text-white/30 transition hover:text-white/80"
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
      {plan && fechas && (
        <div className="mt-0.5 flex items-center gap-1" style={{ paddingLeft: 14 }}>
          <input
            type="date"
            value={isoMasDias(plan.inicioISO, nodo.ini)}
            min={plan.inicioISO}
            onChange={(e) => {
              // Mover el inicio corre el nodo entero conservando su duración.
              if (e.target.value) void moverNodoPlan(plan, nodo.id, diaDe(e.target.value), diaDe(e.target.value) + (nodo.fin - nodo.ini))
            }}
            title={t('cal.plan.nodoIni', 'Empieza')}
            className="w-[86px] shrink-0 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[9px] tabular-nums text-white/60 focus:outline-none"
          />
          <span className="text-[9px] text-white/30">→</span>
          <input
            type="date"
            value={isoMasDias(plan.inicioISO, nodo.fin)}
            min={isoMasDias(plan.inicioISO, nodo.ini)}
            onChange={(e) => {
              if (e.target.value) void moverNodoPlan(plan, nodo.id, nodo.ini, diaDe(e.target.value))
            }}
            title={t('cal.plan.nodoFin', 'Termina')}
            className="w-[86px] shrink-0 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[9px] tabular-nums text-white/60 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
