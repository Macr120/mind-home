import { useMemo, useState, type ReactNode } from 'react'
import { anotarCalculo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { COLOR, DIM_MATRIZ_INICIAL, MAX_DIM_MATRIZ } from './constantes'
import type { Motor } from './motor'

/**
 * Operaciones con matrices sobre una rejilla, sin escribir corchetes.
 *
 * La cuenta la hace el motor con la expresión de siempre (`[[1,2],[3,4]] *
 * [[5,6],[7,8]]`): aquí solo se arma el texto. Así lo que se guarda en el
 * historial se puede volver a pegar en la calculadora normal.
 *
 * Los errores de mathjs se enseñan traducidos y por su nombre: «no tiene
 * inversa» y «no se pueden multiplicar con esas medidas» son dos problemas
 * distintos y quien los ve necesita saber cuál le tocó.
 */

type Celdas = string[][]

/** Rejilla de ceros del tamaño pedido, conservando lo que ya había escrito. */
function redimensionar(vieja: Celdas, filas: number, cols: number): Celdas {
  return Array.from({ length: filas }, (_, i) =>
    Array.from({ length: cols }, (_, j) => vieja[i]?.[j] ?? '0'),
  )
}

/** La rejilla como literal de mathjs; los huecos valen cero. */
function comoTexto(m: Celdas): string {
  return `[${m.map((f) => `[${f.map((c) => (c.trim() === '' ? '0' : c.trim().replace(',', '.'))).join(', ')}]`).join(', ')}]`
}

const OPERACIONES = [
  { id: 'suma', muestra: 'A + B', dos: true, expr: (a: string, b: string) => `${a} + ${b}` },
  { id: 'resta', muestra: 'A − B', dos: true, expr: (a: string, b: string) => `${a} - ${b}` },
  { id: 'producto', muestra: 'A × B', dos: true, expr: (a: string, b: string) => `${a} * ${b}` },
  { id: 'det', muestra: 'det(A)', dos: false, expr: (a: string) => `det(${a})` },
  { id: 'inv', muestra: 'inv(A)', dos: false, expr: (a: string) => `inv(${a})` },
  { id: 'transpuesta', muestra: 'Aᵀ', dos: false, expr: (a: string) => `transpose(${a})` },
  { id: 'traza', muestra: 'traza(A)', dos: false, expr: (a: string) => `trace(${a})` },
] as const

export function ModoMatrices({ motor, selector }: { motor: Motor | null; selector: ReactNode }) {
  const t = useT()
  const [filas, setFilas] = useState(DIM_MATRIZ_INICIAL)
  const [cols, setCols] = useState(DIM_MATRIZ_INICIAL)
  const [a, setA] = useState<Celdas>(() => redimensionar([], DIM_MATRIZ_INICIAL, DIM_MATRIZ_INICIAL))
  const [b, setB] = useState<Celdas>(() => redimensionar([], DIM_MATRIZ_INICIAL, DIM_MATRIZ_INICIAL))
  const [salida, setSalida] = useState<{ expr: string; texto: string; error: boolean } | null>(null)

  const medir = (f: number, c: number) => {
    setFilas(f)
    setCols(c)
    setA((m) => redimensionar(m, f, c))
    setB((m) => redimensionar(m, f, c))
    setSalida(null)
  }

  const textos = useMemo(() => ({ a: comoTexto(a), b: comoTexto(b) }), [a, b])

  const operar = async (op: (typeof OPERACIONES)[number]) => {
    if (!motor) return
    const expr = op.dos ? op.expr(textos.a, textos.b) : op.expr(textos.a)
    try {
      const texto = String(motor.evaluar(expr))
      setSalida({ expr, texto, error: false })
      await anotarCalculo({
        tipo: 'matriz',
        entrada: expr,
        salida: texto,
        fecha: fechaLocalISO(),
        creadoEn: new Date().toISOString(),
      })
    } catch {
      // mathjs distingue los dos fallos habituales, y son cosas distintas: una
      // matriz sin inversa no es lo mismo que dos medidas que no casan.
      const cuadrada = filas === cols
      setSalida({
        expr,
        texto: !cuadrada
          ? t('computo.matriz.noCuadrada', 'Esa operación pide una matriz cuadrada: cambia las medidas.')
          : t('computo.matriz.singular', 'No se puede: la matriz no tiene inversa (su determinante es cero).'),
        error: true,
      })
    }
  }

  return (
    <div data-tut="computo.calc.matrices" className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        <span className="shrink-0">{t('computo.matriz.medidas', 'Medidas')}</span>
        <SelectorDim valor={filas} onCambiar={(f) => medir(f, cols)} etiqueta={t('computo.matriz.filas', 'Filas')} />
        <span className="shrink-0 text-white/25">×</span>
        <SelectorDim valor={cols} onCambiar={(c) => medir(filas, c)} etiqueta={t('computo.matriz.cols', 'Columnas')} />
        <span className="min-w-0 flex-1" />
        {selector}
      </div>

      <Rejilla nombre="A" celdas={a} onCambiar={setA} />
      <Rejilla nombre="B" celdas={b} onCambiar={setB} />

      <div className="flex flex-wrap gap-1.5">
        {OPERACIONES.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => void operar(op)}
            disabled={!motor}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-xs font-semibold transition hover:bg-white/10 disabled:opacity-40"
          >
            {op.muestra}
          </button>
        ))}
      </div>

      {salida && (
        <div className="space-y-1 rounded-xl bg-black/25 p-3">
          <p className="truncate font-mono text-[10px] text-white/35">{salida.expr}</p>
          {salida.error ? (
            <p className="text-sm text-rose-300">{salida.texto}</p>
          ) : (
            <p className="texto-vivo overflow-x-auto whitespace-pre font-mono text-sm font-bold" style={vivo(COLOR)}>
              {salida.texto}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Una matriz editable. Ancha de más se desliza, no se aplasta. */
function Rejilla({
  nombre,
  celdas,
  onCambiar,
}: {
  nombre: string
  celdas: Celdas
  onCambiar: (c: Celdas) => void
}) {
  const escribir = (i: number, j: number, v: string) =>
    onCambiar(celdas.map((fila, fi) => (fi === i ? fila.map((c, cj) => (cj === j ? v : c)) : fila)))

  return (
    <div className="space-y-1">
      <span className="font-mono text-xs font-semibold text-white/55">{nombre}</span>
      <div className="overflow-x-auto">
        <div
          className="grid w-max gap-1"
          style={{ gridTemplateColumns: `repeat(${celdas[0]?.length ?? 1}, minmax(3rem, 1fr))` }}
        >
          {celdas.map((fila, i) =>
            fila.map((c, j) => (
              <input
                key={`${i}-${j}`}
                inputMode="decimal"
                value={c}
                onChange={(e) => escribir(i, j, e.target.value)}
                aria-label={`${nombre} ${i + 1},${j + 1}`}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-1.5 py-1.5 text-center font-mono text-xs outline-none focus:border-accent"
              />
            )),
          )}
        </div>
      </div>
    </div>
  )
}

function SelectorDim({
  valor,
  onCambiar,
  etiqueta,
}: {
  valor: number
  onCambiar: (n: number) => void
  etiqueta: string
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onCambiar(Number(e.target.value))}
      aria-label={etiqueta}
      className="shrink-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-[11px] text-white outline-none focus:border-accent"
    >
      {Array.from({ length: MAX_DIM_MATRIZ - 1 }, (_, i) => i + 2).map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
}
