import type { Meta, Patrimonio, Transaccion } from '../../core/data/db'
import { VACIO, finanzasRepo, metasRepo, patrimonioRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { tGlobal } from '../../core/i18n/useT'
import { hoyISO } from './mes'
import {
  tasaMesActivo,
  tasaMesPasivo,
  valorCapitalizado,
  valorEn,
  type FilaProyectable,
} from './proyeccion'
import { efectivoHasta } from './useResumen'

/**
 * El efectivo derivado de los movimientos es opt-in, y a propósito: solo dice
 * la verdad si el libro está completo desde el primer día. Con un historial a
 * medias sale negativo y asusta, y a quien ya apunta sus cuentas a mano le
 * contaría el mismo dinero dos veces. Se enciende sabiendo lo que se enciende.
 */
const CLAVE_EFECTIVO = claveLS('mh.despacho.efectivoAuto')

export const leerEfectivoAuto = () => localStorage.getItem(CLAVE_EFECTIVO) === '1'

export const guardarEfectivoAuto = (v: boolean) => localStorage.setItem(CLAVE_EFECTIVO, v ? '1' : '0')

/** Una línea del balance patrimonial, venga de una meta o escrita a mano. */
export interface LineaPatrimonio {
  clave: string
  nombre: string
  /** Lo que vale HOY: con la tasa aplicada, si la línea tiene una. */
  monto: number
  /** Lo que se escribió, sin revaluar. Igual que `monto` cuando no hay tasa. */
  montoEscrito: number
  /** Texto de origen cuando la calcula la app: esas líneas no se editan. */
  derivada?: string
  /** Solo las escritas a mano; sin ella la línea es de solo lectura. */
  fila?: Patrimonio
  /** La meta enlazada, cuando esta línea y ella son la misma cosa. */
  meta?: Meta
  /** La fila apunta a una meta que ya no está: hay que ofrecer desenlazar. */
  colgando?: boolean
  /** La misma línea, lista para dibujarla a lo largo del tiempo. */
  proyectable: FilaProyectable
}

export interface BalancePatrimonio {
  fisicos: LineaPatrimonio[]
  liquidos: LineaPatrimonio[]
  pasivos: LineaPatrimonio[]
  totalActivos: number
  totalPasivos: number
  neto: number
  /**
   * El neto contando solo lo escrito, sin revaluar nada. Es el número de
   * siempre: la pestaña deja mirarlo cuando la estimación no convence.
   */
  netoEscrito: number
}

const suma = (ls: LineaPatrimonio[]) => ls.reduce((s, l) => s + l.monto, 0)
const sumaEscrita = (ls: LineaPatrimonio[]) => ls.reduce((s, l) => s + l.montoEscrito, 0)

/** Las filas viejas no traen `tipo`: cuentan como ahorro. */
export const esDeuda = (m: Meta) => (m.tipo ?? 'ahorro') === 'deuda'

/**
 * Lo que la meta vale HOY en el patrimonio: una deuda es lo que falta por
 * pagar; el ahorro y la inversión, lo que llevas puesto.
 */
export const saldoVivo = (m: Meta) => (esDeuda(m) ? Math.max(0, m.objetivo - m.ahorrado) : m.ahorrado)

/**
 * El saldo de una meta con su tasa aplicada: lo que de verdad tienes (o debes)
 * hoy, capitalizando cada movimiento desde el día que lo hiciste.
 *
 * Sin tasa devuelve exactamente `saldoVivo`, así que la meta de siempre no
 * cambia de número. Vive aquí, y no en la tarjeta, porque el patrimonio y la
 * pestaña de Metas TIENEN que enseñar la misma cifra.
 */
export function valorMeta(
  meta: Meta,
  movimientos: Transaccion[],
  tasaAnual: number | undefined,
  fechaValor: string,
  hoy: string,
): number {
  if (!tasaAnual) return saldoVivo(meta)
  const abonos = movimientos.filter((m) => m.metaId != null && m.metaId === meta.id)
  const registrado = abonos.reduce((s, m) => s + m.monto, 0)

  if (esDeuda(meta)) {
    // Debes el crédito entero desde que lo pediste, menos cada pago desde el
    // día que lo hiciste. Lo pagado sin movimiento asociado se descuenta en la
    // fecha de referencia, que es lo más prudente que se puede suponer.
    const pagadoSuelto = Math.max(0, meta.ahorrado - registrado)
    const movs = abonos.map((m) => ({ fecha: m.fecha, monto: -m.monto }))
    if (pagadoSuelto > 0) movs.push({ fecha: fechaValor, monto: -pagadoSuelto })
    const debe = valorCapitalizado({ fecha: fechaValor, monto: meta.objetivo }, movs, tasaMesPasivo(tasaAnual), hoy)
    return Math.max(0, debe)
  }

  // Lo aportado sin movimiento (la meta pudo nacer con saldo) rinde desde la
  // fecha de referencia; cada abono, desde el suyo.
  const aportadoSuelto = meta.ahorrado - registrado
  const movs = abonos.map((m) => ({ fecha: m.fecha, monto: m.monto }))
  return Math.max(
    0,
    valorCapitalizado({ fecha: fechaValor, monto: aportadoSuelto }, movs, tasaMesActivo(tasaAnual), hoy),
  )
}

/** Deja la fila suelta otra vez, con el saldo que tenía la meta como valor propio. */
export async function desenlazar(fila: Patrimonio, monto: number): Promise<void> {
  if (!fila.id) return
  await patrimonioRepo.update(fila.id, { metaId: undefined, monto, fechaValor: hoyISO() })
}

/** Cuelga una fila de una meta: a partir de ahí el saldo lo manda ella. */
export async function enlazarConMeta(fila: Patrimonio, metaId: number): Promise<void> {
  if (!fila.id) return
  await patrimonioRepo.update(fila.id, { metaId })
}

/**
 * Una línea que la app calcula sola (una meta, el patrimonio anterior): vale lo
 * que vale hoy y no se revaloriza por su cuenta.
 */
function lineaFija(
  clave: string,
  nombre: string,
  monto: number,
  naturaleza: 'activo' | 'pasivo',
  hoy: string,
  derivada: string,
  serie?: (fecha: string) => number,
): LineaPatrimonio {
  return {
    clave,
    nombre,
    monto,
    montoEscrito: monto,
    derivada,
    proyectable: { clave, nombre, naturaleza, montoBase: monto, fechaValor: hoy, serie },
  }
}

/**
 * Lo que tienes menos lo que debes, mezclando tres fuentes: las metas de
 * ahorro/inversión y de deuda, el efectivo acumulado de tus movimientos, y las
 * filas escritas a mano (la casa, el coche, la hipoteca).
 *
 * El balance de un PERIODO no entra aquí a propósito: es un flujo, no un saldo,
 * y sumarlo haría que el patrimonio cambiara al pasar de Mes a Año.
 */
export function usePatrimonio(efectivoAuto = leerEfectivoAuto()): BalancePatrimonio {
  const filas = patrimonioRepo.useAll() ?? VACIO
  const metas = metasRepo.useAll() ?? VACIO
  const movimientos = finanzasRepo.useAll() ?? VACIO
  const hoy = hoyISO()

  const efectivo = efectivoAuto ? efectivoHasta(movimientos, hoy) : 0
  const deMetas = tGlobal('despacho.patr.deMetas', 'de tus metas')

  /**
   * La meta de una fila enlazada, solo si el tipo cuadra con la naturaleza: una
   * meta de ahorro no puede colgar de un pasivo. El par imposible puede llegar
   * por sincronización, y ahí el enlace se ignora en vez de romper la vista.
   */
  const metaDe = (f: Patrimonio): Meta | undefined => {
    if (f.metaId == null) return undefined
    const m = metas.find((x) => x.id === f.metaId)
    if (!m) return undefined
    return esDeuda(m) === (f.naturaleza === 'pasivo') ? m : undefined
  }

  // Una meta enlazada NO entra por su cuenta: la fila y ella son la misma cosa,
  // y sin esto la deuda (o la inversión) se contaría dos veces.
  const enlazadas = new Set(filas.map(metaDe).flatMap((m) => (m?.id != null ? [m.id] : [])))

  const manuales = (clase: Patrimonio['clase'], naturaleza: Patrimonio['naturaleza']): LineaPatrimonio[] =>
    filas
      .filter((f) => f.clase === clase && f.naturaleza === naturaleza)
      .map((f) => {
        const meta = metaDe(f)
        // Enlazada: el capital lo manda la meta (ahí es donde se abona) y la
        // fila pone la tasa. Arrancar la proyección desde ese saldo de HOY —y no
        // desde el monto original— es lo que evita cobrar intereses sobre dinero
        // que ya se pagó.
        const fechaValor = f.fechaValor ?? f.creadoEn.slice(0, 10)
        const monto = meta ? valorMeta(meta, movimientos, f.tasaAnual, fechaValor, hoy) : f.monto
        const proyectable: FilaProyectable = {
          clave: `f${f.id}`,
          nombre: f.nombre,
          naturaleza,
          montoBase: monto,
          fechaValor: meta ? hoy : fechaValor,
          tasaAnual: f.tasaAnual,
          pagoMensual: f.pagoMensual,
          historial: meta ? undefined : f.historial,
        }
        return {
          clave: proyectable.clave,
          nombre: f.nombre,
          monto: meta ? monto : valorEn(proyectable, hoy),
          // En una enlazada, «lo escrito» es lo que dice la meta sin la tasa:
          // así el desglose del neto separa capital de rendimiento.
          montoEscrito: meta ? saldoVivo(meta) : f.monto,
          derivada: meta
            ? tGlobal('despacho.patr.deMeta', `enlazado con «${meta.nombre}»`, { n: meta.nombre })
            : f.metaId != null
              ? tGlobal('despacho.patr.metaIda', 'la meta enlazada ya no existe')
              : undefined,
          fila: f,
          meta,
          colgando: f.metaId != null && !meta,
          proyectable,
        }
      })

  const fisicos = manuales('fisico', 'activo')

  const liquidos: LineaPatrimonio[] = [
    ...(efectivo !== 0
      ? [
          lineaFija(
            'efectivo',
            tGlobal('despacho.patr.efectivo', 'Efectivo · de tus movimientos'),
            efectivo,
            'activo',
            hoy,
            tGlobal('despacho.patr.deMovs', 'ingresos − gastos de siempre'),
            // El pasado del efectivo es real, no una tasa: sale de lo que ya
            // estaba registrado en cada fecha.
            (fecha) => efectivoHasta(movimientos, fecha),
          ),
        ]
      : []),
    ...metas
      .filter((m) => !esDeuda(m) && m.ahorrado > 0 && !enlazadas.has(m.id!))
      .map((m) => lineaFija(`m${m.id}`, m.nombre, m.ahorrado, 'activo', hoy, deMetas)),
    ...manuales('liquido', 'activo'),
  ]

  const pasivos: LineaPatrimonio[] = [
    ...metas
      .filter((m) => esDeuda(m) && m.objetivo > m.ahorrado && !enlazadas.has(m.id!))
      .map((m) => lineaFija(`m${m.id}`, m.nombre, saldoVivo(m), 'pasivo', hoy, deMetas)),
    ...manuales('fisico', 'pasivo'),
    ...manuales('liquido', 'pasivo'),
  ]

  const totalActivos = suma(fisicos) + suma(liquidos)
  const totalPasivos = suma(pasivos)
  const escritos = sumaEscrita(fisicos) + sumaEscrita(liquidos) - sumaEscrita(pasivos)

  return {
    fisicos,
    liquidos,
    pasivos,
    totalActivos,
    totalPasivos,
    neto: totalActivos - totalPasivos,
    netoEscrito: escritos,
  }
}

/** Cuántos revalúos se guardan por línea (ver el comentario del campo en `db.ts`). */
const TOPE_HISTORIAL = 60

/**
 * Cambia el valor de una línea dejando constancia del anterior: el número viejo
 * pasa al historial con la fecha en que era cierto y el nuevo arranca hoy.
 *
 * Así la estimación nunca se apila sobre un dato fresco —revaluar reinicia el
 * reloj de la tasa— y la gráfica del pasado dibuja saltos reales, no una curva
 * inventada hacia atrás.
 */
export async function revaluar(fila: Patrimonio, monto: number): Promise<void> {
  if (!fila.id || monto === fila.monto) return
  const hoy = hoyISO()
  const antes = fila.fechaValor ?? fila.creadoEn.slice(0, 10)
  // Varios ajustes el mismo día son tanteos, no historia: se queda el último.
  const historial = [...(fila.historial ?? []).filter((h) => h.fecha !== antes && h.fecha !== hoy)]
  if (antes !== hoy) historial.push({ fecha: antes, monto: fila.monto })
  historial.sort((a, b) => a.fecha.localeCompare(b.fecha))
  await patrimonioRepo.update(fila.id, {
    monto,
    fechaValor: hoy,
    historial: historial.slice(-TOPE_HISTORIAL),
  })
}

