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
    {
      sel: 'biblioteca.enc.arbol',
      titulo: T('tut.app-biblioteca--enciclopedia.4.titulo', 'El índice es tuyo'),
      texto: T(
        'tut.app-biblioteca--enciclopedia.4.texto',
        'El + de cada fila escribe una entrada ahí mismo, con su campo y su tema ya puestos. Y con el botón del lápiz haces crecer el árbol: ese mismo + añade ramas, el de la Semilla crea campos nuevos, y puedes renombrar, reordenar y borrar. El número con la ramita dice cuántos subíndices cuelgan de ahí.',
      ),
    },
  ],
}

const flujoCharlas: TutorialDef = {
  id: 'app-biblioteca--charlas',
  titulo: T('tut.app-biblioteca--charlas.titulo', 'Charlar y destilar'),
  resumen: T(
    'tut.app-biblioteca--charlas.resumen2',
    'Preguntas al Sabio sobre cualquier tema y la charla se archiva sola: se clasifica en tu árbol y sale ya destilada como ficha de la enciclopedia.',
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
        'tut.app-biblioteca--charlas.2.texto2',
        'La primera respuesta ya deja la charla colocada en su rama y escrita como entrada. Desde esa entrada la ramificas: los subtemas que te dejaron con curiosidad se vuelven ramas nuevas.',
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
    'El temporizador registra cuánto estudias —de corrido o a pomodoros— y el plan de estudio reparte tus metas en el calendario.',
  ),
  preparar: () => {
    abrirApp('biblioteca', 'estudio')
  },
  pasos: [
    {
      sel: 'biblioteca.estudio.timer',
      titulo: T('tut.app-biblioteca--estudio.1b.titulo', 'El reloj de estudiar'),
      texto: T(
        'tut.app-biblioteca--estudio.1b.texto',
        'Eliges campo y arrancas: en Simple corres los minutos de un tirón, y en Pomodoro la app encadena tramos de concentración y descansos. Cada tramo se registra solo, y el reloj sigue aunque cierres el cuarto.',
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

const flujoResumen: TutorialDef = {
  id: 'app-biblioteca--resumen',
  titulo: T('tut.app-biblioteca--resumen.titulo', 'El panorama del año'),
  resumen: T(
    'tut.app-biblioteca--resumen.resumen',
    'Resumen junta en una pantalla lo que las otras tres pestañas reparten: cuántas entradas tienes por campo, cuánto has estudiado y qué días.',
  ),
  preparar: () => {
    abrirApp('biblioteca', 'resumen')
  },
  pasos: [
    {
      sel: 'biblioteca.r.cabecera',
      alEntrar: () => {
        clickTut('biblioteca.tab.resumen')
      },
      texto: T(
        'tut.app-biblioteca--resumen.1.texto',
        'Cuántas entradas tiene tu enciclopedia y cuántos de los campos y temas del índice ya cubriste. Los temas que abrió una charla se cuentan aparte.',
      ),
    },
    {
      sel: 'biblioteca.r.stats',
      titulo: T('tut.app-biblioteca--resumen.2.titulo', 'Cuatro números'),
      texto: T(
        'tut.app-biblioteca--resumen.2.texto',
        'Charlas con el Sabio, minutos de estudio en total y en la semana, y tu racha de días seguidos estudiando.',
      ),
    },
    {
      sel: 'biblioteca.r.porCampo',
      titulo: T('tut.app-biblioteca--resumen.3.titulo', 'Dónde está el desbalance'),
      texto: T(
        'tut.app-biblioteca--resumen.3.texto',
        'La barra más larga es el campo que más atención te llevó — para Pep@, termodinámica en la semana del parcial.',
      ),
    },
    {
      sel: 'biblioteca.r.tiempoPorCampo',
      titulo: T('tut.app-biblioteca--resumen.5.titulo', 'En qué se te fueron las horas'),
      texto: T(
        'tut.app-biblioteca--resumen.5.texto',
        'Lo mismo que arriba pero en minutos: una cosa es tener muchas fichas de un campo y otra haberle dedicado tiempo de verdad.',
      ),
    },
    {
      sel: 'biblioteca.r.heatmap',
      titulo: T('tut.app-biblioteca--resumen.4.titulo', 'Los días de estudio'),
      texto: T(
        'tut.app-biblioteca--resumen.4.texto',
        'Un cuadrito por día: se nota el atracón antes del parcial y el hueco de las tres semanas en Japón, sin necesidad de abrir el historial completo.',
      ),
    },
    {
      sel: 'biblioteca.r.historial',
      titulo: T('tut.app-biblioteca--resumen.6.titulo', 'Un año de sesiones'),
      texto: T(
        'tut.app-biblioteca--resumen.6.texto',
        'Y si quieres el detalle, el historial guarda cada sesión con sus minutos y su campo, archivado por año, mes y semana.',
      ),
    },
  ],
}

export const flujosBiblioteca: TutorialDef[] = [flujoEnciclopedia, flujoCharlas, flujoEstudio, flujoResumen]
