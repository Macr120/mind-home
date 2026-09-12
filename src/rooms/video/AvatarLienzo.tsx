import { Component, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import type { Asistente } from '../../core/chat/mascotas'
import { forzarSiempre, type AnimacionModelo } from '../../core/house/animacion'
import { anclasDe } from '../../core/house/apariencia'
import { AsistenteModelo } from '../../core/house/AsistenteModelo'
import { AvatarModelo } from '../../core/house/AvatarModelo'
import { nuevaBocaHabla, type BocaHabla } from '../../core/house/bocaHabla'
import { getAsistente, useAsistentes } from '../../core/state/asistentesStore'
import { useDiseño, type Avatar } from '../../core/state/disenoStore'
import { esJugador } from './actores'
import type { RenderizadorAvatar } from './render'

/**
 * El canvas WebGL oculto que pinta al avatar del video: UN `<Canvas>` con
 * `frameloop="never"` (patrón `Miniatura.tsx`) y TODOS los personajes del
 * proyecto (asistentes y tu avatar, `ES_JUGADOR`) montados a la vez en grupos invisibles. Cambiar de asistente es un
 * `visible` síncrono y dos avatares solapados son dos renders en el mismo tick;
 * remontar por clip dejaría frames en blanco en el export. Cada `pintar` fija
 * la boca y el gesto, encuadra la cámara y llama `advance(t)`: con
 * `frameloop="never"` R3F pone `clock.elapsedTime = t`, corre todos los
 * `useFrame` y hace `gl.render` SÍNCRONO — preview y export (relojes distintos)
 * producen el mismo fotograma.
 */

interface Entrada {
  grupo: THREE.Group | null
  gesto: THREE.Group | null
  boca: RefObject<BocaHabla>
  caja: { minY: number; maxY: number } | null
}

const FLOTE: AnimacionModelo = { activacion: 'siempre', preset: 'flotar', velocidad: 0.6, intensidad: 0.35 }

/** La animación guardada del personaje forzada a 'siempre'; `girar` (da la espalda) y `vida` (deambula) caen al flote. */
function animDe(a: Pick<Asistente, 'animacion'>): AnimacionModelo {
  const anim = forzarSiempre(a.animacion)
  if (!anim || anim.preset === 'girar' || anim.preset === 'vida') return FLOTE
  return anim
}

/** Aire por encima de la caja medida: la animación (flote, rebote) sube el modelo tras medirla. */
const AIRE_ANIMACION = 0.15

/**
 * Cámara de busto o cuerpo entero, SIN lerp (determinista). La caja medida del
 * modelo manda arriba (sombreros, orejas, capuchas: las anclas no los ven); el
 * pecho sale de las anclas de la cabeza y, en los .glb, del 45 % superior.
 */
function encuadrar(
  cam: THREE.PerspectiveCamera,
  a: Asistente | Avatar,
  plano: 'busto' | 'cuerpo',
  caja: { minY: number; maxY: number } | null,
) {
  const esc = a.escala ?? 1
  const an = anclasDe(a)
  const tanF = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
  const tope = (caja ? caja.maxY : an.cabezaTop * esc) + AIRE_ANIMACION
  if (plano === 'busto') {
    const pecho = a.modeloGlb && caja ? caja.maxY - (caja.maxY - caja.minY) * 0.45 : an.cabezaY * esc - an.cabezaR * esc * 2.4
    const alto = Math.max(0.9, (tope - pecho) * 1.08)
    const y = (tope + pecho) / 2
    cam.position.set(0, y, alto / 2 / tanF + an.caraZ * esc)
    cam.lookAt(0, y, 0)
  } else {
    const base = caja ? caja.minY : 0
    const alto = (tope - base) * 1.08
    const y = (tope + base) / 2
    cam.position.set(0, y, alto / 2 / tanF)
    cam.lookAt(0, y, 0)
  }
  cam.updateProjectionMatrix()
}

function Escena({ asistenteIds, onListo }: { asistenteIds: string[]; onListo: (r: RenderizadorAvatar | null) => void }) {
  const lista = useAsistentes((s) => s.lista)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)
  const entradas = useRef(new Map<string, Entrada>())
  const perdido = useRef(false)
  // Un objeto de boca estable por asistente (lo lee el useFrame del rostro; lo escribe `pintar`).
  const bocas = useMemo(() => new Map(asistenteIds.map((id) => [id, { current: nuevaBocaHabla() } as RefObject<BocaHabla>])), [asistenteIds])
  // Tu avatar (`ES_JUGADOR`) va aparte: `getAsistente('jugador')` caería en el primer asistente.
  const avatar = useDiseño((s) => s.avatar)
  const avatarRef = useRef(avatar)
  useEffect(() => {
    avatarRef.current = avatar
  })
  const cuerpos = useMemo(() => {
    void lista // el asistente se relee cuando cambia la lista (renombrar, cambiar de forma…)
    return asistenteIds.map((id) => ({ id, asistente: esJugador(id) ? null : getAsistente(id) }))
  }, [asistenteIds, lista])

  useEffect(() => {
    const alPerder = () => {
      perdido.current = true
    }
    gl.domElement.addEventListener('webglcontextlost', alPerder)
    const cam = camera as THREE.PerspectiveCamera
    const mapa = entradas.current
    const medirCajas = () => {
      for (const e of mapa.values()) {
        if (!e.grupo) continue
        const visible = e.grupo.visible
        e.grupo.visible = true
        e.grupo.updateWorldMatrix(true, true)
        const box = new THREE.Box3().setFromObject(e.grupo)
        e.caja = box.isEmpty() ? null : { minY: box.min.y, maxY: box.max.y }
        e.grupo.visible = visible
      }
    }
    const r: RenderizadorAvatar = {
      canvas: gl.domElement,
      pintar: (clip, t, estado) => {
        if (perdido.current) return false
        const e = mapa.get(clip.asistenteId)
        if (!e?.grupo || e.grupo.children.length === 0) return false
        for (const otra of mapa.values()) if (otra.grupo) otra.grupo.visible = otra === e
        e.boca.current.nivel = estado.boca.nivel
        e.boca.current.hablando = estado.boca.hablando
        // Gesto de habla: asentir con las sílabas y balanceo sutil, escalados por la energía.
        const tClip = t - clip.inicio
        const k = estado.energia
        if (e.gesto) {
          e.gesto.rotation.x = 0.05 * Math.sin(tClip * 2.3) * k + 0.05 * estado.boca.nivel
          e.gesto.rotation.z = 0.03 * Math.sin(tClip * 1.3) * k
          e.gesto.rotation.y = 0.05 * Math.sin(tClip * 0.7) * k
        }
        encuadrar(cam, esJugador(clip.asistenteId) ? avatarRef.current : getAsistente(clip.asistenteId), clip.plano, e.caja)
        advance(t, false)
        return true
      },
      esperar: (plazoMs = 4000) =>
        new Promise<void>((ok) => {
          const t0 = performance.now()
          const sondear = () => {
            const montados = asistenteIds.every((id) => (mapa.get(id)?.grupo?.children.length ?? 0) > 0)
            const cargando = useProgress.getState().active // drei: GLB y textura del rostro en vuelo
            const vencido = performance.now() - t0 > plazoMs
            // 150 ms de gracia: entre el commit y el `itemStart` hay un efecto y un re-render.
            if (vencido || (montados && !cargando && performance.now() - t0 > 150)) {
              medirCajas()
              ok()
            } else window.setTimeout(sondear, 50)
          }
          sondear()
        }),
    }
    if (import.meta.env.DEV) (window as unknown as { mhAvatarVideo?: () => RenderizadorAvatar }).mhAvatarVideo = () => r
    onListo(r)
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', alPerder)
      onListo(null)
    }
  }, [gl, camera, advance, onListo, asistenteIds])

  const entradaDe = (id: string): Entrada => {
    let e = entradas.current.get(id)
    if (!e) {
      e = { grupo: null, gesto: null, boca: bocas.get(id) ?? { current: nuevaBocaHabla() }, caja: null }
      entradas.current.set(id, e)
    }
    e.boca = bocas.get(id) ?? e.boca
    return e
  }

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />
      {cuerpos.map(({ id, asistente }) => (
        <group
          key={id}
          visible={false}
          ref={(g) => {
            entradaDe(id).grupo = g
          }}
        >
          <group
            ref={(g) => {
              entradaDe(id).gesto = g
            }}
          >
            {asistente ? (
              <AsistenteModelo asistente={asistente} anim={animDe(asistente)} boca={bocas.get(id)} />
            ) : (
              <AvatarModelo av={avatar} animOverride={animDe(avatar)} boca={bocas.get(id)} />
            )}
          </group>
        </group>
      ))}
    </>
  )
}

/** Si WebGL falla, no hay avatar y el editor y el export siguen. */
class LimiteAvatar extends Component<{ children: ReactNode }, { roto: boolean }> {
  state = { roto: false }
  static getDerivedStateFromError() {
    return { roto: true }
  }
  render() {
    return this.state.roto ? null : this.props.children
  }
}

export function AvatarLienzo({
  asistenteIds,
  lado,
  onListo,
}: {
  /** Ids distintos de los clips de avatar del proyecto (memoizados por firma en el Editor). */
  asistenteIds: string[]
  /** Lado en px del canvas cuadrado (el tamaño máximo con que se va a pintar). */
  lado: number
  onListo: (r: RenderizadorAvatar | null) => void
}) {
  return (
    <LimiteAvatar>
      <div
        aria-hidden
        style={{ position: 'fixed', left: -9999, top: -9999, width: lado, height: lado, pointerEvents: 'none', opacity: 0 }}
      >
        <Canvas
          frameloop="never"
          dpr={1}
          gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true, powerPreference: 'low-power' }}
          camera={{ fov: 35, near: 0.1, far: 50, position: [0, 1, 3] }}
        >
          <Escena asistenteIds={asistenteIds} onListo={onListo} />
        </Canvas>
      </div>
    </LimiteAvatar>
  )
}
