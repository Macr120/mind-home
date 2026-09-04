import { useEffect } from 'react'
import { create } from 'zustand'
import { slugTexto } from '../slug'

/**
 * Qué enseñan las miniaturas del catálogo: la ilustración o el avatar en la
 * pose del ejercicio (conmutador Imagen | Animación en la esquina de los
 * catálogos; la preferencia se recuerda). En modo animación la miniatura es una
 * captura ESTÁTICA del avatar —renderizada una vez por `RenderizadorMiniaturas`
 * en un único canvas oculto y guardada aquí por slug— y solo cobra vida al
 * pasar el cursor por encima (un solo Canvas vivo a la vez).
 */
export type ModoMiniaturas = 'imagen' | 'animacion'

const LS = 'mindhome:ejercicio:miniaturas'

interface MiniaturasState {
  modo: ModoMiniaturas
  setModo: (modo: ModoMiniaturas) => void
  /** Poses ya renderizadas (data URL) por slug; '' = sin patrón. */
  poses: Record<string, string>
  /** Slugs pendientes, en orden; los atiende `RenderizadorMiniaturas`. */
  cola: string[]
  pedir: (slug: string) => void
  resolver: (slug: string, url: string) => void
  /** Al cambiar el avatar las capturas ya no son él (la cola se conserva: se vuelven a pedir solas). */
  limpiar: () => void
}

function leerModo(): ModoMiniaturas {
  try {
    return localStorage.getItem(LS) === 'imagen' ? 'imagen' : 'animacion'
  } catch {
    return 'animacion'
  }
}

export const useMiniaturas = create<MiniaturasState>((set, get) => ({
  modo: leerModo(),
  setModo: (modo) => {
    try {
      localStorage.setItem(LS, modo)
    } catch {
      // sin almacenamiento: la preferencia dura la sesión
    }
    set({ modo })
  },
  poses: {},
  cola: [],
  pedir: (slug) => {
    const s = get()
    if (slug in s.poses || s.cola.includes(slug)) return
    set({ cola: [...s.cola, slug] })
  },
  resolver: (slug, url) =>
    set((s) => ({ poses: { ...s.poses, [slug]: url }, cola: s.cola.filter((x) => x !== slug) })),
  limpiar: () => set({ poses: {} }),
}))

/** Captura estática del avatar en la pose del ejercicio (null mientras se renderiza). */
export function usePoseMiniatura(nombre: string, activo: boolean): string | null {
  const slug = slugTexto(nombre)
  const url = useMiniaturas((s) => s.poses[slug])
  const pedir = useMiniaturas((s) => s.pedir)
  useEffect(() => {
    if (activo && url === undefined) pedir(slug)
  }, [activo, url, slug, pedir])
  return url || null
}

/** ¿Hay cursor de verdad? En táctil no existe el hover: ahí la animación corre sola. */
export const hayHover = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
