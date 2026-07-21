import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialDiario: TutorialDef = {
  id: 'app-diario',
  titulo: T('tut.app-diario.titulo', 'Noticias · Periódico'),
  resumen: T(
    'tut.app-diario.resumen',
    'El periódico es efímero: cada día trae titulares por categoría y efemérides, y a medianoche se renueva. Tus asistentes pueden repartirte noticias a lo largo del día.',
  ),
  preparar: () => {
    abrirApp('diario')
  },
  pasos: [
    {
      texto: T(
        'tut.app-diario.1.texto',
        'El periódico del día: se renueva solo a medianoche, como uno de verdad.',
      ),
    },
    {
      sel: 'diario.tab.titulares',
      alEntrar: () => {
        clickTut('diario.tab.titulares')
      },
      titulo: T('tut.app-diario.2.titulo', 'Titulares'),
      texto: T(
        'tut.app-diario.2.texto',
        'Titulares del día por categoría (portada, internacional, ciencia…), en un feed para hojear.',
      ),
    },
    {
      sel: 'diario.tab.efemerides',
      alEntrar: () => {
        clickTut('diario.tab.efemerides')
      },
      titulo: T('tut.app-diario.3.titulo', 'Efemérides'),
      texto: T(
        'tut.app-diario.3.texto',
        'Qué pasó un día como hoy: historia, nacimientos y datos curiosos.',
      ),
    },
    {
      texto: T(
        'tut.app-diario.4.texto',
        'Puedes programar el reparto: tus asistentes te traen noticias a una hora fija o al azar durante el día.',
      ),
    },
  ],
}
