import { create } from 'zustand'
import { abrirApp } from '../abrirApp'
import type { ClipVideo, ProyectoVideo } from '../data/db'
import type { PresetAnimacionId } from '../house/animacion'
import { nuevaBocaHabla, type BocaHabla } from '../house/bocaHabla'
import { useDialogo } from './dialogoStore'
import { cancelarReaccion } from './emocionesStore'
import { useHouse } from './houseStore'
import { useHud } from './hudStore'
import { lanzarIntencionApp } from './intencionApp'
import { useLayout } from './layoutStore'
import { useMascota } from './mascotaStore'
import { playerPos } from './playerPosition'
import { usePreviaPlantilla } from './previaPlantillaStore'

/**
 * «Modo película» del Studio de video: un proyecto 3D abierto ENCIMA del mapa.
 * El cuarto se cierra (la casa queda libre: los actores son los asistentes y
 * tu avatar) y el Editor se monta en la raíz de App como dock sobre la escena.
 * Vive en core y no en el cuarto porque el cuarto se desmonta al entrar (igual
 * que grabacionPantalla). Lo reactivo va en Zustand; lo que cambia cada frame,
 * en objetos mutables (`peliculaFrame`, `actoresFrame`) que nadie suscribe.
 */

/** Tu avatar como actor: centinela en `ClipAvatar.asistenteId` (nunca pasarlo a `getAsistente`). */
export const ES_JUGADOR = 'jugador'

/** Desde dónde se entró, para volver al mismo sitio al salir. */
type Origen = { tipo: 'previa' } | { tipo: 'cuarto'; roomId: string } | { tipo: 'ninguno' }

interface PeliculaState {
  /** Proyecto 3D abierto sobre el mapa; null = modo apagado. */
  proyectoId: number | null
  origen: Origen | null
  /** Asistentes que actúan (ids): `Asistente3D` los monta aunque no estén `enMapa`. Lo publica el Editor al mutar. */
  actores: string[]
  /** Preset efectivo por actor mientras un clip lo pide (lo escribe el Director al entrar y salir del clip). */
  presets: Record<string, PresetAnimacionId | undefined>
  /** Tocar el mapa coloca al actor del clip seleccionado; `marcador` = su punto (anillo en el suelo). */
  colocando: boolean
  marcador: { x: number; z: number } | null
  entrar: (proyectoId: number) => void
  /** `volver: false` = solo apagar el modo (un cuarto abierto por el chat manda; no se reabre el Studio). */
  salir: (opts?: { volver?: boolean }) => void
  setActores: (ids: string[]) => void
  setPreset: (id: string, preset?: PresetAnimacionId) => void
  setColocando: (v: boolean, marcador?: { x: number; z: number } | null) => void
}

export const usePelicula = create<PeliculaState>((set, get) => ({
  proyectoId: null,
  origen: null,
  actores: [],
  presets: {},
  colocando: false,
  marcador: null,
  entrar: (proyectoId) => {
    if (get().proyectoId != null) return
    // El origen se lee ANTES de cerrar nada.
    const previa = usePreviaPlantilla.getState().plantillaId === 'video'
    const roomId = useHouse.getState().activeRoom
    const origen: Origen = previa ? { tipo: 'previa' } : roomId ? { tipo: 'cuarto', roomId } : { tipo: 'ninguno' }
    // La casa queda libre: previa y cuarto se cierran (el Studio se desmonta y guarda).
    usePreviaPlantilla.getState().cerrar()
    useHouse.getState().closeRoom()
    // Un cuarto en edición seguiría debajo con su panel, y un diálogo cara a cara pelearía por la cámara.
    if (useLayout.getState().editMode) useLayout.getState().setEditMode(false)
    useDialogo.getState().salir()
    // El menú lateral (se entra desde su catálogo) taparía el mapa: en el modo película va cerrado.
    useHud.getState().setMenuAbierto(false)
    set({ proyectoId, origen })
  },
  salir: (opts) => {
    const { origen, actores, presets } = get()
    if (get().proyectoId == null) return
    peliculaFrame.activo = false
    peliculaFrame.reproduciendo = false
    peliculaFrame.proyecto = null
    for (const id of Object.keys(actoresFrame)) delete actoresFrame[id]
    for (const b of Object.values(bocas)) {
      b.current.nivel = 0
      b.current.hablando = false
    }
    for (const id of new Set([...actores, ...Object.keys(presets), ES_JUGADOR])) cancelarReaccion(id)
    useMascota.getState().programarOcultar(0)
    // Que el avatar no «regrese» a un destino viejo: se queda donde lo dejó el Director.
    useHouse.getState().target.set(playerPos.x, 0, playerPos.z)
    set({ proyectoId: null, origen: null, actores: [], presets: {}, colocando: false, marcador: null })
    if (opts?.volver === false) return
    // Vuelta al Studio, en «Animación 3D» (como `volverAlStudio` de grabacionPantalla).
    lanzarIntencionApp({ appId: 'video', seccion: 'animacion3d' })
    if (origen?.tipo === 'previa') usePreviaPlantilla.getState().abrir('video')
    else if (origen?.tipo === 'cuarto') useHouse.getState().openRoom(origen.roomId)
    else if (!abrirApp('video', 'animacion3d')) usePreviaPlantilla.getState().abrir('video')
  },
  setActores: (ids) => set((s) => (s.actores.join(',') === ids.join(',') ? s : { actores: ids })),
  setPreset: (id, preset) =>
    set((s) => {
      if (s.presets[id] === preset) return s
      const presets = { ...s.presets }
      if (preset) presets[id] = preset
      else delete presets[id]
      return { presets }
    }),
  setColocando: (v, marcador = null) =>
    set((s) =>
      s.colocando === v && s.marcador?.x === marcador?.x && s.marcador?.z === marcador?.z ? s : { colocando: v, marcador },
    ),
}))

/** Tocar el suelo coloca a un actor (clip de personaje seleccionado); si no, el toque camina como siempre. */
export const colocandoActor = () => peliculaFrame.activo && usePelicula.getState().colocando

// Guardia (patrón dialogoStore): si algo abre un cuarto en pleno modo película (el chat,
// «abre la cocina»), el modo se apaga y ese cuarto manda; el proyecto se guarda al desmontar.
useHouse.subscribe((s, prev) => {
  if (s.activeRoom && !prev.activeRoom && usePelicula.getState().proyectoId != null) usePelicula.getState().salir({ volver: false })
})

/** Rectángulo del encuadre en px CSS relativos al lienzo de la casa (`[data-lienzo-casa] canvas`). */
export interface EncuadrePelicula {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Estado POR FRAME, mutable y sin suscripciones: el Editor lo escribe desde su
 * reloj (nunca setState por frame) y el Director lo lee en `useFrame`.
 */
export const peliculaFrame = {
  activo: false,
  t: 0,
  reproduciendo: false,
  /** La referencia nueva en cada `mutar` del Editor (tipos de db: core no importa de rooms). */
  proyecto: null as (ProyectoVideo & { clips: ClipVideo[] }) | null,
  encuadre: { x: 0, y: 0, w: 0, h: 0 } as EncuadrePelicula,
  /** El canvas de la composición (textos, PIP, fundidos) que pinta el motor: el monitor del HUD lo copia encima del 3D. */
  lienzoComposicion: null as HTMLCanvasElement | null,
  /** Cuenta de seeks: el Director vacía sus one-shots (globo, emoción) cuando cambia, como el `leidos` del motor. */
  seekTick: 0,
  /** Export en curso: sin globos DOM (no salen en el archivo). */
  exportando: false,
}

/** Estado objetivo de UN actor en el instante `t`: lo escribe el Director, lo leen Character y Asistente3D. */
export interface EstadoActor {
  x: number
  z: number
  /** Rumbo objetivo (radianes, +Z = frente, como `girarHacia`). */
  rumbo: number
  /** Caminando este frame (marcha); false = plantado. */
  caminando: boolean
  /** Boca hablante: `Rostro` la lee por ref; el Director la avanza con `avanzarBoca`. */
  boca: { current: BocaHabla }
  /** Energía 0–1 del cabeceo de habla (cuerpos sin boca dibujada). */
  energia: number
  /** Clip de habla activo (para el globo, una vez por entrada), o null. */
  hablaClipId: string | null
}

/** Por id de actor ('jugador' o asistenteId). Mutado en sitio: cero re-renders. */
export const actoresFrame: Record<string, EstadoActor> = {}

// Las bocas viven aparte de `actoresFrame`: `Rostro` necesita una ref ESTABLE desde el
// render, antes de que el Director coloque al actor (y sin convertirlo en actor por pedirla).
const bocas: Record<string, { current: BocaHabla }> = {}
export const bocaDe = (id: string) => (bocas[id] ??= { current: nuevaBocaHabla() })

export const nuevoEstadoActor = (id: string): EstadoActor => ({
  x: 0,
  z: 0,
  rumbo: 0,
  caminando: false,
  boca: bocaDe(id),
  energia: 0,
  hablaClipId: null,
})

/** El estado del actor si el modo está activo y el Director ya lo colocó; si no, null (comportamiento normal). */
export const estadoActor = (id: string): EstadoActor | null => (peliculaFrame.activo ? (actoresFrame[id] ?? null) : null)

// Puente store↔mundo sin ciclo de imports (patrón `registrarEjecutorItem` de carreraStore):
// el Editor registra cómo colocar al actor y el controlador del mapa lo invoca al tocar.
let ejecutorColocar: ((x: number, z: number) => void) | null = null
export function registrarEjecutorColocar(fn: ((x: number, z: number) => void) | null) {
  ejecutorColocar = fn
}
export const colocarEnMapa = (x: number, z: number) => ejecutorColocar?.(x, z)

if (import.meta.env.DEV) {
  const w = window as unknown as { peliculaFrame: typeof peliculaFrame; actoresFrame: typeof actoresFrame; usePelicula: typeof usePelicula }
  w.peliculaFrame = peliculaFrame
  w.actoresFrame = actoresFrame
  w.usePelicula = usePelicula
}
