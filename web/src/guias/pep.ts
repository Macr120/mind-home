import type { Avatar } from '../../../src/core/state/disenoStore'
import type { ExpresionId } from '../../../src/core/house/apariencia'
import { ATUENDOS_PRESET, ATUENDO_POR_TEMA } from '../../../src/core/house/atuendos'
import type { Ropa } from '../../../src/core/house/apariencia'
import type { TemaId } from '../../../src/core/house/temas'
import { ciclo, resolverPatron, type PatronResuelto } from '../../../src/rooms/ejercicio/anim/pose'
import { patronDe } from '../../../src/rooms/ejercicio/anim/resolver'

/**
 * Pep@, el narrador de las guías: el personaje por defecto de la app (piel
 * amarilla, rojo y morado del logo) vestido con el atuendo del cuarto que
 * explica la guía.
 */
export function pepCon(atuendo: string, cara?: ExpresionId, ropa?: Ropa): Avatar {
  return {
    expresion: cara,
    nombre: 'Pep@',
    cabeza: '#ffd23b',
    torso: '#f53b4b',
    piernas: '#b36bfb',
    escala: 1,
    ropa: ropa ?? ATUENDOS_PRESET.find((a) => a.id === atuendo)?.ropa ?? {},
  }
}

/** Atuendo del narrador según el tema de la guía. */
export const ATUENDO_GUIA: Record<string, string> = { ejercicio: 'deportista', cocina: 'chef', descanso: 'pijama', finanzas: 'oficinista', metas: 'explorador' }

/**
 * Guías en las que el tiempo avanza con las partes (Arte): la casa del video cambia de
 * tema parte a parte (escena.mjs) y Pep@ lleva en la página el atuendo de ese tema.
 */
export const EPOCAS_GUIA: Record<string, TemaId[]> = { arte: ['medieval', 'pirata', 'vaquero', 'tren', 'cyberpunk', 'nave'] }

/** La ropa de la época de la parte `parte` (antes de empezar, la primera; en el cierre, la última). */
export function ropaDeEpoca(tema: string, parte: number): Ropa | undefined {
  const epocas = EPOCAS_GUIA[tema]
  return epocas && ATUENDO_POR_TEMA[epocas[Math.min(Math.max(parte, 0), epocas.length - 1)]]
}

/** Las guías que no narra Pep@: Idiomas, Música y Video las cuenta el mago (el asistente de fábrica de la app); Metas y Mindfulness, la princesa (un cuerpo prediseñado de la app). */
export const NARRADOR_GUIA: Record<string, 'mago' | 'princesa' | 'alien'> = { idiomas: 'mago', musica: 'mago', video: 'mago', metas: 'princesa', mindfulness: 'princesa', agenda: 'princesa', aprender: 'princesa', matematicas: 'alien', escritura: 'mago' }

/** Color del vestido de la princesa por guía (Mindfulness de verde, como en la casa: `CUERPO_COLORES` de su escena.mjs). */
export const VESTIDO_GUIA: Record<string, string> = { mindfulness: '#34d399', agenda: '#facc15', aprender: '#60a5fa' }

/** Color de la túnica del mago por guía (Música de verde, Video de rojo y Escritura de amarillo, como en la casa: `FORMA_COLOR` de su escena.mjs). */
export const TUNICA_GUIA: Record<string, string> = { musica: '#2f8f4e', video: '#b91c1c', escritura: '#eab308' }

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
  // Cocina: remueve una olla (la izquierda la sujeta, la derecha da vueltas a la cuchara).
  remueve: resolverPatron(
    ciclo(1.3, [
      { t: 0, pose: { hombroD: [40, 15, 0], codoD: 75, hombroI: [32, -8, 0], codoI: 85, tronco: [8, 0, 0], cuello: [14, 0, 0] } },
      { t: 0.25, pose: { hombroD: [50, 26, 0], codoD: 64, hombroI: [32, -8, 0], codoI: 85, tronco: [8, 0, 0], cuello: [14, 0, 0] } },
      { t: 0.5, pose: { hombroD: [42, 36, 0], codoD: 74, hombroI: [32, -8, 0], codoI: 85, tronco: [8, 0, 0], cuello: [14, 0, 0] } },
      { t: 0.75, pose: { hombroD: [32, 26, 0], codoD: 86, hombroI: [32, -8, 0], codoI: 85, tronco: [8, 0, 0], cuello: [14, 0, 0] } },
    ], { camara: 'frente' }),
  ),
  // Cocina: pica sobre la tabla (el antebrazo derecho sube y baja; la izquierda sujeta).
  pica: resolverPatron(
    ciclo(0.55, [
      { t: 0, pose: { hombroD: [38, 12, 0], codoD: 55, hombroI: [30, -18, 0], codoI: 92, tronco: [12, 0, 0], cuello: [20, 0, 0] } },
      { t: 0.5, pose: { hombroD: [30, 12, 0], codoD: 96, hombroI: [30, -18, 0], codoI: 92, tronco: [12, 0, 0], cuello: [20, 0, 0] } },
    ], { camara: 'frente' }),
  ),
  // Cocina: un trago de agua y baja el vaso.
  bebe: resolverPatron(
    ciclo(3.6, [
      { t: 0, pose: { hombroD: [22, 10, 0], codoD: 95 } },
      { t: 0.25, pose: { hombroD: [62, 12, 0], codoD: 140, cuello: [-16, 0, 0] } },
      { t: 0.6, pose: { hombroD: [62, 12, 0], codoD: 140, cuello: [-16, 0, 0] } },
      { t: 0.85, pose: { hombroD: [22, 10, 0], codoD: 95 } },
    ], { camara: 'frente', utiles: ['agua'] }),
  ),
  // Descanso: un bostezo (la mano a la boca, el otro brazo se estira hacia arriba).
  bosteza: resolverPatron(
    ciclo(3.6, [
      { t: 0, pose: { hombroD: [18, 12, 0], codoD: 55, hombroI: [12, 8, 0], codoI: 35 } },
      { t: 0.3, pose: { hombroD: [62, 12, 0], codoD: 140, hombroI: [160, 12, 0], codoI: 25, cuello: [-14, 0, 0], tronco: [-4, 0, 0] } },
      { t: 0.6, pose: { hombroD: [62, 12, 0], codoD: 140, hombroI: [165, 8, 0], codoI: 15, cuello: [-16, 0, 0], tronco: [-5, 0, 0] } },
      { t: 0.85, pose: { hombroD: [18, 12, 0], codoD: 55, hombroI: [12, 8, 0], codoI: 35 } },
    ], { camara: 'frente' }),
  ),
  // Descanso: se estira con los dos brazos arriba (al despertar, antes de dormir).
  estira: resolverPatron(
    ciclo(3.4, [
      { t: 0, pose: { hombro: [15, 10, 0], codo: 30 } },
      { t: 0.35, pose: { hombro: [168, 14, 0], codo: 10, tronco: [-7, 0, 0], cuello: [-10, 0, 0] } },
      { t: 0.65, pose: { hombro: [172, 18, 0], codo: 6, tronco: [-8, 0, 0], cuello: [-12, 0, 0] } },
      { t: 0.9, pose: { hombro: [15, 10, 0], codo: 30 } },
    ], { camara: 'frente' }),
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
