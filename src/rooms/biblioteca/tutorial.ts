/**
 * Flujos de la biblioteca: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoEnciclopedia: CuerpoTutorial = {
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

export const cuerpoCharlas: CuerpoTutorial = {
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

export const cuerpoEstudio: CuerpoTutorial = {
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
      sel: 'hoy.cabecera',
      titulo: T('tut.app-biblioteca--estudio.2.titulo', 'El plan de estudio'),
      texto: T(
        'tut.app-biblioteca--estudio.2.texto',
        'El botón Misiones del encabezado trae lo que toca hoy. Las metas de estudio viven en el cuarto de Metas, agrupadas por app: «terminar termodinámica antes del parcial» ya está cumplida; preparar el posgrado sigue en curso.',
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

export const cuerpoResumen: CuerpoTutorial = {
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

/**
 * ESENCIAL: corre en la casa real y recorre los cuatro menús de la biblioteca
 * uno por uno. Sin datos de por medio: sus anclas son las pestañas, que existen
 * con la BD vacía (el árbol de la enciclopedia todavía puede estar sin ramas).
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('biblioteca')
  },
  pasos: [
    {
      titulo: T('tut.app-biblioteca--esencial.1.titulo', 'Tu biblioteca'),
      texto: T(
        'tut.app-biblioteca--esencial.1.texto',
        'La biblioteca es tu enciclopedia personal: preguntas lo que no sabes, guardas lo que aprendes y llevas la cuenta de lo que estudias. Son cuatro menús.',
      ),
    },
    {
      sel: 'biblioteca.tab.charlas',
      titulo: T('tut.app-biblioteca--esencial.2.titulo', 'Charlas'),
      texto: T(
        'tut.app-biblioteca--esencial.2.texto',
        'Aquí preguntas al Sabio sobre cualquier tema y la conversación queda guardada. Cada charla se clasifica sola en su campo del conocimiento y sale destilada como ficha de la enciclopedia.',
      ),
      alEntrar: async () => {
        await esperarTut('biblioteca.tab.charlas', 4000)
        clickTut('biblioteca.tab.charlas')
      },
    },
    {
      sel: 'biblioteca.tab.enciclopedia',
      titulo: T('tut.app-biblioteca--esencial.3.titulo', 'Enciclopedia'),
      texto: T(
        'tut.app-biblioteca--esencial.3.texto',
        'El árbol donde vive lo aprendido, ordenado por campo del conocimiento. Cada ficha lleva su resumen y sus puntos clave, y también puedes escribirlas a mano; con el lápiz haces crecer el índice a tu medida.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.enciclopedia')
      },
    },
    {
      sel: 'biblioteca.tab.estudio',
      titulo: T('tut.app-biblioteca--esencial.4.titulo', 'Estudio'),
      texto: T(
        'tut.app-biblioteca--esencial.4.texto',
        'El reloj para estudiar: eliges campo y duración, de corrido o por pomodoros, y cada tramo se registra solo. Sigue corriendo aunque salgas del cuarto.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.estudio')
      },
    },
    {
      sel: 'biblioteca.tab.resumen',
      titulo: T('tut.app-biblioteca--esencial.5.titulo', 'Resumen'),
      texto: T(
        'tut.app-biblioteca--esencial.5.texto',
        'El panorama de todo lo anterior: cuántas entradas tiene tu enciclopedia y qué parte del índice cubriste, los minutos de estudio, tu racha y los días en que estudiaste.',
      ),
      alEntrar: () => {
        clickTut('biblioteca.tab.resumen')
      },
    },
  ],
}

