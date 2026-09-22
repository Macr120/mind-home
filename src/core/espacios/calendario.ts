import { db, type Rutina, type RepeticionRutina, type EntradaOutbox } from '../data/db'
import { conectarAvisoEscrituraEspacio, marcarEscrituraSilenciosa } from '../data/sync/middleware'
import { useCalendarioFiltro } from '../state/calendarioFiltroStore'
import { useRutinasUI } from '../state/rutinasUiStore'
import * as api from './api'
import { useEspacios } from './cache'
import { refrescarEspacios } from './conectar'
import { registrarAterrizaje } from './enlaces'
import { useEspaciosStore } from './espaciosStore'
import { espacioAbierto, type EspacioAbierto } from './motor'
import { PREFIJO_CAL, type CambioEspacio, type Espacio, type RolEspacio } from './tipos'

/**
 * El tipo «calendario» del espacio compartido: la unidad que viaja es una FILA
 * de `rutinas` con `calendarioId`, no una proyección aparte — así la rejilla,
 * los gestos, las Misiones y los avisos siguen funcionando sin enterarse.
 *
 * La cola de salida es el propio `_outbox` del sync personal (el middleware
 * marca `espacio` en las filas compartidas y el push personal las salta): aquí
 * solo se drena hacia el log del espacio. La entrada es `alCambio('evento')`,
 * que escribe en Dexie con `marcarEscrituraSilenciosa` para no hacer eco.
 *
 * Resolución de conflictos: LWW por `updatedAt`, la misma del sync personal. El
 * log devuelve TAMBIÉN los cambios propios, así que todo lo de aquí tiene que
 * ser idempotente: un `evento` con el `updatedAt` que ya tiene la fila local no
 * hace nada, y un `borrado` de una fila que ya no está tampoco.
 *
 * Este módulo y `cache.ts` son los únicos de `espacios/` que tocan `db`.
 */

/** Fila de `rutinas` con la identidad de sync que sella el middleware. */
type FilaRutina = Rutina & { uid?: string; updatedAt?: number }

/**
 * Campos de `Rutina` que viajan (lista blanca). Fuera quedan: `id` (local),
 * `pasos` (viaja siempre vacío: sus `roomId` apuntan a cuartos de OTRA casa),
 * `plantillaId`/`actividadId`/`seccion`/`ambitoId`/`enlaceApp` (apps que el
 * receptor puede no tener), todo lo de metas (`deMetaId`, `esMeta`, `padreId`,
 * `ritmo`, `objetivosDia`, `categoriaMeta`, `completada`, `pasosHechos`,
 * `alcance`, `orden`, `prioridad`), `origen`, `suelta` y `ejemploDe`.
 *
 * Las palomitas (`ejecucionesRutina`) son PERSONALES y no viajan: que tu pareja
 * marque «hecho» no marca el tuyo.
 */
export const CAMPOS_EVENTO = [
  'uid',
  'nombre',
  'emoji',
  'hora',
  'horaFin',
  'dias',
  'repeticion',
  'fechaInicio',
  'fechaFin',
  'excepciones',
  'color',
  'activa',
  'creadoEn',
  'avisar',
  'nota',
  'autorAlias',
  'updatedAt',
] as const

const COLOR_POR_DEFECTO = '#94a3b8'

/** Cuánto se espera a que el espacio recién abierto sepa su rol para drenar. */
const REINTENTO_DRENAR_MS = 3000

// ─── salida: del `_outbox` al log del espacio ────────────────────────────────

/** Solo los campos de la lista blanca (y `pasos` vacío) salen del dispositivo. */
function proyectar(fila: FilaRutina): Record<string, unknown> {
  const origen = fila as unknown as Record<string, unknown>
  const datos: Record<string, unknown> = { pasos: [] }
  for (const campo of CAMPOS_EVENTO) {
    const v = origen[campo]
    if (v !== undefined) datos[campo] = v
  }
  return datos
}

const idsDe = (entradas: EntradaOutbox[]): number[] =>
  entradas.map((e) => e.id).filter((id): id is number => id != null)

const enLaLista = (espacioId: string) =>
  useEspaciosStore.getState().lista.some((e) => e.espacioId === espacioId)

/** Drenados en curso: el aviso del middleware y la apertura pueden coincidir. */
const drenando = new Set<string>()
const reintentos = new Map<string, ReturnType<typeof setTimeout>>()

function reintentarDrenar(espacioId: string): void {
  if (reintentos.has(espacioId)) return
  reintentos.set(
    espacioId,
    setTimeout(() => {
      reintentos.delete(espacioId)
      void drenar(espacioId)
    }, REINTENTO_DRENAR_MS),
  )
}

/**
 * Manda al log del espacio lo que la casa escribió en sus filas. Como el motor
 * reintenta por su cuenta y el `uid` del cambio es idempotente, las entradas se
 * borran de la cola en cuanto quedan encoladas.
 */
export async function drenar(espacioId: string): Promise<void> {
  if (drenando.has(espacioId)) return
  drenando.add(espacioId)
  try {
    const entradas = await db._outbox.where('espacio').equals(espacioId).toArray()
    if (!entradas.length) return
    const esp = espacioAbierto(espacioId)
    // Sin abrir no hay a dónde mandarlas: `engancharCalendario` drena al abrirlo.
    if (!esp) return
    if (!esp.estado()) {
      // Acaba de abrirse y aún no sabe ni su rol: se vuelve a intentar.
      reintentarDrenar(espacioId)
      return
    }
    if (!esp.puedeEditar()) {
      // Soy lector. Solo si el espacio ya ni existe se tira lo encolado.
      if (!enLaLista(espacioId)) await db._outbox.bulkDelete(idsDe(entradas))
      return
    }

    // Última operación por fila: la cola guarda una entrada por escritura.
    const ultima = new Map<string, EntradaOutbox>()
    for (const e of entradas) ultima.set(e.uid, e)
    for (const e of ultima.values()) {
      const fila = (await db.rutinas.where('uid').equals(e.uid).first()) as FilaRutina | undefined
      if (e.op === 'delete' || !fila) {
        esp.publicar('evento', { uid: e.uid, borrado: true, updatedAt: Date.now() }, `${e.uid}:b`)
      } else {
        esp.publicar('evento', proyectar(fila), `${e.uid}:${fila.updatedAt ?? 0}`)
      }
    }
    await db._outbox.bulkDelete(idsDe(entradas))
  } finally {
    drenando.delete(espacioId)
  }
}

// ─── entrada: del log del espacio a Dexie ────────────────────────────────────

const REPETICIONES = new Set<RepeticionRutina>([
  'una_vez',
  'semanal',
  'indefinido',
  'personalizado',
  'mensual',
  'anual',
  'rango',
])

interface EventoRemoto {
  uid: string
  updatedAt: number
  borrado: boolean
  campos: Partial<Rutina>
}

const texto = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' ? v.slice(0, max) : undefined

/**
 * Lo que llega lo escribió OTRA persona: se lee campo a campo y se descarta
 * todo lo que no encaje, como el protocolo de partida. Nada de `Object.assign`
 * con lo que venga: una fila con `esMeta` o `plantillaId` inventados se colaría
 * en las Metas o en el cronograma de una app ajena.
 */
function leerEvento(bruto: unknown): EventoRemoto | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const o = bruto as Record<string, unknown>
  if (typeof o.uid !== 'string' || !o.uid || o.uid.length > 64) return null
  if (typeof o.updatedAt !== 'number' || !Number.isFinite(o.updatedAt)) return null
  const borrado = o.borrado === true
  const campos: Partial<Rutina> = {}
  if (!borrado) {
    const nombre = texto(o.nombre, 200)
    if (nombre !== undefined) campos.nombre = nombre
    const emoji = texto(o.emoji, 16)
    if (emoji !== undefined) campos.emoji = emoji
    const hora = texto(o.hora, 5)
    if (hora !== undefined) campos.hora = hora
    const horaFin = texto(o.horaFin, 5)
    if (horaFin !== undefined) campos.horaFin = horaFin
    if (Array.isArray(o.dias)) {
      campos.dias = o.dias.filter(
        (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6,
      )
    }
    if (typeof o.repeticion === 'string' && REPETICIONES.has(o.repeticion as RepeticionRutina)) {
      campos.repeticion = o.repeticion as RepeticionRutina
    }
    const fechaInicio = texto(o.fechaInicio, 10)
    if (fechaInicio !== undefined) campos.fechaInicio = fechaInicio
    const fechaFin = texto(o.fechaFin, 10)
    if (fechaFin !== undefined) campos.fechaFin = fechaFin
    if (Array.isArray(o.excepciones)) {
      campos.excepciones = o.excepciones
        .filter((f): f is string => typeof f === 'string')
        .slice(0, 400)
        .map((f) => f.slice(0, 10))
    }
    const color = texto(o.color, 32)
    if (color !== undefined) campos.color = color
    if (typeof o.activa === 'boolean') campos.activa = o.activa
    const creadoEn = texto(o.creadoEn, 40)
    if (creadoEn !== undefined) campos.creadoEn = creadoEn
    if (typeof o.avisar === 'boolean') campos.avisar = o.avisar
    const nota = texto(o.nota, 2000)
    if (nota !== undefined) campos.nota = nota
    const autorAlias = texto(o.autorAlias, 20)
    if (autorAlias !== undefined) campos.autorAlias = autorAlias
  }
  return { uid: o.uid, updatedAt: o.updatedAt, borrado, campos }
}

/** Lo mínimo para que una fila nueva sea una `Rutina` válida. */
const EVENTO_VACIO = {
  nombre: '',
  emoji: '📅',
  dias: [] as number[],
  activa: true,
}

/**
 * Aplica un `evento` del log. Idempotente a propósito: el log devuelve también
 * lo propio, así que un cambio cuyo `updatedAt` ya está en la fila local no
 * toca nada (ni reencola, porque la transacción va silenciosa).
 */
export async function aplicarEvento(espacioId: string, c: CambioEspacio): Promise<void> {
  const ev = leerEvento(c.datos)
  if (!ev) return
  await db.transaction('rw', db.rutinas, db.ejecucionesRutina, db._outbox, async () => {
    marcarEscrituraSilenciosa()
    const local = (await db.rutinas.where('uid').equals(ev.uid).first()) as FilaRutina | undefined
    // Misma identidad pero fila PROPIA (o de otro calendario): no se toca. Sin
    // esto, un uid repetido por casualidad secuestraría un evento personal.
    if (local && local.calendarioId !== espacioId) return
    if (ev.borrado) {
      if (local?.id == null) return
      const ejec = await db.ejecucionesRutina.where('rutinaId').equals(local.id).primaryKeys()
      if (ejec.length) await db.ejecucionesRutina.bulkDelete(ejec)
      await db.rutinas.delete(local.id)
      return
    }
    if (local && (local.updatedAt ?? 0) >= ev.updatedAt) return
    const fila = {
      ...EVENTO_VACIO,
      creadoEn: new Date().toISOString(),
      ...(local ?? {}),
      ...ev.campos,
      calendarioId: espacioId,
      pasos: [],
      uid: ev.uid,
      updatedAt: ev.updatedAt,
    } as FilaRutina
    await db.rutinas.put(fila)
  })
}

/**
 * Salí, me expulsaron o lo borraron: las filas de ese calendario se van del
 * dispositivo. La caché `_espacios` y el cursor ya los borró `motor.ts`.
 */
export async function limpiarCalendarioLocal(espacioId: string): Promise<void> {
  await db.transaction('rw', db.rutinas, db.ejecucionesRutina, db._outbox, async () => {
    marcarEscrituraSilenciosa()
    const filas = await db.rutinas.where('calendarioId').equals(espacioId).toArray()
    const ids = filas.map((f) => f.id).filter((id): id is number => id != null)
    if (ids.length) {
      const ejec = await db.ejecucionesRutina.where('rutinaId').anyOf(ids).primaryKeys()
      if (ejec.length) await db.ejecucionesRutina.bulkDelete(ejec)
      await db.rutinas.bulkDelete(ids)
    }
    const cola = await db._outbox.where('espacio').equals(espacioId).primaryKeys()
    if (cola.length) await db._outbox.bulkDelete(cola)
  })
  const { apps, alternar } = useCalendarioFiltro.getState()
  const clave = PREFIJO_CAL + espacioId
  if (apps.has(clave)) alternar(clave)
}

// ─── enganche y ciclo de vida ────────────────────────────────────────────────

/**
 * Le pone al espacio recién abierto las dos mitades del calendario. Lo llama
 * `conectar.ts::sincronizarFondo` justo después de abrirlo.
 */
export function engancharCalendario(esp: EspacioAbierto): void {
  esp.alCambio('evento', (c) => {
    // Un fallo de Dexie aquí solo pierde ESE evento: el cursor ya avanzó. No
    // hay dónde reintentarlo, así que no se deja como promesa sin dueño.
    void aplicarEvento(esp.espacioId, c).catch(() => undefined)
  })
  esp.on('borrado', () => void limpiarCalendarioLocal(esp.espacioId).catch(() => undefined))
  void drenar(esp.espacioId)
}

/** Crea un calendario compartido y lo deja abierto en segundo plano. */
export async function crearCalendario(titulo: string, color: string): Promise<Espacio> {
  const espacio = await api.crear('calendario', titulo, { color })
  // Refrescar la lista es lo que lo abre y lo engancha (`sincronizarFondo`).
  await refrescarEspacios()
  return espacio
}

// ─── lo que necesita la UI ───────────────────────────────────────────────────

/** El color que el dueño le puso al calendario (`meta.color`). */
export function colorDeEspacio(meta: Record<string, unknown>): string {
  const c = meta.color
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : COLOR_POR_DEFECTO
}

/** El calendario compartido al que pertenece el evento, o null si es propio. */
export function calendarioDe(r: Rutina): Espacio | null {
  if (!r.calendarioId) return null
  return useEspaciosStore.getState().lista.find((e) => e.espacioId === r.calendarioId) ?? null
}

const puedeEditarRol = (rol: RolEspacio | undefined) => rol === 'dueno' || rol === 'editor'

/**
 * ¿Puedo tocar esta fila? Sin calendario compartido, siempre. Con él manda mi
 * rol, y un calendario que ya no esté en la lista se trata como de solo lectura
 * (mientras la lista no haya llegado, mejor no dejar mover nada).
 */
export function puedeEditarRutina(r: Rutina): boolean {
  if (!r.calendarioId) return true
  return puedeEditarRol(calendarioDe(r)?.rol)
}

/** Lo mismo, pero repintando cuando cambia mi rol (para botones y menús). */
export function usePuedeEditarRutina(r: Rutina): boolean {
  return useEspaciosStore((s) =>
    !r.calendarioId
      ? true
      : puedeEditarRol(s.lista.find((e) => e.espacioId === r.calendarioId)?.rol),
  )
}

/** Un calendario compartido tal como lo pintan el filtro, el editor y el panel. */
export interface CalendarioCompartido {
  id: string
  titulo: string
  color: string
  rol: RolEspacio
  nMiembros: number
}

export function useCalendariosCompartidos(): CalendarioCompartido[] {
  const espacios = useEspacios('calendario')
  return (espacios ?? []).map((e) => ({
    id: e.espacioId,
    titulo: e.titulo,
    color: colorDeEspacio(e.meta),
    rol: e.rol,
    nMiembros: e.nMiembros,
  }))
}

/** Aterrizaje del enlace: abrir el calendario y dejar ver lo que acaban de compartir. */
function aterrizarCalendario(e: Espacio): void {
  useRutinasUI.getState().abrirCalendario()
  const { apps, alternar } = useCalendarioFiltro.getState()
  const clave = PREFIJO_CAL + e.espacioId
  // Con el filtro en «todas» no hay nada que encender; con apps marcadas, sí.
  if (apps.size > 0 && !apps.has(clave)) alternar(clave)
}

/**
 * Arranca el tipo «calendario». Lo llama `conectarEspacios()` y no el cuerpo
 * del módulo a propósito: `enlaces.ts` entra en el ciclo de importación por dos
 * caminos (`PanelCompartir` y `conectar.ts`), y registrarse al evaluarse pillaba
 * su mapa de aterrizajes todavía sin inicializar.
 */
export function conectarCalendario(): void {
  conectarAvisoEscrituraEspacio((id) => void drenar(id))
  registrarAterrizaje('calendario', aterrizarCalendario)
}
