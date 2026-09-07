import { create } from 'zustand'
import type { FormaLibre, MuroLibre, PuntoUV, TipoFormaLibre, VanoLibre } from '../data/db'
import { formasLibresRepo, eliminarMuroLibre } from '../data/repository'
import { usePlanos } from './planosStore'
import { useLayout } from './layoutStore'
import { useDiseño } from './disenoStore'
import { useCuartos } from './cuartosStore'
import { useHistorialEditor } from './historialEditorStore'
import { FOOTPRINT_DEFAULT } from '../house/walls'
import {
  ANCHO_PUERTA_LIBRE,
  ANCHO_VENTANA_LIBRE,
  MIN_PUNTOS_CERRAR,
  contornoCuartoUV,
  contornoMuro,
  formaCerrada,
  imanMediaCelda,
  longitudContorno,
  poligonoDeMuroLibre,
  segmentosDeContorno,
  uvAMundo,
} from '../house/formasLibre'

/**
 * Edición de las formas de construcción LIBRE (modo «Libre» del constructor). Guarda solo
 * lo transitorio: el borrador que se está dibujando, la copia viva de la forma que se
 * arrastra (se persiste al soltar, para no inundar la cola de sync por cada frame) y el
 * hover. La lista de formas vive en `formasLibresRepo` (render) y en
 * `useLayout.formasLibres` (colisión; la sincroniza `FormasLibres3D`).
 */

/** Qué hay bajo el puntero (hit-test geométrico compartido por croquis y 3D). */
export type HitLibre =
  | { tipo: 'vertice'; id: number; i: number }
  /** Punto medio del tramo i→i+1 de la forma seleccionada (insertar vértice). */
  | { tipo: 'tramo'; id: number; i: number; x: number; z: number }
  | { tipo: 'forma'; id: number }
  /** Muro libre de REJILLA (arista/forma): candidato a convertirse en forma libre. */
  | { tipo: 'muroRejilla'; id: number }
  /** Cuarto de rejilla: candidato a «liberar» su forma. */
  | { tipo: 'cuarto'; roomId: string }
  | null

type Arrastre =
  | { clase: 'vertice'; id: number; i: number; movio: boolean }
  | { clase: 'forma'; id: number; desde: PuntoUV; base: PuntoUV[]; movio: boolean }
  | null

interface FormaLibreState {
  /** Tipo con el que se crearán las formas nuevas. */
  tipoNuevo: TipoFormaLibre
  /** Las formas nuevas nacen con curva suave. */
  suaveNuevo: boolean
  /** Imán a la media celda al poner o arrastrar vértices. */
  iman: boolean
  /** Vértices (UV) de la forma que se está dibujando; null = sin borrador. */
  borrador: PuntoUV[] | null
  /** Copia viva de los vértices de la forma que se edita (arrastre en curso). */
  edicion: { id: number; puntos: PuntoUV[] } | null
  arrastre: Arrastre
  hover: HitLibre
  setTipoNuevo: (t: TipoFormaLibre) => void
  setSuaveNuevo: (v: boolean) => void
  setIman: (v: boolean) => void
  setHover: (h: HitLibre) => void
  agregarPuntoBorrador: (p: PuntoUV) => void
  /** Trazo a mano alzada (ya simplificado) que se añade al borrador. */
  agregarTrazoBorrador: (pts: PuntoUV[]) => void
  quitarUltimoBorrador: () => void
  cancelarBorrador: () => void
  /** Crea la forma con el borrador (cerrada si `cerrar` o si el tipo lo exige). Devuelve el id. */
  terminarBorrador: (cerrar: boolean) => Promise<number | null>
  empezarArrastreVertice: (f: FormaLibre, i: number) => void
  empezarArrastreForma: (f: FormaLibre, desde: PuntoUV) => void
  /** Mueve en vivo (sin persistir); `p` en UV. */
  moverArrastre: (p: PuntoUV) => void
  /** Persiste el arrastre y lo cierra. Devuelve true si la forma cambió. */
  soltarArrastre: () => Promise<boolean>
  /** Inserta un vértice tras el índice i y deja la forma lista para arrastrarlo. */
  insertarVertice: (f: FormaLibre, i: number, p: PuntoUV) => Promise<void>
  borrarVertice: (f: FormaLibre, i: number) => Promise<void>
  /** Pone un vano en u (0…1 del contorno) o lo quita si ya había uno encima. */
  alternarVano: (f: FormaLibre, u: number, tipo: 'puerta' | 'ventana') => Promise<void>
  quitarVano: (f: FormaLibre, indice: number) => Promise<void>
  actualizarVano: (f: FormaLibre, indice: number, patch: Partial<VanoLibre>) => Promise<void>
  actualizarForma: (id: number, patch: Partial<FormaLibre>) => Promise<void>
  eliminarForma: (id: number) => Promise<void>
  /** Muro libre de rejilla → forma libre equivalente (borra el de rejilla). */
  liberarMuroRejilla: (m: MuroLibre) => Promise<number | null>
  /** Cuarto → recinto libre con su contorno; el cuarto queda «sin muros». */
  liberarCuarto: (roomId: string) => Promise<number | null>
}

const agrupar = <T>(fn: () => Promise<T>): Promise<T> => useHistorialEditor.getState().agrupar(fn)

const ESTILO_MURO_DEFECTO = { muroTipo: 'solido', muroColor: '#8c8073', alto: 1 }
const ESTILO_PISO_DEFECTO = { pisoTipo: 'madera' as string | null }

const rejilla = () => {
  const { gridCols, gridRows } = useLayout.getState()
  return { gridCols, gridRows }
}

/** Longitud (metros) del contorno de control de una forma (sin suavizar). */
function largoControl(puntos: PuntoUV[], cerrada: boolean): number {
  const { gridCols, gridRows } = rejilla()
  const pts = puntos.map((p) => uvAMundo(p, gridCols, gridRows))
  let L = 0
  for (const s of segmentosDeContorno(pts, cerrada)) L += Math.hypot(s.x2 - s.x1, s.z2 - s.z1)
  return L
}

export const useFormaLibre = create<FormaLibreState>((set, get) => ({
  tipoNuevo: 'muro',
  suaveNuevo: false,
  iman: false,
  borrador: null,
  edicion: null,
  arrastre: null,
  hover: null,

  setTipoNuevo: (tipoNuevo) => set({ tipoNuevo }),
  setSuaveNuevo: (suaveNuevo) => set({ suaveNuevo }),
  setIman: (iman) => set({ iman }),
  setHover: (hover) => set((s) => (mismoHit(s.hover, hover) ? {} : { hover })),

  agregarPuntoBorrador: (p) =>
    set((s) => {
      const q = s.iman ? imanMediaCelda(p) : p
      const b = s.borrador ?? []
      const ult = b[b.length - 1]
      // Dos toques en el mismo sitio no duplican el vértice.
      if (ult && Math.hypot(ult.u - q.u, ult.v - q.v) < 0.01) return {}
      return { borrador: [...b, q] }
    }),
  agregarTrazoBorrador: (pts) =>
    set((s) => {
      if (!pts.length) return {}
      const b = s.borrador ?? []
      // El primer punto del trazo empalma con el último del borrador si coinciden.
      const ult = b[b.length - 1]
      const inicio = ult && Math.hypot(ult.u - pts[0].u, ult.v - pts[0].v) < 0.05 ? 1 : 0
      return { borrador: [...b, ...pts.slice(inicio)] }
    }),
  quitarUltimoBorrador: () =>
    set((s) => {
      if (!s.borrador) return {}
      const b = s.borrador.slice(0, -1)
      return { borrador: b.length ? b : null }
    }),
  cancelarBorrador: () => set({ borrador: null }),

  terminarBorrador: async (cerrar) => {
    const { borrador, tipoNuevo, suaveNuevo } = get()
    if (!borrador) return null
    const cerrada = tipoNuevo !== 'muro' || cerrar
    if (borrador.length < (cerrada ? MIN_PUNTOS_CERRAR : 2)) return null
    const nivel = usePlanos.getState().nivel
    const id = await formasLibresRepo.add({
      nivel,
      tipo: tipoNuevo,
      puntos: borrador,
      cerrada,
      suave: suaveNuevo,
      ...(tipoNuevo !== 'piso' ? ESTILO_MURO_DEFECTO : {}),
      ...(tipoNuevo !== 'muro' ? ESTILO_PISO_DEFECTO : {}),
      fecha: Date.now(),
    })
    set({ borrador: null })
    usePlanos.getState().setFormaLibreSel(id)
    return id
  },

  empezarArrastreVertice: (f, i) => {
    if (f.id == null) return
    set({ arrastre: { clase: 'vertice', id: f.id, i, movio: false }, edicion: { id: f.id, puntos: f.puntos.slice() } })
  },
  empezarArrastreForma: (f, desde) => {
    if (f.id == null) return
    set({
      arrastre: { clase: 'forma', id: f.id, desde, base: f.puntos.slice(), movio: false },
      edicion: { id: f.id, puntos: f.puntos.slice() },
    })
  },
  moverArrastre: (p) =>
    set((s) => {
      const a = s.arrastre
      if (!a || !s.edicion) return {}
      if (a.clase === 'vertice') {
        const q = s.iman ? imanMediaCelda(p) : p
        const v0 = s.edicion.puntos[a.i]
        if (v0 && Math.hypot(v0.u - q.u, v0.v - q.v) < 1e-6) return {}
        const puntos = s.edicion.puntos.map((v, k) => (k === a.i ? q : v))
        return { edicion: { id: a.id, puntos }, arrastre: { ...a, movio: true } }
      }
      const du = p.u - a.desde.u
      const dv = p.v - a.desde.v
      const puntos = a.base.map((v) => ({ u: v.u + du, v: v.v + dv }))
      return { edicion: { id: a.id, puntos }, arrastre: { ...a, movio: a.movio || Math.hypot(du, dv) > 1e-3 } }
    }),
  soltarArrastre: async () => {
    const { arrastre, edicion } = get()
    if (!arrastre || !edicion) {
      set({ arrastre: null, edicion: null })
      return false
    }
    // Un toque sin mover no escribe nada (ni Dexie, ni sync, ni recompute de colisión).
    if (!arrastre.movio) {
      set({ arrastre: null, edicion: null })
      return false
    }
    // La copia viva se conserva hasta que el repo reemita la fila nueva: si se soltara
    // antes, la forma saltaría a su posición vieja durante unos milisegundos.
    set({ arrastre: null })
    await formasLibresRepo.update(edicion.id, { puntos: edicion.puntos, fecha: Date.now() })
    set((s) => (s.arrastre == null && s.edicion?.id === edicion.id ? { edicion: null } : {}))
    return true
  },

  insertarVertice: async (f, i, p) => {
    if (f.id == null) return
    const q = get().iman ? imanMediaCelda(p) : p
    const puntos = [...f.puntos.slice(0, i + 1), q, ...f.puntos.slice(i + 1)]
    // El vértice nuevo vive en la copia en vivo y se escribe UNA sola vez al soltar
    // (`movio: true` fuerza esa escritura aunque no se arrastre): un gesto, un paso del
    // historial. El arrastre se instala de forma SÍNCRONA para que el pointerup lo encuentre.
    set({ arrastre: { clase: 'vertice', id: f.id, i: i + 1, movio: true }, edicion: { id: f.id, puntos } })
  },
  borrarVertice: async (f, i) => {
    if (f.id == null) return
    const puntos = f.puntos.filter((_, k) => k !== i)
    if (puntos.length < 2) {
      await get().eliminarForma(f.id)
      return
    }
    const cerrada = f.cerrada && puntos.length >= MIN_PUNTOS_CERRAR
    // Un piso/recinto con menos de 3 vértices ya no encierra nada: baja a muro abierto.
    const tipo: TipoFormaLibre = puntos.length < MIN_PUNTOS_CERRAR ? 'muro' : f.tipo
    await formasLibresRepo.update(f.id, { puntos, cerrada, tipo, fecha: Date.now() })
  },

  alternarVano: async (f, u, tipo) => {
    if (f.id == null) return
    const vanos = f.vanos ?? []
    // Misma longitud que usan el gesto (u = s/L) y el render: el contorno MUESTREADO
    // (una curva suave es más larga que su polígono de control).
    const { gridCols, gridRows } = rejilla()
    const contorno = contornoMuro(f, gridCols, gridRows)
    const L = longitudContorno(contorno, formaCerrada(f) && contorno.length >= MIN_PUNTOS_CERRAR)
    if (L <= 0) return
    // Tocar sobre un vano existente lo quita (cualquier tipo).
    const idx = vanos.findIndex((v) => Math.abs(v.u - u) * L <= Math.max(0.2, v.ancho) / 2)
    if (idx >= 0) {
      await formasLibresRepo.update(f.id, { vanos: vanos.filter((_, k) => k !== idx), fecha: Date.now() })
      return
    }
    const nuevo: VanoLibre =
      tipo === 'puerta'
        ? { u, tipo, ancho: Math.min(ANCHO_PUERTA_LIBRE, L * 0.8), puertaTipo: 'recta', puertaAlto: 0.85 }
        : { u, tipo, ancho: Math.min(ANCHO_VENTANA_LIBRE, L * 0.8), ventAlto: 0.5, ventPosY: 0.54, ventForma: 'cuadrado' }
    await formasLibresRepo.update(f.id, { vanos: [...vanos, nuevo], fecha: Date.now() })
  },
  quitarVano: async (f, indice) => {
    if (f.id == null) return
    await formasLibresRepo.update(f.id, { vanos: (f.vanos ?? []).filter((_, k) => k !== indice), fecha: Date.now() })
  },
  actualizarVano: async (f, indice, patch) => {
    if (f.id == null) return
    const vanos = (f.vanos ?? []).map((v, k) => (k === indice ? { ...v, ...patch } : v))
    await formasLibresRepo.update(f.id, { vanos, fecha: Date.now() })
  },

  actualizarForma: async (id, patch) => {
    // Nunca dejar una fila sin vértices: un `puntos: undefined` rompería el arranque.
    const limpio = { ...patch }
    if ('puntos' in limpio && !Array.isArray(limpio.puntos)) delete limpio.puntos
    await formasLibresRepo.update(id, { ...limpio, fecha: Date.now() })
  },
  eliminarForma: async (id) => {
    const P = usePlanos.getState()
    if (P.formaLibreSel === id) P.setFormaLibreSel(null)
    set((s) => (s.edicion?.id === id ? { edicion: null, arrastre: null } : {}))
    await formasLibresRepo.remove(id)
  },

  // Liberar escribe en dos sitios (alta de la forma + baja del muro o cuarto): un solo
  // paso del historial, o Deshacer dejaría el muro doble.
  liberarMuroRejilla: (m) => agrupar(async () => {
    if (m.id == null) return null
    const { gridCols, gridRows } = rejilla()
    const { puntos, suave } = poligonoDeMuroLibre(m, gridCols, gridRows)
    if (puntos.length < 2) return null
    const L = largoControl(puntos, false)
    const vanos: VanoLibre[] = []
    if (m.puerta) {
      vanos.push({
        u: 0.5 + (m.ventPosX ?? 0) * 0.25,
        tipo: 'puerta',
        ancho: Math.max(0.6, (m.puertaAncho ?? 0.5) * L),
        color: m.puertaColor,
        puertaTipo: m.puertaTipo ?? 'recta',
        puertaAlto: m.puertaAlto ?? 0.85,
        puertaForma: m.puertaForma ?? 'recta',
      })
    } else if (m.ventana) {
      vanos.push({
        u: 0.5 + (m.ventPosX ?? 0) * 0.25,
        tipo: 'ventana',
        ancho: Math.max(0.5, (m.ventAncho ?? 0.55) * L),
        color: m.ventColor,
        ventAlto: m.ventAlto ?? 0.5,
        ventPosY: m.ventPosY ?? 0.54,
        ventForma: m.ventForma ?? 'cuadrado',
      })
    }
    const id = await formasLibresRepo.add({
      nivel: m.nivel,
      tipo: 'muro',
      puntos,
      cerrada: false,
      suave,
      muroTipo: m.tipo ?? 'solido',
      muroColor: m.color ?? '#8c8073',
      alto: m.alto ?? 1,
      silueta: m.silueta ?? 'recta',
      formaAlto: m.formaAlto,
      formaAncho: m.formaAncho,
      formaPosX: m.formaPosX,
      vanos,
      fecha: Date.now(),
    })
    await eliminarMuroLibre(m.id)
    const P = usePlanos.getState()
    P.setMuroLibreSel(null)
    P.setFormaLibreSel(id)
    return id
  }),

  liberarCuarto: (roomId) => agrupar(async () => {
    const L = useLayout.getState()
    const anchor = L.cells[roomId]
    if (!anchor || !L.placed[roomId]) return null
    const fp = L.footprints[roomId] ?? FOOTPRINT_DEFAULT
    const puntos = contornoCuartoUV(anchor, fp, L.formasCelda[roomId], L.gridCols, L.gridRows)
    if (!puntos) return null
    const D = useDiseño.getState()
    const pincel = L.pinceles[roomId]?.muro
    const nombre = useCuartos.getState().cuartos.find((c) => c.id === roomId)?.nombre
    const pisoTipo = D.roomPisoTipos[roomId]
    const id = await formasLibresRepo.add({
      nivel: L.niveles[roomId] ?? 0,
      tipo: 'recinto',
      puntos,
      cerrada: true,
      suave: false,
      nombre,
      muroTipo: pincel?.tipo ?? 'solido',
      muroColor: pincel?.color ?? D.roomColors[roomId] ?? '#8c8073',
      alto: pincel?.alto ?? 1,
      // Sin material elegido el cuarto pinta su piso por defecto: la forma hereda madera.
      pisoTipo: pisoTipo === undefined ? 'madera' : pisoTipo,
      pisoColor: pisoTipo === null ? D.roomPisoColors[roomId] : undefined,
      fecha: Date.now(),
    })
    // El cuarto deja de dibujar y colisionar sus muros; la forma libre toma el relevo.
    await L.marcarSinMuros(roomId)
    const P = usePlanos.getState()
    P.setSeleccion(null)
    P.setFormaLibreSel(id)
    return id
  }),
}))

function mismoHit(a: HitLibre, b: HitLibre): boolean {
  if (a === b) return true
  if (!a || !b || a.tipo !== b.tipo) return false
  switch (a.tipo) {
    case 'vertice':
    case 'tramo':
      return a.id === (b as typeof a).id && a.i === (b as typeof a).i
    case 'forma':
    case 'muroRejilla':
      return a.id === (b as typeof a).id
    case 'cuarto':
      return a.roomId === (b as typeof a).roomId
  }
}

/** Formas libres del nivel dado (la lista sincronizada en layoutStore). */
export function formasLibresDelNivel(nivel: number): FormaLibre[] {
  return useLayout.getState().formasLibres.filter((f) => f.nivel === nivel)
}

/** Vértices efectivos de una forma: los de la edición en vivo si es la que se arrastra. */
export function puntosEfectivos(f: FormaLibre, edicion: { id: number; puntos: PuntoUV[] } | null): PuntoUV[] {
  return edicion && edicion.id === f.id ? edicion.puntos : (f.puntos ?? VACIO_UV)
}

const VACIO_UV: PuntoUV[] = []

// Al salir del modo Libre (o cambiar de nivel) se descarta el borrador y el arrastre.
usePlanos.subscribe((s, prev) => {
  if (s.modo !== prev.modo && prev.modo === 'libre') {
    useFormaLibre.setState({ borrador: null, arrastre: null, edicion: null, hover: null })
  } else if (s.nivel !== prev.nivel && s.modo === 'libre') {
    useFormaLibre.setState({ borrador: null, arrastre: null, edicion: null, hover: null })
  }
})

if (import.meta.env.DEV) {
  ;(window as unknown as { useFormaLibre: typeof useFormaLibre }).useFormaLibre = useFormaLibre
}
