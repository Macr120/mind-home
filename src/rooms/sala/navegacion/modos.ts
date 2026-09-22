import type { TFunc } from '../../../core/i18n/useT'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'

/** Modos que el usuario combina en el formulario. */
export type ModoNav = 'caminar' | 'bici' | 'moto' | 'auto' | 'transporte'

export const MODOS_NAV: { id: ModoNav; icono: NombreIcono; clave: string; es: string }[] = [
  { id: 'caminar', icono: 'caminar', clave: 'sala.nav.modo.caminar', es: 'Caminar' },
  { id: 'bici', icono: 'bici', clave: 'sala.nav.modo.bici', es: 'Bici' },
  { id: 'moto', icono: 'moto', clave: 'sala.nav.modo.moto', es: 'Moto' },
  { id: 'auto', icono: 'auto', clave: 'sala.nav.modo.auto', es: 'Auto' },
  { id: 'transporte', icono: 'bus', clave: 'sala.nav.modo.transporte', es: 'Transporte público' },
]

const CALLE = new Set(['pedestrian', 'bicycle', 'scooter', 'car'])

/** Tramo por calle (a pie, bici o auto), con maniobras. */
export const esCalle = (modo: string) => CALLE.has(modo)

export type FamiliaModo =
  | 'WALK'
  | 'BIKE'
  | 'MOTO'
  | 'CAR'
  | 'BUS'
  | 'TRAM'
  | 'SUBWAY'
  | 'RAIL'
  | 'FERRY'
  | 'AIRPLANE'
  | 'AERIAL_LIFT'
  | 'OTHER'

/** Familia visual de un modo de HERE (icono, color y nombre): agrupa los trenes y los cables. */
export function familiaModo(modo: string): FamiliaModo {
  switch (modo) {
    case 'pedestrian':
      return 'WALK'
    case 'bicycle':
      return 'BIKE'
    // HERE llama `scooter` a las dos ruedas a motor (moto y scooter).
    case 'scooter':
      return 'MOTO'
    case 'car':
      return 'CAR'
    case 'bus':
    case 'busRapid':
    case 'privateBus':
      return 'BUS'
    case 'lightRail':
      return 'TRAM'
    case 'subway':
      return 'SUBWAY'
    case 'cityTrain':
    case 'regionalTrain':
    case 'interRegionalTrain':
    case 'intercityTrain':
    case 'highSpeedTrain':
    case 'monorail':
      return 'RAIL'
    case 'ferry':
      return 'FERRY'
    case 'flight':
      return 'AIRPLANE'
    case 'aerial':
    case 'inclined':
      return 'AERIAL_LIFT'
    default:
      return 'OTHER'
  }
}

export const ICONO_MODO: Record<FamiliaModo, NombreIcono> = {
  WALK: 'caminar',
  BIKE: 'bici',
  MOTO: 'moto',
  CAR: 'auto',
  BUS: 'bus',
  TRAM: 'tranvia',
  SUBWAY: 'metro',
  RAIL: 'tren',
  FERRY: 'ferry',
  AIRPLANE: 'despegue',
  AERIAL_LIFT: 'via',
  OTHER: 'boleto',
}

/** Color con el que se pinta el tramo cuando la línea no trae el suyo. */
export const COLOR_MODO: Record<FamiliaModo, string> = {
  WALK: '#94a3b8',
  BIKE: '#22c55e',
  MOTO: '#8b5cf6',
  CAR: '#6366f1',
  BUS: '#f59e0b',
  TRAM: '#ec4899',
  SUBWAY: '#ef4444',
  RAIL: '#3b82f6',
  FERRY: '#06b6d4',
  AIRPLANE: '#a855f7',
  AERIAL_LIFT: '#14b8a6',
  OTHER: '#f97316',
}

const NOMBRE_ES: Record<FamiliaModo, string> = {
  WALK: 'A pie',
  BIKE: 'Bici',
  MOTO: 'Moto',
  CAR: 'Auto',
  BUS: 'Autobús',
  TRAM: 'Tranvía',
  SUBWAY: 'Metro',
  RAIL: 'Tren',
  FERRY: 'Ferry',
  AIRPLANE: 'Avión',
  AERIAL_LIFT: 'Teleférico',
  OTHER: 'Transporte',
}

export function nombreModo(t: TFunc, modo: string): string {
  const f = familiaModo(modo)
  return t(`sala.nav.mv.${f}`, NOMBRE_ES[f])
}

/** Icono de una maniobra de HERE (`action` + `direction`). */
export function iconoDireccion(paso: { accion: string; direccion?: string }): NombreIcono {
  const { accion, direccion } = paso
  if (accion === 'uTurn') return 'vueltaU'
  if (accion.startsWith('roundabout')) return 'rotonda'
  if (accion === 'turn' || accion === 'keep' || accion === 'ramp' || accion === 'exit') {
    if (direccion === 'left') return 'vueltaIzq'
    if (direccion === 'right') return 'vueltaDer'
  }
  return 'recto'
}
