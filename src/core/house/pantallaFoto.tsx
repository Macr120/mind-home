import { createContext, useContext, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { TIPO_LAPTOP } from './especialesPlantillaMeta'

/**
 * Pantallas personalizables (TV, monitor, computadora del despacho): el usuario
 * sube una imagen o un GIF y se ve sobre la pantalla encendida. La imagen vive
 * en `ObjetoCuarto.foto` (el mismo campo del cuadro y el espectacular) y baja a
 * la pantalla por contexto, para no tocar la firma de cada modelo.
 *
 * Los GIF se animan con `ImageDecoder` (WebCodecs); donde no existe, se queda
 * el primer cuadro.
 */

/** Recursos y especiales cuya pantalla acepta imagen. */
export const TIPOS_PANTALLA = new Set(['recurso:50', 'recurso:58', 'recurso:69', TIPO_LAPTOP])
export const esPantalla = (tipo: string) => TIPOS_PANTALLA.has(tipo)

/** Tope de un GIF guardado tal cual (no se recomprime: perdería la animación). */
export const GIF_MAX_BYTES = 10 * 1024 * 1024

export const FotoPantallaContext = createContext<Blob | undefined>(undefined)

/** Lado mayor del lienzo de la textura (los GIF grandes se reducen). */
const LADO_MAX = 1024

interface CuadroDecodificado {
  image: CanvasImageSource & { displayWidth: number; displayHeight: number; duration: number | null; close(): void }
}
interface Decodificador {
  completed: Promise<void>
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null }
  decode(o: { frameIndex: number }): Promise<CuadroDecodificado>
  close(): void
}
type CtorDecodificador = new (o: { data: ReadableStream<Uint8Array>; type: string }) => Decodificador

/** Textura de la foto/GIF recortada tipo "cover" a la proporción `aspecto` (ancho/alto). */
function useTexturaPantalla(foto: Blob, aspecto: number): THREE.CanvasTexture | null {
  const invalidate = useThree((s) => s.invalidate)
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    let vivo = true
    let timer = 0
    let textura: THREE.CanvasTexture | null = null
    let dec: Decodificador | null = null
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const montar = (w: number, h: number) => {
      const escala = Math.min(1, LADO_MAX / Math.max(w, h))
      canvas.width = Math.max(1, Math.round(w * escala))
      canvas.height = Math.max(1, Math.round(h * escala))
      const t = new THREE.CanvasTexture(canvas)
      t.colorSpace = THREE.SRGBColorSpace
      const r = w / h
      if (r > aspecto) {
        t.repeat.set(aspecto / r, 1)
        t.offset.set((1 - aspecto / r) / 2, 0)
      } else {
        t.repeat.set(1, r / aspecto)
        t.offset.set(0, (1 - r / aspecto) / 2)
      }
      textura = t
      setTex(t)
    }
    const pintar = (img: CanvasImageSource) => {
      if (!ctx || !textura) return
      // Fondo negro: los GIF con transparencia no dejan rastro del cuadro anterior.
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      textura.needsUpdate = true
      invalidate()
    }

    const Ctor = (globalThis as { ImageDecoder?: CtorDecodificador }).ImageDecoder
    const animar = async (D: CtorDecodificador) => {
      const d = new D({ data: foto.stream(), type: 'image/gif' })
      dec = d
      await d.tracks.ready
      await d.completed
      const n = d.tracks.selectedTrack?.frameCount ?? 1
      let i = 0
      const paso = async () => {
        if (!vivo) return
        const { image } = await d.decode({ frameIndex: i })
        if (!vivo) return image.close()
        if (!textura) montar(image.displayWidth, image.displayHeight)
        pintar(image)
        // `duration` viene en microsegundos; los GIF con 0 se tratan como 100 ms.
        const ms = image.duration ? image.duration / 1000 : 100
        image.close()
        if (n > 1) {
          i = (i + 1) % n
          timer = window.setTimeout(paso, Math.max(20, ms))
        }
      }
      await paso()
    }
    const fija = async () => {
      const bmp = await createImageBitmap(foto)
      if (!vivo) return bmp.close()
      montar(bmp.width, bmp.height)
      pintar(bmp)
      bmp.close()
    }

    const cargar = foto.type === 'image/gif' && Ctor ? animar(Ctor).catch(fija) : fija()
    cargar.catch(() => {}) // imagen ilegible: la pantalla se queda con su color

    return () => {
      vivo = false
      window.clearTimeout(timer)
      try {
        dec?.close()
      } catch {
        // ya cerrado
      }
      textura?.dispose()
      setTex(null)
    }
  }, [foto, aspecto, invalidate])

  return tex
}

function PlanoFoto({ foto, p, w, h }: { foto: Blob; p: [number, number, number]; w: number; h: number }) {
  const tex = useTexturaPantalla(foto, w / h)
  if (!tex) return null
  return (
    <mesh position={p}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

/**
 * Imagen del usuario sobre una pantalla: plano w×h centrado en `p`, mirando a +z.
 * Sin foto no dibuja nada (queda la pantalla de color de siempre).
 */
export function PantallaFoto({ p, w, h }: { p: [number, number, number]; w: number; h: number }) {
  const foto = useContext(FotoPantallaContext)
  return foto ? <PlanoFoto foto={foto} p={p} w={w} h={h} /> : null
}
