import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { sesionesEstudioRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialBiblioteca: TutorialDef = {
  id: 'app-biblioteca',
  titulo: T('tut.app-biblioteca.titulo', 'Biblioteca'),
  resumen: T(
    'tut.app-biblioteca.resumen',
    'La biblioteca es tu enciclopedia conversacional: charlas con IA por pilar de conocimiento, un índice-árbol vivo que crece con cada charla, entradas tipo wiki y manuales propios, y un temporizador de estudio.',
  ),
  preparar: () => {
    abrirApp('biblioteca')
  },
  pasos: [
    {
      texto: T(
        'tut.app-biblioteca.1.texto',
        'La biblioteca es tu espacio de aprendizaje: charlas, enciclopedia propia y sesiones de estudio.',
      ),
    },
    {
      sel: 'biblioteca.tab.charlas',
      alEntrar: () => {
        clickTut('biblioteca.tab.charlas')
      },
      titulo: T('tut.app-biblioteca.2.titulo', 'Charlas'),
      texto: T(
        'tut.app-biblioteca.2.texto',
        'Conversa con la IA sobre un tema por pilar; cada charla desbloquea subtemas nuevos en tu índice. (Requiere IA activa.)',
      ),
    },
    {
      sel: 'biblioteca.tab.enciclopedia',
      alEntrar: () => {
        clickTut('biblioteca.tab.enciclopedia')
      },
      titulo: T('tut.app-biblioteca.3.titulo', 'Enciclopedia'),
      texto: T(
        'tut.app-biblioteca.3.texto',
        'Tu índice-árbol vivo: los temas que has tocado, entradas tipo wiki y tus manuales propios.',
      ),
    },
    {
      sel: 'biblioteca.estudio.historial',
      alEntrar: async (ctx) => {
        clickTut('biblioteca.tab.estudio')
        await ctx.unaVez('sesion-ejemplo', async () => {
          const id = await sesionesEstudioRepo.add({
            pilarId: 'general',
            minutos: 25,
            fecha: fechaLocalISO(),
            nota: 'Ejemplo (tutorial) 🎓',
          })
          ctx.alLimpiar(() => sesionesEstudioRepo.remove(id))
        })
      },
      titulo: T('tut.app-biblioteca.4.titulo', 'Estudio'),
      texto: T(
        'tut.app-biblioteca.4.texto',
        'El temporizador de estudio registra tus sesiones y alimenta tu progreso. Guardé una sesión de 25 minutos de ejemplo — mírala en «Sesiones recientes»; se borrará al terminar.',
      ),
    },
    {
      sel: 'biblioteca.tab.resumen',
      alEntrar: () => {
        clickTut('biblioteca.tab.resumen')
      },
      titulo: T('tut.app-biblioteca.5.titulo', 'Resumen'),
      texto: T(
        'tut.app-biblioteca.5.texto',
        'El panorama: qué pilares has explorado y cuánto has estudiado.',
      ),
    },
  ],
}
