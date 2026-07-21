import { create } from 'zustand'

/** Pestaña activa del panel Editor (sin cuarto seleccionado). */
export type EditorTab = 'mapa' | 'personajes' | 'objetos' | 'config'

/** Id del personaje principal en el editor de personajes. */
export const PERSONAJE_AVATAR = 'avatar'

/**
 * Estado de UI del editor compartido entre el panel y la escena 3D: qué pestaña
 * está activa y qué personaje se está editando. Vive en un store (no como estado
 * local del panel) para poder seleccionar un personaje tocándolo en el 3D.
 */
interface EditorUiState {
  tab: EditorTab
  setTab: (tab: EditorTab) => void
  /** Personaje en edición: 'avatar' (principal) o id de asistente. */
  personajeSel: string
  setPersonajeSel: (id: string) => void
  /** Selecciona un personaje y abre la pestaña Personajes (clic en el 3D). */
  editarPersonaje: (id: string) => void
  /** Objeto en edición (id) en la pestaña Objetos; null = ninguno. */
  objetoSel: number | null
  setObjetoSel: (id: number | null) => void
  /**
   * Pieza seleccionada (índice) del modelo de piezas en edición. Compartida entre
   * el panel (EditorPiezas) y el preview 3D para poder elegirla tocando el modelo.
   */
  piezaSel: number
  setPiezaSel: (i: number) => void
  /** Controles de piezas visibles sobre el preview (se alternan con el engrane ⚙️). */
  piezasControles: boolean
  setPiezasControles: (v: boolean) => void
  /** El visor del editor está reproduciendo la animación (botón ▶ del preview). */
  animPreview: boolean
  setAnimPreview: (v: boolean) => void
  /**
   * Editor 3D en perspectiva: al estar activo (en 3ª/1ª persona) se puede caminar y
   * tocar objetos en el mundo para editarlos con un panel flotante. Independiente del
   * editor de mapa (`editMode`, que usa la cámara isométrica).
   */
  editor3d: boolean
  setEditor3d: (v: boolean) => void
  /**
   * Verdadero mientras el sub-menú Inventario > Objetos está abierto: permite
   * arrastrar objetos del mapa/cuartos directo en la escena, sin entrar al editor.
   */
  inventarioObjetosActivo: boolean
  setInventarioObjetosActivo: (v: boolean) => void
  /**
   * Grupos desplegados de la pestaña Configuraciones (acordeón). Vive aquí —y no
   * en el componente— para que el chat pueda abrir un grupo concreto.
   */
  configAbiertos: Record<string, boolean>
  toggleConfigGrupo: (id: string) => void
  abrirConfigGrupo: (id: string) => void
}

const LS_CONFIG_ABIERTOS = 'mind-home-config-abiertos'

function leerConfigAbiertos(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_CONFIG_ABIERTOS)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function guardarConfigAbiertos(v: Record<string, boolean>) {
  try {
    localStorage.setItem(LS_CONFIG_ABIERTOS, JSON.stringify(v))
  } catch {
    /* quota / modo privado */
  }
}

export const useEditorUi = create<EditorUiState>((set) => ({
  tab: 'mapa',
  setTab: (tab) => set({ tab }),
  personajeSel: PERSONAJE_AVATAR,
  // Al cambiar de personaje se detiene la reproducción del preview.
  setPersonajeSel: (personajeSel) => set({ personajeSel, animPreview: false }),
  editarPersonaje: (id) => set({ personajeSel: id, tab: 'personajes' }),
  objetoSel: null,
  // Al cambiar de objeto se detiene la reproducción del preview.
  setObjetoSel: (objetoSel) => set({ objetoSel, animPreview: false }),
  piezaSel: 0,
  setPiezaSel: (piezaSel) => set({ piezaSel }),
  piezasControles: false,
  setPiezasControles: (piezasControles) => set({ piezasControles }),
  animPreview: false,
  setAnimPreview: (animPreview) => set({ animPreview }),
  editor3d: false,
  // Al salir del editor 3D se limpia el objeto seleccionado (cierra el panel flotante).
  setEditor3d: (editor3d) => set(editor3d ? { editor3d } : { editor3d, objetoSel: null }),
  inventarioObjetosActivo: false,
  setInventarioObjetosActivo: (inventarioObjetosActivo) => set({ inventarioObjetosActivo }),
  configAbiertos: leerConfigAbiertos(),
  toggleConfigGrupo: (id) =>
    set((s) => {
      const configAbiertos = { ...s.configAbiertos, [id]: !s.configAbiertos[id] }
      guardarConfigAbiertos(configAbiertos)
      return { configAbiertos }
    }),
  abrirConfigGrupo: (id) =>
    set((s) => {
      const configAbiertos = { ...s.configAbiertos, [id]: true }
      guardarConfigAbiertos(configAbiertos)
      return { configAbiertos }
    }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useEditorUi: typeof useEditorUi }).useEditorUi = useEditorUi
}
