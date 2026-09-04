import { db } from './db'
import { fechaLocalISO } from '../fechaLocal'
import { descargarArchivo } from '../descargarArchivo'

/**
 * Export/estado del respaldo local. IndexedDB puede ser purgado por el navegador,
 * así que la app recuerda cuándo fue el último export y avisa cuando envejece.
 */

const CLAVE_ULTIMO = 'mh-ultimo-respaldo'
const CLAVE_POSPUESTO = 'mh-respaldo-pospuesto'
const DIAS_AVISO = 30
const DIAS_POSPONER = 7

/**
 * Cifrado OPCIONAL del respaldo (auditoría 26-ago-2026). El export vuelca en
 * claro salud, finanzas y diario; con una contraseña el archivo sale cifrado con
 * AES-GCM y una clave derivada de la contraseña (PBKDF2-SHA256). La contraseña no
 * se guarda en ningún sitio: sin ella el archivo es irrecuperable.
 */
export interface RespaldoCifrado {
  mph: 'respaldo-cifrado'
  v: 1
  iteraciones: number
  salt: string
  iv: string
  datos: string
}

const ITERACIONES = 210_000

function aBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function deBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function derivarClave(contrasena: string, salt: Uint8Array<ArrayBuffer>, iteraciones: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iteraciones, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** ¿El JSON leído de un archivo es un respaldo cifrado? */
export function esRespaldoCifrado(json: unknown): json is RespaldoCifrado {
  return typeof json === 'object' && json !== null && (json as { mph?: unknown }).mph === 'respaldo-cifrado'
}

/** Descifra el sobre con la contraseña; lanza si la contraseña no cuadra o el archivo está dañado. */
export async function descifrarRespaldo(sobre: RespaldoCifrado, contrasena: string): Promise<string> {
  const clave = await derivarClave(contrasena, deBase64(sobre.salt), sobre.iteraciones)
  const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(sobre.iv) }, clave, deBase64(sobre.datos))
  return new TextDecoder().decode(plano)
}

async function cifrarRespaldo(textoPlano: string, contrasena: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const clave = await derivarClave(contrasena, salt, ITERACIONES)
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, new TextEncoder().encode(textoPlano)),
  )
  const sobre: RespaldoCifrado = {
    mph: 'respaldo-cifrado',
    v: 1,
    iteraciones: ITERACIONES,
    salt: aBase64(salt),
    iv: aBase64(iv),
    datos: aBase64(cifrado),
  }
  return JSON.stringify(sobre)
}

/**
 * Descarga TODAS las tablas como JSON y sella la fecha del último respaldo. Con
 * `contrasena` el archivo sale cifrado (extensión `.cifrado.json`).
 */
export async function exportarRespaldo(contrasena?: string) {
  const datos: Record<string, unknown[]> = {}
  // Las tablas internas de sync (prefijo `_`) no se respaldan ni restauran.
  for (const tabla of db.tables) {
    if (tabla.name.startsWith('_')) continue
    datos[tabla.name] = await tabla.toArray()
  }
  const texto = JSON.stringify(datos, null, 2)
  const cifra = contrasena?.trim() ?? ''
  const contenido = cifra ? await cifrarRespaldo(texto, cifra) : texto
  const blob = new Blob([contenido], { type: 'application/json' })
  await descargarArchivo(blob, `mind-home-backup-${fechaLocalISO()}${cifra ? '.cifrado' : ''}.json`)
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
