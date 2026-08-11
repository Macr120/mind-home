import { useEffect, useMemo, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLORES_FUNCION, PX_POR_MUESTRA, VISTA_INICIAL } from './constantes'
import type { FuncionGrafica } from './curvas'
import type { Motor } from './motor'
import { PlanoSvg } from './PlanoSvg'
import { resolverEcuacion } from './resolver'
import { muestras, tramosDeXY } from './trazos'
import { MARGEN_PLANO, usePlano } from './usePlano'

/**
 * y = f(x), hasta seis a la vez.
 *
 * Es el único tipo cuyo dominio de muestreo ES la parte del plano que se ve:
 * panear rehace la curva con el trozo nuevo, que es justo lo que se espera de
 * una función. En polar y en paramétrica el dominio es el parámetro y no la
 * vista, y por eso son componentes aparte.
 */
export function Plano2D({ motor, lista }: { motor: Motor | null; lista: FuncionGrafica[] }) {
  const t = useT()
  const plano = usePlano(VISTA_INICIAL)
  const { visible, dentro, px, py, cortePx } = plano
  const [modo, setModo] = useState<'mover' | 'leer'>('mover')
  const [lectura, setLectura] = useState<number | null>(null)

  const dibujables = useMemo(() => lista.filter((f) => f.visible && f.expr.trim()), [lista])
  const colorDe = (id: number) => COLORES_FUNCION[lista.findIndex((f) => f.id === id) % COLORES_FUNCION.length]

  const trazos = useMemo(() => {
    if (!motor) return []
    const n = Math.max(2, Math.round(dentro.w / PX_POR_MUESTRA))
    const xs = muestras(visible.x0, visible.x1, n)
    return dibujables.map((f) => {
      let ys: Float64Array
      try {
        ys = motor.tabular(f.expr, 'x', visible.x0, visible.x1, n)
      } catch {
        return { id: f.id, color: colorDe(f.id), tramos: [] as string[] }
      }
      return { id: f.id, color: colorDe(f.id), tramos: tramosDeXY(xs, ys, px, py, cortePx) }
    })
    // `px`/`py` se derivan de la vista y del tamaño, ya en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, dibujables, visible, dentro.w, dentro.h, cortePx])

  /** Raíces de la primera función visible, recalculadas al soltar el plano. */
  const [raices, setRaices] = useState<{ id: number; xs: number[] } | null>(null)
  useEffect(() => {
    // Todo dentro del temporizador: mientras se panea o se teclea la expresión
    // no tiene sentido resolver, y así el efecto no toca el estado en su cuerpo.
    const tid = window.setTimeout(() => {
      const f = dibujables[0]
      if (!motor || !f) return setRaices(null)
      try {
        const { raices: xs } = resolverEcuacion(motor, f.expr, 'x', visible.x0, visible.x1)
        setRaices({ id: f.id, xs })
      } catch {
        setRaices(null)
      }
    }, 250)
    return () => window.clearTimeout(tid)
  }, [motor, dibujables, visible.x0, visible.x1])

  const valoresEnCursor = useMemo(() => {
    if (lectura == null || !motor) return []
    return dibujables.map((f) => {
      try {
        return { id: f.id, y: motor.compilar(f.expr)({ x: lectura }) }
      } catch {
        return { id: f.id, y: NaN }
      }
    })
  }, [lectura, motor, dibujables])

  return (
    <div className="space-y-2">
      <PlanoSvg
        plano={plano}
        trazos={trazos}
        alMover={(e) => {
          if (modo === 'leer') setLectura(plano.aUnidades(e.clientX, e.clientY).x)
        }}
        alSalir={() => setLectura(null)}
        botones={
          <button
            type="button"
            onClick={() => {
              setModo((m) => (m === 'mover' ? 'leer' : 'mover'))
              setLectura(null)
            }}
            title={t('computo.graf.leer', 'Leer un punto')}
            aria-label={t('computo.graf.leer', 'Leer un punto')}
            className={`rounded-lg px-1.5 py-1 text-xs transition ${
              modo === 'leer' ? 'ui-accent-bg' : 'bg-black/50 text-white/60 hover:text-white'
            }`}
          >
            <Icono nombre="apunta" />
          </button>
        }
        capa={
          <>
            {raices?.xs
              .filter((x) => x >= visible.x0 && x <= visible.x1)
              .map((x) => (
                <circle
                  key={`r${x}`}
                  cx={px(x)}
                  cy={py(0)}
                  r={4}
                  fill="none"
                  stroke={colorDe(raices.id)}
                  strokeWidth={2}
                />
              ))}

            {lectura != null && (
              <>
                <line
                  x1={px(lectura)}
                  y1={MARGEN_PLANO.arr}
                  x2={px(lectura)}
                  y2={MARGEN_PLANO.arr + dentro.h}
                  stroke="color-mix(in srgb, var(--ui-ink) 30%, transparent)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {valoresEnCursor
                  .filter((v) => Number.isFinite(v.y))
                  .map((v) => (
                    <circle key={`c${v.id}`} cx={px(lectura)} cy={py(v.y)} r={3.5} fill={colorDe(v.id)} />
                  ))}
              </>
            )}
          </>
        }
      >
        {lectura != null && (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-lg bg-black/70 px-2 py-1 font-mono text-[11px]">
            x = {lectura.toFixed(3)}
            {valoresEnCursor.map((v, i) => (
              <span key={v.id} style={{ color: colorDe(v.id) }}>
                {' · '}ƒ{i + 1} = {Number.isFinite(v.y) ? v.y.toFixed(3) : '—'}
              </span>
            ))}
          </div>
        )}
      </PlanoSvg>

      <p className="px-1 text-[11px] text-white/35">
        {plano.hubodArrastre() || modo === 'leer'
          ? t('computo.graf.pistaLeer', 'Modo lectura: mueve el dedo sobre la gráfica para leer los valores.')
          : t('computo.graf.pista', 'Arrastra para mover el plano y pellizca para acercarte.')}
      </p>
    </div>
  )
}
