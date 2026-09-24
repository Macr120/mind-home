import { nombreArchivo } from '../../core/buzon/exportar'
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

/** Índice de columna (0 = A) → letras, como en las referencias A1. */
function letras(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

/** Fuera de la app: la hoja en CSV con los valores calculados (lo abre Excel, Sheets, Numbers…). */
export async function exportarHoja(p: Paquete): Promise<File[]> {
  const d = p.datos as HojaDatos
  const refs = Object.keys(d.celdas)
  const ultimaFila = Math.max(0, ...refs.map((r) => Number(/\d+$/.exec(r)?.[0] ?? 0)))
  const cols = Math.max(1, Number(d.cols) || 1)
  const campo = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const filas: string[] = []
  for (let f = 1; f <= ultimaFila; f++) {
    const fila = Array.from({ length: cols }, (_, c) => {
      const celda = d.celdas[`${letras(c)}${f}`]
      return campo(celda ? (celda.valor ?? celda.crudo) : '')
    })
    filas.push(fila.join(',').replace(/,+$/, ''))
  }
  return [new File(['﻿' + filas.join('\r\n')],`${nombreArchivo(p.nombre)}.csv`, { type: 'text/csv' })]
}
