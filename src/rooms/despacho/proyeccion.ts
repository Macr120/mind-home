import { DIA_MS, deIso } from '../../core/fechaLocal'
import { sumarPeriodo } from './mes'

/**
 * La matemática del patrimonio en el tiempo: plusvalía, rendimiento, inflación
 * y amortización de créditos.
 *
 * Vive aparte de `patrimonio.ts` porque aquel es un módulo de hook (llama a los
 * repos y a `useAll`) y esto lo consumen tres sitios que no se parecen: las
 * gráficas de Patrimonio, la pestaña Simulación y el botón que lleva una deuda
 * al cronograma. Todo lo de aquí es puro: entra un número, sale un número.
 */

/** Mes medio del calendario gregoriano: 365.25 / 12. */
const DIAS_MES = 30.4375

/** Tope de la amortización, el mismo que el simulador de crédito: 50 años. */
export const TOPE_MESES = 600

/**
 * Un activo se revalúa con tasa EFECTIVA anual: quien escribe «mi casa sube 6 %
 * al año» quiere ver un 6 % al cabo de doce meses, no un 6.17 %.
 */
export const tasaMesActivo = (anual: number) => Math.pow(1 + Math.max(-99.9, anual) / 100, 1 / 12) - 1

/**
 * Un crédito, en cambio, usa la tasa NOMINAL entre doce: es lo que cotiza el
 * banco y lo que ya hace el simulador de crédito. Unificarlas daría dos
 * mensualidades distintas para el mismo préstamo dentro de la misma app.
 */
export const tasaMesPasivo = (anual: number) => anual / 100 / 12

/** Meses (con decimales) entre dos fechas ISO; negativo si `hasta` es anterior. */
export function mesesEntre(desde: string, hasta: string): number {
  return (deIso(hasta).getTime() - deIso(desde).getTime()) / (DIA_MS * DIAS_MES)
}

/** El día 1 del mes que queda a `delta` meses de `ancla`. */
export const mesISO = (ancla: string, delta: number) => sumarPeriodo(`${ancla.slice(0, 7)}-01`, 'mes', delta)

// ----- Créditos -----

/**
 * Pago francés: la mensualidad fija que liquida `capital` en `meses` a la tasa
 * `iMes`. Sin intereses es un reparto a partes iguales.
 */
export function pagoFrances(capital: number, iMes: number, meses: number): number {
  if (meses <= 0) return capital
  return iMes === 0 ? capital / meses : (capital * iMes) / (1 - Math.pow(1 + iMes, -meses))
}

/** Una mensualidad desglosada: cuánto se va en intereses y cuánto baja la deuda. */
export interface MesAmortizado {
  interes: number
  capital: number
  saldo: number
}

/**
 * Amortiza mes a mes con un pago dado. Corta al liquidar o al llegar a `tope`.
 *
 * Devuelve la tabla vacía cuando el pago no cubre ni los intereses del primer
 * mes: ahí la deuda no baja nunca y quien llama tiene que decirlo, no simular
 * seiscientos meses de nada.
 */
export function tablaAmortizacion(capital: number, iMes: number, pago: number, tope = TOPE_MESES): MesAmortizado[] {
  if (capital <= 0 || pago <= 0) return []
  if (iMes > 0 && pago <= capital * iMes) return []

  const filas: MesAmortizado[] = []
  let saldo = capital
  for (let k = 0; k < tope && saldo > 0; k++) {
    const interes = saldo * iMes
    // El último mes casi nunca cabe entero: se paga lo que quede, no la cuota.
    const capitalMes = Math.min(pago - interes, saldo)
    saldo = Math.max(0, saldo - capitalMes)
    filas.push({ interes, capital: capitalMes, saldo })
  }
  return filas
}

/**
 * Saldo de una deuda `meses` después (o antes, con `meses` negativo) de valer
 * `capital`, pagando `pago` cada mes. Fórmula cerrada, así que acepta meses con
 * decimales y sirve igual para dibujar el pasado que para proyectar el futuro.
 */
export function saldoTras(capital: number, iMes: number, pago: number, meses: number): number {
  if (iMes === 0) return Math.max(0, capital - pago * meses)
  const factor = Math.pow(1 + iMes, meses)
  return Math.max(0, capital * factor - (pago * (factor - 1)) / iMes)
}

export interface Amortizacion {
  iMes: number
  pago: number
  /** Meses hasta liquidar. `Infinity` cuando el pago no cubre ni los intereses. */
  meses: number
  interesesTotales: number
  /** Fecha ISO estimada de liquidación; `null` si nunca llega. */
  fechaLiquidacion: string | null
  /** false ⇒ la deuda no baja. Hay que decírselo al usuario, no simular. */
  cubrePago: boolean
}

/** Cuánto falta para liquidar una deuda desde el saldo que tiene hoy. */
export function amortizar(
  saldo: number,
  tasaAnual: number,
  pagoMensual: number,
  desde: string,
  tope = TOPE_MESES,
): Amortizacion {
  const iMes = tasaMesPasivo(tasaAnual || 0)
  const pago = pagoMensual || 0
  const filas = tablaAmortizacion(saldo, iMes, pago, tope)
  if (filas.length === 0) {
    return { iMes, pago, meses: Infinity, interesesTotales: 0, fechaLiquidacion: null, cubrePago: false }
  }
  // Si tras el tope aún queda saldo, el crédito es más largo de lo que se
  // simula: no se inventa una fecha que no se ha calculado.
  const liquida = filas[filas.length - 1].saldo <= 0
  return {
    iMes,
    pago,
    meses: liquida ? filas.length : Infinity,
    interesesTotales: filas.reduce((s, f) => s + f.interes, 0),
    fechaLiquidacion: liquida ? mesISO(desde, filas.length) : null,
    cubrePago: true,
  }
}

// ----- Valor de una línea a lo largo del tiempo -----

/**
 * Una línea del patrimonio lista para proyectar. La arma `patrimonio.ts` a
 * partir de la fila escrita a mano, de la meta enlazada o de los movimientos.
 */
export interface FilaProyectable {
  clave: string
  nombre: string
  naturaleza: 'activo' | 'pasivo'
  /** El valor conocido y la fecha en que era cierto. */
  montoBase: number
  fechaValor: string
  /** % anual. Sin ella la línea vale siempre lo mismo. */
  tasaAnual?: number
  /** Solo pasivos: la mensualidad con la que se amortiza. */
  pagoMensual?: number
  /** Revalúos anteriores: el pasado real de la línea, antes que cualquier tasa. */
  historial?: { fecha: string; monto: number }[]
  /**
   * Serie propia. Cuando viene, manda sobre todo lo demás: el efectivo sale de
   * los movimientos registrados, no de una tasa.
   */
  serie?: (fecha: string) => number
}

/** El valor conocido más reciente que no sea posterior a `fecha`. */
function baseEn(f: FilaProyectable, fecha: string): { fecha: string; monto: number } {
  const propia = { fecha: f.fechaValor, monto: f.montoBase }
  if (!f.historial?.length) return propia
  const puntos = [...f.historial, propia].sort((a, b) => a.fecha.localeCompare(b.fecha))
  // Antes del primer dato conocido no hay nada que mirar: se extrapola de él
  // hacia atrás, que es justo lo que hace la tasa.
  return puntos.filter((p) => p.fecha <= fecha).pop() ?? puntos[0]
}

/**
 * Cuánto vale una línea en cualquier fecha, pasada o futura.
 *
 * SIN tasa devuelve el valor escrito tal cual: una fila de las de siempre se
 * comporta exactamente como antes de que existieran las tasas.
 */
export function valorEn(f: FilaProyectable, fecha: string): number {
  if (f.serie) return f.serie(fecha)

  const base = baseEn(f, fecha)
  const meses = mesesEntre(base.fecha, fecha)

  if (f.naturaleza === 'pasivo') {
    const iMes = tasaMesPasivo(f.tasaAnual ?? 0)
    const pago = f.pagoMensual ?? 0
    if (iMes === 0 && pago === 0) return base.monto
    return saldoTras(base.monto, iMes, pago, meses)
  }

  if (!f.tasaAnual) return base.monto
  return base.monto * Math.pow(1 + tasaMesActivo(f.tasaAnual), meses)
}

/** Descuenta la inflación. NUNCA toca lo guardado: solo lo que se pinta. */
export const aDineroDeHoy = (valor: number, inflacionAnual: number, meses: number) =>
  inflacionAnual === 0 ? valor : valor / Math.pow(1 + inflacionAnual / 100, meses / 12)

/**
 * Cuánto vale hoy un capital al que se le fueron sumando (o restando) cantidades
 * en fechas distintas, capitalizando CADA UNA desde su propio día.
 *
 * Es lo que hace falta para una meta: los $500 que abonaste el mes pasado no
 * llevan rindiendo lo mismo que los que pusiste hace tres años. Con la misma
 * fórmula sale el rendimiento de un ahorro (movimientos positivos) y los
 * intereses de una deuda (el principal, menos cada pago desde que lo hiciste).
 *
 * Sin tasa devuelve la suma de siempre: base + movimientos, al peso.
 */
/**
 * `iMes` va ya convertida por quien llama (`tasaMesActivo` o `tasaMesPasivo`):
 * un ahorro capitaliza con la tasa efectiva y un crédito con la del banco, y
 * meter aquí un booleano para elegir escondería justo esa diferencia.
 */
export function valorCapitalizado(
  base: { fecha: string; monto: number },
  movs: { fecha: string; monto: number }[],
  iMes: number,
  hoy: string,
): number {
  if (!iMes) return base.monto + movs.reduce((s, m) => s + m.monto, 0)
  const traer = (m: { fecha: string; monto: number }) =>
    // Un movimiento con fecha futura aún no ha rendido nada: cuenta por su valor.
    m.monto * Math.pow(1 + iMes, Math.max(0, mesesEntre(m.fecha, hoy)))
  return traer(base) + movs.reduce((s, m) => s + traer(m), 0)
}

// ----- El flujo del mes -----

/** Lo que entra y sale cada mes, y a qué ritmo crece cada cosa. */
export interface FlujoMensual {
  ingresoMes: number
  gastoMes: number
  /** % anual con el que sube el ingreso (el aumento que esperas). */
  crecIngresoAnual: number
  /** % anual con el que suben los gastos (tu inflación). */
  crecGastoAnual: number
  /** Los pagos de deuda ya están entre tus gastos: no restarlos otra vez. */
  pagosYaEnGastos: boolean
}

/** Lo que sobra el mes `k` (0 = el que viene), con los crecimientos aplicados. */
export function flujoDelMes(f: FlujoMensual, k: number, pagosDeuda: number): number {
  const gI = Math.pow(1 + f.crecIngresoAnual / 100, 1 / 12) - 1
  const gG = Math.pow(1 + f.crecGastoAnual / 100, 1 / 12) - 1
  const ingreso = f.ingresoMes * Math.pow(1 + gI, k)
  const gasto = f.gastoMes * Math.pow(1 + gG, k) + (f.pagosYaEnGastos ? 0 : pagosDeuda)
  return ingreso - gasto
}

// ----- La serie que dibujan las gráficas -----

export interface PuntoSerie {
  /** Día 1 del mes. */
  fecha: string
  activos: number
  pasivos: number
  neto: number
  /** Lo que el flujo mensual lleva aportado; 0 si está apagado. */
  ahorro: number
  /** Posterior a hoy: la gráfica lo pinta punteado. */
  futuro: boolean
}

export interface OpcionesSerie {
  activos: FilaProyectable[]
  pasivos: FilaProyectable[]
  hoy: string
  mesesAtras: number
  mesesAdelante: number
  /** % anual para pasar a dinero de hoy; solo se aplica si `enDineroDeHoy`. */
  inflacion?: number
  enDineroDeHoy?: boolean
  /** Sin él, la simulación solo revaloriza lo que ya tienes. */
  flujo?: FlujoMensual
}

/**
 * El patrimonio mes a mes: hacia atrás con lo que ya pasó, hacia adelante con
 * las tasas de cada línea.
 *
 * El ahorro proyectado va en su propia columna y no fundido en una línea
 * existente: así se puede apagar el flujo y ver exactamente qué aportaba.
 */
export function serieNeto(e: OpcionesSerie): PuntoSerie[] {
  const inflacion = e.enDineroDeHoy ? (e.inflacion ?? 0) : 0
  const puntos: PuntoSerie[] = []
  let ahorro = 0

  for (let k = -e.mesesAtras; k <= e.mesesAdelante; k++) {
    const fecha = mesISO(e.hoy, k)
    const futuro = k > 0

    let activos = 0
    for (const f of e.activos) activos += valorEn(f, fecha)

    let pasivos = 0
    let pagosDeuda = 0
    for (const f of e.pasivos) {
      const saldo = valorEn(f, fecha)
      pasivos += saldo
      // Una deuda liquidada deja de costar: su mensualidad vuelve al bolsillo.
      if (saldo > 0) pagosDeuda += f.pagoMensual ?? 0
    }

    // El flujo solo cuenta hacia adelante: el pasado ya está en los movimientos
    // registrados, y sumarlo aquí lo contaría dos veces.
    if (e.flujo && futuro) ahorro += flujoDelMes(e.flujo, k - 1, pagosDeuda)

    const ajusta = (v: number) => aDineroDeHoy(v, inflacion, k)
    const a = ajusta(activos + Math.max(0, ahorro))
    const p = ajusta(pasivos)
    puntos.push({
      fecha,
      activos: a,
      pasivos: p,
      // El ahorro puede ser negativo (gastas más de lo que entra): ahí no suma
      // activo, resta del neto.
      neto: a - p + ajusta(Math.min(0, ahorro)),
      ahorro: ajusta(ahorro),
      futuro,
    })
  }
  return puntos
}
