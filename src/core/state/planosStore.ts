import { create } from 'zustand'
import type { Cell, SideKey } from '../house/walls'
import type { FormaLoseta } from '../house/formasLoseta'
import { useLayout } from './layoutStore'

export type CapaPlano = 'cuartos' | 'paredes' | 'pisos' | 'techos'
/** Resolución del croquis: celda entera o 4 sub-celdas por celda (paso ½). */
export type DetalleRejillaPlano = 'celda' | 'subcelda'
export type HerramientaPlano =
  | 'seleccionar'
  | 'agregar'
  | 'mover'
  | 'borrar'
  | 'editar-forma'
  /** Capa paredes: pintar muro, puerta o ventana (como WallEditor). */
  | 'muro'
  | 'puerta'
  | 'ventana'

export type SeleccionPlano =
  | { tipo: 'cuarto'; roomId: string }
  | { tipo: 'zona'; zonaId: number }
  | { tipo: 'arista'; roomId: string; off: Cell; side: SideKey }
  | { tipo: 'arista-zona'; zonaId: number; off: Cell; side: SideKey }
  | { tipo: 'exterior'; celdas: Cell[] }
  | { tipo: 'pisos-interiores' }
  | { tipo: 'celda'; col: number; row: number }
  | null

/** Panel lateral abierto desde los botones flotantes del croquis. */
export type MenuPlanoAccion = 'cielo' | 'superficie' | null

interface PlanosState {
  activo: boolean
  nivel: number
  capa: CapaPlano
  /** Rejilla del croquis: celdas enteras o subdivididas (4 por celda). */
  detalleRejilla: DetalleRejillaPlano
  herramienta: HerramientaPlano
  seleccion: SeleccionPlano
  celdasMarcadas: Cell[]
  aviso: string | null
  /** Zona recién creada que aún debe nombrarse. */
  pendienteNombre: number | null
  /** Arrastre de zona en el croquis (preview antes de soltar). */
  draggingZonaId: number | null
  previewZonaCeldas: Cell[]
  zonaDragOrigen: Cell[]
  /** Forma activa en herramienta Editar forma. */
  formaLoseta: FormaLoseta
  /** Sección del panel lateral (fondo / superficie). */
  menuPlano: MenuPlanoAccion
  setActivo: (v: boolean) => void
  setNivel: (n: number) => void
  setCapa: (c: CapaPlano) => void
  setDetalleRejilla: (d: DetalleRejillaPlano) => void
  setHerramienta: (h: HerramientaPlano) => void
  setSeleccion: (s: SeleccionPlano) => void
  /** Alterna celda exterior en selección múltiple (capa Pisos). */
  toggleCeldaExterior: (c: Cell) => void
  limpiarSeleccionExterior: () => void
  toggleCeldaMarcada: (c: Cell) => void
  limpiarMarcadas: () => void
  deshacerMarcada: () => void
  setAviso: (aviso: string | null) => void
  setPendienteNombre: (id: number | null) => void
  setZonaDragPreview: (zonaId: number | null, celdas: Cell[]) => void
  setFormaLoseta: (f: FormaLoseta) => void
  toggleMenuPlano: (id: 'cielo' | 'superficie') => void
  setMenuPlano: (m: MenuPlanoAccion) => void
}

export const usePlanos = create<PlanosState>((set) => ({
  activo: false,
  nivel: 0,
  capa: 'cuartos',
  detalleRejilla: 'celda',
  herramienta: 'mover',
  seleccion: null,
  celdasMarcadas: [],
  aviso: null,
  pendienteNombre: null,
  draggingZonaId: null,
  previewZonaCeldas: [],
  zonaDragOrigen: [],
  formaLoseta: 'cuadrado',
  menuPlano: null,

  setActivo: (v) =>
    set({
      activo: v,
      seleccion: null,
      celdasMarcadas: [],
      aviso: null,
      pendienteNombre: null,
      draggingZonaId: null,
      previewZonaCeldas: [],
      zonaDragOrigen: [],
      menuPlano: null,
      ...(v
        ? { capa: 'cuartos', herramienta: 'mover' as const, formaLoseta: 'cuadrado' as const }
        : { capa: 'cuartos', herramienta: 'seleccionar' as const }),
    }),
  setNivel: (n) => set({ nivel: n, seleccion: null, celdasMarcadas: [], pendienteNombre: null }),
  setCapa: (c) =>
    set({
      capa: c,
      seleccion: null,
      celdasMarcadas: [],
      herramienta: c === 'cuartos' ? 'mover' : 'seleccionar',
    }),
  setDetalleRejilla: (d) => set({ detalleRejilla: d, celdasMarcadas: [], seleccion: null }),
  setHerramienta: (h) => {
    const layout = useLayout.getState()
    if (layout.draggingId) void layout.endDrag()
    set({
      herramienta: h,
      seleccion: null,
      celdasMarcadas: [],
      aviso: null,
      draggingZonaId: null,
      previewZonaCeldas: [],
      zonaDragOrigen: [],
      ...(h === 'agregar' ? { detalleRejilla: 'celda' as const } : {}),
      ...(h === 'editar-forma' ? { detalleRejilla: 'celda' as const } : {}),
    })
  },
  setFormaLoseta: (f) => set({ formaLoseta: f }),
  toggleMenuPlano: (id) =>
    set((st) => ({ menuPlano: st.menuPlano === id ? null : id })),
  setMenuPlano: (m) => set({ menuPlano: m }),
  setSeleccion: (s) => set({ seleccion: s }),
  toggleCeldaExterior: (c) =>
    set((st) => {
      // Detalle fino: se conserva la coordenada de ¼ (cuadrante); cuadro: celda entera.
      const celda =
        st.detalleRejilla === 'subcelda'
          ? { col: c.col, row: c.row }
          : { col: Math.round(c.col), row: Math.round(c.row) }
      const k = `${celda.col},${celda.row}`
      const prev = st.seleccion?.tipo === 'exterior' ? st.seleccion.celdas : []
      const ya = prev.some((x) => `${x.col},${x.row}` === k)
      const celdas = ya
        ? prev.filter((x) => `${x.col},${x.row}` !== k)
        : [...prev, celda]
      return {
        seleccion: celdas.length > 0 ? { tipo: 'exterior' as const, celdas } : null,
      }
    }),
  limpiarSeleccionExterior: () =>
    set((st) => (st.seleccion?.tipo === 'exterior' ? { seleccion: null } : {})),
  toggleCeldaMarcada: (c) =>
    set((st) => {
      // Cuartos = espacio interior en celdas enteras; el perímetro genera paredes.
      const celda = { col: Math.round(c.col), row: Math.round(c.row) }
      const k = `${celda.col},${celda.row}`
      const ya = st.celdasMarcadas.some((x) => `${x.col},${x.row}` === k)
      return {
        celdasMarcadas: ya
          ? st.celdasMarcadas.filter((x) => `${x.col},${x.row}` !== k)
          : [...st.celdasMarcadas, celda],
      }
    }),
  limpiarMarcadas: () => set({ celdasMarcadas: [], aviso: null }),
  deshacerMarcada: () =>
    set((st) => ({
      celdasMarcadas: st.celdasMarcadas.slice(0, -1),
      aviso: null,
    })),
  setAviso: (aviso) => set({ aviso }),
  setPendienteNombre: (id) => set({ pendienteNombre: id }),
  setZonaDragPreview: (zonaId, celdas) =>
    set((st) => {
      if (zonaId == null) {
        return { draggingZonaId: null, previewZonaCeldas: [], zonaDragOrigen: [] }
      }
      const origen =
        st.draggingZonaId === zonaId && st.zonaDragOrigen.length > 0
          ? st.zonaDragOrigen
          : celdas.map((c) => ({ ...c }))
      return {
        draggingZonaId: zonaId,
        previewZonaCeldas: celdas,
        zonaDragOrigen: origen,
      }
    }),
}))
