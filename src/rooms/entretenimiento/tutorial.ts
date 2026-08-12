/**
 * Flujos de entretenimiento: corren sobre el archivo de Pep@ en la casa demo.
 * Los pasos localizan sus fichas POR LOS REPOS y navegan con clicks — no crean
 * datos (en la casa demo cualquier escritura está bloqueada).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoArchivo: CuerpoTutorial = {
  preparar: () => {
    abrirApp('entretenimiento', 'archivo')
  },
  pasos: [
    {
      sel: 'entretenimiento.archivo.lista',
      alEntrar: () => {
        clickTut('entretenimiento.tab.archivo')
      },
      titulo: T('tut.app-entretenimiento--archivo.1.titulo', 'Treinta obras, un año'),
      texto: T(
        'tut.app-entretenimiento--archivo.1.texto',
        'Películas, series, libros y videojuegos, ordenados por cuándo los terminó. Hay un atracón en el mes 7 (con la rodilla lesionada le sobró sofá) y un hueco de tres semanas: Japón.',
      ),
    },
    {
      // El archivador tiene casi todo plegado: se resalta una de las fichas
      // que están A LA VISTA, no la primera del repositorio.
      sel: (ctx) => `entretenimiento.archivo.item.${ctx.datos.get('fichaId') ?? ''}`,
      alEntrar: async (ctx) => {
        await esperarTut('entretenimiento.archivo.lista', 3000)
        const visibles = [...document.querySelectorAll('[data-tut^="entretenimiento.archivo.item."]')]
        const id = visibles[0]?.getAttribute('data-tut')?.split('.').pop()
        if (id) ctx.datos.set('fichaId', id)
      },
      titulo: T('tut.app-entretenimiento--archivo.2.titulo', 'La ficha'),
      texto: T(
        'tut.app-entretenimiento--archivo.2.texto',
        'Título, autor o director, género, estado y estrellas. La reseña es lo que le pareció a Pep@, no un resumen de la trama: dentro de un año eso es lo único que le va a servir.',
      ),
    },
    {
      sel: 'entretenimiento.archivo.agrupar',
      titulo: T('tut.app-entretenimiento--archivo.3.titulo', 'Cuatro formas de ordenarlo'),
      texto: T(
        'tut.app-entretenimiento--archivo.3.texto',
        'Por género, por categoría (película, serie, libro, videojuego), por autor o por fecha. En la vista por género las carpetas se arrastran: pon primero lo que más ves.',
      ),
    },
  ],
}

export const cuerpoProgramas: CuerpoTutorial = {
  preparar: () => {
    abrirApp('entretenimiento', 'programas')
  },
  pasos: [
    {
      sel: 'entretenimiento.programas',
      alEntrar: () => {
        clickTut('entretenimiento.tab.programas')
      },
      titulo: T('tut.app-entretenimiento--programas.1.titulo', 'La lista de pendientes'),
      texto: T(
        'tut.app-entretenimiento--programas.1.texto',
        'Pep@ armó su programa de clásicos de ciencia ficción por ver. Con IA se genera por tema («terror de los 80»), pero también se escribe a mano.',
      ),
    },
    {
      sel: 'entretenimiento.programas.cronograma',
      titulo: T('tut.app-entretenimiento--programas.2.titulo', 'Cada título, una meta'),
      texto: T(
        'tut.app-entretenimiento--programas.2.texto',
        'Las tres primeras ya están palomeadas. Cada título guarda su nota de por qué está en la lista, y si le pones fechas baja al calendario como cualquier otra meta.',
      ),
    },
    {
      texto: T(
        'tut.app-entretenimiento--programas.3.texto',
        'Y en la otra pestaña está la mesa digital: más de veinte juegos de mesa y arcade para jugar ahí mismo.',
      ),
    },
  ],
}

export const cuerpoJuegos: CuerpoTutorial = {
  preparar: () => {
    abrirApp('entretenimiento', 'mesa')
  },
  pasos: [
    {
      sel: 'entretenimiento.juegos.secciones',
      alEntrar: () => {
        clickTut('entretenimiento.tab.mesa')
      },
      texto: T(
        'tut.app-entretenimiento--juegos.1.texto',
        '1–2 jugadores o 3+: el filtro esconde lo que no sirve para el grupo que tienes enfrente. Los juegos marcados «2+» sirven en las dos secciones.',
      ),
    },
    {
      sel: 'entretenimiento.juegos.familia.tablero',
      titulo: T('tut.app-entretenimiento--juegos.2.titulo', 'Por familia'),
      texto: T(
        'tut.app-entretenimiento--juegos.2.texto',
        'Tablero, Ingenio, Arcade, Cartas y casino, Para el grupo: cada familia con su color propio. Ajedrez, damas, dominó, blackjack, tetris, buscaminas y más de una docena más.',
      ),
    },
    {
      sel: () =>
        document.querySelector('[data-tut^="entretenimiento.juegos.item."]')?.getAttribute('data-tut') ??
        'entretenimiento.juegos.secciones',
      titulo: T('tut.app-entretenimiento--juegos.3.titulo', 'Un toque y a jugar'),
      texto: T(
        'tut.app-entretenimiento--juegos.3.texto',
        'Cada tarjeta abre el juego en pantalla completa; los que lo admiten traen su propio selector de dificultad arriba. Volver regresa aquí mismo, sin perder tu lugar.',
      ),
    },
  ],
}

