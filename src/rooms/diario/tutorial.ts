/**
 * Flujos del periódico: corren sobre el hábito de Pep@ en la casa demo. Los
 * pasos solo navegan y señalan — no crean datos (en la casa demo cualquier
 * escritura está bloqueada, salvo la lectura del día, que es consumo).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoHabito: CuerpoTutorial = {
  preparar: () => {
    abrirApp('diario', 'titulares')
  },
  pasos: [
    {
      sel: 'diario.titulares.lista',
      alEntrar: () => {
        clickTut('diario.tab.titulares')
      },
      titulo: T('tut.app-diario--habito.1.titulo', 'Los titulares de hoy'),
      texto: T(
        'tut.app-diario--habito.1.texto',
        'Mundo, economía, tecnología, salud, deportes y entretenimiento, con los chips de arriba para filtrar. Las cabeceras son prensa real de tu idioma —cada titular dice la suya— y cada día entran medios distintos, en rotación.',
      ),
    },
    {
      sel: 'diario.actualizar',
      titulo: T('tut.app-diario--habito.2.titulo', 'Se renueva solo'),
      texto: T(
        'tut.app-diario--habito.2.texto',
        'La edición del día se descarga sola y a medianoche se recambia entera: aquí no se acumula nada, como un periódico de verdad. Y si cambias el idioma de la casa, cambia también de prensa: cada idioma trae sus propios medios.',
      ),
    },
    {
      sel: 'diario.efemerides.lista',
      alEntrar: () => {
        clickTut('diario.tab.efemerides')
      },
      titulo: T('tut.app-diario--habito.3.titulo', 'Un día en la historia'),
      texto: T(
        'tut.app-diario--habito.3.texto',
        'La otra mitad: qué pasó un día como hoy, una obra, un libro, una especie, una palabra. Sirve de excusa para abrirlo aunque las noticias no apetezcan.',
      ),
    },
    {
      texto: T(
        'tut.app-diario--habito.4.texto',
        'Pep@ lo leyó unos doscientos días este año: mucho al principio, casi nada en el mes malo, y todos los días de las últimas tres semanas. Su racha vive de eso.',
      ),
    },
  ],
}

export const cuerpoReparto: CuerpoTutorial = {
  preparar: () => {
    abrirApp('diario', 'titulares')
  },
  pasos: [
    {
      sel: 'diario.reparto',
      titulo: T('tut.app-diario--reparto.1.titulo', 'El reparto'),
      texto: T(
        'tut.app-diario--reparto.1.texto',
        'Aquí se configura quién te trae qué. No es una notificación más: te llega como un mensaje del asistente, con su voz.',
      ),
    },
    {
      sel: 'diario.reparto.lista',
      alEntrar: async () => {
        clickTut('diario.reparto')
        await esperarTut('diario.reparto.lista', 3000)
      },
      titulo: T('tut.app-diario--reparto.2.titulo', 'Dos repartidores'),
      texto: T(
        'tut.app-diario--reparto.2.texto',
        'El mago le trae mundo, tecnología y economía a las 7:30. Laika le lleva lo ligero cuando le da la gana. Cada asistente elige sus secciones y su modo.',
      ),
    },
  ],
}

/**
 * ESENCIAL: corre en la casa real y recorre los menús principales uno por uno.
 * Sin datos de por medio: sus anclas son las pestañas y los botones de la
 * cabecera, que existen aunque la edición del día no haya cargado (o sin red).
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('diario')
  },
  pasos: [
    {
      titulo: T('tut.app-diario--esencial.1.titulo', 'El periódico de hoy'),
      texto: T(
        'tut.app-diario--esencial.1.texto',
        'El diario trae el briefing del día en dos vistas: titulares y efemérides. No guarda datos propios: cada día trae contenido nuevo y a medianoche lo reemplaza entero.',
      ),
    },
    {
      sel: 'diario.tab.titulares',
      titulo: T('tut.app-diario--esencial.2.titulo', 'Titulares'),
      texto: T(
        'tut.app-diario--esencial.2.texto',
        'Los titulares del día por categoría —mundo, economía, tecnología, salud, deportes y entretenimiento—, filtrables con los chips de arriba. Vienen de prensa real de tu idioma, con medios que rotan cada día.',
      ),
      alEntrar: async () => {
        await esperarTut('diario.tab.titulares', 4000)
        clickTut('diario.tab.titulares')
      },
    },
    {
      sel: 'diario.tab.efemerides',
      titulo: T('tut.app-diario--esencial.3.titulo', 'Efemérides'),
      texto: T(
        'tut.app-diario--esencial.3.texto',
        'La otra mitad del diario: qué pasó un día como hoy —una obra, un libro, una especie, una palabra—. Sirve de excusa para abrirlo aunque las noticias no interesen ese día.',
      ),
      alEntrar: () => {
        clickTut('diario.tab.efemerides')
      },
    },
    {
      sel: 'diario.actualizar',
      titulo: T('tut.app-diario--esencial.4.titulo', 'Se renueva solo'),
      texto: T(
        'tut.app-diario--esencial.4.texto',
        'La edición se descarga sola al abrir la app y se reemplaza entera a medianoche: no se acumula nada. Este botón fuerza una actualización antes de esa hora.',
      ),
    },
    {
      sel: 'diario.reparto',
      titulo: T('tut.app-diario--esencial.5.titulo', 'Reparto'),
      texto: T(
        'tut.app-diario--esencial.5.texto',
        'Configura qué secciones te entrega cada asistente en su propio chat, a una hora fija o en un momento sorpresa del día.',
      ),
    },
  ],
}

