/**
 * Papelera del cuarto Archivo. Borrar desde la UI solo sella `borradoEn` (la
 * fila y el objeto en R2 siguen, y siguen ocupando cuota); restaurar lo quita.
 * A los 30 días se borra para siempre, en la nube y en las filas.
 *
 * Vive en el núcleo y no en `rooms/archivos` porque la purga corre también al
 * acabar cada ciclo del sync (`motor.ts`), aunque nadie abra el cuarto.
 *
 * Una carpeta se va a la papelera con TODA su descendencia y el mismo sello: así
 * la papelera enseña solo la raíz del gesto y restaurarla devuelve exactamente
 * lo que se borró con ella (no lo que ya estaba en la papelera de antes).
 */
import { archivosNubeRepo, carpetasArchivoRepo } from '../data/repository'
import type { ArchivoNube, CarpetaArchivo } from '../data/db'
import { borrarArchivos, refrescarUsoAlmacen, revocarEnlacesDe } from './almacen'
import { hayBackend } from './supabase'
import { esDemo, esProbar } from '../edicion'

export const DIAS_PAPELERA = 30

export interface Seleccion {
  carpetas: CarpetaArchivo[]
  archivos: ArchivoNube[]
}

/** Ids de la carpeta y de todas las que cuelgan de ella. */
export function descendencia(id: number, carpetas: CarpetaArchivo[]): Set<number> {
  const ids = new Set([id])
  let crecio = true
  while (crecio) {
    crecio = false
    for (const c of carpetas) {
      if (c.id != null && c.padreId != null && ids.has(c.padreId) && !ids.has(c.id)) {
        ids.add(c.id)
        crecio = true
      }
    }
  }
  return ids
}

/** Lo que enseña la papelera: lo borrado cuya carpeta madre no se fue en el mismo gesto. */
export function raicesPapelera(carpetas: CarpetaArchivo[], archivos: ArchivoNube[]): Seleccion {
  const porId = new Map(carpetas.map((c) => [c.id, c]))
  const esRaiz = (sello: string, padreId: number | null) => {
    const p = padreId != null ? porId.get(padreId) : undefined
    return !p || p.borradoEn !== sello
  }
  return {
    carpetas: carpetas.filter((c) => c.borradoEn && esRaiz(c.borradoEn, c.padreId)),
    archivos: archivos.filter((a) => a.borradoEn && esRaiz(a.borradoEn, a.carpetaId)),
  }
}

/** Manda la selección a la papelera (con toda la descendencia de sus carpetas). */
export async function aPapelera(sel: Seleccion, todas: Seleccion): Promise<void> {
  const sello = new Date().toISOString()
  const ids = new Set<number>()
  for (const c of sel.carpetas) if (c.id != null) for (const id of descendencia(c.id, todas.carpetas)) ids.add(id)
  // Lo que ya estaba en la papelera conserva su sello: se restaura aparte.
  for (const c of todas.carpetas) if (c.id != null && ids.has(c.id) && !c.borradoEn) await carpetasArchivoRepo.update(c.id, { borradoEn: sello })
  const archivos = new Set(sel.archivos.map((a) => a.id))
  const claves: string[] = []
  for (const a of todas.archivos) {
    if (a.id == null || a.borradoEn) continue
    if (archivos.has(a.id) || (a.carpetaId != null && ids.has(a.carpetaId))) {
      await archivosNubeRepo.update(a.id, { borradoEn: sello })
      claves.push(a.clave)
    }
  }
  // Lo que está en la papelera deja de estar compartido. Sin red no frena el
  // borrado: el enlace muere igual al vaciarse (su objeto deja de contar).
  if (claves.length) await revocarEnlacesDe(claves).catch((e) => console.warn('[MPH] revocar enlaces', e))
}

/**
 * Saca de la papelera. Si la carpeta madre ya no existe o sigue en la papelera,
 * lo restaurado vuelve a la raíz (como Drive).
 */
export async function restaurar(sel: Seleccion, todas: Seleccion): Promise<void> {
  const porId = new Map(todas.carpetas.map((c) => [c.id, c]))
  const madreViva = (id: number | null) => id != null && !!porId.get(id) && !porId.get(id)!.borradoEn
  for (const c of sel.carpetas) {
    if (c.id == null || !c.borradoEn) continue
    const ids = descendencia(c.id, todas.carpetas)
    for (const h of todas.carpetas) {
      if (h.id != null && ids.has(h.id) && h.borradoEn === c.borradoEn) {
        await carpetasArchivoRepo.update(h.id, h.id === c.id && !madreViva(c.padreId) ? { borradoEn: undefined, padreId: null } : { borradoEn: undefined })
      }
    }
    for (const a of todas.archivos) {
      if (a.id != null && a.carpetaId != null && ids.has(a.carpetaId) && a.borradoEn === c.borradoEn) {
        await archivosNubeRepo.update(a.id, { borradoEn: undefined })
      }
    }
  }
  for (const a of sel.archivos) {
    if (a.id == null || !a.borradoEn) continue
    await archivosNubeRepo.update(a.id, madreViva(a.carpetaId) ? { borradoEn: undefined } : { borradoEn: undefined, carpetaId: null })
  }
}

/** Borra para siempre: primero la nube (si falla, las filas se quedan y se reintenta). */
export async function borrarParaSiempre(sel: Seleccion, todas: Seleccion): Promise<void> {
  const ids = new Set<number>()
  for (const c of sel.carpetas) if (c.id != null) for (const id of descendencia(c.id, todas.carpetas)) ids.add(id)
  const archivos = new Map<number, ArchivoNube>()
  for (const a of sel.archivos) if (a.id != null) archivos.set(a.id, a)
  for (const a of todas.archivos) if (a.id != null && a.carpetaId != null && ids.has(a.carpetaId)) archivos.set(a.id, a)
  const lista = [...archivos.values()]
  if (lista.length) await borrarArchivos(lista.map((a) => a.clave))
  for (const a of lista) await archivosNubeRepo.remove(a.id!)
  for (const id of ids) await carpetasArchivoRepo.remove(id)
  await refrescarUsoAlmacen()
}

let ultimaPurga = 0

/**
 * Borra lo que lleva más de 30 días en la papelera. Como mucho una vez por hora
 * por sesión: la llaman el motor del sync y el cuarto al abrirse.
 */
export async function purgarPapelera(): Promise<void> {
  if (!hayBackend() || esDemo() || esProbar() || Date.now() - ultimaPurga < 3_600_000) return
  ultimaPurga = Date.now()
  const todas = { carpetas: await carpetasArchivoRepo.list(), archivos: await archivosNubeRepo.list() }
  const limite = Date.now() - DIAS_PAPELERA * 86_400_000
  const vieja = (sello?: string) => !!sello && Date.parse(sello) < limite
  const raices = raicesPapelera(todas.carpetas, todas.archivos)
  const sel = { carpetas: raices.carpetas.filter((c) => vieja(c.borradoEn)), archivos: raices.archivos.filter((a) => vieja(a.borradoEn)) }
  if (!sel.carpetas.length && !sel.archivos.length) return
  try {
    await borrarParaSiempre(sel, todas)
  } catch (e) {
    console.warn('[MPH] purga de la papelera', e)
  }
}
