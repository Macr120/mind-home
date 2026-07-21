import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useLoader } from '@react-three/fiber'
import { useGrafitis, claveSuperficie, EPS_GRAFITI, type ModoGrafiti } from '../state/grafitiStore'
import { useHerramienta } from '../state/herramientaStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { playerPos } from '../state/playerPosition'
import { canvasGrafiti, trazar } from './grafitiLienzo'
import { buscarMuro } from './PlanoMuroSelector3D'
import { LataAerosol } from './arma'
import { iniciarSpray, detenerSpray } from '../audio/sfx'
import { WALL_H, WALL_T } from './walls'

// Distancia máxima del jugador a la pared para poder pintarla (clic directo).
const ALCANCE_CLIC = 4.5

const _ndc = new THREE.Vector2()
const _ray = new THREE.Raycaster()

/**
 * Grafiti guardado sobre una cara de muro: plano PNG transparente delante de la
 * cara (los padres —Room3D/MurosLibres3D— lo posicionan en su marco local).
 */
export function GrafitiDecal({
  url,
  ancho,
  alto,
  position,
  rotY,
}: {
  url: string
  ancho: number
  alto: number
  position: [number, number, number]
  rotY: number
}) {
  const tex = useLoader(THREE.TextureLoader, url)
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.needsUpdate = true
  }, [tex])
  return (
    <mesh position={position} rotation={[0, rotY, 0]}>
      <planeGeometry args={[ancho, alto]} />
      <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.9} />
    </mesh>
  )
}

/**
 * Grafitis guardados de las dos caras de un muro de cuarto. Se monta como hermano
 * del MuroSegment (marco local del grupo del cuarto) y se suscribe solo, así el
 * Room3D no re-renderiza al pintar. La cara en edición se oculta (la muestra el
 * lienzo vivo).
 */
export function GrafitisMuroCuarto({
  roomId,
  clave,
  cx,
  cz,
  sx,
  sz,
  alto,
}: {
  roomId: string
  clave: string
  cx: number
  cz: number
  sx: number
  sz: number
  /** Factor de WALL_H del muro (prop `alto` del segmento). */
  alto?: number
}) {
  const porMuro = useGrafitis((s) => s.porMuro)
  const modo = useGrafitis((s) => s.modo)
  const horizontal = sx >= sz
  const ancho = horizontal ? sx : sz
  const grosor = horizontal ? sz : sx
  const altoM = WALL_H * (alto ?? 1)
  const caras = horizontal ? (['S', 'N'] as const) : (['E', 'O'] as const)
  return (
    <>
      {caras.map((cara) => {
        const url = porMuro[claveSuperficie({ tipo: 'cuarto', roomId, clave, cara })]
        if (!url) return null
        const s = modo?.superficie
        if (s?.tipo === 'cuarto' && s.roomId === roomId && s.clave === clave && s.cara === cara) return null
        const nx = cara === 'E' ? 1 : cara === 'O' ? -1 : 0
        const nz = cara === 'S' ? 1 : cara === 'N' ? -1 : 0
        const rotY = cara === 'S' ? 0 : cara === 'N' ? Math.PI : cara === 'E' ? Math.PI / 2 : -Math.PI / 2
        return (
          <GrafitiDecal
            key={cara}
            url={url}
            ancho={ancho}
            alto={altoM}
            position={[cx + nx * (grosor / 2 + EPS_GRAFITI), altoM / 2, cz + nz * (grosor / 2 + EPS_GRAFITI)]}
            rotY={rotY}
          />
        )
      })}
    </>
  )
}

/**
 * Grafitis guardados de las dos caras (A = +Z local, B = −Z) de un segmento de
 * muro libre, en el marco local de su grupo (posición/rotación del segmento).
 */
export function GrafitisMuroLibre({
  muroLibreId,
  seg,
  largo,
  alto,
  yBase,
}: {
  muroLibreId: number
  seg: number
  largo: number
  /** Factor de WALL_H del muro. */
  alto?: number
  yBase: number
}) {
  const porMuro = useGrafitis((s) => s.porMuro)
  const modo = useGrafitis((s) => s.modo)
  const altoM = WALL_H * (alto ?? 1)
  return (
    <>
      {(['A', 'B'] as const).map((cara) => {
        const url = porMuro[claveSuperficie({ tipo: 'libre', muroLibreId, seg, cara })]
        if (!url) return null
        const s = modo?.superficie
        if (s?.tipo === 'libre' && s.muroLibreId === muroLibreId && s.seg === seg && s.cara === cara) return null
        const signo = cara === 'A' ? 1 : -1
        return (
          <GrafitiDecal
            key={cara}
            url={url}
            ancho={largo}
            alto={altoM}
            position={[0, yBase + altoM / 2, signo * (WALL_T / 2 + EPS_GRAFITI)]}
            rotY={cara === 'A' ? 0 : Math.PI}
          />
        )
      })}
    </>
  )
}

/**
 * Lienzo VIVO del modo pintar: plano con CanvasTexture del canvas de trabajo,
 * pegado a la cara del muro. El puntero (sobre el overlay DOM `data-lienzo-grafiti`)
 * se raycastea contra este plano y su UV alimenta los trazos — el mapeo pantalla→muro
 * es exacto por construcción, con la cámara donde esté.
 */
function PlanoVivo({ modo }: { modo: ModoGrafiti }) {
  const planoRef = useRef<THREE.Mesh>(null)
  const lataRef = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const version = useGrafitis((s) => s.version)
  const color = useGrafitis((s) => s.color)

  // Textura nueva por sesión de pintura (el canvas cambia de tamaño por muro).
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvasGrafiti)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [modo])
  useEffect(() => () => tex.dispose(), [tex])
  // Deshacer/limpiar desde la barra: refrescar la textura.
  useEffect(() => {
    tex.needsUpdate = true
  }, [tex, version])

  useEffect(() => {
    let pintando = false

    const uvEn = (cx: number, cy: number): THREE.Vector2 | null => {
      const plano = planoRef.current
      if (!plano) return null
      const r = gl.domElement.getBoundingClientRect()
      _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      _ray.setFromCamera(_ndc, camera)
      return _ray.intersectObject(plano)[0]?.uv ?? null
    }
    // Solo pinta el puntero que empieza sobre el área de captura (no la barra de botones).
    const esLienzo = (e: PointerEvent) =>
      (e.target as HTMLElement | null)?.dataset?.lienzoGrafiti != null
    // La lata-cursor sigue el punto pintado/apuntado sobre la cara del muro.
    const moverLata = (uv: THREE.Vector2) => {
      lataRef.current?.position.set((uv.x - 0.5) * modo.ancho, (uv.y - 0.5) * modo.alto, 0.14)
    }

    const down = (e: PointerEvent) => {
      if (!esLienzo(e)) return
      const uv = uvEn(e.clientX, e.clientY)
      if (!uv) return
      pintando = true
      try {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // Punteros sintéticos o ya liberados: se pinta igual sin captura.
      }
      const s = useGrafitis.getState()
      s.empezarTrazo(uv.x, uv.y)
      trazar(uv.x, uv.y, s.color, s.grosor, s.herramienta)
      iniciarSpray()
      moverLata(uv)
      tex.needsUpdate = true
    }
    const move = (e: PointerEvent) => {
      if (!pintando) {
        // Solo apuntando: la lata acompaña al cursor sobre el muro.
        if (!esLienzo(e)) return
        const uv = uvEn(e.clientX, e.clientY)
        if (uv) moverLata(uv)
        return
      }
      const s = useGrafitis.getState()
      let ultimo: THREE.Vector2 | null = null
      for (const ev of e.getCoalescedEvents?.() ?? [e]) {
        const uv = uvEn(ev.clientX, ev.clientY)
        if (!uv) continue
        trazar(uv.x, uv.y, s.color, s.grosor, s.herramienta)
        ultimo = uv
      }
      if (ultimo) moverLata(ultimo)
      tex.needsUpdate = true
    }
    const up = () => {
      pintando = false
      detenerSpray()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useGrafitis.getState().salir()
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('keydown', onKey)
    return () => {
      detenerSpray()
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, camera, tex])

  return (
    <group position={modo.centro} rotation={[0, modo.rotY, 0]}>
      <mesh ref={planoRef}>
        <planeGeometry args={[modo.ancho, modo.alto]} />
        <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.9} />
      </mesh>
      {/* Lata-cursor: el avatar se oculta en esta vista y la lata marca dónde pintas,
          inclinada hacia el muro como rociando. */}
      <group
        ref={lataRef}
        position={[0, -modo.alto * 0.15, 0.14]}
        rotation={[-0.45, 0, 0]}
        scale={1.5}
      >
        <LataAerosol color={color} />
      </group>
    </group>
  )
}

/** Clic/tap directo sobre un muro cercano con el grafiti equipado: entra a pintar. */
function ClicDirecto() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const equipado = useHerramienta((s) => s.equipadas.includes('grafiti'))
  const editMode = useLayout((s) => s.editMode)
  const activeRoom = useHouse((s) => s.activeRoom)
  const pintando = useGrafitis((s) => !!s.modo)
  const activo = equipado && !editMode && !activeRoom && !pintando

  useEffect(() => {
    if (!activo) return
    const el = gl.domElement
    let dx = 0
    let dy = 0
    const down = (e: PointerEvent) => {
      dx = e.clientX
      dy = e.clientY
    }
    const up = (e: PointerEvent) => {
      if (e.button !== 0) return
      // Umbral de arrastre: una órbita/pan no debe abrir el modo pintar.
      if (Math.hypot(e.clientX - dx, e.clientY - dy) > 6) return
      const r = el.getBoundingClientRect()
      _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      _ray.setFromCamera(_ndc, camera)
      for (const h of _ray.intersectObjects(scene.children, true)) {
        const res = buscarMuro(h.object)
        if (!res || !h.face) continue
        if (Math.hypot(h.point.x - playerPos.x, h.point.z - playerPos.z) > ALCANCE_CLIC) {
          useGrafitis.getState().avisar('sinMuro')
          return
        }
        const normal = h.face.normal.clone().transformDirection(h.object.matrixWorld)
        if (res.muro) void useGrafitis.getState().iniciar(res.muro, normal)
        else if (res.muroLibre != null)
          void useGrafitis.getState().iniciar({ muroLibreId: res.muroLibre, seg: res.muroLibreSeg ?? 0 }, normal)
        return
      }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
    }
  }, [activo, gl, camera, scene])

  return null
}

/** Juguete Grafiti dentro de la escena: selección por clic + lienzo vivo al pintar. */
export function GrafitiController() {
  const modo = useGrafitis((s) => s.modo)
  return (
    <>
      <ClicDirecto />
      {modo && <PlanoVivo modo={modo} />}
    </>
  )
}
