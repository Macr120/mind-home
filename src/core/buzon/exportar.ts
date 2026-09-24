import { descargarArchivo } from '../descargarArchivo'
import { esAppNativa } from '../plataforma'
import { tipoCompartible, type Paquete } from './compartibles'

/**
 * Sacar un contenido FUERA de MindHaOS (el mismo paquete que va a un contacto):
 * la hoja de compartir del sistema si la hay o, si no, descargarlo como archivo. Cada
 * tipo puede dar su formato (`TipoCompartible.exportar`: el dibujo en imagen,
 * la hoja en CSV…); si no, sale un .txt legible con sus textos y sus fotos.
 */

/** Claves de los datos que no dicen nada fuera de la app. */
const OMITIR = new Set(['deAlias', 'emoji', 'carpeta', 'momentos', 'color', 'anchos', 'graficas', 'tipoLibro', 'version', 'ejemploDe'])

export function nombreArchivo(nombre: string): string {
  return nombre.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'MindHaOS'
}

export function extension(mime: string): string {
  const sub = mime.split('/')[1]?.split(';')[0] ?? 'bin'
  return sub === 'jpeg' ? 'jpg' : sub === 'svg+xml' ? 'svg' : sub
}

const sinHtml = (s: string) =>
  s.includes('<')
    ? s
        .replace(/<\/(p|h[1-6]|li|div)>|<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : s

/** Los textos de los datos, en orden: listas con guion y objetos aplanados. */
function lineas(v: unknown, nivel: number): string[] {
  if (typeof v === 'string') return v.trim() ? [sinHtml(v)] : []
  if (Array.isArray(v)) {
    return v.flatMap((x) => {
      const l = lineas(x, nivel + 1)
      return l.length ? [`${'  '.repeat(nivel)}- ${l[0]}`, ...l.slice(1)] : []
    })
  }
  if (v && typeof v === 'object') {
    return Object.entries(v).flatMap(([k, x]) => (OMITIR.has(k) || /id$/i.test(k) ? [] : lineas(x, nivel)))
  }
  return []
}

/** Texto + las fotos del paquete (sin la miniatura, que es una copia chica). */
export function archivosGenericos(p: Paquete, cuerpo?: string): File[] {
  const base = nombreArchivo(p.nombre)
  const texto = cuerpo ?? [p.nombre, p.resumen ?? '', '', ...lineas(p.datos, 0).filter((l) => l !== p.nombre)].join('\n')
  const archivos = [new File([texto.trim() + '\n'], `${base}.txt`, { type: 'text/plain' })]
  for (const [k, b] of Object.entries(p.blobs ?? {})) {
    if (k === 'miniatura') continue
    archivos.push(new File([b], `${base}-${k}.${extension(b.type)}`, { type: b.type }))
  }
  return archivos
}

async function archivosDe(p: Paquete): Promise<File[]> {
  const def = tipoCompartible(p.app, p.tipo)
  return def?.exportar ? def.exportar(p) : archivosGenericos(p)
}

/** ¿Hay hoja de compartir del sistema? (en la app de tienda la abre `descargarArchivo`). */
export function puedeCompartirFuera(): boolean {
  return esAppNativa() || typeof navigator.share === 'function'
}

const cancelado = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/**
 * Hoja de compartir del sistema (WhatsApp, correo, Drive…). Con archivos si el
 * navegador los acepta; si no, al menos el nombre y el resumen; sin hoja, se descarga.
 */
export async function compartirFuera(p: Paquete): Promise<void> {
  const files = await archivosDe(p)
  // En Android/iOS `descargarArchivo` escribe el archivo y abre la hoja nativa.
  if (esAppNativa()) {
    for (const f of files) await descargarArchivo(f, f.name)
    return
  }
  try {
    if (navigator.canShare?.({ files })) return await navigator.share({ title: p.nombre, files })
    if (typeof navigator.share === 'function') {
      return await navigator.share({ title: p.nombre, text: [p.nombre, p.resumen].filter(Boolean).join('\n') })
    }
  } catch (e) {
    if (cancelado(e)) return
  }
  for (const f of files) await descargarArchivo(f, f.name)
}

export async function descargarFuera(p: Paquete): Promise<void> {
  for (const f of await archivosDe(p)) await descargarArchivo(f, f.name)
}
