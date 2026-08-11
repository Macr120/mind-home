import type { VariableFormula } from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { MUESTRAS_PARAM, MUESTRAS_POLAR, RANGO_T, VUELTAS_POLAR } from './constantes'
import type { Motor } from './motor'
import { muestras, type Curva } from './trazos'

/**
 * Los tipos y los datos del modo Gráfica. Sin React y sin JSX a propósito: de
 * aquí leen la tira de tipos, el teclado y los muestreadores, y ninguno de esos
 * sitios debe poder arrastrar el motor (mathjs) al bundle.
 */

export type TipoGrafica = '2d' | 'polar' | 'parametrica' | '3d'

export const TIPOS_GRAFICA: { id: TipoGrafica; icono: NombreIcono; labelEs: string }[] = [
  { id: '2d', icono: 'funcion', labelEs: '2D' },
  { id: 'polar', icono: 'planeta', labelEs: 'Polar' },
  { id: 'parametrica', icono: 'pista', labelEs: 'Paramétrica' },
  { id: '3d', icono: 'caja', labelEs: 'Superficie 3D' },
]

export interface FuncionGrafica {
  id: number
  /** y=f(x), r=f(θ), z=f(x,y) o x(t), según el tipo. */
  expr: string
  /** Solo paramétrica: y(t). Los demás tipos lo ignoran. */
  expr2?: string
  visible: boolean
}

type Rango = [number, number]

/** Una fórmula del formulario llevada a la gráfica, congelada en sus valores. */
export interface ObjetivoFormula {
  /** Identidad de la fórmula: al cambiar, el panel se remonta y se reencuadra. */
  clave: string
  nombre: string
  expresion: string
  /** Símbolo del resultado: la etiqueta del eje vertical. */
  resultado: string
  variables: VariableFormula[]
  /** Valor de todas ellas en el instante de pulsar «Ver en grande». */
  scope: Record<string, number>
  /** Tramo de la barra de cada variable editable: el encuadre inicial. */
  tramos: Record<string, Rango>
  /** El eje que se estaba mirando en la ficha, para abrir lo mismo. */
  ejeX?: string
}

export interface EstadoGrafica {
  tipo: TipoGrafica
  /**
   * UNA LISTA POR TIPO. Compartirla dejaría `sin(x)` dentro de un polar, y eso
   * no es un error visible: `x` sin definir da NaN y el plano sale vacío sin
   * decir por qué.
   */
  listas: Record<TipoGrafica, FuncionGrafica[]>
  /** Cuál se está editando: el teclado y las notaciones escriben ahí. */
  edita: number
  /** Solo paramétrica: si se escribe en x(t) o en y(t). */
  campo: 'expr' | 'expr2'
  /** Rango del parámetro de la paramétrica. */
  rangoT: Rango
  /** null = funciones sueltas. Una fórmula del formulario, si no. */
  objetivo: ObjetivoFormula | null
}

/**
 * Cada tipo arranca con un ejemplo que se entiende de un vistazo: entrar y ver
 * una rosa dibujada explica el modo mejor que cualquier texto de ayuda.
 */
export function estadoGraficaInicial(): EstadoGrafica {
  return {
    tipo: '2d',
    listas: {
      '2d': [{ id: 1, expr: 'sin(x)', visible: true }],
      polar: [{ id: 1, expr: '2*cos(3*theta)', visible: true }],
      parametrica: [{ id: 1, expr: 'cos(t)', expr2: 'sin(2*t)', visible: true }],
      '3d': [{ id: 1, expr: 'sin(x)*cos(y)', visible: true }],
    },
    edita: 1,
    campo: 'expr',
    rangoT: [...RANGO_T] as Rango,
    objetivo: null,
  }
}

/** Las variables que ofrece el teclado en cada tipo. */
export const VARIABLES: Record<TipoGrafica, { escribe: string; muestra: string }[]> = {
  '2d': [{ escribe: 'x', muestra: 'x' }],
  polar: [{ escribe: 'theta', muestra: 'θ' }],
  parametrica: [{ escribe: 't', muestra: 't' }],
  '3d': [
    { escribe: 'x', muestra: 'x' },
    { escribe: 'y', muestra: 'y' },
  ],
}

/** Las que hay que dibujar: encendidas y con algo escrito. */
function dibujables(lista: FuncionGrafica[]): FuncionGrafica[] {
  return lista.filter((f) => f.visible && f.expr.trim())
}

/**
 * r = f(θ) → puntos cartesianos.
 *
 * El dominio es θ y NO la parte del plano que se ve: panear no puede cambiar la
 * forma de la curva. Dos vueltas cierran también las rosas de período no entero
 * (`cos(2.5·θ)`); las de período entero se dibujan dos veces superpuestas, que
 * no cuesta nada. Un radio negativo apunta al lado contrario y sale solo.
 */
export function muestrearPolar(motor: Motor | null, lista: FuncionGrafica[]): Curva[] {
  if (!motor) return []
  const hasta = VUELTAS_POLAR * 2 * Math.PI
  const angulos = muestras(0, hasta, MUESTRAS_POLAR)
  return dibujables(lista).map((f) => {
    let radios: Float64Array
    try {
      radios = motor.tabular(f.expr, 'theta', 0, hasta, MUESTRAS_POLAR)
    } catch {
      return { id: f.id, xs: new Float64Array(0), ys: new Float64Array(0), error: true }
    }
    const xs = new Float64Array(MUESTRAS_POLAR)
    const ys = new Float64Array(MUESTRAS_POLAR)
    for (let i = 0; i < MUESTRAS_POLAR; i++) {
      const r = radios[i]
      xs[i] = r * Math.cos(angulos[i])
      ys[i] = r * Math.sin(angulos[i])
    }
    return { id: f.id, xs, ys }
  })
}

/**
 * (x(t), y(t)) → puntos. Dos pasadas del motor con el mismo parámetro: el caché
 * de compilados hace que la segunda no vuelva a compilar nada.
 */
export function muestrearParametrica(
  motor: Motor | null,
  lista: FuncionGrafica[],
  rango: [number, number],
): Curva[] {
  if (!motor) return []
  const [t0, t1] = rango
  return dibujables(lista)
    .filter((f) => (f.expr2 ?? '').trim())
    .map((f) => {
      try {
        return {
          id: f.id,
          xs: motor.tabular(f.expr, 't', t0, t1, MUESTRAS_PARAM),
          ys: motor.tabular(f.expr2 ?? '', 't', t0, t1, MUESTRAS_PARAM),
        }
      } catch {
        return { id: f.id, xs: new Float64Array(0), ys: new Float64Array(0), error: true }
      }
    })
}
