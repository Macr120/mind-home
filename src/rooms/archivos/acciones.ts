/**
 * Lo que hace el cuarto Archivo con la nube: subir (archivos sueltos o carpetas
 * enteras), crear carpetas, mover, renombrar, destacar y abrir o bajar. Los
 * bytes van al almacén (R2, `core/cuenta/almacen.ts`); aquí solo se escriben las
 * filas de metadatos, que el sync reparte. La papelera vive en
 * `core/cuenta/papelera.ts` (la purga corre también desde el sync).
 */
import { create } from 'zustand'
import { archivosNubeRepo, carpetasArchivoRepo } from '../../core/data/repository'
import type { ArchivoNube, CarpetaArchivo } from '../../core/data/db'
import { refrescarUsoAlmacen, subirArchivo, urlsDeBajada } from '../../core/cuenta/almacen'
import { descendencia, type Seleccion } from '../../core/cuenta/papelera'
import { comprimirImagen } from '../../core/imagenIA'
import { descargarArchivo, descargarUrl } from '../../core/descargarArchivo'
import { LADO_MINIATURA, SUBIDAS_A_LA_VEZ } from './constantes'

export { aPapelera, borrarParaSiempre, descendencia, raicesPapelera, restaurar, type Seleccion } from '../../core/cuenta/papelera'

/** Lo mínimo para ver o bajar algo: un archivo de la nube o uno de una app. */
export interface Abrible {
  nombre: string
  mime: string
  bytes: number
  creadoEn: string
  /** Clave en R2 (archivos de la nube, medios del Studio que ya subieron). */
  clave?: string
  /** Bytes en este dispositivo (fotos y dibujos de las apps). */
  blob?: Blob
}

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

async function subirTareas(tareas: { archivo: File; carpetaId: number | null }[]): Promise<void> {
  const conId = tareas.map((t) => ({ ...t, id: crypto.randomUUID() }))
  useSubidas.setState((s) => ({ lista: [...s.lista, ...conId.map(({ archivo, id }) => ({ id, nombre: archivo.name, fraccion: 0 }))] }))
  for (let i = 0; i < conId.length; i += SUBIDAS_A_LA_VEZ) {
    await Promise.all(conId.slice(i, i + SUBIDAS_A_LA_VEZ).map((t) => subirUno(t.archivo, t.carpetaId, t.id)))
  }
  await refrescarUsoAlmacen()
}

export function subirArchivos(archivos: File[], carpetaId: number | null): Promise<void> {
  return subirTareas(archivos.map((archivo) => ({ archivo, carpetaId })))
}

/** Un archivo que llega dentro de una carpeta del sistema: `ruta` son sus carpetas. */
export interface ArchivoConRuta {
  archivo: File
  ruta: string[]
}

/**
 * Sube una carpeta entera del sistema respetando su árbol: primero crea las
 * subcarpetas (también las vacías) y luego sube cada archivo a la suya.
 */
export async function subirConRutas(archivos: ArchivoConRuta[], carpetas: string[][], destino: number | null): Promise<void> {
  const ids = new Map<string, number | null>()
  const asegurar = async (ruta: string[]): Promise<number | null> => {
    let padre = destino
    for (let i = 0; i < ruta.length; i++) {
      const k = ruta.slice(0, i + 1).join('/')
      let id = ids.get(k)
      if (id === undefined) {
        id = await crearCarpeta(ruta[i], padre)
        ids.set(k, id)
      }
      padre = id
    }
    return padre
  }
  for (const c of carpetas) await asegurar(c)
  const tareas = []
  for (const a of archivos) tareas.push({ archivo: a.archivo, carpetaId: await asegurar(a.ruta) })
  await subirTareas(tareas)
}

/**
 * Lo soltado desde el sistema, con sus carpetas. `webkitGetAsEntry` solo vale
 * DENTRO del evento `drop`: por eso las entradas se sacan aquí en síncrono y se
 * recorren después.
 */
export function entradasSoltadas(dt: DataTransfer): FileSystemEntry[] {
  return [...dt.items].map((i) => (i.kind === 'file' ? i.webkitGetAsEntry?.() : null)).filter((e): e is FileSystemEntry => !!e)
}

export async function leerEntradas(entradas: FileSystemEntry[]): Promise<{ archivos: ArchivoConRuta[]; carpetas: string[][] }> {
  const archivos: ArchivoConRuta[] = []
  const carpetas: string[][] = []
  const recorrer = async (e: FileSystemEntry, ruta: string[]): Promise<void> => {
    if (e.isFile) {
      archivos.push({ archivo: await new Promise<File>((ok, mal) => (e as FileSystemFileEntry).file(ok, mal)), ruta })
    } else if (e.isDirectory) {
      const aqui = [...ruta, e.name]
      carpetas.push(aqui)
      const lector = (e as FileSystemDirectoryEntry).createReader()
      // `readEntries` entrega por lotes (100 en Chrome): se pide hasta que venga vacío.
      for (;;) {
        const lote = await new Promise<FileSystemEntry[]>((ok, mal) => lector.readEntries(ok, mal))
        if (!lote.length) break
        for (const h of lote) await recorrer(h, aqui)
      }
    }
  }
  for (const e of entradas) await recorrer(e, [])
  return { archivos, carpetas }
}

/** Lo elegido con `<input webkitdirectory>`: la ruta viene en `webkitRelativePath`. */
export function conRutas(lista: File[]): { archivos: ArchivoConRuta[]; carpetas: string[][] } {
  return {
    archivos: lista.map((archivo) => ({ archivo, ruta: (archivo.webkitRelativePath || archivo.name).split('/').slice(0, -1) })),
    carpetas: [],
  }
}

export async function crearCarpeta(nombre: string, padreId: number | null): Promise<number> {
  return carpetasArchivoRepo.add({ nombre, padreId, creadoEn: new Date().toISOString() })
}

/**
 * La carpeta de «tus archivos» de un cuarto. Nace al primer uso (subir o soltar
 * algo dentro). Si dos dispositivos la crearon a la vez, la vista enseña la
 * unión y lo nuevo cae en la más antigua.
 */
export async function carpetaDeCuarto(cuartoId: string, nombre: string): Promise<number> {
  const suyas = (await carpetasArchivoRepo.list())
    .filter((c) => c.cuartoId === cuartoId && !c.borradoEn)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  if (suyas[0]?.id != null) return suyas[0].id
  return carpetasArchivoRepo.add({ nombre, padreId: null, cuartoId, creadoEn: new Date().toISOString() })
}

export async function renombrarArchivo(a: ArchivoNube, nombre: string): Promise<void> {
  if (a.id != null) await archivosNubeRepo.update(a.id, { nombre })
}

export async function renombrarCarpeta(c: CarpetaArchivo, nombre: string): Promise<void> {
  if (c.id != null) await carpetasArchivoRepo.update(c.id, { nombre })
}

/** Mueve la selección. Una carpeta no cae dentro de sí misma ni de una hija: esas se saltan. */
export async function mover(sel: Seleccion, destino: number | null, todas: Seleccion): Promise<void> {
  for (const c of sel.carpetas) {
    if (c.id == null || c.padreId === destino) continue
    if (destino != null && descendencia(c.id, todas.carpetas).has(destino)) continue
    await carpetasArchivoRepo.update(c.id, { padreId: destino })
  }
  for (const a of sel.archivos) if (a.id != null && a.carpetaId !== destino) await archivosNubeRepo.update(a.id, { carpetaId: destino })
}

export async function destacar(sel: Seleccion, valor: boolean): Promise<void> {
  for (const c of sel.carpetas) if (c.id != null) await carpetasArchivoRepo.update(c.id, { destacado: valor || undefined })
  for (const a of sel.archivos) if (a.id != null) await archivosNubeRepo.update(a.id, { destacado: valor || undefined })
}

const EXTENSIONES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}

/** Los nombres de las apps («Mi dibujo») no traen extensión: se la pone el tipo. */
export function conExtension(nombre: string, mime: string): string {
  if (/\.[a-z0-9]{2,5}$/i.test(nombre)) return nombre
  const ext = EXTENSIONES[mime.split(';')[0]]
  return ext ? `${nombre}.${ext}` : nombre
}

/** URL firmada para verlo (15 min). */
export async function urlDeVista(a: Abrible): Promise<string> {
  if (!a.clave) throw new Error('sin-clave')
  return (await urlsDeBajada([a.clave]))[a.clave]
}

export async function descargar(a: Abrible): Promise<void> {
  const nombre = conExtension(a.nombre, a.mime)
  if (a.blob) return descargarArchivo(a.blob, nombre)
  if (!a.clave) return
  const url = (await urlsDeBajada([a.clave], nombre))[a.clave]
  await descargarUrl(url, nombre)
}

export const mensajeDeError = (e: unknown): string => (e instanceof Error ? e.message : String(e))
