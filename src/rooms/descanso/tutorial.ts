import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { suenoRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialDescanso: TutorialDef = {
  id: 'app-descanso',
  titulo: T('tut.app-descanso.titulo', 'Descanso'),
  resumen: T(
    'tut.app-descanso.resumen',
    'Descanso cuida tu sueño: define tu horario ideal en la barra de 24 horas, registra cada noche (horas, calidad, interrupciones) y activa recordatorios de pantalla fuera y alarma. Lo agendado se refleja en el calendario.',
  ),
  preparar: () => {
    abrirApp('descanso')
  },
  pasos: [
    {
      sel: 'descanso.app',
      texto: T(
        'tut.app-descanso.1.texto',
        'Descanso lleva tu sueño bajo un cielo nocturno: horario, registro y recordatorios.',
      ),
    },
    {
      sel: 'descanso.app',
      titulo: T('tut.app-descanso.2.titulo', 'Tu horario'),
      texto: T(
        'tut.app-descanso.2.texto',
        'En la barra de 0 a 24 h defines a qué hora quieres dormir y despertar; puedes activar recordatorios y alarma.',
      ),
    },
    {
      sel: 'descanso.historial',
      alEntrar: async (ctx) => {
        await ctx.unaVez('noche-ejemplo', async () => {
          const id = await suenoRepo.add({
            fecha: fechaLocalISO(),
            horas: 8,
            calidad: 4,
            horaAcostarse: '23:30',
            horaDespertar: '07:30',
            interrupciones: 0,
            nota: 'Ejemplo (tutorial) 🎓',
          })
          ctx.alLimpiar(() => suenoRepo.remove(id))
        })
      },
      titulo: T('tut.app-descanso.3.titulo', 'Registrar la noche'),
      texto: T(
        'tut.app-descanso.3.texto',
        'Cada mañana registra cómo dormiste: horas, calidad e interrupciones. Guardé la noche «Ejemplo (tutorial) 🎓» (8 h, calidad 4) para que veas el historial con su puntuación; se borrará al terminar.',
      ),
    },
    {
      texto: T(
        'tut.app-descanso.4.texto',
        'Tu horario de sueño aparece también en el calendario de la casa, cruzando la medianoche.',
      ),
    },
  ],
}
