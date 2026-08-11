/**
 * Las funciones que entiende una hoja, en español.
 *
 * No se traducen a nombres de mathjs para evaluar: se le pasan tal cual en el
 * ámbito, así que `SUMA(1,2,3)` llama directamente a la implementación de aquí.
 * El mapa a inglés solo hace falta al EXPORTAR a .xlsx, porque el OOXML guarda
 * siempre los nombres canónicos y Excel los vuelve a mostrar en el idioma del
 * usuario.
 *
 * Los rangos llegan ya expandidos a argumentos sueltos (`SUMA(A1:A3)` se
 * reescribe como `SUMA(1,2,3)`), por eso todas son variádicas.
 */
import { fechaLocalISO } from '../../core/fechaLocal'

type Valor = number | string | boolean

const numeros = (args: Valor[]): number[] =>
  args.map((a) => (typeof a === 'number' ? a : typeof a === 'boolean' ? (a ? 1 : 0) : Number(a))).filter(Number.isFinite)

const suma = (args: Valor[]) => numeros(args).reduce((s, x) => s + x, 0)

/** Compara un valor con un criterio de CONTAR.SI / SUMAR.SI ('>3', '<=0', 'sí'). */
function cumple(valor: Valor, criterio: Valor): boolean {
  if (typeof criterio === 'string') {
    const m = /^(<=|>=|<>|<|>|=)\s*(.*)$/.exec(criterio.trim())
    if (m) {
      const [, op, resto] = m
      const n = Number(resto)
      const a = typeof valor === 'number' ? valor : Number(valor)
      if (Number.isFinite(n) && Number.isFinite(a)) {
        if (op === '<') return a < n
        if (op === '>') return a > n
        if (op === '<=') return a <= n
        if (op === '>=') return a >= n
        if (op === '<>') return a !== n
        return a === n
      }
      const texto = String(valor).toLowerCase()
      const busca = resto.toLowerCase()
      return op === '<>' ? texto !== busca : texto === busca
    }
  }
  if (typeof valor === 'number' && typeof criterio !== 'number') {
    const n = Number(criterio)
    if (Number.isFinite(n)) return valor === n
  }
  return String(valor).toLowerCase() === String(criterio).toLowerCase()
}

/** El ámbito que se le añade a mathjs al evaluar una celda. */
export const FUNCIONES_HOJA: Record<string, (...args: Valor[]) => Valor> = {
  SUMA: (...a) => suma(a),
  PRODUCTO: (...a) => numeros(a).reduce((s, x) => s * x, 1),
  PROMEDIO: (...a) => {
    const ns = numeros(a)
    return ns.length ? suma(ns) / ns.length : 0
  },
  // CONTAR solo cuenta números; CONTARA cuenta todo lo que no esté vacío.
  CONTAR: (...a) => numeros(a).length,
  CONTARA: (...a) => a.filter((x) => x !== '' && x != null).length,
  MAX: (...a) => {
    const ns = numeros(a)
    return ns.length ? Math.max(...ns) : 0
  },
  MIN: (...a) => {
    const ns = numeros(a)
    return ns.length ? Math.min(...ns) : 0
  },
  MEDIANA: (...a) => {
    const ns = numeros(a).sort((x, y) => x - y)
    if (!ns.length) return 0
    const m = Math.floor(ns.length / 2)
    return ns.length % 2 ? ns[m] : (ns[m - 1] + ns[m]) / 2
  },
  DESVEST: (...a) => {
    const ns = numeros(a)
    if (ns.length < 2) return 0
    const media = suma(ns) / ns.length
    return Math.sqrt(ns.reduce((s, x) => s + (x - media) ** 2, 0) / (ns.length - 1))
  },
  SI: (cond, siSi, siNo) => (cond === true || cond === 1 ? (siSi ?? 0) : (siNo ?? 0)),
  Y: (...a) => a.every((x) => x === true || x === 1),
  O: (...a) => a.some((x) => x === true || x === 1),
  NO: (x) => !(x === true || x === 1),
  REDONDEAR: (x, dec) => {
    const n = Number(x)
    const d = Number(dec ?? 0)
    const f = 10 ** (Number.isFinite(d) ? d : 0)
    return Math.round(n * f) / f
  },
  ENTERO: (x) => Math.floor(Number(x)),
  TRUNCAR: (x) => Math.trunc(Number(x)),
  RESIDUO: (x, y) => Number(x) % Number(y),
  ABS: (x) => Math.abs(Number(x)),
  RAIZ: (x) => Math.sqrt(Number(x)),
  POTENCIA: (x, y) => Number(x) ** Number(y),
  CONTARSI: (...a) => {
    const criterio = a.at(-1) ?? ''
    return a.slice(0, -1).filter((v) => cumple(v, criterio)).length
  },
  SUMARSI: (...a) => {
    // SUMAR.SI(rango; criterio) suma el propio rango: aquí llega como
    // (v1, v2, …, criterio), sin rango de suma aparte.
    const criterio = a.at(-1) ?? ''
    return suma(a.slice(0, -1).filter((v) => cumple(v, criterio)))
  },
  PI: () => Math.PI,
  HOY: () => fechaLocalISO(),
}

/** Nombre canónico en OOXML de cada función (Excel lo traduce al vuelo). */
export const A_OOXML: Record<string, string> = {
  SUMA: 'SUM',
  PRODUCTO: 'PRODUCT',
  PROMEDIO: 'AVERAGE',
  CONTAR: 'COUNT',
  CONTARA: 'COUNTA',
  MAX: 'MAX',
  MIN: 'MIN',
  MEDIANA: 'MEDIAN',
  DESVEST: 'STDEV',
  SI: 'IF',
  Y: 'AND',
  O: 'OR',
  NO: 'NOT',
  REDONDEAR: 'ROUND',
  ENTERO: 'INT',
  TRUNCAR: 'TRUNC',
  RESIDUO: 'MOD',
  ABS: 'ABS',
  RAIZ: 'SQRT',
  POTENCIA: 'POWER',
  'CONTAR.SI': 'COUNTIF',
  'SUMAR.SI': 'SUMIF',
  PI: 'PI',
  HOY: 'TODAY',
}

/** Nombres tal cual los escribe el usuario (con punto), para el editor. */
export const NOMBRES_HOJA = Object.keys(A_OOXML)

/**
 * Los nombres con punto no valen como identificador en mathjs (los leería como
 * acceso a propiedad), así que se aplanan antes de evaluar.
 */
export const ALIAS_PUNTO: Record<string, string> = { 'CONTAR.SI': 'CONTARSI', 'SUMAR.SI': 'SUMARSI' }
