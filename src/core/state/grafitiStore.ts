import { create } from 'zustand'
import { db } from '../data/db'
import { murosLibresRepo, zonasRepo } from '../data/repository'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import * as lienzo from '../house/grafitiLienzo'
import type { HerramientaGrafiti } from '../house/grafitiLienzo'
import type { MuroSelData } from '../house/PlanoMuroSelector3D'
import {
  roomWallSegments,
  centroCuarto3D,
  nivelBaseY,
  edgeKey,
  WALL_H,
  WALL_T,
  FOOTPRINT_DEFAULT,
} from '../house/walls'
import { filtrarSegmentosPorForma } from '../house/murosPerimetroLoseta'
import { ocupadoConZonas } from '../house/planoGeometria'
import { segmentosMundoMuroLibre } from '../house/murosLibre'
import { PINCELES_DEFAULT } from '../house/murosPuertas'

/** Separación del decal respecto a la cara (mayor que el relieve del ladrillo, 0.015). */
export const EPS_GRAFITI = 0.02

/** Cara pintada de un muro: de cuarto (cara mundial) o libre (cara local del segmento). */
export type SuperficieGrafiti =
  | { tipo: 'cuarto'; roomId: string; clave: string; cara: 'N' | 'S' | 'E' | 'O' }
  | { tipo: 'libre'; muroLibreId: number; seg: number; cara: 'A' | 'B' }

/** Clave única de la cara (índice `superficie` de la tabla `grafitis` y de `porMuro`). */
export const claveSuperficie = (s: SuperficieGrafiti): string =>
  s.tipo === 'cuarto'
    ? `cuarto:${s.roomId}:${s.clave}:${s.cara}`
    : `libre:${s.muroLibreId}:${s.seg}:${s.cara}`

/** Muro elegido para pintar: de cuarto (userData.muroSel) o libre (id + segmento). */
export type SeleccionGrafiti = MuroSelData | { muroLibreId: number; seg: number }

export interface ModoGrafiti {
  superficie: SuperficieGrafiti
  /** Centro mundial de la cara (con EPS hacia afuera). */
  centro: [number, number, number]
  /** Rotación Y del plano del lienzo (normal = [sin(rotY), 0, cos(rotY)]). */
  rotY: number
  /** Metros del lienzo. */
  ancho: number
  alto: number
  /** Ya había un grafiti guardado en esta cara (habilita «Borrar grafiti»). */
  existente: boolean
}

interface GrafitiState {
  /** objectURL del PNG guardado por cara (clave de `claveSuperficie`). */
  porMuro: Record<string, string>
  /** Cara en edición (null = no se está pintando). */
  modo: ModoGrafiti | null
  color: string
  grosor: number
  herramienta: HerramientaGrafiti
  /** Cambia al deshacer/limpiar para que la textura viva se refresque. */
  version: number
  puedeDeshacer: boolean
  /** Aviso transitorio del panel ('sinMuro' | 'conPuerta' | 'curvo'). */
  aviso: string | null
  cargar: () => Promise<void>
  /** Valida el muro elegido, prepara el lienzo y entra al modo pintar. */
  iniciar: (sel: SeleccionGrafiti, normal: { x: number; y: number; z: number }) => Promise<void>
  guardar: () => Promise<void>
  borrarActual: () => Promise<void>
  salir: () => void
  avisar: (clave: string) => void
  empezarTrazo: (u: number, v: number) => void
  deshacer: () => void
  limpiar: () => void
  /** Bote de pintura: rellena todo el lienzo con el color activo. */
  rellenar: () => void
  setColor: (c: string) => void
  setGrosor: (g: number) => void
  setHerramienta: (h: HerramientaGrafiti) => void
}

// Vista de juego a restaurar al salir del modo pintar (solo iso/tercera/primera).
let vistaAnterior: Vista = 'iso'
let avisoTimer = 0

export const useGrafitis = create<GrafitiState>((set, get) => ({
  porMuro: {},
  modo: null,
  color: '#e11d48',
  grosor: 14,
  herramienta: 'pincel',
  version: 0,
  puedeDeshacer: false,
  aviso: null,

  cargar: async () => {
    const filas = await db.grafitis.toArray()
    const porMuro: Record<string, string> = {}
    for (const f of filas) porMuro[f.superficie] = URL.createObjectURL(f.imagen)
    set({ porMuro })
  },

  iniciar: async (sel, normal) => {
    if (get().modo) return
    // Impacto en la tapa del muro (arriba/abajo): no es una cara pintable.
    if (Math.abs(normal.y) > 0.7) {
      get().avisar('sinMuro')
      return
    }
    let superficie: SuperficieGrafiti
    let centro: [number, number, number]
    let rotY: number
    let ancho: number
    let alto: number
    const apilado = !useHouse.getState().explotado

    if ('roomId' in sel) {
      const clave = edgeKey(sel.off, sel.side)
      const L = useLayout.getState()
      const anchor = L.cells[sel.roomId]
      if (!anchor) return
      const fp = L.footprints[sel.roomId] ?? FOOTPRINT_DEFAULT
      const nivel = L.niveles[sel.roomId] ?? 0
      // Mismos insumos que Room3D para que el segmento coincida EXACTO con lo renderizado.
      const ocupado = ocupadoConZonas(nivel, L.ocupadoPorNivel, await zonasRepo.list())
      const formas = L.formasCelda[sel.roomId] ?? {}
      const segs = filtrarSegmentosPorForma(
        roomWallSegments(anchor, fp, ocupado, L.wallOverrides[sel.roomId], L.edgeStyles[sel.roomId], L.pinceles[sel.roomId] ?? PINCELES_DEFAULT, formas),
        formas,
      )
      // Cuerpo principal de la arista: una puerta la parte en 2 mitades (no pintable).
      const cuerpos = segs.filter((s) => s.clave === clave && !s.alturaM && !s.yBase)
      if (cuerpos.length !== 1) {
        get().avisar('conPuerta')
        return
      }
      const s = cuerpos[0]
      const horizontal = s.sx >= s.sz
      ancho = horizontal ? s.sx : s.sz
      const grosor = horizontal ? s.sz : s.sx
      alto = WALL_H * (s.alto ?? 1)
      // El muro de cuarto es una caja alineada a ejes: la cara sale del signo de la normal.
      const cara = horizontal ? (normal.z >= 0 ? 'S' : 'N') : (normal.x >= 0 ? 'E' : 'O')
      const nx = cara === 'E' ? 1 : cara === 'O' ? -1 : 0
      const nz = cara === 'S' ? 1 : cara === 'N' ? -1 : 0
      rotY = cara === 'S' ? 0 : cara === 'N' ? Math.PI : cara === 'E' ? Math.PI / 2 : -Math.PI / 2
      const [rx, , rz] = centroCuarto3D(anchor, fp)
      const yBase = nivelBaseY(nivel, apilado)
      centro = [rx + s.cx + nx * (grosor / 2 + EPS_GRAFITI), yBase + alto / 2, rz + s.cz + nz * (grosor / 2 + EPS_GRAFITI)]
      superficie = { tipo: 'cuarto', roomId: sel.roomId, clave, cara }
    } else {
      const m = (await murosLibresRepo.list()).find((x) => x.id === sel.muroLibreId)
      if (!m) return
      if (m.clase === 'forma' && m.forma === 'circular') {
        get().avisar('curvo')
        return
      }
      if (m.puerta) {
        get().avisar('conPuerta')
        return
      }
      const L = useLayout.getState()
      const sm = segmentosMundoMuroLibre(m, L.gridCols, L.gridRows)[sel.seg]
      if (!sm) return
      const dx = sm.x2 - sm.x1
      const dz = sm.z2 - sm.z1
      ancho = Math.hypot(dx, dz)
      alto = WALL_H * (m.alto ?? 1)
      rotY = Math.atan2(-dz, dx)
      // Cara A = +Z local del segmento; B = la opuesta.
      const nAx = Math.sin(rotY)
      const nAz = Math.cos(rotY)
      const cara = normal.x * nAx + normal.z * nAz >= 0 ? 'A' : 'B'
      const signo = cara === 'A' ? 1 : -1
      if (cara === 'B') rotY += Math.PI
      const yBase = nivelBaseY(m.nivel, apilado)
      centro = [
        (sm.x1 + sm.x2) / 2 + nAx * signo * (WALL_T / 2 + EPS_GRAFITI),
        yBase + alto / 2,
        (sm.z1 + sm.z2) / 2 + nAz * signo * (WALL_T / 2 + EPS_GRAFITI),
      ]
      superficie = { tipo: 'libre', muroLibreId: sel.muroLibreId, seg: sel.seg, cara }
    }

    const fila = await db.grafitis.where('superficie').equals(claveSuperficie(superficie)).first()
    await lienzo.iniciar(ancho, alto, fila?.imagen)
    vistaAnterior = useCam.getState().vista
    set({
      modo: { superficie, centro, rotY, ancho, alto, existente: !!fila },
      aviso: null,
      version: 0,
      puedeDeshacer: false,
    })
    useCam.getState().enfocarGrafiti({ centro, rotY, ancho, alto })
    setCuartoAbierto(true)
    // El clic que seleccionó el muro también pudo fijar un destino de caminata: cancelarlo.
    useHouse.getState().target.set(playerPos.x, 0, playerPos.z)
  },

  guardar: async () => {
    const modo = get().modo
    if (!modo) return
    const blob = await lienzo.aBlob()
    const clave = claveSuperficie(modo.superficie)
    const fila = await db.grafitis.where('superficie').equals(clave).first()
    if (fila?.id) await db.grafitis.update(fila.id, { imagen: blob })
    else await db.grafitis.add({ superficie: clave, imagen: blob })
    const oldUrl = get().porMuro[clave]
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    set((s) => ({ porMuro: { ...s.porMuro, [clave]: URL.createObjectURL(blob) } }))
    get().salir()
  },

  borrarActual: async () => {
    const modo = get().modo
    if (!modo) return
    const clave = claveSuperficie(modo.superficie)
    await db.grafitis.where('superficie').equals(clave).delete()
    const url = get().porMuro[clave]
    if (url) URL.revokeObjectURL(url)
    set((s) => {
      const porMuro = { ...s.porMuro }
      delete porMuro[clave]
      return { porMuro }
    })
    get().salir()
  },

  salir: () => {
    if (!get().modo) return
    set({ modo: null })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  avisar: (aviso) => {
    set({ aviso })
    window.clearTimeout(avisoTimer)
    avisoTimer = window.setTimeout(() => set({ aviso: null }), 2500)
  },

  empezarTrazo: (u, v) => {
    lienzo.empezarTrazo(u, v)
    set({ puedeDeshacer: lienzo.puedeDeshacer() })
  },
  deshacer: () => {
    if (lienzo.deshacer()) set((s) => ({ version: s.version + 1, puedeDeshacer: lienzo.puedeDeshacer() }))
  },
  limpiar: () => {
    lienzo.limpiar()
    set((s) => ({ version: s.version + 1, puedeDeshacer: lienzo.puedeDeshacer() }))
  },
  rellenar: () => {
    lienzo.rellenar(get().color)
    set((s) => ({ version: s.version + 1, puedeDeshacer: lienzo.puedeDeshacer() }))
  },
  setColor: (color) => set({ color }),
  setGrosor: (grosor) => set({ grosor }),
  setHerramienta: (herramienta) => set({ herramienta }),
}))

/** Carga los grafitis guardados una vez al arrancar la app. */
void useGrafitis.getState().cargar()
