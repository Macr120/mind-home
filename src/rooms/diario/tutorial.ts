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
        'Mundo, economía, tecnología, salud, deportes y entretenimiento, de fuentes reales. Los chips de arriba filtran por sección.',
      ),
    },
    {
      sel: 'diario.actualizar',
      titulo: T('tut.app-diario--habito.2.titulo', 'Se renueva solo'),
      texto: T(
        'tut.app-diario--habito.2.texto',
        'La edición del día se descarga sola y a medianoche se recambia entera: aquí no se acumula nada, como un periódico de verdad.',
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

