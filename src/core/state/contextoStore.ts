import { create } from 'zustand'
import type { TipoAccionCuarto } from './accionCuartoStore'
import type { Herramienta } from './herramientaStore'

/**
 * Acciones que ofrece lo que el personaje tiene AL ALCANCE: las publica el
 * detector único `house/ContextoProximity.tsx` (un solo useFrame para toda la
 * casa) y las pinta `PanelContextual` en el hueco del cubo de vistas.
 *
 * Es el sustituto del viejo modelo de "activación automática": antes el sillón
 * de lectura te sentaba al pasar, el carrusel te subía y la pistola se equipaba
 * sola borrando el objeto, mientras que una silla del catálogo —al mismo radio—
 * te ofrecía un botón. Ahora TODO pasa por un botón; la proximidad solo decide
 * qué botones existen. La animación por cercanía sigue siendo automática, pero
 * es un efecto visual aparte (ver `actualizarEnergia` en `house/animacion.ts`).
 *
 * "Mover" (agarrar un objeto o un cuarto) no vive aquí: se queda en `cargarStore`
 * junto a su mecánica de carga, y este detector lo alimenta igual que a los demás.
 * Tipos como literales/importados de otros stores para no depender de `house/`
 * (evita ciclos, mismo criterio que `accionCuartoStore`).
 */
export type TipoContextual =
  /** Encender su animación y/o entrar a la app que tiene asignada. */
  | 'interactuar'
  /** Anuncio (espectacular, letrero de Vegas, neón): abre el editor en su texto. */
  | 'letrero'
  /** Uno de los 5 usables de plantilla: caminadora, sillón, laptop, tapete, libreta. */
  | 'usable'
  /** Juego del parque: carrusel, columpio, resbaladilla o pasamanos. */
  | 'juego'
  /** Dona flotadora de la alberca. */
  | 'flotador'
  /** Parcela del huerto con la cosecha lista. */
  | 'cosechar'
  /** Pistola colocada en el mapa: se equipa en la mano. */
  | 'recoger'
  /** Vía o montaña rusa al alcance: monta el tren/carrito. */
  | 'tren'
  /** Esa misma vía, con su tren dando vueltas: abre qué hacer con él. */
  | 'trenMenu'
  /** De pie en una cancha: abre la elección de modo del deporte. */
  | 'cancha'
  /** De pie en la meta de un circuito: abre la previa de la carrera. */
  | 'carrera'
  // Junto a un corral de la granja (los dos últimos solo cuando hacen falta).
  | 'alimentar'
  | 'acariciar'
  | 'curar'
  | 'limpiar'
  // Junto a un objeto con el preset «Dale vida» (mismos cuidados, sin corral).
  | 'alimentarObjeto'
  | 'acariciarObjeto'
  /** Al pie de una escalera/ascensor: cambia de piso. */
  | 'nivel'

export interface AccionContextual {
  tipo: TipoContextual
  /** Objeto al que apunta (para 'cosechar', la fila de `db.cultivos`). */
  id: number
  /** 'interactuar': app que abre al pulsar, si tiene una asignada. */
  plantillaId?: string
  /** 'interactuar': cuarto del objeto, para nombrar el botón («Revisar tu Cocina»). */
  roomId?: string
  /** 'interactuar': tiene animación que encender (ver `pulsarAnimacion`). */
  animado?: boolean
  /** 'usable': cuál de los 5 es, para la pose del avatar. */
  usable?: TipoAccionCuarto
  /** 'recoger': pistola que se equipa en la hotbar. */
  pistola?: Herramienta
  /** 'tren': vía normal o montaña rusa (cambia icono y texto). */
  riel?: 'riel' | 'coaster'
  /** 'cancha': deporte de la cancha que se pisa (futbol, tenis, basket, beisbol). */
  clase?: string
  /** 'alimentar' (cesta) y 'curar' (animales enfermos): número entre paréntesis. */
  cantidad?: number
  /** 'nivel': hacia arriba o hacia abajo, y a qué piso se llega. */
  subir?: boolean
  nivelDestino?: number
  /** Pose del objeto en el mundo ('usable' y 'flotador' la necesitan para colocar al avatar). */
  wx?: number
  wz?: number
  rotY?: number
}

interface ContextoState {
  acciones: AccionContextual[]
  setAcciones: (lista: AccionContextual[]) => void
}

/**
 * ¿Las dos listas ofrecen lo mismo? (evita un re-render 5 veces por segundo).
 * `cantidad` entra en la comparación porque se PINTA — «Alimentar (422)» se
 * quedaría congelado al gastar la cesta.
 */
function mismas(a: AccionContextual[], b: AccionContextual[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (x, i) =>
      x.tipo === b[i].tipo &&
      x.id === b[i].id &&
      x.cantidad === b[i].cantidad &&
      x.subir === b[i].subir &&
      x.nivelDestino === b[i].nivelDestino,
  )
}

export const useContexto = create<ContextoState>((set, get) => ({
  acciones: [],
  setAcciones: (lista) => {
    if (mismas(get().acciones, lista)) return
    set({ acciones: lista })
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useContexto: typeof useContexto }).useContexto = useContexto
}
