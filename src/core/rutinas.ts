import { localeActual } from './i18n/useT'
import { db, type Rutina, type EjecucionRutina, type RepeticionRutina } from './data/db'
import { perfilSuenoRepo, rutinasRepo } from './data/repository'
import { getPlantilla } from './appContrato'
import { fechaLocalISO } from './fechaLocal'
import { ajustarBloquesDe, esMeta } from './metas'

/** Etiquetas cortas de los días (índice = getDay(): 0=domingo). */
export const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

/** Modo de repetición efectivo (rutinas antiguas sin campo o legacy `personalizado`). */
function repeticionDe(r: Rutina): RepeticionRutina {
  if (r.repeticion === 'personalizado') return 'semanal'
  if (r.repeticion) return r.repeticion
  return r.dias.length === 0 ? 'indefinido' : 'semanal'
}

/** Día de la semana 0–6 a partir de yyyy-mm-dd. */
function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Días de la semana en los que aplica la serie (semanal/personalizado/indefinido). */
function diasEfectivos(r: Rutina): number[] {
  if (r.dias.length > 0) return r.dias
  const rep = repeticionDe(r)
  if (rep === 'semanal' && r.fechaInicio) return [diaSemanaDe(r.fechaInicio)]
  return []
}

/** Texto legible de la repetición (listas, detalle). */
export function textoRepeticion(r: Rutina): string {
  const rep = repeticionDe(r)
  if (rep === 'una_vez') {
    const f = r.fechaInicio ?? r.creadoEn.slice(0, 10)
    return new Date(f + 'T12:00').toLocaleDateString(localeActual(), { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (rep === 'rango') {
    const corta = (iso: string) =>
      new Date(iso + 'T12:00').toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })
    if (r.fechaInicio && r.fechaFin) return `del ${corta(r.fechaInicio)} al ${corta(r.fechaFin)}`
    return r.fechaInicio ? corta(r.fechaInicio) : 'sin fechas'
  }
  if (rep === 'mensual') {
    const dia = r.fechaInicio ? Number(r.fechaInicio.slice(8, 10)) : null
    return dia ? `cada mes (día ${dia})` : 'cada mes'
  }
  if (rep === 'anual') {
    const f = r.fechaInicio
    const fechaTxt = f
      ? new Date(f + 'T12:00').toLocaleDateString(localeActual(), { day: 'numeric', month: 'long' })
      : ''
    return fechaTxt ? `cada año (${fechaTxt})` : 'cada año'
  }
  const dias = diasEfectivos(r)
  const diasTxt =
    dias.length === 0
      ? 'todos los días'
      : dias.map((d) => DIAS_SEMANA[d]).join(' ')
  if (rep === 'semanal') {
    const fin = r.fechaFin
      ? ` hasta ${new Date(r.fechaFin + 'T12:00').toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}`
      : ''
    return `cada semana (${diasTxt})${fin}`
  }
  return `indefinidamente (${diasTxt})`
}

/**
 * Rutinas orquestadas: lógica de "qué toca hoy", completar pasos y
 * recordatorios. La pieza orquestadora: un paso completado puede registrar
 * automáticamente en su cuarto vía el esquema de captura (`esquemaId` +
 * `valores`), así un hábito multi-cuarto se documenta solo.
 */

export function hoyISO(): string {
  return fechaLocalISO()
}

/** Fecha local yyyy-mm-dd de un Date (sin saltos por zona horaria). */
export function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ¿Es una serie que se repite (frente a un evento suelto)? */
export const esSerie = (r: Rutina): boolean => repeticionDe(r) !== 'una_vez'

// ----- Agenda de una actividad concreta de una app -----

/** Familias de actividad agendable (el prefijo de `actividadId`). */
export type TipoActividad =
  | 'fuerza'
  | 'resistencia'
  | 'flexibilidad'
  | 'momento'
  | 'hobby'
  | 'idioma'
  | 'jardin'
  | 'biblioteca'

/**
 * Llave estable actividad↔Rutina. El prefijo no es decorativo: sin él `hobby:3` y
 * `fuerza:3` serían la misma llave.
 */
export const actividadId = (tipo: TipoActividad, id: string | number): string => `${tipo}:${id}`

/** La fila que agenda esa actividad (solo hay una). */
export const buscarAgenda = (rutinas: Rutina[] | undefined, id: string): Rutina | undefined =>
  rutinas?.find((r) => r.actividadId === id)

/**
 * ¿La rutina corresponde a esa fecha, IGNORANDO si está pausada ahora mismo?
 *
 * Es la pregunta que necesita el histórico: `activa` es un estado del presente
 * («¿la sigo haciendo?»), no del pasado. `tocaFecha` corta con ella antes que
 * nada, así que al pausar un hábito su pasado cumplido desaparecía de las
 * métricas de cumplimiento. Aquí el recorte del pasado lo hace `fechaFin`, que
 * la pausa fija en el día en que se apagó (ver `cambioPausa` en RutinasPanel).
 */
export function tocaFechaHistorico(r: Rutina, d: Date): boolean {
  return tocaFecha(r.activa ? r : { ...r, activa: true }, d)
}

/** ¿La rutina corresponde a esa fecha? (para el presente: las pausadas no tocan) */
export function tocaFecha(r: Rutina, d: Date): boolean {
  if (!r.activa) return false
  // Rutina suelta: no aparece en ningún día.
  if (r.suelta) return false
  // Una meta sin fecha vive solo en la lista de Metas. Sin este corte caería en el
  // 'una_vez' de abajo, que a falta de `fechaInicio` usa `creadoEn`: la meta
  // aparecería en el calendario el día que se escribió, que no lo pidió nadie.
  if (esMeta(r) && !r.fechaInicio) return false
  const iso = fechaISO(d)
  // Ese día se editó por separado: lo cubre el evento suelto de la excepción.
  if (r.excepciones?.includes(iso)) return false
  const rep = repeticionDe(r)

  if (rep === 'una_vez') {
    const f = r.fechaInicio ?? r.creadoEn.slice(0, 10)
    return iso === f
  }

  if (r.fechaInicio && iso < r.fechaInicio) return false
  if (r.fechaFin && iso > r.fechaFin) return false

  // 'rango': los dos filtros de arriba ya la acotan a fechaInicio..fechaFin.
  if (rep === 'rango') return true

  if (rep === 'mensual') {
    if (!r.fechaInicio) return false
    return d.getDate() === Number(r.fechaInicio.slice(8, 10))
  }
  if (rep === 'anual') {
    if (!r.fechaInicio) return false
    return r.fechaInicio.slice(5, 10) === iso.slice(5, 10) // mismo "mm-dd"
  }

  const dias = diasEfectivos(r)
  if (dias.length === 0) return true
  return dias.includes(d.getDay())
}

/** ¿La rutina corresponde al día de hoy? */
export function tocaHoy(r: Rutina): boolean {
  return tocaFecha(r, new Date())
}

/**
 * Guarda el horario de una rutina movida/estirada en el calendario.
 * La rutina de sueño es un espejo del horario de Descanso, así que arrastrarla
 * mueve TAMBIÉN ese horario; si no, el espejo la regresaría a su sitio en la
 * siguiente sincronización y el arrastre se perdería.
 *
 * Con `soloEseDia` el cambio NO toca la serie: esa fecha pasa a `excepciones` y
 * el horario nuevo nace como evento suelto, como en cualquier calendario. El
 * suelto deja de ser espejo, así que editarlo no mueve el horario de siempre —
 * por eso pierde `origen` Y `actividadId`: si conservara la llave habría dos filas
 * con la misma y el control de la app editaría la copia de un martes creyendo que
 * edita la serie.
 */
export async function guardarHorarioRutina(
  r: Rutina,
  cambios: Partial<Rutina>,
  soloEseDia?: { origen: string; destino: string },
) {
  if (r.id == null) return
  if (soloEseDia) {
    await rutinasRepo.update(r.id, {
      excepciones: [...new Set([...(r.excepciones ?? []), soloEseDia.origen])],
    })
    const suelto = {
      ...r,
      ...cambios,
      dias: [],
      repeticion: 'una_vez' as const,
      fechaInicio: soloEseDia.destino,
      fechaFin: undefined,
      excepciones: undefined,
      origen: undefined,
      actividadId: undefined,
      creadoEn: new Date().toISOString(),
    }
    delete suelto.id // es una copia para ese día, no la misma fila
    await rutinasRepo.add(suelto)
    return
  }
  await rutinasRepo.update(r.id, cambios)
  if (r.origen !== 'sueno') return
  const horaDormir = cambios.hora ?? r.hora
  const horaDespertar = cambios.horaFin ?? r.horaFin
  if (!horaDormir || !horaDespertar) return
  const fila = (await perfilSuenoRepo.list())[0]
  if (fila?.id != null) await perfilSuenoRepo.update(fila.id, { horaDormir, horaDespertar })
}

/**
 * Marca/desmarca un paso de hoy. Al marcarlo, si el paso trae esquema +
 * valores, registra el dato real en el cuarto (la fecha es la de hoy).
 */
export async function togglePaso(rutina: Rutina, idx: number) {
  if (rutina.id == null) return
  const fecha = hoyISO()
  const ejec = await db.ejecucionesRutina
    .where('fecha')
    .equals(fecha)
    .and((e) => e.rutinaId === rutina.id)
    .first()

  const hechos = new Set(ejec?.pasosHechos ?? [])
  const marcar = !hechos.has(idx)
  if (marcar) hechos.add(idx)
  else hechos.delete(idx)

  if (ejec?.id != null) {
    await db.ejecucionesRutina.update(ejec.id, { pasosHechos: [...hechos] })
  } else {
    await db.ejecucionesRutina.add({ rutinaId: rutina.id, fecha, pasosHechos: [...hechos] })
  }

  // Auto-registro: solo al marcar (desmarcar no borra el dato ya escrito).
  const paso = rutina.pasos[idx]
  if (marcar && paso?.esquemaId && paso.valores) {
    await registrarEsquema(paso.roomId, paso.esquemaId, paso.valores, fecha)
  }
}

/**
 * Escribe un registro real en una app usando su esquema de captura: es lo que
 * convierte marcar un paso en «ya cené». Compartido con los objetivos del día
 * (`ObjetivoDia.registro`), que registran por el mismo camino.
 *
 * No lanza: el estado ya se escribió antes de llegar aquí, y perder el paso
 * palomeado porque el esquema falló sería peor que quedarse sin el dato.
 */
export async function registrarEsquema(
  plantillaId: string,
  esquemaId: string,
  valores: Record<string, unknown>,
  fecha: string,
): Promise<void> {
  const esquema = getPlantilla(plantillaId)?.esquemas?.find((e) => e.id === esquemaId)
  if (!esquema) return
  try {
    await esquema.guardar({ ...valores, fecha })
  } catch (err) {
    console.warn('[MPH] No se pudo registrar por esquema:', err)
  }
}

/**
 * Marca/desmarca una ocurrencia entera del calendario (la sección Metas), en
 * cualquier fecha — a diferencia de `togglePaso`, que solo aplica a hoy.
 */
export async function toggleHecho(rutina: Rutina, fecha: string) {
  if (rutina.id == null) return
  const ejec = await db.ejecucionesRutina
    .where('fecha')
    .equals(fecha)
    .and((e) => e.rutinaId === rutina.id)
    .first()
  if (ejec?.id != null) await db.ejecucionesRutina.update(ejec.id, { hecho: !ejec.hecho })
  else await db.ejecucionesRutina.add({ rutinaId: rutina.id, fecha, pasosHechos: [], hecho: true })
}

/**
 * FIJA el estado de una ocurrencia, en vez de voltearlo como `toggleHecho`. Lo
 * llama la meta diaria al cumplirse: con un toggle, cada registro nuevo del día
 * despalomearía lo que el anterior acababa de palomear.
 */
export async function marcarHecho(rutina: Rutina, fecha: string, hecho: boolean) {
  if (rutina.id == null) return
  const ejec = await db.ejecucionesRutina
    .where('fecha')
    .equals(fecha)
    .and((e) => e.rutinaId === rutina.id)
    .first()
  if (ejec?.id != null) {
    if (ejec.hecho !== hecho) await db.ejecucionesRutina.update(ejec.id, { hecho })
  } else if (hecho) {
    await db.ejecucionesRutina.add({ rutinaId: rutina.id, fecha, pasosHechos: [], hecho })
  }
}

/**
 * FIJA el estado de la actividad de hoy SIN registrar nada, al revés que
 * `togglePaso`: aquí el registro ya existe en la app (cenaste, entrenaste) y esto
 * solo lo refleja en el bloque. Es a `togglePaso` lo que `marcarHecho` es a
 * `toggleHecho`.
 *
 * Con paso se fija `pasosHechos` y no `hecho`, a propósito: `debeAvisar` mira los
 * pasos, así que el aviso de «Cena» sobrevive a que la meta de la app se cumpla
 * por otro lado (beber agua no es haber cenado).
 */
export async function marcarActividadHecha(rutina: Rutina, fecha: string, hecho: boolean) {
  if (rutina.id == null) return
  if (rutina.pasos.length === 0) {
    await marcarHecho(rutina, fecha, hecho)
    return
  }
  const ejec = await db.ejecucionesRutina
    .where('fecha')
    .equals(fecha)
    .and((e) => e.rutinaId === rutina.id)
    .first()
  const pasosHechos = hecho ? rutina.pasos.map((_, i) => i) : []
  if (ejec?.id != null) {
    if (ejec.pasosHechos.length !== pasosHechos.length) {
      await db.ejecucionesRutina.update(ejec.id, { pasosHechos })
    }
  } else if (hecho) {
    await db.ejecucionesRutina.add({ rutinaId: rutina.id, fecha, pasosHechos })
  }
}

/**
 * Registro de un toque desde el aviso: marca el paso 0, y con él se auto-registra
 * en el cuarto (ver `togglePaso`). Sale sin hacer nada si ya estaba marcado — el
 * botón puede llegar dos veces (banner + notificación).
 */
export async function registrarActividad(rutinaId: number) {
  const rutina = await db.rutinas.get(rutinaId)
  if (!rutina?.pasos.length) return
  const ejec = await db.ejecucionesRutina
    .where('fecha')
    .equals(hoyISO())
    .and((e) => e.rutinaId === rutinaId)
    .first()
  if (ejec?.pasosHechos.includes(0)) return
  await togglePaso(rutina, 0)
}

/**
 * Rango trazado sobre el calendario: del inicio del gesto a donde se soltó. En
 * Día/Semana trae además la hora (el eje vertical de la rejilla); en Mes/Año
 * solo días. Ya viene ordenado (trazar hacia la izquierda no lo invierte).
 */
export interface RangoTrazado {
  fechaInicio: string
  fechaFin: string
  hora?: string
  horaFin?: string
}

/**
 * Da a una meta el rango que se trazó encima del calendario: pasa a ocupar de
 * `fechaInicio` a `fechaFin`. Un solo día es un evento 'una_vez'; varios días son
 * un 'rango' (activa todo el periodo).
 *
 * Es el mismo destino que trazar sobre el eje del cronograma — la fecha es lo
 * único que decide si una meta ocupa sitio en el calendario. Lo hecho NO se toca:
 * una meta se cumple una vez, así que darle fecha no la des-palomea.
 */
export async function agendarMetaEnRango(rutina: Rutina, rango: RangoTrazado) {
  if (rutina.id == null) return
  const unSoloDia = rango.fechaInicio === rango.fechaFin
  const fechaFin = unSoloDia ? undefined : rango.fechaFin
  await rutinasRepo.update(rutina.id, {
    repeticion: unSoloDia ? 'una_vez' : 'rango',
    fechaInicio: rango.fechaInicio,
    fechaFin,
    hora: rango.hora,
    horaFin: rango.horaFin,
    dias: [],
  })
  // Lo que la meta pide cada semana se mueve con ella (igual que en `ponerPeriodo`).
  await ajustarBloquesDe(rutina.id, rango.fechaInicio, fechaFin)
}

/**
 * Estira un evento a un tramo de días consecutivos: se repite en cada uno
 * conservando su hora (sin hora, ocupa los días completos). Encogerlo a un solo
 * día lo devuelve a evento normal. Lo llaman las asas laterales del calendario.
 *
 * Estirar un evento semanal lo convierte en un tramo de días seguidos: el gesto
 * dice "que se repita estos días", que es otra cosa que "cada semana en tal día".
 */
export async function extenderRutinaARango(rutina: Rutina, isoA: string, isoB: string) {
  if (rutina.id == null) return
  // Los ISO se ordenan como texto: tirar hacia la izquierda no invierte el tramo.
  const [fechaInicio, fechaFin] = isoA <= isoB ? [isoA, isoB] : [isoB, isoA]
  const unSoloDia = fechaInicio === fechaFin
  await guardarHorarioRutina(rutina, {
    repeticion: unSoloDia ? 'una_vez' : 'rango',
    fechaInicio,
    fechaFin: unSoloDia ? undefined : fechaFin,
    dias: [], // 'rango' ignora `dias` en tocaFecha; dejarlo lleno confunde
  })
}

/** Pasos hechos hoy de una rutina (de la lista reactiva de ejecuciones). */
export function pasosHechosHoy(rutina: Rutina, ejecuciones: EjecucionRutina[] | undefined): Set<number> {
  const e = ejecuciones?.find((x) => x.rutinaId === rutina.id)
  return new Set(e?.pasosHechos ?? [])
}

/** ¿La rutina ya pasó de su hora y aún tiene pasos sin completar? */
export function estaPendiente(rutina: Rutina, ejecuciones: EjecucionRutina[] | undefined): boolean {
  if (rutina.pasos.length === 0) return false
  if (!tocaHoy(rutina) || !rutina.hora) return false
  const ahora = new Date()
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  if (horaActual < rutina.hora) return false
  return pasosHechosHoy(rutina, ejecuciones).size < rutina.pasos.length
}

/**
 * ¿Toca avisar de esta rutina hoy? Es lo que mira el reloj de avisos, y a
 * propósito NO es `estaPendiente`, que además de pintar el panel exige que la
 * rutina tenga pasos.
 *
 * Esa exigencia era el silenciador del bloque de sueño (nace sin pasos justo para
 * no anunciarse, ver rooms/descanso/rutinaSueno.ts). Pero "no tener pasos" nunca
 * quiso decir "no me avises": un evento normal a las 20:00 también merece aviso.
 * Así que el silencio ahora lo dice `avisar: false`, explícito, y una rutina sin
 * pasos se considera hecha cuando su ocurrencia está palomeada.
 */
export function debeAvisar(rutina: Rutina, ejecuciones: EjecucionRutina[] | undefined): boolean {
  if (rutina.avisar === false) return false
  if (!tocaHoy(rutina) || !rutina.hora) return false
  const ejec = ejecuciones?.find((e) => e.rutinaId === rutina.id)
  if (rutina.pasos.length === 0) return !ejec?.hecho
  return pasosHechosHoy(rutina, ejecuciones).size < rutina.pasos.length
}

// Los recordatorios viven en core/avisos.ts: son un reloj global montado en App,
// y no un `setInterval` dentro del panel de rutinas — que se desmontaba al entrar
// a cualquier cuarto y dejaba de avisar justo cuando la rutina tocaba.
