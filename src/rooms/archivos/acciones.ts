/**
 * Lo que hace el cuarto Archivo con la nube: subir, crear carpetas, mover,
 * renombrar y borrar. Los bytes van al almacén (R2, `core/cuenta/almacen.ts`);
 * aquí solo se escriben las filas de metadatos, que el sync reparte.
 */
import { create } from 'zustand'
import { archivosNubeRepo, carpetasArchivoRepo } from '../../core/data/repository'
import type { ArchivoNube, CarpetaArchivo } from '../../core/data/db'
import { borrarArchivos, refrescarUsoAlmacen, subirArchivo, urlsDeBajada } from '../../core/cuenta/almacen'
import { comprimirImagen } from '../../core/imagenIA'
import { descargarUrl } from '../../core/descargarArchivo'
import { LADO_MINIATURA, SUBIDAS_A_LA_VEZ } from './constantes'

export interface Subida {
  id: string
  nombre: string
  fraccion: number
  error?: string
}

/**
 * Subidas en curso. Vive fuera del componente: cerrar el cuarto no corta la
 * subida y al volver se sigue viendo su progreso.
 */
export const useSubidas = create<{ lista: Subida[] }>(() => ({ lista: [] }))

const cambiar = (id: string, c: Partial<Subida>) =>
  useSubidas.setState((s) => ({ lista: s.lista.map((x) => (x.id === id ? { ...x, ...c } : x)) }))

export function descartarSubida(id: string): void {
  useSubidas.setState((s) => ({ lista: s.lista.filter((x) => x.id !== id) }))
}

async function miniaturaDe(archivo: File): Promise<Blob | undefined> {
  if (!archivo.type.startsWith('image/')) return undefined
  const m = await comprimirImagen(archivo, LADO_MINIATURA)
  // Formato que el canvas no sabe leer: `comprimirImagen` devuelve el original.
  return m === archivo || m.size > 200_000 ? undefined : m
}

async function subirUno(archivo: File, carpetaId: number | null, id: string): Promise<void> {
  const clave = `archivo/${crypto.randomUUID()}`
  try {
    const bytes = await subirArchivo(clave, archivo, (f) => cambiar(id, { fraccion: f }))
    // La fila nace DESPUÉS de confirmar: ningún dispositivo ve un archivo a medias.
    await archivosNubeRepo.add({
      nombre: archivo.name,
      carpetaId,
      clave,
      bytes,
      mime: archivo.type || 'application/octet-stream',
      miniatura: await miniaturaDe(archivo),
      creadoEn: new Date().toISOString(),
    })
    descartarSubida(id)
  } catch (e) {
    cambiar(id, { error: e instanceof Error ? e.message : String(e) })
  }
}

export async function subirArchivos(archivos: File[], carpetaId: number | null): Promise<void> {
  const tareas = archivos.map((a) => ({ a, id: crypto.randomUUID() }))
  useSubidas.setState((s) => ({ lista: [...s.lista, ...tareas.map(({ a, id }) => ({ id, nombre: a.name, fraccion: 0 }))] }))
  for (let i = 0; i < tareas.length; i += SUBIDAS_A_LA_VEZ) {
    await Promise.all(tareas.slice(i, i + SUBIDAS_A_LA_VEZ).map(({ a, id }) => subirUno(a, carpetaId, id)))
  }
  await refrescarUsoAlmacen()
}

export async function crearCarpeta(nombre: string, padreId: number | null): Promise<void> {
  await carpetasArchivoRepo.add({ nombre, padreId, creadoEn: new Date().toISOString() })
}

export async function renombrarArchivo(a: ArchivoNube, nombre: string): Promise<void> {
  if (a.id != null) await archivosNubeRepo.update(a.id, { nombre })
}

export async function renombrarCarpeta(c: CarpetaArchivo, nombre: string): Promise<void> {
  if (c.id != null) await carpetasArchivoRepo.update(c.id, { nombre })
}

export async function moverArchivo(a: ArchivoNube, carpetaId: number | null): Promise<void> {
  if (a.id != null) await archivosNubeRepo.update(a.id, { carpetaId })
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

/** Mueve una carpeta; dentro de sí misma o de una hija no se puede (lo filtra la UI). */
export async function moverCarpeta(c: CarpetaArchivo, padreId: number | null): Promise<void> {
  if (c.id != null) await carpetasArchivoRepo.update(c.id, { padreId })
}

export async function borrarArchivo(a: ArchivoNube): Promise<void> {
  // Primero la nube: si falla (sin red), la fila se queda y se puede reintentar.
  await borrarArchivos([a.clave])
  if (a.id != null) await archivosNubeRepo.remove(a.id)
  await refrescarUsoAlmacen()
}

/** Borra la carpeta con todo lo que lleva dentro, en la nube y en las filas. */
export async function borrarCarpeta(c: CarpetaArchivo, carpetas: CarpetaArchivo[], archivos: ArchivoNube[]): Promise<void> {
  if (c.id == null) return
  const ids = descendencia(c.id, carpetas)
  const dentro = archivos.filter((a) => a.carpetaId != null && ids.has(a.carpetaId))
  if (dentro.length) await borrarArchivos(dentro.map((a) => a.clave))
  for (const a of dentro) if (a.id != null) await archivosNubeRepo.remove(a.id)
  for (const id of ids) await carpetasArchivoRepo.remove(id)
  await refrescarUsoAlmacen()
}

/** URL firmada para verlo (15 min). */
export async function urlDeVista(a: ArchivoNube): Promise<string> {
  return (await urlsDeBajada([a.clave]))[a.clave]
}

export async function descargar(a: ArchivoNube): Promise<void> {
  const url = (await urlsDeBajada([a.clave], a.nombre))[a.clave]
  await descargarUrl(url, a.nombre)
}

export const mensajeDeError = (e: unknown): string => (e instanceof Error ? e.message : String(e))
