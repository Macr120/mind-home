import { finanzasRepo, metasRepo } from '../../core/data/repository'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'
import { tGlobal } from '../../core/i18n/useT'
import { hoyISO, money2, rangoPeriodo, totalEnRango } from './mes'
import type { TipoMeta } from './MetasTab'

/**
 * Acotamiento del planificador ✨ en el despacho: el plan es SIEMPRE de dinero
 * (ahorro, el HÁBITO de invertir, o el pago de una deuda — según `ambitoId`,
 * el tipo de meta) y se calibra con el balance real del mes y las metas ya
 * registradas de ese tipo.
 *
 * Guardarraíl a propósito: en 'inversion' el plan nunca nombra un valor,
 * ticker, fondo o clase de activo, ni reparte una cartera — eso sería
 * asesoría en inversiones individualizada (reservada por ley), no
 * organización personal del dinero. Aquí solo se planea el RITMO de
 * aportación, igual que en 'ahorro'.
 */

const GUIA: Record<TipoMeta, string[]> = {
  ahorro: [
    'La meta es de la app de Finanzas, sección Ahorro: eres un asesor de finanzas personales y el plan es SIEMPRE sobre juntar dinero para un objetivo (fondo de emergencia, un viaje, un enganche…).',
    'Las fases son hitos de acumulación: arrancar el hábito de apartar dinero, acelerar el ritmo cuando el presupuesto lo permita, y los últimos ajustes antes de la fecha.',
    'Los hijos son acciones concretas de ahorro («Apartar $X el día de pago», «Revisar y recortar una categoría de gasto», «Abrir una cuenta de ahorro separada»); nunca inversión ni compra de instrumentos financieros.',
    CLAUSULA_RECHAZO('el ahorro personal'),
  ],
  inversion: [
    'La meta es de la app de Finanzas, sección Inversión: eres un asesor de finanzas personales y el plan es SIEMPRE sobre construir el HÁBITO de invertir con constancia — NUNCA sobre qué instrumento o valor comprar, ni cómo repartir una cartera.',
    'Las fases son etapas del hábito: empezar con un monto cómodo, automatizarlo y hacerlo recurrente, y revisarlo con el tiempo.',
    'Los hijos son acciones concretas del hábito («Apartar $X el día de pago», «Automatizar la aportación mensual», «Revisar el avance cada trimestre»). NUNCA nombres un valor, ticker, fondo o clase de activo concreto ni sugieras una asignación de cartera: eso no es este plan.',
    CLAUSULA_RECHAZO('el hábito de invertir con constancia'),
  ],
  deuda: [
    'La meta es de la app de Finanzas, sección Deuda: eres un asesor de finanzas personales y el plan es SIEMPRE sobre pagar una deuda.',
    'Las fases son hitos del pago: estabilizar el pago mínimo, acelerar los abonos extra, y liquidar el saldo.',
    'Los hijos son acciones concretas de pago («Abonar $X extra al mes», «Liquidar primero la deuda más chica», «Negociar la tasa con el banco»).',
    CLAUSULA_RECHAZO('el pago de deudas personales'),
  ],
}

const EJEMPLO: Record<TipoMeta, () => string> = {
  ahorro: () => tGlobal('despacho.plan.ejAhorro', 'Fondo de emergencia'),
  inversion: () => tGlobal('despacho.plan.ejInversion', 'Invertir con constancia cada mes'),
  deuda: () => tGlobal('despacho.plan.ejDeuda', 'Pagar la tarjeta de crédito'),
}

/** Mismo cálculo que el Balance en vista de mes (las repeticiones ya cuentan). */
async function resumenMensual(): Promise<{ ingresos: number; gastos: number; balance: number } | null> {
  const { desde, hasta } = rangoPeriodo(hoyISO(), 'mes')
  const movimientos = await finanzasRepo.list()
  const ingresos = totalEnRango(movimientos, 'ingreso', desde, hasta)
  const gastos = totalEnRango(movimientos, 'gasto', desde, hasta)
  if (ingresos === 0 && gastos === 0) return null
  return { ingresos, gastos, balance: ingresos - gastos }
}

export async function planMetasDespacho(ambitoId?: string): Promise<ContextoPlanApp> {
  const tipo: TipoMeta = ambitoId === 'inversion' || ambitoId === 'deuda' ? ambitoId : 'ahorro'
  const contexto: string[] = []

  const resumen = await resumenMensual()
  if (resumen) {
    contexto.push(
      `Balance mensual actual: ingresos ${money2(resumen.ingresos)}, gastos ${money2(resumen.gastos)}, disponible ${money2(resumen.balance)}.`,
    )
  }

  // El material son las categorías de gasto REALES del mes: el plan dice de dónde
  // sale el dinero (qué recortar y cuánto), no consejos de cartera — el motivo
  // nunca nombra instrumentos, eso lo prohíbe la guía.
  const { desde, hasta } = rangoPeriodo(hoyISO(), 'mes')
  const movimientos = await finanzasRepo.list()
  const categorias = [...new Set(movimientos.filter((m) => m.tipo === 'gasto').map((m) => m.categoria))]
  const items = categorias
    .map((c) => ({
      nombre: c,
      total: totalEnRango(movimientos.filter((m) => m.categoria === c), 'gasto', desde, hasta),
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((x) => ({ nombre: x.nombre, detalle: `${money2(x.total)} de gasto este mes` }))
  const material =
    items.length > 0
      ? {
          titulo: tGlobal('despacho.plan.material', 'De dónde saldrá el dinero'),
          instruccion:
            'El material son las categorías de gasto reales del mes del usuario. Elige de cuáles puede salir el dinero del plan y en el motivo di cuánto y cómo recortar esa categoría. Deja "rutina" vacía.',
          items,
        }
      : undefined

  const metas = (await metasRepo.list()).filter((m) => (m.tipo ?? 'ahorro') === tipo)
  if (metas.length > 0) {
    contexto.push(
      `Metas de ${tipo} ya registradas: ` +
        metas.map((m) => `«${m.nombre}» ${money2(m.ahorrado)} de ${money2(m.objetivo)}`).join('; ') +
        '.',
    )
  }

  return { guia: GUIA[tipo], contexto, ejemplo: EJEMPLO[tipo](), material }
}
