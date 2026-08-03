import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { finanzasRepo } from '../../core/data/repository'
import type { PeriodoMovimiento } from '../../core/data/db'
import { normalizar } from '../../core/chat/dispatcher'
import { flujosDespacho } from './tutorial'
import { planMetasDespacho } from './plan'
import { fechaLocalISO } from '../../core/fechaLocal'

/** Mapeo de palabras clave a categoría de gasto. */
const CATEGORIAS_GASTO: [string[], string][] = [
  [['super', 'supermercado', 'mercado', 'despensa', 'tienda', 'walmart', 'costco', 'soriana', 'chedraui'], 'Supermercado'],
  [['gasolina', 'combustible', 'bencina', 'nafta'], 'Gasolina'],
  [['restaurante', 'restaurant', 'comida', 'comer', 'tacos', 'pizza', 'sushi'], 'Restaurante'],
  [['luz', 'agua', 'internet', 'telefono', 'gas', 'servicio', 'recibo'], 'Servicios'],
  [['ropa', 'zapatos', 'ropa', 'calzado'], 'Ropa'],
  [['gym', 'gimnasio', 'deporte', 'ejercicio'], 'Deporte'],
  [['medico', 'doctor', 'farmacia', 'medicina', 'salud'], 'Salud'],
  [['cine', 'streaming', 'netflix', 'spotify', 'suscripcion', 'entretenimiento'], 'Entretenimiento'],
  [['transporte', 'uber', 'taxi', 'metro', 'camion', 'bus'], 'Transporte'],
]

const PERIODOS_VALIDOS: PeriodoMovimiento[] = ['unico', 'dia', 'semana', 'mes', 'anio']

function detectarCategoria(tokens: Set<string>): string {
  for (const [claves, cat] of CATEGORIAS_GASTO) {
    if (claves.some((k) => tokens.has(k))) return cat
  }
  return 'Otros'
}

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  // Detecta monto: número con o sin decimales (ej: 200, 1500.50, 1,500)
  const montoMatch = norm.match(/(\d[\d,.]*\d|\d+)/)
  if (!montoMatch) return false
  const monto = parseFloat(montoMatch[1].replace(',', ''))
  if (!monto || monto <= 0) return false

  // Detecta tipo
  const esIngreso = ['cobre', 'cobri', 'ingrese', 'ingreso', 'recibi', 'recibe', 'gane', 'gane', 'salario', 'sueldo', 'pago', 'deposito'].some((k) => tokens.has(k))
  const tipo = esIngreso ? 'ingreso' : 'gasto'

  const categoria = detectarCategoria(tokens)
  await finanzasRepo.add({
    fecha: fechaLocalISO(),
    tipo,
    categoria,
    monto,
    nota: texto,
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'transaccion',
    descripcion: 'Movimiento de dinero del usuario: un gasto o un ingreso.',
    campos: [
      { campo: 'monto', tipo: 'numero', descripcion: 'Cantidad de dinero (siempre positiva)', requerido: true },
      { campo: 'tipo', tipo: 'opcion', opciones: ['gasto', 'ingreso'], descripcion: "'gasto' si salió dinero, 'ingreso' si entró", requerido: true },
      { campo: 'categoria', tipo: 'texto', descripcion: 'Categoría corta: Supermercado, Gasolina, Restaurante, Servicios, Ropa, Deporte, Salud, Entretenimiento, Transporte u Otros' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha del movimiento yyyy-mm-dd (hoy si no se menciona); si se repite, la fecha en que arranca' },
      {
        campo: 'periodo',
        tipo: 'opcion',
        opciones: ['unico', 'dia', 'semana', 'mes', 'anio'],
        descripcion: "Cada cuánto se repite: 'unico' salvo que se diga que es fijo o recurrente (renta, sueldo, suscripción)",
      },
      { campo: 'nota', tipo: 'texto', descripcion: 'Descripción breve de qué fue el movimiento' },
    ],
    guardar: async (v) => {
      const periodo = vTexto(v.periodo, 'unico')
      await finanzasRepo.add({
        fecha: vFecha(v.fecha),
        tipo: v.tipo === 'ingreso' ? 'ingreso' : 'gasto',
        categoria: vTexto(v.categoria, 'Otros'),
        monto: Math.abs(vNumero(v.monto)),
        nota: vTexto(v.nota) || undefined,
        periodo: PERIODOS_VALIDOS.includes(periodo as PeriodoMovimiento)
          ? (periodo as PeriodoMovimiento)
          : 'unico',
      })
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const FinanzasApp = lazy(() => import('./FinanzasApp').then((m) => ({ default: m.FinanzasApp })))

const despacho: Plantilla = {
  id: 'despacho',
  nombre: 'Finanzas · Despacho',
  icon: '💰',
  categoria: 'mente',
  color: '#60a5fa',
  App: FinanzasApp,
  flujos: flujosDespacho,
  planMetas: planMetasDespacho,
  capturar,
  esquemas,
  comandos: [
    { seccion: 'balance', etiqueta: 'Balance', nombres: ['balance', 'presupuesto', 'resumen de finanzas', 'patrimonio'] },
    { seccion: 'gastos', etiqueta: 'Gastos', nombres: ['gastos', 'mis gastos', 'gastos fijos'] },
    { seccion: 'ingresos', etiqueta: 'Ingresos', nombres: ['ingresos', 'mis ingresos', 'ingresos fijos'] },
    { seccion: 'metas', etiqueta: 'Ahorro e inversión', nombres: ['metas de ahorro', 'metas de inversion', 'ahorro e inversion', 'metas'] },
    { seccion: 'financieras', etiqueta: 'Calculadoras financieras', nombres: ['calculadoras financieras', 'financieras', 'fondo de emergencia', 'libertad financiera'] },
    { seccion: 'deuda', etiqueta: 'Metas de deuda', nombres: ['deudas', 'metas de deuda'] },
    { seccion: 'simuladores', etiqueta: 'Simuladores', nombres: ['simuladores', 'simulador'] },
    { seccion: 'divisas', etiqueta: 'Divisas', nombres: ['divisas', 'tipo de cambio', 'dolar', 'mercados'] },
    { seccion: 'criptos', etiqueta: 'Criptomonedas', nombres: ['criptomonedas', 'cripto', 'bitcoin'] },
    { seccion: 'acciones', etiqueta: 'Acciones', nombres: ['acciones', 'bolsa', 'wall street'] },
    { seccion: 'commodities', etiqueta: 'Materias primas', nombres: ['materias primas', 'commodities', 'oro', 'petroleo'] },
  ],
}

export default despacho
