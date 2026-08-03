import { create } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CaminoCelda, type RecordCarrera } from '../data/db'
import { worldToCeldaEntera, cellToWorld, HALF } from '../house/walls'
import { esquinaDe, puntoArco, alturaArco, H } from '../house/caminosCurvas'
import { monturaFrame, useMontura } from './monturaStore'
import { ALTURA_NIVEL } from './caminosStore'
import { enPistaLibre, metaLibre, muestrasPistaLibre, versionPistaLibre } from './pistaLibreStore'
import { useCam, type Vista } from './cameraStore'
import type { TipoVehiculo } from '../house/vehiculos'
import { sonar } from '../audio/sfx'

/**
 * Modo carrera sobre la pista de Caminos: al llegar montado (terrestre) a la
 * celda de meta se ofrece iniciar; semáforo 3-2-1 con el input congelado,
 * cronómetro por vuelta y récords persistentes por meta y vehículo
 * (db.carreras). La detección por frame corre en `house/carrera.tsx`
 * (CarreraRuntime); `conducir()` de Character.tsx lee `carreraFrame.bloqueado`
 * y `multiplicadorSuperficie`. Una vuelta cuenta si cubriste ≥60% de las
 * celdas del circuito y cruzaste la meta en el sentido del primer cruce.
 */

/** Preferencia de dificultad del rival (0–1); clave propia, no la de canchas. */
const LS_DIFICULTAD = 'mh.carreraDificultad'
const leerDificultad = (): number => {
  const v = parseFloat(localStorage.getItem(LS_DIFICULTAD) ?? '')
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5
}

/** Vehículo elegido para correr a pie (se presta uno sin objeto del mapa). */
const LS_VEHICULO = 'mh.carreraVehiculo'
const leerVehiculo = (): TipoVehiculo => {
  const v = localStorage.getItem(LS_VEHICULO)
  return v === 'bicicleta' || v === 'motocicleta' || v === 'automovil' ? v : 'automovil'
}

/** Escala visual de los corredores durante la carrera (tamaño "realista" vs pista). */
export const ESCALA_CARRERA = 0.3

/** Superficie del asfalto sobre el suelo (tope del pad de pista): el vehículo se apoya ahí. */
export const SUPERFICIE_PISTA = 0.26

/**
 * Superficie pisable del mapa: la loseta del piso exterior remata en y≈0.19 y
 * los objetos del mapa (los vehículos estacionados incluidos) se dibujan a 0.2.
 * Lo que rueda por el suelo tiene que partir de ahí o queda medio enterrado.
 */
export const SUPERFICIE_SUELO = 0.2

/** Freno del modo carrera: al ir encogidos, la velocidad de mundo se siente 3× — se reduce. */
export const VEL_CARRERA = 0.4

/** Datos por-frame de la carrera (mutables, patrón monturaFrame). */
export const carreraFrame = {
  /** Reloj en s: arranca en −3 (semáforo); 0 = banderazo. */
  reloj: 0,
  /** Congela el input del vehículo durante el semáforo (lo lee conducir()). */
  bloqueado: false,
  /** Carrera corriendo (activa la penalización fuera de pista). */
  corriendo: false,
  metaCol: 0,
  metaRow: 0,
  /** Eje de la vía en la meta (unitario) y sentido fijado en el primer cruce. */
  ejeX: 1,
  ejeZ: 0,
  sentido: 0,
  /** Momento (reloj) del último cruce de meta. */
  ultimoCruce: 0,
  celdaPrev: '',
  visitadas: new Set<string>(),
  /** Celdas totales del circuito (flood-fill desde la meta). */
  circuito: 0,
  /** Tras cancelar/terminar: no re-ofrecer hasta salir de la celda de meta. */
  recienMeta: false,
  // Ruta cerrada del circuito (SIEMPRE construida al iniciar): la recorre el
  // rival y también da el progreso del jugador (posición P1/P2) y las cajas.
  rivalActivo: false,
  rutaRival: [] as { x: number; y: number; z: number }[],
  rivalIdx: 0,
  rivalX: 0,
  rivalY: 0,
  rivalZ: 0,
  rivalH: 0,
  /** Índice de la muestra de la ruta más cercana al jugador (progreso en vivo). */
  idxJugador: 0,
  /** Posición en vivo contra el rival (1 = vas ganando). */
  posicion: 1,
  /** Pista en juego: celdas pintadas o el trazo libre (curva). */
  modo: 'celdas' as 'celdas' | 'libre',
  /** Cobertura de la vuelta en modo libre (32 sectores del circuito). */
  sectoresLibre: new Set<number>(),
  /** Versión de la pista libre al iniciar (si cambia a media carrera → cancelar). */
  versionLibre: 0,
  /** Escala visual de los corredores (1 fuera de carrera; se encoge al competir). */
  escala: 1,
  // Trompos por banana/bomba (animación por reloj, patrón offsetSalto).
  trompoInicio: 0,
  trompoDur: 0,
  trompoVueltas: 0,
  rivalTrompoInicio: 0,
  rivalTrompoDur: 0,
  rivalTrompoVueltas: 0,
}

// ─── Ítems estilo kart (banana/turbo/bomba; runtime puro, nada persistido) ───

export type TipoItem = 'banana' | 'turbo' | 'bomba'

/** Progreso 0..1 de un trompo (−1 = sin trompo). */
const progresoTrompo = (inicio: number, dur: number, ahora: number) =>
  inicio === 0 ? -1 : Math.min(1, (ahora - inicio) / Math.max(1, dur))

/** Giro extra de heading del jugador por trompo (se auto-limpia al terminar). */
export function offsetTrompoJugador(ahora: number): number {
  const p = progresoTrompo(carreraFrame.trompoInicio, carreraFrame.trompoDur, ahora)
  if (p < 0) return 0
  if (p >= 1) {
    carreraFrame.trompoInicio = 0
    return 0
  }
  return p * Math.PI * 2 * carreraFrame.trompoVueltas
}

export function offsetTrompoRival(ahora: number): number {
  const p = progresoTrompo(carreraFrame.rivalTrompoInicio, carreraFrame.rivalTrompoDur, ahora)
  if (p < 0) return 0
  if (p >= 1) {
    carreraFrame.rivalTrompoInicio = 0
    return 0
  }
  return p * Math.PI * 2 * carreraFrame.rivalTrompoVueltas
}

/** ×0.3 mientras el jugador va girando (perdió el control por banana/bomba). */
export function multiplicadorTrompo(ahora: number): number {
  const p = progresoTrompo(carreraFrame.trompoInicio, carreraFrame.trompoDur, ahora)
  return p >= 0 && p < 1 ? 0.3 : 1
}

export function rivalEnTrompo(ahora: number): boolean {
  const p = progresoTrompo(carreraFrame.rivalTrompoInicio, carreraFrame.rivalTrompoDur, ahora)
  return p >= 0 && p < 1
}

export function aplicarTrompoJugador(vueltas: number, durMs: number): void {
  const ahora = performance.now()
  if (carreraFrame.trompoInicio && ahora - carreraFrame.trompoInicio < carreraFrame.trompoDur) return
  carreraFrame.trompoInicio = ahora
  carreraFrame.trompoDur = durMs
  carreraFrame.trompoVueltas = vueltas
}

export function aplicarTrompoRival(vueltas: number, durMs: number): void {
  const ahora = performance.now()
  if (
    carreraFrame.rivalTrompoInicio &&
    ahora - carreraFrame.rivalTrompoInicio < carreraFrame.rivalTrompoDur
  )
    return
  carreraFrame.rivalTrompoInicio = ahora
  carreraFrame.rivalTrompoDur = durMs
  carreraFrame.rivalTrompoVueltas = vueltas
}

/** El mundo 3D (itemsCarrera.tsx) registra aquí cómo materializar un ítem usado. */
let ejecutorItem: ((item: TipoItem) => void) | null = null
export function registrarEjecutorItem(fn: (item: TipoItem) => void): void {
  ejecutorItem = fn
}

// ─── Red de pista (celdas tipo 'pista'; la sincroniza CarreraRuntime) ───

let red = new Map<string, CaminoCelda>()
let meta: CaminoCelda | null = null

export function setRedPista(filas: CaminoCelda[]) {
  red = new Map(filas.filter((f) => f.tipo === 'pista').map((f) => [`${f.col},${f.row}`, f]))
  meta = filas.find((f) => f.tipo === 'pista' && f.meta) ?? null
  // Si la meta desapareció (editor) con la carrera en marcha, se cancela.
  const s = useCarrera.getState()
  if (
    s.fase &&
    carreraFrame.modo === 'celdas' &&
    (!meta || meta.col !== carreraFrame.metaCol || meta.row !== carreraFrame.metaRow)
  )
    s.cancelar()
}

export const celdaMeta = () => meta
export const esPista = (col: number, row: number) => red.has(`${col},${row}`)

/**
 * Multiplicador de velocidad por superficie para vehículos terrestres: el
 * asfalto siempre premia; el pasto castiga solo con la carrera corriendo.
 */
export function multiplicadorSuperficie(x: number, z: number): number {
  const c = worldToCeldaEntera(x, z)
  if (red.has(`${c.col},${c.row}`)) return 1.15
  if (pistaDiagonalEn(x, z, c.col, c.row)) return 1.15 // la cinta de 45° también es asfalto
  if (enPistaLibre(x, z)) return 1.15 // la cinta del trazo libre también premia
  return carreraFrame.corriendo ? 0.55 : 1
}

/** Medio ancho de la cinta diagonal (la caja de `DiagonalPista` mide 2.2). */
const MEDIO_DIAGONAL = 1.1

/**
 * Celda de pista dueña de la CINTA DIAGONAL que cruza una celda vacía. Las
 * conexiones de 45° unen dos celdas de pista pasando por la esquina común, así
 * que el asfalto invade las dos celdas intermedias: sin esto, el vehículo caía
 * al ras del suelo justo en el vértice ("pozo" en las diagonales).
 */
function pistaDiagonalEn(x: number, z: number, col: number, row: number): CaminoCelda | null {
  const [cx, , cz] = cellToWorld(col, row)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const a = red.get(`${col + sx},${row}`)
      // Misma regla que el render: sin pista en las celdas intermedias no hay diagonal.
      if (!a || !red.has(`${col},${row + sz}`) || red.has(`${col + sx},${row + sz}`)) continue
      // Distancia a la recta que une los centros de las dos celdas (pasa por la esquina).
      const d = Math.abs((x - (cx + sx * HALF)) * sz + (z - (cz + sz * HALF)) * sx) / Math.SQRT2
      if (d <= MEDIO_DIAGONAL) return a
    }
  }
  return null
}

/**
 * Altura de la superficie bajo el punto: el asfalto de la pista si la hay, si no
 * el suelo del mapa. El vehículo se apoya encima, no enterrado en él (clave con
 * la escala de carrera). Incluye la elevación de las rampas de la pista.
 */
export function alturaSueloEn(x: number, z: number): number {
  const c = worldToCeldaEntera(x, z)
  const f = red.get(`${c.col},${c.row}`) ?? pistaDiagonalEn(x, z, c.col, c.row)
  if (f) return SUPERFICIE_PISTA + (f.altura ?? 0) * ALTURA_NIVEL
  if (enPistaLibre(x, z)) return SUPERFICIE_PISTA // el trazo libre es plano (v1)
  return SUPERFICIE_SUELO
}

export type FaseCarrera = null | 'previa' | 'semaforo' | 'corriendo' | 'terminada'

interface CarreraState {
  fase: FaseCarrera
  vehiculo: TipoVehiculo | null
  /** Llegaste montado en tu propio vehículo (si no, se presta el elegido). */
  montadoPropio: boolean
  vueltasTotales: number
  vueltaActual: number
  /** Tiempos por vuelta completada (ms). */
  tiempos: number[]
  /** Récord persistido de mejor vuelta (ms) para esta meta y vehículo. */
  mejorVuelta: number | null
  dificultad: number
  rivalId: string | null
  rivalNombre: string | null
  rivalColor: string | null
  /** Vueltas completadas por el rival (HUD). */
  rivalVueltas: number
  resultado: null | 'ganaste' | 'perdiste'
  /** Clave del mensaje transitorio del HUD ('record', 'corta', …). */
  mensaje: string | null
  /** Ítem en el slot (banana/turbo/bomba; uno a la vez). */
  item: TipoItem | null
  /** Recoge un ítem de una caja (solo con el slot vacío). */
  darItem: (item: TipoItem) => void
  /** Usa el ítem del slot (botón del HUD o tecla E). */
  usarItem: () => void
  /** Abre el prompt al llegar a la meta (null = a pie: se elige vehículo en el menú). */
  ofrecer: (vehiculo: TipoVehiculo | null, modo?: 'celdas' | 'libre') => Promise<void>
  /** Cambia el vehículo a correr (solo a pie; recarga el récord de ese vehículo). */
  setVehiculo: (t: TipoVehiculo) => Promise<void>
  iniciar: (vueltas: number, rival?: { id: string; nombre: string; color?: string }) => void
  /** Semáforo en 0: libera el input y arranca el cronómetro. */
  banderazo: () => void
  completarVuelta: (ms: number) => Promise<void>
  /** El rival completó sus vueltas antes que tú (fase 6). */
  derrota: () => Promise<void>
  setDificultad: (d: number) => void
  cancelar: () => void
  avisar: (m: string) => void
}

let avisoTimer = 0
/** Vista de cámara previa a la carrera (para restaurarla al terminar/salir). */
let vistaPrevia: Vista | null = null

export const useCarrera = create<CarreraState>((set, get) => ({
  fase: null,
  vehiculo: null,
  montadoPropio: false,
  vueltasTotales: 3,
  vueltaActual: 1,
  tiempos: [],
  mejorVuelta: null,
  dificultad: leerDificultad(),
  rivalId: null,
  rivalNombre: null,
  rivalColor: null,
  rivalVueltas: 0,
  resultado: null,
  mensaje: null,
  item: null,

  darItem: (item) => {
    if (get().fase === 'corriendo' && !get().item) {
      sonar('recoger')
      set({ item })
    }
  },

  usarItem: () => {
    const item = get().item
    if (!item || get().fase !== 'corriendo') return
    set({ item: null })
    ejecutorItem?.(item)
  },

  ofrecer: async (vehiculo, modo = 'celdas') => {
    if (get().fase) return
    if (modo === 'libre') {
      // La meta del trazo usa SU celda como clave de récords (misma tabla).
      const m = metaLibre()
      if (!m) return
      const c = worldToCeldaEntera(m.x, m.z)
      carreraFrame.modo = 'libre'
      carreraFrame.metaCol = c.col
      carreraFrame.metaRow = c.row
    } else {
      if (!meta) return
      carreraFrame.modo = 'celdas'
      carreraFrame.metaCol = meta.col
      carreraFrame.metaRow = meta.row
    }
    const elegido = vehiculo ?? leerVehiculo()
    set({
      fase: 'previa',
      vehiculo: elegido,
      montadoPropio: vehiculo != null,
      mejorVuelta: null,
      tiempos: [],
      rivalVueltas: 0,
      resultado: null,
      mensaje: null,
    })
    const f = await db.carreras
      .where('[metaCol+metaRow+vehiculo]')
      .equals([carreraFrame.metaCol, carreraFrame.metaRow, elegido])
      .first()
    if (get().fase === 'previa' && get().vehiculo === elegido)
      set({ mejorVuelta: f?.mejorVuelta ?? null })
  },

  setVehiculo: async (t) => {
    if (get().fase !== 'previa' || get().montadoPropio) return
    localStorage.setItem(LS_VEHICULO, t)
    set({ vehiculo: t, mejorVuelta: null })
    const f = await db.carreras
      .where('[metaCol+metaRow+vehiculo]')
      .equals([carreraFrame.metaCol, carreraFrame.metaRow, t])
      .first()
    if (get().fase === 'previa' && get().vehiculo === t)
      set({ mejorVuelta: f?.mejorVuelta ?? null })
  },

  iniciar: (vueltas, rival) => {
    const s = get()
    if (s.fase !== 'previa' && s.fase !== 'terminada') return
    const { metaCol, metaRow } = carreraFrame
    const libre = carreraFrame.modo === 'libre'
    let mx: number
    let mz: number
    if (libre) {
      const m = metaLibre()
      const muestras = muestrasPistaLibre()
      // Largo mínimo ~25 u (las muestras van cada ~0.35 u).
      if (!m || muestras.length < 72) {
        get().avisar('corta')
        return
      }
      carreraFrame.circuito = 32 // cobertura de vuelta por sectores del trazo
      carreraFrame.sectoresLibre = new Set()
      carreraFrame.versionLibre = versionPistaLibre()
      carreraFrame.ejeX = m.tx
      carreraFrame.ejeZ = m.tz
      mx = m.x
      mz = m.z
    } else {
      const inicio = `${metaCol},${metaRow}`
      if (!red.has(inicio)) return
      // Circuito alcanzable desde la meta (adyacencia ortogonal + diagonal).
      const vistas = new Set<string>([inicio])
      const cola: [number, number][] = [[metaCol, metaRow]]
      while (cola.length) {
        const [c, r] = cola.pop() as [number, number]
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue
            const k = `${c + dx},${r + dz}`
            if (!vistas.has(k) && red.has(k)) {
              vistas.add(k)
              cola.push([c + dx, r + dz])
            }
          }
      }
      if (vistas.size < 8) {
        get().avisar('corta')
        return
      }
      carreraFrame.circuito = vistas.size
      carreraFrame.celdaPrev = inicio
      // Eje de la vía en la meta (mismo criterio que el pórtico del render).
      const eo = red.has(`${metaCol + 1},${metaRow}`) || red.has(`${metaCol - 1},${metaRow}`)
      carreraFrame.ejeX = eo ? 1 : 0
      carreraFrame.ejeZ = eo ? 0 : 1
      const [wx, , wz] = cellToWorld(metaCol, metaRow)
      mx = wx
      mz = wz
    }
    carreraFrame.visitadas = new Set()
    // A pie: se presta el vehículo elegido, en la meta mirando el eje/tangente.
    if (!monturaFrame.montado && s.vehiculo) {
      useMontura
        .getState()
        .montarPrestado(s.vehiculo, mx, mz, Math.atan2(carreraFrame.ejeX, carreraFrame.ejeZ))
    }
    // Sentido de la vuelta: hacia donde apunta el vehículo en este momento.
    const dirH =
      Math.sin(monturaFrame.heading) * carreraFrame.ejeX +
      Math.cos(monturaFrame.heading) * carreraFrame.ejeZ
    // En libre el runtime siempre avanza "hacia adelante" (la ruta se invierte
    // si arrancaste contra la tangente); en celdas decide el heading.
    carreraFrame.sentido = libre ? 1 : dirH >= 0 ? 1 : -1
    if (libre && dirH < 0) {
      carreraFrame.ejeX = -carreraFrame.ejeX
      carreraFrame.ejeZ = -carreraFrame.ejeZ
    }
    carreraFrame.reloj = -3
    carreraFrame.ultimoCruce = 0
    carreraFrame.bloqueado = true
    carreraFrame.corriendo = false
    carreraFrame.trompoInicio = 0
    carreraFrame.rivalTrompoInicio = 0
    // Ruta del circuito (SIEMPRE): la usan el rival, las cajas de ítem y el
    // progreso del jugador para la posición en vivo.
    if (libre) {
      const base = muestrasPistaLibre()
      carreraFrame.rutaRival = dirH >= 0 ? [...base] : [base[0], ...base.slice(1).reverse()]
    } else {
      carreraFrame.rutaRival = construirRutaRival()
    }
    carreraFrame.idxJugador = 0
    carreraFrame.posicion = 1
    // Rival: su lugar de salida (a un costado de la meta, perpendicular al eje).
    carreraFrame.rivalActivo = false
    if (rival && carreraFrame.rutaRival.length >= 2) {
      carreraFrame.rivalActivo = true
      carreraFrame.rivalIdx = 0
      carreraFrame.rivalX = mx - carreraFrame.ejeZ * 1.2
      carreraFrame.rivalZ = mz + carreraFrame.ejeX * 1.2
      carreraFrame.rivalY = libre
        ? 0
        : (red.get(`${metaCol},${metaRow}`)?.altura ?? 0) * ALTURA_NIVEL
      carreraFrame.rivalH = Math.atan2(
        carreraFrame.ejeX * carreraFrame.sentido,
        carreraFrame.ejeZ * carreraFrame.sentido,
      )
    }
    set({
      fase: 'semaforo',
      vueltasTotales: vueltas,
      vueltaActual: 1,
      tiempos: [],
      resultado: null,
      mensaje: null,
      item: null,
      rivalVueltas: 0,
      rivalId: rival?.id ?? null,
      rivalNombre: rival?.nombre ?? null,
      rivalColor: rival?.color ?? null,
    })
    // Cámara en 3ª persona siguiendo al corredor (guarda la vista para restaurarla).
    const cam = useCam.getState()
    if (vistaPrevia === null) vistaPrevia = cam.vista
    cam.setVista('tercera')
  },

  banderazo: () => {
    if (get().fase !== 'semaforo') return
    carreraFrame.bloqueado = false
    carreraFrame.corriendo = true
    sonar('silbato')
    set({ fase: 'corriendo' })
  },

  completarVuelta: async (ms) => {
    const s = get()
    if (s.fase !== 'corriendo' || !s.vehiculo) return
    const tiempos = [...s.tiempos, ms]
    const esRecord = s.mejorVuelta == null || ms < s.mejorVuelta
    const mejorVuelta = esRecord ? ms : (s.mejorVuelta as number)
    const termina = tiempos.length >= s.vueltasTotales
    if (termina) {
      carreraFrame.corriendo = false
      carreraFrame.recienMeta = true
      set({
        fase: 'terminada',
        tiempos,
        mejorVuelta,
        resultado: s.rivalId != null ? 'ganaste' : null,
        mensaje: null,
        item: null,
      })
      // El vehículo prestado se devuelve al terminar (el propio se queda).
      if (useMontura.getState().prestado) useMontura.getState().solicitarDesmontar()
    } else {
      set({ tiempos, mejorVuelta, vueltaActual: tiempos.length + 1 })
      get().avisar(esRecord ? 'record' : 'vuelta')
    }
    await guardarRecord({
      vehiculo: s.vehiculo,
      mejorVuelta: ms,
      total: termina ? tiempos.reduce((a, b) => a + b, 0) : null,
      vueltas: s.vueltasTotales,
      victoria: termina && s.rivalId != null,
    })
  },

  derrota: async () => {
    const s = get()
    if (s.fase !== 'corriendo') return
    carreraFrame.corriendo = false
    carreraFrame.recienMeta = true
    set({ fase: 'terminada', resultado: 'perdiste', mensaje: null, item: null })
    if (useMontura.getState().prestado) useMontura.getState().solicitarDesmontar()
    if (s.vehiculo) await guardarRecord({ vehiculo: s.vehiculo, derrota: true })
  },

  setDificultad: (dificultad) => {
    const d = Math.min(1, Math.max(0, dificultad))
    localStorage.setItem(LS_DIFICULTAD, String(d))
    set({ dificultad: d })
  },

  cancelar: () => {
    if (!get().fase) return
    carreraFrame.bloqueado = false
    carreraFrame.corriendo = false
    carreraFrame.recienMeta = true
    carreraFrame.rivalActivo = false
    if (useMontura.getState().prestado) useMontura.getState().solicitarDesmontar()
    // Restaura la vista de cámara previa a la carrera.
    if (vistaPrevia !== null) {
      useCam.getState().setVista(vistaPrevia)
      vistaPrevia = null
    }
    window.clearTimeout(avisoTimer)
    set({
      fase: null,
      resultado: null,
      mensaje: null,
      item: null,
      rivalId: null,
      rivalNombre: null,
      rivalColor: null,
    })
  },

  avisar: (mensaje) => {
    set({ mensaje })
    window.clearTimeout(avisoTimer)
    avisoTimer = window.setTimeout(() => set({ mensaje: null }), 2200)
  },
}))

/** Récords de todos los vehículos de una meta (tabla del HUD; reactivo a db.carreras). */
export function useRecordsDeMeta(metaCol: number, metaRow: number): RecordCarrera[] | undefined {
  return useLiveQuery(
    () => db.carreras.filter((r) => r.metaCol === metaCol && r.metaRow === metaRow).toArray(),
    [metaCol, metaRow],
  )
}

/** Funde en el récord de esta meta+vehículo lo logrado (mejores tiempos, W/L). */
async function guardarRecord(d: {
  vehiculo: string
  mejorVuelta?: number
  total?: number | null
  vueltas?: number
  victoria?: boolean
  derrota?: boolean
}) {
  const { metaCol, metaRow } = carreraFrame
  const fila = await db.carreras
    .where('[metaCol+metaRow+vehiculo]')
    .equals([metaCol, metaRow, d.vehiculo])
    .first()
  const cambios: Partial<RecordCarrera> & { fecha: number } = { fecha: Date.now() }
  if (d.mejorVuelta != null && (fila?.mejorVuelta == null || d.mejorVuelta < fila.mejorVuelta))
    cambios.mejorVuelta = d.mejorVuelta
  if (d.total != null) {
    // El total solo se compara contra un récord al mismo número de vueltas.
    const comparable = fila?.mejorTotal != null && fila.vueltasDeTotal === d.vueltas
    if (!comparable || d.total < (fila?.mejorTotal ?? Infinity)) {
      cambios.mejorTotal = d.total
      cambios.vueltasDeTotal = d.vueltas
    }
  }
  if (d.victoria) cambios.victorias = (fila?.victorias ?? 0) + 1
  if (d.derrota) cambios.derrotas = (fila?.derrotas ?? 0) + 1
  if (fila?.id != null) await db.carreras.update(fila.id, cambios)
  else await db.carreras.add({ metaCol, metaRow, vehiculo: d.vehiculo, ...cambios })
}

const DIRS4: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]
const DIRS8: [number, number][] = [...DIRS4, [1, -1], [1, 1], [-1, 1], [-1, -1]]

/**
 * Ruta del rival: polilínea densa que recorre el circuito desde la meta en el
 * sentido de la carrera (de frente en cruces, prefiriendo ortogonales; arcos
 * de esquina en los giros en L, como el tren). Corta al volver a la meta, así
 * el salto del último punto al primero equivale a cruzarla (cuenta la vuelta).
 */
function construirRutaRival(): { x: number; y: number; z: number }[] {
  const { metaCol, metaRow, ejeX, ejeZ, sentido } = carreraFrame
  const pts: { x: number; y: number; z: number }[] = []
  const elev = (c?: CaminoCelda) => (c?.altura ?? 0) * ALTURA_NIVEL
  let prev: { col: number; row: number } | null = null
  let cur = { col: metaCol, row: metaRow }
  const maxPasos = Math.max(40, carreraFrame.circuito * 4)
  for (let n = 0; n < maxPasos; n++) {
    const cands = DIRS8.filter(
      ([dx, dz]) =>
        red.has(`${cur.col + dx},${cur.row + dz}`) &&
        !(prev && cur.col + dx === prev.col && cur.row + dz === prev.row),
    )
    let dir: [number, number] | undefined
    if (prev) {
      const ddx = cur.col - prev.col
      const ddz = cur.row - prev.row
      dir = cands.find(([dx, dz]) => dx === ddx && dz === ddz) // de frente
    } else {
      dir = cands.find(([dx, dz]) => dx === ejeX * sentido && dz === ejeZ * sentido)
    }
    if (!dir) {
      const ortos = cands.filter(([dx, dz]) => dx === 0 || dz === 0)
      dir = ortos[0] ?? cands[0]
    }
    if (!dir) break // punta muerta: la ruta queda abierta
    const [dirX, dirZ] = dir
    const [wx, , wz] = cellToWorld(cur.col, cur.row)
    const celdaCur = red.get(`${cur.col},${cur.row}`)
    const celdaPrev = prev ? red.get(`${prev.col},${prev.row}`) : undefined
    const sig = { col: cur.col + dirX, row: cur.row + dirZ }
    const celdaSig = red.get(`${sig.col},${sig.row}`)
    const yc = elev(celdaCur)
    // Tránsito por la celda: arco si el giro es una L ortogonal; si no, el centro.
    let interior: { x: number; y: number; z: number }[] = [{ x: wx, y: yc, z: wz }]
    const iDe = prev
      ? DIRS4.findIndex(([dx, dz]) => cur.col + dx === prev!.col && cur.row + dz === prev!.row)
      : -1
    const iA = DIRS4.findIndex(([dx, dz]) => dx === dirX && dz === dirZ)
    if (iDe >= 0 && iA >= 0) {
      const brazos: (CaminoCelda | null)[] = [null, null, null, null]
      brazos[iDe] = celdaPrev ?? celdaCur ?? null
      brazos[iA] = celdaSig ?? celdaCur ?? null
      const arco = esquinaDe(brazos)
      if (arco) {
        const yJm = (yc + elev(brazos[arco.j] ?? undefined)) / 2
        const yIm = (yc + elev(brazos[arco.i] ?? undefined)) / 2
        const desdeJ = arco.j === iDe
        interior = []
        for (let k = 1; k <= 6; k++) {
          const t = (desdeJ ? k : 7 - k) / 7
          const p = puntoArco(arco, H, t)
          interior.push({ x: wx + p.x, y: alturaArco(yJm, yc, yIm, t), z: wz + p.z })
        }
      }
    }
    pts.push(...interior)
    const [sx, , sz] = cellToWorld(sig.col, sig.row)
    pts.push({ x: (wx + sx) / 2, y: (yc + elev(celdaSig)) / 2, z: (wz + sz) / 2 })
    prev = cur
    cur = sig
    if (cur.col === metaCol && cur.row === metaRow) break // circuito cerrado
  }
  return pts
}
