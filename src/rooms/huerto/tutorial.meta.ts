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

const flujoCiclo = tour(
  'infra-huerto--ciclo',
  T('tut.infra-huerto--ciclo.titulo', 'El ciclo del huerto'),
  T(
    'tut.infra-huerto--ciclo.resumen',
    'Un paseo por el huerto vivo del santuario: las etapas de cada cultivo, el riego, la cosecha y la cesta con un año de trabajo.',
  ),
  // Sin `preparar`: el editor se abre en el paso 2, para que la panorámica del
  // paso 1 se vea con el mapa limpio (su barra ocupa todo el bajo de pantalla).,
  'cuerpoCiclo',
)

const flujoParcelas = tour(
  'infra-huerto--parcelas',
  T('tut.infra-huerto--parcelas.titulo', 'Sembrar de cero'),
  T(
    'tut.infra-huerto--parcelas.resumen',
    'Cómo se prepara la tierra, se elige la especie y se deshace un error — probándolo de verdad en el santuario.',
  ),
  'cuerpoParcelas',
)

export const flujosHuerto: TutorialDef[] = [flujoCiclo, flujoParcelas]
