import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'

/**
 * Fichas de los tutoriales de esta app: id, título y resumen. Es lo único que
 * entra al bundle de arranque (el selector las pinta y su medidor de zonas las
 * lee cada 200 ms); los pasos viven en `tutorial.ts`, que solo se descarga al
 * lanzar un tour.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** El `keyof` valida en compilación que el cuerpo exista con ese nombre. */
const tour = (
  id: string,
  titulo: TextoTut,
  resumen: TextoTut,
  cuerpo: keyof typeof import('./tutorial'),
): TutorialDef => ({
  id,
  titulo,
  resumen,
  cargar: () => import('./tutorial').then((m) => m[cuerpo] as CuerpoTutorial),
})

const flujoAnio = tour(
  'app-ejercicio--anio',
  T('tut.app-ejercicio--anio.titulo', 'El año que Pep@ aprendió a correr'),
  T(
    'tut.app-ejercicio--anio.resumen',
    'Ejercicio reúne fuerza, resistencia y movilidad en un mismo sitio: cada sesión que registras alimenta tu racha, tus metas semanales y el historial del año.',
  ),
  'cuerpoAnio',
)

const flujoCarrera = tour(
  'app-ejercicio--carrera',
  T('tut.app-ejercicio--carrera.titulo', 'De cero a 42 kilómetros'),
  T(
    'tut.app-ejercicio--carrera.resumen',
    'La pestaña Resistencia guarda cada salida con su distancia, su ritmo y su recorrido; el progreso resume el mes en un mapa de calor y saca tus mejores marcas.',
  ),
  'cuerpoCarrera',
)

const flujoFuerza = tour(
  'app-ejercicio--fuerza',
  T('tut.app-ejercicio--fuerza.titulo', 'La fuerza que la rodilla no se llevó'),
  T(
    'tut.app-ejercicio--fuerza.resumen',
    'En Fuerza registras series, repeticiones y peso; con eso la app calcula tu volumen, dibuja la progresión de cada ejercicio y guarda tus récords personales.',
  ),
  'cuerpoFuerza',
)

const flujoFlexibilidad = tour(
  'app-ejercicio--flexibilidad',
  T('tut.app-ejercicio--flexibilidad.titulo', 'La tercera modalidad'),
  T(
    'tut.app-ejercicio--flexibilidad.resumen',
    'Flexibilidad se organiza igual que Fuerza y Resistencia —catálogo, rutinas, progreso— pero con series por tiempo en vez de por peso, y un reproductor guiado con temporizador.',
  ),
  'cuerpoFlexibilidad',
)

export const flujosEjercicio: TutorialDef[] = [flujoAnio, flujoCarrera, flujoFuerza, flujoFlexibilidad]
