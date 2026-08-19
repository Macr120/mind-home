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

const flujoDiario = tour(
  'app-ideas--diario',
  T('tut.app-ideas--diario.titulo', 'Capturar ideas'),
  T(
    'tut.app-ideas--diario.resumen',
    'El diario de ideas captura ocurrencias sueltas o lluvias por tema; las destacas con estrella y las conviertes en mapas.',
  ),
  'cuerpoDiario',
)

const flujoMapas = tour(
  'app-ideas--mapas',
  T('tut.app-ideas--mapas.titulo', 'Los mapas de Pep@'),
  T(
    'tut.app-ideas--mapas.resumen',
    'Los mapas ordenan un tema en un lienzo libre: mental, árbol, flujo, línea del tiempo, ciclo, pirámide, Venn y más.',
  ),
  'cuerpoMapas',
)

const flujoDecidir = tour(
  'app-ideas--decidir',
  T('tut.app-ideas--decidir.titulo', 'Decidir con diagramas'),
  T(
    'tut.app-ideas--decidir.resumen',
    'Los diagramas ayudan a decidir: ventajas y desventajas con peso, FODA, Eisenhower, matriz ponderada y más.',
  ),
  'cuerpoDecidir',
)

export const flujosIdeas: TutorialDef[] = [flujoDiario, flujoMapas, flujoDecidir]

/** Esencial: recorre los tres menús en la casa real, sin necesitar datos. */
export const esencialIdeas: TutorialDef = fichaEsencial(
  'ideas',
  T(
    'tut.app-ideas--esencial.resumen',
    'Ideas guarda lo que se te ocurre en tres menús: Diario (ocurrencias sueltas o lluvias por tema), Mapas conceptuales (un lienzo libre en varios formatos) y Diagramas de decisiones (los mismos formatos, pensados para comparar y decidir). Todo se puede archivar en carpetas y convertir de un menú a otro.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
