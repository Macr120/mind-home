import type { RealtimeChannel } from '@supabase/supabase-js'
import { hayBackend, obtenerSupabase } from '../cuenta/supabase'
import { uidConPago, useSesion } from '../cuenta/sesionStore'
import { esDemo } from '../edicion'
import { tGlobal } from '../i18n/useT'
import { comprimirImagen } from '../imagenIA'
import { notificar } from '../notificaciones'
import { recibirInvitacion } from '../partida/partidaStore'
import { recibirAvisoEspacio } from '../espacios/avisos'
import * as api from './api'
import * as cache from './cache'
import { useBuzon } from './buzonStore'
import { asegurarNormas } from './normas'
import { separarCita } from './cita'
import { validarPaquete, type Paquete } from './compartibles'
import { ErrorBuzon, esAdjunto, TOPE_TEXTO, topeDe, type AdjuntoRemoto, type ContenidoMensaje, type MensajeBuzon, type TipoAdjunto, type TipoMensaje } from './tipos'

/**
 * Motor del buzón (calcado del motor de sync, en pequeño): escucha el canal
 * privado `buzon:<uid>`, hace pull incremental por cursor a la caché Dexie,
 * envía de forma optimista e idempotente y avisa de lo que llega.
 *
 * Arranca con SESIÓN (no exige Pro) y para al cerrarla; al cambiar de cuenta en
 * el mismo dispositivo vacía la caché de la anterior.
 */

// Con el campanazo Realtime el intervalo es red de seguridad.
const INTERVALO_MS = 120_000
const INTERVALO_CON_CANAL_MS = 600_000
const VISIBLE_MIN_MS = 30_000
const BACKOFF_BASE_MS = 5000
const BACKOFF_MAX_MS = 60_000
const LEIDO_DEBOUNCE_MS = 800
const TROZO_BLOBS = 4
/** MIME que acepta el bucket; cualquier otra imagen se recomprime antes de subir. */
const MIME_PERMITIDOS = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav',
  'video/mp4', 'video/webm', 'video/quicktime',
])

/** Algunos navegadores etiquetan el mp3 o el m4a con alias que el bucket no lista. */
const ALIAS_MIME: Record<string, string> = { 'audio/mp3': 'audio/mpeg', 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4' }

interface EnvioPendiente {
  texto: string
  adjunto?: { tipo: TipoAdjunto; blob: Blob; nombre: string }
  paquete?: Paquete
}

let activo = false
let uidActual: string | null = null
let canal: RealtimeChannel | null = null
/** El canal está suscrito: lo nuevo llega solo y el intervalo puede espaciarse. */
let canalVivo = false
/** Última vuelta de la red de seguridad (o del alta del canal). */
let ultimaVuelta = 0
let cursor = 0
let ultimoSeqPropio = 0
let pullEnVuelo = false
let pullPendiente = false
let fallos = 0
let contactosCargados = false
let timerInterval: ReturnType<typeof setInterval> | null = null
let timerBackoff: ReturnType<typeof setTimeout> | null = null
const timersLeido = new Map<string, ReturnType<typeof setTimeout>>()
/** Payload de los envíos en curso o fallidos (para reintentar con sus blobs). */
const enVuelo = new Map<string, EnvioPendiente>()

/** Clave del blob que se descarga como vista previa de un contenido. */
export function clavePrevia(c: ContenidoMensaje): string | null {
  for (const k of ['miniatura', 'foto', 'imagen']) if (c.blobs?.[k]) return k
  return null
}

// ─── ciclo de vida ───────────────────────────────────────────────────────────

/**
 * Enchufa el buzón al ciclo de sesión (llamar UNA vez desde main). Se compara
 * por `usuario.id`: el objeto `usuario` se reemplaza en cada refresh de token.
 */
export function conectarBuzon(): void {
  if (!hayBackend()) return
  // Sin compra el servidor rechaza el buzón: sigue al uid CON pago.
  useSesion.subscribe((s, prev) => {
    const ahora = uidConPago(s)
    const antes = uidConPago(prev)
    if (ahora === antes) return
    if (antes) detener()
    if (ahora) void iniciar(ahora)
  })
  const uid = uidConPago(useSesion.getState())
  if (uid) void iniciar(uid)
}

async function iniciar(uid: string): Promise<void> {
  activo = true
  uidActual = uid
  useBuzon.setState({ estado: 'conectando' })
  if ((await cache.usuarioDeCache()) !== uid) {
    await cache.limpiarCacheBuzon()
    await cache.fijarUsuarioDeCache(uid)
  }
  if (!activo || uidActual !== uid) return // detener() ganó mientras se limpiaba
  cursor = await cache.leerCursor()
  await recontar()
  document.addEventListener('visibilitychange', alVisible)
  window.addEventListener('online', alOnline)
  if (timerInterval == null) {
    // Red de seguridad: nada con la pestaña oculta; con el canal vivo los
    // mensajes y contactos llegan solos y basta una vuelta cada 10 min.
    timerInterval = setInterval(() => {
      if (document.hidden) return
      if (canalVivo && Date.now() - ultimaVuelta < INTERVALO_CON_CANAL_MS) return
      ultimaVuelta = Date.now()
      void pull()
      void refrescarContactos()
    }, INTERVALO_MS)
  }
  void refrescarContactos()
  void pull()
  void suscribir(uid)
}

function detener(): void {
  activo = false
  uidActual = null
  canalVivo = false
  if (canal) {
    void canal.unsubscribe()
    canal = null
  }
  document.removeEventListener('visibilitychange', alVisible)
  window.removeEventListener('online', alOnline)
  if (timerInterval != null) clearInterval(timerInterval)
  if (timerBackoff != null) clearTimeout(timerBackoff)
  timerInterval = null
  timerBackoff = null
  for (const t of timersLeido.values()) clearTimeout(t)
  timersLeido.clear()
  enVuelo.clear()
  cursor = 0
  ultimoSeqPropio = 0
  pullPendiente = false
  fallos = 0
  contactosCargados = false
  useBuzon.setState({
    estado: 'apagado',
    hiloAbierto: null,
    panelContactos: false,
    noLeidos: {},
    totalNoLeidos: 0,
    solicitudesPendientes: 0,
  })
}

let ultimoVisible = 0

function alVisible(): void {
  // Ir y volver de pestaña a menudo no debe costar dos RPCs cada vez.
  if (document.visibilityState !== 'visible' || Date.now() - ultimoVisible < VISIBLE_MIN_MS) return
  ultimoVisible = Date.now()
  void pull()
  void refrescarContactos()
}

function alOnline(): void {
  void pull()
}

async function suscribir(uid: string): Promise<void> {
  if (canal) return
  const sb = await obtenerSupabase()
  if (!sb || !activo || uidActual !== uid) return
  await sb.realtime.setAuth() // token de la sesión para el canal privado
  canal = sb
    .channel(`buzon:${uid}`, { config: { private: true } })
    .on('broadcast', { event: 'mensaje' }, ({ payload }) => {
      const seq = typeof (payload as { seq?: unknown } | null)?.seq === 'number' ? (payload as { seq: number }).seq : Infinity
      // Ecos: mi propio envío o algo que el pull ya trajo.
      if (seq <= cursor || seq <= ultimoSeqPropio) return
      void pull()
    })
    .on('broadcast', { event: 'contactos' }, () => void refrescarContactos())
    .on('broadcast', { event: 'invitacion' }, ({ payload }) => recibirInvitacion(payload))
    .on('broadcast', { event: 'espacio' }, ({ payload }) => recibirAvisoEspacio(payload))
    .subscribe((estado) => {
      canalVivo = estado === 'SUBSCRIBED'
      // Cada (re)SUBSCRIBED se pone al día: lo emitido con el canal caído no se repite.
      if (estado === 'SUBSCRIBED') {
        ultimaVuelta = Date.now()
        void pull()
        void refrescarContactos()
      }
    })
}

// ─── pull ────────────────────────────────────────────────────────────────────

export async function pull(): Promise<void> {
  if (!activo) return
  if (pullEnVuelo) {
    pullPendiente = true
    return
  }
  pullEnVuelo = true
  try {
    await navigator.locks.request('mh-buzon-pull', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        pullPendiente = true
        return
      }
      // Primer pull del dispositivo: baja el historial sin disparar un aviso por mensaje.
      const inicial = cursor === 0
      let mas = true
      while (mas && activo) {
        const r = await api.pullRpc(cursor)
        const nuevos = await cache.upsertMensajes(r.mensajes)
        cursor = Math.max(cursor, r.maxSeq)
        await cache.escribirCursor(cursor)
        mas = r.mas
        await descargarPrevias(r.mensajes)
        if (!inicial) await avisar(nuevos)
      }
      fallos = 0
      if (activo) useBuzon.setState({ estado: 'listo' })
    })
    await recontar()
  } catch (e) {
    programarReintento(e)
  } finally {
    pullEnVuelo = false
    if (pullPendiente) {
      pullPendiente = false
      void pull()
    }
  }
}

/** Imagen del mensaje o vista previa del contenido, si aún no está en la caché (best-effort). */
async function descargarPrevias(remotos: api.MensajeRemoto[]): Promise<void> {
  const tareas: (() => Promise<void>)[] = []
  for (const r of remotos) {
    const a = r.tipo === 'imagen' ? r.adjunto : r.contenido ? previaDe(r.contenido) : null
    if (!a) continue
    tareas.push(async () => {
      const fila = await cache.mensajePorUid(r.uid)
      if (!fila || fila.blob) return
      try {
        const blob = await api.descargarAdjunto(a)
        await cache.actualizarMensaje(r.uid, { blob })
      } catch {
        // Se reintenta al abrir el hilo («Descargar»).
      }
    })
  }
  for (let i = 0; i < tareas.length; i += TROZO_BLOBS) {
    await Promise.all(tareas.slice(i, i + TROZO_BLOBS).map((f) => f()))
  }
}

function previaDe(c: ContenidoMensaje): AdjuntoRemoto | null {
  const k = clavePrevia(c)
  return k ? (c.blobs?.[k] ?? null) : null
}

/** Descarga bajo demanda (el botón «Descargar» de la burbuja). */
export async function descargarBlobDe(m: MensajeBuzon): Promise<Blob | null> {
  const a = esAdjunto(m.tipo) ? m.adjunto : m.contenido ? previaDe(m.contenido) : null
  if (!a) return null
  const blob = await api.descargarAdjunto(a)
  await cache.actualizarMensaje(m.uid, { blob })
  return blob
}

async function avisar(nuevos: MensajeBuzon[]): Promise<void> {
  const { hiloAbierto } = useBuzon.getState()
  const visible = document.visibilityState === 'visible'
  for (const m of nuevos) {
    if (m.mio) continue
    if (hiloAbierto === m.hiloId && visible) {
      void marcarLeido(m.hiloId)
      continue
    }
    const c = await cache.contactoDeHilo(m.hiloId)
    const quien = c?.nombre || (c?.alias ? `@${c.alias}` : tGlobal('buzon.amigos', 'Amigos'))
    const cuerpo =
      m.tipo === 'imagen'
        ? tGlobal('buzon.adjunto.imagen', 'Imagen')
        : m.tipo === 'pdf'
          ? tGlobal('buzon.adjunto.pdf', 'PDF')
          : m.tipo === 'borrado'
            ? tGlobal('buzon.borrado', 'Mensaje eliminado')
            : m.tipo === 'audio'
            ? tGlobal('buzon.adjunto.audio', 'Audio')
            : m.tipo === 'video'
              ? tGlobal('buzon.adjunto.video', 'Video')
              : m.tipo === 'contenido'
            ? tGlobal('buzon.aviso.contenido', 'Te envió «{q}»', { q: m.contenido?.nombre ?? '' })
            : separarCita(m.texto).cuerpo
    void notificar({
      clave: `buzon:${m.hiloId}|${m.uid}`,
      titulo: tGlobal('buzon.aviso.mensaje', '{n} te escribió', { n: quien }),
      cuerpo,
      hilo: m.hiloId,
      efimero: true,
      accionAbrir: tGlobal('buzon.aviso.abrir', 'Abrir'),
    })
  }
}

export async function recontar(): Promise<void> {
  const porHilo = await cache.contarNoLeidos()
  useBuzon.getState().setNoLeidos(porHilo)
}

function programarReintento(e: unknown): void {
  if (!activo) return
  // Sin sesión no hay nada que reintentar: el store de sesión parará el motor.
  if (e instanceof ErrorBuzon && (e.codigo === 'sin-sesion' || e.codigo === 'sin-backend')) return
  useBuzon.setState({ estado: 'error' })
  fallos++
  const espera = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (fallos - 1))
  if (timerBackoff != null) clearTimeout(timerBackoff)
  timerBackoff = setTimeout(() => {
    timerBackoff = null
    void pull()
  }, espera)
}

// ─── contactos ───────────────────────────────────────────────────────────────

export async function refrescarContactos(): Promise<void> {
  if (!activo) return
  try {
    const previos = await cache.contactosCache()
    const lista = await api.listarContactos(previos)
    if (!activo) return
    await cache.guardarContactos(lista)
    const pendientes = lista.filter((c) => c.estado === 'pendiente' && c.direccion === 'recibida')
    useBuzon.setState({ solicitudesPendientes: pendientes.length })
    // Solicitud nueva respecto a lo que ya se conocía (no en la primera carga de la sesión).
    if (contactosCargados) {
      const conocidos = new Set(previos.map((c) => c.contactoId))
      for (const c of pendientes) {
        if (conocidos.has(c.contactoId)) continue
        void notificar({
          clave: `buzon:solicitud|${c.contactoId}`,
          titulo: tGlobal('buzon.aviso.solicitud', 'Solicitud de contacto de @{a}', { a: c.alias }),
          cuerpo: c.nombre,
          efimero: true,
        })
      }
    }
    contactosCargados = true
    await recontar() // pudo podar hilos
  } catch {
    // El intervalo y el campanazo lo reintentan.
  }
}

// ─── envío ───────────────────────────────────────────────────────────────────

const sanear = (s: string) => s.replace(/[^\w.-]/g, '_')

const EXTENSIONES: Record<string, string> = {
  'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/webm': 'webm',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
}
const extensionDe = (mime: string) => EXTENSIONES[mime] ?? 'jpg'

/** Un blob que el bucket acepte: las imágenes en otro formato se recomprimen. */
async function aceptable(blob: Blob): Promise<Blob> {
  if (MIME_PERMITIDOS.has(blob.type)) return blob
  // `audio/webm;codecs=opus` (MediaRecorder) o un alias: se reetiqueta con el tipo
  // base, porque supabase-js sube con el tipo DEL BLOB y el bucket compara exacto.
  const base = blob.type.split(';')[0].trim().toLowerCase()
  const tipo = ALIAS_MIME[base] ?? base
  if (MIME_PERMITIDOS.has(tipo)) return new Blob([blob], { type: tipo })
  if (blob.type.startsWith('image/') || !blob.type) return comprimirImagen(blob, 1280)
  throw new ErrorBuzon('servidor', 'Formato de archivo no admitido')
}

/**
 * Envío optimista: la fila aparece al instante en el hilo (`estado:'enviando'`),
 * se suben los binarios a la carpeta del mensaje y se confirma con la RPC. El
 * `uid` lo genera el cliente: un reintento tras perder red no duplica.
 */
export async function enviar(hiloId: string, o: EnvioPendiente): Promise<void> {
  if (!activo && !esDemo()) throw new ErrorBuzon('sin-sesion')
  if (!esDemo() && !(await asegurarNormas())) throw new ErrorBuzon('normas')
  const tipo: TipoMensaje = o.paquete ? 'contenido' : o.adjunto ? o.adjunto.tipo : 'texto'
  const texto = o.texto.trim().slice(0, TOPE_TEXTO)
  if (tipo === 'texto' && !texto) return
  if (o.paquete) validarPaquete(o.paquete)
  if (o.adjunto && o.adjunto.blob.size > topeDe(o.adjunto.tipo)) throw new ErrorBuzon('adjunto-grande')
  const uid = crypto.randomUUID()
  const previa = o.paquete ? (clavePrevia({ ...contenidoDe(o.paquete, {}), blobs: marcadoresVacios(o.paquete) }) ?? null) : null
  const fila: MensajeBuzon = {
    uid,
    hiloId,
    mio: true,
    tipo,
    texto,
    serverSeq: 0,
    creadoEn: new Date().toISOString(),
    estado: 'enviando',
    blob: o.adjunto?.blob ?? (previa ? o.paquete?.blobs?.[previa] : undefined),
    contenido: o.paquete ? contenidoDe(o.paquete, {}) : undefined,
    adjunto: o.adjunto
      ? { path: '', size: o.adjunto.blob.size, mime: o.adjunto.blob.type, nombre: o.adjunto.nombre }
      : undefined,
  }
  // Casa demo: sus amigos son de mentira; el mensaje se queda en el hilo local.
  if (esDemo()) {
    await cache.guardarMensajeLocal({ ...fila, estado: undefined })
    return
  }
  await cache.guardarMensajeLocal(fila)
  enVuelo.set(uid, { ...o, texto })
  await transmitir(hiloId, uid, tipo, { ...o, texto })
}

/** El contenido de un mensaje recibido, con sus blobs ya descargados (para guardarlo o reenviarlo). */
export async function paqueteDeMensaje(m: MensajeBuzon): Promise<Paquete | null> {
  const c = m.contenido
  if (!c) return null
  const previa = clavePrevia(c)
  const blobs: Record<string, Blob> = {}
  for (const [k, a] of Object.entries(c.blobs ?? {})) {
    blobs[k] = k === previa && m.blob ? m.blob : await api.descargarAdjunto(a)
  }
  return { app: c.app, tipo: c.tipo, version: 1, nombre: c.nombre, resumen: c.resumen, emoji: c.emoji, datos: c.datos, blobs }
}

/** Invitaciones (espacios, partidas) no se reenvían: son para quien las recibió. */
export const reenviable = (m: MensajeBuzon) =>
  !m.sistema && m.tipo !== 'borrado' && !(m.tipo === 'contenido' && (m.contenido?.app === 'espacio' || m.contenido?.app === 'partida'))

/** Manda una copia del mensaje a otro hilo (sin la cita, si respondía a algo). */
export async function reenviar(m: MensajeBuzon, hiloId: string): Promise<void> {
  const texto = separarCita(m.texto).cuerpo
  if (esAdjunto(m.tipo) && m.adjunto) {
    const blob = m.blob ?? (await api.descargarAdjunto(m.adjunto))
    return enviar(hiloId, { texto, adjunto: { tipo: m.tipo, blob, nombre: m.adjunto.nombre } })
  }
  const paquete = await paqueteDeMensaje(m)
  return enviar(hiloId, { texto, paquete: paquete ?? undefined })
}

/**
 * Borra un mensaje. Para mí: solo de este dispositivo. Para todos (solo los
 * míos ya confirmados): primero sus archivos y luego el servidor lo convierte en
 * «Mensaje eliminado» para los dos. Una nota local o un envío que nunca llegó al
 * servidor se borra aquí sin más.
 */
export async function borrarMensaje(m: MensajeBuzon, paraTodos: boolean): Promise<void> {
  enVuelo.delete(m.uid)
  if (!paraTodos || m.sistema || !m.serverSeq || esDemo()) {
    await cache.borrarMensajeLocal(m.uid)
    await recontar()
    return
  }
  if (esAdjunto(m.tipo) || m.contenido?.blobs) await api.borrarAdjuntosMensaje(m.hiloId, m.uid)
  await api.borrarMensajeRpc(m.hiloId, m.uid)
  await cache.actualizarMensaje(m.uid, { tipo: 'borrado', texto: '', adjunto: undefined, contenido: undefined, blob: undefined })
}

/** Vuelve a intentar un envío fallido (misma fila, mismo uid). */
export async function reintentar(uid: string): Promise<void> {
  const fila = await cache.mensajePorUid(uid)
  if (!fila || !activo) return
  let o = enVuelo.get(uid)
  if (!o) {
    // Tras recargar la app solo queda lo que la fila conserva.
    if (fila.tipo === 'contenido' && fila.contenido && Object.keys(fila.contenido.blobs ?? {}).length) return
    o = {
      texto: fila.texto,
      adjunto:
        esAdjunto(fila.tipo) && fila.blob && fila.adjunto
          ? { tipo: fila.tipo, blob: fila.blob, nombre: fila.adjunto.nombre }
          : undefined,
      paquete: fila.contenido
        ? { app: fila.contenido.app, tipo: fila.contenido.tipo, version: 1, nombre: fila.contenido.nombre, resumen: fila.contenido.resumen, emoji: fila.contenido.emoji, datos: fila.contenido.datos }
        : undefined,
    }
    if (fila.tipo !== 'texto' && !o.adjunto && !o.paquete) return
  }
  await cache.actualizarMensaje(uid, { estado: 'enviando' })
  await transmitir(fila.hiloId, uid, fila.tipo, o)
}

export function contenidoDe(p: Paquete, blobs: Record<string, AdjuntoRemoto>): ContenidoMensaje {
  return {
    app: p.app,
    tipo: p.tipo,
    version: 1,
    nombre: p.nombre,
    ...(p.resumen ? { resumen: p.resumen } : {}),
    ...(p.emoji ? { emoji: p.emoji } : {}),
    datos: p.datos,
    ...(Object.keys(blobs).length ? { blobs } : {}),
  }
}

/** Marcadores vacíos con las claves de los blobs del paquete (para elegir la vista previa antes de subir). */
function marcadoresVacios(p: Paquete): Record<string, AdjuntoRemoto> {
  const out: Record<string, AdjuntoRemoto> = {}
  for (const k of Object.keys(p.blobs ?? {})) out[k] = { path: '', size: 0, mime: '', nombre: k }
  return out
}

async function transmitir(hiloId: string, uid: string, tipo: TipoMensaje, o: EnvioPendiente): Promise<void> {
  try {
    let adjunto: AdjuntoRemoto | undefined
    let contenido: ContenidoMensaje | undefined
    if (o.adjunto) {
      const blob = await aceptable(o.adjunto.blob)
      const base = o.adjunto.tipo === 'pdf' ? 'documento' : o.adjunto.tipo
      adjunto = await api.subirAdjunto(hiloId, uid, `${base}.${extensionDe(blob.type)}`, blob)
      adjunto.nombre = o.adjunto.nombre
    }
    if (o.paquete) {
      const marcadores: Record<string, AdjuntoRemoto> = {}
      for (const [k, b] of Object.entries(o.paquete.blobs ?? {})) {
        const blob = await aceptable(b)
        marcadores[k] = await api.subirAdjunto(hiloId, uid, `contenido/${sanear(k)}.${extensionDe(blob.type)}`, blob)
      }
      contenido = contenidoDe(o.paquete, marcadores)
    }
    const r = await api.enviarRpc(hiloId, uid, tipo, o.texto, adjunto, contenido)
    ultimoSeqPropio = Math.max(ultimoSeqPropio, r.serverSeq)
    await cache.actualizarMensaje(uid, {
      serverSeq: r.serverSeq,
      creadoEn: r.creadoEn,
      ...(adjunto ? { adjunto } : {}),
      ...(contenido ? { contenido } : {}),
      estado: undefined,
    })
    enVuelo.delete(uid)
  } catch (e) {
    await cache.actualizarMensaje(uid, { estado: 'error' })
    throw e
  }
}

// ─── leído ───────────────────────────────────────────────────────────────────

/** Marca leído lo recibido en el hilo: local al momento, servidor con debounce. */
export async function marcarLeido(hiloId: string): Promise<void> {
  if (!activo && !esDemo()) return
  const n = await cache.marcarLeidosLocal(hiloId)
  if (n === 0) return
  await recontar()
  if (esDemo()) return
  const previo = timersLeido.get(hiloId)
  if (previo) clearTimeout(previo)
  timersLeido.set(
    hiloId,
    setTimeout(() => {
      timersLeido.delete(hiloId)
      void cache.maxSeqDeHilo(hiloId).then((hasta) => api.marcarLeidoRpc(hiloId, hasta).catch(() => {}))
    }, LEIDO_DEBOUNCE_MS),
  )
}
