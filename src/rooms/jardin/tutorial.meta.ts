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

const flujoPracticar = tour(
  'app-jardin--practicar',
  T('tut.app-jardin--practicar.titulo', 'Meditar y respirar'),
  T(
    'tut.app-jardin--practicar.resumen',
    'El jardín guarda tus sesiones de meditación (con pistas de sonido) y respiración guiada. Sin rachas ni puntos: la calma solo crece.',
  ),
  'cuerpoPracticar',
)

const flujoGratitud = tour(
  'app-jardin--gratitud',
  T('tut.app-jardin--gratitud.titulo', 'Tres cosas buenas'),
  T(
    'tut.app-jardin--gratitud.resumen',
    'El ritual de gratitud: tres cosas buenas del día, guardadas en carpetas para releerlas después.',
  ),
  'cuerpoGratitud',
)

export const flujosJardin: TutorialDef[] = [flujoPracticar, flujoGratitud]

/** Esencial: recorre los tres menús en la casa real, sin necesitar datos. */
export const esencialJardin: TutorialDef = fichaEsencial(
  'jardin',
  T(
    'tut.app-jardin--esencial.resumen',
    'El jardín reúne meditación (con pistas de sonido), respiración guiada y agradecimientos diarios, en tres menús. No lleva puntos ni rachas a propósito: aquí no se castiga faltar, solo se practica.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
