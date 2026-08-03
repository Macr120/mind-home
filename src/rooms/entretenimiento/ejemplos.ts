import { mediaArchivoRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { IMAGENES_EJEMPLO } from '../_shared/ejemplos/imagenes'
import { porIdioma, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_ENTRETENIMIENTO } from './ejemplos.data'

/**
 * Ejemplo de fábrica del entretenimiento: cuatro fichas del archivo, una de
 * cada tipo y en tres estados distintos.
 *
 * Los títulos son INVENTADOS a propósito: una obra real llenaría el archivo de
 * alguien de cosas que no ha visto, y la portada de fábrica no se corresponde
 * con ninguna edición existente. La portada es una ruta de `public/`, que es
 * justo lo que guarda el campo `portada` cuando se busca en la web.
 */

const ID = 'entretenimiento.archivo'

export const ejemploEntretenimiento: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => mediaArchivoRepo.list())) return
    const T = porIdioma(TEXTOS_ENTRETENIMIENTO)
    const hoy = fechaLocalISO()
    const cuando = (dias: number) => `${isoMasDias(hoy, dias)}T20:00:00.000Z`

    await mediaArchivoRepo.add({
      tipo: 'pelicula',
      titulo: T.peliTitulo,
      genero: T.peliGenero,
      autor: T.peliAutor,
      fecha: isoMasDias(hoy, -6),
      estado: 'completado',
      calificacion: 4,
      resena: T.peliResena,
      portada: IMAGENES_EJEMPLO['entretenimiento.pelicula'],
      creadoEn: cuando(-6),
      ejemploDe: ID,
    })
    // A media serie: es el estado que estrena la etiqueta «en curso».
    await mediaArchivoRepo.add({
      tipo: 'serie',
      titulo: T.serieTitulo,
      genero: T.serieGenero,
      fecha: isoMasDias(hoy, -2),
      estado: 'en_curso',
      calificacion: 4,
      resena: T.serieResena,
      creadoEn: cuando(-2),
      ejemploDe: ID,
    })
    await mediaArchivoRepo.add({
      tipo: 'libro',
      titulo: T.libroTitulo,
      genero: T.libroGenero,
      autor: T.libroAutor,
      fecha: isoMasDias(hoy, -18),
      estado: 'completado',
      calificacion: 5,
      resena: T.libroResena,
      portada: IMAGENES_EJEMPLO['entretenimiento.libro'],
      creadoEn: cuando(-18),
      ejemploDe: ID,
    })
    // Pendiente y sin puntuar: así se ve que la ficha vale también para lo que
    // aún no has empezado.
    await mediaArchivoRepo.add({
      tipo: 'videojuego',
      titulo: T.juegoTitulo,
      genero: T.juegoGenero,
      fecha: hoy,
      estado: 'pendiente',
      calificacion: 0,
      resena: '',
      creadoEn: cuando(0),
      ejemploDe: ID,
    })
  },
}
