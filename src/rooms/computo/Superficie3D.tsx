import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ALTOS_PLANO } from './constantes'
import type { Motor } from './motor'
import { useAltoPlano } from './usePlano'

/**
 * La fórmula como SUPERFICIE: dos variables en el suelo y el resultado en la
 * altura. Se gira con el dedo o el ratón.
 *
 * El mundo se dibuja NORMALIZADO a un cubo de lado 2 (así una fórmula que
 * devuelve millones y otra que devuelve décimas se ven igual de bien) y los
 * valores de verdad se leen en las esquinas de la ficha. La altura se colorea
 * de frío a cálido para que el relieve se lea sin sombras que engañen.
 *
 * Se carga con `lazy()` desde la ficha: three ya está en el bundle por la casa,
 * pero el cuarto no tiene por qué arrastrarlo si nadie abre el 3D.
 */

/** Divisiones por lado: 48×48 son 2401 puntos, que mathjs evalúa de sobra. */
const N = 48
const BAJO = new THREE.Color('#0ea5e9')
const ALTO = new THREE.Color('#f472b6')

interface Malla {
  geometria: THREE.BufferGeometry
  min: number
  max: number
  /** Cuántos puntos no se pudieron calcular (fuera del dominio). */
  huecos: number
}

function construir(
  motor: Motor,
  expresion: string,
  ejeX: string,
  ejeY: string,
  rangoX: [number, number],
  rangoY: [number, number],
  scope: Record<string, number>,
): Malla | null {
  let f: (s: Record<string, unknown>) => number
  try {
    f = motor.compilar(expresion)
  } catch {
    return null
  }

  const alturas = new Float64Array((N + 1) * (N + 1))
  const local: Record<string, unknown> = { ...scope }
  let min = Infinity
  let max = -Infinity
  let huecos = 0
  for (let j = 0; j <= N; j++) {
    local[ejeY] = rangoY[0] + ((rangoY[1] - rangoY[0]) * j) / N
    for (let i = 0; i <= N; i++) {
      local[ejeX] = rangoX[0] + ((rangoX[1] - rangoX[0]) * i) / N
      let z: number
      try {
        z = f(local)
      } catch {
        z = NaN
      }
      if (!Number.isFinite(z)) huecos++
      else {
        if (z < min) min = z
        if (z > max) max = z
      }
      alturas[j * (N + 1) + i] = z
    }
  }
  if (min > max) return null

  const alto = max - min || 1
  const pos = new Float32Array((N + 1) * (N + 1) * 3)
  const col = new Float32Array((N + 1) * (N + 1) * 3)
  const c = new THREE.Color()
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const k = j * (N + 1) + i
      const z = alturas[k]
      // Los huecos se aplanan al fondo: dejar NaN rompería la geometría entera.
      const t = Number.isFinite(z) ? (z - min) / alto : 0
      pos[k * 3] = (i / N) * 2 - 1
      pos[k * 3 + 1] = t * 1.4 - 0.7
      pos[k * 3 + 2] = (j / N) * 2 - 1
      c.copy(BAJO).lerp(ALTO, t)
      col[k * 3] = c.r
      col[k * 3 + 1] = c.g
      col[k * 3 + 2] = c.b
    }
  }

  const indices: number[] = []
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i
      const b = a + 1
      const d = a + (N + 1)
      const e = d + 1
      indices.push(a, d, b, b, d, e)
    }
  }

  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometria.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return { geometria, min, max, huecos }
}

export default function Superficie3D({
  motor,
  expresion,
  resultado,
  ejeX,
  ejeY,
  rangoX,
  rangoY,
  scope,
  alto,
}: {
  motor: Motor | null
  expresion: string
  resultado: string
  ejeX: string
  ejeY: string
  rangoX: [number, number]
  rangoY: [number, number]
  /** Las demás variables, en el valor que tengan puesto ahora. */
  scope: Record<string, number>
  /** Alto FIJO. Sin él manda la preferencia y sale el botón que la cambia. */
  alto?: string
}) {
  const t = useT()
  const preferido = useAltoPlano()
  const nombreAlto = t(ALTOS_PLANO[preferido.nivel].clave, ALTOS_PLANO[preferido.nivel].labelEs)
  const malla = useMemo(
    () => (motor ? construir(motor, expresion, ejeX, ejeY, rangoX, rangoY, scope) : null),
    [motor, expresion, ejeX, ejeY, rangoX, rangoY, scope],
  )

  // La geometría vieja no se recoge sola: son buffers de GPU, y ahora que el
  // teclado vive en la misma pantalla se rehace con cada expresión que se prueba.
  useEffect(() => () => malla?.geometria.dispose(), [malla])

  if (!malla) {
    return (
      <div
        style={{ height: alto ?? preferido.alto }}
        className="grid place-items-center rounded-xl border border-white/10 bg-black/25 px-4 text-center text-xs text-white/45"
      >
        {t('computo.sup.imposible', 'Con estos valores la fórmula no da una superficie que se pueda dibujar.')}
      </div>
    )
  }

  const numero = (v: number) => (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01) ? v.toExponential(2) : v.toFixed(2))

  return (
    <div
      style={{ height: alto ?? preferido.alto }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-black/25"
    >
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [2.6, 2.1, 2.6], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 6, 4]} intensity={1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.3} />
        <mesh geometry={malla.geometria}>
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Suelo de referencia: da la escala y el sentido del giro. */}
        <gridHelper args={[2, 8, '#64748b', '#334155']} position={[0, -0.72, 0]} />
        {/* Sin amortiguado: con `frameloop="demand"` el frenado suave se queda
            a medias porque nadie pide los frames que le faltan. */}
        <OrbitControls enablePan={false} enableDamping={false} minDistance={2} maxDistance={8} />
      </Canvas>

      {/* El alto se cicla también aquí: quien trabaje solo en 3D no tiene otro
          sitio donde cambiarlo. Ocupa la esquina donde antes iba el aviso. */}
      {alto == null && (
        <button
          type="button"
          onClick={preferido.ciclar}
          title={t('computo.graf.alto', 'Alto de la gráfica: {nivel}', { nivel: nombreAlto })}
          aria-label={t('computo.graf.alto', 'Alto de la gráfica: {nivel}', { nivel: nombreAlto })}
          className="absolute right-1.5 top-1.5 rounded-lg bg-black/50 px-1.5 py-1 text-xs text-white/60 transition hover:text-white"
        >
          <Icono nombre="medida" />
        </button>
      )}

      <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-lg bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/70">
        {resultado} ({ejeX}, {ejeY}) · {numero(malla.min)} … {numero(malla.max)}
      </div>
      {malla.huecos > 0 && (
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] text-amber-200/80">
          {t('computo.sup.huecos', 'hay zonas sin definir')}
        </div>
      )}
    </div>
  )
}
