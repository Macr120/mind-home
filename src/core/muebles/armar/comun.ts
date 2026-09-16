import { DIAMETRO_TUBO_ROPA, PROF_RANURA, getTablero } from '../materiales'
import type {
  Cantos,
  Herraje,
  MaterialTableroId,
  Mm,
  Mueble,
  ParteMueble,
  PerfilTubo,
  RolPieza,
  RolTubo,
  Veta,
} from '../tipos'

/**
 * Piezas de construcción compartidas por los siete módulos: la carcasa, la
 * base, los frentes y el cajón se arman UNA vez aquí. Si un módulo necesita
 * algo distinto, pasa parámetros; no copia la función.
 *
 * Sistema de coordenadas (el de `ParteMueble`): origen en la esquina
 * inferior-izquierda-trasera del mueble, x→derecha, y→arriba, z→frente.
 *
 * Convención del rectángulo de corte según el eje del grosor — la misma que
 * lee `despiezar`, y la que decide qué lado es cada canto:
 *
 *   eje 'x' (lateral)        ancho = dz (fondo)   alto = dy   → el frente es `der`
 *   eje 'y' (entrepaño)      ancho = dx           alto = dz   → el frente es `arriba`
 *   eje 'z' (puerta, fondo)  ancho = dx           alto = dy   → los cuatro lados son los suyos
 */

/** Lee un parámetro del módulo (`Mueble.opciones`) con su valor por defecto. */
export const num = (m: Mueble, id: string, def: number): number => {
  const v = m.opciones[id]
  return typeof v === 'number' && Number.isFinite(v) ? v : def
}

export const bool = (m: Mueble, id: string, def: boolean): boolean => {
  const v = m.opciones[id]
  return typeof v === 'boolean' ? v : def
}

export const texto = (m: Mueble, id: string, def: string): string => {
  const v = m.opciones[id]
  return typeof v === 'string' ? v : def
}

/** Aclara (delta > 0) u oscurece un color hex, para que el 3D no sea una mancha plana. */
export function tono(hex: string, delta: number): string {
  const limpio = hex.replace('#', '')
  const n = parseInt(limpio.length === 3 ? limpio.replace(/./g, (c) => c + c) : limpio, 16)
  const mez = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * delta)))
  const r = mez((n >> 16) & 255)
  const g = mez((n >> 8) & 255)
  const b = mez(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const SIN_CANTOS: Cantos = { arriba: false, abajo: false, izq: false, der: false }
const TODOS_CANTOS: Cantos = { arriba: true, abajo: true, izq: true, der: true }

/** Resuelve los cantos de una pieza según lo que pidió el usuario en `cantear`. */
export function cantosDe(m: Mueble, vistos: Partial<Cantos>): Cantos {
  if (m.tablero.cantear === 'ninguno') return { ...SIN_CANTOS }
  if (m.tablero.cantear === 'todos') return { ...TODOS_CANTOS }
  return { ...SIN_CANTOS, ...vistos }
}

/** Crea un herraje con su cantidad (los agrupa después `despiezar`). */
export const herraje = (
  id: string,
  clave: string,
  nombreEs: string,
  cantidad: number,
  unidad: Herraje['unidad'] = 'pz',
): Herraje => ({ id, clave, nombreEs, cantidad, unidad })

/** Un tablero del mueble. La veta cae a `'libre'` sola si el material no se veta. */
export function panel(
  m: Mueble,
  o: {
    id: string
    rol: RolPieza
    clave: string
    nombreEs: string
    x: Mm
    y: Mm
    z: Mm
    dx: Mm
    dy: Mm
    dz: Mm
    eje: 'x' | 'y' | 'z'
    veta?: Veta
    cantos?: Partial<Cantos>
    color?: string
    herrajes?: Herraje[]
    nota?: string
    rot?: [number, number, number]
    /** Material propio (la trasera y los fondos de cajón no son del cuerpo). */
    material?: MaterialTableroId
  },
): ParteMueble {
  const material = o.material ?? m.tablero.materialId
  const conVeta = getTablero(material).conVeta
  return {
    id: o.id,
    rol: o.rol,
    clave: o.clave,
    nombreEs: o.nombreEs,
    x: o.x,
    y: o.y,
    z: o.z,
    dx: o.dx,
    dy: o.dy,
    dz: o.dz,
    hechoDe: 'tablero',
    eje: o.eje,
    materialTablero: material,
    cantos: cantosDe(m, o.cantos ?? {}),
    veta: conVeta ? (o.veta ?? 'ancho') : 'libre',
    color: o.color ?? m.tablero.color,
    herrajes: o.herrajes,
    nota: o.nota,
    rot: o.rot,
  }
}

/** Un tramo de tubo o poste metálico. El largo sale del eje mayor de dx/dy/dz. */
export function tuboParte(
  m: Mueble,
  o: {
    id: string
    rol: RolTubo
    clave: string
    nombreEs: string
    x: Mm
    y: Mm
    z: Mm
    dx: Mm
    dy: Mm
    dz: Mm
    perfil?: PerfilTubo
    seccion?: [Mm] | [Mm, Mm]
    color?: string
    redondo?: boolean
    herrajes?: Herraje[]
  },
): ParteMueble {
  const perfil = o.perfil ?? m.metal.perfil
  return {
    id: o.id,
    rol: o.rol,
    clave: o.clave,
    nombreEs: o.nombreEs,
    x: o.x,
    y: o.y,
    z: o.z,
    dx: o.dx,
    dy: o.dy,
    dz: o.dz,
    hechoDe: 'tubo',
    materialTubo: m.metal.materialId,
    color: o.color ?? m.metal.color,
    tubo: {
      perfil,
      seccion: o.seccion ?? ([m.metal.seccion] as [Mm]),
      pared: m.metal.pared,
    },
    redondo: o.redondo ?? perfil === 'redondo',
    herrajes: o.herrajes,
  }
}

/**
 * Carcasa de tablero: 2 laterales por fuera, techo y piso entre ellos, y la
 * trasera. Es la construcción de melamina de toda la vida, la que usan armario,
 * estante, cajonera, clóset y zapatera.
 */
export function carcasa(
  m: Mueble,
  o: {
    ancho: Mm
    alto: Mm
    fondo: Mm
    /** Altura a la que arranca (lo que levanta la base). */
    y0: Mm
    conTecho?: boolean
    conPiso?: boolean
    conFondo?: boolean
  },
): ParteMueble[] {
  const t = m.tablero.grosor
  const { ancho: A, alto: H, fondo: F, y0 } = o
  const conTecho = o.conTecho ?? true
  const conPiso = o.conPiso ?? true
  const conFondo = (o.conFondo ?? true) && m.tablero.fondo !== 'ninguno'
  const partes: ParteMueble[] = []

  for (const [i, lado] of (['izq', 'der'] as const).entries()) {
    partes.push(
      panel(m, {
        id: `lateral.${i + 1}`,
        rol: 'lateral',
        clave: 'muebles.pieza.lateral',
        nombreEs: 'Lateral',
        x: lado === 'izq' ? 0 : A - t,
        y: y0,
        z: 0,
        dx: t,
        dy: H,
        dz: F,
        eje: 'x',
        veta: 'alto',
        cantos: { der: true },
      }),
    )
  }

  const anchoInterior = A - 2 * t
  if (conTecho) {
    partes.push(
      panel(m, {
        id: 'techo',
        rol: 'techo',
        clave: 'muebles.pieza.techo',
        nombreEs: 'Techo',
        x: t,
        y: y0 + H - t,
        z: 0,
        dx: anchoInterior,
        dy: t,
        dz: F,
        eje: 'y',
        veta: 'ancho',
        cantos: { arriba: true },
      }),
    )
  }
  if (conPiso) {
    partes.push(
      panel(m, {
        id: 'piso',
        rol: 'piso',
        clave: 'muebles.pieza.piso',
        nombreEs: 'Piso',
        x: t,
        y: y0,
        z: 0,
        dx: anchoInterior,
        dy: t,
        dz: F,
        eje: 'y',
        veta: 'ancho',
        cantos: { arriba: true },
      }),
    )
  }

  if (conFondo) {
    const gf = m.tablero.grosorFondo
    const enRanura = m.tablero.fondo === 'ranura'
    // Ranurado: la trasera se corta MÁS GRANDE, lo que entra en la ranura de
    // los cuatro lados. Sobrepuesto: cubre el mueble completo por detrás.
    const anchoFondo = enRanura ? anchoInterior + 2 * PROF_RANURA : A
    const altoFondo = enRanura ? H - 2 * t + 2 * PROF_RANURA : H
    partes.push({
      ...panel(m, {
        id: 'fondo',
        rol: 'fondo',
        clave: 'muebles.pieza.fondo',
        nombreEs: 'Trasera',
        x: enRanura ? t - PROF_RANURA : 0,
        y: enRanura ? y0 + t - PROF_RANURA : y0,
        z: enRanura ? 10 : 0,
        dx: anchoFondo,
        dy: altoFondo,
        dz: gf,
        eje: 'z',
        veta: 'libre',
        cantos: {},
        material: m.tablero.materialFondo,
        color: tono(m.tablero.color, -0.08),
        nota: enRanura ? 'Entra en ranura: ya lleva sumados 8 mm por lado' : undefined,
      }),
      // La trasera nunca lleva canto, ni con `cantear: 'todos'`: no se ve.
      cantos: { arriba: false, abajo: false, izq: false, der: false },
    })
  }
  return partes
}

/** Zócalo (4 tableros de canto) o patas. Devuelve [] si no hay base. */
export function base(m: Mueble, ancho: Mm, fondo: Mm): ParteMueble[] {
  if (m.base.tipo === 'ninguna' || m.base.altura <= 0) return []
  const h = m.base.altura
  if (m.base.tipo === 'patas') {
    const d = m.base.patas.diametro
    const margen = 20
    const partes: ParteMueble[] = []
    for (const [i, [px, pz]] of (
      [
        [margen, margen],
        [ancho - margen - d, margen],
        [margen, fondo - margen - d],
        [ancho - margen - d, fondo - margen - d],
      ] as [Mm, Mm][]
    ).entries()) {
      partes.push({
        id: `pata.${i + 1}`,
        rol: 'pata-metal',
        clave: 'muebles.pieza.pata',
        nombreEs: 'Pata',
        x: px,
        y: 0,
        z: pz,
        dx: d,
        dy: h,
        dz: d,
        hechoDe: 'tubo',
        materialTubo: m.metal.materialId,
        color: m.base.patas.color,
        tubo: { perfil: 'redondo', seccion: [d], pared: m.metal.pared },
        redondo: true,
      })
    }
    partes.push({
      ...partes[0],
      id: 'pata.nivelador',
      soloVisual: true,
      herrajes: [herraje('her-nivelador', 'muebles.her.nivelador', 'Nivelador', 4)],
      dx: 0,
      dy: 0,
      dz: 0,
    })
    return partes
  }

  const t = m.tablero.grosor
  const r = m.base.retranqueo
  const color = tono(m.tablero.color, -0.12)
  return [
    panel(m, {
      id: 'zoclo.frente',
      rol: 'zoclo',
      clave: 'muebles.pieza.zocloFrente',
      nombreEs: 'Zócalo frontal',
      x: 0,
      y: 0,
      z: fondo - r - t,
      dx: ancho,
      dy: h,
      dz: t,
      eje: 'z',
      veta: 'ancho',
      cantos: { arriba: true },
      color,
    }),
    panel(m, {
      id: 'zoclo.atras',
      rol: 'zoclo',
      clave: 'muebles.pieza.zocloAtras',
      nombreEs: 'Zócalo trasero',
      x: 0,
      y: 0,
      z: 0,
      dx: ancho,
      dy: h,
      dz: t,
      eje: 'z',
      veta: 'ancho',
      cantos: {},
      color,
    }),
  ]
}

/**
 * Reparte `n` entrepaños entre dos alturas con luces iguales. Devuelve la `y`
 * de la cara inferior de cada uno.
 */
export function repartir(yInf: Mm, ySup: Mm, n: number, t: Mm): Mm[] {
  if (n <= 0) return []
  const libre = ySup - yInf - n * t
  if (libre <= 0) return []
  const luz = libre / (n + 1)
  return Array.from({ length: n }, (_, i) => Math.round(yInf + (i + 1) * luz + i * t))
}

/**
 * Frentes batientes o corredizos de un vano, con sus bisagras y tiradores. El
 * frente se monta POR DELANTE del cuerpo (z del vano en adelante), que es como
 * se monta una puerta sobrepuesta de melamina.
 */
export function frentes(
  m: Mueble,
  vano: { x: Mm; y: Mm; z: Mm; ancho: Mm; alto: Mm },
): ParteMueble[] {
  if (m.frentes.puertas === 'ninguna' || m.frentes.hojas <= 0) return []
  const t = m.tablero.grosor
  const g = m.frentes.holgura
  const n = m.frentes.hojas
  const corrediza = m.frentes.puertas === 'corrediza'
  const partes: ParteMueble[] = []
  // Corredizas: las hojas se traslapan, así que cada una es más ancha.
  const anchoHoja = corrediza
    ? Math.round((vano.ancho + 30 * (n - 1)) / n)
    : Math.round((vano.ancho - g * (n + 1)) / n)
  const altoHoja = vano.alto - 2 * g
  if (anchoHoja <= 0 || altoHoja <= 0) return []

  for (let i = 0; i < n; i++) {
    const x = corrediza
      ? vano.x + i * (anchoHoja - 30)
      : vano.x + g + i * (anchoHoja + g)
    const z = corrediza ? vano.z + i * (t + 2) : vano.z
    // Una bisagra cada 700 mm de alto, mínimo 2 por hoja.
    const bisagras = Math.max(2, Math.ceil(altoHoja / 700))
    partes.push(
      panel(m, {
        id: `puerta.${i + 1}`,
        rol: 'puerta',
        clave: 'muebles.pieza.puerta',
        nombreEs: 'Puerta',
        x,
        y: vano.y + g,
        z,
        dx: anchoHoja,
        dy: altoHoja,
        dz: t,
        eje: 'z',
        veta: 'alto',
        cantos: { arriba: true, abajo: true, izq: true, der: true },
        color: m.frentes.colorFrente,
        herrajes: corrediza
          ? [herraje('her-riel-corredizo', 'muebles.her.rielCorredizo', 'Riel corredizo', 1, 'juego')]
          : [
              herraje('her-bisagra-cazoleta', 'muebles.her.bisagra', 'Bisagra de cazoleta', bisagras),
            ],
      }),
    )
    partes.push(...tirador(m, { x, y: vano.y + g, z: z + t, ancho: anchoHoja, alto: altoHoja }, `puerta.${i + 1}`))
  }
  return partes
}

/** Tirador de barra: se pinta, se cotiza como herraje y no se despieza. */
export function tirador(
  m: Mueble,
  frente: { x: Mm; y: Mm; z: Mm; ancho: Mm; alto: Mm },
  refId: string,
  horizontal = false,
): ParteMueble[] {
  if (m.frentes.tirador === 'ninguno') return []
  const largo = Math.min(160, Math.round((horizontal ? frente.ancho : frente.alto) * 0.5))
  const d = 14
  const perforado = m.frentes.tirador === 'perforado'
  return [
    {
      id: `tirador.${refId}`,
      rol: 'travesano-metal',
      clave: 'muebles.pieza.tirador',
      nombreEs: 'Tirador',
      x: horizontal ? frente.x + (frente.ancho - largo) / 2 : frente.x + frente.ancho - 60,
      y: horizontal ? frente.y + frente.alto - 40 : frente.y + (frente.alto - largo) / 2,
      z: frente.z,
      dx: horizontal ? largo : d,
      dy: horizontal ? d : largo,
      dz: perforado ? 1 : d,
      hechoDe: 'accesorio',
      color: m.metal.color,
      redondo: !perforado,
      soloVisual: true,
      herrajes: perforado ? [] : [herraje('her-tirador', 'muebles.her.tirador', 'Tirador', 1)],
    },
  ]
}

/**
 * Cajón completo: frente sobrepuesto, dos costados, trasera y fondo, más su
 * juego de correderas. `interior` es el hueco libre entre laterales.
 */
export function cajon(
  m: Mueble,
  o: { id: string; x: Mm; y: Mm; z: Mm; ancho: Mm; alto: Mm; fondo: Mm; n: number },
): ParteMueble[] {
  const t = m.tablero.grosor
  const g = m.frentes.holgura
  const gf = m.tablero.grosorFondo
  // La corredera lateral pide 13 mm por lado; la caja del cajón es más angosta.
  const HOLGURA_CORREDERA: Mm = 13
  const anchoCaja = o.ancho - 2 * HOLGURA_CORREDERA
  const fondoCaja = Math.max(150, o.fondo - 30)
  const altoCaja = Math.max(80, o.alto - 40)
  const partes: ParteMueble[] = []

  partes.push(
    panel(m, {
      id: `${o.id}.frente`,
      rol: 'frente-cajon',
      clave: 'muebles.pieza.frenteCajon',
      nombreEs: 'Frente de cajón',
      x: o.x + g,
      y: o.y + g,
      z: o.z,
      dx: o.ancho - 2 * g,
      dy: o.alto - 2 * g,
      dz: t,
      eje: 'z',
      veta: 'ancho',
      cantos: { arriba: true, abajo: true, izq: true, der: true },
      color: m.frentes.colorFrente,
      herrajes: [
        herraje('her-corredera', 'muebles.her.corredera', 'Corredera', 1, 'par'),
      ],
    }),
  )
  partes.push(
    ...tirador(
      m,
      { x: o.x + g, y: o.y + g, z: o.z + t, ancho: o.ancho - 2 * g, alto: o.alto - 2 * g },
      o.id,
      true,
    ),
  )

  const xCaja = o.x + HOLGURA_CORREDERA
  const zCaja = o.z - fondoCaja
  const yCaja = o.y + 20
  for (const [i, lado] of (['izq', 'der'] as const).entries()) {
    partes.push(
      panel(m, {
        id: `${o.id}.costado.${i + 1}`,
        rol: 'costado-cajon',
        clave: 'muebles.pieza.costadoCajon',
        nombreEs: 'Costado de cajón',
        x: lado === 'izq' ? xCaja : xCaja + anchoCaja - t,
        y: yCaja,
        z: zCaja,
        dx: t,
        dy: altoCaja,
        dz: fondoCaja,
        eje: 'x',
        veta: 'ancho',
        cantos: { arriba: true },
        color: tono(m.tablero.color, -0.04),
      }),
    )
  }
  partes.push(
    panel(m, {
      id: `${o.id}.trasera`,
      rol: 'trasera-cajon',
      clave: 'muebles.pieza.traseraCajon',
      nombreEs: 'Trasera de cajón',
      x: xCaja + t,
      y: yCaja,
      z: zCaja,
      dx: anchoCaja - 2 * t,
      dy: altoCaja,
      dz: t,
      eje: 'z',
      veta: 'ancho',
      cantos: { arriba: true },
      color: tono(m.tablero.color, -0.04),
    }),
  )
  partes.push(
    panel(m, {
      id: `${o.id}.fondo`,
      rol: 'fondo-cajon',
      clave: 'muebles.pieza.fondoCajon',
      nombreEs: 'Fondo de cajón',
      x: xCaja,
      y: yCaja,
      z: zCaja,
      dx: anchoCaja,
      dy: gf,
      dz: fondoCaja,
      eje: 'y',
      veta: 'libre',
      cantos: {},
      material: m.tablero.materialFondo,
      color: tono(m.tablero.color, -0.1),
    }),
  )
  return partes
}

/** Tubo de colgar ropa, con sus dos soportes. */
export function tuboColgar(m: Mueble, o: { id: string; x: Mm; y: Mm; z: Mm; largo: Mm }): ParteMueble {
  return tuboParte(m, {
    id: o.id,
    rol: 'tubo-colgar',
    clave: 'muebles.pieza.tuboColgar',
    nombreEs: 'Tubo de colgar',
    x: o.x,
    y: o.y,
    z: o.z,
    dx: o.largo,
    dy: DIAMETRO_TUBO_ROPA,
    dz: DIAMETRO_TUBO_ROPA,
    perfil: 'redondo',
    seccion: [DIAMETRO_TUBO_ROPA],
    redondo: true,
    herrajes: [herraje('her-soporte-tubo', 'muebles.her.soporteTubo', 'Soporte de tubo', 1, 'par')],
  })
}
