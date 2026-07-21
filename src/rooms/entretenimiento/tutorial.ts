import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { mediaArchivoRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialEntretenimiento: TutorialDef = {
  id: 'app-entretenimiento',
  titulo: T('tut.app-entretenimiento.titulo', 'Entretenimiento'),
  resumen: T(
    'tut.app-entretenimiento.resumen',
    'Entretenimiento guarda tu archivo de películas, series y libros, y una mesa 100% digital con más de 20 juegos: de mesa (ajedrez, dominó, damas…) y arcade (tetris, viborita, pong…).',
  ),
  preparar: () => {
    abrirApp('entretenimiento')
  },
  pasos: [
    {
      texto: T(
        'tut.app-entretenimiento.1.texto',
        'Entretenimiento tiene dos mitades: tu archivo de pelis/series/libros y la mesa de juegos.',
      ),
    },
    {
      sel: 'entretenimiento.archivo.lista',
      alEntrar: async (ctx) => {
        clickTut('entretenimiento.tab.archivo')
        await ctx.unaVez('media-ejemplo', async () => {
          const id = await mediaArchivoRepo.add({
            tipo: 'pelicula',
            titulo: 'Ejemplo (tutorial) 🎓',
            genero: 'Tutorial',
            fecha: fechaLocalISO(),
            estado: 'pendiente',
            calificacion: 0,
            resena: '',
            creadoEn: new Date().toISOString(),
          })
          ctx.alLimpiar(() => mediaArchivoRepo.remove(id))
        })
      },
      titulo: T('tut.app-entretenimiento.2.titulo', 'Archivo'),
      texto: T(
        'tut.app-entretenimiento.2.texto',
        'Registra lo que ves y lees: pendiente, en curso o terminado, con tu valoración. Añadí la película «Ejemplo (tutorial) 🎓» como pendiente; se borrará al terminar.',
      ),
    },
    {
      sel: 'entretenimiento.tab.mesa',
      alEntrar: () => {
        clickTut('entretenimiento.tab.mesa')
      },
      titulo: T('tut.app-entretenimiento.3.titulo', 'Juegos de mesa'),
      texto: T(
        'tut.app-entretenimiento.3.texto',
        'Más de 20 juegos jugables aquí mismo: ajedrez, dominó, damas, sudoku, tetris, viborita… Toca uno para jugar.',
      ),
    },
    {
      texto: T(
        'tut.app-entretenimiento.4.texto',
        'También puedes pedirlos por chat: «juega tetris» abre el juego directo.',
      ),
    },
  ],
}
