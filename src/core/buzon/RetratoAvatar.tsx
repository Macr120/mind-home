import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSesion } from '../cuenta/sesionStore'
import { hayBackend } from '../cuenta/supabase'
import { esDemo, esProbar } from '../edicion'
import { AvatarModelo } from '../house/AvatarModelo'
import { useDiseño, type Avatar } from '../state/disenoStore'
import { fijarRetrato } from './api'

/**
 * El busto del personaje 3D del usuario como retrato del buzón: se captura en
 * el dispositivo (canvas oculto, como `CapturaPersonajes` de la bienvenida)
 * cada vez que el diseño del avatar cambia y se sube a `perfiles.retrato`;
 * los contactos lo reciben con la lista de contactos.
 *
 * El canvas solo existe mientras hay una captura pendiente (un contexto WebGL
 * de más, unos segundos). La firma del avatar ya subido se guarda por cuenta en
 * localStorage para no re-subir lo mismo en cada arranque.
 */

/** Lado del retrato final en px (queda en ~10-30 KB en webp). */
const LADO = 128
/** El editor dispara muchos cambios seguidos: se captura cuando el avatar lleva un rato quieto. */
const ESPERA_MS = 4000

const claveFirma = (uid: string) => `mh.retrato.firma:${uid}`

function firmaDe(av: Avatar): string {
  const s = JSON.stringify(av)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${s.length}:${h}`
}

/** Recorte cuadrado y reducción a LADO px; webp si el navegador sabe, png si no. */
function reducir(fuente: HTMLCanvasElement): string | null {
  const c = document.createElement('canvas')
  c.width = LADO
  c.height = LADO
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const lado = Math.min(fuente.width, fuente.height)
  ctx.drawImage(fuente, (fuente.width - lado) / 2, (fuente.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  let url = c.toDataURL('image/webp', 0.85)
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png')
  return url.length <= 65536 ? url : null
}

/**
 * Encuadra cabeza y hombros: mide el personaje ya pintado (los cuerpos y
 * sombreros varían mucho), apunta al tercio superior y acerca la cámara.
 */
function CapturaBusto({ av, onListo }: { av: Avatar; onListo: (canvas: HTMLCanvasElement) => void }) {
  const { gl, camera } = useThree()
  const grupo = useRef<THREE.Group>(null)
  useEffect(() => {
    let vivo = true
    // Dos rAF: deja que R3F pinte el modelo antes de medirlo.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!vivo || !grupo.current) return
        const caja = new THREE.Box3().setFromObject(grupo.current)
        const alto = caja.max.y - caja.min.y || 1.72
        const objetivo = new THREE.Vector3(
          (caja.max.x + caja.min.x) / 2,
          caja.max.y - alto * 0.22,
          (caja.max.z + caja.min.z) / 2,
        )
        // Tres cuartos de frente, un poco desde arriba; con fov 30 se ve ~55 % del alto.
        const dir = new THREE.Vector3(0.55, 0.25, 1).normalize()
        camera.position.copy(objetivo).addScaledVector(dir, Math.max(0.6, alto * 1.05))
        camera.lookAt(objetivo)
        // Un rAF más: que pinte con la cámara ya puesta antes de capturar.
        requestAnimationFrame(() => {
          if (vivo) onListo(gl.domElement)
        })
      })
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una captura por montaje
  }, [])
  return (
    <group ref={grupo}>
      <AvatarModelo av={av} />
    </group>
  )
}

export function RetratoAvatar() {
  const usuario = useSesion((s) => s.usuario)
  const retrato = useSesion((s) => s.retrato)
  const avatar = useDiseño((s) => s.avatar)
  const [pendiente, setPendiente] = useState<{ uid: string; firma: string; av: Avatar } | null>(null)

  useEffect(() => {
    if (!usuario || !hayBackend() || esDemo() || esProbar()) return
    const firma = firmaDe(avatar)
    // Ya subido con este mismo diseño (y el servidor lo tiene): nada que hacer.
    if (retrato && localStorage.getItem(claveFirma(usuario.id)) === firma) return
    const timer = setTimeout(() => setPendiente({ uid: usuario.id, firma, av: avatar }), ESPERA_MS)
    return () => clearTimeout(timer)
  }, [usuario, retrato, avatar])

  if (!pendiente) return null

  const listo = (canvas: HTMLCanvasElement) => {
    const { uid, firma } = pendiente
    setPendiente(null)
    const url = reducir(canvas)
    if (!url) return
    void fijarRetrato(url)
      .then(() => localStorage.setItem(claveFirma(uid), firma))
      .catch(() => {
        // Se reintenta en el próximo arranque o cambio del avatar.
      })
  }

  return (
    <div className="pointer-events-none fixed start-[-9999px] top-0 h-64 w-64" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [1.5, 1.3, 3], fov: 30, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.35} />
        <CapturaBusto key={pendiente.firma} av={pendiente.av} onListo={listo} />
      </Canvas>
    </div>
  )
}
