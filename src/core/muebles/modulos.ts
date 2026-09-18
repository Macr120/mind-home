import { armarMadera } from './armar/cajas'
import { armarMesa, armarMetal, armarSilla } from './armar/metal'
import {
  BASE_DEFECTO,
  FRENTES_DEFECTO,
  METAL_DEFECTO,
  TABLERO_DEFECTO,
  getTablero,
} from './materiales'
import { tGlobal } from '../i18n/useT'
import type {
  AvisoMueble,
  Cuerpo,
  EstructuraMueble,
  FormaMueble,
  IconoModulo,
  Mm,
  ModuloId,
  Mueble,
  ParteMueble,
} from './tipos'

/**
 * Catálogo de módulos prediseñados: qué se puede construir, entre qué medidas y
 * con qué parámetros propios. `normalizarMueble` es el portero — todo mutador
 * del taller pasa por él, así que ningún panel puede dejar una receta imposible.
 *
 * Son CUATRO modelos, no una lista de muebles: cada uno es paramétrico de sobra
 * para cubrir su familia entera. El de madera hace armario, librero, cajonera,
 * clóset y zapatera según lo que se le meta dentro, y el de estructura
 * metálica hace rack, burro de ropa y bastidor. Una lista larga obligaba a
 * acertar con el mueble ANTES de saber qué se quería, y cambiar de idea
 * después significaba empezar de cero.
 */

export interface RangoMm {
  min: Mm
  max: Mm
  def: Mm
  paso: Mm
}

export interface ParamModulo {
  /** Clave dentro de `Mueble.opciones`. */
  id: string
  clave: string
  nombreEs: string
  tipo: 'entero' | 'opcion' | 'bool'
  min?: number
  max?: number
  opciones?: { valor: string; clave: string; nombreEs: string }[]
  def: number | string | boolean
  /** Solo se muestra (y se aplica) si esto es cierto. */
  visible?: (m: Mueble) => boolean
}

export interface DefModulo {
  id: ModuloId
  clave: string
  nombreEs: string
  icono: IconoModulo
  /** Estructuras que admite; la primera es la que estrena. */
  estructuras: EstructuraMueble[]
  medidas: { ancho: RangoMm; alto: RangoMm; fondo: RangoMm }
  params: ParamModulo[]
  armar: (m: Mueble) => ParteMueble[]
  /**
   * Si el módulo se apoya en zócalo o patas. Con `false` el panel de estilo no
   * ofrece la base: enseñar un control que el armador ignora es peor que no
   * tenerlo (un rack metálico no lleva zócalo).
   */
  conBase?: (m: Mueble) => boolean
  /** Si el módulo puede llevar puertas (el panel de estilo ofrece las hojas). */
  conPuertas?: boolean
  /**
   * Si la carcasa lleva trasera (y fondos de cajón). Solo entonces se ofrecen
   * los controles de trasera: en una mesa o un rack no tapan nada.
   */
  conTrasera?: boolean
  /**
   * Si el perfil y la sección del metal salen de `Mueble.metal`. Con `false` el
   * único metal del módulo es de medida fija —el tubo de colgar, las patas
   * redondas— y esos dos controles no cambiarían nada.
   */
  metalPropio?: boolean
}

/** ¿Este mueble se apoya en base? (los módulos que no la dicen, sí). */
export const admiteBase = (m: Mueble): boolean => {
  const def = getModulo(m.moduloId)
  return def.conBase ? def.conBase(m) : true
}

/** ¿Este mueble admite puertas? */
export const admitePuertas = (m: Mueble): boolean =>
  getModulo(m.moduloId).conPuertas === true && m.forma !== 'circular'

/** Los parámetros de carcasa (columnas, cajones, tubo) no existen en planta circular. */
const soloRectangular = (m: Mueble): boolean => m.forma !== 'circular'

export const MODULOS: DefModulo[] = [
  {
    id: 'madera',
    clave: 'muebles.mod.madera',
    nombreEs: 'Módulo de madera',
    icono: 'madera',
    estructuras: ['tablero'],
    medidas: {
      ancho: { min: 300, max: 2400, def: 800, paso: 10 },
      alto: { min: 300, max: 2600, def: 2000, paso: 10 },
      fondo: { min: 200, max: 700, def: 450, paso: 10 },
    },
    params: [
      { id: 'columnas', clave: 'muebles.par.columnas', nombreEs: 'Columnas', tipo: 'entero', min: 1, max: 4, def: 1, visible: soloRectangular },
      { id: 'entrepanos', clave: 'muebles.par.entrepanos', nombreEs: 'Entrepaños', tipo: 'entero', min: 0, max: 8, def: 3 },
      { id: 'cajones', clave: 'muebles.par.cajonesInf', nombreEs: 'Cajones abajo', tipo: 'entero', min: 0, max: 6, def: 0, visible: soloRectangular },
      { id: 'barra', clave: 'muebles.par.barra', nombreEs: 'Tubo para colgar', tipo: 'bool', def: false, visible: soloRectangular },
      {
        id: 'inclinacion',
        clave: 'muebles.par.inclinacion',
        nombreEs: 'Inclinación',
        tipo: 'entero',
        min: 0,
        max: 20,
        def: 0,
        // Inclinar no significa nada si no hay entrepaños que inclinar.
        visible: (m) => soloRectangular(m) && Number(m.opciones.entrepanos ?? 0) > 0,
      },
    ],
    armar: armarMadera,
    conPuertas: true,
    conTrasera: true,
  },
  {
    id: 'metal',
    clave: 'muebles.mod.metal',
    nombreEs: 'Estructura metálica',
    icono: 'metal',
    estructuras: ['metal'],
    medidas: {
      ancho: { min: 400, max: 2400, def: 900, paso: 10 },
      alto: { min: 400, max: 2400, def: 1800, paso: 10 },
      fondo: { min: 300, max: 700, def: 450, paso: 10 },
    },
    params: [
      { id: 'niveles', clave: 'muebles.par.niveles', nombreEs: 'Niveles', tipo: 'entero', min: 2, max: 8, def: 5 },
      {
        id: 'repisa',
        clave: 'muebles.par.repisa',
        nombreEs: 'Repisa',
        tipo: 'opcion',
        def: 'tablero',
        opciones: [
          { valor: 'tablero', clave: 'muebles.par.repisaTablero', nombreEs: 'De tablero' },
          { valor: 'rejilla', clave: 'muebles.par.repisaRejilla', nombreEs: 'De rejilla' },
          { valor: 'ninguna', clave: 'muebles.par.repisaNinguna', nombreEs: 'Sin repisa' },
        ],
      },
      { id: 'barra', clave: 'muebles.par.barra', nombreEs: 'Tubo para colgar', tipo: 'bool', def: false },
      { id: 'ruedas', clave: 'muebles.par.ruedas', nombreEs: 'Ruedas', tipo: 'bool', def: false },
      { id: 'refuerzoX', clave: 'muebles.par.refuerzoX', nombreEs: 'Refuerzo en X', tipo: 'bool', def: false },
    ],
    armar: armarMetal,
    conBase: () => false,
    metalPropio: true,
  },
  {
    id: 'mesa',
    clave: 'muebles.mod.mesa',
    nombreEs: 'Mesa o escritorio',
    icono: 'mesa',
    estructuras: ['mixto'],
    medidas: {
      ancho: { min: 600, max: 2400, def: 1200, paso: 10 },
      alto: { min: 400, max: 1100, def: 750, paso: 10 },
      fondo: { min: 400, max: 900, def: 600, paso: 10 },
    },
    params: [
      {
        id: 'patas',
        clave: 'muebles.par.patas',
        nombreEs: 'Patas',
        tipo: 'opcion',
        def: 'tubo',
        opciones: [
          { valor: 'tablero', clave: 'muebles.par.patasTablero', nombreEs: 'Costados de tablero' },
          { valor: 'tubo', clave: 'muebles.par.patasTubo', nombreEs: 'Tubo metálico' },
          { valor: 'caballete', clave: 'muebles.par.patasCaballete', nombreEs: 'Caballete' },
        ],
      },
      { id: 'faldon', clave: 'muebles.par.faldon', nombreEs: 'Faldón', tipo: 'bool', def: false, visible: soloRectangular },
      { id: 'entrepano', clave: 'muebles.par.entrepanoMesa', nombreEs: 'Entrepaño bajo', tipo: 'bool', def: false },
      { id: 'voladizo', clave: 'muebles.par.voladizo', nombreEs: 'Voladizo', tipo: 'entero', min: 0, max: 150, def: 60 },
    ],
    armar: armarMesa,
    conBase: () => false,
    metalPropio: true,
  },
  {
    id: 'silla',
    clave: 'muebles.mod.silla',
    nombreEs: 'Silla',
    icono: 'silla',
    estructuras: ['mixto'],
    medidas: {
      // El alto es el TOTAL, respaldo incluido: el asiento es un parámetro.
      ancho: { min: 300, max: 800, def: 450, paso: 10 },
      alto: { min: 300, max: 1300, def: 850, paso: 10 },
      fondo: { min: 300, max: 800, def: 480, paso: 10 },
    },
    params: [
      {
        id: 'patas',
        clave: 'muebles.par.patas',
        nombreEs: 'Patas',
        tipo: 'opcion',
        def: 'tubo',
        opciones: [
          { valor: 'tubo', clave: 'muebles.par.patasTubo', nombreEs: 'Tubo metálico' },
          { valor: 'tablero', clave: 'muebles.par.patasTablero', nombreEs: 'Costados de tablero' },
        ],
      },
      {
        id: 'alturaAsiento',
        clave: 'muebles.par.alturaAsiento',
        nombreEs: 'Altura del asiento',
        tipo: 'entero',
        min: 300,
        max: 800,
        def: 450,
      },
      {
        id: 'travesanos',
        clave: 'muebles.par.travesanos',
        nombreEs: 'Travesaños',
        tipo: 'bool',
        def: true,
        visible: (m) => m.opciones.patas !== 'tablero',
      },
      {
        id: 'brazos',
        clave: 'muebles.par.brazos',
        nombreEs: 'Descansabrazos',
        tipo: 'bool',
        def: false,
        visible: (m) => m.opciones.patas !== 'tablero',
      },
    ],
    armar: armarSilla,
    conBase: () => false,
    metalPropio: true,
  },
]

/**
 * Módulos de antes de reducir el catálogo a cuatro: una receta guardada sigue
 * nombrándolos. Sin este mapa un rack se reabriría como módulo de madera (el
 * primero de la lista) y el usuario vería otro mueble.
 */
const HEREDADOS: Record<string, ModuloId> = {
  armario: 'madera',
  estante: 'madera',
  cajonera: 'madera',
  closet: 'madera',
  zapatera: 'madera',
  rack: 'metal',
}

export const getModulo = (id: ModuloId): DefModulo =>
  MODULOS.find((d) => d.id === id) ??
  MODULOS.find((d) => d.id === HEREDADOS[id]) ??
  MODULOS[0]

/** Nombre del módulo en el idioma activo: con el que nace un mueble nuevo. */
export const nombreDeFabrica = (def: DefModulo): string => tGlobal(def.clave, def.nombreEs)

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Opciones por defecto de un módulo. */
export function opcionesDefecto(def: DefModulo): Record<string, number | string | boolean> {
  return Object.fromEntries(def.params.map((p) => [p.id, p.def]))
}

/** Receta nueva con todos los valores por defecto del módulo. */
export function muebleNuevo(moduloId: ModuloId): Mueble {
  const def = getModulo(moduloId)
  const estructura = def.estructuras[0]
  return normalizarMueble({
    v: 1,
    moduloId,
    // El nombre es un dato del usuario (lo edita), pero nace en su idioma.
    nombre: nombreDeFabrica(def),
    medidas: { ancho: def.medidas.ancho.def, alto: def.medidas.alto.def, fondo: def.medidas.fondo.def },
    opciones: opcionesDefecto(def),
    forma: 'rectangular',
    estructura,
    tablero: { ...TABLERO_DEFECTO },
    metal: { ...METAL_DEFECTO },
    base: { ...BASE_DEFECTO, patas: { ...BASE_DEFECTO.patas } },
    // Sin puertas de entrada: el mueble nace abierto para que se vea lo que
    // hacen los parámetros (entrepaños, cajones); ponerle frentes es un chip.
    frentes: { ...FRENTES_DEFECTO },
  })
}

/**
 * Deja la receta dentro de lo posible: medidas en rango, opciones del módulo
 * actual (rellenando las que falten), estructura admitida, grosor que el
 * material fabrica y una base que no se coma el mueble.
 */
export function normalizarMueble(m: Mueble): Mueble {
  const def = getModulo(m.moduloId)
  const forma: FormaMueble = m.forma === 'circular' ? 'circular' : 'rectangular'
  const ancho = clamp(Math.round(m.medidas.ancho), def.medidas.ancho.min, def.medidas.ancho.max)
  const med = {
    ancho,
    alto: clamp(Math.round(m.medidas.alto), def.medidas.alto.min, def.medidas.alto.max),
    // Un disco tiene un solo diámetro: el fondo es el ancho, salte o no del
    // rango de fondo del módulo (una mesa redonda de 1200 mide 1200 de fondo).
    fondo:
      forma === 'circular'
        ? ancho
        : clamp(Math.round(m.medidas.fondo), def.medidas.fondo.min, def.medidas.fondo.max),
  }

  const opciones: Record<string, number | string | boolean> = {}
  for (const p of def.params) {
    const v = m.opciones[p.id]
    if (p.tipo === 'entero') {
      opciones[p.id] =
        typeof v === 'number' && Number.isFinite(v)
          ? clamp(Math.round(v), p.min ?? 0, p.max ?? 99)
          : p.def
    } else if (p.tipo === 'bool') {
      opciones[p.id] = typeof v === 'boolean' ? v : p.def
    } else {
      const validas = (p.opciones ?? []).map((o) => o.valor)
      opciones[p.id] = typeof v === 'string' && validas.includes(v) ? v : p.def
    }
  }

  const estructura = def.estructuras.includes(m.estructura) ? m.estructura : def.estructuras[0]
  const grosores = getTablero(m.tablero.materialId).grosores.filter((g) => g >= 15)
  const grosor = grosores.includes(m.tablero.grosor) ? m.tablero.grosor : (grosores[0] ?? 18)
  // La trasera tiene que existir en su grosor: si el material elegido no lo
  // fabrica, se cae al MDF, que es de lo que se hacen las traseras.
  const fondoDef = getTablero(m.tablero.materialFondo ?? 'mdf')
  const materialFondo = fondoDef.grosores.includes(m.tablero.grosorFondo) ? fondoDef.id : 'mdf'

  // La base no puede comerse más de la mitad del alto, ni el zoclo meterse más
  // que el fondo del mueble.
  const base = {
    ...m.base,
    // Un zócalo redondo sería una tira curvada, que no sale de una hoja: en
    // planta circular la base son patas.
    tipo: forma === 'circular' && m.base.tipo === 'zoclo' ? ('patas' as const) : m.base.tipo,
    altura: clamp(Math.round(m.base.altura), 0, Math.round(med.alto / 2)),
    retranqueo: clamp(Math.round(m.base.retranqueo), 0, Math.round(med.fondo / 2)),
  }

  return {
    ...m,
    v: 1,
    // Al normalizar se escribe el id vigente: así una receta heredada se
    // resuelve una sola vez y no en cada lectura.
    moduloId: def.id,
    forma,
    medidas: med,
    opciones,
    estructura,
    tablero: { ...m.tablero, grosor, materialFondo },
    base,
    frentes: {
      ...m.frentes,
      hojas: clamp(Math.round(m.frentes.hojas), 1, 4),
      holgura: clamp(Math.round(m.frentes.holgura), 0, 10),
    },
  }
}

/** Tope de partes: por encima el mapa 3D empieza a sufrir (un mesh por pieza). */
export const TOPE_PARTES = 160

/** Arma el mueble: la receta se convierte en cajas físicas en milímetros. */
export function armarMueble(receta: Mueble): Cuerpo {
  const m = normalizarMueble(receta)
  const avisos: AvisoMueble[] = []
  let partes = getModulo(m.moduloId).armar(m)
  if (partes.length > TOPE_PARTES) {
    partes = partes.slice(0, TOPE_PARTES)
    avisos.push({
      nivel: 'aviso',
      clave: 'muebles.aviso.topePartes',
      textoEs: 'El mueble tiene demasiadas piezas: se muestran solo las primeras.',
    })
  }
  return {
    partes,
    bbox: { ancho: m.medidas.ancho, alto: m.medidas.alto, fondo: m.medidas.fondo },
    avisos,
  }
}
