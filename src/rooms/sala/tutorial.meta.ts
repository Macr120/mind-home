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

const flujoMapa = tour(
  'app-sala--mapa',
  T('tut.app-sala--mapa.titulo', 'El mapa de un viajero'),
  T(
    'tut.app-sala--mapa.resumen',
    'Cada lugar es un pin en el mapamundi: verde si ya fuiste, ámbar si es un sueño pendiente. Arriba, cuántos países, ciudades y pendientes llevas.',
  ),
  'cuerpoMapa',
)

const flujoJapon = tour(
  'app-sala--japon',
  T('tut.app-sala--japon.titulo', 'Tres semanas en Japón'),
  T(
    'tut.app-sala--japon.resumen',
    'La bitácora guarda los recuerdos por país y por lugar, con sus fotos; y cada viaje conserva su hoja de plan día a día, con hospedaje, transporte y presupuesto.',
  ),
  'cuerpoJapon',
)

const flujoProximo = tour(
  'app-sala--proximo',
  T('tut.app-sala--proximo.titulo', 'El viaje que viene'),
  T(
    'tut.app-sala--proximo.resumen',
    'Los lugares por conocer tienen su propia hoja de plan día a día, y la suma de sus presupuestos se convierte en una meta de ahorro en el despacho.',
  ),
  'cuerpoProximo',
)

export const flujosSala: TutorialDef[] = [flujoMapa, flujoJapon, flujoProximo]
