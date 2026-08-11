import { useMemo } from 'react'
import { useT } from '../../core/i18n/useT'
import { COLORES_PASTEL } from './constantes'
import { hayDatos, type DatosGrafica, type SerieDatos } from './datosGrafica'
import { escalaEje, etiqueta, marcas } from './ejes'

/**
 * Una gráfica de datos en SVG a mano (la regla del proyecto es que las gráficas
 * se hacen con divs/SVG, sin librería de charts).
 *
 * El SVG se dibuja en un lienzo fijo de 640 px y se escala con el contenedor:
 * las hojas se ven en móvil y en escritorio, y así el texto de los ejes no hay
 * que recalcularlo en cada resize.
 *
 * Los huecos NO se interpolan: una celda vacía corta el tramo, igual que en el
 * graficador de funciones. Unir dos puntos por encima de un hueco se lee como
 * un dato que nunca existió.
 */

const ANCHO = 640
const MARGEN = { izq: 48, der: 14, arr: 14, aba: 30 }
/** La rejilla y los rótulos se mezclan con la tinta del tema: valen en claro y en oscuro. */
const REJILLA = 'color-mix(in srgb, var(--ui-ink) 12%, transparent)'
const EJE = 'color-mix(in srgb, var(--ui-ink) 28%, transparent)'
const TINTA = 'color-mix(in srgb, var(--ui-ink) 55%, transparent)'

/** Grupos de puntos seguidos: cada hueco abre un tramo nuevo. */
function tramos(valores: (number | null)[]): { i: number; v: number }[][] {
  const salida: { i: number; v: number }[][] = []
  let actual: { i: number; v: number }[] = []
  valores.forEach((v, i) => {
    if (v == null) {
      if (actual.length) salida.push(actual)
      actual = []
      return
    }
    actual.push({ i, v })
  })
  if (actual.length) salida.push(actual)
  return salida
}

export function GraficaVista({ datos, alto = 240 }: { datos: DatosGrafica; alto?: number }) {
  const t = useT()

  const plano = useMemo(() => {
    const numeros = datos.series.flatMap((s) => s.valores).filter((v): v is number => v != null)
    // Barras y áreas se apoyan en el cero: recortarlo exagera las diferencias.
    const conCero = datos.tipo === 'barras' || datos.tipo === 'area'
    return {
      y: escalaEje(numeros, conCero),
      x: escalaEje(datos.numerosCat.filter((v): v is number => v != null), false),
      n: Math.max(...datos.series.map((s) => s.valores.length), 0),
    }
  }, [datos])

  if (!hayDatos(datos)) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
        {t('computo.grafica.sinDatos', 'El rango no tiene números que graficar.')}
      </p>
    )
  }

  const izq = MARGEN.izq
  const der = ANCHO - MARGEN.der
  const arr = MARGEN.arr
  const aba = alto - MARGEN.aba
  const py = (v: number) => aba - ((v - plano.y.min) / (plano.y.max - plano.y.min || 1)) * (aba - arr)
  /** Centro de la categoría i (barras) y punto de la línea i. */
  const banda = (der - izq) / Math.max(1, plano.n)
  const pxBanda = (i: number) => izq + banda * (i + 0.5)
  const pxLinea = (i: number) => (plano.n > 1 ? izq + ((der - izq) * i) / (plano.n - 1) : (izq + der) / 2)
  const pxValor = (v: number) => izq + ((v - plano.x.min) / (plano.x.max - plano.x.min || 1)) * (der - izq)

  return (
    <div className="space-y-1.5">
      {datos.tipo === 'pastel' ? (
        <Pastel datos={datos} alto={alto} />
      ) : (
        <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="w-full" style={{ height: alto }} role="img">
          {/* Rejilla y rótulos del eje de valores */}
          {marcas(plano.y.min, plano.y.max, plano.y.paso).map((v) => (
            <g key={v}>
              <line x1={izq} x2={der} y1={py(v)} y2={py(v)} stroke={REJILLA} strokeWidth={1} />
              <text x={izq - 6} y={py(v) + 3.5} textAnchor="end" fontSize={10} fill={TINTA}>
                {etiqueta(v, plano.y.paso)}
              </text>
            </g>
          ))}
          {/* La línea del cero se marca aparte: es la referencia de las barras */}
          {plano.y.min < 0 && plano.y.max > 0 && (
            <line x1={izq} x2={der} y1={py(0)} y2={py(0)} stroke={EJE} strokeWidth={1.5} />
          )}
          <line x1={izq} x2={izq} y1={arr} y2={aba} stroke={EJE} strokeWidth={1} />

          {datos.tipo === 'dispersion'
            ? marcas(plano.x.min, plano.x.max, plano.x.paso).map((v) => (
                <text key={v} x={pxValor(v)} y={aba + 14} textAnchor="middle" fontSize={10} fill={TINTA}>
                  {etiqueta(v, plano.x.paso)}
                </text>
              ))
            : datos.etiquetas.map((e, i) => {
                // Con muchas categorías solo se rotula una de cada k: encimadas
                // no se leen y el SVG se llena de tinta.
                const salto = Math.ceil(plano.n / 12)
                if (i % salto !== 0) return null
                return (
                  <text
                    key={i}
                    x={datos.tipo === 'barras' ? pxBanda(i) : pxLinea(i)}
                    y={aba + 14}
                    textAnchor="middle"
                    fontSize={10}
                    fill={TINTA}
                  >
                    {e.length > 10 ? `${e.slice(0, 9)}…` : e}
                  </text>
                )
              })}

          {datos.tipo === 'barras' &&
            datos.series.map((s, si) =>
              s.valores.map((v, i) => {
                if (v == null) return null
                const ancho = (banda * 0.72) / datos.series.length
                const x = pxBanda(i) - (banda * 0.72) / 2 + ancho * si
                const base = py(Math.max(plano.y.min, Math.min(0, plano.y.max)))
                return (
                  <rect
                    key={`${si}-${i}`}
                    x={x}
                    y={Math.min(py(v), base)}
                    width={Math.max(1, ancho - 1)}
                    height={Math.max(1, Math.abs(base - py(v)))}
                    rx={2}
                    fill={s.color}
                  />
                )
              }),
            )}

          {(datos.tipo === 'lineas' || datos.tipo === 'area') &&
            datos.series.map((s, si) =>
              tramos(s.valores).map((tramo, ti) => {
                const puntos = tramo.map((p) => `${pxLinea(p.i)},${py(p.v)}`).join(' ')
                const base = py(Math.max(plano.y.min, Math.min(0, plano.y.max)))
                return (
                  <g key={`${si}-${ti}`}>
                    {datos.tipo === 'area' && tramo.length > 1 && (
                      <polygon
                        points={`${pxLinea(tramo[0].i)},${base} ${puntos} ${pxLinea(tramo[tramo.length - 1].i)},${base}`}
                        fill={s.color}
                        opacity={0.25}
                      />
                    )}
                    <polyline
                      points={puntos}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {tramo.length === 1 && <circle cx={pxLinea(tramo[0].i)} cy={py(tramo[0].v)} r={3} fill={s.color} />}
                  </g>
                )
              }),
            )}

          {datos.tipo === 'dispersion' &&
            datos.series.map((s, si) =>
              s.valores.map((v, i) => {
                const x = datos.numerosCat[i]
                if (v == null || x == null) return null
                return <circle key={`${si}-${i}`} cx={pxValor(x)} cy={py(v)} r={3.5} fill={s.color} opacity={0.85} />
              }),
            )}
        </svg>
      )}

      <Leyenda datos={datos} />
    </div>
  )
}

/** El pastel va aparte: no tiene ejes y reparte una sola serie. */
function Pastel({ datos, alto }: { datos: DatosGrafica; alto: number }) {
  const serie = datos.series[0]
  const partes = serie.valores
    .map((v, i) => ({ v: v == null ? 0 : Math.abs(v), etiqueta: datos.etiquetas[i] ?? String(i + 1), i }))
    .filter((p) => p.v > 0)
  const total = partes.reduce((s, p) => s + p.v, 0)
  const cx = ANCHO / 2
  const cy = alto / 2
  const r = Math.min(alto / 2 - 14, 110)

  // Los ángulos se acumulan con un `reduce`, no con un contador mutable: una
  // variable reasignada dentro del render está prohibida por el lint de hooks.
  const sectores = partes.reduce<{ v: number; etiqueta: string; i: number; a0: number; a1: number }[]>((acc, p) => {
    const a0 = acc.length > 0 ? acc[acc.length - 1].a1 : -Math.PI / 2
    return [...acc, { ...p, a0, a1: a0 + (p.v / total) * Math.PI * 2 }]
  }, [])

  return (
    <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="w-full" style={{ height: alto }} role="img">
      {sectores.map((p) => {
        const { a0, a1 } = p
        const color = COLORES_PASTEL[p.i % COLORES_PASTEL.length]
        const medio = (a0 + a1) / 2
        return (
          <g key={p.i}>
            <path d={sector(cx, cy, r, a0, a1)} fill={color} stroke="var(--ui-panel-2)" strokeWidth={1.5} />
            {/* El porcentaje solo cabe si la rebanada es visible */}
            {a1 - a0 > 0.35 && (
              <text
                x={cx + Math.cos(medio) * r * 0.68}
                y={cy + Math.sin(medio) * r * 0.68 + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#0b1220"
              >
                {Math.round((p.v / total) * 100)}%
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Un sector desde el centro. Una rebanada de casi 360° necesita el flag de arco
 * grande o el `A` de SVG dibuja el complemento (la tarta al revés).
 */
function sector(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + Math.cos(a0) * r
  const y0 = cy + Math.sin(a0) * r
  const x1 = cx + Math.cos(a1) * r
  const y1 = cy + Math.sin(a1) * r
  const grande = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${grande} 1 ${x1} ${y1} Z`
}

function Leyenda({ datos }: { datos: DatosGrafica }) {
  const entradas: { color: string; nombre: string }[] =
    datos.tipo === 'pastel'
      ? datos.series[0].valores
          .map((v, i) => ({
            color: COLORES_PASTEL[i % COLORES_PASTEL.length],
            nombre: datos.etiquetas[i] ?? String(i + 1),
            vacia: v == null || v === 0,
          }))
          .filter((e) => !e.vacia)
      : datos.series.map((s: SerieDatos) => ({ color: s.color, nombre: s.nombre }))

  if (entradas.length < 2) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-white/55">
      {entradas.slice(0, 12).map((e, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: e.color }} />
          {e.nombre}
        </span>
      ))}
    </div>
  )
}
