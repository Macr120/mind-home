import type { Avatar } from '../../../src/core/state/disenoStore'
import type { ExpresionId } from '../../../src/core/house/apariencia'
import { ATUENDOS_PRESET } from '../../../src/core/house/atuendos'
import { ciclo, resolverPatron, type PatronResuelto } from '../../../src/rooms/ejercicio/anim/pose'
import { patronDe } from '../../../src/rooms/ejercicio/anim/resolver'

/**
 * Pep@, el narrador de las guías: el personaje por defecto de la app (piel
 * amarilla, rojo y morado del logo) vestido con el atuendo del cuarto que
 * explica la guía.
 */
export function pepCon(atuendo: string, cara?: ExpresionId): Avatar {
  return {
    expresion: cara,
    nombre: 'Pep@',
    cabeza: '#ffd23b',
    torso: '#f53b4b',
    piernas: '#b36bfb',
    escala: 1,
    ropa: ATUENDOS_PRESET.find((a) => a.id === atuendo)?.ropa ?? {},
  }
}

/** Atuendo del narrador según el tema de la guía. */
export const ATUENDO_GUIA: Record<string, string> = { ejercicio: 'deportista' }

/**
 * Gestos del narrador cuando no hace un ejercicio. Mismo DSL que los
 * patrones del visor (grados; `…D`/`…I` = derecha/izquierda REALES de Pep@).
 */
const GESTOS: Record<string, PatronResuelto> = {
  habla: resolverPatron(
    ciclo(3.2, [
      { t: 0, pose: { hombroD: [18, 12, 0], codoD: 55, hombroI: [12, 8, 0], codoI: 35 } },
      { t: 0.35, pose: { hombroD: [38, 18, 10], codoD: 85, hombroI: [16, 10, 0], codoI: 40, cuello: [4, 6, 0] } },
      { t: 0.7, pose: { hombroD: [24, 10, 0], codoD: 65, hombroI: [30, 16, 10], codoI: 75, cuello: [2, -5, 0] } },
    ], { camara: 'frente' }),
  ),
  saluda: resolverPatron(
    ciclo(1.1, [
      { t: 0, pose: { hombroD: [165, 25, 0], codoD: 35, cuello: [0, 6, 0] } },
      { t: 0.5, pose: { hombroD: [165, 5, 0], codoD: 55, cuello: [0, 6, 0] } },
    ], { camara: 'frente' }),
  ),
  // La sentadilla del circuito es con el propio peso: la del catálogo lleva barra.
  Sentadilla: resolverPatron(
    ciclo(2.4, [
      { t: 0, pose: { hombro: [10, 8, 0], codo: 10 } },
      { t: 0.5, pose: { hombro: [85, 8, 0], codo: 5, cadera: [95, 12, 0], rodilla: 100, tronco: 25 } },
    ], { camara: 'frente' }),
  ),
  // Gestos de los memes (poses quietas: se capturan como imagen).
  rechaza: resolverPatron(
    ciclo(4, [{ t: 0, pose: { hombroD: [95, -35, 0], codoD: 95, cuello: [5, -35, 0], tronco: [0, -12, 0] } }], { camara: 'frente' }),
  ),
  confundido: resolverPatron(
    ciclo(4, [{ t: 0, pose: { hombroD: [160, 40, 0], codoD: 135, cuello: [0, 0, -12], hombroI: [10, 10, 0] } }], { camara: 'frente' }),
  ),
  orgulloso: resolverPatron(
    ciclo(4, [{ t: 0, pose: { hombro: [30, 55, 0], codo: 150, tronco: [-6, 0, 0], cuello: [-8, 0, 0] } }], { camara: 'frente' }),
  ),
  cansado: resolverPatron(
    ciclo(4, [{ t: 0, pose: { tronco: [14, 0, 0], cuello: [2, 0, 6], hombro: [-4, 6, 0], rodilla: 10, cadera: [6, 4, 0] } }], { camara: 'frente' }),
  ),
  relajado: resolverPatron(ciclo(4, [{ t: 0, pose: { raiz: 'supino', hombro: [175, 25, 0], codo: 120, cadera: [0, 8, 0] } }], { camara: 'tresCuartos' })),
  // Pensando (miniaturas): mano derecha a la barbilla, el otro brazo cruzado debajo, mirada arriba.
  pensando: resolverPatron(
    ciclo(4, [{ t: 0, pose: { hombroI: [62, -66, 0], codoI: 100, hombroD: [15, -35, 0], codoD: 100, cuello: [-16, 18, 6], tronco: [0, 8, 0] } }], { camara: 'frente' }),
  ),
  // Señala hacia el contenido: a la derecha de la pantalla = su mano izquierda.
  senala: resolverPatron(
    ciclo(2.4, [
      { t: 0, pose: { hombroI: [80, 55, 0], codoI: 8, cuello: [0, 18, 0], tronco: [0, 8, 0] } },
      { t: 0.5, pose: { hombroI: [86, 58, 0], codoI: 4, cuello: [0, 20, 0], tronco: [0, 10, 0] } },
    ], { camara: 'frente' }),
  ),
}

export const ESCENA_REPOSO = 'habla'

export function patronEscena(escena: string): PatronResuelto {
  return GESTOS[escena] ?? patronDe(escena) ?? GESTOS[ESCENA_REPOSO]
}
