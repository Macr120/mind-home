import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { clickTut, esperarTut } from '../../core/tutorial/dom'
import { abrirApp } from '../../core/abrirApp'
import { eliminarIdiomaCascada, idiomasRepo, tarjetasIdiomaRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const tutorialIdiomas: TutorialDef = {
  id: 'app-idiomas',
  titulo: T('tut.app-idiomas.titulo', 'Idiomas'),
  resumen: T(
    'tut.app-idiomas.resumen',
    'Idiomas te ayuda a aprender lenguas: tutor por nivel (A1–C2), tarjetas de repaso con repetición espaciada, vocabulario con pronunciación, un temario-árbol que crece contigo y ejercicios sin IA.',
  ),
  preparar: () => {
    abrirApp('idiomas')
  },
  pasos: [
    {
      texto: T(
        'tut.app-idiomas.1.texto',
        'Idiomas lleva tu aprendizaje de lenguas; puedes estudiar varias a la vez.',
      ),
    },
    {
      sel: 'idiomas.tab.charlas',
      alEntrar: async (ctx) => {
        await ctx.unaVez('idioma-ejemplo', async () => {
          // Sin idiomas dados de alta la app solo muestra el formulario inicial
          // (y las pestañas no existen): creamos «Inglés» para poder recorrerla.
          let idiomas = await idiomasRepo.list()
          if (idiomas.length === 0) {
            const idiomaId = await idiomasRepo.add({
              codigo: 'en-US',
              nombre: 'Inglés',
              bandera: '🇬🇧',
              nivel: 'A1',
              creadoEn: new Date().toISOString(),
            })
            ctx.alLimpiar(() => eliminarIdiomaCascada(idiomaId))
            idiomas = await idiomasRepo.list()
          }
          // Tarjeta demo en el idioma activo (mismo criterio de la app), vencida hoy.
          const lsId = Number(localStorage.getItem('mh.idiomaActivo'))
          const activo = idiomas.find((i) => i.id === lsId) ?? idiomas[0]
          if (activo?.id != null) {
            const tarjetaId = await tarjetasIdiomaRepo.add({
              idiomaId: activo.id,
              termino: 'Ejemplo (tutorial) 🎓',
              traduccion: 'ejemplo',
              tipo: 'palabra',
              nivel: 'A1',
              caja: 0,
              proximaISO: fechaLocalISO(),
              fuente: 'manual',
              creadoEn: new Date().toISOString(),
            })
            ctx.alLimpiar(() => tarjetasIdiomaRepo.remove(tarjetaId))
          }
        })
        await esperarTut('idiomas.tab.charlas')
        clickTut('idiomas.tab.charlas')
      },
      titulo: T('tut.app-idiomas.2.titulo', 'Charlas'),
      texto: T(
        'tut.app-idiomas.2.texto',
        'El tutor conversa contigo en el idioma, ajustado a tu nivel MCER (A1–C2). (Requiere IA activa.) Dejé una tarjeta «Ejemplo (tutorial) 🎓» para los siguientes pasos; se borrará al terminar.',
      ),
    },
    {
      sel: 'idiomas.tab.repaso',
      alEntrar: () => {
        clickTut('idiomas.tab.repaso')
      },
      titulo: T('tut.app-idiomas.3.titulo', 'Repaso'),
      texto: T(
        'tut.app-idiomas.3.texto',
        'Tarjetas con repetición espaciada (cajas de Leitner): lo difícil vuelve pronto, lo aprendido se espacia. La tarjeta de ejemplo ya está vencida: así se ve un repaso pendiente.',
      ),
    },
    {
      sel: 'idiomas.tab.vocabulario',
      alEntrar: () => {
        clickTut('idiomas.tab.vocabulario')
      },
      titulo: T('tut.app-idiomas.4.titulo', 'Vocabulario'),
      texto: T(
        'tut.app-idiomas.4.texto',
        'Tu banco de palabras y frases, con pronunciación por voz (TTS). Ahí está la tarjeta «Ejemplo (tutorial) 🎓» recién guardada.',
      ),
    },
    {
      sel: 'idiomas.tab.temario',
      alEntrar: () => {
        clickTut('idiomas.tab.temario')
      },
      titulo: T('tut.app-idiomas.5.titulo', 'Temario'),
      texto: T(
        'tut.app-idiomas.5.texto',
        'El temario vivo en tres áreas —temas, pronunciación y gramática—: se desbloquean subtemas conforme estudias y en cada tema puedes guardar tus propios apuntes e imágenes. Progreso muestra tu avance.',
      ),
    },
  ],
}
