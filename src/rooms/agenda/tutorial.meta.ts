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

const flujoTrabajo = tour(
  'app-agenda--trabajo',
  T('tut.app-agenda--trabajo.titulo', 'Trabajo y estudio'),
  T(
    'tut.app-agenda--trabajo.resumen',
    'La bandeja de pendientes sin fecha y un tablero Kanban donde las tarjetas se arrastran de columna.',
  ),
  'cuerpoTrabajo',
)

const flujoSalud = tour(
  'app-agenda--salud',
  T('tut.app-agenda--salud.titulo', 'Salud y mascotas'),
  T(
    'tut.app-agenda--salud.resumen',
    'Citas médicas, medicamentos con sus horarios y las mascotas con sus cuidados: todo se agenda solo en el calendario.',
  ),
  'cuerpoSalud',
)

const flujoPersonas = tour(
  'app-agenda--personas',
  T('tut.app-agenda--personas.titulo', 'Personas'),
  T(
    'tut.app-agenda--personas.resumen',
    'Tu libreta de contactos por relación, con cumpleaños que se repiten solos cada año en el calendario.',
  ),
  'cuerpoPersonas',
)

export const flujosAgenda: TutorialDef[] = [flujoTrabajo, flujoSalud, flujoPersonas]
