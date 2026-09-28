import { mediaArchivoRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { IMAGENES_EJEMPLO } from '../_shared/ejemplos/imagenes'
import { filaEjemplo, porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
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
  tablas: [mediaArchivoRepo],
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => mediaArchivoRepo.list())) return
    const T = porIdioma(TEXTOS_ENTRETENIMIENTO)
    const hoy = fechaLocalISO()
    const cuando = (dias: number) => `${isoMasDias(hoy, dias)}T20:00:00.000Z`

    await mediaArchivoRepo.addSeed(
      filaEjemplo(ID, 'pelicula', restaurar, {
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
      }),
    )
    // A media serie: es el estado que estrena la etiqueta «en curso».
    await mediaArchivoRepo.addSeed(
      filaEjemplo(ID, 'serie', restaurar, {
        tipo: 'serie',
        titulo: T.serieTitulo,
        genero: T.serieGenero,
        fecha: isoMasDias(hoy, -2),
        estado: 'en_curso',
        calificacion: 4,
        resena: T.serieResena,
        creadoEn: cuando(-2),
      }),
    )
    await mediaArchivoRepo.addSeed(
      filaEjemplo(ID, 'libro', restaurar, {
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
      }),
    )
    // Pendiente y sin puntuar: así se ve que la ficha vale también para lo que
    // aún no has empezado.
    await mediaArchivoRepo.addSeed(
      filaEjemplo(ID, 'juego', restaurar, {
        tipo: 'videojuego',
        titulo: T.juegoTitulo,
        genero: T.juegoGenero,
        fecha: hoy,
        estado: 'pendiente',
        calificacion: 0,
        resena: '',
        creadoEn: cuando(0),
      }),
    )
  },

  async retraducir() {
    for (const m of await mediaArchivoRepo.list()) {
      if (m.ejemploDe !== ID || m.id == null) continue
      const titulo = retraducido(TEXTOS_ENTRETENIMIENTO, m.titulo, 'peliTitulo', 'serieTitulo', 'libroTitulo', 'juegoTitulo')
      const genero = retraducido(TEXTOS_ENTRETENIMIENTO, m.genero, 'peliGenero', 'serieGenero', 'libroGenero', 'juegoGenero')
      const autor = retraducido(TEXTOS_ENTRETENIMIENTO, m.autor, 'peliAutor', 'libroAutor')
      const resena = retraducido(TEXTOS_ENTRETENIMIENTO, m.resena, 'peliResena', 'serieResena', 'libroResena')
      if (titulo || genero || autor || resena) {
        await mediaArchivoRepo.update(m.id, {
          ...(titulo && { titulo }),
          ...(genero && { genero }),
          ...(autor && { autor }),
          ...(resena && { resena }),
        })
      }
    }
  },
}
