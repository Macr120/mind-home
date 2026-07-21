import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { caminosRepo } from '../data/repository'
import { useHouse, playerPos } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { monturaFrame } from '../state/monturaStore'
import { trenFrame } from '../state/trenStore'
import { useAsistentes, getAsistente } from '../state/asistentesStore'
import {
  useCarrera,
  carreraFrame,
  setRedPista,
  celdaMeta,
  esPista,
  ESCALA_CARRERA,
  VEL_CARRERA,
  SUPERFICIE_PISTA,
  rivalEnTrompo,
  offsetTrompoRival,
} from '../state/carreraStore'
import { metaLibre, hayPistaLibre, versionPistaLibre } from '../state/pistaLibreStore'
import { vehiculoDe, FORMA_VEHICULO } from './vehiculos'
import { ModeloMascota } from './Asistente3D'
import { Prendas } from './Prendas'
import { ANCLAS_FORMA } from './apariencia'
import { worldToCeldaEntera, cellToWorld, SIZE } from './walls'

/**
 * Runtime del modo carrera (sin render propio): sincroniza la red de pista con
 * db.caminos, ofrece iniciar al llegar montado a la meta, corre semáforo y
 * cronómetro, y valida vueltas (cobertura ≥60% del circuito + sentido fijado
 * en el primer cruce). El HUD 2D vive en `ui/CarreraOverlay.tsx`.
 */
export function CarreraRuntime() {
  const filas = caminosRepo.useAll()
  useEffect(() => {
    setRedPista(filas ?? [])
  }, [filas])

  const prev = useRef({ x: 0, z: 0 })

  useFrame((_, delta) => {
    const s = useCarrera.getState()
    // Escala de los corredores: encogidos mientras se compite (transición suave).
    const objEsc = s.fase === 'semaforo' || s.fase === 'corriendo' ? ESCALA_CARRERA : 1
    carreraFrame.escala += (objEsc - carreraFrame.escala) * 0.08
    const { transicion, playerLevel, activeRoom } = useHouse.getState()
    const editMode = useLayout.getState().editMode
    const tipoMontado = monturaFrame.montado ? monturaFrame.tipo : null
    const montadoTerrestre = tipoMontado != null && tipoMontado !== 'ovni'
    const aPie = !monturaFrame.montado && !trenFrame.montado
    const celda = worldToCeldaEntera(playerPos.x, playerPos.z)
    const kCelda = `${celda.col},${celda.row}`
    const enMeta = celda.col === carreraFrame.metaCol && celda.row === carreraFrame.metaRow

    // Meta del trazo libre (por distancia, no por celda).
    const mLibre = metaLibre()
    const sobreMetaLibre =
      mLibre != null && Math.hypot(playerPos.x - mLibre.x, playerPos.z - mLibre.z) < 1.6

    if (!s.fase) {
      const m = celdaMeta()
      const sobreMeta = m != null && celda.col === m.col && celda.row === m.row
      if (carreraFrame.recienMeta && !sobreMeta && !sobreMetaLibre)
        carreraFrame.recienMeta = false
      if (
        !carreraFrame.recienMeta &&
        (montadoTerrestre || aPie) &&
        playerLevel === 0 &&
        !activeRoom &&
        !editMode &&
        !transicion
      ) {
        if (sobreMeta) void s.ofrecer(montadoTerrestre ? tipoMontado : null)
        else if (sobreMetaLibre) void s.ofrecer(montadoTerrestre ? tipoMontado : null, 'libre')
      }
    } else if (s.fase === 'previa') {
      // El prompt se cierra al alejarse de la meta, subirse al tren o abrir algo encima.
      const enLaMeta = carreraFrame.modo === 'libre' ? sobreMetaLibre : enMeta
      if ((!montadoTerrestre && !aPie) || editMode || activeRoom || !enLaMeta) s.cancelar()
    } else if (s.fase === 'semaforo' || s.fase === 'corriendo') {
      // Editar/borrar el trazo con la carrera libre en marcha también cancela.
      const pistaLibreRota =
        carreraFrame.modo === 'libre' &&
        (!hayPistaLibre() || versionPistaLibre() !== carreraFrame.versionLibre)
      if (!montadoTerrestre || editMode || activeRoom || pistaLibreRota) {
        // Con la carrera en marcha: bajarse (o abrir editor/cuarto) la cancela.
        s.cancelar()
      } else if (s.fase === 'semaforo') {
        carreraFrame.reloj += delta
        if (carreraFrame.reloj >= 0) s.banderazo()
      } else {
        carreraFrame.reloj += delta
        avanzarRival(delta)
        const idxAntes = carreraFrame.idxJugador
        // Progreso del jugador sobre la ruta del circuito (ventana incremental:
        // retrocede poco, avanza más — el jugador se mueve continuo).
        const rutaC = carreraFrame.rutaRival
        if (rutaC.length >= 2) {
          const n = rutaC.length
          let mejor = carreraFrame.idxJugador
          let dMin = Infinity
          for (let k = -6; k <= 30; k++) {
            // Módulo SIEMPRE positivo (rutas cortas darían índices negativos → crash).
            const i = (((carreraFrame.idxJugador + k) % n) + n) % n
            const d = Math.hypot(playerPos.x - rutaC[i].x, playerPos.z - rutaC[i].z)
            if (d < dMin) {
              dMin = d
              mejor = i
            }
          }
          carreraFrame.idxJugador = mejor
          // Posición en vivo: vueltas completadas + fracción de vuelta de cada uno.
          if (carreraFrame.rivalActivo) {
            const progJugador = s.vueltaActual - 1 + mejor / n
            const progRival = s.rivalVueltas + carreraFrame.rivalIdx / n
            carreraFrame.posicion = progJugador >= progRival ? 1 : 2
          }
        }
        if (carreraFrame.modo === 'libre') {
          // Cobertura por sectores del trazo; vuelta = wrap del índice hacia adelante.
          const M = carreraFrame.rutaRival.length
          if (M >= 2) {
            carreraFrame.sectoresLibre.add(Math.floor((carreraFrame.idxJugador / M) * 32))
            if (
              idxAntes > 0.8 * M &&
              carreraFrame.idxJugador < 0.2 * M &&
              carreraFrame.sectoresLibre.size >= Math.ceil(32 * 0.6)
            ) {
              const ms = Math.round((carreraFrame.reloj - carreraFrame.ultimoCruce) * 1000)
              carreraFrame.ultimoCruce = carreraFrame.reloj
              carreraFrame.sectoresLibre = new Set()
              carreraFrame.idxJugador = 0
              void s.completarVuelta(ms)
            }
          }
        } else {
          if (esPista(celda.col, celda.row)) carreraFrame.visitadas.add(kCelda)
          if (enMeta && carreraFrame.celdaPrev !== kCelda) {
            // Entró a la celda de meta: ¿vuelta válida?
            const vx = playerPos.x - prev.current.x
            const vz = playerPos.z - prev.current.z
            const d = vx * carreraFrame.ejeX + vz * carreraFrame.ejeZ
            let valida = carreraFrame.visitadas.size >= Math.ceil(carreraFrame.circuito * 0.6)
            if (valida && Math.abs(d) > 1e-4) {
              if (carreraFrame.sentido === 0) carreraFrame.sentido = Math.sign(d)
              else if (d * carreraFrame.sentido < 0) valida = false
            }
            if (valida) {
              const ms = Math.round((carreraFrame.reloj - carreraFrame.ultimoCruce) * 1000)
              carreraFrame.ultimoCruce = carreraFrame.reloj
              carreraFrame.visitadas = new Set()
              carreraFrame.idxJugador = 0
              void s.completarVuelta(ms)
            }
          }
        }
      }
    } else if (s.fase === 'terminada') {
      // Los resultados se cierran con sus botones o al alejarse de la meta.
      const [mx, , mz] = cellToWorld(carreraFrame.metaCol, carreraFrame.metaRow)
      if (editMode || activeRoom || Math.hypot(playerPos.x - mx, playerPos.z - mz) > SIZE * 1.6)
        s.cancelar()
    }
    carreraFrame.celdaPrev = kCelda
    prev.current.x = playerPos.x
    prev.current.z = playerPos.z
  })
  return null
}

/** = SPEED de Character (0.022 u/frame) × 60 fps: velocidad nominal en u/s. */
const VEL_BASE_SEG = 1.32
/**
 * El jugador se mueve por FRAME (no por tiempo real): en pantallas >60 Hz
 * avanza más rápido de lo que asume VEL_BASE_SEG, mientras el rival sí está
 * atado al reloj real y se sentía rezagado. Compensa ese desfase.
 */
const AJUSTE_RITMO_RIVAL = 1.5

/**
 * Avanza al rival por su ruta A LA VELOCIDAD DEL JUGADOR: su base es la
 * velocidad efectiva nominal sobre asfalto (×1.15 y el freno de carrera,
 * más AJUSTE_RITMO_RIVAL) y la dificultad solo la matiza ±15% — ganas con
 * drift, turbo, trazada e ítems. Al envolver la ruta cruza la meta: suma su
 * vuelta y puede ganarte.
 */
function avanzarRival(delta: number) {
  const s = useCarrera.getState()
  if (!carreraFrame.rivalActivo || s.fase !== 'corriendo' || !s.vehiculo) return
  const ruta = carreraFrame.rutaRival
  if (ruta.length < 2) return
  const def = vehiculoDe(s.vehiculo)
  let paso =
    VEL_BASE_SEG *
    def.velocidad *
    1.15 *
    VEL_CARRERA *
    AJUSTE_RITMO_RIVAL *
    (0.85 + s.dificultad * 0.3) *
    Math.min(delta, 0.1)
  // Trompo por banana/bomba: el rival también pierde casi toda la velocidad.
  if (rivalEnTrompo(performance.now())) paso *= 0.3
  let seguridad = 0
  while (paso > 0 && seguridad++ < 8) {
    const destino = ruta[carreraFrame.rivalIdx]
    const dx = destino.x - carreraFrame.rivalX
    const dy = destino.y - carreraFrame.rivalY
    const dz = destino.z - carreraFrame.rivalZ
    const dist = Math.hypot(dx, dy, dz)
    if (dist <= paso) {
      carreraFrame.rivalX = destino.x
      carreraFrame.rivalY = destino.y
      carreraFrame.rivalZ = destino.z
      paso -= dist
      carreraFrame.rivalIdx++
      if (carreraFrame.rivalIdx >= ruta.length) {
        carreraFrame.rivalIdx = 0
        const v = useCarrera.getState().rivalVueltas + 1
        if (v >= s.vueltasTotales) {
          void s.derrota()
          return
        }
        useCarrera.setState({ rivalVueltas: v })
      }
    } else {
      carreraFrame.rivalX += (dx / dist) * paso
      carreraFrame.rivalY += (dy / dist) * paso
      carreraFrame.rivalZ += (dz / dist) * paso
      const objetivo = Math.atan2(dx, dz)
      let giro = objetivo - carreraFrame.rivalH
      while (giro > Math.PI) giro -= Math.PI * 2
      while (giro < -Math.PI) giro += Math.PI * 2
      carreraFrame.rivalH += giro * Math.min(1, delta * 8)
      paso = 0
    }
  }
}

/**
 * El rival en 3D: la forma pura del vehículo del jugador (sin monturaFrame)
 * con el asistente elegido sentado en el asiento. Su pose la lleva
 * `carreraFrame` (rivalX/Z/H) y la avanza el runtime.
 */
export function RivalCarrera() {
  const fase = useCarrera((s) => s.fase)
  const rivalId = useCarrera((s) => s.rivalId)
  const rivalColor = useCarrera((s) => s.rivalColor)
  const vehiculo = useCarrera((s) => s.vehiculo)
  // Reacciona a ediciones/borrado de asistentes (getAsistente da fallback seguro).
  useAsistentes((s) => s.lista)
  const g = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  useFrame(() => {
    const gr = g.current
    if (!gr) return
    // Se apoya sobre la superficie del asfalto (igual que el jugador).
    gr.position.set(carreraFrame.rivalX, carreraFrame.rivalY + SUPERFICIE_PISTA, carreraFrame.rivalZ)
    gr.rotation.set(0, carreraFrame.rivalH + offsetTrompoRival(performance.now()), 0)
    gr.scale.setScalar(carreraFrame.escala)
  })
  if (!fase || fase === 'previa' || !rivalId || !vehiculo || !carreraFrame.rivalActivo) return null
  const a = getAsistente(rivalId)
  const def = vehiculoDe(vehiculo)
  const Forma = FORMA_VEHICULO[vehiculo]
  return (
    <group ref={g}>
      <Forma color={rivalColor ?? a.color ?? '#f59e0b'} />
      <group position={def.asiento} scale={a.escala ?? 1}>
        <ModeloMascota
          forma={a.forma}
          color={a.color}
          modelo3d={a.modelo3d}
          modeloGlb={a.modeloGlb}
          brazoRef={brazo}
          anim={a.animacion}
        />
        <Prendas ropa={a.ropa} anclas={ANCLAS_FORMA[a.forma]} />
      </group>
    </group>
  )
}
