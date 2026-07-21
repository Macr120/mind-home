import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { playerPos } from '../state/houseStore'
import { monturaFrame } from '../state/monturaStore'
import { sonar } from '../audio/sfx'
import {
  useCarrera,
  carreraFrame,
  registrarEjecutorItem,
  aplicarTrompoJugador,
  aplicarTrompoRival,
  SUPERFICIE_PISTA,
  type TipoItem,
} from '../state/carreraStore'
import { lanzarCohete } from './fuegos'

/**
 * Ítems estilo kart del modo carrera: cajas flotantes repartidas por el
 * circuito que dan un ítem al pasar (banana/turbo/bomba), bananas que hacen
 * trompo a quien las pisa y bombas que explotan. Pools mutables a nivel de
 * módulo + meshes fijos (patrón fuegos.tsx): cero re-renders por frame. Todo
 * runtime — nada se persiste — y los relojes usan performance.now().
 */

const MAX_CAJAS = 12
/** Boost visual extra de la banana (además de la escala de carrera): a esc=0.3 quedaba minúscula. */
const ESCALA_BANANA = 1.8
/** Una caja reaparece este tiempo después de recogerla. */
const RESPAWN_CAJA = 4000
/** La banana no golpea a quien la soltó durante este periodo de gracia. */
const GRACIA_BANANA = 800
/** La bomba no golpea al jugador recién lanzada (anti-autogol). */
const GRACIA_BOMBA = 400
/** Radios de impacto GENEROSOS (no se encogen con la escala 0.3): si no, casi nunca conectan. */
const RADIO_BANANA = 1.1
const RADIO_BOMBA_CONTACTO = 1.0
const RADIO_BOMBA_EXPLOSION = 2.6
/** Velocidad de la bomba (u/s): mayor que la del rival para alcanzarlo. */
const VEL_BOMBA = 5

interface Caja {
  x: number
  y: number
  z: number
  cooldownHasta: number
}

const cajas: Caja[] = []
const bananas = Array.from({ length: 6 }, () => ({ activo: false, x: 0, y: 0, z: 0, t0: 0 }))
const bombas = Array.from({ length: 3 }, () => ({
  activo: false,
  x: 0,
  y: 0,
  z: 0,
  dx: 0,
  dz: 1,
  t0: 0,
}))

/** Cajas por longitud de arco de la ruta: una cada ~14 u, saltando la meta. */
function prepararCajas(ruta: { x: number; y: number; z: number }[]) {
  cajas.length = 0
  if (ruta.length < 2) return
  const colocar = (primerObjetivo: number, paso: number) => {
    cajas.length = 0
    let acum = 0
    let objetivo = primerObjetivo
    for (let i = 1; i < ruta.length && cajas.length < MAX_CAJAS; i++) {
      acum += Math.hypot(ruta[i].x - ruta[i - 1].x, ruta[i].z - ruta[i - 1].z)
      if (acum >= objetivo) {
        cajas.push({
          x: ruta[i].x,
          y: ruta[i].y + SUPERFICIE_PISTA,
          z: ruta[i].z,
          cooldownHasta: 0,
        })
        objetivo += paso
      }
    }
    return acum // largo total recorrido
  }
  const largo = colocar(6, 14)
  // Circuitos cortos: al menos 3 cajas repartidas por tercios.
  if (cajas.length < 3 && largo > 8) colocar(largo / 3 / 2, largo / 3)
}

function limpiarItems() {
  cajas.length = 0
  for (const b of bananas) b.activo = false
  for (const b of bombas) b.activo = false
}

/** Materializa el ítem usado por el jugador (registrado en carreraStore). */
function usarItemEnMundo(item: TipoItem) {
  const esc = carreraFrame.escala
  const sh = Math.sin(monturaFrame.heading)
  const ch = Math.cos(monturaFrame.heading)
  if (item === 'turbo') {
    // Empujón inmediato (mismo campo que el mini-turbo del drift, ×1.45).
    monturaFrame.boost = 1.2
    sonar('turbo')
    return
  }
  if (item === 'banana') {
    const b = bananas.find((b) => !b.activo)
    if (!b) return
    b.activo = true
    b.x = playerPos.x - sh * 1.4 * esc
    b.z = playerPos.z - ch * 1.4 * esc
    b.y = playerPos.y
    b.t0 = performance.now()
    return
  }
  const bo = bombas.find((b) => !b.activo)
  if (!bo) return
  bo.activo = true
  bo.x = playerPos.x + sh * 1.2 * esc
  bo.z = playerPos.z + ch * 1.2 * esc
  bo.y = playerPos.y + 0.3 * esc
  bo.dx = sh
  bo.dz = ch
  bo.t0 = performance.now()
}
registrarEjecutorItem(usarItemEnMundo)

/** Runtime de los ítems (sin render): pickups, pisadas y explosiones. */
export function ItemsCarreraRuntime() {
  const fase = useCarrera((s) => s.fase)
  // Las cajas nacen con el semáforo y se recogen al terminar/cancelar. Si React
  // llegó tarde al semáforo (fases bacheadas), se preparan al ver 'corriendo'.
  useEffect(() => {
    if (fase === 'semaforo') prepararCajas(carreraFrame.rutaRival)
    else if (fase === 'corriendo') {
      if (cajas.length === 0) prepararCajas(carreraFrame.rutaRival)
    } else if (fase === null || fase === 'terminada') limpiarItems()
  }, [fase])

  useFrame((_, delta) => {
    const s = useCarrera.getState()
    if (s.fase !== 'corriendo') return
    const ahora = performance.now()
    const d = Math.min(delta, 0.1)

    // Cajas: recoger al pasar (slot vacío y sin cooldown).
    if (!s.item) {
      for (const c of cajas) {
        if (ahora < c.cooldownHasta) continue
        if (Math.hypot(playerPos.x - c.x, playerPos.z - c.z) > 1.0) continue
        c.cooldownHasta = ahora + RESPAWN_CAJA
        const surtido: TipoItem[] = ['banana', 'turbo', 'bomba']
        s.darItem(surtido[Math.floor(Math.random() * surtido.length)])
        break
      }
    }

    // Bananas: trompo a quien las pisa (el dueño tiene un periodo de gracia).
    for (const b of bananas) {
      if (!b.activo) continue
      if (
        ahora - b.t0 > GRACIA_BANANA &&
        Math.hypot(playerPos.x - b.x, playerPos.z - b.z) < RADIO_BANANA
      ) {
        b.activo = false
        sonar('banana')
        aplicarTrompoJugador(2, 800)
        continue
      }
      if (
        carreraFrame.rivalActivo &&
        Math.hypot(carreraFrame.rivalX - b.x, carreraFrame.rivalZ - b.z) < RADIO_BANANA
      ) {
        b.activo = false
        sonar('banana')
        aplicarTrompoRival(2, 800)
      }
    }

    // Bombas: PERSIGUEN al rival (tipo caparazón rojo) y explotan al contacto o a los 4 s.
    for (const bo of bombas) {
      if (!bo.activo) continue
      if (carreraFrame.rivalActivo) {
        const tx = carreraFrame.rivalX - bo.x
        const tz = carreraFrame.rivalZ - bo.z
        const td = Math.hypot(tx, tz) || 1
        bo.dx += (tx / td - bo.dx) * 0.1 // giro suave hacia el rival
        bo.dz += (tz / td - bo.dz) * 0.1
        const dn = Math.hypot(bo.dx, bo.dz) || 1
        bo.dx /= dn
        bo.dz /= dn
      }
      bo.x += bo.dx * VEL_BOMBA * d
      bo.z += bo.dz * VEL_BOMBA * d
      const dRival = carreraFrame.rivalActivo
        ? Math.hypot(carreraFrame.rivalX - bo.x, carreraFrame.rivalZ - bo.z)
        : Infinity
      const dJugador = Math.hypot(playerPos.x - bo.x, playerPos.z - bo.z)
      const explota =
        ahora - bo.t0 > 4000 ||
        dRival < RADIO_BOMBA_CONTACTO ||
        (dJugador < RADIO_BOMBA_CONTACTO && ahora - bo.t0 > GRACIA_BOMBA)
      if (!explota) continue
      bo.activo = false
      sonar('bomba')
      lanzarCohete(bo.x, bo.y, bo.z)
      if (dJugador < RADIO_BOMBA_EXPLOSION) aplicarTrompoJugador(3, 1200)
      if (dRival < RADIO_BOMBA_EXPLOSION) aplicarTrompoRival(3, 1200)
    }
  })
  return null
}

/** Render de cajas/bananas/bombas: meshes fijos que el frame mueve y oculta. */
export function ItemsCarrera3D() {
  const refCajas = useRef<(THREE.Mesh | null)[]>([])
  const refBananas = useRef<(THREE.Mesh | null)[]>([])
  const refBombas = useRef<(THREE.Mesh | null)[]>([])
  const ocultos = useRef(false)

  useFrame(() => {
    // Sin ítems en pista (lo normal fuera de carrera): una sola pasada que
    // oculta todo y luego cero trabajo por frame.
    const vacio =
      cajas.length === 0 && !bananas.some((b) => b.activo) && !bombas.some((b) => b.activo)
    if (vacio) {
      if (!ocultos.current) {
        ocultos.current = true
        for (const m of refCajas.current) if (m) m.visible = false
        for (const m of refBananas.current) if (m) m.visible = false
        for (const m of refBombas.current) if (m) m.visible = false
      }
      return
    }
    ocultos.current = false
    const ahora = performance.now()
    const esc = carreraFrame.escala
    for (let i = 0; i < MAX_CAJAS; i++) {
      const m = refCajas.current[i]
      if (!m) continue
      const c = cajas[i]
      const visible = !!c && ahora >= c.cooldownHasta
      m.visible = visible
      if (!visible || !c) continue
      // Flota, gira y respira un poco (estilo caja de premio).
      m.position.set(c.x, c.y + (0.55 + Math.sin(ahora / 400 + i) * 0.08) * esc * 2, c.z)
      m.rotation.set(ahora / 1100, ahora / 800, 0)
      m.scale.setScalar(esc)
    }
    bananas.forEach((b, i) => {
      const m = refBananas.current[i]
      if (!m) return
      m.visible = b.activo
      if (!b.activo) return
      m.position.set(b.x, b.y + 0.12 * esc, b.z)
      m.scale.setScalar(esc * ESCALA_BANANA)
    })
    bombas.forEach((b, i) => {
      const m = refBombas.current[i]
      if (!m) return
      m.visible = b.activo
      if (!b.activo) return
      m.position.set(b.x, b.y, b.z)
      m.scale.setScalar(esc)
      const mat = m.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.5 + 0.4 * Math.sin(ahora / 90)
    })
  })

  return (
    <group>
      {Array.from({ length: MAX_CAJAS }, (_, i) => (
        <mesh
          key={`caja-${i}`}
          ref={(el) => {
            refCajas.current[i] = el
          }}
          visible={false}
        >
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.35}
            transparent
            opacity={0.85}
            roughness={0.3}
          />
        </mesh>
      ))}
      {bananas.map((_, i) => (
        <mesh
          key={`banana-${i}`}
          ref={(el) => {
            refBananas.current[i] = el
          }}
          visible={false}
          rotation={[Math.PI, 0, 0]}
        >
          {/* Medio toro acostado = plátano. */}
          <torusGeometry args={[0.4, 0.16, 10, 16, Math.PI]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>
      ))}
      {bombas.map((_, i) => (
        <mesh
          key={`bomba-${i}`}
          ref={(el) => {
            refBombas.current[i] = el
          }}
          visible={false}
        >
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshStandardMaterial color="#18181b" emissive="#f97316" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}
