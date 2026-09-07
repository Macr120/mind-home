import { create } from 'zustand'
import { useDiseño } from './disenoStore'
import { useAsistentes } from './asistentesStore'
import { useEditorUi, type EditorTab } from './editorUiStore'
import type { Asistente } from '../chat/mascotas'
import type { ObjetoCuarto } from '../data/db'
import type { Avatar } from './disenoStore'
import { escucharMapa } from './historialMapa'

/**
 * Deshacer y rehacer del panel Editor. La pila es POR PESTAÑA: se vacía al
 * cambiar de una a otra y al salir del modo edición, que es lo que espera
 * «deshacer las últimas ediciones» de lo que tienes delante.
 *
 * Los pasos se apilan ESCUCHANDO los stores, no envolviendo los setters: son
 * decenas de llamadas repartidas por el panel y sus subcomponentes, y además
 * los mismos setters los usan el chat, los tutoriales y el arrastre en 3D. Cada
 * paso guarda la entidad ENTERA antes y después, así un solo mecanismo deshace
 * cualquier campo, incluidos los Blobs (foto de rostro, .glb).
 *
 * La pestaña Mapa tiene su propia escucha en `historialMapa.ts` (construcción de
 * rejilla, diseño por cuarto, formas libres y muros libres).
 *
 * Fuera de alcance: crear o eliminar personajes y objetos (habría que resucitar
 * la fila con su id).
 */

export interface PasoHistorial {
  deshacer: () => void | Promise<void>
  rehacer: () => void | Promise<void>
}

/** Techo de la pila: con Blobs dentro, conviene acotar la memoria. */
const MAX_PASOS = 30

interface HistorialEditorState {
  /** Pestaña dueña de estas pilas (null = editor cerrado). */
  ambito: EditorTab | null
  pasos: PasoHistorial[]
  rehechos: PasoHistorial[]
  /** Verdadero mientras se aplica un deshacer/rehacer: la escucha no re-apila. */
  aplicando: boolean
  /** Pasos acumulados mientras dura un `agrupar` (null = sin grupo abierto). */
  grupo: PasoHistorial[] | null
  registrar: (p: PasoHistorial) => void
  /**
   * Ejecuta `fn` apilando todo lo que registre como UN solo paso (se deshace en orden
   * inverso). Para gestos que escriben en varios sitios, como «liberar un cuarto».
   */
  agrupar: <T>(fn: () => Promise<T>) => Promise<T>
  deshacer: () => Promise<void>
  rehacer: () => Promise<void>
  /** Fija el ámbito y vacía las pilas si cambió. */
  vigilar: (ambito: EditorTab | null) => void
}

/**
 * Espera a que las fuentes ASÍNCRONAS del ámbito activo (las tablas vigiladas por
 * `liveQuery` en Mapa) hayan emitido todo lo escrito; la fija `escuchar`.
 */
let alDia: (() => Promise<void>) | null = null

export const useHistorialEditor = create<HistorialEditorState>((set, get) => ({
  ambito: null,
  pasos: [],
  rehechos: [],
  aplicando: false,
  grupo: null,

  registrar: (p) => {
    if (get().aplicando) return
    const g = get().grupo
    if (g) {
      g.push(p)
      return
    }
    set((s) => ({ pasos: [...s.pasos, p].slice(-MAX_PASOS), rehechos: [] }))
  },

  agrupar: async (fn) => {
    // Grupos anidados: se funden en el exterior.
    if (get().grupo) return fn()
    const grupo: PasoHistorial[] = []
    set({ grupo })
    try {
      return await fn()
    } finally {
      // Las tablas emiten DESPUÉS de escribir: el grupo espera su eco antes de cerrarse.
      await alDia?.()
      set({ grupo: null })
      if (grupo.length === 1) get().registrar(grupo[0])
      else if (grupo.length > 1) {
        get().registrar({
          deshacer: async () => {
            for (const p of [...grupo].reverse()) await p.deshacer()
          },
          rehacer: async () => {
            for (const p of grupo) await p.rehacer()
          },
        })
      }
    }
  },

  deshacer: async () => {
    const paso = get().pasos.at(-1)
    if (!paso) return
    set((s) => ({ pasos: s.pasos.slice(0, -1), rehechos: [...s.rehechos, paso], aplicando: true }))
    try {
      await paso.deshacer()
    } finally {
      set({ aplicando: false })
    }
  },

  rehacer: async () => {
    const paso = get().rehechos.at(-1)
    if (!paso) return
    set((s) => ({ rehechos: s.rehechos.slice(0, -1), pasos: [...s.pasos, paso], aplicando: true }))
    try {
      await paso.rehacer()
    } finally {
      set({ aplicando: false })
    }
  },

  vigilar: (ambito) => {
    if (get().ambito === ambito) return
    set({ ambito, pasos: [], rehechos: [] })
    escuchar(ambito)
  },
}))

/** Cancela la escucha anterior (una sola activa a la vez). */
let cancelar: (() => void)[] = []

function escuchar(ambito: EditorTab | null) {
  for (const c of cancelar) c()
  cancelar = []
  const registrar = (p: PasoHistorial) => useHistorialEditor.getState().registrar(p)

  if (ambito === 'personajes') {
    cancelar.push(
      useDiseño.subscribe((s, prev) => {
        if (s.avatar === prev.avatar) return
        const antes = prev.avatar as Avatar
        const despues = s.avatar as Avatar
        registrar({
          deshacer: () => useDiseño.getState().setAvatarCompleto(antes),
          rehacer: () => useDiseño.getState().setAvatarCompleto(despues),
        })
      }),
    )
    cancelar.push(
      useAsistentes.subscribe((s, prev) => {
        if (s.lista === prev.lista || s.lista.length !== prev.lista.length) return
        // Solo ediciones: crear y eliminar cambian la longitud y quedan fuera.
        let antes: Asistente | undefined
        let despues: Asistente | undefined
        for (const a of s.lista) {
          const viejo = prev.lista.find((x) => x.id === a.id)
          if (viejo && viejo !== a) {
            antes = viejo
            despues = a
            break
          }
        }
        if (!antes || !despues) return
        const a0 = antes
        const a1 = despues
        registrar({
          deshacer: () => useAsistentes.getState().guardar(a0),
          rehacer: () => useAsistentes.getState().guardar(a1),
        })
      }),
    )
  }

  if (ambito === 'mapa') {
    const vaciar = () => useHistorialEditor.setState({ pasos: [], rehechos: [] })
    const mapa = escucharMapa(registrar, vaciar)
    alDia = mapa.alDia
    cancelar.push(...mapa.fuera, () => {
      alDia = null
    })
  }

  if (ambito === 'objetos') {
    cancelar.push(
      useDiseño.subscribe((s, prev) => {
        if (s.objetos === prev.objetos) return
        // Arrastrando: `setObjetoPos` escribe por frame y llenaría la pila.
        if (s.draggingObjeto != null) return
        const id = useEditorUi.getState().objetoSel
        if (id == null) return
        const antes = prev.objetos.find((o) => o.id === id)
        const despues = s.objetos.find((o) => o.id === id)
        if (!antes || !despues || antes === despues) return
        const o0 = antes as ObjetoCuarto
        const o1 = despues as ObjetoCuarto
        registrar({
          deshacer: () => useDiseño.getState().restaurarObjeto(o0),
          rehacer: () => useDiseño.getState().restaurarObjeto(o1),
        })
      }),
    )
  }
}
