import type { CuerpoTutorial, TextoTut, TutorialDef } from './tipos'

/**
 * Fichas de los tres tours del reloj (calendario, metas y los chips de
 * enlace). Los pasos viven en `calendario.ts`, que solo baja al lanzarlos.
 *
 * «Misiones» (`tutorialHoy`, en `nucleo.meta.ts`) NO está aquí: cada botón del
 * selector explica lo suyo y ese tiene chip propio en la página 1. Mezclarlo en
 * estas listas hacía que el botón de Metas ofreciera un tour de misiones.
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
    'Cómo el cuarto de Metas se enlaza con el resto: las metas nacen en las demás apps y aquí se juntan agrupadas por la suya; su hoja lleva el plan que la desarrolla (la IA lo propone y tú lo palomeas) y su cronograma, con las fases ya como sub-metas reales. Con fechas puestas salen en el calendario, y sus pasos de hoy en las Misiones de esa app.',
  ),
  'cuerpoMetas',
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

/**
 * El esencial del calendario. Comparte el título con los esenciales de las apps
 * («Lo esencial»), pero su id NO lleva el prefijo `app-`: el calendario no es
 * una plantilla, vive en el reloj. Fuera de `FLUJOS_CALENDARIO` a propósito —
 * este corre en la casa real y lo registra quien lo lanza.
 */
export const esencialCalendario = tour(
  'calendario--esencial',
  T('tut.esencial.titulo', 'Lo esencial'),
  T(
    'tut.calendario--esencial.resumen',
    'El calendario no es un cuarto: vive en el reloj de la casa y reúne todo lo que tiene fecha y hora, lo que creas a mano y lo que agendan solas las demás apps. Se mira de cuatro maneras: Día y Semana sobre la rejilla de horas, Mes y Año para el panorama. Aparte va Misiones, el botón rojo con la checklist de hoy de todas las apps juntas.',
  ),
  'cuerpoCalendarioEsencial',
)

export const FLUJOS_CALENDARIO: TutorialDef[] = [
  tutorialCalendario,
  tutorialMetas,
  tutorialEnlaces,
]

/** Los flujos del CUARTO Metas (su «?»): los dos tours que abren esa app. */
export const FLUJOS_METAS: TutorialDef[] = [tutorialMetas, tutorialEnlaces]
