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

const flujoVehiculos = tour(
  'app-garage--vehiculos',
  T('tut.app-garage--vehiculos.titulo', 'Una bici y un coche viejo'),
  T(
    'tut.app-garage--vehiculos.resumen',
    'El garaje lleva el mantenimiento de tus vehículos reales: cada uno con su ficha, su kilometraje y su historial de servicios. Arriba, un semáforo te dice si algo urge.',
  ),
  'cuerpoVehiculos',
)

const flujoTramites = tour(
  'app-garage--tramites',
  T('tut.app-garage--tramites.titulo', 'Trámites que se agendan solos'),
  T(
    'tut.app-garage--tramites.resumen',
    'Programa la verificación, la tenencia, el seguro o el servicio periódico y el garaje pone su bloque en el calendario, más un aviso con la anticipación que le pidas.',
  ),
  'cuerpoTramites',
)

export const flujosGarage: TutorialDef[] = [flujoVehiculos, flujoTramites]
