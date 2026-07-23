import { create } from 'zustand'
import type { Cell, SideKey } from '../house/walls'
import type { FormaLoseta } from '../house/formasLoseta'
import type { VentanaContenidoId, TipoPuertaId } from '../house/murosPuertas'
import { useLayout } from './layoutStore'

type CapaPlano = 'cuartos' | 'paredes' | 'pisos' | 'techos'
/** Resolución del croquis: celda entera o 4 sub-celdas por celda (paso ½). */
export type DetalleRejillaPlano = 'celda' | 'subcelda'
export type HerramientaPlano =
  | 'seleccionar'
  | 'mover'
  | 'borrar'
  /** Modo Cuartos: solo botones +/− para crecer/recortar o eliminar cuartos. */
  | 'expandir'
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
type MenuPlanoAccion = 'cielo' | 'superficie' | null

/**
 * Modo del constructor unificado (barra superior de "Editar mapa").
 * Cada modo configura capa + herramienta + motor 3D de un solo golpe.
 * `grid` deja el motor apagado para conservar los botones +/- de tamaño en el 3D.
 */
export type ModoConstructor =
  | 'grid'
  | 'fondo'
  | 'cuartos'
  | 'muros'
  | 'puertas'
  | 'ventanas'
  | 'piso-ext'
  | 'piso-int'
  | 'techos'
  /** Nivel ≥ 1: mover el ascenso y cambiar su tipo (sustituye a piso-ext en pisos altos). */
  | 'ascensos'

const MODO_CONFIG: Record<
  ModoConstructor,
  { activo: boolean; capa: CapaPlano; herramienta: HerramientaPlano }
> = {
  grid: { activo: false, capa: 'cuartos', herramienta: 'seleccionar' },
  // Fondo de cielo: no usa el motor 3D de planos (solo configura el cielo).
  fondo: { activo: false, capa: 'cuartos', herramienta: 'seleccionar' },
  cuartos: { activo: true, capa: 'cuartos', herramienta: 'mover' },
  muros: { activo: true, capa: 'paredes', herramienta: 'muro' },
  puertas: { activo: true, capa: 'paredes', herramienta: 'puerta' },
  ventanas: { activo: true, capa: 'paredes', herramienta: 'ventana' },
  'piso-ext': { activo: true, capa: 'pisos', herramienta: 'seleccionar' },
  'piso-int': { activo: true, capa: 'pisos', herramienta: 'seleccionar' },
  techos: { activo: true, capa: 'techos', herramienta: 'seleccionar' },
  // Ascensos: no usa el motor 3D de planos; el arrastre del ascenso vive en Accesos.tsx.
  ascensos: { activo: false, capa: 'cuartos', herramienta: 'seleccionar' },
}

interface PlanosState {
  activo: boolean
  nivel: number
  capa: CapaPlano
  /** Rejilla del croquis: celdas enteras o subdivididas (4 por celda). */
  detalleRejilla: DetalleRejillaPlano
  herramienta: HerramientaPlano
  seleccion: SeleccionPlano
  aviso: string | null
  /** Zona recién creada que aún debe nombrarse. */
  pendienteNombre: number | null
  /** Arrastre de zona en el croquis (preview antes de soltar). */
  draggingZonaId: number | null
  previewZonaCeldas: Cell[]
  zonaDragOrigen: Cell[]
  /** Forma activa en herramienta Editar forma. */
  formaLoseta: FormaLoseta
  /**
   * Pincel de forma del modo Cuartos: con una forma activa, al tocar el croquis o el
   * 3D se coloca/altera una celda (clic = agregar → rotar → borrar). `null` = sin
   * pincel: se muestran los botones +/− para crecer/recortar y se pueden mover cuartos.
   */
  pincelForma: FormaLoseta | null
  /** Forma activa para muros libres (modo Muros): cuadrado (aristas) / triángulo / círculo. */
  formaMuro: FormaLoseta
  /** Orientación forzada del muro recto (forma "Lados"): horizontal o vertical. */
  orientMuro: 'h' | 'v'
  /** Rotación con la que se coloca el muro de forma (triángulo/círculo): 0/90/180/270. */
  rotForma: 0 | 90 | 180 | 270
  /** Pincel del modo Ventanas: qué se crea al tocar un muro (ventana/cuadro/espejo). */
  ventContenido: VentanaContenidoId
  /** Pincel del modo Ventanas: cara del muro donde vive el cuadro/espejo. */
  ventCara: 'interior' | 'exterior'
  /** Pincel del modo Puertas: variante de puerta al tocar un muro. */
  tipoPuerta: TipoPuertaId
  /** Muro libre seleccionado (id) para editar textura/color/altura. */
  muroLibreSel: number | null
  /** Visibilidad del previsualizador 3D del muro/pared seleccionado (toggle del ojo). */
  previewVisible: boolean
  /** Visibilidad del croquis 2D en el editor de mapa (selector Croquis/3D; ambos pueden estar activos). */
  croquisVisible: boolean
  /** Previsualización del muro libre bajo el cursor en el mapa 3D (fantasma en tiempo real). */
  muroHover: {
    clase: 'arista' | 'forma'
    orient?: 'h' | 'v'
    col: number
    row: number
    forma?: 'triangular' | 'circular'
    /** Rotación que resultará al clicar (refleja el ciclo del croquis). */
    rotacion?: number
    /** El clic borraría el muro existente (se muestra el fantasma en rojo). */
    borra?: boolean
  } | null
  /** Muro bajo el cursor para resaltar en ámbar (hover) en los modos de selección. */
  muroSelHover: { roomId: string; off: Cell; side: SideKey } | { muroLibreId: number } | null
  /** Sección del panel lateral (fondo / superficie). */
  menuPlano: MenuPlanoAccion
  /** Modo activo del constructor unificado (barra superior de Editar mapa). */
  modo: ModoConstructor
  setActivo: (v: boolean) => void
  /** Cambia de modo: configura capa, herramienta y motor 3D de un solo golpe. */
  setModo: (m: ModoConstructor) => void
  setNivel: (n: number) => void
  setCapa: (c: CapaPlano) => void
  setDetalleRejilla: (d: DetalleRejillaPlano) => void
  setHerramienta: (h: HerramientaPlano) => void
  setSeleccion: (s: SeleccionPlano) => void
  /** Alterna celda exterior en selección múltiple (capa Pisos). */
  toggleCeldaExterior: (c: Cell) => void
  limpiarSeleccionExterior: () => void
  setAviso: (aviso: string | null) => void
  setPendienteNombre: (id: number | null) => void
  setZonaDragPreview: (zonaId: number | null, celdas: Cell[]) => void
  setFormaLoseta: (f: FormaLoseta) => void
  /** Activa/desactiva el pincel de forma del modo Cuartos (null = volver a mover/crecer). */
  setPincelForma: (f: FormaLoseta | null) => void
  setFormaMuro: (f: FormaLoseta) => void
  setOrientMuro: (o: 'h' | 'v') => void
  setRotForma: (r: 0 | 90 | 180 | 270) => void
  setVentContenido: (c: VentanaContenidoId) => void
  setVentCara: (c: 'interior' | 'exterior') => void
  setTipoPuerta: (t: TipoPuertaId) => void
  setMuroLibreSel: (id: number | null) => void
  setPreviewVisible: (v: boolean) => void
  setCroquisVisible: (v: boolean) => void
  setMuroHover: (h: PlanosState['muroHover']) => void
  setMuroSelHover: (h: PlanosState['muroSelHover']) => void
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
  aviso: null,
  pendienteNombre: null,
  draggingZonaId: null,
  previewZonaCeldas: [],
  zonaDragOrigen: [],
  formaLoseta: 'cuadrado',
  pincelForma: null,
  formaMuro: 'cuadrado',
  orientMuro: 'h',
  rotForma: 0,
  ventContenido: 'ventana',
  ventCara: 'interior',
  tipoPuerta: 'recta',
  muroLibreSel: null,
  previewVisible: false,
  croquisVisible: true,
  muroHover: null,
  muroSelHover: null,
  menuPlano: null,
  modo: 'grid',

  setActivo: (v) =>
    set({
      activo: v,
      seleccion: null,
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
  setModo: (m) =>
    set((st) => ({
      modo: m,
      ...MODO_CONFIG[m],
      // Re-aplicar el mismo modo (sincronización al montar el editor o al reactivar el
      // atajo de construcción) conserva pincel, selección y muro elegido.
      seleccion: st.modo === m ? st.seleccion : null,
      aviso: null,
      pendienteNombre: null,
      draggingZonaId: null,
      previewZonaCeldas: [],
      zonaDragOrigen: [],
      formaLoseta: 'cuadrado',
      pincelForma: st.modo === m ? st.pincelForma : null,
      muroLibreSel: st.modo === m ? st.muroLibreSel : null,
      muroHover: null,
      ...(m === 'grid' || m === 'piso-ext' ? { nivel: 0 } : {}),
      // Ascensos aplica a pisos altos y al sótano; si venías de planta baja, sube al 1.
      ...(m === 'ascensos' && st.nivel === 0 ? { nivel: 1 } : {}),
    })),
  setNivel: (n) =>
    set((st) => {
      const base = { nivel: n, seleccion: null, pendienteNombre: null, pincelForma: null }
      // El espacio del slot alterna Piso ext. (planta baja) / Ascensos (pisos altos y sótano):
      // mantén el modo coherente con el nivel elegido en ese selector.
      if (st.modo === 'ascensos' && n === 0) return { ...base, ...MODO_CONFIG['piso-ext'], modo: 'piso-ext' as const }
      if (st.modo === 'piso-ext' && n !== 0) return { ...base, ...MODO_CONFIG['ascensos'], modo: 'ascensos' as const }
      return base
    }),
  setCapa: (c) =>
    set({
      capa: c,
      seleccion: null,
      herramienta: c === 'cuartos' ? 'mover' : 'seleccionar',
    }),
  setDetalleRejilla: (d) => set({ detalleRejilla: d, seleccion: null }),
  setHerramienta: (h) => {
    const layout = useLayout.getState()
    if (layout.draggingId) void layout.endDrag()
    set({
      herramienta: h,
      seleccion: null,
      aviso: null,
      draggingZonaId: null,
      previewZonaCeldas: [],
      zonaDragOrigen: [],
      pincelForma: null,
      ...(h === 'editar-forma' ? { detalleRejilla: 'celda' as const } : {}),
    })
  },
  setFormaLoseta: (f) => set({ formaLoseta: f }),
  // Activar el pincel fuerza herramienta neutra (mover) para que mande el pincel.
  setPincelForma: (f) => set(f ? { pincelForma: f, herramienta: 'mover', seleccion: null } : { pincelForma: null }),
  setFormaMuro: (f) => set({ formaMuro: f, muroLibreSel: null }),
  setOrientMuro: (o) => set({ orientMuro: o }),
  setRotForma: (r) => set({ rotForma: r }),
  setVentContenido: (c) => set({ ventContenido: c }),
  setVentCara: (c) => set({ ventCara: c }),
  setTipoPuerta: (t) => set({ tipoPuerta: t }),
  // Cada nueva selección abre el previsualizador en su sitio; el usuario lo cierra con el ojo.
  setMuroLibreSel: (id) => set({ muroLibreSel: id, previewVisible: true }),
  setPreviewVisible: (v) => set({ previewVisible: v }),
  setCroquisVisible: (v) => set({ croquisVisible: v }),
  setMuroHover: (h) => set({ muroHover: h }),
  setMuroSelHover: (h) => set({ muroSelHover: h }),
  toggleMenuPlano: (id) =>
    set((st) => ({ menuPlano: st.menuPlano === id ? null : id })),
  setMenuPlano: (m) => set({ menuPlano: m }),
  setSeleccion: (s) => set({ seleccion: s, previewVisible: true }),
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

if (import.meta.env.DEV) {
  ;(window as unknown as { usePlanos: typeof usePlanos }).usePlanos = usePlanos
}
