import type { NombreIcono } from '../ui/iconos/catalogo'

/**
 * Tipos del taller de muebles modulares. Todo el dominio piensa en MILÍMETROS
 * enteros (la palabra «metro» no aparece en este archivo): la conversión a las
 * unidades de la escena 3D vive solo en `piezas3d.ts`.
 *
 * El flujo es siempre el mismo y en un solo sentido:
 *
 *   Mueble (la receta que se guarda)
 *     → armarMueble()         → Cuerpo      (cajas físicas en mm: la ÚNICA geometría)
 *          → despiezar()         → Despiece  (piezas de corte, canto, tubo, herrajes)
 *          → piezas3DDeCuerpo()  → Pieza3D[] (lo que se ve en la casa)
 *
 * `Cuerpo` es el eslabón que impide que el 3D y el despiece se desincronicen:
 * son dos proyecciones de la misma lista, no dos cálculos paralelos.
 */

/** Unidad del taller: milímetros enteros. */
export type Mm = number

export type MaterialTableroId =
  | 'melamina'
  | 'mdf'
  | 'mdf-hidrofugo'
  | 'aglomerado'
  | 'triplay'
  | 'pino'
  | 'encino'

export type MaterialTuboId = 'acero-negro' | 'acero-inox' | 'aluminio' | 'galvanizado'

export type PerfilTubo = 'cuadrado' | 'rectangular' | 'redondo'

/**
 * Dirección de la veta respecto al lado `ancho` de la pieza de corte, sabiendo
 * que la veta de la hoja corre a lo largo de su lado mayor (los 2440 mm):
 * `'ancho'` se acomoda tal cual, `'alto'` con un giro fijo de 90°, y `'libre'`
 * puede girar para aprovechar mejor.
 */
export type Veta = 'ancho' | 'alto' | 'libre'

/** Cantos de una pieza plana, en el sistema de la pieza de corte (ancho × alto). */
export interface Cantos {
  arriba: boolean
  abajo: boolean
  izq: boolean
  der: boolean
}

/** Qué es cada pieza dentro del mueble (gobierna nombre, veta y cantos por defecto). */
export type RolPieza =
  | 'lateral'
  | 'techo'
  | 'piso'
  | 'fondo'
  | 'entrepano'
  | 'division'
  | 'puerta'
  | 'frente-cajon'
  | 'costado-cajon'
  | 'trasera-cajon'
  | 'fondo-cajon'
  | 'zoclo'
  | 'travesano'
  | 'cubierta'
  | 'faldon'
  | 'repisa'
  | 'asiento'
  | 'respaldo'

/** Qué es cada tramo de metal. */
export type RolTubo =
  | 'poste'
  | 'travesano-metal'
  | 'tubo-colgar'
  | 'pata-metal'
  | 'refuerzo'
  | 'brazo'

/** Herraje que pide el mueble (bisagras, correderas, tiradores, tornillería). */
export interface Herraje {
  /** Empata con `MaterialTaller.herrajeClave` del catálogo de precios. */
  id: string
  clave: string
  nombreEs: string
  cantidad: number
  unidad: 'pz' | 'par' | 'juego' | 'ml'
}

/** Aviso de fabricación: lo que el carpintero tiene que saber antes de cortar. */
export interface AvisoMueble {
  nivel: 'aviso' | 'error'
  clave: string
  textoEs: string
  /**
   * Valores a interpolar en el texto (`{pieza}`, `{ancho}`…). Van aparte y no
   * pegados en `textoEs` para que la traducción los coloque donde toque en su
   * idioma: un aviso con el nombre ya incrustado solo se puede leer en español.
   */
  vars?: Record<string, string | number>
  /** Pieza o parámetro al que apunta, para resaltarlo en la UI. */
  ref?: string
}

/**
 * Pieza plana a cortar. Es la frontera estable entre el generador y el diagrama
 * de cortes / el cotizador: no se cambia sin revisar `corte.ts` y `costos.ts`.
 */
export interface PiezaCorte {
  /** Estable dentro del mueble: `<rol>` o `<rol>.<n>`, p. ej. 'entrepano.3'. */
  id: string
  rol: RolPieza
  clave: string
  nombreEs: string
  /** Medidas de CORTE en mm. */
  ancho: Mm
  alto: Mm
  grosor: Mm
  cantidad: number
  materialId: MaterialTableroId
  cantos: Cantos
  veta: Veta
  /** Color con el que se pinta en el 3D y en el diagrama. */
  color: string
  nota?: string
}

/** Tramo de tubo o poste metálico a cortar. */
export interface PiezaTubo {
  id: string
  rol: RolTubo
  clave: string
  nombreEs: string
  largo: Mm
  perfil: PerfilTubo
  /** cuadrado/redondo: [lado o diámetro] · rectangular: [a, b]. */
  seccion: [Mm] | [Mm, Mm]
  /** Espesor de pared (calibre) en mm. */
  pared: Mm
  cantidad: number
  materialId: MaterialTuboId
  color: string
}

/** Todo lo que hace falta para fabricar el mueble y para cotizarlo. */
export interface Despiece {
  tableros: PiezaCorte[]
  tubos: PiezaTubo[]
  /** Canto ya sumado en metros lineales, por material y ancho de cinta. */
  cantoMl: { materialId: MaterialTableroId; cintaMm: Mm; ml: number }[]
  /** Superficie neta por material y grosor, en m². */
  areaM2: { materialId: MaterialTableroId; grosor: Mm; m2: number }[]
  /** Metros lineales de tubo por sección y material. */
  tuboMl: {
    materialId: MaterialTuboId
    perfil: PerfilTubo
    seccion: [Mm] | [Mm, Mm]
    pared: Mm
    ml: number
  }[]
  herrajes: Herraje[]
  avisos: AvisoMueble[]
}

/** De qué está hecho el esqueleto del mueble. */
export type EstructuraMueble = 'tablero' | 'metal' | 'mixto'

export interface ConfigTablero {
  materialId: MaterialTableroId
  /** Grosor del cuerpo: 15 / 18 / 25. */
  grosor: Mm
  /** Grosor de la trasera: 3 / 6 / 9. */
  grosorFondo: Mm
  /**
   * Material de la trasera y de los fondos de cajón. Va aparte del cuerpo
   * porque en 3 mm solo se fabrican MDF y triplay: heredar el del cuerpo hacía
   * que el cotizador cobrara una hoja de melamina de 16 mm por una trasera.
   */
  materialFondo: MaterialTableroId
  fondo: 'ranura' | 'sobrepuesto' | 'ninguno'
  color: string
  /** Ancho de la cinta de canto (el espesor de 0.45 mm se ignora: manda el ancho). */
  cintaMm: Mm
  /** `vistos` = solo los cantos a la vista; `todos` = las cuatro caras. */
  cantear: 'vistos' | 'todos' | 'ninguno'
}

export interface ConfigMetal {
  materialId: MaterialTuboId
  perfil: PerfilTubo
  /** Lado o diámetro en mm. */
  seccion: Mm
  /** Espesor de pared: 1.2 / 1.5 / 2. */
  pared: Mm
  color: string
}

export interface ConfigBase {
  tipo: 'zoclo' | 'patas' | 'ninguna'
  /** Lo que la base levanta el cuerpo: descuenta del alto útil. */
  altura: Mm
  /** Cuánto se mete el zoclo respecto al frente. */
  retranqueo: Mm
  patas: { diametro: Mm; color: string }
}

export interface ConfigFrentes {
  puertas: 'ninguna' | 'batiente' | 'corrediza'
  hojas: number
  /** Holgura entre frentes y contra el cuerpo (2–3 mm típico). */
  holgura: Mm
  tirador: 'barra' | 'perforado' | 'ninguno'
  colorFrente: string
}

/**
 * Los cuatro modelos del taller. Son pocos a propósito: cada uno es
 * paramétrico de sobra para cubrir su familia entera (el de madera hace
 * armario, librero, cajonera y clóset con los mismos cuatro parámetros).
 */
export type ModuloId = 'madera' | 'metal' | 'mesa' | 'silla'

/**
 * La receta completa del mueble. Es LO ÚNICO que se persiste: el 3D, el
 * despiece y la cotización se regeneran siempre a partir de aquí.
 */
export interface Mueble {
  /** Versión del generador: permite cambiar defaults sin reinterpretar lo viejo. */
  v: 1
  moduloId: ModuloId
  nombre: string
  medidas: { ancho: Mm; alto: Mm; fondo: Mm }
  /** Parámetros propios del módulo (ver `DefModulo.params`). */
  opciones: Record<string, number | string | boolean>
  estructura: EstructuraMueble
  tablero: ConfigTablero
  metal: ConfigMetal
  base: ConfigBase
  frentes: ConfigFrentes
}

/**
 * Una parte física del mueble, EN MILÍMETROS, en el sistema del mueble: origen
 * en la esquina inferior-izquierda-trasera, x→derecha, y→arriba, z→frente. Es
 * la única geometría que se calcula; `despiezar` y `piezas3DDeCuerpo` la leen.
 */
export interface ParteMueble {
  id: string
  rol: RolPieza | RolTubo
  clave: string
  nombreEs: string
  x: Mm
  y: Mm
  z: Mm
  dx: Mm
  dy: Mm
  dz: Mm
  hechoDe: 'tablero' | 'tubo' | 'accesorio'
  /** Solo 'tablero': en qué eje va el GROSOR. Define cuál es el rectángulo de corte. */
  eje?: 'x' | 'y' | 'z'
  materialTablero?: MaterialTableroId
  materialTubo?: MaterialTuboId
  cantos?: Cantos
  veta?: Veta
  color: string
  tubo?: { perfil: PerfilTubo; seccion: [Mm] | [Mm, Mm]; pared: Mm }
  /**
   * Rotación extra SOLO para el 3D (entrepaño inclinado, puerta entreabierta).
   * No afecta al despiece: el rectángulo de corte sigue saliendo de dx/dy/dz.
   */
  rot?: [number, number, number]
  /** Cilindro en el 3D (patas redondas, tubo de colgar) en vez de caja. */
  redondo?: boolean
  /** Se pinta pero no se despieza (tirador, riel de corredera). */
  soloVisual?: boolean
  /** Herrajes que ESTA parte arrastra (una puerta trae sus bisagras). */
  herrajes?: Herraje[]
  nota?: string
}

/** El mueble resuelto en cajas físicas. */
export interface Cuerpo {
  partes: ParteMueble[]
  bbox: { ancho: Mm; alto: Mm; fondo: Mm }
  avisos: AvisoMueble[]
}

/** Icono de un módulo (tipado para que no se cuele un nombre que no existe). */
export type IconoModulo = NombreIcono
