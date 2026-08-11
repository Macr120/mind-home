/**
 * Flujos de idiomas: corren sobre el AÑO de Pep@ en la casa demo (solo navegan
 * y señalan; no crean datos — el guard lo impediría igual).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const flujoRepaso: TutorialDef = {
  id: 'app-idiomas--repaso',
  titulo: T('tut.app-idiomas--repaso.titulo', 'El repaso diario'),
  resumen: T(
    'tut.app-idiomas--repaso.resumen',
    'Las tarjetas se repasan por cajas: cada acierto aleja la próxima cita y cada fallo la acerca. La app solo te pide las que tocan hoy.',
  ),
  preparar: () => {
    abrirApp('idiomas', 'repaso')
  },
  pasos: [
    {
      sel: 'idiomas.repaso.panel',
      titulo: T('tut.app-idiomas--repaso.1.titulo', 'Lo que toca hoy'),
      texto: T(
        'tut.app-idiomas--repaso.1.texto',
        'Pep@ lleva un año con esto y aún tiene repasos pendientes: el sistema no te pide todo el vocabulario, solo lo que estás a punto de olvidar.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.repaso')
      },
    },
    {
      sel: 'idiomas.repaso.panel',
      titulo: T('tut.app-idiomas--repaso.2b.titulo', 'Ejercicios, no cartas'),
      texto: T(
        'tut.app-idiomas--repaso.2b.texto',
        'Se repasa respondiendo: opción múltiple, al revés o completando la frase de ejemplo. Arriba eliges qué entra a la ronda — lo que toca hoy, todo el vocabulario o un tema del temario.',
      ),
    },
    {
      sel: 'idiomas.progreso.panel',
      titulo: T('tut.app-idiomas--repaso.3.titulo', 'Un año de constancia'),
      texto: T(
        'tut.app-idiomas--repaso.3.texto',
        'El historial guarda cuántas repasaste cada día y cuántas acertaste. Pep@ empezó fallando bastante y terminó acertando casi todo — y en Japón repasó más que nunca.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.progreso')
      },
    },
  ],
}

const flujoVocabulario: TutorialDef = {
  id: 'app-idiomas--vocabulario',
  titulo: T('tut.app-idiomas--vocabulario.titulo', 'El vocabulario'),
  resumen: T(
    'tut.app-idiomas--vocabulario.resumen2',
    'Las tarjetas viven DENTRO del temario: cada tema se despliega y ahí están las suyas, con su sonido, su imagen y su caja de repaso.',
  ),
  preparar: () => {
    abrirApp('idiomas', 'temario')
  },
  pasos: [
    {
      sel: 'idiomas.tab.temario',
      titulo: T('tut.app-idiomas--vocabulario.1.titulo2', 'Cada palabra, en su tema'),
      texto: T(
        'tut.app-idiomas--vocabulario.1.texto2',
        'Despliega un tema y verás sus tarjetas: tocarlas las lee en voz alta, la miniatura abre la ilustración y el lápiz las edita. Las primeras de Pep@ son A2 —compras, direcciones— y las últimas ya son B1.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.temario')
      },
    },
    {
      sel: 'idiomas.tab.temario',
      titulo: T('tut.app-idiomas--vocabulario.2.titulo', 'Dos idiomas a la vez'),
      texto: T(
        'tut.app-idiomas--vocabulario.2.texto',
        'Arriba se cambia de idioma: además del principal, Pep@ montó un japonés de supervivencia entre el mes 4 y el viaje. Al volver casi lo dejó, y se nota en sus cajas.',
      ),
    },
    {
      texto: T(
        'tut.app-idiomas--vocabulario.3.texto2',
        'Las tarjetas se añaden a mano en su tema, salen de una charla con el tutor o las propone la IA. Lo que quede suelto cae en «Sin clasificar», y desde ahí lo mandas al tema que le toque.',
      ),
    },
  ],
}

const flujoTemario: TutorialDef = {
  id: 'app-idiomas--temario',
  titulo: T('tut.app-idiomas--temario.titulo', 'El temario y el plan'),
  resumen: T(
    'tut.app-idiomas--temario.resumen',
    'El temario ordena el idioma en tres áreas —temas, pronunciación y gramática— por nivel MCER, y el progreso resume tu avance.',
  ),
  preparar: () => {
    abrirApp('idiomas', 'temario')
  },
  pasos: [
    {
      sel: 'idiomas.tab.temario',
      titulo: T('tut.app-idiomas--temario.1.titulo', 'Tres áreas, seis niveles'),
      texto: T(
        'tut.app-idiomas--temario.1.texto',
        'De A1 a C2, cada nivel con sus temas de vocabulario, sus puntos de pronunciación y su gramática. Sabes qué te falta sin buscar un curso fuera.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.temario')
      },
    },
    {
      sel: 'idiomas.progreso.panel',
      titulo: T('tut.app-idiomas--temario.2.titulo', 'Dónde vas'),
      texto: T(
        'tut.app-idiomas--temario.2.texto',
        'Tarjetas dominadas, repasos del mes y tu nivel actual. Pep@ arrancó el año en A2 y hoy anda en B1.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.progreso')
      },
    },
    {
      texto: T(
        'tut.app-idiomas--temario.3.texto2',
        'También puedes guardar material propio en un tema —apuntes, frases del hotel, una foto de tu libreta—, hacerlo tuyo con el ✏️ (añadir temas, renombrarlos, ordenarlos o borrarlos) y pedir un plan de estudio con fecha objetivo.',
      ),
    },
  ],
}

export const flujosIdiomas: TutorialDef[] = [flujoRepaso, flujoVocabulario, flujoTemario]
