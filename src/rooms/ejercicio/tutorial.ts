/**
 * Flujos de ejercicio: corren sobre el AÑO de Pep@ en la casa demo (solo
 * navegan y señalan; no crean datos — el guard lo impediría igual).
 */
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, esperarTut } from '../../core/tutorial/dom'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Entra a una modalidad y, si se pide, a una de sus tres sub-pestañas. */
async function irA(tab: string, sub?: string): Promise<void> {
  clickTut(`ejercicio.tab.${tab}`)
  if (!sub) return
  // Sin esperar al cambio de pestaña, el segundo clic no encuentra nada.
  await esperarTut(`ejercicio.sub.${sub}`, 3000)
  clickTut(`ejercicio.sub.${sub}`)
}

export const cuerpoAnio: CuerpoTutorial = {
  preparar: () => {
    abrirApp('ejercicio')
  },
  pasos: [
    {
      sel: 'ejercicio.metas.resumen',
      titulo: T('tut.app-ejercicio--anio.1.titulo', 'Un año en tres números'),
      texto: T(
        'tut.app-ejercicio--anio.1.texto',
        'La racha cuenta los días seguidos con algo registrado, y la adherencia compara los días activos con los que te propusiste. Pep@ empezó el año sin poder trotar dos manzanas.',
      ),
      alEntrar: () => {
        clickTut('ejercicio.tab.metas')
      },
    },
    {
      sel: 'ejercicio.tab.metas',
      titulo: T('tut.app-ejercicio--anio.2.titulo', 'Las tres modalidades'),
      texto: T(
        'tut.app-ejercicio--anio.2.texto',
        'Las barras miden lo que llevas contra tus metas: sesiones de fuerza, minutos de carrera y minutos de movilidad. El objetivo se ajusta al periodo que elijas arriba.',
      ),
    },
    {
      sel: 'hoy.cabecera',
      titulo: T('tut.app-ejercicio--anio.3.titulo', 'Las metas del año'),
      texto: T(
        'tut.app-ejercicio--anio.3.texto',
        'El cuarto de Metas guarda sus cuatro metas cumplidas —los 5K, los 10K, el medio maratón y el maratón— y la que sigue viva. Las metas con fecha aparecen también en el calendario de la casa.',
      ),
    },
  ],
}

export const cuerpoCarrera: CuerpoTutorial = {
  preparar: () => {
    abrirApp('ejercicio')
  },
  pasos: [
    {
      sel: 'ejercicio.resistencia.subs',
      titulo: T('tut.app-ejercicio--carrera.1.titulo', 'Catálogo, rutinas y progreso'),
      texto: T(
        'tut.app-ejercicio--carrera.1.texto',
        'Cada modalidad se organiza igual: el catálogo de ejercicios, tus rutinas con su historial, y el progreso. Empecemos por lo que Pep@ ya corrió.',
      ),
      alEntrar: () => irA('resistencia'),
    },
    {
      sel: 'ejercicio.resistencia.rutinas',
      titulo: T('tut.app-ejercicio--carrera.2.titulo', 'Cada salida queda escrita'),
      texto: T(
        'tut.app-ejercicio--carrera.2.texto',
        'El historial se agrupa por año, mes y semana. Las carreras grandes guardan además el trazo del recorrido y sus tramos: ahí está el maratón, con sus parciales de diez kilómetros.',
      ),
      alEntrar: () => irA('resistencia', 'rutinas'),
    },
    {
      sel: 'ejercicio.resistencia.progreso',
      titulo: T('tut.app-ejercicio--carrera.3.titulo', 'El mapa de calor no miente'),
      texto: T(
        'tut.app-ejercicio--carrera.3.texto',
        'Los huecos también cuentan la historia: el mes de la lesión de rodilla está vacío y las tres semanas de Japón, casi. Al lado salen los kilómetros totales, la salida más larga y el mejor ritmo.',
      ),
      alEntrar: () => irA('resistencia', 'progreso'),
    },
  ],
}

export const cuerpoFuerza: CuerpoTutorial = {
  preparar: () => {
    abrirApp('ejercicio')
  },
  pasos: [
    {
      sel: 'ejercicio.fuerza.rutinas',
      titulo: T('tut.app-ejercicio--fuerza.1.titulo', 'Series, repeticiones y peso'),
      texto: T(
        'tut.app-ejercicio--fuerza.1.texto',
        'Cada sesión guarda sus ejercicios con el peso que levantaste. La app recuerda la última vez para no tener que buscarla, y suma el volumen total del día.',
      ),
      alEntrar: () => irA('fuerza', 'rutinas'),
    },
    {
      sel: 'ejercicio.fuerza.progresion',
      titulo: T('tut.app-ejercicio--fuerza.2.titulo', 'La curva de un año'),
      texto: T(
        'tut.app-ejercicio--fuerza.2.texto',
        'Elige un ejercicio y verás cómo subió: la sentadilla de Pep@ pasó de cuarenta kilos a setenta. Durante el mes de la lesión solo entrenó tren superior, y esa curva ni se enteró.',
      ),
      alEntrar: () => irA('fuerza', 'progreso'),
    },
    {
      sel: 'ejercicio.fuerza.records',
      titulo: T('tut.app-ejercicio--fuerza.3.titulo', 'Tus récords, sin pedirlos'),
      texto: T(
        'tut.app-ejercicio--fuerza.3.texto',
        'De cada ejercicio se guarda el mejor peso, las máximas repeticiones y una estimación de tu 1RM. Los de peso corporal, como las dominadas, se marcan aparte.',
      ),
    },
  ],
}

/**
 * ESENCIAL: corre en la casa REAL, así que solo se ancla a pestañas y cabeceras
 * que existen con la BD vacía. Recorre los cuatro menús de primer nivel y la
 * estructura que comparten las tres modalidades; no crea ni necesita datos.
 */
export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('ejercicio')
  },
  pasos: [
    {
      titulo: T('tut.app-ejercicio--esencial.1.titulo', 'Tu entrenamiento'),
      texto: T(
        'tut.app-ejercicio--esencial.1.texto',
        'Ejercicio reúne las tres modalidades del cuerpo —fuerza, resistencia y flexibilidad— más un menú de metas donde decides cuánto quieres entrenar cada semana.',
      ),
    },
    {
      sel: 'ejercicio.tab.metas',
      titulo: T('tut.app-ejercicio--esencial.2.titulo', 'Metas'),
      texto: T(
        'tut.app-ejercicio--esencial.2.texto',
        'El resumen del cuarto: la racha, los días con algo registrado y una barra por modalidad contra el objetivo semanal que fijes aquí. También se elige el sistema de medidas, en kilos o en libras.',
      ),
      alEntrar: async () => {
        await esperarTut('ejercicio.tab.metas', 4000)
        clickTut('ejercicio.tab.metas')
      },
    },
    {
      sel: 'ejercicio.tab.fuerza',
      titulo: T('tut.app-ejercicio--esencial.3.titulo', 'Fuerza'),
      texto: T(
        'tut.app-ejercicio--esencial.3.texto',
        'El entrenamiento con peso: cada sesión guarda sus ejercicios con series, repeticiones y carga. Con eso la app calcula el volumen del día, dibuja la progresión de cada ejercicio y guarda los récords.',
      ),
      alEntrar: () => {
        clickTut('ejercicio.tab.fuerza')
      },
    },
    {
      sel: 'ejercicio.fuerza.subs',
      titulo: T('tut.app-ejercicio--esencial.4.titulo', 'Catálogo, rutinas y progreso'),
      texto: T(
        'tut.app-ejercicio--esencial.4.texto',
        'Las tres modalidades se organizan igual. El Catálogo agrupa los ejercicios disponibles y arma rutinas con ellos, Rutinas registra el entreno del día que elijas arriba, y Progreso resume el periodo con su mapa de calor.',
      ),
      alEntrar: async () => {
        clickTut('ejercicio.tab.fuerza')
        await esperarTut('ejercicio.fuerza.subs', 4000)
      },
    },
    {
      sel: 'ejercicio.tab.resistencia',
      titulo: T('tut.app-ejercicio--esencial.5.titulo', 'Resistencia'),
      texto: T(
        'tut.app-ejercicio--esencial.5.texto',
        'Correr, pedalear, nadar o caminar, por tramos con sus minutos y su distancia. Desde aquí se abre el entrenamiento en vivo, que toma el recorrido por GPS y el pulso de un sensor Bluetooth y guarda la sesión al terminar.',
      ),
      alEntrar: () => {
        clickTut('ejercicio.tab.resistencia')
      },
    },
    {
      sel: 'ejercicio.tab.flexibilidad',
      titulo: T('tut.app-ejercicio--esencial.6.titulo', 'Flexibilidad'),
      texto: T(
        'tut.app-ejercicio--esencial.6.texto',
        'Estiramientos y movilidad, con series por tiempo en vez de por peso: cada postura lleva sus segundos y sus repeticiones. El reproductor guiado corre la rutina postura por postura con un temporizador que avisa cuándo cambiar.',
      ),
      alEntrar: () => {
        clickTut('ejercicio.tab.flexibilidad')
      },
    },
  ],
}

export const cuerpoFlexibilidad: CuerpoTutorial = {
  preparar: () => {
    abrirApp('ejercicio')
  },
  pasos: [
    {
      sel: 'ejercicio.flex.subs',
      alEntrar: () => irA('flexibilidad', 'catalogo'),
      titulo: T('tut.app-ejercicio--flexibilidad.1.titulo', 'Estiramientos y movilidad'),
      texto: T(
        'tut.app-ejercicio--flexibilidad.1.texto',
        'El catálogo trae los ejercicios de siempre —isquios, cadera, hombros— cada uno con su miniatura ilustrada, generada por IA la primera vez que se necesita.',
      ),
    },
    {
      sel: 'ejercicio.sub.rutinas',
      alEntrar: () => irA('flexibilidad', 'rutinas'),
      titulo: T('tut.app-ejercicio--flexibilidad.2.titulo', 'Series por tiempo, no por peso'),
      texto: T(
        'tut.app-ejercicio--flexibilidad.2.texto',
        'Cada ejercicio lleva segundos y repeticiones en vez de peso. El Reproductor guiado corre la rutina ejercicio por ejercicio con un temporizador que avisa cuándo cambiar.',
      ),
    },
    {
      sel: 'ejercicio.sub.progreso',
      alEntrar: () => irA('flexibilidad', 'progreso'),
      titulo: T('tut.app-ejercicio--flexibilidad.3.titulo', 'El mismo mapa de calor'),
      texto: T(
        'tut.app-ejercicio--flexibilidad.3.texto',
        'Minutos y sesiones del mes, con el mismo heatmap que las otras dos modalidades: la constancia de la movilidad se lee igual de fácil que la de correr.',
      ),
    },
    {
      texto: T(
        'tut.app-ejercicio--flexibilidad.4.texto',
        'Las tres modalidades comparten el Cardio en vivo del reloj: cuando corres o pedaleas con el temporizador puesto, el minuto a minuto se guarda solo al terminar.',
      ),
    },
  ],
}

