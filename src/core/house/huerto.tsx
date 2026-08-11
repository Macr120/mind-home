import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { cultivosRepo } from '../data/repository'
import { useHuerto, limpiarMarchitos, type HerramientaHuerto } from '../state/huertoStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { celdaEnteraBajoCursor } from './arrastreCelda'
import { cellToWorld, factorCelda, SIZE } from './walls'
import { ESPECIES, estadoCultivo, celdasRegadas, type EtapaCultivo } from './cultivos'
import { ContornoCelda } from './caminos'
import { notificar } from '../notificaciones'
import { tGlobal } from '../i18n/useT'
import type { CultivoCelda, EspecieCultivo } from '../data/db'

/** Tope de la loseta exterior (~0.19; los objetos de mapa van a 0.2) + margen. */
const Y = 0.2

/**
 * Planta paramétrica por etapa (primitivas estilo Roblox): la misma pieza crece
 * de semilla a fruto, amarillea si está sedienta y se dobla parda al marchitarse.
 */
function PlantaProcedural({
  especie,
  etapa,
  sediento,
}: {
  especie: EspecieCultivo
  etapa: EtapaCultivo
  sediento: boolean
}) {
  const def = ESPECIES[especie]
  const marchito = etapa === 'marchito'
  const verde = marchito ? '#8a6d3b' : sediento ? '#a8a83d' : '#3f9142'
  const tallo = marchito ? '#6b4f2a' : sediento ? '#7d7d33' : '#2f6d33'

  if (etapa === 'semilla') {
    return (
      <group>
        <mesh position={[0, 0.06, 0]} scale={[1, 0.5, 1]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshStandardMaterial color="#57381f" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={verde} roughness={0.8} />
        </mesh>
      </group>
    )
  }

  const alto = etapa === 'brote' ? 0.4 : 0.95
  return (
    <group scale={marchito ? [1, 0.55, 1] : 1} rotation={marchito ? [0, 0, 0.35] : [0, 0, 0]}>
      {/* Tallo. */}
      <mesh position={[0, alto / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.05, alto, 6]} />
        <meshStandardMaterial color={tallo} roughness={0.85} />
      </mesh>
      {/* Hojas (conos inclinados alrededor del tallo). */}
      {(etapa === 'brote' ? [0, Math.PI] : [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]).map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * 0.18, alto * 0.45, Math.sin(a) * 0.18]}
          rotation={[Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1]}
        >
          <coneGeometry args={[0.09, 0.42, 6]} />
          <meshStandardMaterial color={verde} roughness={0.8} />
        </mesh>
      ))}
      {/* Follaje superior. */}
      {etapa !== 'brote' && (
        <mesh position={[0, alto + 0.08, 0]}>
          <sphereGeometry args={[0.24, 10, 8]} />
          <meshStandardMaterial color={verde} roughness={0.8} />
        </mesh>
      )}
      {/* Frutos/flores al estar listo. */}
      {etapa === 'listo' &&
        [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
          <mesh
            key={a}
            position={[Math.cos(a) * 0.24, alto - 0.05 + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.24]}
          >
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial color={def.color} roughness={0.55} />
          </mesh>
        ))}
    </group>
  )
}

/** Aspersor de riego automático: poste con brazos giratorios y gotitas. */
function Aspersor3D() {
  const brazos = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (brazos.current) brazos.current.rotation.y += Math.min(dt, 0.1) * 2.5
  })
  return (
    <group position={[0, Y + 0.08, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 1.1, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.14, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.4} />
      </mesh>
      <group ref={brazos} position={[0, 1.22, 0]}>
        <mesh>
          <boxGeometry args={[1.0, 0.05, 0.08]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh rotation-y={Math.PI / 2}>
          <boxGeometry args={[1.0, 0.05, 0.08]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.4} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.55, -0.08, Math.sin(a) * 0.55]}>
            <sphereGeometry args={[0.05, 6, 5]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#0284c7" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Estaca de madera con tablita: sostiene el letrero DOM de la parcela.
 *  Clavada a la mitad del borde de arriba de la celda (lado local z = −2.35). */
function Estaca3D() {
  return (
    <group position={[0, Y, -2.35]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.1, 1.1, 0.1]} />
        <meshStandardMaterial color="#8a5a33" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.98, 0]} rotation-x={-0.08}>
        <boxGeometry args={[0.72, 0.45, 0.06]} />
        <meshStandardMaterial color="#a06b3d" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Parcela de tierra con surcos y sus plantas (una celda del huerto). */
function Parcela({
  fila,
  ahora,
  editor,
  regadaDesde,
}: {
  fila: CultivoCelda
  ahora: number
  editor: boolean
  regadaDesde?: number
}) {
  const estado = estadoCultivo(fila, ahora, regadaDesde)
  return (
    // La parcela está dibujada en metros para la celda base: se estira con la del mapa
    // para que la tierra llene siempre su celda.
    <group scale={factorCelda()}>
      {/* Tierra labrada. */}
      <mesh position={[0, Y + 0.04, 0]}>
        <boxGeometry args={[5.4, 0.08, 5.4]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
      </mesh>
      {[-1.5, 0, 1.5].map((z) => (
        <mesh key={z} position={[0, Y + 0.085, z]}>
          <boxGeometry args={[4.8, 0.03, 0.55]} />
          <meshStandardMaterial color="#4e3320" roughness={0.95} />
        </mesh>
      ))}
      {/* Plantas del cultivo en curso. */}
      {fila.especie && estado && (
        <>
          {[
            [-1.4, -1.5],
            [1.4, -1.5],
            [-1.4, 1.5],
            [1.4, 1.5],
          ].map(([px, pz]) => (
            <group key={`${px},${pz}`} position={[px, Y + 0.08, pz]}>
              <PlantaProcedural especie={fila.especie!} etapa={estado.etapa} sediento={estado.sediento} />
            </group>
          ))}
          {/* Aviso de sed (solo con el editor abierto): gota flotante. */}
          {editor && estado.sediento && estado.etapa !== 'listo' && estado.etapa !== 'marchito' && (
            <mesh position={[0, 2.1, 0]}>
              <sphereGeometry args={[0.18, 10, 8]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.6} />
            </mesh>
          )}
        </>
      )}
      {/* Estaca con el letrero de la siembra (el chip DOM se posa encima). */}
      {fila.especie && estado && <Estaca3D />}
      {/* Aspersor instalado en la celda. */}
      {fila.aspersorEn != null && <Aspersor3D />}
    </group>
  )
}

/** Huerto construido en el mapa (siempre montado; reacciona a db.cultivos). */
export function Huerto3D() {
  // `undefined` = aún cargando (Dexie); `[]` = huerto vacío de verdad.
  const filasRaw = cultivosRepo.useAll()
  const filas = useMemo(() => filasRaw ?? [], [filasRaw])
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const activo = useHuerto((s) => s.activo)
  const regadas = useMemo(() => celdasRegadas(filas), [filas])
  // Reloj de render: las etapas se derivan de timestamps al pintar (sin timers persistentes).
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), activo ? 10_000 : 30_000)
    return () => window.clearInterval(id)
  }, [activo])

  // Lo marchito se ve un rato y luego la parcela se limpia sola (queda virgen).
  useEffect(() => {
    if (filasRaw == null) return
    void limpiarMarchitos()
  }, [filasRaw, ahora])

  // Aviso al pasar una parcela a "listo": la clave lleva `plantadoEn` (una por
  // siembra). El primer barrido CON DATOS solo REGISTRA lo ya listo, para no
  // re-avisar al abrir la app; luego notifica solo transiciones vivas.
  const listasPrevias = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (filasRaw == null) return // aún cargando: no gastar el primer barrido en vacío
    const ahoraMs = Date.now()
    const listasAhora = new Set<string>()
    for (const f of filasRaw) {
      if (!f.especie || f.plantadoEn == null) continue
      if (estadoCultivo(f, ahoraMs, regadas.get(`${f.col},${f.row}`))?.etapa !== 'listo') continue
      listasAhora.add(`${f.col},${f.row}|${f.plantadoEn}`)
    }
    const previas = listasPrevias.current
    listasPrevias.current = listasAhora
    if (previas == null) return
    for (const f of filasRaw) {
      if (!f.especie || f.plantadoEn == null) continue
      const clave = `${f.col},${f.row}|${f.plantadoEn}`
      if (!listasAhora.has(clave) || previas.has(clave)) continue
      const def = ESPECIES[f.especie]
      void notificar({
        clave: `cosecha:${clave}`,
        titulo: `${def.icon} ${tGlobal(`huerto.especie.${f.especie}`, def.nombre)}`,
        cuerpo: tGlobal('huerto.aviso.listo', '¡Lista para cosechar!'),
      })
    }
  }, [filasRaw, regadas, ahora])
  return (
    <group>
      {filas
        .filter((f) => f.col < gridCols && f.row < gridRows)
        .map((f) => {
          const [wx, , wz] = cellToWorld(f.col, f.row)
          return (
            <group key={`${f.col},${f.row}`} position={[wx, 0, wz]}>
              <Parcela fila={f} ahora={ahora} editor={activo} regadaDesde={regadas.get(`${f.col},${f.row}`)} />
            </group>
          )
        })}
    </group>
  )
}

// La cosecha ya NO ocurre sola al caminar sobre una parcela lista: el botón
// «Cosechar» del hueco del cubo la ofrece al acercarte (ver `ContextoProximity`).
// El radio vive ahí; la cosecha en sí sigue en `huertoStore`.

/** Color del fantasma según la herramienta activa. */
const COLOR_HERRAMIENTA: Record<HerramientaHuerto, string> = {
  parcela: '#d97706',
  sembrar: '#4ade80',
  regar: '#38bdf8',
  cosechar: '#facc15',
  aspersor: '#0ea5e9',
  quitar: '#f87171',
}

/**
 * Con el editor activo: clic en una celda aplica la herramienta (un arrastre
 * mayor a 6 px es cámara). Esc sale.
 */
export function HuertoController() {
  const activo = useHuerto((s) => s.activo)
  return activo ? <HuertoControllerActivo /> : null
}

function HuertoControllerActivo() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const herramienta = useHuerto((s) => s.herramienta)
  const aplicarEnCelda = useHuerto((s) => s.aplicarEnCelda)
  const salir = useHuerto((s) => s.salir)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null)

  useEffect(() => {
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const opts = { canvas: dom, camera, nivel: 0, apilado, gridCols, gridRows }
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue arrastre de cámara
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, opts)
      if (c) void aplicarEnCelda(Math.round(c.col), Math.round(c.row))
    }
    const onMove = (ev: PointerEvent) => {
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, opts)
      setHover(c ? { col: Math.round(c.col), row: Math.round(c.row) } : null)
    }
    const onLeave = () => setHover(null)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') salir()
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKey)
      setHover(null)
    }
  }, [gl, camera, apilado, gridCols, gridRows, aplicarEnCelda, salir])

  if (!hover) return null
  const [hx, , hz] = cellToWorld(hover.col, hover.row)
  return (
    <ContornoCelda
      cx={hx}
      cz={hz}
      y={Y + 0.25}
      lado={SIZE - 0.15}
      color={COLOR_HERRAMIENTA[herramienta]}
    />
  )
}
