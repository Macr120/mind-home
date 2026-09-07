import type { CamaraPelicula, EfectoCamaraId, EscenaActor, FuenteVisual } from '../../../core/data/db'
import type { TFunc } from '../../../core/i18n/useT'
import { LIMITES_CAMARA, lienzoCam, zoomMin } from '../../../core/state/cameraStore'
import { ES_JUGADOR } from '../../../core/state/peliculaStore'
import { playerPos } from '../../../core/state/playerPosition'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'
import { nombreActor } from '../actores'
import { redondear } from '../modelo'

/**
 * Los movimientos de cámara y las formaciones del estudio de cine (modo
 * película), como funciones puras sobre `CamaraPelicula`. Un movimiento es la
 * pareja cámara inicial → final que el Director ya sabe interpolar (`camFin`);
 * «seguir» deja el foco en manos del Director, que lo lleva al actor cada
 * frame. Las formaciones colocan a las marionetas respecto a la cámara.
 */

export type FuenteEscena3d = Extract<FuenteVisual, { tipo: 'escena3d' }>

export const EFECTOS_CAMARA: { id: EfectoCamaraId; icono: NombreIcono; es: string }[] = [
  { id: 'fijo', icono: 'captura', es: 'Plano fijo' },
  { id: 'zoomIn', icono: 'acercar', es: 'Zoom in' },
  { id: 'zoomOut', icono: 'alejar', es: 'Zoom out' },
  { id: 'panIzq', icono: 'izquierda', es: 'Paneo a la izquierda' },
  { id: 'panDer', icono: 'derecha', es: 'Paneo a la derecha' },
  { id: 'orbita', icono: 'rotar-der', es: 'Órbita' },
  { id: 'picado', icono: 'bajar', es: 'Picado' },
  { id: 'contrapicado', icono: 'subir', es: 'Contrapicado' },
  { id: 'seguir', icono: 'persona', es: 'Seguir a un personaje' },
]

export const nombreEfecto = (t: TFunc, id: EfectoCamaraId) =>
  t(`video.pelicula.efecto.${id}`, EFECTOS_CAMARA.find((e) => e.id === id)?.es ?? id)

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const copia = (c: CamaraPelicula): CamaraPelicula => ({ ...c, focus: [c.focus[0], c.focus[1], c.focus[2]] })

/**
 * Ejes de la cámara proyectados al suelo (x, z): `fondo` = arriba en pantalla
 * (lejos de la cámara), `derecha` = derecha en pantalla. En iso la cámara vive
 * en `focus + R·(cos az, ·, sin az)` (CameraRig), así que el frente es su
 * opuesto; en 1ª/3ª mandan las convenciones de FollowCamera (en 3ª `yaw` es
 * dónde está la cámara respecto a la cabeza).
 */
function ejesCamara(c: CamaraPelicula): { fondo: [number, number]; derecha: [number, number] } {
  const fondo: [number, number] =
    c.vista === 'iso'
      ? [-Math.cos(c.az), -Math.sin(c.az)]
      : c.vista === 'primera'
        ? [Math.sin(c.yaw), Math.cos(c.yaw)]
        : [-Math.sin(c.yaw), -Math.cos(c.yaw)]
  return { fondo, derecha: [-fondo[1], fondo[0]] }
}

/** La fuente de un plano con el movimiento pedido a partir de la cámara `base` (la de ese momento). */
export function conEfecto(base: CamaraPelicula, efecto: EfectoCamaraId, seguir?: string): FuenteEscena3d {
  const cam = copia(base)
  if (efecto === 'fijo') return { tipo: 'escena3d', cam }
  if (efecto === 'seguir') return { tipo: 'escena3d', cam, efecto, seguir: seguir ?? ES_JUGADOR }
  const fin = copia(base)
  const L = LIMITES_CAMARA
  const iso = base.vista === 'iso'
  const tercera = base.vista === 'tercera'
  const { derecha } = ejesCamara(base)
  switch (efecto) {
    case 'zoomIn':
      if (iso) fin.zoom = clamp(base.zoom * 1.6, zoomMin(), L.zoomMax)
      else if (tercera) fin.dist3p = Math.max(L.dist3pMin, base.dist3p * 0.6)
      else fin.fov1p = clamp(base.fov1p * 0.65, L.fov1pMin, L.fov1pMax)
      break
    case 'zoomOut':
      if (iso) fin.zoom = clamp(base.zoom / 1.6, zoomMin(), L.zoomMax)
      else if (tercera) fin.dist3p = Math.max(L.dist3pMin, base.dist3p / 0.6)
      else fin.fov1p = clamp(base.fov1p / 0.65, L.fov1pMin, L.fov1pMax)
      break
    case 'panDer':
    case 'panIzq': {
      const signo = efecto === 'panDer' ? 1 : -1
      if (iso) {
        // Un cuarto del ancho visible (el ancho del frustum en px entre el zoom = unidades del mundo).
        const d = (0.25 * (lienzoCam.fw || 20)) / Math.max(base.zoom, 0.001)
        fin.focus = [base.focus[0] + derecha[0] * d * signo, base.focus[1], base.focus[2] + derecha[1] * d * signo]
      } else fin.yaw = base.yaw - 0.6 * signo // yaw mayor = la vista gira a la izquierda
      break
    }
    case 'orbita':
      if (iso) fin.az = base.az + Math.PI / 2
      else fin.yaw = base.yaw + Math.PI / 2
      break
    case 'picado':
      if (iso) fin.el = clamp(base.el + 0.5, L.elMin, L.elMax)
      else if (tercera) fin.pitch = Math.min(L.pitch3p.max, base.pitch + 0.5)
      else fin.pitch = Math.max(L.pitch1p.min, base.pitch - 0.5)
      break
    case 'contrapicado':
      // En iso no hay «por debajo del suelo»: baja hasta el alzado, a ras de suelo.
      if (iso) fin.el = clamp(base.el - 0.5, 0.05, L.elMax)
      else if (tercera) fin.pitch = Math.max(-0.12, base.pitch - 0.5)
      else fin.pitch = Math.min(L.pitch1p.max, base.pitch + 0.5)
      break
  }
  return { tipo: 'escena3d', cam, camFin: fin, efecto }
}

/** «Zoom in», «Seguir a un personaje: Ana»…; null para un plano fijo o sin movimiento. */
export function etiquetaEfecto(t: TFunc, f: FuenteEscena3d): string | null {
  if (!f.efecto || f.efecto === 'fijo') return null
  const nombre = nombreEfecto(t, f.efecto)
  return f.efecto === 'seguir' && f.seguir ? `${nombre}: ${nombreActor(t, f.seguir)}` : nombre
}

// ─── Formaciones de las marionetas ───────────────────────────────────────────

export type FormacionId = 'fila' | 'semicirculo' | 'frente' | 'circulo'

export const FORMACIONES: { id: FormacionId; es: string }[] = [
  { id: 'fila', es: 'Fila' },
  { id: 'semicirculo', es: 'Semicírculo' },
  { id: 'frente', es: 'Frente a frente' },
  { id: 'circulo', es: 'Círculo' },
]

export interface Puesto {
  x: number
  z: number
  /** null = mirar a la cámara; un actor = mirarse entre ellos. */
  mirar: EscenaActor['mirar'] | null
}

/** El centro del escenario: lo que mira la cámara (iso) o unos pasos por delante de tu avatar (1ª/3ª). */
function centroEscenario(cam: CamaraPelicula): { x: number; z: number } {
  if (cam.vista === 'iso') return { x: cam.focus[0], z: cam.focus[2] }
  const { fondo } = ejesCamara(cam)
  return { x: playerPos.x + fondo[0] * 2.5, z: playerPos.z + fondo[1] * 2.5 }
}

/** Un puesto por marioneta, en el orden dado, alrededor del centro del escenario y de cara a la cámara. */
export function formacion(tipo: FormacionId, ids: string[], cam: CamaraPelicula): Map<string, Puesto> {
  const c = centroEscenario(cam)
  const { fondo, derecha } = ejesCamara(cam)
  const n = ids.length
  const th0 = Math.atan2(fondo[1], fondo[0])
  const puestos = new Map<string, Puesto>()
  ids.forEach((id, i) => {
    let x = c.x
    let z = c.z
    let mirar: Puesto['mirar'] = null
    switch (tipo) {
      case 'fila': {
        const k = (i - (n - 1) / 2) * 1.6
        x += derecha[0] * k
        z += derecha[1] * k
        break
      }
      case 'semicirculo': {
        // Arco en el lado lejano, abierto hacia la cámara; ~1,4 u entre marionetas.
        const r = Math.max(2.2, (1.4 * (n - 1)) / 2.79)
        const th = th0 + (n > 1 ? (i / (n - 1) - 0.5) * ((160 * Math.PI) / 180) : 0)
        x += Math.cos(th) * r
        z += Math.sin(th) * r
        break
      }
      case 'frente': {
        // Parejas cara a cara a los lados del centro; las siguientes parejas, una fila más al fondo.
        const lado = i % 2 ? 1 : -1
        const pares = Math.ceil(n / 2)
        const f = (Math.floor(i / 2) - (pares - 1) / 2) * 1.2
        x += derecha[0] * 0.9 * lado + fondo[0] * f
        z += derecha[1] * 0.9 * lado + fondo[1] * f
        const otro = ids[i ^ 1]
        if (otro) mirar = { actor: otro }
        break
      }
      case 'circulo': {
        const r = Math.max(2, (1.4 * n) / (2 * Math.PI))
        const th = th0 + (i * 2 * Math.PI) / n
        x += Math.cos(th) * r
        z += Math.sin(th) * r
        if (n >= 2) mirar = { actor: ids[(i + Math.floor(n / 2)) % n] }
        break
      }
    }
    puestos.set(id, { x: redondear(x), z: redondear(z), mirar })
  })
  return puestos
}

/** Un paso de la marioneta respecto a la cámara actual (izquierda/derecha en pantalla, hacia el fondo o hacia la cámara). */
export function empujar(
  p: { x: number; z: number },
  dir: 'izq' | 'der' | 'adelante' | 'atras',
  cam: CamaraPelicula,
  paso = 0.5,
): { x: number; z: number } {
  const { fondo, derecha } = ejesCamara(cam)
  const eje = dir === 'izq' || dir === 'der' ? derecha : fondo
  const signo = dir === 'der' || dir === 'adelante' ? 1 : -1
  return { x: redondear(p.x + eje[0] * paso * signo), z: redondear(p.z + eje[1] * paso * signo) }
}
