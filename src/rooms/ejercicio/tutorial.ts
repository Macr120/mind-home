import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { rutinasFuerzaRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialEjercicio: TutorialDef = {
  id: 'app-ejercicio',
  titulo: T('tut.app-ejercicio.titulo', 'Ejercicio'),
  resumen: T(
    'tut.app-ejercicio.resumen',
    'Ejercicio registra fuerza, resistencia y flexibilidad contra tus metas semanales. En Fuerza armas rutinas desde el catálogo y apuntas series; Resistencia lleva el cardio (incluso en vivo); el Cronograma agenda tus rutinas en el calendario.',
  ),
  preparar: () => {
    abrirApp('ejercicio')
  },
  pasos: [
    {
      texto: T(
        'tut.app-ejercicio.1.texto',
        'Ejercicio lleva tu entrenamiento: fuerza, resistencia y flexibilidad, contra metas semanales.',
      ),
    },
    {
      sel: 'ejercicio.tab.metas',
      alEntrar: () => {
        clickTut('ejercicio.tab.metas')
      },
      titulo: T('tut.app-ejercicio.2.titulo', 'Metas'),
      texto: T(
        'tut.app-ejercicio.2.texto',
        'En Metas defines tu perfil semanal (sesiones de fuerza, minutos de cardio…) y ves tu cumplimiento.',
      ),
    },
    {
      sel: 'ejercicio.fuerza.subs',
      alEntrar: () => {
        clickTut('ejercicio.tab.fuerza')
      },
      titulo: T('tut.app-ejercicio.3.titulo', 'Fuerza'),
      texto: T(
        'tut.app-ejercicio.3.texto',
        'Fuerza tiene tres zonas: Catálogo (ejercicios y armar rutinas), Rutinas (tu biblioteca) y Progreso (gráficas).',
      ),
    },
    {
      sel: 'ejercicio.fuerza.rutinas',
      alEntrar: async (ctx) => {
        clickTut('ejercicio.tab.fuerza')
        clickTut('ejercicio.sub.rutinas')
        await ctx.unaVez('rutina-ejemplo', async () => {
          const id = await rutinasFuerzaRepo.add({
            nombre: 'Ejemplo (tutorial) 🎓',
            duracionMin: 20,
            ejercicios: ['Sentadillas', 'Lagartijas'],
            creadoEn: new Date().toISOString(),
          })
          ctx.datos.set('rutinaId', id)
          ctx.alLimpiar(() => rutinasFuerzaRepo.remove(id as number))
        })
      },
      titulo: T('tut.app-ejercicio.4.titulo', 'Tu biblioteca de rutinas'),
      texto: T(
        'tut.app-ejercicio.4.texto',
        'Acabo de crear la rutina «Ejemplo (tutorial) 🎓» para que veas cómo aparece aquí. Se borrará al terminar el tutorial.',
      ),
    },
    {
      sel: 'ejercicio.fecha',
      titulo: T('tut.app-ejercicio.5.titulo', 'La fecha'),
      texto: T(
        'tut.app-ejercicio.5.texto',
        'Esta barra navega por días: todo lo que registres cae en la fecha visible.',
      ),
    },
    {
      sel: 'ejercicio.tab.resistencia',
      alEntrar: () => {
        clickTut('ejercicio.tab.resistencia')
      },
      titulo: T('tut.app-ejercicio.6.titulo', 'Resistencia y flexibilidad'),
      texto: T(
        'tut.app-ejercicio.6.texto',
        'Resistencia registra el cardio por tramos, incluso en vivo con GPS. Flexibilidad funciona igual, con sus posturas.',
      ),
    },
    {
      sel: 'ejercicio.tab.cronograma',
      alEntrar: () => {
        clickTut('ejercicio.tab.cronograma')
      },
      titulo: T('tut.app-ejercicio.7.titulo', 'Cronograma'),
      texto: T(
        'tut.app-ejercicio.7.texto',
        'El cronograma agenda tus rutinas en el calendario de la casa; el día del plan, la app te las propone.',
      ),
    },
    {
      texto: T(
        'tut.app-ejercicio.8.texto',
        'Eso es todo. La rutina de ejemplo se borra ahora; vuelve a este tutorial con el botón ? cuando quieras.',
      ),
    },
  ],
}
