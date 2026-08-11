/**
 * La semana fija de Pep@: el ÚNICO sitio que decide A QUÉ HORA pasa cada cosa
 * en la casa demo.
 *
 * Existe porque el calendario junta bloques de tres orígenes distintos —los
 * hábitos del año (`anioCalendario`), la proyección de la agenda y la del
 * garaje— y ninguno veía a los otros: la agenda repartía sus citas entre cuatro
 * horas fijas al azar, así que media docena caían dentro del turno de la
 * cafetería, y los trámites del coche entraban todos a las 09:00 pasara lo que
 * pasara. Un día del demo enseñaba tres bloques encimados que ninguna persona
 * podría vivir a la vez.
 *
 * Dos piezas:
 *  - `SEMANA_PEP`: los bloques inamovibles (dormir, turno, clases, estudio…),
 *    de donde `anioCalendario` saca las horas de sus rutinas.
 *  - `crearPlanificador()`: reserva huecos LIBRES para lo que sí se puede mover
 *    (citas, cafés, trámites), llevando la cuenta de lo ya colocado ese día.
 *
 * Regla de la casa: si un builder pone un bloque con hora, la pide aquí.
 */
import { deIso } from '../core/fechaLocal'
import { aHHMM, aMin } from '../core/metas'

/** Un tramo del día en minutos desde medianoche; `fin` puede pasar de 1440. */
interface Franja {
  ini: number
  fin: number
}

export interface BloqueFijo {
  clave: string
  hora: string
  horaFin: string
  /** Días de la semana que ocupa (0=domingo … 6=sábado); vacío = todos. */
  dias: number[]
}

/**
 * La semana de un barista que además estudia física. El orden importa: es el
 * día de Pep@ leído de arriba abajo.
 *
 * Las dos horas que mandan sobre el resto son el despertar (07:00, lo fija el
 * perfil de Descanso) y el turno de la cafetería; todo lo demás se acomodó
 * alrededor. Antes el turno empezaba a las 07:00 —a la misma hora a la que se
 * levantaba— y la carrera de las 06:30 caía dentro del sueño.
 */
export const SEMANA_PEP: BloqueFijo[] = [
  // El sueño va primero porque cruza medianoche y ocupa las dos puntas del día.
  { clave: 'sueno', hora: '23:30', horaFin: '07:00', dias: [] },
  { clave: 'meditar', hora: '07:15', horaFin: '07:30', dias: [1, 3, 5] },
  { clave: 'correr', hora: '07:10', horaFin: '08:10', dias: [2, 4, 6] },
  { clave: 'turno', hora: '08:00', horaFin: '14:00', dias: [1, 3, 5] },
  { clave: 'clases', hora: '16:00', horaFin: '19:00', dias: [2, 4] },
  { clave: 'estudiar', hora: '19:30', horaFin: '20:30', dias: [1, 2, 3, 4] },
  { clave: 'piano', hora: '20:45', horaFin: '21:05', dias: [] },
  { clave: 'idioma', hora: '21:15', horaFin: '21:30', dias: [] },
  { clave: 'pantallas', hora: '23:10', horaFin: '23:30', dias: [] },
]

/** El bloque fijo de esa clave (revienta en desarrollo si se escribe mal). */
export function bloqueFijo(clave: string): BloqueFijo {
  const b = SEMANA_PEP.find((x) => x.clave === clave)
  if (!b) throw new Error(`[MPH demo] Bloque fijo desconocido: ${clave}`)
  return b
}

/** ¿Ese bloque ocupa ese día de la semana? Sin días declarados, todos. */
const tocaDia = (b: BloqueFijo, diaSemana: number) => b.dias.length === 0 || b.dias.includes(diaSemana)

/**
 * Lo que ya ocupa ese día, en minutos. Un bloque que cruza medianoche se parte
 * en dos: la cola del anterior (00:00→fin) y su arranque (ini→24:00). Sin
 * partirlo, dormir de 23:30 a 07:00 se leería como "ocupado todo el día".
 */
function fijasDelDia(iso: string): Franja[] {
  const diaSemana = deIso(iso).getDay()
  const ayer = (diaSemana + 6) % 7
  const franjas: Franja[] = []
  for (const b of SEMANA_PEP) {
    const ini = aMin(b.hora)
    const fin = aMin(b.horaFin)
    const cruza = fin <= ini
    if (tocaDia(b, diaSemana)) franjas.push({ ini, fin: cruza ? 1440 : fin })
    // La cola de lo que empezó ayer y sigue ocupando esta madrugada.
    if (cruza && tocaDia(b, ayer)) franjas.push({ ini: 0, fin })
  }
  return franjas
}

const chocan = (a: Franja, b: Franja) => a.ini < b.fin && b.ini < a.fin

/** Horas a las que se intenta colocar algo cuando quien llama no pide ninguna. */
const PREFERIDAS_POR_DEFECTO = ['10:00', '15:00', '17:00', '19:00', '21:30', '11:30']

/** Primer minuto del día en el que Pep@ está despierto (no se agenda antes). */
const DESPIERTA = aMin('07:00')
/** Después de esto ya no se agenda nada: la casa se apaga. */
const SE_APAGA = aMin('23:10')

export interface PlanificadorDemo {
  /**
   * Reserva `duracionMin` ese día y devuelve la hora de inicio ('HH:MM'):
   * prueba las horas `preferidas` en orden y, si ninguna cabe, el primer hueco
   * libre de la jornada. Devuelve null solo si el día está lleno de verdad.
   */
  reservar(iso: string, duracionMin: number, preferidas?: string[]): string | null
  /**
   * Una hora que quepa en TODOS esos días, y la reserva en cada uno. Es para lo
   * que se pinta más de una vez a la misma hora: un trámite y su aviso previo.
   */
  reservarEnVarios(isos: string[], duracionMin: number, preferidas?: string[]): string | null
  /** Marca un tramo como ocupado sin buscar hueco (lo que ya tenía hora fija). */
  ocupar(iso: string, hora: string, duracionMin: number): void
  /** Igual, pero TODOS los días: lo que se repite a diario (una toma, un aviso). */
  ocuparSiempre(hora: string, duracionMin: number): void
}

/**
 * Un planificador con memoria: además de los bloques fijos de la semana, lleva
 * la cuenta de lo que él mismo ya colocó, para que dos citas del mismo día
 * tampoco se pisen entre ellas.
 *
 * Es por builder, no global: cada app construye su año por separado (carga
 * perezosa), así que compartir estado entre ellas sería mentira. Basta con que
 * cada uno respete lo fijo, que es lo que llena el calendario de verdad.
 */
export function crearPlanificador(): PlanificadorDemo {
  const puestas = new Map<string, Franja[]>()
  const diarias: Franja[] = []

  const ocupadas = (iso: string): Franja[] => [
    ...fijasDelDia(iso),
    ...diarias,
    ...(puestas.get(iso) ?? []),
  ]

  const apuntar = (iso: string, franja: Franja) => {
    puestas.set(iso, [...(puestas.get(iso) ?? []), franja])
  }

  const cabe = (iso: string, ini: number, duracionMin: number): boolean => {
    if (ini < DESPIERTA || ini + duracionMin > SE_APAGA) return false
    const nueva = { ini, fin: ini + duracionMin }
    return !ocupadas(iso).some((f) => chocan(f, nueva))
  }

  return {
    reservar(iso, duracionMin, preferidas = PREFERIDAS_POR_DEFECTO) {
      for (const hora of preferidas) {
        const ini = aMin(hora)
        if (cabe(iso, ini, duracionMin)) {
          apuntar(iso, { ini, fin: ini + duracionMin })
          return hora
        }
      }
      // Barrido de cuarto en cuarto de hora: cualquier hueco es mejor que
      // encimar el bloque sobre otro.
      for (let ini = DESPIERTA; ini + duracionMin <= SE_APAGA; ini += 15) {
        if (!cabe(iso, ini, duracionMin)) continue
        apuntar(iso, { ini, fin: ini + duracionMin })
        return aHHMM(ini)
      }
      return null
    },
    reservarEnVarios(isos, duracionMin, preferidas = PREFERIDAS_POR_DEFECTO) {
      const candidatas = [
        ...preferidas.map(aMin),
        // El mismo barrido que `reservar`, por si ninguna preferida cabe en todos.
        ...Array.from({ length: Math.floor((SE_APAGA - DESPIERTA) / 15) }, (_, i) => DESPIERTA + i * 15),
      ]
      for (const ini of candidatas) {
        if (!isos.every((iso) => cabe(iso, ini, duracionMin))) continue
        for (const iso of isos) apuntar(iso, { ini, fin: ini + duracionMin })
        return aHHMM(ini)
      }
      return null
    },
    ocupar(iso, hora, duracionMin) {
      const ini = aMin(hora)
      apuntar(iso, { ini, fin: ini + duracionMin })
    },
    ocuparSiempre(hora, duracionMin) {
      const ini = aMin(hora)
      diarias.push({ ini, fin: ini + duracionMin })
    },
  }
}
