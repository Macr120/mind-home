import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { anecdotasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialAnecdotario: TutorialDef = {
  id: 'app-anecdotario',
  titulo: T('tut.app-anecdotario.titulo', 'Diario personal'),
  resumen: T(
    'tut.app-anecdotario.resumen',
    'El anecdotario es tu diario personal: escribe lo que pasó, con tu ánimo del día y fotos. El calendario integrado filtra tus recuerdos por fecha.',
  ),
  preparar: () => {
    abrirApp('anecdotario')
  },
  pasos: [
    {
      texto: T(
        'tut.app-anecdotario.1.texto',
        'Tu diario personal: momentos, ánimo y fotos. Todo se queda en tu dispositivo.',
      ),
    },
    {
      sel: 'anecdotario.form',
      titulo: T('tut.app-anecdotario.2.titulo', 'Escribir'),
      texto: T(
        'tut.app-anecdotario.2.texto',
        'Elige tu ánimo, escribe lo que pasó y adjunta fotos si quieres. Guardar lo agrega a tu historia.',
      ),
    },
    {
      sel: 'anecdotario.lista',
      alEntrar: async (ctx) => {
        await ctx.unaVez('anecdota-ejemplo', async () => {
          const id = await anecdotasRepo.add({
            fecha: fechaLocalISO(),
            titulo: 'Ejemplo (tutorial) 🎓',
            contenido: 'Así se ve un recuerdo guardado: lo que pasó, con tu ánimo del día.',
            animo: '🙂',
          })
          ctx.alLimpiar(() => anecdotasRepo.remove(id))
        })
      },
      titulo: T('tut.app-anecdotario.3.titulo', 'Tus recuerdos'),
      texto: T(
        'tut.app-anecdotario.3.texto',
        'Guardé el recuerdo «Ejemplo (tutorial) 🎓» para que veas el feed con algo dentro; se borrará al terminar. El calendario filtra por día y las fotos se abren a pantalla completa.',
      ),
    },
  ],
}
