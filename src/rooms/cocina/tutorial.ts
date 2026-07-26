import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { recetasRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialCocina: TutorialDef = {
  id: 'app-cocina',
  titulo: T('tut.app-cocina.titulo', 'Cocina · Nutrición'),
  resumen: T(
    'tut.app-cocina.resumen',
    'Cocina tiene dos caras: «Control de peso» lleva tu progreso, tus comidas y tus metas; «Recetario» guarda recetas, dietas y la lista del súper.',
  ),
  preparar: () => {
    abrirApp('cocina')
  },
  pasos: [
    {
      sel: 'cocina.enfoque.peso',
      alEntrar: () => {
        clickTut('cocina.enfoque.peso')
      },
      titulo: T('tut.app-cocina.0.titulo', 'Dos enfoques'),
      texto: T(
        'tut.app-cocina.0.texto',
        'Arriba eliges a qué vienes: «Control de peso» para subir, bajar o mantener, y «Recetario» para cocinar y hacer la compra. Cada uno abre sus tres pestañas.',
      ),
    },
    {
      sel: 'cocina.tab.metas',
      // Con dos niveles hay que abrir el enfoque y ESPERAR a que React pinte su
      // fila de pestañas: si no, el segundo click no encuentra nada y no pasa nada.
      alEntrar: async () => {
        clickTut('cocina.enfoque.peso')
        await esperarTut('cocina.tab.metas')
        clickTut('cocina.tab.metas')
      },
      titulo: T('tut.app-cocina.2.titulo', 'Progreso'),
      texto: T(
        'tut.app-cocina.2.texto',
        'Progreso manda: tu peso, cómo va la semana y cuándo llegas a tu meta. Abajo, en «Ajustar objetivo», defines calorías, macros y a qué peso quieres llegar.',
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
        'Escribe lo que comiste y la IA calcula calorías y macros; tú revisas y confirmas. Esta barra navega entre fechas.',
      ),
    },
    {
      sel: 'cocina.tab.plan',
      alEntrar: async () => {
        clickTut('cocina.enfoque.recetario')
        await esperarTut('cocina.tab.plan')
        clickTut('cocina.tab.plan')
      },
      titulo: T('tut.app-cocina.4.titulo', 'Dieta'),
      texto: T(
        'tut.app-cocina.4.texto',
        'Dieta guarda planes de alimentación con sus recetas y metas; puedes pedirle uno a la IA y aplicarlo como tus objetivos.',
      ),
    },
    {
      sel: 'cocina.recetas.lista',
      alEntrar: async (ctx) => {
        clickTut('cocina.enfoque.recetario')
        await esperarTut('cocina.tab.recetas')
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
      alEntrar: async () => {
        clickTut('cocina.enfoque.recetario')
        await esperarTut('cocina.tab.compras')
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
