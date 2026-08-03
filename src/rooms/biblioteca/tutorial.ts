/**
 * Flujos de la biblioteca: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const flujoEnciclopedia: TutorialDef = {
  id: 'app-biblioteca--enciclopedia',
  titulo: T('tut.app-biblioteca--enciclopedia.titulo', 'La enciclopedia propia'),
  resumen: T(
    'tut.app-biblioteca--enciclopedia.resumen',
    'Todo lo que aprendes se archiva en un árbol por campo del conocimiento: fichas con resumen y puntos clave que puedes ilustrar.',
  ),
  preparar: () => {
    abrirApp('biblioteca', 'enciclopedia')
  },
  pasos: [
    {
      sel: 'biblioteca.enc.arbol',
      titulo: T('tut.app-biblioteca--enciclopedia.1.titulo', 'Un año de carrera, en un árbol'),
      texto: T(
        'tut.app-biblioteca--enciclopedia.1.texto',
        'Pep@ estudia Física: mecánica al principio del año, termodinámica hacia el parcial del mes 6, relatividad y astrofísica al final. Cada rama se abre para ver sus fichas.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.enciclopedia')
      },
    },
    {
      sel: 'biblioteca.enc.arbol',
      titulo: T('tut.app-biblioteca--enciclopedia.2.titulo', 'El árbol crece contigo'),
      texto: T(
        'tut.app-biblioteca--enciclopedia.2.texto',
        'Los temas del catálogo ya vienen; los que cuelgan sueltos los abrió una charla. Toca una ficha para leer su resumen, sus puntos clave y su ilustración.',
      ),
    },
    {
      texto: T(
        'tut.app-biblioteca--enciclopedia.3.texto',
        'Una ficha se escribe a mano o se destila de una conversación. La del agujero negro y la de la física del piano llevan dibujo: la app puede ilustrarlas por ti.',
      ),
    },
  ],
}

const flujoCharlas: TutorialDef = {
  id: 'app-biblioteca--charlas',
  titulo: T('tut.app-biblioteca--charlas.titulo', 'Charlar y destilar'),
  resumen: T(
    'tut.app-biblioteca--charlas.resumen',
    'Preguntas al Sabio sobre cualquier tema y de la conversación sacas una ficha para tu enciclopedia y ramas nuevas para tu árbol.',
  ),
  preparar: () => {
    abrirApp('biblioteca', 'charlas')
  },
  pasos: [
    {
      sel: 'biblioteca.tab.charlas',
      titulo: T('tut.app-biblioteca--charlas.1.titulo', 'Las dudas del año'),
      texto: T(
        'tut.app-biblioteca--charlas.1.texto',
        'Aquí están las conversaciones que Pep@ tuvo mientras estudiaba: entropía, dilatación del tiempo, por qué un piano suena a piano. Cada una quedó guardada.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.charlas')
      },
    },
    {
      sel: 'biblioteca.enc.arbol',
      titulo: T('tut.app-biblioteca--charlas.2.titulo', 'De la charla al árbol'),
      texto: T(
        'tut.app-biblioteca--charlas.2.texto',
        'Al terminar una charla puedes ramificarla: los subtemas que te dejaron con curiosidad se vuelven ramas nuevas, y lo aprendido, una ficha.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.enciclopedia')
      },
    },
    {
      texto: T(
        'tut.app-biblioteca--charlas.3.texto',
        'Así la enciclopedia no se llena de teoría copiada, sino de lo que de verdad preguntaste.',
      ),
    },
  ],
}

const flujoEstudio: TutorialDef = {
  id: 'app-biblioteca--estudio',
  titulo: T('tut.app-biblioteca--estudio.titulo', 'Estudiar y planear'),
  resumen: T(
    'tut.app-biblioteca--estudio.resumen',
    'El temporizador registra cuánto estudias, el historial lo acumula por campo y el plan de estudio reparte tus metas en el calendario.',
  ),
  preparar: () => {
    abrirApp('biblioteca', 'estudio')
  },
  pasos: [
    {
      sel: 'biblioteca.estudio.historial',
      titulo: T('tut.app-biblioteca--estudio.1.titulo', 'Un año de sesiones'),
      texto: T(
        'tut.app-biblioteca--estudio.1.texto',
        'Cada sesión guarda sus minutos, su campo y a veces una nota. Se ven los atracones de las semanas de parcial y el silencio de las tres semanas en Japón.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.estudio')
      },
    },
    {
      sel: 'biblioteca.estudio.plan',
      titulo: T('tut.app-biblioteca--estudio.2.titulo', 'El plan de estudio'),
      texto: T(
        'tut.app-biblioteca--estudio.2.texto',
        'Las metas viven en el mismo cronograma del calendario: «terminar termodinámica antes del parcial» ya está cumplida; preparar el posgrado sigue en curso.',
      ),
    },
    {
      texto: T(
        'tut.app-biblioteca--estudio.3.texto',
        'A cada meta puedes pedirle un plan: la IA pregunta tu fecha objetivo y tus horas disponibles, y agenda los ratos de estudio en tu calendario.',
      ),
    },
  ],
}

export const flujosBiblioteca: TutorialDef[] = [flujoEnciclopedia, flujoCharlas, flujoEstudio]
