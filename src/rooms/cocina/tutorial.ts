import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { recetasRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialCocina: TutorialDef = {
  id: 'app-cocina',
  titulo: T('tut.app-cocina.titulo', 'Cocina · Nutrición'),
  resumen: T(
    'tut.app-cocina.resumen',
    'Cocina lleva tu nutrición: apunta comidas y agua contra tus metas, arma tu dieta semanal, guarda recetas con macros y genera la lista del súper por categorías.',
  ),
  preparar: () => {
    abrirApp('cocina')
  },
  pasos: [
    {
      texto: T(
        'tut.app-cocina.1.texto',
        'Cocina es tu app de nutrición: comidas, agua, dieta, recetario y lista del súper.',
      ),
    },
    {
      sel: 'cocina.tab.metas',
      alEntrar: () => {
        clickTut('cocina.tab.metas')
      },
      titulo: T('tut.app-cocina.2.titulo', 'Metas'),
      texto: T(
        'tut.app-cocina.2.texto',
        'En Metas defines calorías, macros y agua objetivo, y llevas tu peso. Todo lo demás se compara contra esto.',
      ),
    },
    {
      sel: 'cocina.fecha',
      alEntrar: () => {
        clickTut('cocina.tab.diario')
      },
      titulo: T('tut.app-cocina.3.titulo', 'Comidas'),
      texto: T(
        'tut.app-cocina.3.texto',
        'Comidas es el diario del día: apunta lo que comiste y tu agua. Esta barra navega entre fechas.',
      ),
    },
    {
      sel: 'cocina.tab.plan',
      alEntrar: () => {
        clickTut('cocina.tab.plan')
      },
      titulo: T('tut.app-cocina.4.titulo', 'Dieta'),
      texto: T(
        'tut.app-cocina.4.texto',
        'Dieta arma tu plan semanal de comidas; puedes guardar varias dietas y alternarlas.',
      ),
    },
    {
      sel: 'cocina.recetas.lista',
      alEntrar: async (ctx) => {
        clickTut('cocina.tab.recetas')
        await ctx.unaVez('receta-ejemplo', async () => {
          const id = await recetasRepo.add({
            nombre: 'Ejemplo (tutorial) 🎓',
            emoji: '🎓',
            porciones: 1,
            minutos: 10,
            etiquetas: ['tutorial'],
            ingredientes: ['1 ingrediente de ejemplo'],
            pasos: ['Paso de ejemplo'],
            calorias: 0,
            proteinas: 0,
            carbohidratos: 0,
            grasas: 0,
            fuente: 'manual',
            creadaEn: new Date().toISOString(),
          })
          ctx.datos.set('recetaId', id)
          ctx.alLimpiar(() => recetasRepo.remove(id as number))
        })
      },
      titulo: T('tut.app-cocina.5.titulo', 'Recetario'),
      texto: T(
        'tut.app-cocina.5.texto',
        'Guardé la receta «Ejemplo (tutorial) 🎓» para que veas el recetario con algo dentro. Se borrará al terminar. Cada receta lleva ingredientes, pasos y macros.',
      ),
    },
    {
      sel: 'cocina.tab.compras',
      alEntrar: () => {
        clickTut('cocina.tab.compras')
      },
      titulo: T('tut.app-cocina.6.titulo', 'Compras'),
      texto: T(
        'tut.app-cocina.6.texto',
        'Compras genera la lista del súper por categorías; puedes guardar listas y reutilizarlas.',
      ),
    },
    {
      texto: T(
        'tut.app-cocina.7.texto',
        'Listo: la receta de ejemplo se borra ahora. También puedes apuntar comidas por chat («desayuné avena»).',
      ),
    },
  ],
}
