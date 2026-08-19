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

const flujoFormulario = tour(
  'app-computo--formulario',
  T('tut.app-computo--formulario.titulo', 'El formulario'),
  T(
    'tut.app-computo--formulario.resumen',
    'El formulario es tu libro de fórmulas. Trae Matemáticas, Física y Química ya puestas, pero no son un catálogo aparte: son fórmulas tuyas, y las editas, las mueves o las borras como las que escribas.',
  ),
  'cuerpoFormulario',
)

const flujoCalculadora = tour(
  'app-computo--calculadora',
  T('tut.app-computo--calculadora.titulo', 'Calcular y graficar'),
  T(
    'tut.app-computo--calculadora.resumen',
    'Una calculadora científica con historial, ocho modos para lo que no es una cuenta suelta —entre ellos la gráfica, con sus cuatro tipos— y un resolvedor de ecuaciones que da las raíces exactas cuando puede.',
  ),
  'cuerpoCalculadora',
)

const flujoHojas = tour(
  'app-computo--hojas',
  T('tut.app-computo--hojas.titulo', 'Hojas de cálculo'),
  T(
    'tut.app-computo--hojas.resumen',
    'Hojas con referencias A1 y fórmulas en español (=SUMA(B2:B15)). Se exportan a Excel conservando las fórmulas, o a PDF por impresión.',
  ),
  'cuerpoHojas',
)

export const flujosComputo: TutorialDef[] = [flujoFormulario, flujoCalculadora, flujoHojas]

/** Esencial: recorre las dos pestañas en la casa real, sin necesitar datos. */
export const esencialComputo: TutorialDef = fichaEsencial(
  'computo',
  T(
    'tut.app-computo--esencial.resumen',
    'La sala de cómputo tiene dos menús. La Calculadora hace las cuentas de siempre y cambia de modo para graficar, trabajar con bases numéricas, matrices, sistemas de ecuaciones, unidades, propina y regla de tres; de ella cuelga el formulario, tu libro de fórmulas con Matemáticas, Física y Química ya puestas. Las Hojas de cálculo llevan lo tabular, con fórmulas en español y exportación a Excel o PDF.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
