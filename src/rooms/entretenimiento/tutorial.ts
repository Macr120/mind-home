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

/**
 * ESENCIAL: corre en la casa real y recorre los dos menús de Entretenimiento
 * uno por uno. Sin datos de por medio: sus anclas son pestañas y el catálogo
 * fijo de juegos, que existen igual con la BD vacía.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('entretenimiento')
  },
  pasos: [
    {
      titulo: T('tut.app-entretenimiento--esencial.1.titulo', 'Entretenimiento'),
      texto: T(
        'tut.app-entretenimiento--esencial.1.texto',
        'Guarda las películas, series, libros y videojuegos que vas terminando, y trae una mesa de juegos digital para jugar sin salir de la casa. Son dos menús: Juegos de mesa y Archivo.',
      ),
    },
    {
      sel: 'entretenimiento.tab.mesa',
      titulo: T('tut.app-entretenimiento--esencial.2.titulo', 'Juegos de mesa'),
      texto: T(
        'tut.app-entretenimiento--esencial.2.texto',
        'La mesa reúne juegos digitales que se juegan directo en pantalla. Un filtro separa lo pensado para uno o dos jugadores de lo que sirve para un grupo más grande.',
      ),
      alEntrar: async () => {
        await esperarTut('entretenimiento.tab.mesa', 4000)
        clickTut('entretenimiento.tab.mesa')
      },
    },
    {
      sel: 'entretenimiento.juegos.familia.tablero',
      titulo: T('tut.app-entretenimiento--esencial.3.titulo', 'Por familias'),
      texto: T(
        'tut.app-entretenimiento--esencial.3.texto',
        'El catálogo se agrupa en familias —tablero, ingenio, arcade, cartas y casino, y para el grupo— cada una con su propio color. Toca cualquier tarjeta para abrir el juego en pantalla completa.',
      ),
    },
    {
      sel: 'entretenimiento.tab.archivo',
      titulo: T('tut.app-entretenimiento--esencial.4.titulo', 'Archivo'),
      texto: T(
        'tut.app-entretenimiento--esencial.4.texto',
        'El archivo junta lo que ves, lees y juegas: cada título con su estado, su calificación y tu reseña. Se puede ordenar por género, categoría, autor o fecha.',
      ),
      alEntrar: () => {
        clickTut('entretenimiento.tab.archivo')
      },
    },
  ],
}

