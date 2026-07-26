import { useEffect, useState } from 'react'
import { fechaLocalISO } from '../../fechaLocal'

/**
 * El tiempo ya vivido, marcado sobre el propio calendario. Es decoración pura —
 * va siempre en `backgroundImage` o en una capa con `pointer-events-none`, para
 * que ningún gesto de la rejilla (crear, mover, estirar, trazar) se entere.
 *
 * Cómo se marca en cada vista:
 * - Día y Semana: una barra al margen (vertical en Día, horizontal sobre los días
 *   en Semana) más la línea de la hora actual. Sombrear la rejilla entera aquí
 *   apagaba los bloques y las líneas de hora, que es justo lo que hay que leer.
 * - Mes y Año: sombra sobre los días/meses cerrados, que ahí no tapa nada.
 */

/**
 * Color de la sombra: el ACENTO del tema de interfaz (Medianoche/Neón/Bosque/…),
 * no el fondo de la apariencia (`--ui-bg`) — con el fondo la sombra casi no se
 * distinguía del propio panel y no decía de qué tema era. Con `--ui-accent` cada
 * tema tiñe su calendario con su propio color y el degradado se aprecia claro
 * sobre paneles claros y oscuros. Aquí se ajusta la intensidad, en un solo sitio.
 */
export const SOMBRA_TIEMPO = 'color-mix(in srgb, var(--ui-accent) 30%, transparent)'

/** Trazo lleno de las marcas de Día/Semana (barra de avance y línea de la hora). */
export const COLOR_TIEMPO = 'var(--ui-accent)'

/** Minutos vividos del día de `ahora` (0–1440). */
const minutosDe = (ahora: Date) => ahora.getHours() * 60 + ahora.getMinutes()

/** Fracción 0–1 del día ya transcurrida. Día pasado → 1, futuro → 0. */
export function fraccionDia(iso: string, ahora: Date): number {
  const hoy = fechaLocalISO(ahora)
  if (iso < hoy) return 1
  if (iso > hoy) return 0
  return minutosDe(ahora) / 1440
}

/**
 * Fracción 0–1 de la semana (L→D) ya transcurrida a la hora `ahora`, para la
 * barra que corona los días. Semana pasada → 1, futura → 0.
 */
export function fraccionSemana(lunes: Date, ahora: Date): number {
  // Medianoche contra medianoche: restar los Date crudos daría 23 h o 25 h en los
  // cambios de horario y el día se contaría mal.
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const dias = Math.round((hoy.getTime() - lunes.getTime()) / 86_400_000)
  if (dias < 0) return 0
  if (dias >= 7) return 1
  return (dias + minutosDe(ahora) / 1440) / 7
}

/** Fracción 0–1 del año ya transcurrida. Año pasado → 1, futuro → 0. */
export function fraccionAnio(anio: number, ahora: Date): number {
  if (anio < ahora.getFullYear()) return 1
  if (anio > ahora.getFullYear()) return 0
  const ini = new Date(anio, 0, 1).getTime()
  const fin = new Date(anio + 1, 0, 1).getTime()
  return (ahora.getTime() - ini) / (fin - ini)
}

/** Fracción 0–1 del mes ya transcurrida. Mes pasado → 1, futuro → 0. */
export function fraccionMes(anio: number, mes: number, ahora: Date): number {
  const actual = ahora.getFullYear() * 12 + ahora.getMonth()
  const objetivo = anio * 12 + mes
  if (objetivo < actual) return 1
  if (objetivo > actual) return 0
  const dias = new Date(anio, mes + 1, 0).getDate()
  return (ahora.getDate() - 1 + minutosDe(ahora) / 1440) / dias
}

const sombraPlana = `linear-gradient(${SOMBRA_TIEMPO}, ${SOMBRA_TIEMPO})`

/** Sombra que cubre de izquierda a derecha la fracción dada (0 → nada, 1 → todo). */
function sombraParcial(frac: number): string | null {
  if (frac <= 0) return null
  if (frac >= 1) return sombraPlana
  const pct = Math.round(frac * 100)
  return `linear-gradient(to right, ${SOMBRA_TIEMPO} 0 ${pct}%, transparent ${pct}% 100%)`
}

/**
 * Capa para la celda de UN día (Mes y Año). El día en curso se sombrea solo
 * hasta la hora actual, que dentro de la celda se lee como su avance.
 */
export const capaTiempoDia = (iso: string, ahora: Date) => sombraParcial(fraccionDia(iso, ahora))

/**
 * Capa para un mini-mes entero (Año): plana si ya terminó, nada si aún no empieza.
 * El mes en curso no se sombrea aquí — lo hacen sus días, que son más precisos.
 */
export function capaTiempoMes(anio: number, mes: number, ahora: Date): string | null {
  return fraccionMes(anio, mes, ahora) >= 1 ? sombraPlana : null
}

/** Compone la sombra del tiempo con las capas de color que ya trae la celda. */
export const componerFondo = (...capas: (string | null | undefined)[]) =>
  capas.filter(Boolean).join(', ') || undefined

/** `Date` que se refresca cada minuto, para que la sombra avance sola. */
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return ahora
}
