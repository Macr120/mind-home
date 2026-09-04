import type { Pose } from './pose'

/**
 * Posturas estáticas (yoga, estiramientos, planchas): una sola `Pose` cada
 * una. `mapa.ts` decide si se sostienen (entrar, mantener, volver) o se quedan
 * fijas, y si se repiten al otro lado. Se autoran con el lado D (derecha real)
 * como el "activo"; el espejo lo pone `alterno`.
 */
export const POSTURAS = {
  plancha: { raiz: [78, 0], hombro: [80, 8, 0], codo: 90, cuello: -35, cadera: 3 },
  'plancha-lateral': { raiz: [0, 78], hombroD: [0, 80, 0], codoD: 90, hombroI: [0, 85, 0], cuello: [0, 0, -10] },
  'guerrero-i': { caderaD: [55, 15, 0], rodillaD: 85, caderaI: [-35, 15, 0], hombro: [175, 10, 0], cuello: -15 },
  'guerrero-ii': {
    caderaD: [65, 20, 0],
    rodillaD: 95,
    caderaI: [-30, 20, 0],
    tronco: [0, -80, 0],
    hombro: [0, 90, 0],
    cuello: [0, 80, 0],
  },
  triangulo: {
    caderaD: [35, 20, 0],
    caderaI: [-30, 20, 0],
    tronco: [0, -80, 50],
    hombro: [0, 90, 0],
    cuello: [0, 60, 20],
  },
  'flexion-de-pie': { tronco: 100, cuello: 10, hombro: [100, 10, 0], rodilla: 5 },
  paloma: { caderaD: [90, 45, 60], rodillaD: 110, caderaI: [-40, 5, 0], tronco: 20, hombro: [60, 10, 0] },
  mariposa: { cadera: [80, 60, 60], rodilla: 120, tronco: 10, hombro: [40, 20, 0], codo: 60 },
  'isquios-sentado': { cadera: 90, rodilla: 5, tronco: 50, hombro: [110, 10, 0], cuello: 10 },
  'zancada-baja': { caderaD: [70, 10, 0], rodillaD: 95, caderaI: [-30, 5, 0], rodillaI: 85, tronco: -10, hombro: [175, 10, 0] },
  guirnalda: { cadera: [110, 30, 10], rodilla: 135, tronco: 25, hombro: [40, 10, -40], codo: 120 },
  'figura-4': { raiz: 'supino', caderaD: [70, 45, 60], rodillaD: 95, caderaI: [70, 5, 0], rodillaI: 100, hombro: [50, 20, 0], codo: 90 },
  aductores: { cadera: [85, 55, 0], rodilla: 5, tronco: 40, hombro: [100, 10, 0] },
  'perro-boca-abajo': { raiz: [40, 0], tronco: 110, hombro: [170, 15, 0], cuello: -25 },
  nino: { raiz: [45, 0], cadera: 95, rodilla: 140, tronco: 50, hombro: [170, 15, 0], cuello: -10 },
  'apertura-pecho': { hombro: [-40, 10, 0], codo: 10, tronco: -15, cuello: -20 },
  esfinge: { raiz: 'prono', tronco: -35, hombro: [100, 20, 0], codo: 90, cuello: -30 },
  'hilo-aguja': { rodilla: 90, tronco: [60, 30, 0], hombroI: [120, 10, 0], hombroD: [60, -40, 0], codoD: 10, cuello: [0, 40, 30] },
  'dorsal-lateral': { hombroD: [175, 20, 0], hombroI: [0, 15, 0], tronco: [0, 0, -25] },
  cobra: { raiz: 'prono', tronco: -45, hombro: [70, 15, 0], codo: 30, cuello: -30 },
  'cuello-lateral': { cuello: [0, 0, 30] },
  'cuadriceps-de-pie': { caderaD: -15, rodillaD: 130, hombroD: [-40, 10, 0], codoD: 60, hombroI: [90, 0, 0] },
  'gemelos-pared': { hombro: [80, 15, 0], codo: 10, caderaD: -25, rodillaD: 0, caderaI: 25, rodillaI: 35, tronco: 15 },
  'hombro-cruzado': { hombroD: [90, -30, 0], codoD: 20, hombroI: [70, -10, 0], codoI: 110 },
  'triceps-sobre-cabeza': { hombroD: [175, 20, 0], codoD: 140, hombroI: [160, 25, 0], codoI: 120 },
  'piernas-pared': { raiz: 'supino', cadera: 90, rodilla: 0, hombro: [0, 40, 0] },
  savasana: { raiz: 'supino', cadera: [0, 10, 0], hombro: [0, 20, 0] },
  loto: { cadera: [80, 60, 50], rodilla: 130, hombro: [20, 20, 0], codo: 60, cuello: -5 },
  'mariposa-reclinada': { raiz: 'supino', cadera: [40, 60, 60], rodilla: 120, hombro: [0, 40, 0] },
  'isquios-de-pie': { caderaD: 30, rodillaD: 0, caderaI: 5, rodillaI: 25, tronco: 60, hombro: [60, 10, 0] },
  'wall-squat': { cadera: 90, rodilla: 90, hombro: [0, 10, 0] },
  'equilibrio-unipodal': { caderaD: 40, rodillaD: 80, hombro: [0, 80, 0] },
  'bird-dog': { rodillaD: 90, caderaI: -90, rodillaI: 0, tronco: 60, hombroD: [180, 10, 0], codoD: 0, hombroI: [120, 10, 0], cuello: -10 },
  'dorsal-pared': { hombro: [150, 15, 0], tronco: 70, cuello: -10 },
  'isometrico-cervical': { hombroD: [150, 25, 0], codoD: 140, cuello: -5 },
  'estiramiento-muneca': { hombroD: [90, 10, 0], codoD: 0, hombroI: [70, -20, 0], codoI: 90 },
  'torsion-sentada': { cadera: [80, 50, 40], rodilla: 120, tronco: [0, 45, 0], hombroD: [-30, 20, 0], hombroI: [30, -40, 0], codoI: 90, cuello: [0, 40, 0] },
  'trapecio': { cuello: [0, 0, 30], hombroD: [150, 20, 0], codoD: 135 },
} satisfies Record<string, Pose>

export type PosturaId = keyof typeof POSTURAS
