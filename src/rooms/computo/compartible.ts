import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { HojaCalculo } from '../../core/data/db'
import { hojasRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { COLS_INICIO, FILAS_INICIO } from './constantes'

/**
 * Las hojas de cálculo que Cómputo manda por el buzón: celdas, tamaño, anchos
 * y gráficas, tal cual se guardan. Una hoja grande puede superar el tope del
 * mensaje (64 KB): entonces el envío avisa y no sale.
 */

type HojaDatos = Pick<HojaCalculo, 'nombre' | 'celdas' | 'filas' | 'cols' | 'anchos' | 'graficas'>

const detalleCeldas = (h: { celdas: object }) =>
  tGlobal('computo.hojas.celdas', '{n} celdas', { n: String(Object.keys(h.celdas).length) })

export async function empaquetarHoja(h: HojaCalculo): Promise<Paquete> {
  const datos: HojaDatos = {
    nombre: h.nombre,
    celdas: h.celdas,
    filas: h.filas,
    cols: h.cols,
    ...(h.anchos ? { anchos: h.anchos } : {}),
    ...(h.graficas?.length ? { graficas: h.graficas } : {}),
  }
  return { app: 'computo', tipo: 'hoja', version: 1, nombre: h.nombre, resumen: detalleCeldas(h), datos }
}

export async function listarHojas(): Promise<ItemCompartible[]> {
  return (await hojasRepo.list())
    .filter((h) => h.id != null)
    .map((h) => ({ clave: `hoja:${h.id}`, nombre: h.nombre, detalle: detalleCeldas(h) }))
}

export async function empaquetarHojaPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const h = (await hojasRepo.list()).find((x) => x.id === id)
  return h ? empaquetarHoja(h) : null
}

export async function importarHoja(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<HojaDatos> | null
  if (!d || typeof d.nombre !== 'string' || !d.celdas || typeof d.celdas !== 'object') throw new Error('Hoja inválida')
  const existente = (await hojasRepo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre!))
  if (existente && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  const ahora = new Date().toISOString()
  const id = (await hojasRepo.add({
    nombre: d.nombre,
    celdas: d.celdas,
    filas: Number(d.filas) || FILAS_INICIO,
    cols: Number(d.cols) || COLS_INICIO,
    ...(d.anchos ? { anchos: d.anchos } : {}),
    ...(d.graficas?.length ? { graficas: d.graficas } : {}),
    creadoEn: ahora,
    actualizadoEn: ahora,
  })) as number
  return { seccion: 'hojas', dato: String(id) }
}
