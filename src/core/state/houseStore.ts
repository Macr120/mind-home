import { create } from 'zustand'
import * as THREE from 'three'
import { getCuarto } from './cuartosStore'
import { setCuartoAbierto } from '../house/movement'
import { estaEnPuerta } from '../house/navigation'
import { roomEntrance, nivelBaseY } from '../house/walls'
import { roomWorldPos } from './layoutStore'
import { useInteractUi } from './interactUiStore'
import { useCam } from './cameraStore'
import { playerPos } from './playerPosition'
import type { Acceso } from '../data/db'

export { playerPos, playerForward } from './playerPosition'

/**
 * Estado global de la casa: a dónde camina el personaje y qué cuarto está abierto.
 *
 * La posición VIVA del personaje está en `playerPos` (mutable, sin re-render).
 * El store guarda destino, selección y cuarto activo.
 */

/** Transición animada del personaje subiendo o bajando por un acceso. */
export interface Transicion {
  acceso: Acceso
  desde: number
  hacia: number
  inicio: number // performance.now() al iniciar
  startX: number
  startZ: number
}

interface HouseState {
  target: THREE.Vector3
  /** Incrementa al cambiar destino para forzar actualización en la escena 3D. */
  navTick: number
  /** Si el personaje ignora las paredes (al entrar desde el menú lateral). */
  freeMove: boolean
  setTarget: (x: number, z: number) => void
  /** Desde el menú: el avatar va al cuarto ignorando paredes y entra al instante. */
  enterFromMenu: (id: string) => void
  /** Cuarto elegido en el menú o con clic en la casa. */
  selectedRoomId: string | null
  /** Cuarto cuya puerta está al alcance (el más próximo gana). */
  nearRoomId: string | null
  setNearRoomId: (id: string | null) => void
  /** El cuarto seleccionado está en su puerta y se puede entrar. */
  canEnterSelected: boolean
  setCanEnterSelected: (v: boolean) => void
  activeRoom: string | null
  openRoom: (id: string) => void
  closeRoom: () => void
  goToRoom: (id: string) => void
  /** Selecciona el cuarto y camina a su puerta. */
  selectRoom: (id: string) => void
  /** Clic en el cuarto 3D: solo camina a la puerta (no abre la mini-app). */
  interactRoom: (id: string) => void
  /** Abre el cuarto si el personaje está en la puerta. */
  tryEnterRoom: (id: string) => void
  /** Vista 3D con techo cerrado en cada cuarto. Independiente de `explotado`. */
  conTecho: boolean
  toggleTecho: () => void
  /**
   * Pisos separados en el aire para ver todos a la vez. Solo afecta a los niveles ≥ 1
   * (los sótanos nunca se explotan): apilado = cada piso se asienta sobre el de abajo.
   */
  explotado: boolean
  toggleExplotado: () => void
  /** Nivel/piso en el que está el personaje (0 = planta baja). */
  playerLevel: number
  /** Acceso al alcance y dirección posible (subir/bajar), o null. */
  nearAcceso: Acceso | null
  nearDir: 'subir' | 'bajar' | null
  setNearAcceso: (acceso: Acceso | null, dir: 'subir' | 'bajar' | null) => void
  /** Sube/baja un nivel usando el acceso al alcance (inicia la animación por el acceso). */
  subirNivel: () => void
  bajarNivel: () => void
  /** Animación en curso de subir/bajar (la conduce Character), o null. */
  transicion: Transicion | null
  /** La llama Character al terminar la animación: fija el nivel y suelta al personaje. */
  terminarTransicion: () => void
}

export const useHouse = create<HouseState>((set, get) => ({
  target: new THREE.Vector3(-3, 0, 0),
  navTick: 0,
  freeMove: false,
  setTarget: (x, z) =>
    set((s) => ({
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: true,
    })),
  enterFromMenu: (id) => {
    const room = getCuarto(id)
    if (!room) return
    const [x, , z] = roomWorldPos(id)
    setCuartoAbierto(true)
    set((s) => ({
      selectedRoomId: id,
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: true,
      activeRoom: id,
    }))
  },
  selectedRoomId: null,
  nearRoomId: null,
  setNearRoomId: (id) =>
    set((s) => (s.nearRoomId === id ? s : { nearRoomId: id })),
  canEnterSelected: false,
  setCanEnterSelected: (v) =>
    set((s) => (s.canEnterSelected === v ? s : { canEnterSelected: v })),
  activeRoom: null,
  openRoom: (id) => {
    useInteractUi.getState().clear()
    setCuartoAbierto(true)
    set({ activeRoom: id, selectedRoomId: id })
  },
  closeRoom: () => {
    useInteractUi.getState().clear()
    setCuartoAbierto(false)
    set({ activeRoom: null, selectedRoomId: null })
  },
  goToRoom: (id) => {
    const room = getCuarto(id)
    if (!room) return
    const [x, z] = roomEntrance(roomWorldPos(id))
    get().setTarget(x, z)
  },
  selectRoom: (id) => {
    const room = getCuarto(id)
    if (!room) return
    const [x, z] = roomEntrance(roomWorldPos(id))
    set((s) => ({
      selectedRoomId: id,
      target: new THREE.Vector3(x, 0, z),
      navTick: s.navTick + 1,
      freeMove: false,
    }))
  },
  interactRoom: (id) => {
    if (!getCuarto(id)) return
    get().selectRoom(id)
  },
  tryEnterRoom: (id: string) => {
    const room = getCuarto(id)
    if (room && estaEnPuerta(roomWorldPos(id))) get().openRoom(id)
  },
  conTecho: false,
  // Poner/quitar techo no mueve nada: los pisos solo los separa `explotado`.
  toggleTecho: () => set({ conTecho: !get().conTecho }),
  explotado: true,
  toggleExplotado: () => {
    const explotado = !get().explotado
    set({ explotado })
    // Al apilar/explotar cambia la altura del nivel: la cámara mantiene al jugador en cuadro.
    const cam = useCam.getState()
    const baseY = nivelBaseY(get().playerLevel, !explotado)
    useCam.setState({ focus: [cam.focus[0], baseY, cam.focus[2]] })
  },
  playerLevel: 0,
  nearAcceso: null,
  nearDir: null,
  setNearAcceso: (acceso, dir) =>
    set((s) =>
      s.nearAcceso === acceso && s.nearDir === dir ? s : { nearAcceso: acceso, nearDir: dir },
    ),
  subirNivel: () => {
    const { nearAcceso, nearDir, playerLevel, transicion } = get()
    if (!nearAcceso || nearDir !== 'subir' || transicion) return
    set({
      transicion: {
        acceso: nearAcceso,
        desde: playerLevel,
        hacia: playerLevel + 1,
        inicio: performance.now(),
        startX: playerPos.x,
        startZ: playerPos.z,
      },
      nearAcceso: null,
      nearDir: null,
    })
  },
  bajarNivel: () => {
    const { nearAcceso, nearDir, playerLevel, transicion } = get()
    if (!nearAcceso || nearDir !== 'bajar' || playerLevel <= 0 || transicion) return
    set({
      transicion: {
        acceso: nearAcceso,
        desde: playerLevel,
        hacia: playerLevel - 1,
        inicio: performance.now(),
        startX: playerPos.x,
        startZ: playerPos.z,
      },
      nearAcceso: null,
      nearDir: null,
    })
  },
  transicion: null,
  terminarTransicion: () => {
    const { transicion, navTick, explotado } = get()
    if (!transicion) return
    const yFinal = nivelBaseY(transicion.hacia, !explotado)
    playerPos.y = yFinal
    // El personaje ya quedó en el aterrizaje (lo dejó Character); fija nivel y suéltalo.
    set({
      playerLevel: transicion.hacia,
      transicion: null,
      target: new THREE.Vector3(playerPos.x, 0, playerPos.z),
      navTick: navTick + 1,
      freeMove: true,
    })
    // La cámara sigue al jugador al nuevo piso (Y) y lo recentra.
    useCam.setState({ focus: [playerPos.x, yFinal, playerPos.z] })
  },
}))

// Acceso a la store desde la consola en desarrollo (depuración/pruebas).
if (import.meta.env.DEV) {
  ;(window as unknown as { useHouse: typeof useHouse }).useHouse = useHouse
}
