import * as api from './api'
import { ErrorEspacio } from './tipos'

/**
 * Los binarios de un espacio compartido: subirlos al bucket privado
 * `espacio-archivos` (ruta `<espacioId>/medios/<ref>`) y traerlos de vuelta.
 *
 * Los objetos son INMUTABLES: cada medio se sube UNA vez con un `ref` nuevo, de
 * modo que quien ya lo bajó no vuelve a mirarlo nunca y el snapshot solo lleva
 * la referencia. Al borrar el espacio, `api.borrarCarpetaEspacio` se los lleva
 * todos (lo hace el PanelCompartir antes del `espacio_borrar`).
 *
 * Módulo hoja, como el resto de `espacios/`: no sabe de cuartos ni de `db`.
 * Quién sube qué y dónde se guarda lo que baja lo decide cada Studio.
 */

/** Tope por archivo: el mismo que impone el bucket. */
export const TOPE_MEDIO = 50 * 1024 * 1024
/** Tope de lo que los medios de UN proyecto compartido ocupan en la nube. */
export const TOPE_PROYECTO = 300 * 1024 * 1024

/**
 * Tipos MIME que admite el bucket. Cualquier otro lo rechazaría el servidor, así
 * que se descarta antes de gastar la subida (y antes de creerse un snapshot
 * ajeno que diga lo que sea).
 */
export const MIMES_MEDIO: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/mpeg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
])

/** Un binario tal como viaja en el snapshot: la ficha, no el archivo. */
export interface MedioRemoto {
  /** Nombre del objeto dentro de `<espacioId>/medios/`. */
  ref: string
  nombre: string
  /** 'video' | 'imagen' | 'audio' (lo interpreta el cuarto). */
  tipo: string
  mime: string
  size: number
  duracion?: number
  ancho?: number
  alto?: number
  /** Efecto de sonido de la carpeta «Sonidos», no de la biblioteca de medios. */
  sonido?: boolean
}

/** Lo que hace falta saber de un medio para subirlo (el `ref` lo pone esta capa). */
export type MetaMedio = Omit<MedioRemoto, 'ref' | 'mime' | 'size'>

const MAX_MEDIOS = 200
const MAX_NOMBRE = 120

const rutaDe = (espacioId: string, ref: string) => `${espacioId}/medios/${ref}`

/**
 * Sube un binario y devuelve su ficha (con el `ref` recién estrenado, que es lo
 * que el snapshot guarda). Sin `upsert`: cada llamada crea un objeto nuevo, así
 * que nadie puede cambiarle el contenido a una referencia que otro ya bajó.
 */
export async function subirMedio(
  esp: { espacioId: string },
  blob: Blob,
  meta: MetaMedio,
): Promise<MedioRemoto> {
  if (blob.size > TOPE_MEDIO) throw new ErrorEspacio('cambio-grande')
  if (!MIMES_MEDIO.has(blob.type)) throw new ErrorEspacio('peticion-invalida')
  const ref = crypto.randomUUID()
  await api.subirArchivo(esp.espacioId, `medios/${ref}`, blob)
  return { ...meta, ref, mime: blob.type, size: blob.size }
}

export async function descargarMedio(esp: { espacioId: string }, ref: string): Promise<Blob> {
  return api.descargarArchivo(rutaDe(esp.espacioId, ref))
}

// ─── lectura defensiva (esta lista viene de OTRA persona) ────────────────────

const texto = (v: unknown, tope: number): string => (typeof v === 'string' ? v.slice(0, tope) : '')

const numOpc = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined

/** La lista de medios de un snapshot ajeno, saneada y acotada. */
export function leerMediosRemotos(bruto: unknown): MedioRemoto[] {
  if (!Array.isArray(bruto)) return []
  const lista: MedioRemoto[] = []
  const vistos = new Set<string>()
  for (const x of bruto.slice(0, MAX_MEDIOS)) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) continue
    const m = x as Record<string, unknown>
    const ref = texto(m.ref, 64)
    const mime = texto(m.mime, 64)
    // El `ref` es un nombre de objeto: nada de rutas ni de subir de carpeta.
    if (!ref || vistos.has(ref) || !/^[A-Za-z0-9_-]{8,64}$/.test(ref)) continue
    if (!MIMES_MEDIO.has(mime)) continue
    vistos.add(ref)
    lista.push({
      ref,
      nombre: texto(m.nombre, MAX_NOMBRE),
      tipo: texto(m.tipo, 16),
      mime,
      size: numOpc(m.size, 0, TOPE_MEDIO) ?? 0,
      duracion: numOpc(m.duracion, 0, 24 * 3600),
      ancho: numOpc(m.ancho, 0, 16_384),
      alto: numOpc(m.alto, 0, 16_384),
      ...(m.sonido === true ? { sonido: true } : {}),
    })
  }
  return lista
}
