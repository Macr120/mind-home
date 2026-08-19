import { create } from 'zustand'
import { db, type AnimalGranja, type Corral, type TipoAccesorio, type TipoAnimal } from '../data/db'
import { nombreAleatorio } from '../house/nombresAnimales'
import { notificar } from '../notificaciones'
import { tGlobal } from '../i18n/useT'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import type { LadoRect } from '../house/ResizeCeldas3D'

export type HerramientaGranja =
  | 'corral'
  | 'animal'
  | 'alimentar'
  | 'mimar'
  | 'curar'
  | 'limpiar'
  | 'accesorio'
  | 'nombrar'
  | 'mover'
  | 'quitar'

export interface AnimalDef {
  nombre: string
  icon: string
  /** Horas sin comer a partir de las cuales el animal está hambriento. */
  horasHambre: number
}

/** Catálogo de animales de granja: viven en corrales rectangulares (varios por corral). */
export const ANIMALES: Record<TipoAnimal, AnimalDef> = {
  gallina: { nombre: 'Gallina', icon: '🐔', horasHambre: 4 },
  cerdo: { nombre: 'Cerdo', icon: '🐷', horasHambre: 8 },
  cabra: { nombre: 'Cabra', icon: '🐐', horasHambre: 8 },
  oveja: { nombre: 'Oveja', icon: '🐑', horasHambre: 10 },
  vaca: { nombre: 'Vaca', icon: '🐄', horasHambre: 12 },
  caballo: { nombre: 'Caballo', icon: '🐴', horasHambre: 10 },
}

/** Un animal está hambriento si venció la ventana de su especie desde la última comida. */
export const estaHambriento = (a: AnimalGranja, ahora: number): boolean =>
  ahora - a.alimentadoEn > ANIMALES[a.tipo].horasHambre * 3600_000

/**
 * Ventanas de hambre seguidas sin comer tras las cuales el animal ENFERMA: la
 * barra de comida se vacía en una, así que enfermar es llevar dos más en cero.
 */
export const FACTOR_ENFERMO = 3

export const estaEnfermo = (a: AnimalGranja, ahora: number): boolean =>
  ahora - a.alimentadoEn > ANIMALES[a.tipo].horasHambre * FACTOR_ENFERMO * 3600_000

/** Días que aguanta un animal enfermo antes de morir (desde que la app lo detecta). */
export const DIAS_MUERTE = 7

/** Días sin limpiar el corral a partir de los cuales se ensucia. */
export const DIAS_LIMPIEZA = 7

const DIA_MS = 86_400_000

/** Un corral sin limpiar en una semana: sus animales pierden el ánimo al doble. */
export const corralSucio = (c: Corral, ahora: number): boolean =>
  ahora - (c.limpiadoEn ?? 0) > DIAS_LIMPIEZA * DIA_MS

/** Horas sin mimos (caricias, baño o juego) a partir de las cuales se aburre. */
export const HORAS_ABURRIDO = 6

/**
 * Ventana de aburrimiento; en un corral sucio se parte a la mitad (el ánimo cae
 * al doble). Se aplica a todo el tiempo transcurrido, no por tramos: el resto
 * del sistema también deriva sus barras de una sola ventana fija.
 */
const ventanaAnimo = (sucio: boolean): number => HORAS_ABURRIDO * (sucio ? 0.5 : 1) * 3600_000

export const estaAburrido = (a: AnimalGranja, ahora: number, sucio = false): boolean =>
  ahora - (a.mimadoEn ?? 0) > ventanaAnimo(sucio)

/** Barra de comida 0–1 (1 recién comido; 0 justo al volverse hambriento). */
export const barraComida = (a: AnimalGranja, ahora: number): number =>
  Math.max(0, Math.min(1, 1 - (ahora - a.alimentadoEn) / (ANIMALES[a.tipo].horasHambre * 3600_000)))

/** Barra de ánimo 0–1 (los mimos y el juego la rellenan; 0 al aburrirse). */
export const barraAnimo = (a: AnimalGranja, ahora: number, sucio = false): number =>
  Math.max(0, Math.min(1, 1 - (ahora - (a.mimadoEn ?? 0)) / ventanaAnimo(sucio)))

/** Días que le quedan al enfermo antes de morir (para la etiqueta del mapa). */
export const diasParaMorir = (a: AnimalGranja, ahora: number): number =>
  Math.max(0, Math.ceil((a.enfermoDesde! + DIAS_MUERTE * DIA_MS - ahora) / DIA_MS))

/** Animales que caben por celda de corral. */
export const CAPACIDAD_POR_CELDA = 3

export const capacidadCorral = (c: Corral): number => c.ancho * c.alto * CAPACIDAD_POR_CELDA

export const corralContiene = (c: Corral, col: number, row: number): boolean =>
  col >= c.col && col < c.col + c.ancho && row >= c.row && row < c.row + c.alto

interface Rect {
  col: number
  row: number
  ancho: number
  alto: number
}

const adyacenteOrtogonal = (c: Corral, col: number, row: number): boolean =>
  corralContiene(c, col - 1, row) ||
  corralContiene(c, col + 1, row) ||
  corralContiene(c, col, row - 1) ||
  corralContiene(c, col, row + 1)

/** Rectángulo mínimo que cubre el corral y la celda nueva. */
const union = (c: Corral, col: number, row: number): Rect => {
  const c0 = Math.min(c.col, col)
  const r0 = Math.min(c.row, row)
  return {
    col: c0,
    row: r0,
    ancho: Math.max(c.col + c.ancho, col + 1) - c0,
    alto: Math.max(c.row + c.alto, row + 1) - r0,
  }
}

const solapan = (a: Rect, b: Rect): boolean =>
  a.col < b.col + b.ancho && b.col < a.col + a.ancho && a.row < b.row + b.alto && b.row < a.row + a.alto

const dentroDeGrid = (r: Rect): boolean => {
  const { gridCols, gridRows } = useLayout.getState()
  return r.col >= 0 && r.row >= 0 && r.col + r.ancho <= gridCols && r.row + r.alto <= gridRows
}

/** Rectángulo del corral tras crecer (+1) o encoger (−1) por un lado. */
export const rectRedimensionado = (c: Corral, lado: LadoRect, delta: 1 | -1) => {
  const r = { col: c.col, row: c.row, ancho: c.ancho, alto: c.alto }
  if (lado === 'izq') {
    r.col -= delta
    r.ancho += delta
  } else if (lado === 'der') {
    r.ancho += delta
  } else if (lado === 'arriba') {
    r.row -= delta
    r.alto += delta
  } else {
    r.alto += delta
  }
  return r
}

/** ¿Ese rectángulo cabe en el mapa sin pisar otro corral? */
export const cabeRect = (corrales: Corral[], id: number | undefined, r: Rect): boolean =>
  r.ancho >= 1 && r.alto >= 1 && dentroDeGrid(r) && !corrales.some((c) => c.id !== id && solapan(c, r))

/**
 * ¿Cabe el corral con su esquina en (col,row)? Cabe si no se sale del mapa ni
 * pisa a otro. Lo usan el arrastre en vivo (para dejar o no que el corral siga
 * al dedo) y la escritura final.
 */
export const cabeCorralEn = (corrales: Corral[], corral: Corral, col: number, row: number): boolean => {
  const destino = { col, row, ancho: corral.ancho, alto: corral.alto }
  return dentroDeGrid(destino) && !corrales.some((c) => c.id !== corral.id && solapan(c, destino))
}

/**
 * Alimenta a los hambrientos del corral (los de más hambre primero) consumiendo
 * de la cesta la especie más abundante, una unidad por cabeza. Los enfermos no
 * comen: hay que curarlos primero (si no, curar sería un sinónimo de alimentar).
 */
export async function alimentarCorral(
  corralId: number,
): Promise<'ok' | 'sinComida' | 'sinHambre' | 'hayEnfermos'> {
  const ahora = Date.now()
  const habitantes = await db.animales.where('corralId').equals(corralId).toArray()
  const hambrientos = habitantes
    .filter((a) => estaHambriento(a, ahora) && !estaEnfermo(a, ahora))
    .sort((a, b) => a.alimentadoEn - b.alimentadoEn)
  if (hambrientos.length === 0) {
    return habitantes.some((a) => estaEnfermo(a, ahora)) ? 'hayEnfermos' : 'sinHambre'
  }
  let alimentados = 0
  for (const a of hambrientos) {
    const cesta = (await db.cesta.toArray()).filter((c) => c.cantidad > 0)
    if (cesta.length === 0) break
    const mejor = cesta.reduce((x, y) => (y.cantidad > x.cantidad ? y : x))
    await db.cesta.update(mejor.id!, { cantidad: mejor.cantidad - 1 })
    await db.animales.update(a.id!, { alimentadoEn: Date.now() })
    alimentados++
  }
  return alimentados > 0 ? 'ok' : 'sinComida'
}

/** Acaricia a todos los animales del corral (renueva su ventana de mimos). */
export async function mimarCorral(corralId: number): Promise<void> {
  await db.animales.where('corralId').equals(corralId).modify({ mimadoEn: Date.now() })
}

/** Marca el mimo de un solo animal (lo usa el juego con accesorios). */
export async function mimarAnimal(animalId: number): Promise<void> {
  await db.animales.update(animalId, { mimadoEn: Date.now() })
}

/**
 * Cura a un animal: se le va la enfermedad y vuelve a comer. `enfermoDesde` en
 * `undefined` borra la propiedad en Dexie, que es lo que apaga el plazo de muerte.
 */
export async function curarAnimal(animalId: number): Promise<void> {
  await db.animales.update(animalId, { alimentadoEn: Date.now(), enfermoDesde: undefined })
}

/** Cura a los enfermos del corral. Devuelve cuántos había. */
export async function curarCorral(corralId: number): Promise<number> {
  const ahora = Date.now()
  const enfermos = (await db.animales.where('corralId').equals(corralId).toArray()).filter((a) =>
    estaEnfermo(a, ahora),
  )
  for (const a of enfermos) await curarAnimal(a.id!)
  return enfermos.length
}

/** Cura a los enfermos de todos los corrales. Devuelve cuántos animales. */
export async function curarTodos(): Promise<number> {
  const corrales = await db.corrales.toArray()
  let n = 0
  for (const c of corrales) if (c.id != null) n += await curarCorral(c.id)
  return n
}

/** Limpia el corral: reinicia la semana y el ánimo vuelve a caer a ritmo normal. */
export async function limpiarCorral(corralId: number): Promise<void> {
  await db.corrales.update(corralId, { limpiadoEn: Date.now() })
}

/** Limpia los corrales sucios. Devuelve cuántos lo estaban. */
export async function limpiarTodos(): Promise<number> {
  const ahora = Date.now()
  const sucios = (await db.corrales.toArray()).filter((c) => corralSucio(c, ahora))
  for (const c of sucios) await limpiarCorral(c.id!)
  return sucios.length
}

/**
 * Vigila la salud del rebaño: sella la enfermedad, y al vencer el plazo se lleva
 * al animal. Corre SOLO con la app abierta y a propósito: el plazo de muerte se
 * cuenta desde que la app detecta la enfermedad, no desde que empezó, así que
 * volver tras semanas fuera encuentra el corral enfermo pero vivo, con la semana
 * completa por delante para curarlo.
 */
export async function revisarGranja(): Promise<void> {
  const ahora = Date.now()
  for (const a of await db.animales.toArray()) {
    if (a.id == null) continue
    const nombre = a.nombre ?? tGlobal(`granja.animal.${a.tipo}`, ANIMALES[a.tipo].nombre)
    if (!estaEnfermo(a, ahora)) {
      if (a.enfermoDesde != null) await db.animales.update(a.id, { enfermoDesde: undefined })
      continue
    }
    if (a.enfermoDesde == null) {
      await db.animales.update(a.id, { enfermoDesde: ahora })
      await notificar({
        clave: `granja:enfermo:${a.id}`,
        titulo: tGlobal('granja.aviso.enfermo.titulo', '🤒 {nombre} enfermó', { nombre }),
        cuerpo: tGlobal('granja.aviso.enfermo.cuerpo', 'Cúralo en la granja: tienes {dias} días.', {
          dias: DIAS_MUERTE,
        }),
        plantillaId: 'granja',
      })
      continue
    }
    if (ahora - a.enfermoDesde > DIAS_MUERTE * DIA_MS) {
      await db.animales.delete(a.id)
      await notificar({
        clave: `granja:muerte:${a.id}`,
        titulo: tGlobal('granja.aviso.muerte.titulo', '💔 {nombre} murió', { nombre }),
        cuerpo: tGlobal('granja.aviso.muerte.cuerpo', 'Llevaba mucho enfermo sin que lo curaran.'),
        plantillaId: 'granja',
      })
    }
  }
}

/**
 * Alimenta a los animales de TODOS los corrales (lo pide el chat: «alimenta a
 * los animales»). Distingue cesta vacía de "nadie tiene hambre" para poder
 * responder con precisión.
 */
export async function alimentarTodos(): Promise<{
  ok: number
  sinComida: boolean
  enfermos: boolean
  corrales: number
}> {
  const corrales = await db.corrales.toArray()
  let ok = 0
  let sinComida = false
  let enfermos = false
  for (const c of corrales) {
    if (c.id == null) continue
    const r = await alimentarCorral(c.id)
    if (r === 'ok') ok++
    else if (r === 'sinComida') sinComida = true
    else if (r === 'hayEnfermos') enfermos = true
  }
  return { ok, sinComida, enfermos, corrales: corrales.length }
}

/** Acaricia a los animales de todos los corrales. Devuelve cuántos corrales. */
export async function mimarTodos(): Promise<number> {
  const corrales = await db.corrales.toArray()
  for (const c of corrales) if (c.id != null) await mimarCorral(c.id)
  return corrales.length
}

/**
 * Respaldos pre-v86 restaurados dejan animales con col/row y sin corral: les
 * fabrica su corral 1×1 (o los suma al que ya ocupe esa celda), nombre y mimos.
 */
async function repararCorralesHuerfanos(): Promise<void> {
  const [animales, corrales] = await Promise.all([db.animales.toArray(), db.corrales.toArray()])
  const ids = new Set(corrales.map((c) => c.id))
  for (const a of animales) {
    if (a.corralId != null && ids.has(a.corralId)) continue
    const col = a.col ?? 0
    const row = a.row ?? 0
    let corral = corrales.find((c) => corralContiene(c, col, row))
    if (!corral) {
      const id = await db.corrales.add({ col, row, ancho: 1, alto: 1, limpiadoEn: Date.now() })
      corral = { id, col, row, ancho: 1, alto: 1 }
      corrales.push(corral)
      ids.add(id)
    }
    await db.animales.update(a.id!, {
      corralId: corral.id!,
      nombre: a.nombre ?? nombreAleatorio(),
      mimadoEn: a.mimadoEn ?? Date.now(),
    })
  }
}

interface GranjaState {
  /** El editor de la granja está abierto (trabajando sobre el mapa). */
  activo: boolean
  herramienta: HerramientaGranja
  /** Tipo de animal a colocar con la herramienta 'animal'. */
  tipo: TipoAnimal
  /** Accesorio a colocar con la herramienta 'accesorio'. */
  accesorio: TipoAccesorio
  /** Corral elegido con 'nombrar' (el HUD lista sus animales) o con 'mover'. */
  corralSel: number | null
  /** Celda por la que se agarró el corral con 'mover': su nuevo sitio se calcula desde ahí. */
  moverDesde: { col: number; row: number } | null
  /** Arrastre en curso: dónde se está viendo el corral mientras el dedo lo lleva. */
  moverPreview: { id: number; col: number; row: number } | null
  setMoverPreview: (p: { id: number; col: number; row: number } | null) => void
  /** Lleva el corral a esa esquina (con sus accesorios). Devuelve false si no cabe. */
  moverCorral: (id: number, col: number, row: number) => Promise<boolean>
  /** Agranda (+1) o encoge (−1) el corral una cuadrícula por ese lado. */
  redimensionarCorral: (id: number, lado: LadoRect, delta: 1 | -1) => Promise<boolean>
  /** Aviso transitorio del overlay ('sinComida' | 'corralLleno' | 'noCabe'). */
  aviso: string | null
  iniciar: () => void
  salir: () => void
  setHerramienta: (h: HerramientaGranja) => void
  setTipo: (t: TipoAnimal) => void
  setAccesorio: (a: TipoAccesorio) => void
  seleccionarCorral: (id: number | null) => void
  renombrar: (animalId: number, nombre: string) => Promise<void>
  avisar: (clave: string) => void
  /** Aplica la herramienta activa sobre una celda del mapa (escribe a db). */
  aplicarEnCelda: (col: number, row: number) => Promise<void>
}

// Vista de juego a restaurar al salir del editor (solo iso/tercera/primera).
let vistaAnterior: Vista = 'iso'
let avisoTimer = 0

export const useGranja = create<GranjaState>((set, get) => ({
  activo: false,
  // Se entra en «Corral»: primero se dibuja el corral y solo después se mete el ganado.
  herramienta: 'corral',
  tipo: 'gallina',
  accesorio: 'pelota',
  corralSel: null,
  moverDesde: null,
  moverPreview: null,
  aviso: null,

  iniciar: () => {
    const layout = useLayout.getState()
    if (get().activo || layout.editMode) return
    // El editor de cuarto puede estar solo OCULTO (menú abierto): salir de él para
    // que al cerrarse el menú no se restaure encima de este editor.
    if (layout.editingRoomId) layout.editRoom(null)
    const casa = useHouse.getState()
    if (casa.activeRoom) casa.closeRoom()
    const v = useCam.getState().vista
    vistaAnterior = v === 'tercera' || v === 'primera' ? v : 'iso'
    useCam.getState().setVista('iso')
    set({ activo: true, herramienta: 'corral' })
    setCuartoAbierto(true)
    casa.target.set(playerPos.x, 0, playerPos.z)
    void repararCorralesHuerfanos()
    void revisarGranja()
  },

  salir: () => {
    if (!get().activo) return
    set({ activo: false, aviso: null, corralSel: null, moverDesde: null, moverPreview: null })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  // Pasar a «Mover» CONSERVA el corral que ya estuviera elegido (venía de Nombrar,
  // o de la pulsación larga en el mapa): ahí la selección es justo lo que se va a
  // arrastrar. `moverDesde` se vuelve a fijar con el primer toque.
  setHerramienta: (herramienta) =>
    set((s) => ({
      herramienta,
      corralSel: herramienta === 'mover' ? s.corralSel : null,
      moverDesde: null,
      moverPreview: null,
    })),

  setMoverPreview: (moverPreview) => set({ moverPreview }),

  moverCorral: async (id, col, row) => {
    const corrales = await db.corrales.toArray()
    const corral = corrales.find((c) => c.id === id)
    if (!corral) return false
    if (!cabeCorralEn(corrales, corral, col, row)) {
      get().avisar('noCabe')
      return false
    }
    const dcol = col - corral.col
    const drow = row - corral.row
    if (dcol === 0 && drow === 0) return true
    await db.corrales.update(id, {
      col,
      row,
      // Los accesorios guardan celda ABSOLUTA: viajan con el corral.
      accesorios: corral.accesorios?.map((a) => ({ ...a, col: a.col + dcol, row: a.row + drow })),
    })
    return true
  },

  redimensionarCorral: async (id, lado, delta) => {
    const corrales = await db.corrales.toArray()
    const corral = corrales.find((c) => c.id === id)
    if (!corral) return false
    const r = rectRedimensionado(corral, lado, delta)
    if (!cabeRect(corrales, id, r)) {
      get().avisar('noCabe')
      return false
    }
    // Encogiendo, el ganado tiene que seguir cabiendo dentro.
    const habitantes = await db.animales.where('corralId').equals(id).count()
    if (habitantes > r.ancho * r.alto * CAPACIDAD_POR_CELDA) {
      get().avisar('noCabeGanado')
      return false
    }
    await db.corrales.update(id, {
      col: r.col,
      row: r.row,
      ancho: r.ancho,
      alto: r.alto,
      // Lo que quede fuera del corral nuevo se retira (los accesorios son de dentro).
      accesorios: corral.accesorios?.filter(
        (a) => a.col >= r.col && a.col < r.col + r.ancho && a.row >= r.row && a.row < r.row + r.alto,
      ),
    })
    return true
  },
  setTipo: (tipo) => set({ tipo, herramienta: 'animal' }),
  setAccesorio: (accesorio) => set({ accesorio, herramienta: 'accesorio' }),
  seleccionarCorral: (corralSel) => set({ corralSel }),

  renombrar: async (animalId, nombre) => {
    const limpio = nombre.trim()
    if (limpio) await db.animales.update(animalId, { nombre: limpio })
  },

  avisar: (aviso) => {
    set({ aviso })
    window.clearTimeout(avisoTimer)
    avisoTimer = window.setTimeout(() => set({ aviso: null }), 2500)
  },

  aplicarEnCelda: async (col, row) => {
    const { herramienta, tipo, accesorio } = get()
    const corrales = await db.corrales.toArray()
    const bajo = corrales.find((c) => corralContiene(c, col, row))

    switch (herramienta) {
      case 'corral': {
        if (bajo) return
        // Junto a un corral: agrandarlo al rectángulo que cubra la celda nueva.
        const vecino = corrales.find((c) => adyacenteOrtogonal(c, col, row))
        if (vecino) {
          const bbox = union(vecino, col, row)
          const libre = !corrales.some((c) => c.id !== vecino.id && solapan(c, bbox))
          if (!dentroDeGrid(bbox) || !libre) {
            get().avisar('noCabe')
            return
          }
          await db.corrales.update(vecino.id!, {
            col: bbox.col,
            row: bbox.row,
            ancho: bbox.ancho,
            alto: bbox.alto,
          })
        } else {
          await db.corrales.add({ col, row, ancho: 1, alto: 1, limpiadoEn: Date.now() })
        }
        return
      }
      case 'animal': {
        // Clic fuera de todo corral: se estrena uno 1×1 en esa celda.
        let destino = bajo
        if (!destino) {
          const id = await db.corrales.add({ col, row, ancho: 1, alto: 1, limpiadoEn: Date.now() })
          destino = { id, col, row, ancho: 1, alto: 1 }
        }
        const n = await db.animales.where('corralId').equals(destino.id!).count()
        if (n >= capacidadCorral(destino)) {
          get().avisar('corralLleno')
          return
        }
        await db.animales.add({
          corralId: destino.id!,
          tipo,
          alimentadoEn: Date.now(),
          mimadoEn: Date.now(),
          nombre: nombreAleatorio(),
        })
        return
      }
      case 'alimentar': {
        if (bajo?.id == null) return
        const r = await alimentarCorral(bajo.id)
        if (r === 'sinComida' || r === 'hayEnfermos') get().avisar(r)
        return
      }
      case 'mimar':
        if (bajo?.id != null) await mimarCorral(bajo.id)
        return
      case 'curar':
        if (bajo?.id != null && (await curarCorral(bajo.id)) === 0) get().avisar('sinEnfermos')
        return
      case 'limpiar': {
        if (bajo?.id == null) return
        if (!corralSucio(bajo, Date.now())) get().avisar('yaLimpio')
        await limpiarCorral(bajo.id)
        return
      }
      case 'accesorio': {
        if (bajo?.id == null) return
        const lista = bajo.accesorios ?? []
        const existente = lista.find((a) => a.col === col && a.row === row)
        // Mismo tipo en la celda = quitar; distinto = reemplazar; vacía = añadir.
        const nueva =
          existente?.tipo === accesorio
            ? lista.filter((a) => a !== existente)
            : [...lista.filter((a) => a !== existente), { tipo: accesorio, col, row }]
        await db.corrales.update(bajo.id, { accesorios: nueva })
        return
      }
      case 'nombrar':
        get().seleccionarCorral(bajo?.id ?? null)
        return
      case 'mover': {
        const { corralSel, moverDesde } = get()
        // Sin corral agarrado (o sin celda de agarre), o tocando OTRO: se agarra ese
        // por ESTA celda, así el corral acaba donde el dedo lo suelta y no saltando
        // por su esquina.
        if (corralSel == null || !moverDesde || (bajo?.id != null && bajo.id !== corralSel)) {
          if (bajo?.id == null) return
          set({ corralSel: bajo.id, moverDesde: { col, row } })
          return
        }
        const corral = corrales.find((c) => c.id === corralSel)
        if (corral?.id == null || !moverDesde) return
        const dcol = col - moverDesde.col
        const drow = row - moverDesde.row
        if (dcol === 0 && drow === 0) return
        if (await get().moverCorral(corral.id, corral.col + dcol, corral.row + drow)) {
          set({ moverDesde: { col, row } })
        }
        return
      }
      case 'quitar': {
        if (bajo?.id == null) return
        // De a uno: último animal → accesorio de ESA celda → corral vacío.
        const habitantes = await db.animales.where('corralId').equals(bajo.id).toArray()
        if (habitantes.length > 0) {
          const ultimo = habitantes.reduce((a, b) => ((b.id ?? 0) > (a.id ?? 0) ? b : a))
          await db.animales.delete(ultimo.id!)
          return
        }
        const acc = (bajo.accesorios ?? []).find((a) => a.col === col && a.row === row)
        if (acc) {
          await db.corrales.update(bajo.id, { accesorios: bajo.accesorios!.filter((a) => a !== acc) })
          return
        }
        await db.corrales.delete(bajo.id)
        return
      }
    }
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useGranja: typeof useGranja }).useGranja = useGranja
}
