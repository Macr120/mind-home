import { lazy, Suspense } from 'react'
import { create } from 'zustand'
import { Retrato } from '../buzon/ui/Retrato'
import { useAsistentes } from '../state/asistentesStore'
import type { Asistente } from './mascotas'

/**
 * Las caras de los asistentes en el chat: el busto de su personaje 3D, como
 * los retratos de Amigos. Se capturan en el dispositivo (canvas oculto, uno a
 * la vez) cuando cambia su aspecto y se guardan en localStorage por id, con la
 * firma del aspecto: reabrir la app ya no vuelve a pintarlas. Mientras no hay
 * cara se ve su emoji.
 */

const PREFIJO = 'mh.caraAsistente:'

interface Cara {
  /** Firma del aspecto con el que se capturó. */
  f: string
  url: string
}

/** Lo que cambia la cara: cuerpo, colores, ropa, rostro y peinado (los Blobs, por tamaño). */
export function firmaCara(a: Asistente): string {
  const s = JSON.stringify([
    a.forma,
    a.color,
    a.cuerpoPresetId,
    a.modelo3d,
    a.ropa,
    a.expresion,
    a.peinado,
    a.peloColor,
    a.rostro?.size,
    a.modeloGlb?.size,
  ])
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${s.length}:${h}`
}

function leerGuardadas(): Record<string, Cara> {
  const caras: Record<string, Cara> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(PREFIJO)) continue
      const c = JSON.parse(localStorage.getItem(k) ?? 'null') as Cara | null
      if (c?.url) caras[k.slice(PREFIJO.length)] = c
    }
  } catch {
    // Sin almacenamiento: se capturan en cada sesión.
  }
  return caras
}

export const useCarasAsistentes = create<{
  caras: Record<string, Cara>
  guardar: (id: string, cara: Cara) => void
}>((set) => ({
  caras: leerGuardadas(),
  guardar: (id, cara) => {
    set((s) => ({ caras: { ...s.caras, [id]: cara } }))
    try {
      localStorage.setItem(PREFIJO + id, JSON.stringify(cara))
    } catch {
      // Lleno o bloqueado: la cara vale para esta sesión.
    }
  },
}))

/** La cara del asistente (la última capturada, aunque su aspecto ya haya cambiado) o su emoji. */
export function CaraAsistente({
  asistente,
  className,
  textoClase,
}: {
  asistente: Pick<Asistente, 'id' | 'emoji'>
  className?: string
  textoClase?: string
}) {
  const url = useCarasAsistentes((s) => s.caras[asistente.id]?.url)
  return <Retrato retrato={url} emoji={asistente.emoji} className={className} textoClase={textoClase} />
}

const CapturaCaras = lazy(() => import('./CapturaCarasAsistentes').then((m) => ({ default: m.CapturaCarasAsistentes })))

/** Monta el capturador (y su WebGL) solo si a algún asistente le falta la cara al día. */
export function CarasAsistentesAlDia() {
  const lista = useAsistentes((s) => s.lista)
  const caras = useCarasAsistentes((s) => s.caras)
  const pendiente = lista.find((a) => caras[a.id]?.f !== firmaCara(a))
  if (!pendiente) return null
  return (
    <Suspense fallback={null}>
      <CapturaCaras asistente={pendiente} />
    </Suspense>
  )
}
