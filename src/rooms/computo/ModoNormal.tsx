import { useMemo, useRef, useState, type ReactNode } from 'react'
import { anotarCalculo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { BotonIA } from './BotonIA'
import { COLOR, RANGO_RAIZ } from './constantes'
import { OP_EXPLICAR } from './costosIA'
import { explicarPasoAPaso } from './ia'
import type { Motor } from './motor'
import { ErrorMotor } from './motor'
import { esEcuacion, normalizarEcuacion, resolverEcuacion } from './resolver'
import { TecladoMath } from './TecladoMath'
import { useInsercion } from './useInsercion'

/**
 * La calculadora científica de siempre: se escribe una expresión y el resultado
 * sale mientras tecleas.
 *
 * El teclado escribe en un input propio y en pantallas táctiles lo deja en
 * `readOnly`: así no salta el teclado del sistema encima de la mitad de la app.
 * En escritorio se puede teclear normal.
 *
 * De lo científico (senos, raíces, logaritmos, constantes) ya no hay teclado
 * aparte: eso lo cubre la paleta de NOTACIONES, que va encima del teclado y
 * trae mucho más de lo que cabía en dieciséis teclas.
 *
 * El teclado se queda con lo que se pulsa a diario y no está en las notaciones:
 * los dígitos, los paréntesis, borrar, el cambio de ángulos, el «por diez
 * elevado a» y el resolvedor.
 */

const TECLAS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', 'x', '+'],
  // Paréntesis y coma son lo único del viejo teclado científico que las
  // notaciones no escriben solas, y se usan en cada expresión larga.
  ['(', ')', ',', '='],
]

/** Notación científica: `2.5e3` es como mathjs escribe 2.5 × 10³. */
const POR_DIEZ = 'e'

const esTactil = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export function ModoNormal({
  motor,
  entrada,
  onEntrada,
  selector,
}: {
  motor: Motor | null
  entrada: string
  onEntrada: (s: string) => void
  /** El menú de modos, que va en la fila del campo. */
  selector: ReactNode
}) {
  const t = useT()
  const [grados, setGrados] = useState(false)
  const [ans, setAns] = useState<number | null>(null)
  const [solucion, setSolucion] = useState<{ raices: number[]; exacto: boolean; x0: number; x1: number } | null>(null)
  const [pasos, setPasos] = useState<{ de: string; texto: string } | null>(null)
  const [pensando, setPensando] = useState(false)
  const [errorIA, setErrorIA] = useState('')
  // Se mide una vez al montar: el tipo de puntero no cambia a mitad de sesión.
  const [tactil] = useState(esTactil)
  const campo = useRef<HTMLInputElement>(null)

  const scopeBase = useMemo(
    () => ({ ...(motor?.alcanceAngulos(grados) ?? {}), ...(ans != null ? { ans } : {}) }),
    [motor, grados, ans],
  )

  /** Resultado en vivo mientras se escribe (no se guarda hasta confirmar). */
  const vista = useMemo(() => {
    if (!motor || !entrada.trim()) return null
    if (esEcuacion(entrada)) return { texto: t('computo.calc.pulsaResolver', 'Pulsa «Resolver»'), error: false }
    try {
      return { texto: motor.formatear(motor.evaluar(entrada, scopeBase)), error: false }
    } catch (e) {
      return { texto: e instanceof ErrorMotor ? t(e.clave, '…') : '…', error: true }
    }
  }, [motor, entrada, scopeBase, t])

  /**
   * Todo lo que escriben los botones —teclas y notaciones— entra por donde esté
   * el cursor; sin foco en el campo, al final (que es como se usa en táctil).
   */
  const escribir = useInsercion(entrada, onEntrada, campo)

  const calcular = async () => {
    if (!motor || !entrada.trim()) return
    if (esEcuacion(entrada)) return resolver()
    try {
      const bruto = motor.evaluar(entrada, scopeBase)
      const salida = motor.formatear(bruto)
      if (typeof bruto === 'number') setAns(bruto)
      await anotarCalculo({
        tipo: 'calculo',
        entrada,
        salida,
        fecha: fechaLocalISO(),
        creadoEn: new Date().toISOString(),
      })
      onEntrada(salida)
      setSolucion(null)
    } catch {
      /* el error ya se ve en vivo */
    }
  }

  const resolver = async () => {
    if (!motor || !entrada.trim()) return
    const f = normalizarEcuacion(entrada)
    // Se busca en un intervalo fijo y el resultado LO DICE. En el graficador las
    // raíces se marcan sobre lo que se esté viendo, que es donde tiene sentido
    // hablar de "esta parte de la función".
    try {
      const sol = resolverEcuacion(motor, f, 'x', RANGO_RAIZ.x0, RANGO_RAIZ.x1)
      setSolucion(sol)
      const salida =
        sol.raices.length > 0
          ? sol.raices.map((r) => motor.formatear(r)).join(', ')
          : t('computo.calc.sinRaices', 'sin soluciones en el intervalo')
      await anotarCalculo({
        tipo: 'ecuacion',
        entrada,
        salida,
        fecha: fechaLocalISO(),
        creadoEn: new Date().toISOString(),
      })
    } catch {
      setSolucion(null)
    }
  }

  /** El desarrollo de lo que hay escrito. El resultado sigue dándolo el motor. */
  const explicar = async () => {
    const de = entrada.trim()
    if (!de) return
    setErrorIA('')
    setPensando(true)
    try {
      setPasos({ de, texto: await explicarPasoAPaso(de) })
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : t('computo.ia.falloExplicar', 'No se pudo explicar.'))
    } finally {
      setPensando(false)
    }
  }

  return (
    <>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        {/* LA PANTALLA: se queda arriba mientras se teclea abajo. El fondo tiene
            que ser OPACO —`ui-panel-legible` aguanta el modo de interfaz
            transparente, `ui-panel` no— o las teclas se verían pasar por debajo. */}
        <div className="ui-panel-legible sticky top-0 z-10 space-y-2 rounded-xl pb-1">
          <div className="flex items-center gap-2" data-tut="computo.calc.entrada">
            <input
              ref={campo}
              value={entrada}
              readOnly={tactil}
              onChange={(e) => onEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void calcular()
              }}
              placeholder={t('computo.calc.placeholder', '2*sin(pi/4) + log(100, 10)')}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 font-mono text-base outline-none focus:border-accent"
            />
            {selector}
          </div>

          <div className="flex items-baseline gap-2 px-1">
            <span className="font-mono text-sm text-white/45">=</span>
            <span
              className={`min-w-0 flex-1 truncate font-mono text-lg font-bold ${vista?.error ? 'text-white/35' : 'texto-vivo'}`}
              style={vista?.error ? undefined : vivo(COLOR)}
            >
              {vista?.texto ?? ' '}
            </span>
          </div>
        </div>

        {ans != null && (
          <button
            type="button"
            onClick={() => escribir('ans')}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-xs transition hover:bg-white/10"
          >
            ans
          </button>
        )}

        <TecladoMath motor={motor} onInsertar={escribir} abiertaAlPrincipio />

        <div className="grid grid-cols-4 gap-1.5">
          <TeclaAncha
            onClick={() => setGrados((g) => !g)}
            activa={grados}
            texto={grados ? t('computo.calc.grados', 'Grados') : t('computo.calc.radianes', 'Radianes')}
          />
          <TeclaAncha onClick={() => escribir(POR_DIEZ)} texto="×10ⁿ" mono />
          <TeclaAncha
            onClick={() => void resolver()}
            ancla="computo.calc.resolver"
            icono="raiz"
            texto={t('computo.calc.resolver', 'Resolver')}
          />
          <TeclaAncha
            onClick={() => onEntrada(entrada.slice(0, -1))}
            icono="volver"
            etiqueta={t('computo.calc.borrar', 'Borrar')}
          />

          {TECLAS.flat().map((k, i) => (
            <button
              key={`${k}-${i}`}
              type="button"
              onClick={() => (k === '=' ? void calcular() : escribir(k))}
              className="rounded-lg bg-white/10 py-2.5 font-mono text-sm transition hover:bg-white/20"
            >
              {k}
            </button>
          ))}
        </div>

        <BotonIA
          op={OP_EXPLICAR}
          etiqueta={t('computo.ia.explicar', 'Explicar paso a paso')}
          generando={pensando}
          deshabilitado={!entrada.trim()}
          error={errorIA}
          onClick={() => void explicar()}
        />
      </div>

      {pasos && (
        <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-white/45">{pasos.de}</p>
            <button
              type="button"
              onClick={() => setPasos(null)}
              className="shrink-0 text-white/40 transition hover:text-white/80"
              title={t('computo.ia.cerrarPasos', 'Cerrar la explicación')}
              aria-label={t('computo.ia.cerrarPasos', 'Cerrar la explicación')}
            >
              <Icono nombre="cerrar" />
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{pasos.texto}</p>
        </div>
      )}

      {solucion && (
        <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
            {t('computo.calc.soluciones', 'Soluciones')}
          </p>
          {solucion.raices.length === 0 ? (
            <p className="text-sm text-white/55">
              {t('computo.calc.sinRaicesEn', 'No hay soluciones reales entre {a} y {b}.', {
                a: String(solucion.x0),
                b: String(solucion.x1),
              })}
            </p>
          ) : (
            <>
              <p className="texto-vivo font-mono text-lg font-bold" style={vivo(COLOR)}>
                x = {solucion.raices.map((r) => (motor ? motor.formatear(r) : r)).join(', ')}
              </p>
              <p className="text-[11px] text-white/40">
                {solucion.exacto
                  ? t('computo.calc.exactas', 'Raíces exactas del polinomio.')
                  : solucion.raices.length === 1
                    ? t('computo.calc.raizEn', 'Una solución entre {a} y {b}. Puede haber más fuera.', {
                        a: String(solucion.x0),
                        b: String(solucion.x1),
                      })
                    : t('computo.calc.raicesEn', '{n} soluciones entre {a} y {b}. Puede haber más fuera.', {
                        n: String(solucion.raices.length),
                        a: String(solucion.x0),
                        b: String(solucion.x1),
                      })}
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Tecla de la fila de arriba: las que no escriben un carácter suelto sino que
 * hacen algo (cambiar de ángulos, resolver, borrar) o escriben una notación.
 */
function TeclaAncha({
  onClick,
  texto,
  icono,
  etiqueta,
  activa = false,
  mono = false,
  ancla,
}: {
  onClick: () => void
  texto?: string
  icono?: Parameters<typeof Icono>[0]['nombre']
  /** Para las que solo llevan icono: sin esto se quedarían sin nombre. */
  etiqueta?: string
  activa?: boolean
  mono?: boolean
  ancla?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tut={ancla}
      title={etiqueta}
      aria-label={etiqueta}
      className={`truncate rounded-lg px-1 py-2.5 text-xs font-semibold transition ${mono ? 'font-mono' : ''} ${
        activa ? 'ui-accent-bg' : 'bg-white/5 hover:bg-white/15'
      }`}
    >
      {icono && <Icono nombre={icono} />}
      {icono && texto ? ' ' : ''}
      {texto}
    </button>
  )
}
