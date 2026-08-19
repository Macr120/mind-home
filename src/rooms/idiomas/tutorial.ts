/**
 * Flujos de idiomas: corren sobre el AÑO de Pep@ en la casa demo (solo navegan
 * y señalan; no crean datos — el guard lo impediría igual).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

export const cuerpoCharlas: CuerpoTutorial = {
  preparar: () => {
    abrirApp('idiomas', 'charlas')
  },
  pasos: [
    {
      sel: 'idiomas.charlas.nueva',
      titulo: T('tut.app-idiomas--charlas.1.titulo', 'Un tutor a tu nivel'),
      texto: T(
        'tut.app-idiomas--charlas.1.texto',
        'Tu tutor es el asistente del cuarto: le hablas en el idioma que estudias y responde al nivel MCER de tu perfil — frases cortas con traducción en A1, idiomatismos en C1. Si le escribes en tu idioma, te anima a intentarlo en el que estudias.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.charlas')
      },
    },
    {
      sel: 'idiomas.charlas.lista',
      titulo: T('tut.app-idiomas--charlas.2.titulo', 'Se guardan y se clasifican solas'),
      texto: T(
        'tut.app-idiomas--charlas.2.texto',
        'Cada charla queda en esta lista con su título, su tema del temario y su nivel, puestos sin que hagas nada. También puede nacer desde un tema —con el botón de charla de su fila— para practicar justo eso.',
      ),
    },
    {
      texto: T(
        'tut.app-idiomas--charlas.3.texto',
        'Cuando el tutor corrige, la forma correcta va en su propia línea con una palomita, y la conversación sigue sin regaños. Al salir te ofrece extraer el vocabulario que apareció: eliges qué tarjetas guardar y heredan el tema de la charla.',
      ),
    },
  ],
}

export const cuerpoRepaso: CuerpoTutorial = {
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

export const cuerpoVocabulario: CuerpoTutorial = {
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

export const cuerpoTemario: CuerpoTutorial = {
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

/**
 * ESENCIAL: corre en la casa REAL, así que solo se ancla a pestañas que
 * existen con la BD vacía. Recorre los cuatro menús de primer nivel; no crea
 * ni necesita datos.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('idiomas')
  },
  pasos: [
    {
      titulo: T('tut.app-idiomas--esencial.1.titulo', 'Tu escuela de idiomas'),
      texto: T(
        'tut.app-idiomas--esencial.1.texto',
        'Aquí eliges un idioma, charlas con un tutor de inteligencia artificial, guardas el vocabulario que aprendes y lo repasas con un sistema espaciado. Son cuatro menús: Charlas, Temario, Repaso y Progreso.',
      ),
    },
    {
      sel: 'idiomas.tab.charlas',
      titulo: T('tut.app-idiomas--esencial.2.titulo', 'Charlas'),
      texto: T(
        'tut.app-idiomas--esencial.2.texto',
        'Conversas con tu tutor en el idioma que estudias: responde según tu nivel y corrige con suavidad. Cada charla queda guardada y clasificada sola, y al salir te ofrece extraer el vocabulario nuevo como tarjetas.',
      ),
      alEntrar: async () => {
        await esperarTut('idiomas.tab.charlas', 4000)
        clickTut('idiomas.tab.charlas')
      },
    },
    {
      sel: 'idiomas.tab.temario',
      titulo: T('tut.app-idiomas--esencial.3.titulo', 'Temario'),
      texto: T(
        'tut.app-idiomas--esencial.3.texto',
        'Ordena el idioma en temas, pronunciación y gramática, del nivel A1 al C2. El vocabulario vive dentro de cada tema: cada tarjeta se guarda ahí, con su traducción y su ejemplo.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.temario')
      },
    },
    {
      sel: 'idiomas.tab.repaso',
      titulo: T('tut.app-idiomas--esencial.4.titulo', 'Repaso'),
      texto: T(
        'tut.app-idiomas--esencial.4.texto',
        'El repaso espaciado: cada tarjeta vive en una caja y solo te pide las que estás a punto de olvidar, con ejercicios de opción múltiple, al revés o completar la frase en vez de solo mirarlas.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.repaso')
      },
    },
    {
      sel: 'idiomas.tab.progreso',
      titulo: T('tut.app-idiomas--esencial.5.titulo', 'Progreso'),
      texto: T(
        'tut.app-idiomas--esencial.5.texto',
        'El resumen de tu avance: cuántas tarjetas dominas, cuánto repasaste y tu nivel actual, con el historial de tus repasos día a día.',
      ),
      alEntrar: () => {
        clickTut('idiomas.tab.progreso')
      },
    },
  ],
}

