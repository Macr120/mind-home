import type { Apoyo, Camara, Pose, UtilId, Variante } from './pose'
import type { PatronId } from './patrones'
import type { PosturaId } from './posturas'
import { slugTexto } from '../slug'

/**
 * Qué animación le toca a cada ejercicio de fábrica, por su slug (el mismo de
 * las ilustraciones y de las claves i18n). Es solo texto: se importa al
 * arrancar para saber si un ejercicio tiene animación (`tienePatron`) sin
 * arrastrar three ni los patrones, que viven en el chunk perezoso del visor.
 * Un ejercicio propio del usuario no está aquí y muestra su foto.
 */
export type EntradaMapa =
  | { patron: PatronId; variante?: Variante }
  | {
      postura: PosturaId
      /** `sostenido` (entra, mantiene, vuelve; por defecto) o `estatico` (fija). */
      modo?: 'sostenido' | 'estatico'
      alterno?: boolean
      periodo?: number
      utiles?: UtilId[]
      apoyo?: Apoyo
      camara?: Camara
      respiracion?: number
      /** Canales que sustituyen a los de la postura (mismo cuerpo, otro detalle). */
      pose?: Pose
    }

const TAPETE: UtilId[] = ['tapete']

export const MAPA: Record<string, EntradaMapa> = {
  // ───────────── Fuerza ─────────────
  'press-banca': { patron: 'press-horizontal' },
  'press-inclinado': { patron: 'press-horizontal', variante: { mezcla: { raiz: [-60, 0] } } },
  'press-con-mancuernas': { patron: 'press-horizontal', variante: { utiles: ['mancuernas', 'banco'] } },
  'aperturas-con-mancuernas': { patron: 'apertura' },
  'cruce-en-polea': { patron: 'cruce' },
  'fondos-en-paralelas': { patron: 'fondo' },
  flexiones: { patron: 'flexion' },
  dominadas: { patron: 'dominada' },
  'jalon-al-pecho': { patron: 'jalon' },
  'remo-con-barra': { patron: 'remo' },
  'remo-con-mancuerna': { patron: 'remo-unilateral' },
  'remo-en-polea-baja': { patron: 'remo-sentado' },
  'pull-over': { patron: 'pullover' },
  'face-pull': { patron: 'face-pull' },
  hiperextensiones: { patron: 'hiperextension' },
  'press-militar': { patron: 'press-vertical' },
  'press-arnold': {
    patron: 'press-vertical',
    variante: { mezcla: { cadera: 90, rodilla: 90, hombro: [0, 0, -60] }, utiles: ['asiento', 'mancuernas'], apoyo: { marcador: 'gluteos', y: 0.45 } },
  },
  'elevaciones-laterales': { patron: 'elevacion-lateral' },
  'elevaciones-frontales': { patron: 'elevacion-frontal' },
  pajaros: { patron: 'elevacion-lateral', variante: { mezcla: { tronco: 80, hombro: 70, cadera: 15, rodilla: 25 }, camara: 'lado' } },
  encogimientos: { patron: 'encogimiento' },
  'curl-con-barra': { patron: 'curl', variante: { utiles: ['barra'], camara: 'tresCuartos' } },
  'curl-con-mancuernas': { patron: 'curl', variante: { alterno: true, unilateral: true, camara: 'tresCuartos' } },
  'curl-martillo': { patron: 'curl', variante: { mezcla: { hombro: [0, 0, 90] } } },
  'curl-predicador': {
    patron: 'curl',
    variante: { mezcla: { cadera: 90, rodilla: 90, hombro: 45 }, utiles: ['asiento', 'mancuernas'], apoyo: { marcador: 'gluteos', y: 0.45 } },
  },
  'curl-concentrado': {
    patron: 'curl',
    variante: { unilateral: true, mezcla: { cadera: [90, 25, 0], rodilla: 90, tronco: 30 }, utiles: ['asiento', 'mancuernas'], apoyo: { marcador: 'gluteos', y: 0.45 } },
  },
  'extension-triceps-en-polea': { patron: 'extension-triceps' },
  'press-frances': {
    patron: 'extension-triceps',
    variante: { mezcla: { raiz: 'supino', hombro: 75, cadera: -35, rodilla: 55 }, utiles: ['banco', 'barra'], apoyo: { marcador: 'espalda', y: 0.45 }, camara: 'lado' },
  },
  'fondos-entre-bancos': { patron: 'fondo-banco' },
  'extension-sobre-cabeza': { patron: 'extension-triceps', variante: { mezcla: { hombro: 155 }, utiles: ['mancuernas'], camara: 'lado' } },
  'patada-de-triceps': { patron: 'extension-triceps', variante: { mezcla: { tronco: 70, hombro: -55, cadera: 15, rodilla: 25 }, utiles: ['mancuernas'], camara: 'lado' } },
  sentadilla: { patron: 'sentadilla' },
  'sentadilla-frontal': { patron: 'sentadilla', variante: { mezcla: { hombro: [90, -60, -140], codo: 20 } } },
  'sentadilla-bulgara': { patron: 'sentadilla-bulgara' },
  'prensa-de-pierna': { patron: 'prensa' },
  zancadas: { patron: 'zancada' },
  'peso-muerto': { patron: 'peso-muerto' },
  'peso-muerto-rumano': { patron: 'peso-muerto-rumano' },
  'curl-femoral': { patron: 'curl-femoral' },
  'extension-de-cuadriceps': { patron: 'extension-cuadriceps' },
  'elevacion-de-talones': { patron: 'elevacion-talones' },
  'hip-thrust': { patron: 'hip-thrust' },
  'puente-de-gluteo': { patron: 'puente' },
  'patada-de-gluteo-en-polea': { patron: 'patada-gluteo', variante: { utiles: ['poleaBaja'] } },
  'abduccion-de-cadera': { patron: 'abduccion-cadera' },
  plancha: { postura: 'plancha', modo: 'estatico', utiles: TAPETE, camara: 'lado' },
  'plancha-lateral': { postura: 'plancha-lateral', modo: 'estatico', alterno: true, periodo: 8, utiles: TAPETE, camara: 'frente' },
  'crunch-abdominal': { patron: 'crunch' },
  'elevacion-de-piernas': { patron: 'elevacion-piernas' },
  'russian-twist': { patron: 'torsion-rusa' },
  'rueda-abdominal': { patron: 'rueda-abdominal' },
  escaladores: { patron: 'escalador' },

  // ───────────── Flexibilidad ─────────────
  'movilidad-matutina': { patron: 'saludo-sol', variante: { periodo: 12 } },
  'yoga-flow': { patron: 'saludo-sol', variante: { periodo: 14 } },
  'saludo-al-sol': { patron: 'saludo-sol' },
  'estiramiento-general': { patron: 'estiramiento-general' },
  'guerrero-i': { postura: 'guerrero-i', alterno: true },
  'guerrero-ii': { postura: 'guerrero-ii', alterno: true },
  triangulo: { postura: 'triangulo', alterno: true },
  'flexion-de-pie': { postura: 'flexion-de-pie', camara: 'lado' },
  'apertura-de-cadera': { patron: 'sentadilla-profunda', variante: { periodo: 5 } },
  'postura-de-la-paloma': { postura: 'paloma', alterno: true, utiles: TAPETE },
  mariposa: { postura: 'mariposa', modo: 'estatico', utiles: TAPETE },
  'estiramiento-de-isquiotibiales': { postura: 'isquios-sentado', utiles: TAPETE, camara: 'lado' },
  'zancada-baja': { postura: 'zancada-baja', alterno: true, utiles: TAPETE, camara: 'lado' },
  'postura-de-la-guirnalda': { postura: 'guirnalda', modo: 'estatico' },
  'figura-4': { postura: 'figura-4', alterno: true, utiles: TAPETE },
  'estiramiento-de-aductores': { postura: 'aductores', utiles: TAPETE },
  rana: { patron: 'rana' },
  'perro-boca-abajo': { postura: 'perro-boca-abajo', modo: 'estatico', utiles: TAPETE, camara: 'lado' },
  'torsion-espinal': { postura: 'torsion-sentada', alterno: true, utiles: TAPETE },
  'postura-del-nino': { postura: 'nino', modo: 'estatico', utiles: TAPETE, camara: 'lado' },
  'apertura-de-pecho': { postura: 'apertura-pecho', camara: 'lado' },
  esfinge: { postura: 'esfinge', modo: 'estatico', utiles: TAPETE, camara: 'lado' },
  'hilo-y-aguja': { postura: 'hilo-aguja', alterno: true, utiles: TAPETE },
  'estiramiento-de-dorsales': { postura: 'dorsal-lateral', alterno: true, camara: 'frente' },
  'movilidad-cervical': { patron: 'cuello-circulos' },
  'rotaciones-de-columna': { patron: 'rotacion-columna' },
  'postura-de-la-cobra': { postura: 'cobra', modo: 'estatico', utiles: TAPETE, camara: 'lado' },
  'inclinacion-lateral-de-cuello': { postura: 'cuello-lateral', alterno: true, camara: 'frente' },
  'estiramiento-de-cuadriceps': { postura: 'cuadriceps-de-pie', alterno: true, camara: 'lado' },
  'estiramiento-de-gemelos': { postura: 'gemelos-pared', alterno: true, utiles: ['paredFrente'], camara: 'lado' },
  'estiramiento-de-hombros': { postura: 'hombro-cruzado', alterno: true, camara: 'frente' },
  'foam-roller': { patron: 'foam-roller' },
  'estiramiento-de-triceps': { postura: 'triceps-sobre-cabeza', alterno: true, camara: 'frente' },
  'estiramiento-de-flexores-de-cadera': { postura: 'zancada-baja', alterno: true, utiles: TAPETE, camara: 'lado' },
  'piernas-en-la-pared': { postura: 'piernas-pared', modo: 'estatico', utiles: ['paredPies', 'tapete'], camara: 'lado' },
  savasana: { postura: 'savasana', modo: 'estatico', respiracion: 1.5, utiles: TAPETE },
  'postura-del-nino-apoyada': { postura: 'nino', modo: 'estatico', utiles: ['tapete', 'caja'], camara: 'lado', pose: { hombro: [150, 15, 0], tronco: 35 } },
  'respiracion-profunda': { postura: 'loto', modo: 'estatico', respiracion: 3, utiles: TAPETE },
  'mariposa-reclinada': { postura: 'mariposa-reclinada', modo: 'estatico', utiles: TAPETE },
  'torsion-reclinada': { patron: 'torsion-reclinada' },
  'liberacion-miofascial-con-pelota': { patron: 'pie-sentado', variante: { utiles: ['asiento', 'pelota'] } },
  'circulos-de-tobillo': { patron: 'circulos-tobillo' },
  'recogida-de-toalla-con-dedos': { patron: 'pie-sentado' },
  'estiramiento-de-dorsiflexion': { postura: 'gemelos-pared', alterno: true, utiles: ['paredFrente'], camara: 'lado', pose: { rodillaD: 40, caderaD: -15 } },
  'elevacion-de-talones-unipodal': { patron: 'elevacion-talones', variante: { alterno: true, mezcla: { caderaI: 20, rodillaI: 60 } } },
  'flexion-y-extension-en-descarga': { patron: 'deslizar-talon' },
  'estiramiento-dinamico-de-isquiotibiales': { postura: 'isquios-de-pie', alterno: true, camara: 'lado' },
  'sentadilla-isometrica-wall-squat': { postura: 'wall-squat', modo: 'estatico', utiles: ['pared'], camara: 'lado' },
  'equilibrio-unipodal-single-leg-balance': { postura: 'equilibrio-unipodal', alterno: true, camara: 'frente' },
  'sentadillas-del-arquero': { patron: 'sentadilla-arquero' },
  'estocadas-lunges': { patron: 'zancada' },
  'movilidad-90-90': { patron: 'movilidad-90-90' },
  'el-puente-glute-bridge': { patron: 'puente' },
  'estiramiento-de-flexores-en-estocada': { postura: 'zancada-baja', alterno: true, utiles: TAPETE, camara: 'lado', pose: { hombro: [-20, 20, 0], tronco: -15 } },
  'abduccion-lateral-de-cadera': { patron: 'abduccion-cadera', variante: { mezcla: { raiz: 'ladoI', hombro: [0, -25, 0], codo: -110 }, lado: 'I', utiles: TAPETE, camara: 'frente' } },
  'sentadilla-profunda-con-apertura': { patron: 'sentadilla-profunda', variante: { periodo: 3 } },
  'balanceo-dinamico-de-piernas': { patron: 'balanceo-pierna' },
  'postura-gato-vaca': { patron: 'gato-vaca' },
  'torsiones-lumbares-suaves': { patron: 'torsion-reclinada', variante: { periodo: 4 } },
  'pointer-bird-dog': { postura: 'bird-dog', alterno: true, utiles: TAPETE },
  'plancha-frontal-isometricos': { postura: 'plancha', modo: 'estatico', utiles: TAPETE, camara: 'lado' },
  'roll-down-curl-jefferson': { patron: 'roll-down' },
  'estiramiento-lumbar-boca-abajo': { patron: 'lumbar-prono' },
  'rotacion-toracica': { patron: 'rotacion-toracica' },
  'retraccion-escapular': { patron: 'retraccion-escapular' },
  'angeles-de-pared-wall-angels': { patron: 'angeles-pared' },
  'lunge-con-apertura-de-pectoral': { patron: 'zancada', variante: { mezcla: { hombro: [40, 65, 60], codo: 30 }, camara: 'tresCuartos' } },
  'estiramiento-dorsal-en-pared': { postura: 'dorsal-pared', utiles: ['paredFrente'], camara: 'lado' },
  'el-gato-y-la-mesa': { patron: 'gato-vaca' },
  'circulos-de-hombros': { patron: 'circulos-hombros' },
  'estiramiento-de-pecho-pectoral': { postura: 'apertura-pecho', camara: 'lado' },
  'dislocaciones-con-goma-o-palo': { patron: 'dislocaciones' },
  'rotacion-externa-con-banda': { patron: 'rotacion-externa' },
  'thread-the-needle-enhebrar-aguja': { postura: 'hilo-aguja', alterno: true, utiles: TAPETE },
  'rotaciones-y-medios-circulos': { patron: 'cuello-circulos', variante: { periodo: 5 } },
  'estiramiento-de-trapecio-superior': { postura: 'trapecio', alterno: true, camara: 'frente' },
  'rotaciones-cervicales-con-nodding': { patron: 'cuello-rotacion' },
  'retracciones-de-barbilla-chin-tucks': { patron: 'chin-tuck' },
  'isometricos-cervicales': { postura: 'isometrico-cervical', alterno: true, camara: 'frente' },
  'flexion-y-extension-de-muneca': { patron: 'munecas' },
  'circulos-de-munecas': { patron: 'munecas', variante: { periodo: 1.5 } },
  'estiramiento-de-flexores': { postura: 'estiramiento-muneca', alterno: true, camara: 'frente' },
  'agarre-activo-y-pasivo': { patron: 'munecas', variante: { mezcla: { codo: 20 } } },
  'plancha-de-munecas': { patron: 'flexion', variante: { periodo: 1.6 } },

  // ───────────── Resistencia ─────────────
  carrera: { patron: 'correr' },
  'trote-suave': { patron: 'correr', variante: { periodo: 0.95 } },
  'caminata-rapida': { patron: 'caminar', variante: { periodo: 0.9 } },
  ciclismo: { patron: 'bici' },
  senderismo: { patron: 'caminar', variante: { mezcla: { tronco: 8 }, periodo: 1.1 } },
  'trail-running': { patron: 'correr', variante: { mezcla: { tronco: 8 } } },
  caminadora: { patron: 'caminar' },
  'caminata-inclinada': { patron: 'caminar', variante: { mezcla: { tronco: 12 } } },
  eliptica: { patron: 'caminar', variante: { mezcla: { codo: 40, hombro: 20 } } },
  'bicicleta-estatica': { patron: 'bici' },
  escaladora: { patron: 'caminar', variante: { mezcla: { cadera: 25, rodilla: 25, hombro: 60, codo: 90 } } },
  'remo-maquina': { patron: 'remo-maquina' },
  hiit: { patron: 'correr', variante: { mezcla: { cadera: 30 }, periodo: 0.6 } },
  sprints: { patron: 'correr', variante: { periodo: 0.5, mezcla: { tronco: 10 } } },
  'saltar-cuerda': { patron: 'cuerda' },
  burpees: { patron: 'burpee' },
  'circuito-metabolico': { patron: 'burpee', variante: { periodo: 2.6 } },
  natacion: { patron: 'nadar' },
  'aqua-aerobicos': { patron: 'jumping-jack', variante: { periodo: 1.4, utiles: ['agua'] } },
  caminata: { patron: 'caminar', variante: { periodo: 1.15 } },
  futbol: { patron: 'patear' },
  basquetbol: { patron: 'basquet' },
  tenis: { patron: 'raqueta' },
  padel: { patron: 'raqueta', variante: { periodo: 1.4 } },
  boxeo: { patron: 'boxeo' },
  baile: { patron: 'baile' },
}

export const tienePatron = (nombre: string): boolean => slugTexto(nombre) in MAPA
