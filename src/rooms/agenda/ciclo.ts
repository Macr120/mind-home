import type { DiaCiclo } from '../../core/data/db'
import { deIso, DIA_MS, fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import type { TFunc } from '../../core/i18n/useT'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Seguimiento de ciclo: catálogo de síntomas y cuentas de predicción.
 *
 * La predicción sale de los ciclos REGISTRADOS, no de la constante de ajustes:
 * esa solo se usa mientras no haya dos periodos con los que medir. Y se presenta
 * siempre como estimación, con cuántos ciclos la sostienen.
 */

export interface DefSintoma {
  id: string
  emoji: string
  icono: NombreIcono
  clave: string
  es: string
}

export const SINTOMAS_CICLO: DefSintoma[] = [
  { id: 'colicos', emoji: '⚡', icono: 'energia', clave: 'agenda.ciclo.sint.colicos', es: 'Cólicos' },
  { id: 'cabeza', emoji: '🤕', icono: 'curar', clave: 'agenda.ciclo.sint.cabeza', es: 'Dolor de cabeza' },
  { id: 'hinchazon', emoji: '🎈', icono: 'globo', clave: 'agenda.ciclo.sint.hinchazon', es: 'Hinchazón' },
  { id: 'senos', emoji: '💗', icono: 'corazon', clave: 'agenda.ciclo.sint.senos', es: 'Senos sensibles' },
  { id: 'cansancio', emoji: '😴', icono: 'dormir', clave: 'agenda.ciclo.sint.cansancio', es: 'Cansancio' },
  { id: 'antojos', emoji: '🍫', icono: 'dulces', clave: 'agenda.ciclo.sint.antojos', es: 'Antojos' },
  { id: 'acne', emoji: '🫧', icono: 'humedad', clave: 'agenda.ciclo.sint.acne', es: 'Acné' },
  { id: 'irritable', emoji: '😤', icono: 'animo-enojado', clave: 'agenda.ciclo.sint.irritable', es: 'Irritabilidad' },
]

export const getSintoma = (id: string): DefSintoma | undefined => SINTOMAS_CICLO.find((s) => s.id === id)

/** Intensidades del sangrado, de menos a más. */
export const NIVELES_SANGRADO = [
  { valor: 1, clave: 'agenda.ciclo.leve', es: 'Ligero', color: '#fca5a5' },
  { valor: 2, clave: 'agenda.ciclo.medio', es: 'Medio', color: '#ef4444' },
  { valor: 3, clave: 'agenda.ciclo.abundante', es: 'Abundante', color: '#b91c1c' },
] as const

/**
 * Fechas en que ARRANCA cada periodo, de la más vieja a la más nueva.
 *
 * Un día con sangrado que viene justo detrás de otro es continuación, no un
 * periodo nuevo; se admite un hueco de un día para no partir un periodo por
 * haber olvidado marcarlo.
 */
export function iniciosDePeriodo(dias: DiaCiclo[]): string[] {
  const conSangre = dias
    .filter((d) => d.sangrado > 0)
    .map((d) => d.fecha)
    .sort()
  const inicios: string[] = []
  let previa: string | null = null
  for (const fecha of conSangre) {
    const hueco = previa ? Math.round((deIso(fecha).getTime() - deIso(previa).getTime()) / DIA_MS) : Infinity
    if (hueco > 2) inicios.push(fecha)
    previa = fecha
  }
  return inicios
}

export interface Prediccion {
  /** Duración media medida; null si aún no hay dos periodos que comparar. */
  mediaMedida: number | null
  /** Ciclos completos con los que se calculó. */
  ciclos: number
  /** Duración usada al final (la medida, o la de ajustes si no hay datos). */
  duracion: number
  /** yyyy-mm-dd estimado del próximo periodo; null sin ningún registro. */
  proximo: string | null
  /** Ventana fértil estimada [desde, hasta]; null sin ningún registro. */
  fertil: [string, string] | null
  /** Día del ciclo en que estás hoy (1 = primer día del periodo); null sin datos. */
  diaActual: number | null
}

/**
 * Próximo periodo y ventana fértil.
 *
 * La ventana fértil se cuenta hacia atrás desde el próximo periodo: la fase lútea
 * dura ~14 días y es la parte estable del ciclo, así que estimarla así aguanta
 * mejor los ciclos irregulares que contar hacia adelante desde el último.
 */
export function predecir(
  dias: DiaCiclo[],
  duracionAjuste: number,
  hoy = fechaLocalISO(),
): Prediccion {
  const inicios = iniciosDePeriodo(dias)
  const ultimo = inicios[inicios.length - 1] ?? null

  const largos: number[] = []
  for (let i = 1; i < inicios.length; i++) {
    const d = Math.round((deIso(inicios[i]).getTime() - deIso(inicios[i - 1]).getTime()) / DIA_MS)
    // Fuera lo que no puede ser un ciclo: registros sueltos o mal marcados.
    if (d >= 15 && d <= 60) largos.push(d)
  }
  // Solo los seis últimos: un ciclo raro de hace dos años no debe pesar hoy.
  const recientes = largos.slice(-6)
  const mediaMedida = recientes.length
    ? Math.round(recientes.reduce((a, b) => a + b, 0) / recientes.length)
    : null
  const duracion = mediaMedida ?? duracionAjuste

  if (!ultimo) {
    return { mediaMedida, ciclos: recientes.length, duracion, proximo: null, fertil: null, diaActual: null }
  }

  // Si ya pasó de largo (periodo sin registrar), se adelanta al siguiente.
  let proximo = isoMasDias(ultimo, duracion)
  while (proximo < hoy) proximo = isoMasDias(proximo, duracion)

  const ovulacion = isoMasDias(proximo, -14)
  const transcurridos = Math.round((deIso(hoy).getTime() - deIso(ultimo).getTime()) / DIA_MS)

  return {
    mediaMedida,
    ciclos: recientes.length,
    duracion,
    proximo,
    fertil: [isoMasDias(ovulacion, -5), isoMasDias(ovulacion, 1)],
    diaActual: transcurridos >= 0 ? (transcurridos % duracion) + 1 : null,
  }
}

/** Días que duró cada periodo registrado, del más nuevo al más viejo. */
export function duracionesPeriodo(dias: DiaCiclo[]): { inicio: string; dias: number }[] {
  const conSangre = new Set(dias.filter((d) => d.sangrado > 0).map((d) => d.fecha))
  return iniciosDePeriodo(dias)
    .map((inicio) => {
      let n = 0
      // Mismo criterio que `iniciosDePeriodo`: un hueco de un día no lo corta.
      for (let i = 0; i < 15; i++) {
        const f = isoMasDias(inicio, i)
        if (conSangre.has(f)) n = i + 1
        else if (i - n > 1) break
      }
      return { inicio, dias: n }
    })
    .reverse()
}

/** «Día 12 del ciclo», «Faltan 3 días»… en palabras. */
export function textoFase(p: Prediccion, t: TFunc, hoy = fechaLocalISO()): string {
  if (!p.proximo) return t('agenda.ciclo.sinDatos', 'Marca tu primer día de periodo para empezar')
  const faltan = Math.round((deIso(p.proximo).getTime() - deIso(hoy).getTime()) / DIA_MS)
  if (faltan === 0) return t('agenda.ciclo.hoyToca', 'Se estima que empieza hoy')
  return t('agenda.ciclo.faltan', 'Faltan {n} días (estimado)', { n: faltan })
}
