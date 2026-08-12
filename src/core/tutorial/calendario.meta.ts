import type { CuerpoTutorial, TextoTut, TutorialDef } from './tipos'

/**
 * Fichas de los cuatro tours del reloj (calendario, metas, rutinas y los chips
 * de enlace). Los pasos viven en `calendario.ts`, que solo baja al lanzarlos.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const tour = (
  id: string,
  titulo: TextoTut,
  resumen: TextoTut,
  cuerpo: keyof typeof import('./calendario'),
): TutorialDef => ({
  id,
  titulo,
  resumen,
  cargar: () => import('./calendario').then((m) => m[cuerpo] as CuerpoTutorial),
})

export const tutorialCalendario = tour(
  'calendario',
  T('tut.calendario.titulo', 'Calendario'),
  T(
    'tut.calendario.resumen',
    'El reloj de la casa abre el calendario: todo lo agendado —turnos, clases, hábitos y lo que aportan las demás apps— en vistas Día, Semana, Mes, Año y Metas. El panel de abajo mide qué tanto cumples lo que agendaste.',
  ),
  'cuerpoCalendario',
)

export const tutorialMetas = tour(
  'metas',
  T('tut.metas.titulo', 'Metas'),
  T(
    'tut.metas.resumen',
    'Las tres pantallas de una meta: la lista donde nace, el plan que la desarrolla (la IA lo propone y tú lo palomeas) y el cronograma donde sus fases ocupan su periodo, ya como sub-metas reales.',
  ),
  'cuerpoMetas',
)

export const tutorialRutinas = tour(
  'rutinas',
  T('tut.rutinas.titulo', 'Rutinas'),
  T(
    'tut.rutinas.resumen',
    'El panel de rutinas lleva tu checklist del día arriba y el catálogo completo abajo: cada rutina tiene hora, repetición y pasos, y cada paso puede registrar solo en su app. A su hora el asistente avisa, y todo lo agendado se ve también en el calendario.',
  ),
  'cuerpoRutinas',
)

export const tutorialEnlaces = tour(
  'enlaces',
  T('tut.enlaces.titulo', 'Los chips de cada paso'),
  T(
    'tut.enlaces.resumen',
    'Un chip de app junto a una meta o un paso de plan dice dónde se registra eso, y un toque te lleva ahí. Es solo navegación: el registro siempre lo hace la app, nunca el chip.',
  ),
  'cuerpoEnlaces',
)

export const FLUJOS_CALENDARIO: TutorialDef[] = [
  tutorialCalendario,
  tutorialMetas,
  tutorialRutinas,
  tutorialEnlaces,
]
