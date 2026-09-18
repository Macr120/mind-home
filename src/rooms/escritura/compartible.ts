import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoLibro } from '../../core/data/db'
import { documentosRepo, historiasRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { contarPalabras, sanitizarHtml, textoPlano } from './sanitizarHtml'

/**
 * Los documentos que el Studio de escritura manda por el buzón: el HTML
 * saneado del texto. Al receptor le nace como un libro nuevo con ese documento
 * de primer capítulo (mismo camino que el esquema `texto` del chat).
 */

const TIPOS_LIBRO: TipoLibro[] = ['blanco', 'cuento', 'guion', 'teatro']

interface DocumentoDatos {
  titulo: string
  /** HTML saneado; se vuelve a sanear al importar (viene de otra instalación). */
  contenido: string
  palabras: number
  tipoLibro?: TipoLibro
}

const detallePalabras = (n: number) => `${n} ${tGlobal('escritura.recursos.palabras', 'palabras')}`

export async function empaquetarDocumento(d: { titulo: string; contenido: string; tipoLibro?: TipoLibro }): Promise<Paquete> {
  const contenido = sanitizarHtml(d.contenido)
  const palabras = contarPalabras(textoPlano(contenido))
  const datos: DocumentoDatos = {
    titulo: d.titulo,
    contenido,
    palabras,
    ...(d.tipoLibro ? { tipoLibro: d.tipoLibro } : {}),
  }
  return { app: 'escritura', tipo: 'documento', version: 1, nombre: d.titulo, resumen: detallePalabras(palabras), datos }
}

export async function listarDocumentos(): Promise<ItemCompartible[]> {
  const [docs, libros] = await Promise.all([documentosRepo.list(), historiasRepo.list()])
  const tituloLibro = new Map(libros.filter((l) => l.id != null).map((l) => [l.id!, l.titulo]))
  return docs
    .filter((d) => d.id != null && d.palabras > 0)
    .map((d) => ({
      clave: `doc:${d.id}`,
      nombre: d.titulo,
      detalle: [d.historiaId != null ? tituloLibro.get(d.historiaId) : undefined, detallePalabras(d.palabras)].filter(Boolean).join(' · '),
    }))
}

export async function empaquetarDocumentoPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const d = (await documentosRepo.list()).find((x) => x.id === id)
  if (!d) return null
  const libro = d.historiaId != null ? (await historiasRepo.list()).find((l) => l.id === d.historiaId) : undefined
  return empaquetarDocumento({ titulo: d.titulo, contenido: d.contenido, tipoLibro: libro?.tipo })
}

export async function importarDocumento(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<DocumentoDatos> | null
  if (!d || typeof d.titulo !== 'string' || typeof d.contenido !== 'string') throw new Error('Documento inválido')
  const existente = (await historiasRepo.list()).find((x) => normalizar(x.titulo) === normalizar(d.titulo!))
  if (existente && !(await confirmarDuplicado(d.titulo))) return { cancelado: true }
  const contenido = sanitizarHtml(d.contenido)
  const ahora = new Date().toISOString()
  const historiaId = (await historiasRepo.add({
    titulo: d.titulo,
    tipo: TIPOS_LIBRO.includes(d.tipoLibro as TipoLibro) ? (d.tipoLibro as TipoLibro) : 'blanco',
    ...(p.deAlias ? { resumen: `@${p.deAlias}` } : {}),
    creadoEn: ahora,
    actualizadoEn: ahora,
  })) as number
  await documentosRepo.add({
    titulo: d.titulo,
    contenido,
    palabras: contarPalabras(textoPlano(contenido)),
    historiaId,
    seccion: 'capitulo',
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
  return { seccion: 'libros', dato: String(historiaId) }
}
