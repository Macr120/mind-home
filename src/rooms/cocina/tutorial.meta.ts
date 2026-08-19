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

const flujoAlimentacion = tour(
  'app-cocina--alimentacion',
  T('tut.app-cocina--alimentacion.titulo', 'Comer con un objetivo'),
  T(
    'tut.app-cocina--alimentacion.resumen',
    'El control de alimentación son cuatro pasos: pones tus objetivos, registras lo que comes y bebes, planeas tu semana, y el progreso te dice si vas por donde querías.',
  ),
  'cuerpoAlimentacion',
)

const flujoRecetario = tour(
  'app-cocina--recetario',
  T('tut.app-cocina--recetario.titulo', 'Cocinar, planear y comprar'),
  T(
    'tut.app-cocina--recetario.resumen',
    'El recetario guarda tus recetas con sus macros, las agrupa en dietas y convierte lo que vas a cocinar en la lista del súper.',
  ),
  'cuerpoRecetario',
)

const flujoCronograma = tour(
  'app-cocina--cronograma',
  T('tut.app-cocina--cronograma.titulo', 'El plan de alimentación en el calendario'),
  T(
    'tut.app-cocina--cronograma.resumen',
    'Las metas de peso y dieta de Pep@ tienen su propio eje del tiempo: sub-metas con fecha y un plan que la IA arma en fases.',
  ),
  'cuerpoCronograma',
)

export const flujosCocina: TutorialDef[] = [flujoAlimentacion, flujoRecetario, flujoCronograma]

/** Esencial: recorre los menús de los dos enfoques en la casa real, sin necesitar datos. */
export const esencialCocina: TutorialDef = fichaEsencial(
  'cocina',
  T(
    'tut.app-cocina--esencial.resumen',
    'La cocina tiene dos menús. Recetario guarda lo que vas a cocinar: las recetas con sus macros, las dietas que las agrupan y la lista del súper. Control de alimentación lleva la cuenta de lo que comes, en cuatro pasos: las metas de calorías y peso, el registro del día, el plan de comidas de los días que vienen y el progreso.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
