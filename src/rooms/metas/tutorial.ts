/**
 * ESENCIAL de Metas: corre en la casa real y recorre los tres menús del
 * planificador uno por uno. Sin datos de por medio: sus anclas son las pestañas
 * (`cal.cron.modo.*`, las pinta `PestanasCarpeta` desde `Cronograma`), que
 * existen con la BD vacía.
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('metas')
  },
  pasos: [
    {
      titulo: T('tut.app-metas--esencial.1.titulo', 'El planificador de la casa'),
      texto: T(
        'tut.app-metas--esencial.1.texto',
        'Este cuarto no lleva registros suyos: reúne en un solo sitio las metas y los planes que nacen en las demás apps. Son tres menús, y se leen en este orden: lo que te propusiste, cómo piensas repartirlo y cuándo cae.',
      ),
    },
    {
      sel: 'cal.cron.modo.metas',
      titulo: T('tut.app-metas--esencial.2.titulo', 'Metas'),
      texto: T(
        'tut.app-metas--esencial.2.texto',
        'La lista de todo lo que te propusiste, agrupada por la app que lleva cada meta. Una meta puede colgar de otra, y al tocarla se abre su hoja: ahí están su plazo, sus pasos y la entrada a su propio cronograma.',
      ),
      alEntrar: async () => {
        await esperarTut('cal.cron.modo.metas', 4000)
        clickTut('cal.cron.modo.metas')
      },
    },
    {
      sel: 'cal.cron.modo.planes',
      titulo: T('tut.app-metas--esencial.3.titulo', 'Planes'),
      texto: T(
        'tut.app-metas--esencial.3.texto',
        'Un plan es el borrador de un cronograma: reparte una meta en fases con sus fechas. Mientras es propuesta se retoca a gusto; cuando convence, se acepta y sus fases pasan a ser sub-metas reales.',
      ),
      alEntrar: () => {
        clickTut('cal.cron.modo.planes')
      },
    },
    {
      sel: 'cal.cron.modo.cronograma',
      titulo: T('tut.app-metas--esencial.4.titulo', 'Cronograma'),
      texto: T(
        'tut.app-metas--esencial.4.texto',
        'El eje del tiempo con todas las metas a la vez: cada una es una barra sobre las fechas. Se acerca y se aleja por días, semanas, meses o años, y un plan puede superponerse encima para compararlo con lo que ya está trazado.',
      ),
      alEntrar: () => {
        clickTut('cal.cron.modo.cronograma')
      },
    },
  ],
}
