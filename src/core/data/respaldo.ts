import { db } from './db'
import { fechaLocalISO } from '../fechaLocal'

/**
 * Export/estado del respaldo local. IndexedDB puede ser purgado por el navegador,
 * así que la app recuerda cuándo fue el último export y avisa cuando envejece.
 */

const CLAVE_ULTIMO = 'mh-ultimo-respaldo'
const CLAVE_POSPUESTO = 'mh-respaldo-pospuesto'
const DIAS_AVISO = 30
const DIAS_POSPONER = 7

/** Descarga TODAS las tablas como JSON y sella la fecha del último respaldo. */
export async function exportarRespaldo() {
  const datos: Record<string, unknown[]> = {}
  // Las tablas internas de sync (prefijo `_`) no se respaldan ni restauran.
  for (const tabla of db.tables) {
    if (tabla.name.startsWith('_')) continue
    datos[tabla.name] = await tabla.toArray()
  }
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mind-home-backup-${fechaLocalISO()}.json`
  a.click()
  URL.revokeObjectURL(url)
  localStorage.setItem(CLAVE_ULTIMO, fechaLocalISO())
}

/** Fecha (yyyy-mm-dd) del último export, o null si nunca se ha exportado. */
export function fechaUltimoRespaldo(): string | null {
  return localStorage.getItem(CLAVE_ULTIMO)
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso + 'T00:00').getTime()) / 86_400_000)
}

/** Días transcurridos desde el último export, o null si nunca se ha exportado. */
export function diasSinRespaldo(): number | null {
  const ultimo = fechaUltimoRespaldo()
  return ultimo ? diasDesde(ultimo) : null
}

/**
 * ¿Toca avisar? La primera visita sella "hoy" como punto de partida (a un
 * usuario nuevo no se le pide respaldar el día 1) y el ✕ pospone una semana.
 */
export function avisoRespaldoPendiente(): boolean {
  const ultimo = localStorage.getItem(CLAVE_ULTIMO)
  if (!ultimo) {
    localStorage.setItem(CLAVE_ULTIMO, fechaLocalISO())
    return false
  }
  if (diasDesde(ultimo) < DIAS_AVISO) return false
  const pospuesto = localStorage.getItem(CLAVE_POSPUESTO)
  return !(pospuesto && diasDesde(pospuesto) < DIAS_POSPONER)
}

export function posponerAvisoRespaldo() {
  localStorage.setItem(CLAVE_POSPUESTO, fechaLocalISO())
}
