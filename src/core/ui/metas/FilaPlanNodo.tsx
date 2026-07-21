import type { NodoPlan } from '../../data/db'
import { Icono } from '../iconos/Icono'

/** La misma sangría que `FilaMeta`: el plan se lee como la lista que va a ser. */
const SANGRIA = 14

/**
 * UN nodo propuesto en la columna de la lista. Deliberadamente inerte: sin
 * palomita, sin "+ submeta" y sin borrar — no es una meta todavía, y ofrecer esos
 * controles prometería escrituras que no existen.
 */
export function FilaPlanNodo({
  nodo,
  profundidad,
  color,
}: {
  nodo: NodoPlan
  profundidad: number
  color: string
}) {
  return (
    <div
      style={{ paddingLeft: profundidad * SANGRIA + 4 }}
      className="flex items-center gap-1.5 py-0.5 pr-1"
    >
      <span className="shrink-0 text-[9px]" style={{ color: `${color}cc` }}>
        <Icono nombre="brillo" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] italic text-white/55">{nodo.nombre}</span>
    </div>
  )
}
