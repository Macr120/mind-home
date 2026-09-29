import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useCiclo } from '../state/cicloStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { direccionSol, type ConfigSol } from './cielo'
import { cellToWorld, footprintCells, SIZE } from './walls'

const RAD = Math.PI / 180
const dd = (n: number) => String(n).padStart(2, '0')
const hora = (m: number) => `${dd(Math.floor(m / 60) % 24)}:${dd(Math.floor(m % 60))}`
/** Altura del «suelo» de las líneas: apenas sobre el piso para que no parpadeen con él. */
const Y_SUELO = 0.06

/** Temporadas que se comparan punteadas (mismo lado de paso, otra altura y otras horas). */
const EXTREMOS: Pick<ConfigSol, 'alturaMax' | 'salida' | 'puesta'>[] = [
  { alturaMax: 80, salida: 6 * 60, puesta: 20 * 60 },
  { alturaMax: 35, salida: 7 * 60 + 30, puesta: 17 * 60 + 30 },
]

/** Centro y radio de la casa (planta baja) en el mundo: el arco del sol la envuelve. */
function useCasa(): { centro: THREE.Vector3; radio: number } {
  const { placed, cells, footprints, niveles } = useLayout(
    useShallow((s) => ({ placed: s.placed, cells: s.cells, footprints: s.footprints, niveles: s.niveles })),
  )
  const cuartos = useCuartos((s) => s.cuartos)
  return useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const c of cuartos) {
      if (!placed[c.id] || !cells[c.id] || (niveles[c.id] ?? 0) !== 0) continue
      for (const cel of footprintCells(cells[c.id], footprints[c.id] ?? [{ col: 0, row: 0 }])) {
        const [x, , z] = cellToWorld(cel.col, cel.row)
        minX = Math.min(minX, x - SIZE / 2)
        maxX = Math.max(maxX, x + SIZE / 2)
        minZ = Math.min(minZ, z - SIZE / 2)
        maxZ = Math.max(maxZ, z + SIZE / 2)
      }
    }
    if (!Number.isFinite(minX)) return { centro: new THREE.Vector3(), radio: SIZE * 3 }
    const radio = Math.max(SIZE * 2.5, (Math.hypot(maxX - minX, maxZ - minZ) / 2) * 1.2)
    return { centro: new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2), radio }
  }, [cuartos, placed, cells, footprints, niveles])
}

/** Etiqueta HTML flotante (sin `distanceFactor`: la cámara iso es ortográfica). */
function Etiqueta({ pos, children, clase }: { pos: THREE.Vector3; children: React.ReactNode; clase: string }) {
  return (
    <Html position={pos} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow ${clase}`}>{children}</div>
    </Html>
  )
}

/**
 * El mapa de sombras dibujado EN la escena (como shadowmap.org): el horizonte
 * alrededor de la casa, el recorrido del sol del día con sus horas, los de verano e
 * invierno punteados, la salida y la puesta sobre el suelo, y el sol a la hora
 * elegida con su altura. El sol se arrastra por el arco para cambiar la hora y el
 * tirador del mediodía, para cambiar por dónde pasa y qué tan alto va. Solo existe
 * con el panel del mapa de sombras abierto.
 */
export function ArcoSol3D() {
  const abierto = useCiclo((s) => s.mapaSombras)
  if (!abierto) return null
  return <Arco />
}

function Arco() {
  const sol = useCiclo((s) => s.sol)
  const minutos = useCiclo((s) => s.minutos)
  const { centro, radio } = useCasa()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const arrastre = useRef<'sol' | 'mediodia' | 'giro' | null>(null)
  /** Al agarrar el horizonte: ángulo del dedo y rumbo de partida (se gira relativo, sin saltos). */
  const giro = useRef({ ang0: 0, rumbo0: 0 })
  const [sobreAro, setSobreAro] = useState(false)

  const punto = (c: ConfigSol, m: number) => {
    const d = direccionSol(c, m)
    return new THREE.Vector3(centro.x + d.x * radio, Math.max(0, d.y) * radio + Y_SUELO, centro.z + d.z * radio)
  }

  const recorrido = (c: ConfigSol) => {
    const pts: THREE.Vector3[] = []
    for (let m = c.salida; m <= c.puesta; m += 10) pts.push(punto(c, m))
    pts.push(punto(c, c.puesta))
    return pts
  }

  const horizonte = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      pts.push(new THREE.Vector3(centro.x + Math.cos(a) * radio, Y_SUELO, centro.z + Math.sin(a) * radio))
    }
    return pts
  }, [centro, radio])

  const dia = recorrido(sol)
  const extremos = EXTREMOS.map((e) => recorrido({ ...sol, ...e }))
  const horas: { m: number; p: THREE.Vector3 }[] = []
  for (let h = Math.ceil(sol.salida / 60); h * 60 <= sol.puesta; h++) horas.push({ m: h * 60, p: punto(sol, h * 60) })
  const salida = punto(sol, sol.salida)
  const puesta = punto(sol, sol.puesta)
  const mediodia = punto(sol, (sol.salida + sol.puesta) / 2)
  const ahora = direccionSol(sol, minutos)
  const arriba = ahora.altitud > 0
  const pSol = punto(sol, minutos)
  const pSuelo = new THREE.Vector3(pSol.x, Y_SUELO, pSol.z)
  const centroSuelo = new THREE.Vector3(centro.x, Y_SUELO, centro.z)

  /** Rumbo (grados, 0 = −Z como en `direccionSol`) del punto del suelo bajo el dedo. */
  const anguloEnSuelo = (x: number, y: number): number | null => {
    const r = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
    const rayo = new THREE.Raycaster()
    rayo.setFromCamera(ndc, camera)
    const p = rayo.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y_SUELO), new THREE.Vector3())
    if (!p) return null
    return Math.atan2(p.x - centro.x, -(p.z - centro.z)) / RAD
  }

  // Arrastres: se proyectan candidatos a la pantalla y gana el más cercano al dedo.
  // Así no hace falta intersecar rayos con un arco curvo en una cámara ortográfica.
  useEffect(() => {
    const aPantalla = (v: THREE.Vector3, r: DOMRect) => {
      const n = v.clone().project(camera)
      return [r.left + ((n.x + 1) / 2) * r.width, r.top + ((1 - n.y) / 2) * r.height] as const
    }
    const mover = (e: PointerEvent) => {
      const tipo = arrastre.current
      if (!tipo) return
      const r = gl.domElement.getBoundingClientRect()
      const c = useCiclo.getState().sol
      let mejor = Infinity
      if (tipo === 'giro') {
        const ang = anguloEnSuelo(e.clientX, e.clientY)
        if (ang == null) return
        const rumbo = (((giro.current.rumbo0 + ang - giro.current.ang0) % 360) + 360) % 360
        useCiclo.getState().setSol({ rumbo: Math.round(rumbo), activo: true })
      } else if (tipo === 'sol') {
        let m0 = c.salida
        for (let m = c.salida; m <= c.puesta; m += 5) {
          const [x, y] = aPantalla(punto(c, m), r)
          const d = (x - e.clientX) ** 2 + (y - e.clientY) ** 2
          if (d < mejor) {
            mejor = d
            m0 = m
          }
        }
        useCiclo.getState().setMinutos(m0)
      } else {
        let elegido = { rumbo: c.rumbo, alturaMax: c.alturaMax }
        for (let rumbo = 0; rumbo < 360; rumbo += 3) {
          for (let alt = 5; alt <= 90; alt += 2.5) {
            const h = alt * RAD
            const v = new THREE.Vector3(
              centro.x + Math.cos(h) * Math.sin(rumbo * RAD) * radio,
              Math.sin(h) * radio + Y_SUELO,
              centro.z - Math.cos(h) * Math.cos(rumbo * RAD) * radio,
            )
            const [x, y] = aPantalla(v, r)
            const d = (x - e.clientX) ** 2 + (y - e.clientY) ** 2
            if (d < mejor) {
              mejor = d
              elegido = { rumbo, alturaMax: alt }
            }
          }
        }
        useCiclo.getState().setSol({ ...elegido, activo: true })
      }
    }
    const soltar = () => {
      arrastre.current = null
      document.body.style.cursor = ''
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
    // `punto` depende de centro/radio, que ya están en la lista.
  }, [camera, gl, centro, radio]) // eslint-disable-line react-hooks/exhaustive-deps

  const agarrarAro = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const ang = anguloEnSuelo(e.nativeEvent.clientX, e.nativeEvent.clientY)
    if (ang == null) return
    giro.current = { ang0: ang, rumbo0: useCiclo.getState().sol.rumbo }
    arrastre.current = 'giro'
    document.body.style.cursor = 'grabbing'
  }
  // Soltar tras girar no es un toque para caminar.
  const pararClic = (e: ThreeEvent<MouseEvent>) => e.stopPropagation()
  useEffect(() => {
    if (arrastre.current !== 'giro') document.body.style.cursor = sobreAro ? 'grab' : ''
  }, [sobreAro])
  useEffect(() => () => void (document.body.style.cursor = ''), [])
  const pRumbo = new THREE.Vector3(centro.x + Math.sin(sol.rumbo * RAD) * radio, Y_SUELO + 0.4, centro.z - Math.cos(sol.rumbo * RAD) * radio)

  const agarrar = (tipo: 'sol' | 'mediodia') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    arrastre.current = tipo
  }

  return (
    <group>
      {/* Horizonte y ejes de salida/puesta sobre el suelo */}
      <Line points={horizonte} color={sobreAro ? '#7dd3fc' : '#ffffff'} lineWidth={sobreAro ? 3 : 1.5} dashed dashSize={0.5} gapSize={0.35} transparent opacity={0.7} />
      {/* Aro para agarrar el horizonte y girar por dónde pasa el sol (más ancho que la línea). */}
      <mesh
        position={[centro.x, Y_SUELO + 0.01, centro.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={agarrarAro}
        onClick={pararClic}
        onPointerOver={(e) => {
          e.stopPropagation()
          setSobreAro(true)
        }}
        onPointerOut={() => setSobreAro(false)}
      >
        <ringGeometry args={[radio - Math.max(0.6, radio * 0.07), radio + Math.max(0.6, radio * 0.07), 96]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={sobreAro ? 0.22 : 0.06} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Etiqueta pos={pRumbo} clase="bg-sky-400 text-white">
        ↻ {Math.round(sol.rumbo)}°
      </Etiqueta>
      <Line points={[centroSuelo, new THREE.Vector3(salida.x, Y_SUELO, salida.z)]} color="#fb923c" lineWidth={2.5} />
      <Line points={[centroSuelo, new THREE.Vector3(puesta.x, Y_SUELO, puesta.z)]} color="#c084fc" lineWidth={2.5} />

      {/* Verano e invierno punteados; el de hoy, grueso */}
      {extremos.map((pts, i) => (
        <Line key={i} points={pts} color="#fde047" lineWidth={1.5} dashed dashSize={0.4} gapSize={0.3} transparent opacity={0.6} />
      ))}
      <Line points={dia} color="#facc15" lineWidth={4} />
      {horas.map(({ m, p }) => (
        <mesh key={m} position={p}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshBasicMaterial color="#fef08a" toneMapped={false} />
        </mesh>
      ))}
      {horas
        .filter(({ m }) => m % 120 === 0)
        .map(({ m, p }) => (
          <Etiqueta key={m} pos={p.clone().add(new THREE.Vector3(0, 0.5, 0))} clase="bg-black/55 text-white">
            {dd(m / 60)}
          </Etiqueta>
        ))}
      <Etiqueta pos={new THREE.Vector3(salida.x, Y_SUELO + 0.4, salida.z)} clase="bg-orange-400 text-white">
        {hora(sol.salida)}
      </Etiqueta>
      <Etiqueta pos={new THREE.Vector3(puesta.x, Y_SUELO + 0.4, puesta.z)} clase="bg-purple-400 text-white">
        {hora(sol.puesta)}
      </Etiqueta>

      {/* El sol a la hora elegida: rayo a la casa, su pie en el suelo y la altura */}
      {arriba && (
        <>
          <Line points={[centroSuelo, pSol]} color="#fef08a" lineWidth={1.5} />
          <Line points={[pSol, pSuelo]} color="#fef08a" lineWidth={1} dashed dashSize={0.25} gapSize={0.2} />
          <mesh position={pSol}>
            <sphereGeometry args={[0.45, 20, 20]} />
            <meshBasicMaterial color="#fde047" toneMapped={false} />
          </mesh>
          <Etiqueta pos={pSuelo.clone().lerp(centroSuelo, 0.45).setY(Y_SUELO + 0.3)} clase="bg-white/85 text-slate-800">
            △ {Math.round(ahora.altitud / RAD)}°
          </Etiqueta>
        </>
      )}

      {/* Tiradores (HTML: se agarran con el dedo aunque la esfera sea chica) */}
      {arriba && (
        <Html position={pSol} center zIndexRange={[30, 0]}>
          <div
            onPointerDown={agarrar('sol')}
            className="grid h-10 w-10 cursor-grab touch-none place-items-center rounded-full border-2 border-white bg-yellow-300/90 text-[10px] font-black tabular-nums text-slate-800 shadow-[0_0_18px_6px_rgba(253,224,71,.6)]"
          >
            {hora(minutos)}
          </div>
        </Html>
      )}
      <Html position={mediodia} center zIndexRange={[30, 0]}>
        <div
          onPointerDown={agarrar('mediodia')}
          className="h-6 w-6 cursor-grab touch-none rounded-full border-[3px] border-yellow-400 bg-yellow-400/25"
          style={{ marginTop: arriba && Math.abs(minutos - (sol.salida + sol.puesta) / 2) < 20 ? 44 : 0 }}
        />
      </Html>
    </group>
  )
}
