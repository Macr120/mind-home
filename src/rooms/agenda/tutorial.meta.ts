import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

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
    'La salud en tres submenús: Tú (citas por especialidad, cuidados, medicamentos y ciclo), Prójimos (quienes están a tu cuidado) y Mascotas. Todo lo que lleva fecha se agenda solo en el calendario.',
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

/** Esencial: recorre los tres menús en la casa real, sin necesitar datos. */
export const esencialAgenda: TutorialDef = fichaEsencial(
  'agenda',
  T(
    'tut.app-agenda--esencial.resumen',
    'La agenda lleva lo que no es un hábito, en tres menús: Trabajo (pendientes y tablero), Salud (citas, medicamentos y cuidados: tuyos, de tus prójimos y de tus mascotas) y Personas (contactos y cumpleaños). Todo lo que lleva fecha se agenda solo en el calendario.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
