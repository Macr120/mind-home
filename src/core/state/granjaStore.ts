import { create } from 'zustand'
import { db, type AnimalGranja, type Corral, type TipoAccesorio, type TipoAnimal } from '../data/db'
import { nombreAleatorio } from '../house/nombresAnimales'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'

export type HerramientaGranja = 'corral' | 'animal' | 'alimentar' | 'mimar' | 'accesorio' | 'nombrar' | 'quitar'

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
}

/** Un animal está hambriento si venció la ventana de su especie desde la última comida. */
export const estaHambriento = (a: AnimalGranja, ahora: number): boolean =>
  ahora - a.alimentadoEn > ANIMALES[a.tipo].horasHambre * 3600_000

/** Horas sin mimos (caricias, baño o juego) a partir de las cuales se aburre. */
export const HORAS_ABURRIDO = 6

export const estaAburrido = (a: AnimalGranja, ahora: number): boolean =>
  ahora - (a.mimadoEn ?? 0) > HORAS_ABURRIDO * 3600_000

/** Barra de comida 0–1 (1 recién comido; 0 justo al volverse hambriento). */
export const barraComida = (a: AnimalGranja, ahora: number): number =>
  Math.max(0, Math.min(1, 1 - (ahora - a.alimentadoEn) / (ANIMALES[a.tipo].horasHambre * 3600_000)))

/** Barra de ánimo 0–1 (los mimos y el juego la rellenan; 0 al aburrirse). */
export const barraAnimo = (a: AnimalGranja, ahora: number): number =>
  Math.max(0, Math.min(1, 1 - (ahora - (a.mimadoEn ?? 0)) / (HORAS_ABURRIDO * 3600_000)))

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

/**
 * Alimenta a los hambrientos del corral (los de más hambre primero) consumiendo
 * de la cesta la especie más abundante, una unidad por cabeza.
 */
export async function alimentarCorral(corralId: number): Promise<'ok' | 'sinComida' | 'sinHambre'> {
  const ahora = Date.now()
  const hambrientos = (await db.animales.where('corralId').equals(corralId).toArray())
    .filter((a) => estaHambriento(a, ahora))
    .sort((a, b) => a.alimentadoEn - b.alimentadoEn)
  if (hambrientos.length === 0) return 'sinHambre'
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
 * Alimenta a los animales de TODOS los corrales (lo pide el chat: «alimenta a
 * los animales»). Distingue cesta vacía de "nadie tiene hambre" para poder
 * responder con precisión.
 */
export async function alimentarTodos(): Promise<{ ok: number; sinComida: boolean; corrales: number }> {
  const corrales = await db.corrales.toArray()
  let ok = 0
  let sinComida = false
  for (const c of corrales) {
    if (c.id == null) continue
    const r = await alimentarCorral(c.id)
    if (r === 'ok') ok++
    else if (r === 'sinComida') sinComida = true
  }
  return { ok, sinComida, corrales: corrales.length }
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
      const id = await db.corrales.add({ col, row, ancho: 1, alto: 1 })
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
  /** Corral elegido con la herramienta 'nombrar' (el HUD lista sus animales). */
  corralSel: number | null
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
  herramienta: 'animal',
  tipo: 'gallina',
  accesorio: 'pelota',
  corralSel: null,
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
    set({ activo: true, herramienta: 'animal' })
    setCuartoAbierto(true)
    casa.target.set(playerPos.x, 0, playerPos.z)
    void repararCorralesHuerfanos()
  },

  salir: () => {
    if (!get().activo) return
    set({ activo: false, aviso: null, corralSel: null })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  setHerramienta: (herramienta) => set({ herramienta, corralSel: null }),
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
          await db.corrales.add({ col, row, ancho: 1, alto: 1 })
        }
        return
      }
      case 'animal': {
        // Clic fuera de todo corral: se estrena uno 1×1 en esa celda.
        let destino = bajo
        if (!destino) {
          const id = await db.corrales.add({ col, row, ancho: 1, alto: 1 })
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
        if ((await alimentarCorral(bajo.id)) === 'sinComida') get().avisar('sinComida')
        return
      }
      case 'mimar':
        if (bajo?.id != null) await mimarCorral(bajo.id)
        return
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
