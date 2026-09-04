import type { RelacionLibro, SeccionHistoria } from '../../core/data/db'
import { documentosRepo, relacionesLibroRepo } from '../../core/data/repository'
import type { TFunc } from '../../core/i18n/useT'
import { pedirTexto } from '../../core/state/confirmarStore'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { semillaSeccion } from './semillas'

export interface CarpetaHistoria {
  seccion: Exclude<SeccionHistoria, 'trama' | 'relacion'>
  icono: NombreIcono
  clave: string
  labelEs: string
  claveNuevo: string
  nuevoEs: string
}

/** Las cuatro carpetas fijas de una historia (las tramas cuelgan de su acto). */
export const CARPETAS: CarpetaHistoria[] = [
  { seccion: 'capitulo', icono: 'tab-diario', clave: 'escritura.historias.capitulos', labelEs: 'Capítulos', claveNuevo: 'escritura.historias.nuevoCapitulo', nuevoEs: 'Nuevo capítulo' },
  { seccion: 'personaje', icono: 'persona', clave: 'escritura.historias.personajes', labelEs: 'Personajes', claveNuevo: 'escritura.historias.nuevoPersonaje', nuevoEs: 'Nuevo personaje' },
  { seccion: 'lugar', icono: 'ubicacion', clave: 'escritura.historias.lugares', labelEs: 'Lugares', claveNuevo: 'escritura.historias.nuevoLugar', nuevoEs: 'Nuevo lugar' },
  { seccion: 'acto', icono: 'mascara', clave: 'escritura.historias.actos', labelEs: 'Actos', claveNuevo: 'escritura.historias.nuevoActo', nuevoEs: 'Nuevo acto' },
]

/** La nota de una conexión del diagrama; si aún no existe (conexiones viejas) la crea. */
export async function notaDeRelacion(r: RelacionLibro, titulo: string): Promise<number> {
  if (r.docId != null) return r.docId
  const ahora = new Date().toISOString()
  const docId = await documentosRepo.add({
    titulo,
    contenido: '',
    palabras: 0,
    historiaId: r.historiaId,
    seccion: 'relacion',
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
  if (r.id != null) await relacionesLibroRepo.update(r.id, { docId })
  return docId
}

/** Pide el título y crea la ficha con su semilla. Devuelve el id, o null si se cancela. */
export async function crearFicha(
  t: TFunc,
  historiaId: number,
  seccion: SeccionHistoria,
  claveNuevo: string,
  nuevoEs: string,
  actoId?: number,
): Promise<number | null> {
  const titulo = await pedirTexto({ titulo: t(claveNuevo, nuevoEs) })
  if (!titulo) return null
  const ahora = new Date().toISOString()
  return documentosRepo.add({
    titulo,
    contenido: semillaSeccion(seccion, t),
    palabras: 0,
    historiaId,
    seccion,
    ...(actoId != null ? { actoId } : {}),
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}
