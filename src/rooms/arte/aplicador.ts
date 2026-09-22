import * as api from '../../core/espacios/api'
import type { AplicadorLienzo, CapaCapturada, ConUid, EstadoDibujo } from '../../core/espacios/trazos'
import type { Lienzo } from './lienzo'
import { rngSembrado, type OpArte } from './ops'

/**
 * El puente entre las operaciones del dibujo compartido y el motor del lienzo:
 * lo que `core/espacios/trazos.ts` necesita para pintar lo que llega de otros y
 * para volver a pintar una capa desde el snapshot cuando el orden cambia.
 *
 * Dos reglas que hacen que el replay salga IGUAL en todos los dispositivos:
 * - el aerosol se siembra con `semilla` (nada de `Math.random`);
 * - cada operación se aplica en SU capa y con SU espejo, sin depender de lo que
 *   el usuario tenga seleccionado ahora mismo (se restaura al terminar).
 *
 * Nada de esto toca las pilas de deshacer del lienzo (`sinHistorial`): en un
 * dibujo compartido deshacer es otra operación más.
 */

export interface EntornoAplicador {
  lienzo: Lienzo
  /** Tamaño actual del bitmap. */
  dims: () => { ancho: number; alto: number }
  /** El lienzo cambió de tamaño (el editor reajusta guías, overlay y encuadre). */
  alTamano: (ancho: number, alto: number) => void
  /** Algo se pintó desde fuera: refrescar la UI y guardar la caché local. */
  alAplicar: () => void
}

export interface AplicadorArte extends AplicadorLienzo<OpArte> {
  /** Suelta los bitmaps descargados (al cerrar el editor). */
  soltar: () => void
}

export function crearAplicador(env: EntornoAplicador): AplicadorArte {
  const { lienzo } = env
  /** Imágenes ya descargadas del bucket, por ruta. */
  const imagenes = new Map<string, ImageBitmap>()

  /** Ejecuta `fn` conservando la capa que el usuario tenía activa. */
  function conservandoActiva(fn: () => void): void {
    const antes = lienzo.capaActiva()
    fn()
    if (lienzo.capas().some((c) => c.capaId === antes)) lienzo.activarCapa(antes)
  }

  /** Ejecuta `fn` con ESE espejo y devuelve el lienzo al que tenía el usuario. */
  function conEspejo(espejo: [boolean, boolean], fn: () => void): void {
    const [v, h] = lienzo.espejo()
    lienzo.setEspejo(espejo[0], espejo[1])
    try {
      fn()
    } finally {
      lienzo.setEspejo(v, h)
    }
  }

  function una(op: ConUid<OpArte>): void {
    switch (op.tipo) {
      case 'trazo': {
        const azar = rngSembrado(op.semilla)
        lienzo.enCapa(op.capa, () => {
          conEspejo(op.espejo, () => {
            // El primer punto solo COLOCA la pluma (igual que el pointerdown de
            // quien lo dibujó): si también se trazara saldría un punto de más.
            const [x0, y0] = op.pts[0]
            lienzo.empezarTrazo(x0, y0)
            for (let i = 1; i < op.pts.length; i++) {
              const p = op.pts[i]
              lienzo.trazar(p[0], p[1], op.color, op.grosor, op.herr, p[2], azar)
            }
          })
        })
        return
      }
      case 'forma':
        lienzo.enCapa(op.capa, () => {
          conEspejo(op.espejo, () => lienzo.cometerForma(op.herr, op.x0, op.y0, op.x1, op.y1, op.color, op.grosor))
        })
        return
      case 'relleno':
        lienzo.enCapa(op.capa, () => lienzo.rellenar(op.x, op.y, op.color))
        return
      case 'texto':
        lienzo.enCapa(op.capa, () => lienzo.texto(op.x, op.y, op.texto, op.color, op.tam))
        return
      case 'transformar':
        lienzo.transformarCaja(op.capa, op.de, op.a)
        return
      case 'imagen': {
        const bmp = imagenes.get(op.ruta)
        if (!bmp) return
        if (op.nueva) {
          conservandoActiva(() => lienzo.agregarCapa(op.nueva!.nombre, op.nueva!.capaId))
          lienzo.pintarEn(op.nueva.capaId, bmp, { x: op.x, y: op.y, w: op.w, h: op.h })
          return
        }
        lienzo.pintarEn(op.capa, bmp, op.cubrir ? undefined : { x: op.x, y: op.y, w: op.w, h: op.h })
        return
      }
      case 'limpiar':
        lienzo.enCapa(op.capa, () => lienzo.limpiar())
        return
      case 'filtro':
        lienzo.enCapa(op.capa, () => lienzo.filtrar(op.filtro))
        return
      case 'redimensionar':
        lienzo.redimensionar(op.ancho, op.alto, op.escalar)
        env.alTamano(op.ancho, op.alto)
        return
      case 'capa':
        conservandoActiva(() => {
          switch (op.accion) {
            case 'crear':
              lienzo.agregarCapa(op.nombre ?? op.capaId, op.capaId)
              return
            case 'borrar':
              lienzo.borrarCapa(op.capaId)
              return
            case 'visible':
              lienzo.setVisibleCapa(op.capaId, (op.valor ?? 1) >= 0.5)
              return
            case 'opacidad':
              lienzo.setOpacidadCapa(op.capaId, op.valor ?? 1)
              return
            case 'renombrar':
              if (op.nombre) lienzo.renombrarCapa(op.capaId, op.nombre)
              return
            case 'mover':
              if (op.delta) lienzo.moverCapa(op.capaId, op.delta)
              return
            case 'duplicar':
              if (op.nuevoId && op.nombre) lienzo.duplicarCapa(op.capaId, op.nombre, op.nuevoId)
              return
            case 'fusionar':
              lienzo.fusionarAbajo(op.capaId)
              return
          }
        })
        return
      default:
        // `deshacer`/`rehacer` los resuelve el motor: aquí no llegan.
        return
    }
  }

  return {
    aplicar(op) {
      lienzo.sinHistorial(() => una(op))
      env.alAplicar()
    },

    async preparar(op) {
      if (op.tipo !== 'imagen' || imagenes.has(op.ruta)) return
      try {
        imagenes.set(op.ruta, await createImageBitmap(await api.descargarArchivo(op.ruta)))
      } catch {
        // Sin la imagen, esa operación no pinta nada (el resto del dibujo sí).
      }
    },

    rerasterizar(capaId, base, ops) {
      lienzo.sinHistorial(() => {
        lienzo.ponerBase(capaId, base)
        for (const op of ops) una(op)
      })
      env.alAplicar()
    },

    cargarSnapshot(estado: EstadoDibujo) {
      // Volver al punto de partida no debe mover al usuario de capa.
      const antes = lienzo.capaActiva()
      lienzo.cargarCapas(estado.ancho, estado.alto, estado.capas)
      if (lienzo.capas().some((c) => c.capaId === antes)) lienzo.activarCapa(antes)
      env.alTamano(estado.ancho, estado.alto)
    },

    async capturarCapas(): Promise<CapaCapturada[]> {
      return (await lienzo.capturarCapas()).map((c) => ({
        capaId: c.capaId,
        nombre: c.nombre,
        visible: c.visible,
        opacidad: c.opacidad,
        blob: c.imagen,
      }))
    },

    tamano: () => env.dims(),

    soltar() {
      for (const b of imagenes.values()) b.close()
      imagenes.clear()
    },
  }
}
