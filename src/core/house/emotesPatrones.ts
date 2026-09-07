import { ciclo, sostenido, type Patron, type Pose } from '../../rooms/ejercicio/anim/pose'
import type { EmoteId } from './emotes'

/**
 * Los emotes de la rueda como patrones del rig del gym (`RigEjercicio`), con
 * el mismo DSL en grados de `pose.ts`: `hombro`/`cadera` = [flexión,
 * abducción, rotación], `I` = izquierda real del avatar (+X), `tronco` =
 * [flexión, giro hacia +X, inclinación a la derecha]. No hay pelvis aparte: el
 * vaivén de cadera se finge con inclinación del tronco y rodillas. Solo los
 * carga el chunk perezoso de `AvatarEmoteMapa`.
 */
/** Gangnam Style: muñecas cruzadas al frente, brazo izquierdo fijo durante el lazo, y el rebote del «caballo». */
const CRUZ_GANGNAM: Pose = { hombro: [55, -20, 0], codo: 115 }
const LAZO_GANGNAM: Pose = { hombroI: [55, -20, 0], codoI: 115, codoD: 70 }
const CABALLO_ABAJO: Pose = { cadera: [20, 25, 0], rodilla: 60, tronco: [10, 0, 0] }
const CABALLO_ARRIBA: Pose = { cadera: [15, 25, 0], rodilla: 30, tronco: [8, 0, 0], salto: 0.04 }

export const PATRONES_EMOTE: Record<EmoteId, Patron> = {
  // «67»: palmas arriba al frente, una mano sube mientras la otra baja. Sin
  // `alterno`: el espejo de la segunda mitad rompería el balancín en el cambio.
  seisSiete: ciclo(0.8, [
    { t: 0, pose: { hombroI: [45, 20, 0], codoI: 100, hombroD: [15, 20, 0], codoD: 100, tronco: [4, 0, 3], cuello: [5, 0, 4] } },
    { t: 0.5, pose: { hombroI: [15, 20, 0], codoI: 100, hombroD: [45, 20, 0], codoD: 100, tronco: [4, 0, -3], cuello: [5, 0, -4] } },
  ]),
  // Caña atrás sobre el hombro, latigazo al frente y a enrollar el carrete con
  // la izquierda mientras la cadera va y viene; del último fotograma vuelve a lanzar.
  pescar: ciclo(
    2.8,
    [
      { t: 0, pose: { hombroD: [150, 25, 0], codoD: 95, hombroI: [25, -10, 0], codoI: 100, tronco: [-8, -10, 0], rodilla: 10 } },
      { t: 0.18, pose: { hombroD: [70, 10, 0], codoD: 25, hombroI: [25, -10, 0], codoI: 100, tronco: [12, 10, 0], rodilla: 20 } },
      { t: 0.32, pose: { hombroD: [45, 10, 0], codoD: 60, hombroI: [35, -25, 0], codoI: 110, tronco: [4, 0, 0], rodilla: 10 } },
      { t: 0.45, pose: { hombroD: [45, 10, 0], codoD: 60, hombroI: [30, -30, 0], codoI: 120, tronco: [0, 0, 7], rodillaI: 25, rodillaD: 10 } },
      { t: 0.6, pose: { hombroD: [45, 10, 0], codoD: 60, hombroI: [45, -20, 0], codoI: 100, rodilla: 15 } },
      { t: 0.75, pose: { hombroD: [45, 10, 0], codoD: 60, hombroI: [30, -10, 0], codoI: 85, tronco: [0, 0, -7], rodillaI: 10, rodillaD: 25 } },
      { t: 0.9, pose: { hombroD: [45, 10, 0], codoD: 60, hombroI: [20, -25, 0], codoI: 105, rodilla: 15 } },
    ],
    { utiles: ['cana'] },
  ),
  // Floss: brazos rectos a la altura de la cadera barriendo a un lado (uno cruza por
  // delante, el otro va por detrás) con el torso inclinado al contrario; al pasar por
  // el centro se intercambian. El espejo hace el otro lado.
  floss: ciclo(
    0.8,
    [
      { t: 0, pose: { hombroD: [20, -50, 0], hombroI: [-40, 30, 0], codo: 0, tronco: [0, 0, -8], cuello: [0, -6, 0], rodilla: 8 } },
      { t: 0.5, pose: { hombro: [5, 8, 0], codo: 0, rodilla: 16 } },
    ],
    { alterno: true },
  ),
  // Griddy: dos pasos de rodilla alta con los brazos bombeando en contra, y dos más con
  // las «gafas» (manos en los ojos, codos afuera). Sin `alterno`: la fase de gafas no se espeja.
  griddy: ciclo(1.6, [
    { t: 0, pose: { caderaD: [60, 20, 0], rodillaD: 90, caderaI: [-5, 5, 0], rodillaI: 10, hombroI: [50, 15, 0], codoI: 90, hombroD: [-30, 15, 0], codoD: 70, tronco: [8, 8, 0], salto: 0.03 } },
    { t: 0.25, pose: { caderaI: [60, 20, 0], rodillaI: 90, caderaD: [-5, 5, 0], rodillaD: 10, hombroD: [50, 15, 0], codoD: 90, hombroI: [-30, 15, 0], codoI: 70, tronco: [8, -8, 0], salto: 0.03 } },
    { t: 0.5, pose: { caderaD: [45, 25, 0], rodillaD: 80, caderaI: [-5, 5, 0], rodillaI: 10, hombro: [110, 45, 0], codo: 140, cuello: [5, 0, 0], tronco: [5, 5, 0], salto: 0.04 } },
    { t: 0.75, pose: { caderaI: [45, 25, 0], rodillaI: 80, caderaD: [-5, 5, 0], rodillaD: 10, hombro: [110, 45, 0], codo: 140, cuello: [5, 0, 0], tronco: [5, -5, 0], salto: 0.04 } },
  ]),
  // Dab: cara al codo derecho y el brazo izquierdo estirado en diagonal; se repite.
  dab: sostenido(
    { hombroD: [130, 35, 0], codoD: 135, hombroI: [140, -30, 0], codoI: 5, cuello: [25, -35, 20], tronco: [12, -15, -8], rodilla: 12 },
    { periodo: 2.2 },
  ),
  // Take the L: la «L» fija en la frente con la derecha, pateando con una y otra pierna.
  // Sin `alterno` para que la L no cambie de mano.
  takeTheL: ciclo(1.0, [
    { t: 0, pose: { hombroD: [160, 35, 0], codoD: 140, hombroI: [25, 40, 0], codoI: 10, caderaI: [25, 30, 0], rodillaI: 55, tronco: [0, 0, 6], salto: 0.03 } },
    { t: 0.25, pose: { hombroD: [160, 35, 0], codoD: 140, hombroI: [25, 40, 0], codoI: 10, rodilla: 5 } },
    { t: 0.5, pose: { hombroD: [160, 35, 0], codoD: 140, hombroI: [25, 40, 0], codoI: 10, caderaD: [25, 30, 0], rodillaD: 55, tronco: [0, 0, -6], salto: 0.03 } },
    { t: 0.75, pose: { hombroD: [160, 35, 0], codoD: 140, hombroI: [25, 40, 0], codoI: 10, rodilla: 5 } },
  ]),
  // Orange Justice: brazos en círculo con el cuerpo bombeando arriba y abajo.
  orangeJustice: ciclo(
    1.1,
    [
      { t: 0, pose: { hombroI: [110, 50, 0], codoI: 100, hombroD: [40, 40, 0], codoD: 110, rodilla: 40, tronco: [18, 10, 0], cuello: [-10, 0, 0] } },
      { t: 0.5, pose: { hombroI: [60, 40, 0], codoI: 110, hombroD: [90, 55, 0], codoD: 95, rodilla: 15, tronco: [8, -10, 0], salto: 0.02 } },
    ],
    { alterno: true },
  ),
  // Dance Moves: un brazo arriba y el otro abajo alternando, con balanceo de cadera y rodillas.
  danceMoves: ciclo(1.0, [
    { t: 0, pose: { hombroI: [120, 30, 0], codoI: 90, hombroD: [30, 20, 0], codoD: 90, tronco: [5, 10, -6], rodilla: 20, caderaD: [10, 5, 0] } },
    { t: 0.25, pose: { hombroI: [75, 25, 0], codoI: 90, hombroD: [75, 25, 0], codoD: 90, rodilla: 5, salto: 0.02 } },
    { t: 0.5, pose: { hombroD: [120, 30, 0], codoD: 90, hombroI: [30, 20, 0], codoI: 90, tronco: [5, -10, 6], rodilla: 20, caderaI: [10, 5, 0] } },
    { t: 0.75, pose: { hombroI: [75, 25, 0], codoI: 90, hombroD: [75, 25, 0], codoD: 90, rodilla: 5, salto: 0.02 } },
  ]),
  // Hype: brinco sobre una pierna con el brazo contrario disparando hacia arriba.
  hype: ciclo(
    0.8,
    [
      { t: 0, pose: { caderaD: [80, 10, 0], rodillaD: 90, hombroI: [170, 10, 0], codoI: 10, hombroD: [-20, 10, 0], codoD: 40, salto: 0.06, tronco: [5, 0, 0] } },
      { t: 0.5, pose: { caderaD: [30, 10, 0], rodillaD: 60, hombroI: [90, 10, 0], codoI: 60, hombroD: [-10, 10, 0], codoD: 40 } },
    ],
    { alterno: true },
  ),
  // Robot: poses rígidas que se sostienen y cambian de golpe (pares de fotogramas
  // iguales con transiciones de ~120 ms); sin respiración para que no «viva».
  robot: ciclo(
    2.4,
    [
      { t: 0, pose: { hombroD: [90, 0, 0], codoD: 90, hombroI: [30, 0, 0], codoI: 90, cuello: [0, 30, 0] } },
      { t: 0.2, pose: { hombroD: [90, 0, 0], codoD: 90, hombroI: [30, 0, 0], codoI: 90, cuello: [0, 30, 0] } },
      { t: 0.25, pose: { hombroD: [90, 60, 0], codoD: 90, hombroI: [90, 0, 0], codoI: 90, cuello: [0, -30, 0] } },
      { t: 0.45, pose: { hombroD: [90, 60, 0], codoD: 90, hombroI: [90, 0, 0], codoI: 90, cuello: [0, -30, 0] } },
      { t: 0.5, pose: { hombroD: [30, 0, 0], codoD: 90, hombroI: [90, 60, 0], codoI: 90, tronco: [0, 20, 0] } },
      { t: 0.7, pose: { hombroD: [30, 0, 0], codoD: 90, hombroI: [90, 60, 0], codoI: 90, tronco: [0, 20, 0] } },
      { t: 0.75, pose: { hombro: [0, 0, 0], codo: 90, cuello: [10, 0, 0], tronco: [0, -20, 0] } },
      { t: 0.95, pose: { hombro: [0, 0, 0], codo: 90, cuello: [10, 0, 0], tronco: [0, -20, 0] } },
    ],
    { respiracion: 0 },
  ),
  // Moonwalk: una pierna estirada con el pie plano se desliza hacia atrás mientras la
  // otra, doblada y de puntas, espera delante; luego se cambian. El desplazamiento real
  // hacia atrás lo pone `Character` mientras dura el emote.
  moonwalk: ciclo(
    1.2,
    [
      { t: 0, pose: { caderaD: [25, 3, 0], rodillaD: 5, caderaI: [15, 3, 0], rodillaI: 50, hombroI: [20, 8, 0], hombroD: [-15, 8, 0], codo: 25, tronco: [8, 0, 0], cuello: [-6, 0, 0] } },
      { t: 0.5, pose: { caderaD: [-20, 3, 0], rodillaD: 5, caderaI: [10, 3, 0], rodillaI: 60, hombroI: [-15, 8, 0], hombroD: [20, 8, 0], codo: 25, tronco: [8, 0, 0], cuello: [-6, 0, 0] } },
    ],
    { alterno: true },
  ),
  // Gangnam Style: el «caballo»: rebotes con las piernas abiertas, primero con las
  // muñecas cruzadas al frente y luego con el brazo derecho girando el lazo.
  gangnam: ciclo(2.4, [
    { t: 0, pose: { ...CRUZ_GANGNAM, ...CABALLO_ABAJO } },
    { t: 0.125, pose: { ...CRUZ_GANGNAM, ...CABALLO_ARRIBA } },
    { t: 0.25, pose: { ...CRUZ_GANGNAM, ...CABALLO_ABAJO } },
    { t: 0.375, pose: { ...CRUZ_GANGNAM, ...CABALLO_ARRIBA } },
    { t: 0.5, pose: { ...LAZO_GANGNAM, hombroD: [150, 10, 0], ...CABALLO_ABAJO } },
    { t: 0.625, pose: { ...LAZO_GANGNAM, hombroD: [175, 25, 0], ...CABALLO_ARRIBA } },
    { t: 0.75, pose: { ...LAZO_GANGNAM, hombroD: [160, 45, 0], ...CABALLO_ABAJO } },
    { t: 0.875, pose: { ...LAZO_GANGNAM, hombroD: [145, 30, 0], ...CABALLO_ARRIBA } },
  ]),
  // Electro Shuffle: el «running man» en el sitio: patada al frente con brinco, la
  // pierna vuelve doblada mientras la otra sale; brazos bombeando en contra.
  electroShuffle: ciclo(
    1.0,
    [
      { t: 0, pose: { caderaD: [40, 5, 0], rodillaD: 15, caderaI: [-10, 5, 0], rodillaI: 40, hombroI: [60, 10, 0], codoI: 90, hombroD: [-40, 10, 0], codoD: 90, tronco: [10, 0, 0], salto: 0.05 } },
      { t: 0.5, pose: { caderaD: [10, 5, 0], rodillaD: 60, caderaI: [-15, 5, 0], rodillaI: 10, hombroI: [0, 10, 0], codoI: 90, hombroD: [0, 10, 0], codoD: 90, tronco: [12, 0, 0] } },
    ],
    { alterno: true },
  ),
}
