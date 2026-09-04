import type { MedioVideo } from '../../core/data/db'
import { mediosVideoRepo } from '../../core/data/repository'
import { proveedorRecursos, type AppStudio, type RecursoStudio } from '../../core/recursosStudio'
import { comprimirFoto, miniaturaFoto } from '../_shared/fotos'
import type { MedioConId } from './clipsNuevos'
import { duracionAudio } from './importar'

/**
 * Traer un recurso de otra app del Studio al video: los binarios se COPIAN
 * como medio propio (`origen: 'studio'`), porque los medios del video son
 * locales y un dibujo o una canción pueden cambiar después; `fuente` +
 * `fuenteEn` permiten reutilizar la copia si el original no cambió. Los
 * textos no se copian: vuelven como guion para un clip de narración.
 */

export type Traido = { tipo: 'medio'; medio: MedioConId } | { tipo: 'texto'; texto: string; nombre: string }

export const fuenteDe = (app: AppStudio, r: RecursoStudio) => `${app}:${r.clave}`

export async function traerRecurso(app: AppStudio, r: RecursoStudio): Promise<Traido | null> {
  const fuente = fuenteDe(app, r)
  if (r.tipo !== 'texto') {
    const previo = (await mediosVideoRepo.list()).find((m) => m.fuente === fuente && m.fuenteEn === r.actualizadoEn)
    if (previo?.id != null) return { tipo: 'medio', medio: previo as MedioConId }
  }
  const c = await proveedorRecursos(app)?.obtener(r.clave)
  if (!c) return null
  if (c.tipo === 'texto') return { tipo: 'texto', texto: c.texto, nombre: c.nombre }
  const ahora = new Date().toISOString()
  let fila: Omit<MedioVideo, 'id'>
  if (c.tipo === 'imagen') {
    // Al lienzo de 720p le sobra la resolución del dibujo: misma compresión que al importar.
    const blob = await comprimirFoto(new File([c.blob], `${c.nombre}.png`, { type: c.blob.type || 'image/png' }))
    const bmp = await createImageBitmap(blob)
    fila = {
      tipo: 'imagen',
      nombre: c.nombre,
      blob,
      ancho: bmp.width,
      alto: bmp.height,
      miniatura: c.miniatura ?? (await miniaturaFoto(blob)),
      origen: 'studio',
      fuente,
      fuenteEn: r.actualizadoEn,
      creadoEn: ahora,
    }
    bmp.close()
  } else {
    const duracion = c.duracion || (await duracionAudio(c.blob))
    fila = { tipo: 'audio', nombre: c.nombre, blob: c.blob, duracion: duracion || undefined, origen: 'studio', fuente, fuenteEn: r.actualizadoEn, creadoEn: ahora }
  }
  const id = await mediosVideoRepo.add(fila)
  return { tipo: 'medio', medio: { ...fila, id } }
}
