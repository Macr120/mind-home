import { documentosRepo, historiasRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import type { ContenidoRecurso, RecursoStudio } from '../../core/recursosStudio'
import { textoPlano } from './sanitizarHtml'

/**
 * Lo que el Studio de escritura presta a otras apps (el panel de medios del
 * Studio de video): cada documento como TEXTO plano, listo para ser el guion
 * de una narración. Se agrupa por libro.
 */

/** Lectura en voz alta: ~2,5 palabras por segundo. */
const duracionLectura = (palabras: number) => Math.max(3, Math.round(palabras / 2.5))

export async function listarRecursos(): Promise<RecursoStudio[]> {
  const [docs, libros] = await Promise.all([documentosRepo.list(), historiasRepo.list()])
  const tituloLibro = new Map(libros.filter((l) => l.id != null).map((l) => [l.id!, l.titulo]))
  const palabras = tGlobal('escritura.recursos.palabras', 'palabras')
  return docs
    .filter((d) => d.id != null && d.palabras > 0)
    .sort((a, b) => (tituloLibro.get(a.historiaId ?? -1) ?? '').localeCompare(tituloLibro.get(b.historiaId ?? -1) ?? '') || a.titulo.localeCompare(b.titulo))
    .map((d) => ({
      clave: `doc:${d.id}`,
      tipo: 'texto' as const,
      nombre: d.titulo,
      detalle: `${d.palabras} ${palabras}`,
      grupo: d.historiaId != null ? tituloLibro.get(d.historiaId) : undefined,
      duracion: duracionLectura(d.palabras),
      actualizadoEn: d.actualizadoEn,
    }))
}

export async function obtenerRecurso(clave: string): Promise<ContenidoRecurso | null> {
  const id = Number(clave.split(':')[1])
  const d = (await documentosRepo.list()).find((x) => x.id === id)
  if (!d) return null
  // Un espacio tras cada bloque: `textContent` pegaría el final de un párrafo con el inicio del siguiente.
  const conEspacios = d.contenido.replace(/<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, '$& ')
  return { tipo: 'texto', texto: textoPlano(conEspacios).replace(/\s+/g, ' '), nombre: d.titulo }
}
