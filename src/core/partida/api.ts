/**
 * Llamadas de partida: RPCs `partida_*` (security definer con `auth.uid()`,
 * patrón `sync_push`) y el bucket privado `partida-casa`. Molde literal de
 * `core/buzon/api.ts`: el contrato de error del servidor es `{error:'<codigo>'}`
 * en el JSON (nunca `raise`) y aquí se convierte en `ErrorPartida` para que la
 * UI lo traduzca.
 *
 * Ningún uuid ajeno entra ni sale: se invita por `contacto_id` y se expulsa por
 * ranura (`j0`..`j3`).
 */
import { obtenerSupabase } from '../cuenta/supabase'
import type { TFunc } from '../i18n/useT'
import { useDiseño } from '../state/disenoStore'
import { podar } from './aspecto'
import { VERSION_PROTO } from './protocolo'
import {
  ErrorPartida,
  type AspectoRemoto,
  type CodigoErrorPartida,
  type EstadoJugador,
  type InvitacionRecibida,
  type JuegoPartida,
  type JugadorSala,
  type Ranura,
  type Sala,
} from './tipos'

const BUCKET = 'partida-casa'
const ARCHIVO = 'casa.json.gz'

/** Id de la última sala creada: sirve para borrar su plano del bucket (C2). */
const LS_ULTIMA = 'mh.partida.ultima'

const CODIGOS = new Set<CodigoErrorPartida>([
  'sin-sesion',
  'peticion-invalida',
  'aspecto-grande',
  'limite',
  'no-encontrado',
  'no-contacto',
  'sala-llena',
  'no-invitado',
  'expulsado',
  'version',
])

const codigoDe = (v: string): CodigoErrorPartida =>
  CODIGOS.has(v as CodigoErrorPartida) ? (v as CodigoErrorPartida) : 'servidor'

async function rpc<T>(nombre: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorPartida('sin-backend')
  const { data, error } = await sb.rpc(nombre, args)
  if (error) {
    // supabase-js envuelve el fallo de fetch en un PostgrestError sin código.
    if (!error.code || /fetch|network|conexi/i.test(error.message)) throw new ErrorPartida('red', error.message)
    if (error.code === 'PGRST301' || error.code === '401') throw new ErrorPartida('sin-sesion', error.message)
    throw new ErrorPartida('servidor', error.message)
  }
  const d = data as { error?: unknown } | null
  if (d && typeof d === 'object' && typeof d.error === 'string') throw new ErrorPartida(codigoDe(d.error))
  return data as T
}

// ─── del JSON del servidor a los tipos del cliente ───────────────────────────

interface FilaJugador {
  jugador_id: Ranura
  equipo: number
  estado: EstadoJugador
  anfitrion: boolean
  alias: string | null
  nombre: string | null
  emoji: string | null
  retrato: string | null
  aspecto: AspectoRemoto
}

interface FilaSala {
  partida_id: string
  jugador_id?: Ranura
  juego: JuegoPartida
  anfitrion?: boolean
  apps: string[]
  casa?: boolean
  proto: number
  rev: number
  jugadores?: FilaJugador[]
}

function aSala(d: FilaSala, miRanura: Ranura, soyAnfitrion: boolean): Sala {
  const jugadores: JugadorSala[] = (d.jugadores ?? []).map((j) => ({
    ranura: j.jugador_id,
    equipo: j.equipo,
    estado: j.estado,
    anfitrion: j.anfitrion,
    alias: j.alias,
    nombre: j.nombre ?? '',
    emoji: j.emoji ?? '🙂',
    retrato: j.retrato,
    aspecto: j.aspecto ?? {},
  }))
  return {
    partidaId: d.partida_id,
    juego: d.juego,
    soyAnfitrion,
    miRanura,
    apps: d.apps ?? [],
    casa: d.casa === true,
    proto: d.proto,
    rev: d.rev,
    jugadores: jugadores.sort((a, b) => a.ranura.localeCompare(b.ranura)),
  }
}

/**
 * El timbre del canal `buzon:<uid>` viene de la BD, pero pasa por el mismo
 * WebSocket que todo lo demás: se lee igual de defensivo que el protocolo.
 */
export function leerInvitacion(bruto: unknown): InvitacionRecibida | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const o = bruto as Record<string, unknown>
  const id = o.partida_id
  const juego = o.juego
  if (typeof id !== 'string' || id.length > 64) return null
  if (juego !== 'visita' && juego !== 'paintball' && juego !== 'futbol' && juego !== 'tenis' && juego !== 'basquet') {
    return null
  }
  const apps = Array.isArray(o.apps) ? o.apps.filter((a): a is string => typeof a === 'string').slice(0, 32) : []
  const retrato = typeof o.retrato === 'string' && o.retrato.length <= 65536 ? o.retrato : null
  return {
    partidaId: id,
    juego,
    proto: typeof o.proto === 'number' ? o.proto : VERSION_PROTO,
    apps,
    casa: o.casa === true,
    alias: typeof o.alias === 'string' ? o.alias.slice(0, 20) : null,
    nombre: typeof o.nombre === 'string' ? o.nombre.slice(0, 40) : '',
    emoji: typeof o.emoji === 'string' ? o.emoji.slice(0, 8) : '🙂',
    retrato,
  }
}

// ─── RPCs ────────────────────────────────────────────────────────────────────

export async function crearPartida(juego: JuegoPartida, apps: readonly string[]): Promise<Sala> {
  // Mejor esfuerzo y SIN bloquear: el plano de la sala anterior. Storage no
  // borra el archivo físico cuando muere su fila, así que el único que puede
  // limpiarlo es el anfitrión desde aquí (ver docs/BACKEND.md §8).
  const previa = ultimaSala()
  if (previa) void borrarPlano(previa).catch(() => undefined)
  const d = await rpc<FilaSala>('partida_crear', {
    p_juego: juego,
    p_apps: apps,
    p_proto: VERSION_PROTO,
    p_aspecto: podar(useDiseño.getState().avatar),
  })
  guardarUltima(d.partida_id)
  return aSala(d, d.jugador_id ?? 'j0', true)
}

export async function invitar(partidaId: string, contactoId: string): Promise<void> {
  await rpc('partida_invitar', { p_partida: partidaId, p_contacto: contactoId })
}

export async function entrar(partidaId: string): Promise<Sala> {
  const d = await rpc<FilaSala>('partida_entrar', {
    p_partida: partidaId,
    p_aspecto: podar(useDiseño.getState().avatar),
    p_proto: VERSION_PROTO,
  })
  return aSala(d, d.jugador_id ?? 'j0', d.anfitrion === true)
}

/**
 * Re-sync del roster tras el evento `sala` y tras cada SUBSCRIBED.
 * `partida_estado` NO devuelve tu propia ranura a propósito (se aprende UNA vez
 * en `partida_entrar`), así que la pone quien llama.
 */
export async function estado(partidaId: string, miRanura: Ranura): Promise<Sala> {
  const d = await rpc<FilaSala>('partida_estado', { p_partida: partidaId })
  return aSala(d, miRanura, d.anfitrion === true)
}

export async function salir(partidaId: string): Promise<void> {
  await rpc('partida_salir', { p_partida: partidaId })
}

export async function expulsar(partidaId: string, ranura: Ranura): Promise<void> {
  await rpc('partida_expulsar', { p_partida: partidaId, p_jugador: ranura })
}

export async function latido(partidaId: string): Promise<void> {
  await rpc('partida_latido', { p_partida: partidaId })
}

/** Visita → juego → visita sin rehacer la sala (ni gastar otra unidad de cuota). */
export async function cambiarJuego(partidaId: string, juego: JuegoPartida): Promise<void> {
  await rpc('partida_cambiar_juego', { p_partida: partidaId, p_juego: juego })
}

// ─── el plano de la casa en el bucket ────────────────────────────────────────

/**
 * Sube el plano y marca la sala. El bucket solo admite `application/gzip`, así
 * que esa es siempre la etiqueta; si el runtime no trae `CompressionStream`
 * (WebView antiguo) el JSON sube TAL CUAL con ella y es `bajarPlano` quien
 * decide por los bytes mágicos (1f 8b) si hay que inflarlo. El MIME es una
 * etiqueta de Storage, los bytes son la verdad.
 *
 * No hay policy de `update`: rehacer el plano es borrar y volver a subir.
 */
export async function subirPlano(partidaId: string, plano: Blob): Promise<void> {
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorPartida('sin-backend')
  const bytes =
    typeof CompressionStream === 'function'
      ? await new Response(plano.stream().pipeThrough(new CompressionStream('gzip'))).blob()
      : plano
  // supabase-js manda el tipo DEL BLOB, no el `contentType` de las opciones: el
  // de `CompressionStream` sale vacío (→ octet-stream) y el bucket lo rechaza.
  const cuerpo = new Blob([bytes], { type: 'application/gzip' })
  const ruta = `${partidaId}/${ARCHIVO}`
  await sb.storage.from(BUCKET).remove([ruta])
  const { error } = await sb.storage.from(BUCKET).upload(ruta, cuerpo, {
    contentType: 'application/gzip',
    upsert: false,
  })
  if (error) throw new ErrorPartida(/fetch|network/i.test(error.message) ? 'red' : 'servidor', error.message)
  await rpc('partida_marcar_casa', { p_partida: partidaId })
}

export async function bajarPlano(partidaId: string): Promise<ArrayBuffer> {
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorPartida('sin-backend')
  const { data, error } = await sb.storage.from(BUCKET).download(`${partidaId}/${ARCHIVO}`)
  if (error || !data) throw new ErrorPartida('red', error?.message)
  const bruto = await data.arrayBuffer()
  const cabecera = new Uint8Array(bruto)
  if (cabecera[0] !== 0x1f || cabecera[1] !== 0x8b) return bruto
  return new Response(new Blob([bruto]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
}

/**
 * Lo llama el anfitrión ANTES de `partida_salir` y, a mejor esfuerzo, al crear
 * la sala siguiente. La policy va por `partida_fui_anfitrion` (sin mirar el
 * estado), así que también funciona con la sala ya cerrada.
 */
export async function borrarPlano(partidaId: string): Promise<void> {
  const sb = await obtenerSupabase()
  if (!sb) return
  await sb.storage.from(BUCKET).remove([`${partidaId}/${ARCHIVO}`])
}

function ultimaSala(): string | null {
  try {
    return localStorage.getItem(LS_ULTIMA)
  } catch {
    return null
  }
}

function guardarUltima(id: string): void {
  try {
    localStorage.setItem(LS_ULTIMA, id)
  } catch {
    // Almacenamiento bloqueado: se pierde la limpieza del plano, nada más.
  }
}

// ─── errores ─────────────────────────────────────────────────────────────────

/** El mensaje traducido de un fallo de partida (cualquier otro cae en «servidor»). */
export function mensajeErrorPartida(e: unknown, t: TFunc): string {
  const codigo: CodigoErrorPartida = e instanceof ErrorPartida ? e.codigo : 'servidor'
  switch (codigo) {
    case 'sin-sesion':
      return t('partida.error.sin-sesion', 'Inicia sesión para jugar con tus contactos')
    case 'sin-backend':
      return t('partida.error.sin-backend', 'Esta versión no tiene multijugador')
    case 'peticion-invalida':
      return t('partida.error.peticion-invalida', 'La petición no es válida')
    case 'aspecto-grande':
      return t('partida.error.aspecto-grande', 'Tu personaje es demasiado grande para viajar')
    case 'limite':
      return t('partida.error.limite', 'Has abierto muchas salas. Prueba más tarde.')
    case 'no-encontrado':
      return t('partida.error.no-encontrado', 'Esa sala ya no existe')
    case 'no-contacto':
      return t('partida.error.no-contacto', 'Solo puedes invitar a contactos aceptados')
    case 'sala-llena':
      return t('partida.error.sala-llena', 'La sala está llena (4 jugadores)')
    case 'no-invitado':
      return t('partida.error.no-invitado', 'No estás invitado a esa sala')
    case 'expulsado':
      return t('partida.error.expulsado', 'Ya no puedes entrar en esa sala')
    case 'version':
      return t('partida.error.version', 'Uno de los dos tiene una versión distinta de la app')
    case 'offline':
    case 'red':
      return t('partida.error.red', 'Sin conexión: inténtalo de nuevo')
    default:
      return t('partida.error.servidor', 'No se pudo completar. Inténtalo de nuevo.')
  }
}
