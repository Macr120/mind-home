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

const flujoAnio = tour(
  'app-despacho--anio',
  T('tut.app-despacho--anio.titulo', 'El año en que Pep@ ordenó su dinero'),
  T(
    'tut.app-despacho--anio.resumen',
    'El Flujo resume lo que entró, lo que salió y el neto del periodo que elijas: día, semana, mes o año. Debajo, tu patrimonio, el presupuesto mensual, en qué se te va el dinero y la tendencia de los últimos periodos.',
  ),
  'cuerpoAnio',
)

const flujoCaptura = tour(
  'app-despacho--captura',
  T('tut.app-despacho--captura.titulo', 'Fijos y variables'),
  T(
    'tut.app-despacho--captura.resumen',
    'Un gasto fijo se captura UNA vez y la app lo cuenta sola cada mes; lo variable se apunta cuando pasa. Los dos viven en la misma lista, ordenada por fecha en carpetas de año y mes.',
  ),
  'cuerpoCaptura',
)

const flujoMetas = tour(
  'app-despacho--metas',
  T('tut.app-despacho--metas.titulo', 'Japón, la emergencia y la deuda'),
  T(
    'tut.app-despacho--metas.resumen',
    'Metas junta tus objetivos de ahorro e inversión en una lista con su barra, y deja las deudas aparte con su propio simulador. Cada una tiene un cronograma donde ponerles fecha.',
  ),
  'cuerpoMetas',
)

const flujoCalculadoras = tour(
  'app-despacho--calculadoras',
  T('tut.app-despacho--calculadoras.titulo', 'Cuatro reglas para poner una cifra'),
  T(
    'tut.app-despacho--calculadoras.resumen',
    'Cuatro calculadoras de finanzas personales proponen un monto objetivo a partir de tu balance real, y lo convierten en meta con un toque. Los parámetros de cada regla se pueden ajustar: nadie tiene que aceptar el 50/30/20 tal cual.',
  ),
  'cuerpoCalculadoras',
)

const flujoPatrimonio = tour(
  'app-despacho--patrimonio',
  T('tut.app-despacho--patrimonio.titulo', 'Lo que tienes, lo que debes y a dónde va'),
  T(
    'tut.app-despacho--patrimonio.resumen',
    'Patrimonio no es una foto: cada cosa que tienes sube o baja de precio, y cada deuda cobra intereses. Ponles su tasa y la tercera pestaña te enseña la película entera, del año pasado a donde acabes.',
  ),
  'cuerpoPatrimonio',
)

export const flujosDespacho: TutorialDef[] = [
  flujoAnio,
  flujoCaptura,
  flujoPatrimonio,
  flujoMetas,
  flujoCalculadoras,
]

/** Esencial: recorre los cuatro menús en la casa real, sin necesitar datos. */
export const esencialDespacho: TutorialDef = fichaEsencial(
  'despacho',
  T(
    'tut.app-despacho--esencial.resumen',
    'El despacho ordena tu dinero en cuatro menús. Patrimonio guarda lo que tienes y lo que debes, con su proyección; Flujo lleva gastos, ingresos y el balance del periodo, con presupuesto y categorías; Metas junta ahorro, inversión y deuda, más las calculadoras que proponen un monto. Mercados es un tablero de cotizaciones en vivo, solo de consulta.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
