import { create } from 'zustand'

/**
 * La región del MAPA 3D que resalta el tutorial: el paso la declara (campo
 * `zona`), el motor la publica aquí, `ZonaTutProjector` la proyecta a píxeles
 * cada frame y `TutorialOverlay` abre ahí el hueco de su velo.
 *
 * Vive en `state` (y no en `tutorial/`) porque la comparten tres capas:
 * el motor de tutoriales, la escena 3D y los focos del demo.
 */

/**
 * Ámbar de los tutoriales (Tailwind `amber-400`, el mismo del selector de
 * zonas): marca el OBJETO que se edita, frente al color de la zona de fondo.
 */
export const AMBAR_FOCO = '#fbbf24'

export interface RegionMapa {
  /** Centro en coordenadas de mundo (la misma forma que devuelve `rectMundo`). */
  centro: [number, number, number]
  /** Tamaño en metros sobre el eje X. */
  ancho: number
  /** Tamaño en metros sobre el eje Z. */
  largo: number
  /** Altura que debe caber en el recuadro (montaña rusa, letreros). */
  alto?: number
  /** Metros de aire al encuadrar: separa el hueco de las barras del HUD. */
  margen?: number
  /** Color del contorno sobre el terreno (el de su zona; default: acento). */
  color?: string
}

/** Recuadro en píxeles del viewport (mismo contrato que la caja del overlay). */
export interface CajaPantalla {
  left: number
  top: number
  width: number
  height: number
}

/** Vértice en píxeles del viewport. */
export type Punto = [number, number]

/**
 * Lo que el proyector publica de una región: su SILUETA en pantalla (el rombo
 * del terreno, o el hexágono que envuelve lo elevado) y su caja envolvente.
 * La silueta recorta el velo; la caja la usa la colocación de la tarjeta.
 */
export interface ProyeccionZona {
  caja: CajaPantalla
  poligono: Punto[]
}

interface ZonaTutState {
  /** El CUADRANTE de fondo: persiste entre pasos mientras no lo cambien. */
  zona: RegionMapa | null
  /** El OBJETO que se edita en este paso (se resalta en ámbar); es por paso. */
  foco: RegionMapa | null
  /** Proyección de lo que recorta el velo (`foco ?? zona`); null si no se ve. */
  proyeccion: ProyeccionZona | null
  setZona: (r: RegionMapa | null) => void
  setFoco: (r: RegionMapa | null) => void
  setProyeccion: (p: ProyeccionZona | null) => void
}

/** Lo que recorta el velo y a lo que vuela la cámara: el objeto si lo hay. */
export const regionResaltada = (s: {
  zona: RegionMapa | null
  foco: RegionMapa | null
}): RegionMapa | null => s.foco ?? s.zona

const igual = (a: ProyeccionZona, b: ProyeccionZona) =>
  a.caja.left === b.caja.left &&
  a.caja.top === b.caja.top &&
  a.caja.width === b.caja.width &&
  a.caja.height === b.caja.height &&
  a.poligono.length === b.poligono.length &&
  a.poligono.every((p, i) => p[0] === b.poligono[i][0] && p[1] === b.poligono[i][1])

export const useZonaTut = create<ZonaTutState>((set, get) => ({
  zona: null,
  foco: null,
  proyeccion: null,
  setZona: (zona) => set({ zona, proyeccion: zona || get().foco ? get().proyeccion : null }),
  setFoco: (foco) => set({ foco, proyeccion: foco || get().zona ? get().proyeccion : null }),
  // El proyector llama esto cada frame: sin el dedupe, el overlay se
  // re-renderizaría 60 veces por segundo aunque la cámara ya esté quieta.
  setProyeccion: (p) => {
    const previa = get().proyeccion
    if (p == null) {
      if (previa != null) set({ proyeccion: null })
      return
    }
    if (!previa || !igual(previa, p)) set({ proyeccion: p })
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useZonaTut: typeof useZonaTut }).useZonaTut = useZonaTut
}
