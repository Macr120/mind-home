import type { EnlaceObjetoApp, ObjetoCuarto } from '../data/db'
import type { TipoNodo } from '../grafo/memoria'
import type { NodoEntidadApp } from '../grafoApps'
import { tGlobal } from '../i18n/useT'
import { tono } from '../muebles/armar/comun'
import { muebleNuevo, normalizarMueble } from '../muebles/modulos'
import { piezas3DDeMueble } from '../muebles/piezas3d'
import type { ModuloId, Mueble } from '../muebles/tipos'
import { useDiseño } from '../state/disenoStore'
import { roomWorldPos, useLayout } from '../state/layoutStore'
import { aCuarto, aLocal, huecoEnMueble, NIVEL_SUELO, nivelAMano, superficiesDeObjeto } from './apoyos'
import { footprintDeObjeto } from './catalogo'
import { claveEntrada, colorDe, medidasEntrada, piezasEntrada, type FormaEntrada, type TipoEstante } from './formasEntrada'
import { defSeparable } from './separables'
import { FOOTPRINT_DEFAULT, SIZE, SIZE_DEFAULT } from './walls'

/**
 * Entradas de una app hechas objetos de la casa (un libro por obra, un frasco
 * por receta, una mancuerna por ejercicio…), acomodadas solas en el siguiente
 * hueco de un librero o estante, ya enlazadas a su entrada (tocarlas la abre).
 *
 * Los ESTANTES DE ENTRADAS crecen con ellas: nacen angostos en la esquina con
 * más muro libre y, al llenarse, su último módulo se ensancha hasta su ancho
 * estándar y luego se le pega otro al lado (el taller topa en 2.4 m), hasta
 * llegar al muro de enfrente, a una puerta o a otro mueble. Los módulos de un
 * estante comparten `grupoId`: arrastrar uno se lleva a todos con lo de encima.
 */

/** La forma que se elige en el panel: una concreta o, en Entretenimiento, «según la obra». */
export type FormaElegida = FormaEntrada | 'obra'

/** La forma de UNA entrada: con «según la obra», un libro va como libro y lo demás en caja. */
export function formaPara(forma: FormaElegida, e: EnlaceObjetoApp): FormaEntrada {
  if (forma !== 'obra') return forma
  return e.clase === 'libro' ? 'libro' : 'caja'
}

/** Un módulo de estante (mm): nace con `anchoMin` y crece hasta `ancho`. */
interface DefEstante {
  nombre: [clave: string, es: string]
  modulo: ModuloId
  ancho: number
  anchoMin: number
  alto: number
  fondo: number
  opciones: Mueble['opciones']
  color: string
}

export const ESTANTES: Record<TipoEstante, DefEstante> = {
  librero: {
    nombre: ['muebles.siembra.librero', 'Librero'],
    modulo: 'madera',
    ancho: 900,
    anchoMin: 450,
    alto: 1800,
    fondo: 330,
    opciones: { columnas: 1, entrepanos: 4, cajones: 0 },
    color: '#8b5a2b',
  },
  estante: {
    nombre: ['estantes.estante', 'Estante'],
    modulo: 'metal',
    ancho: 1000,
    anchoMin: 500,
    alto: 1800,
    fondo: 400,
    opciones: { niveles: 5, repisa: 'tablero' },
    color: '#475569',
  },
  'rack-mancuernas': {
    nombre: ['estantes.rack', 'Rack de mancuernas'],
    modulo: 'metal',
    ancho: 1600,
    anchoMin: 800,
    alto: 950,
    fondo: 500,
    opciones: { niveles: 3, repisa: 'tablero' },
    color: '#334155',
  },
  especiero: {
    nombre: ['estantes.especiero', 'Especiero'],
    modulo: 'madera',
    ancho: 600,
    anchoMin: 400,
    alto: 1500,
    fondo: 250,
    opciones: { columnas: 1, entrepanos: 5, cajones: 0 },
    color: '#a0522d',
  },
  vitrina: {
    nombre: ['estantes.vitrina', 'Vitrina de trofeos'],
    modulo: 'madera',
    ancho: 900,
    anchoMin: 500,
    alto: 1800,
    fondo: 400,
    opciones: { columnas: 1, entrepanos: 3, cajones: 0 },
    color: '#3f2a1d',
  },
  'repisa-marcos': {
    nombre: ['estantes.marcos', 'Repisa de portarretratos'],
    modulo: 'madera',
    ancho: 1200,
    anchoMin: 600,
    alto: 900,
    fondo: 300,
    opciones: { columnas: 1, entrepanos: 1, cajones: 0 },
    color: '#6b4423',
  },
}

/** Nombre del estante (traducido). */
export const nombreEstante = (tipo: TipoEstante): string => tGlobal(ESTANTES[tipo].nombre[0], ESTANTES[tipo].nombre[1])

/**
 * El estante especial de cada app, donde tiene sentido: sus entradas (`tipoNodo`)
 * y la forma que toman. Las metas de TODAS las apps van a la vitrina.
 */
export interface Tematico {
  estante?: TipoEstante
  forma: FormaElegida
  tipoNodo: TipoNodo
  todasLasApps?: boolean
}

export const TEMATICOS: Record<string, Tematico> = {
  ejercicio: { estante: 'rack-mancuernas', forma: 'mancuerna', tipoNodo: 'ejercicio' },
  cocina: { estante: 'especiero', forma: 'frasco', tipoNodo: 'receta' },
  metas: { estante: 'vitrina', forma: 'trofeo', tipoNodo: 'meta', todasLasApps: true },
  agenda: { estante: 'repisa-marcos', forma: 'marco', tipoNodo: 'persona' },
  sala: { estante: 'repisa-marcos', forma: 'marco', tipoNodo: 'lugar' },
  entretenimiento: { forma: 'obra', tipoNodo: 'obra' },
}

/** La entrada de un nodo del grafo, con lo que su objeto necesita para verse. */
export function entradaDeNodo(appId: string, n: NodoEntidadApp): EnlaceObjetoApp {
  const e: EnlaceObjetoApp = { plantillaId: appId, ref: n.ref, titulo: n.titulo }
  if (n.seccion) e.seccion = n.seccion
  if (n.dato) e.dato = n.dato
  if (n.clase) e.clase = n.clase
  if (n.pesoKg != null) e.pesoKg = n.pesoKg
  if (n.detalle) e.detalle = n.detalle
  return e
}

/** Receta de un módulo de `ancho` mm: la del estante o, al crecer, la del módulo vecino (mismo acabado). */
function recetaModulo(def: DefEstante, ancho: number, previa?: Mueble): Mueble {
  if (previa) return normalizarMueble({ ...previa, medidas: { ...previa.medidas, ancho } })
  const base = muebleNuevo(def.modulo)
  const metal = def.modulo === 'metal'
  return normalizarMueble({
    ...base,
    nombre: tGlobal(def.nombre[0], def.nombre[1]),
    medidas: { ancho, alto: def.alto, fondo: def.fondo },
    opciones: { ...base.opciones, ...def.opciones },
    tablero: { ...base.tablero, color: metal ? tono(def.color, 0.12) : def.color },
    metal: metal ? { ...base.metal, color: def.color } : base.metal,
  })
}

/** ¿`o` es un mueble donde acomodar entradas? Recetas con repisas rectas y los estantes separados. */
function sirveParaAcomodar(o: ObjetoCuarto): boolean {
  if (o.id == null) return false
  if (o.mueble) return superficiesDeObjeto(o).some((s) => !s.disco)
  return Boolean(o.separado && defSeparable(o)?.paraAcomodar)
}

/** Los módulos del estante de `m` (él solo si no es un estante que crece), del ancla hacia fuera. */
export function modulosDe(objetos: ObjetoCuarto[], m: ObjetoCuarto): ObjetoCuarto[] {
  if (!m.estante || !m.grupoId) return [m]
  const dir = m.estante.dir ?? 1
  return objetos
    .filter((o) => o.grupoId === m.grupoId && o.estante && o.id != null)
    .sort((a, b) => aLocal(m, a.x ?? 0, a.z ?? 0)[0] * dir - aLocal(m, b.x ?? 0, b.z ?? 0)[0] * dir)
}

/** Muebles del cuarto donde se puede acomodar algo; un estante de varios módulos cuenta una vez. */
export function mueblesParaAcomodar(objetos: ObjetoCuarto[], roomId: string): ObjetoCuarto[] {
  const vistos = new Set<string>()
  return objetos.filter((o) => {
    if (o.roomId !== roomId || !sirveParaAcomodar(o)) return false
    if (!o.estante || !o.grupoId) return true
    if (vistos.has(o.grupoId)) return false
    vistos.add(o.grupoId)
    return true
  })
}

// ── Sitio libre: muros, puertas y otros muebles ─────────────────────────────

/** Distancia (m) de un estante a los muros: el grueso del muro más un respiro. */
const HOLGURA_MURO = 0.2

interface Rect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Rectángulo (coords del cuarto) de algo de medio ancho `hx` y medio fondo `hz` girado `rotY` grados. */
function rectDe(x: number, z: number, rotY: number, hx: number, hz: number): Rect {
  const r = (rotY * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  const ex = c * hx + s * hz
  const ez = s * hx + c * hz
  return { minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez }
}

const cruzan = (a: Rect, b: Rect) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ

/** Qué impide poner un mueble: el muro (o salirse del cuarto), una puerta o otro objeto. */
export interface Obstaculo {
  tipo: 'muro' | 'puerta' | 'objeto'
  nombre?: string
}

/**
 * ¿Qué estorba al rectángulo `r` (coords del cuarto)? Sus esquinas deben caer
 * en el piso del cuarto (un cuarto en L no tiene piso en su muesca) y no cruzar
 * los muros, las zonas de paso de las puertas ni la huella de otro objeto que
 * esté en el suelo (lo de `ignorar` no cuenta: el propio estante y lo que lleva).
 */
function obstaculoEn(roomId: string, r: Rect, ignorar: Set<number>): Obstaculo | null {
  const L = useLayout.getState()
  const size = L.sizes[roomId] ?? SIZE_DEFAULT
  const fp = L.footprints[roomId] ?? FOOTPRINT_DEFAULT
  const enPiso = (x: number, z: number) => {
    const col = Math.floor((x + (size.w * SIZE) / 2) / SIZE)
    const row = Math.floor((z + (size.h * SIZE) / 2) / SIZE)
    return fp.some((c) => c.col === col && c.row === row)
  }
  const e = 0.01
  const esquinas: [number, number][] = [
    [r.minX + e, r.minZ + e],
    [r.maxX - e, r.minZ + e],
    [r.minX + e, r.maxZ - e],
    [r.maxX - e, r.maxZ - e],
  ]
  if (!esquinas.every(([x, z]) => enPiso(x, z))) return { tipo: 'muro' }
  const [cx, , cz] = roomWorldPos(roomId)
  const nivel = L.niveles[roomId] ?? 0
  const local = (b: Rect): Rect => ({ minX: b.minX - cx, maxX: b.maxX - cx, minZ: b.minZ - cz, maxZ: b.maxZ - cz })
  if ((L.wallCollidersByLevel[nivel] ?? []).some((b) => cruzan(r, local(b)))) return { tipo: 'muro' }
  if ((L.puertasPorNivel.get(nivel) ?? []).some((b) => cruzan(r, local(b)))) return { tipo: 'puerta' }
  for (const o of useDiseño.getState().objetos) {
    if (o.roomId !== roomId || o.id == null || ignorar.has(o.id)) continue
    // Lo que está encima de algo no ocupa suelo; lo que va en el suelo junto a su base, sí.
    if (o.apoyoId != null && o.apoyoNivel !== NIVEL_SUELO) continue
    const f = footprintDeObjeto(o)
    if (!f) continue
    const esc = o.mueble ? 1 : (o.escala ?? 1)
    if (cruzan(r, rectDe(o.x ?? 0, o.z ?? 0, o.rotY ?? 0, f[0] * esc, f[1] * esc))) {
      return { tipo: 'objeto', ...(o.nombre ? { nombre: o.nombre } : {}) }
    }
  }
  return null
}

/** Los ids del estante y de todo lo que lleva encima (no se estorban a sí mismos). */
function idsDelEstante(objetos: ObjetoCuarto[], modulos: ObjetoCuarto[]): Set<number> {
  const ids = new Set(modulos.map((m) => m.id!))
  for (let cambio = true; cambio; ) {
    cambio = false
    for (const o of objetos) {
      if (o.id != null && o.apoyoId != null && ids.has(o.apoyoId) && !ids.has(o.id)) {
        ids.add(o.id)
        cambio = true
      }
    }
  }
  return ids
}

/**
 * Metros libres a lo largo del muro desde el extremo `extremo` (x local del
 * mueble `m`) hacia `dir`, para un estante de `fondo` m: hasta el muro de
 * enfrente, una puerta u otro objeto (tope 12 m).
 */
function tramoLibre(m: Pick<ObjetoCuarto, 'x' | 'z' | 'rotY' | 'escala' | 'roomId'>, extremo: number, dir: 1 | -1, fondo: number, ignorar: Set<number>): number {
  const PASO = 0.1
  let libre = 0
  for (let largo = PASO; largo <= 12; largo += PASO) {
    const [x, z] = aCuarto(m, extremo + (dir * largo) / 2, 0)
    if (obstaculoEn(m.roomId, rectDe(x, z, m.rotY ?? 0, largo / 2, fondo / 2), ignorar)) break
    libre = largo
  }
  return libre
}

interface Sitio {
  x: number
  z: number
  rotY: number
  dir: 1 | -1
}

/**
 * Dónde nace un estante de `ancho` × `fondo` m: prueba las dos esquinas de cada
 * muro (trasera contra el muro, un costado contra el otro) y se queda con la que
 * deja más muro libre para crecer; a igual tramo, la más lejos de todo.
 */
function sitioParaEstante(roomId: string, ancho: number, fondo: number): Sitio | null {
  const size = useLayout.getState().sizes[roomId] ?? SIZE_DEFAULT
  const W = (size.w * SIZE) / 2
  const H = (size.h * SIZE) / 2
  const ax = ancho / 2 + HOLGURA_MURO
  const af = fondo / 2 + HOLGURA_MURO
  // rotY 0 = trasera al muro de arriba (z−); 180 al de abajo; 90 al de la izquierda; 270 al de la derecha.
  // `dir` es hacia dónde crece en su X local, lejos de la esquina.
  const candidatos: Sitio[] = [
    { x: -W + ax, z: -H + af, rotY: 0, dir: 1 },
    { x: W - ax, z: -H + af, rotY: 0, dir: -1 },
    { x: -W + ax, z: H - af, rotY: 180, dir: -1 },
    { x: W - ax, z: H - af, rotY: 180, dir: 1 },
    { x: -W + af, z: -H + ax, rotY: 90, dir: -1 },
    { x: -W + af, z: H - ax, rotY: 90, dir: 1 },
    { x: W - af, z: -H + ax, rotY: 270, dir: 1 },
    { x: W - af, z: H - ax, rotY: 270, dir: -1 },
  ]
  const nada = new Set<number>()
  const otros = useDiseño.getState().objetos.filter((o) => o.roomId === roomId)
  const lejania = (s: Sitio) => Math.min(Infinity, ...otros.map((o) => Math.hypot((o.x ?? 0) - s.x, (o.z ?? 0) - s.z)))
  let mejor: (Sitio & { tramo: number; lejos: number }) | null = null
  for (const s of candidatos) {
    const base = { ...s, roomId }
    if (obstaculoEn(roomId, rectDe(s.x, s.z, s.rotY, ancho / 2, fondo / 2), nada)) continue
    const tramo = tramoLibre(base, (-s.dir * ancho) / 2, s.dir, fondo, nada)
    const lejos = lejania(s)
    if (!mejor || tramo > mejor.tramo + 0.05 || (Math.abs(tramo - mejor.tramo) <= 0.05 && lejos > mejor.lejos)) {
      mejor = { ...s, tramo, lejos }
    }
  }
  return mejor && { x: mejor.x, z: mejor.z, rotY: mejor.rotY, dir: mejor.dir }
}

/**
 * Un estante de entradas nuevo en el cuarto: nace con el ancho mínimo de su
 * módulo en la esquina con más muro libre (sin sitio libre, al centro).
 * Devuelve el objeto creado.
 */
export async function crearEstante(roomId: string, tipo: TipoEstante): Promise<ObjetoCuarto | null> {
  const def = ESTANTES[tipo]
  const m = recetaModulo(def, def.anchoMin)
  const sitio = sitioParaEstante(roomId, m.medidas.ancho / 1000, m.medidas.fondo / 1000) ?? {
    x: 0,
    z: 0,
    rotY: 0,
    dir: 1 as const,
  }
  const id = await useDiseño.getState().addObjeto(roomId, 'piezas', def.color, undefined, { x: sitio.x, z: sitio.z }, {
    piezas: piezas3DDeMueble(m),
    mueble: m,
    nombre: m.nombre,
    rotY: sitio.rotY,
    estante: { tipo, dir: sitio.dir },
    grupoId: `estante-${Date.now().toString(36)}`,
  })
  return useDiseño.getState().objetos.find((o) => o.id === id) ?? null
}

/**
 * Hace sitio en el estante de `modulos` para algo de `anchoItem` m: ensancha el
 * último módulo o, ya en su ancho estándar, le pega otro. Devuelve lo que se lo
 * impidió, o null si creció.
 */
async function crecer(modulos: ObjetoCuarto[], anchoItem: number): Promise<Obstaculo | null> {
  const d = useDiseño.getState
  const ultimo = modulos[modulos.length - 1]
  const tipo = ultimo.estante!.tipo
  const def = ESTANTES[tipo]
  const esc = ultimo.escala ?? 1
  const actual = ultimo.mueble?.medidas.ancho ?? def.ancho
  const fondo = ((ultimo.mueble?.medidas.fondo ?? def.fondo) / 1000) * esc
  const rotY = ultimo.rotY ?? 0
  const ignorar = idsDelEstante(d().objetos, modulos)
  // Sin sentido guardado (el rack de la siembra): hacia donde quede más muro.
  let dir = ultimo.estante!.dir
  if (!dir) {
    const primero = modulos[0]
    const anchoIni = (primero.mueble?.medidas.ancho ?? def.ancho) / 2000
    const extremoFin = aLocal(primero, ultimo.x ?? 0, ultimo.z ?? 0)[0] + actual / 2000
    const extremoIni = -anchoIni
    const haciaMas = tramoLibre(primero, extremoFin, 1, fondo, ignorar)
    const haciaMenos = tramoLibre(primero, extremoIni, -1, fondo, ignorar)
    dir = haciaMas >= haciaMenos ? 1 : -1
  }
  const mm = Math.ceil(anchoItem * 1000)

  if (actual < def.ancho) {
    // Se ensancha dejando fijo el lado del ancla: su centro se corre medio aumento.
    const nuevo = Math.min(def.ancho, actual + Math.max(150, mm + 20))
    const delta = (nuevo - actual) / 1000
    const [x, z] = aCuarto(ultimo, (dir * delta) / 2, 0)
    const obst = obstaculoEn(ultimo.roomId, rectDe(x, z, rotY, (nuevo / 2000) * esc, fondo / 2), ignorar)
    if (obst) return obst
    const receta = recetaModulo(def, nuevo, ultimo.mueble)
    // La receta nueva con el centro quieto (lo de encima no se mueve) y luego el
    // centro, que no arrastra lo apoyado: todo queda en su sitio del mundo.
    await d().setObjetoMueble(ultimo.id!, receta)
    await d().setObjetoPiezas(ultimo.id!, piezas3DDeMueble(receta))
    await d().setObjetoPose(ultimo.id!, x, z, rotY)
    if (ultimo.estante!.dir !== dir) await d().parcharObjeto(ultimo.id!, { estante: { tipo, dir } })
    return null
  }

  // Ya en su ancho estándar: un módulo nuevo, pegado del lado que crece.
  const ancho = Math.min(def.ancho, Math.max(def.anchoMin, mm + 120))
  const [x, z] = aCuarto(ultimo, (dir * (actual / 2 + ancho / 2)) / 1000, 0)
  const obst = obstaculoEn(ultimo.roomId, rectDe(x, z, rotY, (ancho / 2000) * esc, fondo / 2), ignorar)
  if (obst) return obst
  const grupoId = ultimo.grupoId ?? `estante-${Date.now().toString(36)}`
  for (const m of modulos) {
    if (m.grupoId !== grupoId || m.estante?.dir !== dir) {
      await d().parcharObjeto(m.id!, { grupoId, estante: { tipo: m.estante?.tipo ?? tipo, dir } })
    }
  }
  const receta = recetaModulo(def, ancho, ultimo.mueble)
  await d().addObjeto(ultimo.roomId, 'piezas', ultimo.color, undefined, { x, z }, {
    piezas: piezas3DDeMueble(receta),
    mueble: receta,
    nombre: ultimo.nombre ?? receta.nombre,
    rotY,
    ...(ultimo.escala != null ? { escala: ultimo.escala } : {}),
    estante: { tipo, dir },
    grupoId,
  })
  return null
}

/** Motivo de que una entrada no cupiera: lo que frenó al estante, o que el mueble ya está lleno. */
export type MotivoLleno = Obstaculo | { tipo: 'lleno' }

export type ResultadoColocar = { id: number; movido: boolean } | { id: null; motivo: MotivoLleno }

/**
 * Pone `entrada` en el mueble `destino` como un objeto de `forma`, en su
 * siguiente hueco (el nivel a la mano primero). Si la entrada ya tenía su objeto
 * en la casa, ESE se muda aquí (una entrada, un objeto). Un estante de entradas
 * lleno crece; uno normal devuelve el motivo.
 */
export async function colocarEntrada(
  destino: ObjetoCuarto,
  entrada: EnlaceObjetoApp,
  forma: FormaEntrada,
): Promise<ResultadoColocar> {
  colocando++
  try {
    return await colocarEntradaYa(destino, entrada, forma)
  } finally {
    colocando--
  }
}

async function colocarEntradaYa(
  destino: ObjetoCuarto,
  entrada: EnlaceObjetoApp,
  forma: FormaEntrada,
): Promise<ResultadoColocar> {
  const d = useDiseño.getState
  const [ancho] = medidasEntrada(forma, entrada)
  const clave = claveEntrada(entrada)
  const previo = clave ? d().objetos.find((o) => o.formaEntrada && claveEntrada(o.enlaceApp) === clave) : undefined
  for (let intento = 0; intento < 60; intento++) {
    const fresco = d().objetos.find((o) => o.id === destino.id)
    if (!fresco) return { id: null, motivo: { tipo: 'lleno' } }
    const modulos = modulosDe(d().objetos, fresco)
    // El que se muda no ocupa su hueco viejo.
    const objetos = previo ? d().objetos.filter((o) => o.id !== previo.id) : d().objetos
    for (const m of modulos) {
      const hueco = huecoEnMueble(objetos, m, ancho, nivelAMano(superficiesDeObjeto(m)))
      if (!hueco) continue
      if (previo?.id != null) {
        await moverEntrada(previo, m, hueco, forma, entrada)
        // El estante de donde salió se encoge.
        if (previo.apoyoId != null && previo.apoyoId !== m.id) compactarLuego(previo.apoyoId)
        return { id: previo.id, movido: true }
      }
      const color = colorDe(entrada.titulo || entrada.plantillaId)
      const id = await d().addObjeto(m.roomId, 'piezas', color, undefined, { x: hueco.x, z: hueco.z }, {
        piezas: piezasEntrada(forma, color, entrada),
        ...(entrada.titulo ? { nombre: entrada.titulo } : {}),
        enlaceApp: entrada,
        formaEntrada: forma,
        rotY: m.rotY ?? 0,
        apoyoId: m.id,
        apoyoNivel: hueco.nivel,
      })
      // La altura exacta de la repisa la calcula el apoyo.
      await d().setObjetoApoyo(id, hueco.nivel)
      return { id, movido: false }
    }
    if (!fresco.estante) return { id: null, motivo: { tipo: 'lleno' } }
    const obst = await crecer(modulos, ancho)
    if (obst) return { id: null, motivo: obst }
  }
  return { id: null, motivo: { tipo: 'lleno' } }
}

/** Muda el objeto de una entrada a otro mueble (y otro cuarto, si hace falta), con la forma pedida. */
async function moverEntrada(
  o: ObjetoCuarto,
  m: ObjetoCuarto,
  hueco: { x: number; z: number; nivel: number },
  forma: FormaEntrada,
  entrada: EnlaceObjetoApp,
): Promise<void> {
  const d = useDiseño.getState()
  await d.parcharObjeto(o.id!, {
    roomId: m.roomId,
    x: hueco.x,
    z: hueco.z,
    rotY: m.rotY ?? 0,
    apoyoId: m.id,
    apoyoNivel: hueco.nivel,
    formaEntrada: forma,
  })
  // Con la entrada al día (y la forma nueva) se vuelve a armar; luego, la altura de la repisa.
  await d.setObjetoEnlaceApp(o.id!, entrada)
  await useDiseño.getState().setObjetoApoyo(o.id!, hueco.nivel)
}

/**
 * Acomoda de una vez varias entradas en el mueble, en orden. Devuelve cuántas
 * cupieron y, si no todas, qué lo impidió.
 */
export async function acomodarEntradas(
  destino: ObjetoCuarto,
  entradas: EnlaceObjetoApp[],
  forma: FormaElegida,
): Promise<{ n: number; motivo?: MotivoLleno }> {
  let n = 0
  for (const e of entradas) {
    const r = await colocarEntrada(destino, e, formaPara(forma, e))
    if (r.id == null) return { n, motivo: r.motivo }
    n++
  }
  return { n }
}

/**
 * Pone al día los objetos de entrada con lo que dicen sus apps: el título, el
 * subtipo y el peso (un récord nuevo agranda la mancuerna). Solo los que cambiaron.
 */
export async function refrescarEntradas(nodos: NodoEntidadApp[]): Promise<void> {
  const porRef = new Map(nodos.map((n) => [n.ref as string, n]))
  for (const o of useDiseño.getState().objetos) {
    const e = o.enlaceApp
    if (!o.formaEntrada || o.id == null || !e?.ref) continue
    const n = porRef.get(e.ref)
    if (!n) continue
    if (n.titulo === e.titulo && n.clase === e.clase && n.pesoKg === e.pesoKg && n.detalle === e.detalle) continue
    // La app del enlace se conserva: un trofeo de la vitrina abre Metas aunque la meta sea del gimnasio.
    const nueva = entradaDeNodo(e.plantillaId, n)
    await useDiseño.getState().setObjetoEnlaceApp(o.id, nueva)
    // Cambió de tamaño (la mancuerna de un récord nuevo): su estante se reacomoda para que no roce.
    if (o.apoyoId != null && medidasEntrada(o.formaEntrada, e)[0] !== medidasEntrada(o.formaEntrada, nueva)[0]) {
      if (useDiseño.getState().objetos.some((m) => m.id === o.apoyoId && m.estante)) compactarLuego(o.apoyoId)
    }
  }
}

/**
 * Pone al día los objetos de entrada de toda la casa (al cerrar una app, que es
 * cuando pudo cambiar un título o un récord). Sin objetos de entrada no carga nada.
 */
export async function refrescarEntradasDeCasa(): Promise<void> {
  if (!useDiseño.getState().objetos.some((o) => o.formaEntrada && o.enlaceApp?.ref)) return
  const { nodosDeApps, refrescarNodosDeApps } = await import('../grafoApps')
  refrescarNodosDeApps()
  await refrescarEntradas(await nodosDeApps())
}

// ── Encoger: el estante se ajusta a lo que lleva ───────────────────────────

/** Colocaciones en curso: mientras tanto no se compacta (se moverían bajo sus pies). */
let colocando = 0
const porCompactar = new Set<number>()
let reloj: ReturnType<typeof setTimeout> | null = null

/**
 * Pide compactar el estante del módulo `moduloId` en cuanto se calme (quitar
 * varias entradas seguidas lo compacta una vez).
 */
export function compactarLuego(moduloId: number): void {
  porCompactar.add(moduloId)
  if (reloj) clearTimeout(reloj)
  reloj = setTimeout(() => void vaciarCola(), 400)
}

async function vaciarCola(): Promise<void> {
  reloj = null
  if (colocando) {
    reloj = setTimeout(() => void vaciarCola(), 400)
    return
  }
  const ids = [...porCompactar]
  porCompactar.clear()
  const hechos = new Set<string>()
  for (const id of ids) {
    const m = useDiseño.getState().objetos.find((o) => o.id === id)
    if (!m?.estante) continue
    const clave = m.grupoId ?? `id-${id}`
    if (hechos.has(clave)) continue
    hechos.add(clave)
    await compactarEstante(m)
  }
}

/**
 * Vuelve a acomodar las entradas del estante de `m0` desde su esquina, en el
 * mismo orden, y lo deja del tamaño justo: angosta el último módulo y quita los
 * que sobran (o, si una entrada creció —un récord nuevo—, le hace sitio igual
 * que al crecer). Un estante con algo que no es una entrada (un florero puesto a
 * mano) no se toca: ese sitio lo eligió el usuario.
 */
async function compactarEstante(m0: ObjetoCuarto): Promise<void> {
  const d = useDiseño.getState
  const modulos = modulosDe(d().objetos, m0)
  const ancla = modulos[0]
  const tipo = ancla.estante?.tipo
  if (!tipo || modulos.some((m) => !m.mueble)) return
  const def = ESTANTES[tipo]
  const idsModulos = new Set(modulos.map((m) => m.id!))
  const encima = d().objetos.filter((o) => o.apoyoId != null && idsModulos.has(o.apoyoId) && o.apoyoNivel !== NIVEL_SUELO)
  if (encima.some((o) => !o.formaEntrada)) return

  const dir = ancla.estante!.dir ?? 1
  const esc = ancla.escala ?? 1
  const rotY = ancla.rotY ?? 0
  const anchoMm = (m: ObjetoCuarto) => m.mueble!.medidas.ancho
  const fondo = (ancla.mueble!.medidas.fondo / 1000) * esc
  // El lado del ancla (la esquina donde nació) queda fijo.
  const [bx, bz] = aCuarto(ancla, (-dir * anchoMm(ancla)) / 2000, 0)
  const borde = { x: bx, z: bz, rotY, escala: esc }
  const extension = modulos.reduce((t, m) => t + anchoMm(m), 0)
  const construir = (anchos: number[]): ObjetoCuarto[] => {
    let desde = 0
    return anchos.map((w, k) => {
      const previa = modulos[Math.min(k, modulos.length - 1)]
      const [x, z] = aCuarto(borde, (dir * (desde + w / 2)) / 1000, 0)
      desde += w
      return { ...previa, id: modulos[k]?.id ?? -(k + 1), x, z, mueble: recetaModulo(def, w, previa.mueble) }
    })
  }

  // El mismo orden que «Acomodar todas»: por peso (las mancuernas) o por título.
  // Estable: compactar dos veces deja todo igual.
  const items = [...encima].sort((a, b) => {
    const pa = a.enlaceApp?.pesoKg
    const pb = b.enlaceApp?.pesoKg
    if (pa != null && pb != null && pa !== pb) return pa - pb
    return (a.enlaceApp?.titulo ?? a.nombre ?? '').localeCompare(b.enlaceApp?.titulo ?? b.nombre ?? '') || a.id! - b.id!
  })

  // Se acomoda en limpio sobre módulos «de papel»; nada se escribe hasta que cabe todo.
  const anchos = [def.anchoMin]
  let virtuales = construir(anchos)
  const colocados: ObjetoCuarto[] = []
  const plan: { o: ObjetoCuarto; k: number; x: number; z: number; nivel: number }[] = []
  const ignorar = idsDelEstante(d().objetos, modulos)
  for (const o of items) {
    const [ancho] = medidasEntrada(o.formaEntrada!, o.enlaceApp)
    for (let intento = 0; ; intento++) {
      if (intento > 40) return
      let hueco: { x: number; z: number; nivel: number } | null = null
      let k = 0
      for (; k < virtuales.length; k++) {
        hueco = huecoEnMueble(colocados, virtuales[k], ancho, nivelAMano(superficiesDeObjeto(virtuales[k])))
        if (hueco) break
      }
      if (hueco) {
        plan.push({ o, k, ...hueco })
        colocados.push({ ...o, x: hueco.x, z: hueco.z, apoyoId: virtuales[k].id, apoyoNivel: hueco.nivel })
        break
      }
      const mm = Math.ceil(ancho * 1000)
      const u = anchos.length - 1
      if (anchos[u] < def.ancho) anchos[u] = Math.min(def.ancho, anchos[u] + Math.max(150, mm + 20))
      else anchos.push(Math.min(def.ancho, Math.max(def.anchoMin, mm + 120)))
      virtuales = construir(anchos)
      // Más largo que ahora (una entrada creció): lo nuevo debe estar libre.
      if (anchos.reduce((t, w) => t + w, 0) > extension) {
        const v = virtuales[virtuales.length - 1]
        const w = anchos[anchos.length - 1]
        if (obstaculoEn(ancla.roomId, rectDe(v.x ?? 0, v.z ?? 0, rotY, (w / 2000) * esc, fondo / 2), ignorar)) return
      }
    }
  }

  // ¿Cambia algo? Mismos módulos y cada entrada a menos de 1 cm de su sitio: nada que hacer.
  const igual =
    anchos.length === modulos.length &&
    anchos.every((w, k) => Math.abs(w - anchoMm(modulos[k])) < 1) &&
    plan.every(
      (p) =>
        p.o.apoyoId === virtuales[p.k].id &&
        p.o.apoyoNivel === p.nivel &&
        Math.hypot((p.o.x ?? 0) - p.x, (p.o.z ?? 0) - p.z) < 0.01,
    )
  if (igual) return

  colocando++
  try {
    // 1. Los módulos que quedan, a su ancho y su sitio; los que faltan, nuevos.
    const idReal: number[] = []
    for (let k = 0; k < virtuales.length; k++) {
      const v = virtuales[k]
      const m = modulos[k]
      if (m) {
        idReal[k] = m.id!
        const cambio = Math.abs(anchos[k] - anchoMm(m)) >= 1 || Math.hypot((m.x ?? 0) - (v.x ?? 0), (m.z ?? 0) - (v.z ?? 0)) > 0.001
        if (!cambio) continue
        await d().setObjetoMueble(m.id!, v.mueble!)
        await d().setObjetoPiezas(m.id!, piezas3DDeMueble(v.mueble!))
        await d().setObjetoPose(m.id!, v.x ?? 0, v.z ?? 0, rotY)
        continue
      }
      const grupoId = ancla.grupoId ?? `estante-${Date.now().toString(36)}`
      if (!ancla.grupoId) await d().parcharObjeto(ancla.id!, { grupoId, estante: { tipo, dir } })
      idReal[k] = await d().addObjeto(ancla.roomId, 'piezas', ancla.color, undefined, { x: v.x ?? 0, z: v.z ?? 0 }, {
        piezas: piezas3DDeMueble(v.mueble!),
        mueble: v.mueble,
        nombre: ancla.nombre ?? v.mueble!.nombre,
        rotY,
        ...(ancla.escala != null ? { escala: ancla.escala } : {}),
        estante: { tipo, dir },
        grupoId,
      })
    }
    // 2. Cada entrada a su hueco nuevo (y a la altura de su repisa).
    for (const p of plan) {
      await d().parcharObjeto(p.o.id!, { x: p.x, z: p.z, rotY, apoyoId: idReal[p.k], apoyoNivel: p.nivel })
      await d().setObjetoApoyo(p.o.id!, p.nivel)
    }
    // 3. Los módulos que sobran, ya vacíos.
    for (const m of modulos.slice(virtuales.length)) await d().removeObjeto(m.id!)
  } finally {
    colocando--
  }
}
