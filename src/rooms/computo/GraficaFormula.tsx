import { useMemo } from 'react'
import type { VariableFormula } from '../../core/data/db'
import { COLOR, PX_POR_MUESTRA } from './constantes'
import type { Motor } from './motor'
import { PlanoSvg } from './PlanoSvg'
import { encuadrarXY, muestras, tramosDeXY } from './trazos'
import { MARGEN_PLANO, usePlano } from './usePlano'
import type { Vista } from './useVistaSvg'

/**
 * La fórmula dibujada: se elige QUÉ variable va en el eje X y el resto se quedan
 * en el valor que tengan puesto.
 *
 * El encuadre se calcula al montar a partir del tramo de la variable elegida;
 * cambiar de eje remonta el componente (`key` en quien la monta) y con eso se
 * reencuadra sin efectos que toquen el estado.
 */

const MUESTRAS_ENCUADRE = 240

/** Ventana que enseña la curva entera: el tramo de la barra y lo que valga ahí. */
function encuadre(
  motor: Motor | null,
  expresion: string,
  ejeX: string,
  scope: Record<string, number>,
  rango: [number, number],
): Vista {
  const [x0, x1] = rango
  if (!motor) return { x0, x1, y0: -1, y1: 1 }
  try {
    const ys = motor.tabular(expresion, ejeX, x0, x1, MUESTRAS_ENCUADRE, scope)
    const v = encuadrarXY([{ id: 0, xs: muestras(x0, x1, MUESTRAS_ENCUADRE), ys }])
    // La X la manda el tramo de la barra, no el contenido: solo se toma la Y.
    return v ? { x0, x1, y0: v.y0, y1: v.y1 } : { x0, x1, y0: -1, y1: 1 }
  } catch {
    return { x0, x1, y0: -1, y1: 1 }
  }
}

export function GraficaFormula({
  motor,
  expresion,
  resultado,
  ejeX,
  scope,
  rango,
  alto,
}: {
  motor: Motor | null
  expresion: string
  /** Símbolo del resultado: la etiqueta del eje vertical. */
  resultado: string
  /** Variable que va en el eje horizontal. */
  ejeX: string
  /** Valor de TODAS las variables (el del eje X marca el punto actual). */
  scope: Record<string, number>
  /** Tramo de la variable del eje X (el mismo de su barra). */
  rango: [number, number]
  /** Alto FIJO en CSS. Sin él manda la preferencia del usuario. */
  alto?: string
}) {
  const inicial = useMemo(
    () => encuadre(motor, expresion, ejeX, scope, rango),
    // Solo al montar: el componente se remonta al cambiar de eje o de tramo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const plano = usePlano(inicial)
  const { visible, dentro, px, py, cortePx } = plano

  /** La curva, partida en tramos continuos. El dominio ES la vista. */
  const trazos = useMemo(() => {
    if (!motor) return []
    const n = Math.max(2, Math.round(dentro.w / PX_POR_MUESTRA))
    let ys: Float64Array
    try {
      ys = motor.tabular(expresion, ejeX, visible.x0, visible.x1, n, scope)
    } catch {
      return []
    }
    const xs = muestras(visible.x0, visible.x1, n)
    return [{ id: 0, color: COLOR, tramos: tramosDeXY(xs, ys, px, py, cortePx) }]
    // `px`/`py` se derivan de la vista y del tamaño, ya en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, expresion, ejeX, scope, visible, dentro.w, dentro.h, cortePx])

  /** Dónde está ahora mismo la fórmula con los valores puestos. */
  const punto = useMemo(() => {
    if (!motor) return null
    const x = scope[ejeX]
    if (!Number.isFinite(x)) return null
    try {
      const y = motor.compilar(expresion)({ ...scope, [ejeX]: x })
      return Number.isFinite(y) ? { x, y } : null
    } catch {
      return null
    }
  }, [motor, expresion, ejeX, scope])

  return (
    <PlanoSvg
      plano={plano}
      trazos={trazos}
      alto={alto}
      capa={
        // Dónde estás con los valores de ahora: se mueve con las barras.
        punto ? (
          <>
            <line
              x1={px(punto.x)}
              y1={MARGEN_PLANO.arr}
              x2={px(punto.x)}
              y2={MARGEN_PLANO.arr + dentro.h}
              stroke="color-mix(in srgb, var(--ui-ink) 40%, transparent)"
              strokeDasharray="3 3"
            />
            <circle cx={px(punto.x)} cy={py(punto.y)} r={4.5} fill={COLOR} stroke="#000" strokeWidth={1} />
          </>
        ) : null
      }
    >
      <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-lg bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/70">
        {resultado} ({ejeX})
        {punto && ` · ${ejeX} = ${punto.x.toFixed(3)} → ${punto.y.toFixed(3)}`}
      </div>
    </PlanoSvg>
  )
}

/**
 * Desplegable de qué variable va en un eje (sin repetir la del otro).
 *
 * Vive aquí y no en la ficha ni en el panel porque es lo único que los dos
 * comparten: si estuviera en `FichaFormula`, el modo Gráfica arrastraría la
 * ficha entera —y con ella KaTeX— para reusar veinte líneas.
 */
export function SelectorEje({
  valor,
  variables,
  excluye,
  onCambiar,
}: {
  valor: string
  variables: VariableFormula[]
  excluye?: string
  onCambiar: (s: string) => void
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      className="shrink-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px] text-white outline-none focus:border-accent"
    >
      {variables
        .filter((v) => v.simbolo !== excluye)
        .map((v) => (
          <option key={v.simbolo} value={v.simbolo}>
            {v.simbolo} · {v.nombre}
          </option>
        ))}
    </select>
  )
}
