import { ALTO_ASIENTO, ALTO_BANCO, ALTO_BARRA_FIJA, ALTO_PARALELAS, ciclo, type Patron, type Pose } from './pose'

/**
 * Patrones cíclicos de movimiento (fuerza, cardio y los estiramientos con
 * vaivén). Cada ejercicio del catálogo apunta a uno en `mapa.ts`, con la
 * variante que lo distingue (útiles, mezcla de grados, lado…). Ángulos en
 * grados: ver la convención en `pose.ts`. Los unilaterales se autoran con el
 * lado D (derecha real) y se turnan con `alterno`.
 */

/** A cuatro patas: rodillas en el suelo, torso algo levantado (los brazos del box-man son largos). */
const CUATRO_PATAS: Pose = { rodilla: 90, tronco: 60, hombro: [120, 10, 0], cuello: -10 }
/** Plancha alta (arriba de una flexión): manos bajo los hombros, cuerpo recto. */
const PLANCHA_ALTA: Pose = { raiz: [68, 0], hombro: [107, 12, 0], cuello: -25 }
/** Sentado en una silla/máquina. */
const SENTADO: Pose = { cadera: 90, rodilla: 90 }
/** Apoyos habituales. */
const EN_BANCO = { marcador: 'espalda', y: ALTO_BANCO } as const
const EN_ASIENTO = { marcador: 'gluteos', y: ALTO_ASIENTO } as const

export const PATRONES = {
  // ───────────── Fuerza ─────────────
  sentadilla: ciclo(
    2.4,
    [
      { t: 0, pose: { hombro: [0, 75, 150], codo: 120, cadera: [0, 8, 0] } },
      { t: 0.5, pose: { hombro: [0, 75, 150], codo: 120, cadera: [95, 12, 0], rodilla: 100, tronco: 25 } },
    ],
    { utiles: ['barra'] },
  ),
  'sentadilla-profunda': ciclo(
    4,
    [
      { t: 0, pose: { cadera: [0, 15, 0], hombro: [40, 10, -30], codo: 100 } },
      { t: 0.5, pose: { cadera: [110, 40, 20], rodilla: 130, tronco: 30, hombro: [60, 20, -40], codo: 110 } },
    ],
  ),
  'press-horizontal': ciclo(
    2.2,
    [
      { t: 0, pose: { raiz: 'supino', hombro: [90, 20, 0], cadera: -35, rodilla: 55 } },
      { t: 0.5, pose: { raiz: 'supino', hombro: [15, 75, 0], codo: 95, cadera: -35, rodilla: 55 } },
    ],
    { utiles: ['barra', 'banco'], apoyo: EN_BANCO, camara: 'lado' },
  ),
  apertura: ciclo(
    2.6,
    [
      { t: 0, pose: { raiz: 'supino', hombro: [90, 10, 0], codo: 15, cadera: -35, rodilla: 55 } },
      { t: 0.5, pose: { raiz: 'supino', hombro: [10, 90, 0], codo: 20, cadera: -35, rodilla: 55 } },
    ],
    { utiles: ['mancuernas', 'banco'], apoyo: EN_BANCO, camara: 'frente' },
  ),
  cruce: ciclo(
    2.4,
    [
      { t: 0, pose: { tronco: 15, hombro: [20, 90, 0], codo: 20, cadera: 10, rodilla: 15 } },
      { t: 0.5, pose: { tronco: 15, hombro: [80, -15, 0], codo: 20, cadera: 10, rodilla: 15 } },
    ],
    { utiles: ['polea'] },
  ),
  fondo: ciclo(
    2.2,
    [
      { t: 0, pose: { hombro: [0, 12, 0], codo: 0, cadera: -5, rodilla: 70 } },
      { t: 0.5, pose: { hombro: [-70, 15, 0], codo: 70, cadera: -5, rodilla: 70, tronco: 15 } },
    ],
    { utiles: ['paralelas'], apoyo: { marcador: 'manos', y: ALTO_PARALELAS } },
  ),
  'fondo-banco': ciclo(
    2.2,
    [
      { t: 0, pose: { hombro: [-40, 10, 0], codo: 0, cadera: 70, rodilla: 20 } },
      { t: 0.5, pose: { hombro: [-60, 15, 0], codo: 95, cadera: 70, rodilla: 20 } },
    ],
    { utiles: ['bancoAtras'], apoyo: { marcador: 'manos', y: ALTO_BANCO }, camara: 'lado' },
  ),
  flexion: ciclo(
    2.0,
    [
      { t: 0, pose: PLANCHA_ALTA },
      { t: 0.5, pose: { raiz: [76, 0], hombro: [0, 75, 0], codo: 95, cuello: -25 } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  'press-vertical': ciclo(
    2.2,
    [
      { t: 0, pose: { hombro: [0, 90, 90], codo: 95 } },
      { t: 0.5, pose: { hombro: [0, 172, 90], codo: 5 } },
    ],
    { utiles: ['barra'] },
  ),
  'extension-triceps': ciclo(
    2.0,
    [
      { t: 0, pose: { hombro: [15, 10, 0], codo: 110 } },
      { t: 0.5, pose: { hombro: [15, 10, 0], codo: 10 } },
    ],
    { utiles: ['polea'] },
  ),
  dominada: ciclo(
    2.6,
    [
      { t: 0, pose: { hombro: [0, 170, 90], codo: 5, cadera: 10, rodilla: 30 } },
      { t: 0.5, pose: { hombro: [0, 105, 90], codo: 135, cadera: 10, rodilla: 30 } },
    ],
    { utiles: ['barraFija'], apoyo: { marcador: 'manos', y: ALTO_BARRA_FIJA }, camara: 'frente' },
  ),
  jalon: ciclo(
    2.2,
    [
      { t: 0, pose: { ...SENTADO, hombro: [0, 165, 90], codo: 5 } },
      { t: 0.5, pose: { ...SENTADO, hombro: [0, 95, 90], codo: 130, tronco: -8 } },
    ],
    { utiles: ['asiento', 'polea'], apoyo: EN_ASIENTO, camara: 'frente' },
  ),
  remo: ciclo(
    2.2,
    [
      { t: 0, pose: { tronco: 50, cadera: 15, rodilla: 25, hombro: [50, 10, 0], codo: 10 } },
      { t: 0.5, pose: { tronco: 50, cadera: 15, rodilla: 25, hombro: [-10, 20, 0], codo: 100 } },
    ],
    { utiles: ['barra'], camara: 'lado' },
  ),
  'remo-unilateral': ciclo(
    2.2,
    [
      { t: 0, pose: { tronco: 55, cadera: 15, rodilla: 25, hombroI: [55, 10, 0], codoI: 5, hombroD: [55, 10, 0], codoD: 10 } },
      { t: 0.5, pose: { tronco: 55, cadera: 15, rodilla: 25, hombroI: [55, 10, 0], codoI: 5, hombroD: [-10, 20, 0], codoD: 105 } },
    ],
    { utiles: ['mancuernas'], camara: 'lado' },
  ),
  'remo-sentado': ciclo(
    2.2,
    [
      { t: 0, pose: { cadera: 80, rodilla: 25, tronco: 10, hombro: [80, 10, 0], codo: 5 } },
      { t: 0.5, pose: { cadera: 80, rodilla: 25, tronco: -5, hombro: [-10, 15, 0], codo: 110 } },
    ],
    { utiles: ['poleaBaja'], camara: 'lado' },
  ),
  'face-pull': ciclo(
    2.0,
    [
      { t: 0, pose: { hombro: [90, 15, 0], codo: 10 } },
      { t: 0.5, pose: { hombro: [40, 80, 60], codo: 110 } },
    ],
    { utiles: ['polea'] },
  ),
  pullover: ciclo(
    2.6,
    [
      { t: 0, pose: { raiz: 'supino', hombro: [90, 10, 0], codo: 20, cadera: -35, rodilla: 55 } },
      { t: 0.5, pose: { raiz: 'supino', hombro: [175, 10, 0], codo: 20, cadera: -35, rodilla: 55 } },
    ],
    { utiles: ['banco', 'mancuernas'], apoyo: EN_BANCO, camara: 'lado' },
  ),
  hiperextension: ciclo(
    2.6,
    [
      { t: 0, pose: { raiz: 'prono', tronco: 55, hombro: [120, 30, 0], codo: 110, cuello: -10 } },
      { t: 0.5, pose: { raiz: 'prono', tronco: -12, hombro: [120, 30, 0], codo: 110, cuello: -20 } },
    ],
    { utiles: ['banco'], apoyo: { marcador: 'gluteos', y: ALTO_BANCO }, camara: 'lado' },
  ),
  'lumbar-prono': ciclo(
    5,
    [
      { t: 0, pose: { raiz: 'prono', hombro: [90, 20, 0], codo: 100, cuello: 10 } },
      { t: 0.5, pose: { raiz: 'prono', tronco: -30, hombro: [70, 20, 0], codo: 40, cuello: -25 } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  'elevacion-lateral': ciclo(
    2.0,
    [
      { t: 0, pose: { hombro: [0, 8, 0], codo: 10 } },
      { t: 0.5, pose: { hombro: [0, 90, 0], codo: 15 } },
    ],
    { utiles: ['mancuernas'], camara: 'frente' },
  ),
  'elevacion-frontal': ciclo(
    2.0,
    [
      { t: 0, pose: { hombro: [5, 8, 0], codo: 10 } },
      { t: 0.5, pose: { hombro: [95, 8, 0], codo: 10 } },
    ],
    { utiles: ['mancuernas'], camara: 'lado' },
  ),
  encogimiento: ciclo(
    1.6,
    [
      { t: 0, pose: { hombro: [0, 6, 0], hombrosY: 0 } },
      { t: 0.5, pose: { hombro: [0, 6, 0], hombrosY: 0.07 } },
    ],
    { utiles: ['mancuernas'], camara: 'frente' },
  ),
  'circulos-hombros': ciclo(
    2.4,
    [
      { t: 0, pose: { hombro: [-10, 6, 0], hombrosY: 0 } },
      { t: 0.25, pose: { hombro: [0, 6, 0], hombrosY: 0.07 } },
      { t: 0.5, pose: { hombro: [12, 6, 0], hombrosY: 0.03 } },
      { t: 0.75, pose: { hombro: [0, 6, 0], hombrosY: -0.01 } },
    ],
    { camara: 'lado' },
  ),
  curl: ciclo(
    2.0,
    [
      { t: 0, pose: { hombro: [0, 6, 0], codo: 10 } },
      { t: 0.5, pose: { hombro: [12, 6, 0], codo: 135 } },
    ],
    { utiles: ['mancuernas'], camara: 'lado' },
  ),
  'rotacion-externa': ciclo(
    2.2,
    [
      { t: 0, pose: { hombro: [0, 5, -30], codo: 90 } },
      { t: 0.5, pose: { hombro: [0, 5, 50], codo: 90 } },
    ],
    { utiles: ['banda'], camara: 'frente' },
  ),
  'retraccion-escapular': ciclo(
    2.2,
    [
      { t: 0, pose: { hombro: [30, 15, 0], codo: 20, tronco: 4 } },
      { t: 0.5, pose: { hombro: [10, 30, 0], codo: 35, tronco: -8 } },
    ],
    { camara: 'lado' },
  ),
  dislocaciones: ciclo(
    4,
    [
      { t: 0, pose: { hombro: [20, 25, 0] } },
      { t: 0.3, pose: { hombro: [175, 25, 0] } },
      { t: 0.5, pose: { hombro: [300, 25, 0] } },
      { t: 0.7, pose: { hombro: [175, 25, 0] } },
    ],
    { utiles: ['barra'], camara: 'lado' },
  ),
  'angeles-pared': ciclo(
    2.6,
    [
      { t: 0, pose: { hombro: [0, 90, 90], codo: 90 } },
      { t: 0.5, pose: { hombro: [0, 165, 90], codo: 10 } },
    ],
    { utiles: ['pared'], camara: 'frente' },
  ),
  zancada: ciclo(
    2.2,
    [
      { t: 0, pose: { hombro: [-10, 25, 0], codo: 110 } },
      { t: 0.5, pose: { hombro: [-10, 25, 0], codo: 110, caderaD: 60, rodillaD: 90, caderaI: -25, rodillaI: 70, tronco: 5 } },
    ],
    { alterno: true, camara: 'lado' },
  ),
  'sentadilla-bulgara': ciclo(
    2.4,
    [
      { t: 0, pose: { caderaD: 10, rodillaD: 10, caderaI: -30, rodillaI: 95, hombro: [-10, 25, 0], codo: 110 } },
      { t: 0.5, pose: { caderaD: 70, rodillaD: 95, caderaI: -30, rodillaI: 95, tronco: 15, hombro: [-10, 25, 0], codo: 110 } },
    ],
    { utiles: ['caja'], camara: 'lado' },
  ),
  'sentadilla-arquero': ciclo(
    3,
    [
      { t: 0, pose: { cadera: [0, 35, 0], hombro: [60, 10, 0], codo: 20 } },
      { t: 0.5, pose: { caderaD: [80, 45, 0], rodillaD: 110, caderaI: [0, 70, 0], rodillaI: 0, tronco: 20, hombro: [60, 10, 0], codo: 20 } },
    ],
    { alterno: true, camara: 'frente' },
  ),
  prensa: ciclo(
    2.2,
    [
      { t: 0, pose: { raiz: [-50, 0], cadera: 100, rodilla: 100, hombro: [-20, 10, 0], codo: 40 } },
      { t: 0.5, pose: { raiz: [-50, 0], cadera: 60, rodilla: 15, hombro: [-20, 10, 0], codo: 40 } },
    ],
    { utiles: ['asiento'], apoyo: EN_ASIENTO, camara: 'lado' },
  ),
  'peso-muerto': ciclo(
    2.6,
    [
      { t: 0, pose: { hombro: [0, 8, 0], codo: 0 } },
      { t: 0.5, pose: { tronco: 55, cadera: 30, rodilla: 50, hombro: [55, 8, 0], codo: 0 } },
    ],
    { utiles: ['barra'], camara: 'lado' },
  ),
  'peso-muerto-rumano': ciclo(
    2.6,
    [
      { t: 0, pose: { hombro: [0, 8, 0], codo: 0 } },
      { t: 0.5, pose: { tronco: 75, cadera: 15, rodilla: 15, hombro: [75, 8, 0], codo: 0 } },
    ],
    { utiles: ['barra'], camara: 'lado' },
  ),
  'curl-femoral': ciclo(
    2.0,
    [
      { t: 0, pose: { raiz: 'prono', rodilla: 10, hombro: [70, 15, 0], codo: 20, cuello: -15 } },
      { t: 0.5, pose: { raiz: 'prono', rodilla: 115, hombro: [70, 15, 0], codo: 20, cuello: -15 } },
    ],
    { utiles: ['banco'], apoyo: { marcador: 'pecho', y: ALTO_BANCO }, camara: 'lado' },
  ),
  'deslizar-talon': ciclo(
    2.4,
    [
      { t: 0, pose: { raiz: 'supino', hombro: [0, 20, 0] } },
      { t: 0.5, pose: { raiz: 'supino', hombro: [0, 20, 0], caderaD: 55, rodillaD: 100 } },
    ],
    { alterno: true, utiles: ['tapete'], camara: 'lado' },
  ),
  'extension-cuadriceps': ciclo(
    2.0,
    [
      { t: 0, pose: { ...SENTADO, hombro: [-15, 10, 0], codo: 15 } },
      { t: 0.5, pose: { cadera: 90, rodilla: 5, hombro: [-15, 10, 0], codo: 15 } },
    ],
    { utiles: ['asiento'], apoyo: EN_ASIENTO, camara: 'lado' },
  ),
  'elevacion-talones': ciclo(
    1.6,
    [
      { t: 0, pose: { hombro: [0, 8, 0], salto: 0 } },
      { t: 0.5, pose: { hombro: [0, 8, 0], salto: 0.07 } },
    ],
    { camara: 'lado' },
  ),
  puente: ciclo(
    2.6,
    [
      { t: 0, pose: { raiz: 'supino', cadera: 45, rodilla: 90, hombro: [0, 25, 0] } },
      { t: 0.5, pose: { raiz: [-115, 0], cuello: 25, cadera: -70, rodilla: 45, hombro: [0, 25, 0] } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  'hip-thrust': ciclo(
    2.4,
    [
      { t: 0, pose: { raiz: [-100, 0], cuello: 15, cadera: 45, rodilla: 90, hombro: [-30, 20, 0] } },
      { t: 0.5, pose: { raiz: [-125, 0], cuello: 35, cadera: -75, rodilla: 40, hombro: [-30, 20, 0] } },
    ],
    { utiles: ['bancoAtras', 'barra'], apoyo: { marcador: 'hombros', y: ALTO_BANCO }, camara: 'lado' },
  ),
  'patada-gluteo': ciclo(
    2.0,
    [
      { t: 0, pose: { tronco: 15, hombro: [40, 10, 0], codo: 60, caderaD: 0 } },
      { t: 0.5, pose: { tronco: 20, hombro: [40, 10, 0], codo: 60, caderaD: -45, rodillaD: 10 } },
    ],
    { alterno: true, camara: 'lado' },
  ),
  'balanceo-pierna': ciclo(
    1.6,
    [
      { t: 0, pose: { hombroI: [80, 0, 0], caderaD: 45, rodillaD: 10 } },
      { t: 0.5, pose: { hombroI: [80, 0, 0], caderaD: -35, rodillaD: 15 } },
    ],
    { alterno: true, utiles: ['paredFrente'], camara: 'lado' },
  ),
  'abduccion-cadera': ciclo(
    2.0,
    [
      { t: 0, pose: { hombro: [-10, 25, 0], codo: 110, caderaD: [0, 5, 0] } },
      { t: 0.5, pose: { hombro: [-10, 25, 0], codo: 110, caderaD: [0, 45, 0] } },
    ],
    { alterno: true, camara: 'frente' },
  ),
  crunch: ciclo(
    2.0,
    [
      { t: 0, pose: { raiz: 'supino', cadera: 60, rodilla: 100, hombro: [150, 40, 0], codo: 130 } },
      { t: 0.5, pose: { raiz: 'supino', cadera: 60, rodilla: 100, hombro: [150, 40, 0], codo: 130, tronco: 35, cuello: 20 } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  'elevacion-piernas': ciclo(
    2.4,
    [
      { t: 0, pose: { raiz: 'supino', cadera: 10, rodilla: 5, hombro: [-10, 20, 0] } },
      { t: 0.5, pose: { raiz: 'supino', cadera: 85, rodilla: 5, hombro: [-10, 20, 0] } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  'torsion-rusa': ciclo(
    2.0,
    [
      { t: 0, pose: { raiz: [-40, 0], cadera: 70, rodilla: 60, hombro: [80, 10, 0], codo: 40, tronco: [0, -35, 0] } },
      { t: 0.5, pose: { raiz: [-40, 0], cadera: 70, rodilla: 60, hombro: [80, 10, 0], codo: 40, tronco: [0, 35, 0] } },
    ],
    { utiles: ['tapete'] },
  ),
  'rotacion-columna': ciclo(
    3,
    [
      { t: 0, pose: { hombro: [0, 90, 0], tronco: [0, -45, 0], cuello: [0, -20, 0] } },
      { t: 0.5, pose: { hombro: [0, 90, 0], tronco: [0, 45, 0], cuello: [0, 20, 0] } },
    ],
  ),
  'rueda-abdominal': ciclo(
    2.6,
    [
      { t: 0, pose: { raiz: [25, 0], rodilla: 115, hombro: [35, 10, 0], codo: 5, cuello: -20 } },
      { t: 0.5, pose: { raiz: [75, 0], rodilla: 115, hombro: [150, 10, 0], codo: 5, cuello: -30 } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  escalador: ciclo(
    0.8,
    [
      { t: 0, pose: { ...PLANCHA_ALTA, caderaI: 0, rodillaI: 0 } },
      { t: 0.5, pose: { ...PLANCHA_ALTA, caderaD: 90, rodillaD: 110 } },
    ],
    { alterno: true, utiles: ['tapete'], camara: 'lado' },
  ),
  burpee: ciclo(
    2.8,
    [
      { t: 0, pose: {} },
      { t: 0.18, pose: { cadera: 100, rodilla: 120, tronco: 40, hombro: [60, 10, 0] } },
      { t: 0.36, pose: PLANCHA_ALTA },
      { t: 0.52, pose: { raiz: [76, 0], hombro: [0, 75, 0], codo: 95, cuello: -25 } },
      { t: 0.7, pose: { cadera: 100, rodilla: 120, tronco: 40, hombro: [60, 10, 0] } },
      { t: 0.88, pose: { salto: 0.25, hombro: [170, 10, 0] } },
    ],
    { utiles: ['tapete'] },
  ),
  'jumping-jack': ciclo(
    0.9,
    [
      { t: 0, pose: { hombro: [0, 10, 0] } },
      { t: 0.5, pose: { hombro: [0, 165, 0], cadera: [0, 30, 0], salto: 0.05 } },
    ],
    { camara: 'frente' },
  ),
  // ───────────── Cardio ─────────────
  caminar: ciclo(
    1.1,
    [
      { t: 0, pose: { caderaI: 25, caderaD: -18, rodillaI: 5, rodillaD: 15, hombroI: -18, hombroD: 18, codo: 15, tronco: 3 } },
      { t: 0.5, pose: { caderaI: 5, caderaD: 12, rodillaI: 5, rodillaD: 45, hombro: 0, codo: 15, tronco: 3 } },
    ],
    { alterno: true },
  ),
  correr: ciclo(
    0.75,
    [
      { t: 0, pose: { caderaI: 45, caderaD: -25, rodillaI: 30, rodillaD: 40, hombroI: -35, hombroD: 40, codo: 90, tronco: 8 } },
      { t: 0.5, pose: { caderaI: 10, caderaD: 20, rodillaI: 10, rodillaD: 100, hombro: 0, codo: 90, tronco: 8, salto: 0.05 } },
    ],
    { alterno: true },
  ),
  bici: ciclo(
    1.2,
    [
      { t: 0, pose: { tronco: 35, hombro: [60, 15, 0], codo: 30, caderaD: 80, rodillaD: 100, caderaI: 40, rodillaI: 40 } },
      { t: 0.25, pose: { tronco: 35, hombro: [60, 15, 0], codo: 30, caderaD: 70, rodillaD: 60, caderaI: 55, rodillaI: 80 } },
      { t: 0.5, pose: { tronco: 35, hombro: [60, 15, 0], codo: 30, caderaD: 40, rodillaD: 40, caderaI: 80, rodillaI: 100 } },
      { t: 0.75, pose: { tronco: 35, hombro: [60, 15, 0], codo: 30, caderaD: 55, rodillaD: 80, caderaI: 70, rodillaI: 60 } },
    ],
    { utiles: ['bici'], apoyo: { marcador: 'gluteos', y: 0.93 }, camara: 'lado' },
  ),
  'remo-maquina': ciclo(
    1.8,
    [
      { t: 0, pose: { cadera: 100, rodilla: 110, tronco: 15, hombro: [70, 10, 0], codo: 10 } },
      { t: 0.5, pose: { cadera: 60, rodilla: 20, tronco: -10, hombro: [-20, 15, 0], codo: 110 } },
    ],
    { utiles: ['poleaBaja'], camara: 'lado' },
  ),
  cuerda: ciclo(
    0.55,
    [
      { t: 0, pose: { hombro: [0, 35, 20], codo: 90, salto: 0 } },
      { t: 0.5, pose: { hombro: [0, 35, 20], codo: 90, salto: 0.14 } },
    ],
    { utiles: ['cuerda'] },
  ),
  nadar: ciclo(
    1.6,
    [
      { t: 0, pose: { raiz: 'prono', hombroD: [170, 10, 0], hombroI: [-30, 15, 0], codoI: 60, rodillaD: 20, rodillaI: 5, cuello: -30 } },
      { t: 0.5, pose: { raiz: 'prono', hombroD: [60, 20, 0], codoD: 30, hombroI: [100, 30, 0], codoI: 30, rodillaD: 5, rodillaI: 20, cuello: -30 } },
    ],
    { alterno: true, utiles: ['agua'], apoyo: { marcador: 'pecho', y: 0.55 }, camara: 'lado' },
  ),
  patear: ciclo(
    1.4,
    [
      { t: 0, pose: { caderaD: -30, rodillaD: 60, hombroI: [40, 20, 0], hombroD: [-20, 20, 0], tronco: 10 } },
      { t: 0.4, pose: { caderaD: 60, rodillaD: 10, hombroI: [-20, 20, 0], hombroD: [40, 20, 0], tronco: -5 } },
      { t: 0.7, pose: { caderaD: 20, rodillaD: 30, hombro: [10, 20, 0] } },
    ],
    { utiles: ['balon'], camara: 'lado' },
  ),
  basquet: ciclo(
    1.2,
    [
      { t: 0, pose: { hombro: [100, 15, 0], codo: 90, cadera: 30, rodilla: 40, tronco: 10 } },
      { t: 0.5, pose: { hombro: [160, 10, 0], codo: 10, salto: 0.12 } },
    ],
    { utiles: ['balonManos'] },
  ),
  raqueta: ciclo(
    1.2,
    [
      { t: 0, pose: { tronco: [10, -40, 0], hombroD: [-30, 40, 0], codoD: 60, hombroI: [40, 10, 0], cadera: 20, rodilla: 30 } },
      { t: 0.5, pose: { tronco: [10, 40, 0], hombroD: [80, 20, 0], codoD: 20, hombroI: [-10, 10, 0], cadera: 20, rodilla: 30 } },
    ],
  ),
  boxeo: ciclo(
    0.7,
    [
      { t: 0, pose: { hombro: [60, 20, 0], codo: 130, tronco: [10, -10, 0], rodilla: 20, cadera: 15 } },
      { t: 0.5, pose: { hombroD: [95, 10, 0], codoD: 10, hombroI: [60, 20, 0], codoI: 130, tronco: [10, 20, 0], rodilla: 20, cadera: 15 } },
    ],
    { alterno: true },
  ),
  baile: ciclo(
    1.2,
    [
      { t: 0, pose: { hombroD: [120, 40, 0], codoD: 80, hombroI: [-20, 30, 0], caderaD: 15, rodillaD: 30, tronco: [0, 0, 8], salto: 0.03 } },
      { t: 0.5, pose: { hombroD: [20, 60, 0], codoD: 60, hombroI: [100, 40, 0], codoI: 70, tronco: [0, 0, -8] } },
    ],
    { alterno: true },
  ),
  // ───────────── Flexibilidad con vaivén ─────────────
  'saludo-sol': ciclo(
    10,
    [
      { t: 0, pose: { hombro: [30, 0, -40], codo: 120 } },
      { t: 0.14, pose: { hombro: [175, 10, 0], tronco: -10, cuello: -20 } },
      { t: 0.28, pose: { tronco: 85, hombro: [80, 10, 0], cuello: 10 } },
      { t: 0.42, pose: PLANCHA_ALTA },
      { t: 0.56, pose: { raiz: 'prono', tronco: -40, hombro: [60, 20, 0], codo: 60, cuello: -30 } },
      { t: 0.72, pose: { raiz: [40, 0], tronco: 110, hombro: [170, 15, 0], cuello: -25 } },
      { t: 0.86, pose: { tronco: 85, hombro: [80, 10, 0], cuello: 10 } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  'estiramiento-general': ciclo(
    8,
    [
      { t: 0, pose: { hombro: [175, 15, 0], tronco: -5 } },
      { t: 0.25, pose: { hombroD: [175, 20, 0], hombroI: [0, 15, 0], tronco: [0, 0, -25] } },
      { t: 0.5, pose: { tronco: 70, hombro: [70, 10, 0], cuello: 10 } },
      { t: 0.75, pose: { hombro: [0, 90, 0], tronco: [0, 40, 0], cuello: [0, 30, 0] } },
    ],
  ),
  'gato-vaca': ciclo(
    4,
    [
      { t: 0, pose: { ...CUATRO_PATAS, tronco: 75, cuello: 25 } },
      { t: 0.5, pose: { ...CUATRO_PATAS, tronco: 50, cuello: -35 } },
    ],
    { utiles: ['tapete'], camara: 'lado' },
  ),
  rana: ciclo(
    5,
    [
      { t: 0, pose: { rodilla: 100, cadera: [30, 50, 0], tronco: 70, hombro: [110, 20, 0], codo: 90, cuello: -20 } },
      { t: 0.5, pose: { rodilla: 100, cadera: [60, 55, 0], tronco: 80, hombro: [110, 20, 0], codo: 90, cuello: -20 } },
    ],
    { utiles: ['tapete'] },
  ),
  'rotacion-toracica': ciclo(
    5,
    [
      { t: 0, pose: { ...CUATRO_PATAS, hombroD: [110, 40, 0], codoD: 130, tronco: [60, -30, 0], cuello: [-10, -30, 0] } },
      { t: 0.5, pose: { ...CUATRO_PATAS, hombroD: [110, 40, 0], codoD: 130, tronco: [60, 35, 0], cuello: [-10, 40, 0] } },
    ],
    { alterno: true, utiles: ['tapete'] },
  ),
  'roll-down': ciclo(
    6,
    [
      { t: 0, pose: { cuello: 40 } },
      { t: 0.3, pose: { tronco: 45, cuello: 40, hombro: [45, 10, 0] } },
      { t: 0.5, pose: { tronco: 85, cuello: 30, hombro: [85, 10, 0] } },
      { t: 0.7, pose: { tronco: 45, cuello: 40, hombro: [45, 10, 0] } },
    ],
    { camara: 'lado' },
  ),
  'cuello-circulos': ciclo(
    5,
    [
      { t: 0, pose: { cuello: [30, 0, 0] } },
      { t: 0.25, pose: { cuello: [0, 0, 30] } },
      { t: 0.5, pose: { cuello: [-25, 0, 0] } },
      { t: 0.75, pose: { cuello: [0, 0, -30] } },
    ],
    { camara: 'frente' },
  ),
  'cuello-rotacion': ciclo(
    4,
    [
      { t: 0, pose: { cuello: [0, 0, 0] } },
      { t: 0.5, pose: { cuello: [10, 50, 0] } },
    ],
    { alterno: true, camara: 'frente' },
  ),
  'chin-tuck': ciclo(
    3,
    [
      { t: 0, pose: { cuello: [8, 0, 0] } },
      { t: 0.5, pose: { cuello: [-12, 0, 0] } },
    ],
    { camara: 'lado' },
  ),
  munecas: ciclo(
    1.5,
    [
      { t: 0, pose: { hombro: [0, 10, -30], codo: 90 } },
      { t: 0.5, pose: { hombro: [0, 10, 40], codo: 90 } },
    ],
    { camara: 'frente' },
  ),
  'pie-sentado': ciclo(
    3,
    [
      { t: 0, pose: { ...SENTADO, caderaD: [80, 10, 0], rodillaD: 70, tronco: 15, hombro: [20, 10, 0], codo: 60 } },
      { t: 0.5, pose: { ...SENTADO, caderaD: [80, 10, 0], rodillaD: 95, tronco: 15, hombro: [20, 10, 0], codo: 60 } },
    ],
    { utiles: ['asiento'], apoyo: EN_ASIENTO, camara: 'lado' },
  ),
  'circulos-tobillo': ciclo(
    3,
    [
      { t: 0, pose: { ...SENTADO, caderaD: [95, 5, 0], rodillaD: 20, hombro: [0, 10, 0] } },
      { t: 0.5, pose: { ...SENTADO, caderaD: [95, 5, 25], rodillaD: 30, hombro: [0, 10, 0] } },
    ],
    { alterno: true, utiles: ['asiento'], apoyo: EN_ASIENTO, camara: 'lado' },
  ),
  'movilidad-90-90': ciclo(
    6,
    [
      { t: 0, pose: { caderaD: [70, 50, 40], rodillaD: 90, caderaI: [20, 50, -50], rodillaI: 90, tronco: 15, hombro: [20, 20, 0] } },
      { t: 0.5, pose: { caderaD: [70, 50, 40], rodillaD: 90, caderaI: [20, 50, -50], rodillaI: 90, tronco: 40, hombro: [40, 20, 0] } },
    ],
    { alterno: true, utiles: ['tapete'] },
  ),
  'foam-roller': ciclo(
    3,
    [
      { t: 0, pose: { raiz: 'supino', cadera: 50, rodilla: 100, hombro: [150, 40, 0], codo: 120 } },
      { t: 0.5, pose: { raiz: [-80, 0], cadera: 60, rodilla: 105, hombro: [150, 40, 0], codo: 120 } },
    ],
    { utiles: ['rodillo', 'tapete'], apoyo: { marcador: 'espalda', y: 0.15 }, camara: 'lado' },
  ),
  'torsion-reclinada': ciclo(
    8,
    [
      { t: 0, pose: { raiz: 'supino', cadera: 70, rodilla: 100, hombro: [0, 90, 0] } },
      { t: 0.5, pose: { raiz: 'supino', caderaI: [70, 35, 0], caderaD: [70, -35, 0], rodilla: 100, hombro: [0, 90, 0], tronco: [0, -20, 0], cuello: [0, 30, 0] } },
    ],
    { alterno: true, utiles: ['tapete'], camara: 'frente' },
  ),
} satisfies Record<string, Patron>

export type PatronId = keyof typeof PATRONES
