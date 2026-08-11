import { useMemo, useState } from 'react'
import type { VariableFormula } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { ALTO_GRAFICA_FICHA, COLOR } from './constantes'
import { alcanceDe } from './formulas'
import { GraficaFormula, SelectorEje } from './GraficaFormula'
import type { Motor } from './motor'
import { ErrorMotor } from './motor'
import { Tex } from './Tex'

/** Lo que la ficha necesita saber, venga del catálogo o de la base. */
export interface FormulaVista {
  nombre: string
  tex?: string
  expresion: string
  resultado: string
  descripcion?: string
  variables: VariableFormula[]
}

type Rango = [number, number]

/**
 * Lo que la ficha entrega al graficar: solo lo que ella sabe y nadie más —los
 * valores puestos ahora mismo, el tramo de cada barra y el eje que se estaba
 * mirando—. Quién es la fórmula lo pone su dueño, que tiene el registro entero.
 */
export interface DesdeFicha {
  scope: Record<string, number>
  tramos: Record<string, Rango>
  ejeX: string
}

/**
 * Tramo de la barra de una variable a partir de su valor: alrededor de cero si
 * no vale nada todavía, y si ya tiene un valor, de 0 (o del doble negativo)
 * hasta el doble. Se calcula UNA vez —al encender las barras— y luego no se
 * mueve: si se recalculara con cada arrastre, la barra huiría bajo el dedo.
 */
function tramoDe(valor: number | undefined): Rango {
  const v = Number.isFinite(valor) ? (valor as number) : 0
  if (v === 0) return [-10, 10]
  const m = Math.abs(v) * 2
  return v > 0 ? [0, m] : [-m, 0]
}

/**
 * La ficha de una fórmula: se ve grande en LaTeX, se DIBUJA, y debajo cada
 * variable se arrastra con su barra. Es la pantalla que justifica guardar
 * fórmulas — si solo se pudieran leer, un papel haría lo mismo.
 *
 * La gráfica va entre la fórmula y las variables a propósito: mover una barra y
 * ver moverse la curva es el motivo de que las barras existan, y con la curva
 * en otra pantalla eso no pasaba. «Ver en grande» la manda al modo Gráfica, que
 * es donde hay sitio, superficie 3D y varias curvas a la vez.
 */
export function FichaFormula({
  formula,
  motor,
  acciones,
  onGraficar,
  className = '',
}: {
  formula: FormulaVista
  motor: Motor | null
  /** Botonera propia de quien la monta (copiar, editar, imprimir). */
  acciones?: React.ReactNode
  /** Sin esto no se pinta el botón «Ver en grande»: nadie escucharía. */
  onGraficar?: (d: DesdeFicha) => void
  className?: string
}) {
  const t = useT()
  const [valores, setValores] = useState<Record<string, string>>({})

  const editables = formula.variables.filter((v) => !v.constante)
  const constantes = formula.variables.filter((v) => v.constante)

  /**
   * Los tramos de las barras se fijan AQUÍ, al montar, y no se recalculan: si
   * dependieran del valor de ahora, la barra huiría bajo el dedo al arrastrarla.
   * `valores` está vacío todavía, así que manda el valor de fábrica.
   */
  const [tramos, setTramos] = useState<Record<string, Rango>>(() => {
    const inicial = alcanceDe(formula.variables)
    return Object.fromEntries(
      formula.variables.filter((v) => !v.constante).map((v) => [v.simbolo, tramoDe(inicial[v.simbolo])]),
    )
  })

  const [ejeSel, setEje] = useState(() => editables[0]?.simbolo ?? '')
  // Se VALIDA contra las variables de ahora: editar la fórmula puede borrar la
  // que estaba elegida, y el desplegable enseñaría una y se dibujaría otra.
  const eje = editables.some((v) => v.simbolo === ejeSel) ? ejeSel : (editables[0]?.simbolo ?? '')

  const tex = formula.tex ?? (motor ? `${formula.resultado} = ${motor.aTex(formula.expresion)}` : formula.expresion)

  /** Los valores de ahora, ya en números (lo que se calcula y se dibuja). */
  const scope = useMemo(() => alcanceDe(formula.variables, valores), [formula.variables, valores])

  const resultado = useMemo(() => {
    if (!motor) return null
    try {
      return { valor: motor.formatear(motor.evaluar(formula.expresion, scope)), error: null as string | null }
    } catch (e) {
      const clave = e instanceof ErrorMotor ? e.clave : 'computo.error.dominio'
      return { valor: '', error: clave }
    }
  }, [motor, formula.expresion, scope])

  const tramo = (s: string): Rango => tramos[s] ?? tramoDe(scope[s])

  const escribirValor = (simbolo: string, texto: string) => {
    setValores((s) => ({ ...s, [simbolo]: texto }))
    // Escribir a mano un valor fuera de la barra la reencuadra: si no, el
    // arrastre siguiente daría un salto de vuelta al tramo viejo.
    const n = Number(texto.replace(',', '.'))
    if (Number.isFinite(n)) {
      const [a, b] = tramo(simbolo)
      if (n < a || n > b) setTramos((r) => ({ ...r, [simbolo]: tramoDe(n) }))
    }
  }

  /**
   * Arrastrar la barra. Fija el tramo la PRIMERA vez por si esta variable nació
   * después de montar la ficha: editar la fórmula abierta la deja con el mismo
   * `id`, así que no se remonta y una variable nueva no tendría tramo.
   */
  const deslizar = (simbolo: string, texto: string) => {
    setTramos((r) => (r[simbolo] ? r : { ...r, [simbolo]: tramoDe(scope[simbolo]) }))
    setValores((s) => ({ ...s, [simbolo]: texto }))
  }

  const ampliar = (simbolo: string) =>
    setTramos((r) => {
      const [a, b] = r[simbolo] ?? tramoDe(scope[simbolo])
      const centro = (a + b) / 2
      const medio = (b - a) || 10
      return { ...r, [simbolo]: [centro - medio, centro + medio] }
    })

  /** Los tramos de TODAS las barras, los tocados y los que aún valen por defecto. */
  const tramosDeAhora = () => Object.fromEntries(editables.map((v) => [v.simbolo, tramo(v.simbolo)]))

  return (
    <div className={`space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`} data-tut="computo.form.ficha">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{formula.nombre}</h3>
          {formula.descripcion && <p className="mt-0.5 text-xs text-white/50">{formula.descripcion}</p>}
        </div>
        {acciones}
      </div>

      <div className="mph-formula overflow-x-auto rounded-xl bg-black/25 px-3 py-4 text-center text-lg">
        <Tex tex={tex} motor={motor} bloque crudo={`${formula.resultado} = ${formula.expresion}`} />
      </div>

      {editables.length > 0 && (
        <div className="space-y-1.5">
          {editables.length > 1 && (
            <div className="flex items-center gap-2 text-[11px] text-white/45">
              <span className="shrink-0">{t('computo.form.eje', 'Eje')}</span>
              <SelectorEje valor={eje} variables={editables} onCambiar={setEje} />
            </div>
          )}
          <GraficaFormula
            // El encuadre se calcula al montar: la `key` la remonta al cambiar
            // de eje, al ampliar el tramo y cuando por fin llega el motor. Los
            // tramos están FIJOS, así que arrastrar no remonta nada y la curva
            // se mueve sin parpadear.
            key={`${eje}:${tramo(eje).join(':')}${motor ? ':m' : ''}`}
            motor={motor}
            expresion={formula.expresion}
            resultado={formula.resultado}
            ejeX={eje}
            scope={scope}
            rango={tramo(eje)}
            alto={ALTO_GRAFICA_FICHA}
          />
        </div>
      )}

      {editables.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {editables.map((v) => {
            const texto = valores[v.simbolo] ?? (v.valor != null ? String(v.valor) : '')
            const [min, max] = tramo(v.simbolo)
            return (
              <label key={v.simbolo} className="block">
                <span className="block truncate text-[11px] text-white/55">
                  <span className="font-mono font-semibold text-white/80">{v.simbolo}</span> · {v.nombre}
                  {v.unidad ? ` (${v.unidad})` : ''}
                </span>
                <input
                  inputMode="decimal"
                  value={texto}
                  onChange={(e) => escribirValor(v.simbolo, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 font-mono text-sm outline-none focus:border-accent"
                />
                {/* La barra DEBAJO del campo, no a su derecha: así el campo se
                    queda entero y las dos cosas se ven a la vez. */}
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={(max - min) / 200 || 0.01}
                    value={Number.isFinite(scope[v.simbolo]) ? scope[v.simbolo] : 0}
                    onChange={(e) => deslizar(v.simbolo, e.target.value)}
                    className="min-w-0 flex-1"
                    style={{ accentColor: COLOR }}
                    aria-label={v.nombre}
                  />
                  <button
                    type="button"
                    onClick={() => ampliar(v.simbolo)}
                    className="shrink-0 rounded px-1 py-0.5 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/80"
                    title={t('computo.form.ampliarTramo', 'Ampliar el tramo de la barra ({min} a {max})', {
                      min: String(Math.round(min * 100) / 100),
                      max: String(Math.round(max * 100) / 100),
                    })}
                    aria-label={t('computo.form.ampliar', 'Ampliar el tramo')}
                  >
                    <Icono nombre="expandir" />
                  </button>
                </div>
              </label>
            )
          })}
        </div>
      )}

      {constantes.length > 0 && (
        <p className="text-[11px] text-white/40">
          {t('computo.form.constantes', 'Constantes: {lista}', {
            lista: constantes.map((c) => `${c.simbolo} = ${c.valor}${c.unidad ? ` ${c.unidad}` : ''}`).join(' · '),
          })}
        </p>
      )}

      <div className="flex items-baseline gap-2 rounded-xl bg-black/25 px-3 py-2">
        <span className="font-mono text-sm text-white/55">{formula.resultado} =</span>
        {resultado?.error ? (
          <span className="text-sm text-rose-300">{t(resultado.error, 'No se puede calcular con esos valores')}</span>
        ) : (
          <span className="texto-vivo min-w-0 flex-1 truncate font-mono text-lg font-bold" style={vivo(COLOR)}>
            {resultado?.valor ?? '…'}
          </span>
        )}
      </div>

      {editables.length > 0 && onGraficar && (
        <button
          type="button"
          onClick={() => onGraficar({ scope, tramos: tramosDeAhora(), ejeX: eje })}
          className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Icono nombre="funcion" /> {t('computo.form.verEnGrande', 'Ver en grande')}
        </button>
      )}
    </div>
  )
}

/** Botón redondo de la botonera de la ficha. */
export function BotonFicha({
  icono,
  etiqueta,
  onClick,
  activo = false,
}: {
  icono: Parameters<typeof Icono>[0]['nombre']
  etiqueta: string
  onClick: () => void
  activo?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className={`shrink-0 rounded-lg px-2 py-1.5 text-sm transition ${
        activo ? 'ui-accent-bg' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
