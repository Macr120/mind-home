import { finanzasRepo, metasRepo, patrimonioRepo } from '../../core/data/repository'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'
import { tGlobal } from '../../core/i18n/useT'
import { hoyISO, money2, rangoPeriodo, totalEnRango } from './mes'
import { resumenDe } from './useResumen'
import type { TipoMeta } from './MetasTab'

/**
 * Acotamiento del planificador ✨ en el despacho: el plan es SIEMPRE de dinero
 * (juntar/aportar, o pagar una deuda — según `ambitoId`) y se calibra con el
 * balance real del mes y las metas ya registradas.
 *
 * GUARDARRAÍL LEGAL, no cosmético: el plan de ahorro/inversión nunca nombra un
 * valor, ticker, fondo o clase de activo, ni reparte una cartera — eso sería
 * asesoría en inversiones individualizada (reservada por ley), no organización
 * personal del dinero. Aquí solo se planea el RITMO de aportación. Ahorro e
 * inversión comparten un solo cronograma desde la v116, así que esa prohibición
 * vive AQUÍ y no en una rama aparte: si desaparece de este texto, desaparece
 * del producto.
 */

/** Ámbitos del cronograma del despacho (ahorro e inversión comparten uno). */
export type AmbitoPlan = 'ahorroInversion' | 'deuda'

const GUIA: Record<AmbitoPlan, string[]> = {
  ahorroInversion: [
    'La meta es de la app de Finanzas, sección Ahorro/Inversión: eres un asesor de finanzas personales y el plan es SIEMPRE sobre juntar dinero para un objetivo (fondo de emergencia, un viaje, un enganche…) o sobre construir el HÁBITO de invertir con constancia.',
    'Las fases son hitos de acumulación: arrancar el hábito de apartar dinero, acelerar el ritmo cuando el presupuesto lo permita, y los últimos ajustes antes de la fecha.',
    'Los hijos son acciones concretas («Apartar $X el día de pago», «Automatizar la aportación mensual», «Revisar y recortar una categoría de gasto», «Abrir una cuenta de ahorro separada»).',
    'NUNCA nombres un valor, ticker, fondo o clase de activo concreto ni sugieras una asignación de cartera: eso no es este plan. Se planea el RITMO de aportación, jamás qué comprar.',
    CLAUSULA_RECHAZO('el ahorro y el hábito de invertir con constancia'),
  ],
  deuda: [
    'La meta es de la app de Finanzas, sección Deuda: eres un asesor de finanzas personales y el plan es SIEMPRE sobre pagar una deuda.',
    'Las fases son hitos del pago: estabilizar el pago mínimo, acelerar los abonos extra, y liquidar el saldo.',
    'Los hijos son acciones concretas de pago («Abonar $X extra al mes», «Liquidar primero la deuda más chica», «Negociar la tasa con el banco»).',
    // Ordenar pagos por tasa es organización personal del dinero, como ya lo es
    // «liquidar primero la más chica». Compararla con un rendimiento no: ahí se
    // cruza a recomendar dónde poner el dinero, que es lo que prohíbe la cláusula.
    'Puedes usar las tasas de sus deudas para proponer el ORDEN de pago. NUNCA las compares con el rendimiento de una inversión ni sugieras invertir en vez de pagar.',
    CLAUSULA_RECHAZO('el pago de deudas personales'),
  ],
}

const EJEMPLO: Record<AmbitoPlan, () => string> = {
  ahorroInversion: () => tGlobal('despacho.plan.ejAhorro', 'Fondo de emergencia'),
  deuda: () => tGlobal('despacho.plan.ejDeuda', 'Pagar la tarjeta de crédito'),
}

/** Qué tipos de `Meta` entran en el contexto de cada ámbito. */
const TIPOS_DEL_AMBITO: Record<AmbitoPlan, TipoMeta[]> = {
  ahorroInversion: ['ahorro', 'inversion'],
  deuda: ['deuda'],
}

export async function planMetasDespacho(ambitoId?: string): Promise<ContextoPlanApp> {
  // Los ámbitos viejos 'ahorro'/'inversion' siguen cayendo aquí: los guardan los
  // deep-links del chat y los dispositivos que aún no migraron a la v116.
  const ambito: AmbitoPlan = ambitoId === 'deuda' ? 'deuda' : 'ahorroInversion'
  const contexto: string[] = []

  const movimientos = await finanzasRepo.list()
  const resumen = resumenDe(movimientos, 'mes')
  if (resumen.ingresos > 0 || resumen.gastos > 0) {
    contexto.push(
      `Balance mensual actual: ingresos ${money2(resumen.ingresos)}, gastos ${money2(resumen.gastos)}, disponible ${money2(resumen.disponible)}.`,
    )
  }

  // El material son las categorías de gasto REALES del mes: el plan dice de dónde
  // sale el dinero (qué recortar y cuánto), no consejos de cartera — el motivo
  // nunca nombra instrumentos, eso lo prohíbe la guía.
  const { desde, hasta } = rangoPeriodo(hoyISO(), 'mes')
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

  const tipos = TIPOS_DEL_AMBITO[ambito]
  const metas = (await metasRepo.list()).filter((m) => tipos.includes((m.tipo ?? 'ahorro') as TipoMeta))
  if (metas.length > 0) {
    // Cada meta lleva su tipo pegado: en el ámbito fusionado la IA tiene que
    // distinguir «juntar para un viaje» de «aportar cada mes».
    contexto.push(
      'Metas ya registradas: ' +
        metas
          .map((m) => `«${m.nombre}» (${m.tipo ?? 'ahorro'}) ${money2(m.ahorrado)} de ${money2(m.objetivo)}`)
          .join('; ') +
        '.',
    )
  }

  // Las tasas solo entran en el plan de deuda. En ahorro/inversión NO: darle al
  // planificador el rendimiento de los activos le invita a comparar y a decir
  // «invierte en X en vez de pagar Y», que es justo la asesoría individualizada
  // que prohíbe la guía de arriba.
  if (ambito === 'deuda') {
    const creditos = (await patrimonioRepo.list()).filter(
      (f) => f.naturaleza === 'pasivo' && (f.tasaAnual || f.pagoMensual),
    )
    if (creditos.length > 0) {
      contexto.push(
        'Créditos con sus condiciones: ' +
          creditos
            .map((f) => {
              const tasa = f.tasaAnual ? `${f.tasaAnual}% anual` : 'sin tasa anotada'
              const cuota = f.pagoMensual ? `, paga ${money2(f.pagoMensual)} al mes` : ''
              return `«${f.nombre}» ${money2(f.monto)} al ${tasa}${cuota}`
            })
            .join('; ') +
          '.',
      )
    }
  }

  return { guia: GUIA[ambito], contexto, ejemplo: EJEMPLO[ambito](), material }
}
