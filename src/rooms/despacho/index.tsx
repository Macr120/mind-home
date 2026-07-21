import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { finanzasRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { FinanzasApp } from './FinanzasApp'
import { tutorialDespacho } from './tutorial'
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
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha del movimiento yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Descripción breve de qué fue el movimiento' },
    ],
    guardar: async (v) => {
      await finanzasRepo.add({
        fecha: vFecha(v.fecha),
        tipo: v.tipo === 'ingreso' ? 'ingreso' : 'gasto',
        categoria: vTexto(v.categoria, 'Otros'),
        monto: Math.abs(vNumero(v.monto)),
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
]

const despacho: RoomModule = {
  id: 'despacho',
  nombre: 'Finanzas · Despacho',
  icon: '💰',
  categoria: 'mente',
  posicion: [9, 0, -6],
  color: '#60a5fa',
  App: FinanzasApp,
  tutorial: tutorialDespacho,
  capturar,
  esquemas,
  comandos: [
    { seccion: 'resumen', etiqueta: 'Resumen', nombres: ['presupuesto', 'resumen de finanzas'] },
    { seccion: 'movimientos', etiqueta: 'Movimientos', nombres: ['movimientos', 'mis gastos'] },
    { seccion: 'metas', etiqueta: 'Metas', nombres: ['metas de ahorro'] },
    { seccion: 'simuladores', etiqueta: 'Simuladores', nombres: ['simuladores', 'simulador'] },
    { seccion: 'mercados', etiqueta: 'Mercados', nombres: ['mercados', 'acciones', 'divisas', 'cripto', 'bolsa'] },
  ],
}

export default despacho
