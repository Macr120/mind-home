import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { gratitudDiariaRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialJardin: TutorialDef = {
  id: 'app-jardin',
  titulo: T('tut.app-jardin.titulo', 'Jardín · Mindfulness'),
  resumen: T(
    'tut.app-jardin.resumen',
    'El jardín es tu espacio de calma: meditaciones guiadas, ejercicios de respiración y agradecimientos diarios. Sin puntos ni rachas a propósito: la calma no compite.',
  ),
  preparar: () => {
    abrirApp('jardin')
  },
  pasos: [
    {
      texto: T(
        'tut.app-jardin.1.texto',
        'El jardín es distinto al resto: aquí no hay puntos ni rachas, solo calma acumulada.',
      ),
    },
    {
      sel: 'jardin.tab.meditacion',
      alEntrar: () => {
        clickTut('jardin.tab.meditacion')
      },
      titulo: T('tut.app-jardin.2.titulo', 'Meditación'),
      texto: T(
        'tut.app-jardin.2.texto',
        'Meditaciones guiadas de distintas duraciones; elige una y deja que el guion te acompañe.',
      ),
    },
    {
      sel: 'jardin.tab.respiracion',
      alEntrar: () => {
        clickTut('jardin.tab.respiracion')
      },
      titulo: T('tut.app-jardin.3.titulo', 'Respiración'),
      texto: T(
        'tut.app-jardin.3.texto',
        'Ejercicios de respiración con guía visual (inhala, sostén, exhala). Inícialo cuando tengas un minuto.',
      ),
    },
    {
      sel: 'jardin.gratitud.historial',
      alEntrar: async (ctx) => {
        clickTut('jardin.tab.gratitud')
        await ctx.unaVez('gratitud-ejemplo', async () => {
          // Con fecha de AYER: una demo de hoy rellenaría el formulario del día del usuario.
          const id = await gratitudDiariaRepo.add({
            fecha: isoMasDias(fechaLocalISO(), -1),
            item1: 'Ejemplo (tutorial) 🎓',
            item2: '',
            item3: '',
          })
          ctx.alLimpiar(() => gratitudDiariaRepo.remove(id))
        })
      },
      titulo: T('tut.app-jardin.4.titulo', 'Agradecimientos'),
      texto: T(
        'tut.app-jardin.4.texto',
        'Apunta cosas por las que hoy das gracias; releerlas después es parte del ejercicio. Guardé «Ejemplo (tutorial) 🎓» en «Entradas anteriores»; se borrará al terminar.',
      ),
    },
    {
      texto: T(
        'tut.app-jardin.5.texto',
        'Eso es todo: entra cuando lo necesites, sin metas que cumplir.',
      ),
    },
  ],
}
