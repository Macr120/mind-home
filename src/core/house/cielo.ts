import { mezclar } from './temas'
import { getFondo, type FondoId } from './fondos'

/**
 * Geometría y colores del ciclo día/noche a partir del minuto del día (0..1439).
 *
 * El sol describe un arco: sale por el ESTE (+X) a las 06:00, llega al cenit a las
 * 12:00 y se oculta por el OESTE (−X) a las 18:00. De noche el sol queda bajo el
 * horizonte y aparece la luna (en el lado opuesto). Función pura: la usan tanto la
 * escena 3D (luces, fondo) como el mini-arco del panel.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Radio por defecto del arco del sol/luna (el componente 3D pasa uno dinámico según el mapa). */
const RADIO_CIELO = 55

const SOL_ALTO = '#fff6e8' // sol de mediodía (blanco cálido)
const SOL_BAJO = '#ff8a3c' // sol rasante (naranja de amanecer/atardecer)
const LUNA_COLOR = '#aebfe6' // luz de luna (azul frío)

const CIELO_NOCHE = '#161e36' // azul noche (no negro: la noche no se ve tan oscura)
const CIELO_DIA = '#9cc3f0'
const CIELO_BORDE = '#e8915a' // tinte naranja cerca del horizonte

type Fase = 'amanecer' | 'dia' | 'atardecer' | 'noche'

interface Luz {
  /** Posición de la luz (dirección × radio). */
  pos: [number, number, number]
  color: string
  intensidad: number
  visible: boolean
}

export interface EstadoCielo {
  /** Disco visible del sol (su posición SÍ recorre el cielo este→oeste). */
  sol: Luz
  /** Disco visible de la luna. */
  luna: Luz
  /**
   * Luz que ilumina la casa y proyecta las sombras. Es CONSTANTE: de día siempre como
   * el mediodía (12:00) y de noche como la medianoche (23:59). No sigue al disco del sol,
   * así las sombras no bailan y la iluminación es estable.
   */
  luzEscena: Luz
  /** Intensidad de la luz ambiental (alta de día, baja de noche). */
  ambienteIntensidad: number
  /** Tinte de la luz ambiental (neutro de día, azulado de noche). */
  ambienteColor: string
  /** Color base del cielo (fondo de la escena) para esta hora. */
  cieloColor: string
  /** 0 = día pleno, 1 = noche cerrada (para teñir/oscurecer). */
  nocheFactor: number
  /** Es de noche: el sol está bajo el horizonte (se encienden los focos). */
  esNoche: boolean
  fase: Fase
  faseIcon: string
  faseLabel: string
}

export function estadoCielo(minutos: number, radio: number = RADIO_CIELO): EstadoCielo {
  // Ángulo del día: 0 en el este (06:00), π/2 en el cenit (12:00), π en el oeste (18:00).
  const ang = ((minutos - 360) / 720) * Math.PI
  const elev = Math.sin(ang) // altura sobre el horizonte (−1..1)
  const este = Math.cos(ang) // +1 este, −1 oeste
  // El arco se inclina hacia atrás (Z negativo) para que, en la cámara isométrica,
  // el sol/luna se proyecten por ENCIMA del mapa (cielo) y no sobre los cuartos.
  const ladeo = -0.35
  // Altura del arco: incluso al ras (amanecer/atardecer) el astro queda algo elevado,
  // nunca clavado en el piso del mapa. De noche baja del todo y desaparece.
  const alturaDe = (e: number) => (e * 0.55 + 0.35) * radio

  const sol: Luz = {
    pos: [este * radio, elev > -0.02 ? alturaDe(elev) : elev * radio, ladeo * radio],
    color: mezclar(SOL_BAJO, SOL_ALTO, clamp01(elev / 0.5)),
    intensidad: clamp01(elev * 1.15 + 0.08) * 1.15,
    visible: elev > -0.02,
  }

  // La luna va en el lado opuesto del cielo (sale cuando el sol se pone).
  const nocheFactor = clamp01(-elev / 0.3)
  const lunaElev = -elev
  const luna: Luz = {
    pos: [-este * radio, lunaElev > -0.02 ? alturaDe(lunaElev) : lunaElev * radio, ladeo * radio],
    color: LUNA_COLOR,
    intensidad: lerp(0.0, 0.4, nocheFactor),
    visible: elev < 0.03,
  }

  // Luz de ESCENA constante: posición cenital fija (mediodía y medianoche comparten cenit),
  // color/intensidad interpolados entre día (12:00) y noche (23:59). Transición rápida en
  // el amanecer/atardecer; el resto del día/noche es constante. Mantiene sombras estables.
  const luzDia = clamp01((elev + 0.1) / 0.2) // 1 de día, 0 de noche
  const luzEscena: Luz = {
    pos: [0, alturaDe(1), ladeo * radio],
    color: mezclar(LUNA_COLOR, SOL_ALTO, luzDia),
    intensidad: lerp(0.6, 1.2, luzDia), // luz de luna más generosa de noche
    visible: true,
  }

  const diaFactor = clamp01((elev + 0.05) / 0.35) // 0 de noche, 1 de día
  const borde = clamp01(1 - Math.abs(elev) / 0.22) // 1 cerca del horizonte
  // Mínimo de noche más generoso: el piso exterior no tiene focos, así que de noche
  // necesita algo de ambiente para no quedar casi negro (sin matar el contraste de los focos).
  const ambienteIntensidad = lerp(0.42, 0.85, diaFactor)
  const ambienteColor = mezclar('#9fb0d8', '#ffffff', diaFactor)

  let cieloColor = mezclar(CIELO_NOCHE, CIELO_DIA, diaFactor)
  cieloColor = mezclar(cieloColor, CIELO_BORDE, borde * 0.55)

  const esNoche = elev < -0.02
  let fase: Fase
  if (elev > 0.28) fase = 'dia'
  else if (esNoche) fase = 'noche'
  else fase = minutos < 720 ? 'amanecer' : 'atardecer'
  const META: Record<Fase, [string, string]> = {
    amanecer: ['🌅', 'Amanecer'],
    dia: ['☀️', 'Día'],
    atardecer: ['🌇', 'Atardecer'],
    noche: ['🌙', 'Noche'],
  }

  return {
    sol,
    luna,
    luzEscena,
    ambienteIntensidad,
    ambienteColor,
    cieloColor,
    nocheFactor,
    esNoche,
    fase,
    faseIcon: META[fase][0],
    faseLabel: META[fase][1],
  }
}

/** Color de fondo final: respeta el tema si lo hay, pero lo oscurece un poco de noche. */
export function colorFondo(estado: EstadoCielo, temaFondo: string | null): string {
  const base = temaFondo ?? estado.cieloColor
  return mezclar(base, '#0b0e1a', estado.nocheFactor * 0.35)
}

/**
 * Color plano que se ve detrás de la interfaz (misma cascada que CieloDiaNoche:
 * color fijo → preset de fondo → ciclo automático). Lo usa el chrome para saber
 * sobre qué está flotando el vidrio del modo transparente; `null` cuando el
 * fondo es una imagen personalizada, cuyo color no se puede deducir.
 */
export function colorFondoVisible(opts: {
  fondoId: FondoId
  fondoColorFijo: string
  fondoImagenActivo: number | null
  temaFondo: string | null
  minutos: number
}): string | null {
  const { fondoId, fondoColorFijo, fondoImagenActivo, temaFondo, minutos } = opts
  if (fondoImagenActivo != null) return null
  if (fondoId === 'color_fijo') return fondoColorFijo
  const fondoDef = getFondo(fondoId)
  const cielo = estadoCielo(minutos)
  if (fondoDef.id === 'auto') return colorFondo(cielo, temaFondo)
  const arriba = mezclar(fondoDef.gradiente[0], '#0b0e1a', cielo.nocheFactor * 0.4)
  const abajo = mezclar(fondoDef.gradiente[1], '#050508', cielo.nocheFactor * 0.5)
  const fondo = mezclar(arriba, abajo, 0.5)
  return temaFondo ? mezclar(fondo, temaFondo, 0.2) : fondo
}
