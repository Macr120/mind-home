import type { CuerpoTutorial, TextoTut, TutorialDef } from './tipos'

/**
 * Fichas de los tours del NÚCLEO que no son del reloj (ver `calendario.meta.ts`):
 * la lista de hoy, el progreso del personaje y el Wrapped. Los pasos viven en
 * `nucleo.ts`, que solo baja al lanzarlos.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

const tour = (
  id: string,
  titulo: TextoTut,
  resumen: TextoTut,
  cuerpo: keyof typeof import('./nucleo'),
): TutorialDef => ({
  id,
  titulo,
  resumen,
  cargar: () => import('./nucleo').then((m) => m[cuerpo] as CuerpoTutorial),
})

export const tutorialHoy = tour(
  'hoy',
  T('tut.hoy.titulo', 'Lo de hoy'),
  T(
    'tut.hoy.resumen',
    'La lista Hoy de cada app junta tres cosas en un solo lugar: los objetivos del día de esa app, lo que agendaste para hoy y los pasos de tus metas vigentes. Un paso se cumple porque el registro ya existe en la app, no porque nadie lo palomeó a mano.',
  ),
  'cuerpoHoy',
)

export const tutorialProgreso = tour(
  'progreso',
  T('tut.progreso.titulo', 'Tu progreso'),
  T(
    'tut.progreso.resumen',
    'Tu personaje vive de tu actividad real: su humor, su nivel, la Montaña de Sísifo (rango e insignias) y el radar de XP por cuarto. Todo se calcula de lo que ya registraste, nada se declara a mano.',
  ),
  'cuerpoProgreso',
)

export const tutorialWrapped = tour(
  'wrapped',
  T('tut.wrapped.titulo', 'Wrapped: tu resumen'),
  T(
    'tut.wrapped.resumen',
    'El resumen del periodo —semana, mes o año— contado en láminas, con música de fondo y comparativa contra el periodo anterior. Se comparte como texto desde la propia lámina.',
  ),
  'cuerpoWrapped',
)

export const FLUJOS_NUCLEO_NUEVOS = {
  hoy: [tutorialHoy],
  progreso: [tutorialProgreso, tutorialWrapped],
}
