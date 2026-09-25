/**
 * Sube SOLOS a la nube del usuario (Cloudflare R2) los binarios del Studio:
 * clips e imágenes de video, tomas de micrófono, canciones del mezclador y
 * pistas de música. Con la copia arriba, la fila gana `nube` y desde ese
 * momento viaja por el sync SIN el blob (`CAMPOS_LOCALES` en syncables.ts); el
 * otro dispositivo la baja al necesitarla (`asegurarBlob`).
 *
 * Corre al acabar cada ciclo del motor de sync (Pro o mes incluido), de uno en
 * uno y sin hashes (los videos pesan cientos de MB). La clave va bajo el prefijo
 * del sync (`sync/<tabla>/<uid>/blob`), así que borrar la fila en cualquier
 * dispositivo borra también el objeto (`borrarBlobsDeRegistro`).
 *
 * Si la cuota se llena, para y lo nuevo se queda solo en este dispositivo:
 * `useNubeStudio().llena` lo avisa. La promo del Studio (se regenera en cada
 * dispositivo desde /public) nunca sube.
 */
import { create } from 'zustand'
import { db, type EnNube } from '../data/db'
import { ErrorAlmacen, refrescarUsoAlmacen, subirArchivo } from '../cuenta/almacen'
import { hayBackend } from '../cuenta/supabase'
import { esDemo, esProbar, tieneAcceso } from '../edicion'

const TABLAS = ['mediosVideo', 'grabacionesAudio', 'musicaImportada', 'pistasMusica'] as const

/** Prefijo de `MedioVideo.fuente` de la promo (`rooms/video/promo.ts`). */
const PREFIJO_PROMO = 'promo:'

interface Fila {
  id?: number
  uid?: string
  blob?: Blob
  nube?: EnNube
  fuente?: string
}

/** `llena`: la última subida chocó con la cuota. `pendientes`: lo que falta subir en esta pasada. */
export const useNubeStudio = create<{ llena: boolean; pendientes: number }>(() => ({ llena: false, pendientes: 0 }))

/** Falta subirla: tiene blob y no tiene copia, o la copia es de otro tamaño (el blob cambió). */
const faltaSubir = (tabla: string, f: Fila) =>
  !!f.blob &&
  (!f.nube || f.nube.bytes !== f.blob.size) &&
  !(tabla === 'mediosVideo' && f.fuente?.startsWith(PREFIJO_PROMO))

/** Filas que pasan del tope por archivo: no se reintentan en esta sesión. */
const demasiadoGrandes = new Set<string>()

let corriendo = false
let otraVez = false

export async function subirMediosPendientes(): Promise<void> {
  if (!hayBackend() || esDemo() || esProbar() || !tieneAcceso()) return
  if (corriendo) {
    otraVez = true
    return
  }
  corriendo = true
  let subio = false
  try {
    do {
      otraVez = false
      const cola: { tabla: (typeof TABLAS)[number]; id: number }[] = []
      for (const tabla of TABLAS) {
        const ids = (await db
          .table(tabla)
          .filter((f: Fila) => faltaSubir(tabla, f))
          .primaryKeys()) as number[]
        for (const id of ids) if (!demasiadoGrandes.has(`${tabla}:${id}`)) cola.push({ tabla, id })
      }
      useNubeStudio.setState({ pendientes: cola.length })
      for (const { tabla, id } of cola) {
        const t = db.table(tabla)
        const f = (await t.get(id)) as Fila | undefined
        if (!f?.blob || !f.uid || !faltaSubir(tabla, f)) continue
        const clave = `sync/${tabla}/${f.uid}/blob`
        try {
          const bytes = await subirArchivo(clave, f.blob)
          const nube: EnNube = { clave, bytes, mime: f.blob.type || 'application/octet-stream' }
          // Escritura normal: sella `updatedAt` y la encola, y el sync sube la fila.
          await t.update(id, { nube })
          subio = true
          useNubeStudio.setState((s) => ({ llena: false, pendientes: Math.max(0, s.pendientes - 1) }))
        } catch (e) {
          if (e instanceof ErrorAlmacen && e.motivo === 'grande') {
            demasiadoGrandes.add(`${tabla}:${id}`)
            continue
          }
          if (e instanceof ErrorAlmacen && e.motivo === 'cuota') useNubeStudio.setState({ llena: true })
          // Cuota, sin plan, sin red o sin almacén: se reintenta en el próximo ciclo.
          return
        }
      }
    } while (otraVez)
  } finally {
    corriendo = false
    useNubeStudio.setState({ pendientes: 0 })
    if (subio) void refrescarUsoAlmacen()
  }
}
