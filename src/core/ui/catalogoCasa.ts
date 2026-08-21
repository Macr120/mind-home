import type { Acceso, MuroLibre, PisoExteriorCelda, ZonaPlano } from '../data/db'
import { PISOS, type PisoTipoId } from '../house/pisos'
import type { NombreIcono } from './iconos/catalogo'
import {
  TECHO_FORMAS,
  type TechoCeldaForma,
  type TechoFormaId,
  type TechoTipoId,
} from '../house/techos'
import {
  PINCELES_DEFAULT,
  TIPOS_MURO,
  TIPOS_PUERTA,
  type EstiloArista,
  type PincelesCuarto,
} from '../house/murosPuertas'
import {
  effectiveEdge,
  estiloDeArista,
  roomEdges,
  type Cell,
  type Footprint,
  type WallOverrides,
} from '../house/walls'

/**
 * Catálogo de la CASA: las PIEZAS ARQUITECTÓNICAS con las que está construida y
 * cuántas veces se repite cada una. No es una biblioteca de la que sacar cosas
 * (esto se levanta en el editor de planos, no se arrastra): es el recuento de lo
 * que ya existe en el mapa.
 *
 * El eje son las piezas, no los materiales: un arco y un muro recto son piezas
 * distintas aunque los dos sean de ladrillo, y una cúpula no es «un techo» sin
 * más. Por eso cada sección lista la pieza —muro, vano, silueta, techo, loseta,
 * escalera— y el material solo aparece donde de verdad distingue (los muros y
 * los suelos).
 *
 * Todo se DERIVA del estado real; aquí no se guarda nada.
 *
 * OJO con los muros de cuarto: NO hay una fila por muro. Las aristas se calculan
 * con `roomEdges` sobre el footprint, su estado sale de `effectiveEdge` (el
 * override manual o el automático) y su material de `estiloDeArista` — que cae
 * al pincel del cuarto, porque un muro sólido recién puesto no guarda estilo.
 * Contar solo las claves de `wallOverrides` daría una fracción de la casa.
 */

/** Una entrada del catálogo: la pieza y cuántas hay. */
export interface PiezaCasa {
  /** Id estable dentro de su sección (`solido`, `cupula`, `escalera`…). */
  id: string
  nombre: string
  /** Nombre de `ui/iconos/catalogo.ts` — nunca un emoji crudo, que degrada en silencio. */
  icono?: NombreIcono
  /** Emoji SOLO para los materiales de piso, que lo traen como dato en `PISOS`. */
  emoji?: string
  color?: string
  /** Clave i18n propia, cuando la pieza ya tiene una en otro catálogo (los pisos). */
  clave?: string
  cuantas: number
}

export type SeccionCasaId =
  | 'estructura'
  | 'muros'
  | 'siluetas'
  | 'puertas'
  | 'ventanas'
  | 'techos'
  | 'losetas'
  | 'pisoInterior'
  | 'pisoExterior'
  | 'accesos'

export interface SeccionCasa {
  id: SeccionCasaId
  nombre: string
  icono: NombreIcono
  /** Aclara la unidad cuando no es obvia («por cuarto», «por celda»). */
  unidad?: string
  piezas: PiezaCasa[]
}

// ── Catálogos de piezas que no tienen array propio en el proyecto ────────────
// Los iconos salen de `ui/iconos/catalogo.ts`: un emoji crudo aquí se pintaría
// tal cual con la iconografía profesional, rompiendo la coherencia del panel.

type DefPieza = { id: string; nombre: string; icono: NombreIcono }

/** Silueta superior del muro: la forma arquitectónica de su remate. */
const SILUETAS_MURO: DefPieza[] = [
  { id: 'recta', nombre: 'Remate recto', icono: 'muro' },
  { id: 'arco', nombre: 'Arco', icono: 'cupula' },
  { id: 'esquinas', nombre: 'Almenas', icono: 'castillo' },
  { id: 'triangulo', nombre: 'Frontón', icono: 'choza' },
]

/** Forma del hueco de la ventana, con lo que vive dentro. */
const VANOS_VENTANA: DefPieza[] = [
  { id: 'cuadrado', nombre: 'Ventana cuadrada', icono: 'ventana' },
  { id: 'circulo', nombre: 'Ojo de buey', icono: 'esfera' },
  { id: 'triangulo', nombre: 'Ventana triangular', icono: 'choza' },
  { id: 'cuadro', nombre: 'Cuadro empotrado', icono: 'imagen' },
  { id: 'espejo', nombre: 'Espejo empotrado', icono: 'espejo' },
]

/** Forma de la loseta (planta): la pieza de suelo, no su material. */
const FORMAS_LOSETA: DefPieza[] = [
  { id: 'cuadrado', nombre: 'Loseta cuadrada', icono: 'baldosa' },
  { id: 'triangular', nombre: 'Loseta diagonal', icono: 'choza' },
  { id: 'circular', nombre: 'Loseta curva', icono: 'esfera' },
]

/** Muros que no pertenecen a ningún cuarto: se dibujan sueltos en el mapa. */
const CLASES_MURO_LIBRE: DefPieza[] = [
  { id: 'libre-recto', nombre: 'Muro suelto', icono: 'muro' },
  { id: 'libre-diagonal', nombre: 'Muro diagonal', icono: 'regla' },
  { id: 'libre-curvo', nombre: 'Muro curvo', icono: 'cupula' },
]

const ACCESOS: DefPieza[] = [
  { id: 'escalera', nombre: 'Escalera', icono: 'escalera' },
  { id: 'elevador', nombre: 'Elevador', icono: 'elevador' },
  { id: 'resbaladilla', nombre: 'Resbaladilla', icono: 'resbaladilla' },
  { id: 'escalera-marina', nombre: 'Escalera marina', icono: 'olas' },
]

/** El armazón de la casa: lo que define su volumen antes de vestirlo. */
const ESTRUCTURA: DefPieza[] = [
  { id: 'cuartos', nombre: 'Cuartos', icono: 'cuartos' },
  { id: 'basicos', nombre: 'Espacios básicos', icono: 'rejilla' },
  { id: 'niveles', nombre: 'Plantas', icono: 'niveles' },
  { id: 'sotanos', nombre: 'Sótanos', icono: 'bajar' },
  { id: 'albercas', nombre: 'Albercas', icono: 'tina' },
  { id: 'patios', nombre: 'Patios sin muros', icono: 'arbol' },
]

const sumar = (mapa: Map<string, number>, clave: string, n = 1) =>
  mapa.set(clave, (mapa.get(clave) ?? 0) + n)

/** Piso resuelto por cuarto; `null` = color a medida, sin material del catálogo. */
export type PisosPorCuarto = Record<string, PisoTipoId | null>

/** Lo que hace falta de un cuarto colocado para recorrer sus piezas. */
export interface CuartoConstruido {
  id: string
  anchor: Cell
  footprint: Footprint
  /** Ocupación de celdas de SU nivel (decide qué arista es puerta automática). */
  ocupado: Set<string>
  nivel: number
  overrides?: WallOverrides
  estilos?: Record<string, EstiloArista>
  pinceles?: PincelesCuarto
  /** Forma de loseta por offset del footprint. */
  formasCelda?: Record<string, { forma: string; rotacion: number }>
  /** Espacio abierto (jardín): no levanta muros ni techo. */
  sinMuros?: boolean
  /** Alberca (sótano inundado): nunca lleva techo. */
  agua?: boolean
}

/** Techos resueltos por cuarto (del store de diseño). */
export interface TechosPorCuarto {
  tipos: Record<string, TechoTipoId | null>
  formas: Record<string, TechoFormaId>
  formasCelda: Record<string, Record<string, TechoCeldaForma>>
}

/**
 * Recorre la casa y cuenta cada pieza. Las secciones que salen vacías no se
 * pintan: una casa de una sola planta no enseña una lista de escaleras vacía.
 */
export function catalogoCasa(
  construidos: CuartoConstruido[],
  murosLibres: MuroLibre[],
  zonas: ZonaPlano[],
  accesos: Acceso[],
  techos: TechosPorCuarto,
  pisoTipos: PisosPorCuarto,
  pisoExtTipos: PisosPorCuarto,
  pisosExt: PisoExteriorCelda[],
): SeccionCasa[] {
  const estructura = new Map<string, number>()
  const muros = new Map<string, number>()
  const siluetas = new Map<string, number>()
  const puertas = new Map<string, number>()
  const ventanas = new Map<string, number>()
  const techoPiezas = new Map<string, number>()
  const losetas = new Map<string, number>()
  const pisoInt = new Map<string, number>()
  const pisoExt = new Map<string, number>()
  const accesoPiezas = new Map<string, number>()

  // ── Armazón ───────────────────────────────────────────────────────────────
  const niveles = new Set<number>()
  for (const c of construidos) {
    niveles.add(c.nivel)
    sumar(estructura, 'cuartos')
    if (c.agua) sumar(estructura, 'albercas')
    if (c.sinMuros) sumar(estructura, 'patios')
    // Losetas: la forma de la planta de cada celda del cuarto.
    for (const celda of c.footprint) {
      const f = c.formasCelda?.[`${celda.col},${celda.row}`]?.forma ?? 'cuadrado'
      sumar(losetas, f)
    }
  }
  for (const z of zonas) {
    niveles.add(z.nivel)
    sumar(estructura, 'basicos')
    for (const celda of z.celdas) {
      const f = z.formasCelda?.[`${celda.col},${celda.row}`]?.forma ?? 'cuadrado'
      sumar(losetas, f)
    }
  }
  const plantas = [...niveles].filter((n) => n >= 0).length
  const sotanos = [...niveles].filter((n) => n < 0).length
  if (plantas > 0) sumar(estructura, 'niveles', plantas)
  if (sotanos > 0) sumar(estructura, 'sotanos', sotanos)

  // ── Aristas de los cuartos: muro, silueta, puerta y ventana ───────────────
  for (const c of construidos) {
    if (c.sinMuros) continue
    for (const arista of roomEdges(c.anchor, c.footprint, c.ocupado)) {
      const estado = effectiveEdge(arista, c.overrides)
      if (estado === 'abierto') continue
      const estilo = estiloDeArista(arista, c.estilos, c.pinceles)
      if (estado === 'puerta') {
        sumar(puertas, estilo?.puerta?.tipo ?? PINCELES_DEFAULT.puerta.tipo)
        continue
      }
      const muro = estilo?.muro
      sumar(muros, muro?.tipo ?? PINCELES_DEFAULT.muro.tipo)
      sumar(siluetas, muro?.forma ?? 'recta')
      // Un muro con ventana es pared Y vano: cuenta en las dos secciones.
      if (muro?.ventana || muro?.tipo === 'ventana') {
        const contenido = muro?.ventContenido
        sumar(ventanas, contenido && contenido !== 'ventana' ? contenido : (muro?.ventForma ?? 'cuadrado'))
      }
    }
  }

  // ── Muros libres (llevan su puerta y su ventana dentro de la propia fila) ──
  for (const m of murosLibres) {
    sumar(muros, m.tipo ?? PINCELES_DEFAULT.muro.tipo)
    sumar(
      estructura,
      m.clase === 'forma'
        ? m.forma === 'circular'
          ? 'libre-curvo'
          : 'libre-diagonal'
        : 'libre-recto',
    )
    sumar(siluetas, m.silueta ?? 'recta')
    if (m.puerta) sumar(puertas, m.puertaTipo ?? PINCELES_DEFAULT.puerta.tipo)
    if (m.ventana) {
      const contenido = m.ventContenido
      sumar(ventanas, contenido && contenido !== 'ventana' ? contenido : (m.ventForma ?? 'cuadrado'))
    }
  }

  // ── Techos: la forma manda (una cúpula es una pieza, no un color) ─────────
  for (const c of construidos) {
    if (c.sinMuros || c.agua) continue // patios y albercas nunca llevan techo
    const porCelda = techos.formasCelda[c.id]
    if (porCelda && Object.keys(porCelda).length > 0) {
      for (const celda of c.footprint) {
        const f = porCelda[`${celda.col},${celda.row}`]?.forma ?? techos.formas[c.id] ?? 'plano'
        sumar(techoPiezas, f)
      }
      continue
    }
    sumar(techoPiezas, techos.formas[c.id] ?? 'plano')
  }

  // ── Suelos ────────────────────────────────────────────────────────────────
  const enMapa = new Set(construidos.map((c) => c.id))
  for (const [roomId, tipo] of Object.entries(pisoTipos)) {
    if (tipo && enMapa.has(roomId)) sumar(pisoInt, tipo)
  }
  for (const z of zonas) {
    if (z.pisoTipo) sumar(pisoInt, z.pisoTipo)
  }
  for (const [roomId, tipo] of Object.entries(pisoExtTipos)) {
    if (tipo && enMapa.has(roomId)) sumar(pisoExt, tipo)
  }
  for (const celda of pisosExt) {
    if (celda.pisoTipo) sumar(pisoExt, celda.pisoTipo)
    if (celda.forma?.forma) sumar(losetas, celda.forma.forma)
  }

  // ── Accesos entre plantas ─────────────────────────────────────────────────
  for (const a of accesos) sumar(accesoPiezas, a.tipo)

  /** Convierte un mapa de cuentas en piezas, siguiendo el orden del catálogo. */
  const desde = <T extends { id: string; nombre: string }>(
    catalogo: T[],
    cuentas: Map<string, number>,
    extra: (def: T) => Partial<PiezaCasa> = () => ({}),
  ): PiezaCasa[] =>
    catalogo
      .filter((def) => (cuentas.get(def.id) ?? 0) > 0)
      .map((def) => ({ id: def.id, nombre: def.nombre, cuantas: cuentas.get(def.id) ?? 0, ...extra(def) }))

  const conIcono = (d: DefPieza) => ({ icono: d.icono })
  /** Las formas de techo traen emoji en su catálogo; se mapean a icono propio. */
  const ICONO_TECHO: Record<TechoFormaId, NombreIcono> = {
    plano: 'plano',
    dos_aguas: 'casa',
    abovedado: 'cilindro',
    cupula: 'cupula',
  }

  return [
    {
      id: 'estructura',
      nombre: 'Estructura',
      icono: 'construir',
      piezas: [
        ...desde(ESTRUCTURA, estructura, conIcono),
        ...desde(CLASES_MURO_LIBRE, estructura, conIcono),
      ],
    },
    {
      id: 'muros',
      nombre: 'Muros',
      icono: 'muro',
      unidad: 'por tramo',
      piezas: desde(TIPOS_MURO, muros, (d) => ({ color: d.defaultColor })),
    },
    {
      id: 'siluetas',
      nombre: 'Remates de muro',
      icono: 'castillo',
      piezas: desde(SILUETAS_MURO, siluetas, conIcono),
    },
    {
      id: 'puertas',
      nombre: 'Puertas',
      icono: 'cuartos',
      piezas: desde(TIPOS_PUERTA, puertas, (d) => ({ color: d.defaultColor })),
    },
    {
      id: 'ventanas',
      nombre: 'Ventanas y vanos',
      icono: 'ventana',
      piezas: desde(VANOS_VENTANA, ventanas, conIcono),
    },
    {
      id: 'techos',
      nombre: 'Techos',
      icono: 'techo',
      unidad: 'por celda techada',
      piezas: desde(TECHO_FORMAS, techoPiezas, (d) => ({ icono: ICONO_TECHO[d.id] })),
    },
    {
      id: 'losetas',
      nombre: 'Losetas',
      icono: 'baldosa',
      unidad: 'por celda',
      piezas: desde(FORMAS_LOSETA, losetas, conIcono),
    },
    {
      id: 'pisoInterior',
      nombre: 'Piso interior',
      icono: 'baldosa',
      unidad: 'por cuarto',
      piezas: desde(PISOS, pisoInt, (d) => ({ emoji: d.emoji, color: d.color, clave: `piso.${d.id}` })),
    },
    {
      id: 'pisoExterior',
      nombre: 'Piso exterior',
      icono: 'pasto',
      unidad: 'por celda',
      piezas: desde(PISOS, pisoExt, (d) => ({ emoji: d.emoji, color: d.color, clave: `piso.${d.id}` })),
    },
    {
      id: 'accesos',
      nombre: 'Accesos entre plantas',
      icono: 'escalera',
      piezas: desde(ACCESOS, accesoPiezas, conIcono),
    },
  ]
}
