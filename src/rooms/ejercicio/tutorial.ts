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

