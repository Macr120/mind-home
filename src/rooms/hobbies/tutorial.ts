import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { hobbiesRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialHobbies: TutorialDef = {
  id: 'app-hobbies',
  titulo: T('tut.app-hobbies.titulo', 'Hobbies'),
  resumen: T(
    'tut.app-hobbies.resumen',
    'Hobbies da seguimiento a tus pasatiempos: sesiones con minutos y nota, heatmap anual tipo GitHub, rachas, meta semanal de días y proyectos por hobby. También puedes registrar sesiones por chat.',
  ),
  preparar: () => {
    abrirApp('hobbies')
  },
  pasos: [
    {
      texto: T(
        'tut.app-hobbies.1.texto',
        'Hobbies lleva tus pasatiempos: cuánto practicas, tus rachas y tus proyectos.',
      ),
    },
    {
      sel: 'hobbies.lista',
      alEntrar: async (ctx) => {
        await ctx.unaVez('hobby-ejemplo', async () => {
          const id = await hobbiesRepo.add({
            nombre: 'Ejemplo (tutorial) 🎓',
            emoji: '🎓',
            color: '#8b5cf6',
            creadoEn: new Date().toISOString(),
          })
          ctx.datos.set('hobbyId', id)
          ctx.alLimpiar(() => hobbiesRepo.remove(id as number))
        })
      },
      titulo: T('tut.app-hobbies.2.titulo', 'Tus hobbies'),
      texto: T(
        'tut.app-hobbies.2.texto',
        'Creé el hobby «Ejemplo (tutorial) 🎓» para que veas la lista; se borrará al terminar. Cada tarjeta muestra su racha y su semana.',
      ),
    },
    {
      sel: 'hobbies.lista',
      titulo: T('tut.app-hobbies.3.titulo', 'Dentro de un hobby'),
      texto: T(
        'tut.app-hobbies.3.texto',
        'Al abrir un hobby verás sus sesiones (minutos + nota), el heatmap anual, la meta semanal, sus proyectos y su cronograma de metas.',
      ),
    },
    {
      sel: 'hobbies.agregar',
      titulo: T('tut.app-hobbies.4.titulo', 'Crear hobbies'),
      texto: T(
        'tut.app-hobbies.4.texto',
        'Con este botón agregas los tuyos: nombre, emoji, color y meta de días por semana.',
      ),
    },
    {
      titulo: T('tut.app-hobbies.5.titulo', 'Proyectos y cronograma'),
      texto: T(
        'tut.app-hobbies.5.texto',
        'Cada proyecto se abre por dentro: sus metas y sub-metas en el cronograma, sus fechas y sus fotos de avance. El hobby tiene además su propio cronograma para lo que no es de ningún proyecto.',
      ),
    },
    {
      texto: T(
        'tut.app-hobbies.6.texto',
        'Listo: el hobby de ejemplo se borra ahora. También puedes capturar por chat («pinté 40 min»).',
      ),
    },
  ],
}
