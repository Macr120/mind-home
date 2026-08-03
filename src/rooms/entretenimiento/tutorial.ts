/**
 * Flujos de entretenimiento: corren sobre el archivo de Pep@ en la casa demo.
 * Los pasos localizan sus fichas POR LOS REPOS y navegan con clicks — no crean
 * datos (en la casa demo cualquier escritura está bloqueada).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const flujoArchivo: TutorialDef = {
  id: 'app-entretenimiento--archivo',
  titulo: T('tut.app-entretenimiento--archivo.titulo', 'Un año de ciencia ficción'),
  resumen: T(
    'tut.app-entretenimiento--archivo.resumen',
    'El archivo guarda lo que ves, lees y juegas: cada ficha con su estado, sus estrellas y tu reseña. Se agrupa por fecha en carpetas de año y mes, o por género.',
  ),
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
      titulo: T('tut.app-entretenimiento--archivo.3.titulo', 'Por fecha o por género'),
      texto: T(
        'tut.app-entretenimiento--archivo.3.texto',
        'Cambia la vista: por fecha las agrupa en carpetas de año y mes; por género, en carpetas temáticas. Lo pendiente se queda arriba, esperando turno.',
      ),
    },
  ],
}

const flujoProgramas: TutorialDef = {
  id: 'app-entretenimiento--programas',
  titulo: T('tut.app-entretenimiento--programas.titulo', 'Programas para ver'),
  resumen: T(
    'tut.app-entretenimiento--programas.resumen',
    'Un programa es una lista de títulos por tema o género convertida en metas: palomeas lo que completas y, si quieres, les pones fecha para verlas en el calendario.',
  ),
  preparar: () => {
    abrirApp('entretenimiento', 'archivo')
  },
  pasos: [
    {
      sel: 'entretenimiento.programas',
      alEntrar: () => {
        clickTut('entretenimiento.tab.archivo')
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

export const flujosEntretenimiento: TutorialDef[] = [flujoArchivo, flujoProgramas]
