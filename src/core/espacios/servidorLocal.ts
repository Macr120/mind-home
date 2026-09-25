/**
 * «Servidor» de espacios para probar la coedición con DOS PESTAÑAS y sin
 * backend (`?espacioLocal=<codigo>`). Implementa las mismas RPCs `espacio_*` y
 * devuelve el MISMO JSON (snake_case) que la migración, así que `api.ts` solo
 * cambia de transporte y nada más del cliente se entera.
 *
 * - El estado vive en `localStorage['mh.espacioLocal.<codigo>']` y toda
 *   lectura-escritura pasa por `navigator.locks`: dos pestañas escribiendo a la
 *   vez se pisarían.
 * - La identidad es POR PESTAÑA (`sessionStorage`), que es lo que permite que
 *   dos ventanas del mismo navegador sean dos personas.
 * - `realtime.send` se emula con el BroadcastChannel de `transporte.ts`. Como
 *   BroadcastChannel no entrega al emisor, quien dispara la RPC no recibe su
 *   propio aviso: no hace falta, ya tiene la respuesta.
 */
import { canalLocalEspacio, espacioLocal } from './transporte'
import {
  ErrorEspacio,
  TOPE_CAMBIO,
  TOPE_SNAPSHOT,
  VERSION_PROTO_ESPACIO,
  type EventoEspacio,
  type RolEspacio,
  type TipoEspacio,
} from './tipos'

const SS_YO = 'mh.espacioLocal.yo'
const PAGINA = 200
/** Tope de todo lo subido a la carpeta del espacio (localStorage es pequeño). */
const TOPE_ARCHIVOS = 5 * 1024 * 1024

interface MiembroLocal {
  miembro_id: string
  rol: RolEspacio
  estado: 'activo' | 'fuera' | 'expulsado'
  alias: string
  nombre: string
  emoji: string
}

interface CambioLocal {
  seq: number
  uid: string
  autor: string
  tipo: string
  datos: unknown
  creado_en: string
}

interface EspacioLocal {
  espacio_id: string
  tipo: TipoEspacio
  titulo: string
  meta: Record<string, unknown>
  proto: number
  dueno: string
  dueno_alias: string
  token_ver: string
  token_editar: string
  enlace_ver: boolean
  enlace_editar: boolean
  seq: number
  snapshot: unknown
  snapshot_seq: number
  bloqueo_por: string | null
  bloqueo_hasta: string | null
  creado_en: string
  actualizado_en: string
  miembros: MiembroLocal[]
  cambios: CambioLocal[]
}

interface Almacen {
  contador: number
  espacios: Record<string, EspacioLocal>
  archivos: Record<string, string>
}

interface AvisoLocal {
  espacioId: string
  evento: EventoEspacio
  payload: object
}

const vacio = (): Almacen => ({ contador: 0, espacios: {}, archivos: {} })

function clave(): string {
  return `mh.espacioLocal.${espacioLocal() ?? 'demo'}`
}

function leer(): Almacen {
  try {
    const bruto = localStorage.getItem(clave())
    if (!bruto) return vacio()
    const d = JSON.parse(bruto) as Partial<Almacen>
    return {
      contador: typeof d.contador === 'number' ? d.contador : 0,
      espacios: d.espacios ?? {},
      archivos: d.archivos ?? {},
    }
  } catch {
    return vacio()
  }
}

function escribir(s: Almacen): void {
  try {
    localStorage.setItem(clave(), JSON.stringify(s))
  } catch {
    throw new ErrorEspacio('limite', 'El almacenamiento local se llenó')
  }
}

/**
 * Sección crítica sobre el almacén. Los avisos se emiten DESPUÉS de soltar el
 * lock: si se emitieran dentro, la otra pestaña pediría el lock enseguida y
 * esperaría a que esta acabara igual.
 */
async function conStore<T>(
  fn: (s: Almacen, avisar: (espacioId: string, evento: EventoEspacio, payload: object) => void) => T,
): Promise<T> {
  const avisos: AvisoLocal[] = []
  const r = await navigator.locks.request(`mh-espacio-local:${espacioLocal() ?? 'demo'}`, () => {
    const s = leer()
    const out = fn(s, (espacioId, evento, payload) => avisos.push({ espacioId, evento, payload }))
    escribir(s)
    return out
  })
  for (const a of avisos) emitir(a)
  return r
}

function emitir(a: AvisoLocal): void {
  try {
    const bc = new BroadcastChannel(canalLocalEspacio(a.espacioId))
    bc.postMessage({ ev: a.evento, p: a.payload })
    bc.close()
  } catch {
    // Sin BroadcastChannel las pestañas no se ven; el pull periódico lo tapa.
  }
}

// ─── identidad de la pestaña ─────────────────────────────────────────────────

interface Identidad {
  miembroId: string
  alias: string
}

const hex = (n: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => (b % 16).toString(16))
    .join('')

let identidad: Identidad | null = null

async function yo(): Promise<Identidad> {
  if (identidad) return identidad
  try {
    const guardada = JSON.parse(sessionStorage.getItem(SS_YO) ?? 'null') as Identidad | null
    if (guardada?.miembroId && guardada.alias) {
      identidad = guardada
      return guardada
    }
  } catch {
    // Identidad nueva.
  }
  const n = await conStore((s) => {
    s.contador += 1
    return s.contador
  })
  const nueva: Identidad = { miembroId: `m${hex(12)}`, alias: `local-${n}` }
  try {
    sessionStorage.setItem(SS_YO, JSON.stringify(nueva))
  } catch {
    // Sin sessionStorage la identidad dura lo que la pestaña.
  }
  identidad = nueva
  return nueva
}

// ─── utilidades ──────────────────────────────────────────────────────────────

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function token(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => ALFABETO[b % ALFABETO.length])
    .join('')
}

const error = (codigo: string) => ({ error: codigo })

function bloqueoDe(e: EspacioLocal): { por: string; hasta: string } | null {
  if (!e.bloqueo_por || !e.bloqueo_hasta) return null
  if (new Date(e.bloqueo_hasta).getTime() < Date.now()) return null
  return { por: e.bloqueo_por, hasta: e.bloqueo_hasta }
}

function miembroDe(e: EspacioLocal, miembroId: string): MiembroLocal | undefined {
  return e.miembros.find((m) => m.miembro_id === miembroId)
}

function resumen(e: EspacioLocal, miembroId: string): Record<string, unknown> {
  const mio = miembroDe(e, miembroId)
  const soyDueno = e.dueno === miembroId
  return {
    espacio_id: e.espacio_id,
    tipo: e.tipo,
    titulo: e.titulo,
    meta: e.meta,
    proto: e.proto,
    rol: mio?.rol ?? 'lector',
    yo: miembroId,
    dueno_alias: e.dueno_alias,
    seq: e.seq,
    snapshot_seq: e.snapshot_seq,
    bloqueo: bloqueoDe(e),
    n_miembros: e.miembros.filter((m) => m.estado === 'activo').length,
    creado_en: e.creado_en,
    actualizado_en: e.actualizado_en,
    ...(soyDueno
      ? {
          token_ver: e.token_ver,
          token_editar: e.token_editar,
          enlace_ver: e.enlace_ver,
          enlace_editar: e.enlace_editar,
        }
      : {}),
  }
}

function miembrosJson(e: EspacioLocal, miembroId: string): Record<string, unknown>[] {
  return e.miembros
    .filter((m) => m.estado !== 'expulsado')
    .map((m) => ({
      miembro_id: m.miembro_id,
      rol: m.rol,
      estado: m.estado,
      alias: m.alias,
      nombre: m.nombre,
      emoji: m.emoji,
      retrato: null,
      yo: m.miembro_id === miembroId,
    }))
}

const puedeEditar = (m: MiembroLocal | undefined) =>
  !!m && m.estado === 'activo' && (m.rol === 'dueno' || m.rol === 'editor')

// ─── el despachador ──────────────────────────────────────────────────────────

/** Mismo contrato que `sb.rpc(nombre, args)`: devuelve el JSON del «servidor». */
export async function rpcLocal(nombre: string, args: Record<string, unknown>): Promise<unknown> {
  const mi = await yo()
  const id = String(args.p_id ?? '')

  switch (nombre) {
    case 'espacio_crear':
      return conStore((s) => {
        const ahora = new Date().toISOString()
        const e: EspacioLocal = {
          espacio_id: crypto.randomUUID(),
          tipo: args.p_tipo as TipoEspacio,
          titulo: String(args.p_titulo ?? '').slice(0, 80),
          meta: (args.p_meta as Record<string, unknown>) ?? {},
          proto: typeof args.p_proto === 'number' ? args.p_proto : VERSION_PROTO_ESPACIO,
          dueno: mi.miembroId,
          dueno_alias: mi.alias,
          token_ver: token(),
          token_editar: token(),
          enlace_ver: true,
          enlace_editar: true,
          seq: 0,
          snapshot: null,
          snapshot_seq: 0,
          bloqueo_por: null,
          bloqueo_hasta: null,
          creado_en: ahora,
          actualizado_en: ahora,
          miembros: [
            {
              miembro_id: mi.miembroId,
              rol: 'dueno',
              estado: 'activo',
              alias: mi.alias,
              nombre: mi.alias,
              emoji: '🙂',
            },
          ],
          cambios: [],
        }
        s.espacios[e.espacio_id] = e
        return { espacio: resumen(e, mi.miembroId) }
      })

    case 'espacio_listar':
      return conStore((s) => ({
        espacios: Object.values(s.espacios)
          .filter((e) => miembroDe(e, mi.miembroId)?.estado === 'activo')
          .map((e) => resumen(e, mi.miembroId)),
      }))

    case 'espacio_estado':
      return conStore((s) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (miembroDe(e, mi.miembroId)?.estado !== 'activo') return error('sin-permiso')
        return { espacio: resumen(e, mi.miembroId), miembros: miembrosJson(e, mi.miembroId) }
      })

    case 'espacio_editar':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.dueno !== mi.miembroId) return error('sin-permiso')
        e.titulo = String(args.p_titulo ?? e.titulo).slice(0, 80)
        if (args.p_meta != null) e.meta = args.p_meta as Record<string, unknown>
        e.actualizado_en = new Date().toISOString()
        avisar(e.espacio_id, 'meta', { v: 1 })
        return { ok: true }
      })

    case 'espacio_entrar':
      return conStore((s, avisar) => {
        const t = String(args.p_token ?? '')
        const e = Object.values(s.espacios).find((x) => x.token_ver === t || x.token_editar === t)
        if (!e) return error('no-encontrado')
        const comoEditor = e.token_editar === t
        if (comoEditor ? !e.enlace_editar : !e.enlace_ver) return error('enlace-inactivo')
        if (typeof args.p_proto === 'number' && args.p_proto !== e.proto) return error('version')
        const previo = miembroDe(e, mi.miembroId)
        if (previo?.estado === 'expulsado') return error('expulsado')
        if (previo) {
          previo.estado = 'activo'
          // Nunca degrada: el enlace de solo lectura no baja a un editor.
          if (comoEditor && previo.rol === 'lector') previo.rol = 'editor'
        } else {
          e.miembros.push({
            miembro_id: mi.miembroId,
            rol: comoEditor ? 'editor' : 'lector',
            estado: 'activo',
            alias: mi.alias,
            nombre: mi.alias,
            emoji: '🙂',
          })
        }
        avisar(e.espacio_id, 'miembros', { v: 1 })
        return { espacio: resumen(e, mi.miembroId), miembros: miembrosJson(e, mi.miembroId) }
      })

    case 'espacio_invitar':
      // Sin backend no hay contactos del buzón a los que invitar.
      return error('no-contacto')

    case 'espacio_rotar_enlace':
      return conStore((s) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.dueno !== mi.miembroId) return error('sin-permiso')
        const activo = args.p_activo !== false
        if (args.p_cual === 'ver') {
          e.token_ver = token()
          e.enlace_ver = activo
        } else {
          e.token_editar = token()
          e.enlace_editar = activo
        }
        return {
          token_ver: e.token_ver,
          token_editar: e.token_editar,
          enlace_ver: e.enlace_ver,
          enlace_editar: e.enlace_editar,
        }
      })

    case 'espacio_rol':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.dueno !== mi.miembroId) return error('sin-permiso')
        const m = miembroDe(e, String(args.p_miembro ?? ''))
        if (!m || m.rol === 'dueno') return error('no-encontrado')
        m.rol = args.p_rol as RolEspacio
        avisar(e.espacio_id, 'miembros', { v: 1 })
        return { ok: true }
      })

    case 'espacio_expulsar':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.dueno !== mi.miembroId) return error('sin-permiso')
        const m = miembroDe(e, String(args.p_miembro ?? ''))
        if (!m || m.rol === 'dueno') return error('no-encontrado')
        m.estado = 'expulsado'
        avisar(e.espacio_id, 'miembros', { v: 1 })
        return { ok: true }
      })

    // En local no hay a quién avisar: el reporte solo existe en el servidor real.
    case 'espacio_reportar':
      return { ok: true }

    case 'espacio_salir':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.dueno === mi.miembroId) return error('es-dueno')
        const m = miembroDe(e, mi.miembroId)
        if (!m) return error('no-encontrado')
        m.estado = 'fuera'
        avisar(e.espacio_id, 'miembros', { v: 1 })
        return { ok: true }
      })

    case 'espacio_borrar':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.dueno !== mi.miembroId) return error('sin-permiso')
        avisar(e.espacio_id, 'borrado', { v: 1 })
        delete s.espacios[id]
        for (const ruta of Object.keys(s.archivos)) {
          if (ruta.startsWith(`${id}/`)) delete s.archivos[ruta]
        }
        return { ok: true }
      })

    case 'espacio_push':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (!puedeEditar(miembroDe(e, mi.miembroId))) return error('sin-permiso')
        const entrantes = Array.isArray(args.p_cambios) ? args.p_cambios : []
        if (entrantes.length > 100) return error('peticion-invalida')
        let aplicados = 0
        for (const bruto of entrantes as { uid: string; tipo: string; datos: unknown }[]) {
          if (JSON.stringify(bruto.datos ?? null).length > TOPE_CAMBIO) return error('cambio-grande')
          // Idempotencia por uid, igual que el `on conflict do nothing` del servidor.
          if (e.cambios.some((c) => c.uid === bruto.uid)) continue
          e.seq += 1
          e.cambios.push({
            seq: e.seq,
            uid: bruto.uid,
            autor: mi.miembroId,
            tipo: bruto.tipo,
            datos: bruto.datos,
            creado_en: new Date().toISOString(),
          })
          aplicados += 1
          avisar(e.espacio_id, 'cambio', { v: 1, seq: e.seq, tipo: bruto.tipo, de: mi.miembroId })
        }
        e.actualizado_en = new Date().toISOString()
        return { aplicados, max_seq: e.seq }
      })

    case 'espacio_pull':
      return conStore((s) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (miembroDe(e, mi.miembroId)?.estado !== 'activo') return error('sin-permiso')
        const desde = typeof args.p_desde === 'number' ? args.p_desde : 0
        const pagina = e.cambios.filter((c) => c.seq > desde).slice(0, PAGINA)
        const maxSeq = pagina.length ? pagina[pagina.length - 1].seq : desde
        return {
          // Todo el log, también lo propio (como el servidor real): al reabrir
          // hay que recuperar lo que uno mismo escribió desde el último snapshot.
          cambios: pagina,
          max_seq: maxSeq,
          mas: e.cambios.some((c) => c.seq > maxSeq),
          snapshot_seq: e.snapshot_seq,
        }
      })

    case 'espacio_snapshot_leer':
      return conStore((s) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (miembroDe(e, mi.miembroId)?.estado !== 'activo') return error('sin-permiso')
        return { snapshot: e.snapshot, snapshot_seq: e.snapshot_seq }
      })

    case 'espacio_snapshot':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (!puedeEditar(miembroDe(e, mi.miembroId))) return error('sin-permiso')
        if (JSON.stringify(args.p_estado ?? null).length > TOPE_SNAPSHOT) return error('snapshot-grande')
        const hasta = typeof args.p_hasta_seq === 'number' ? args.p_hasta_seq : e.seq
        if (hasta < e.snapshot_seq || hasta > e.seq) return error('peticion-invalida')
        e.snapshot = args.p_estado
        e.snapshot_seq = hasta
        e.cambios = e.cambios.filter((c) => c.seq > hasta)
        avisar(e.espacio_id, 'cambio', { v: 1, seq: e.seq, tipo: 'snapshot', de: mi.miembroId })
        return { ok: true, snapshot_seq: e.snapshot_seq }
      })

    case 'espacio_bloquear':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (!puedeEditar(miembroDe(e, mi.miembroId))) return error('sin-permiso')
        const actual = bloqueoDe(e)
        if (actual && actual.por !== mi.miembroId) return error('bloqueado')
        e.bloqueo_por = mi.miembroId
        e.bloqueo_hasta = new Date(Date.now() + 5 * 60_000).toISOString()
        avisar(e.espacio_id, 'bloqueo', { v: 1, por: e.bloqueo_por, hasta: e.bloqueo_hasta })
        return { por: e.bloqueo_por, hasta: e.bloqueo_hasta }
      })

    case 'espacio_liberar':
      return conStore((s, avisar) => {
        const e = s.espacios[id]
        if (!e) return error('no-encontrado')
        if (e.bloqueo_por !== mi.miembroId) return error('sin-permiso')
        e.bloqueo_por = null
        e.bloqueo_hasta = null
        avisar(e.espacio_id, 'bloqueo', { v: 1, por: null, hasta: null })
        return { ok: true }
      })

    default:
      return error('peticion-invalida')
  }
}

// ─── archivos (el bucket, en data URL) ───────────────────────────────────────

export async function subirArchivoLocal(ruta: string, blob: Blob): Promise<void> {
  const dataUrl = await new Promise<string>((resolver, fallar) => {
    const fr = new FileReader()
    fr.onload = () => resolver(String(fr.result))
    fr.onerror = () => fallar(new ErrorEspacio('servidor', 'No se pudo leer el archivo'))
    fr.readAsDataURL(blob)
  })
  await conStore((s) => {
    const usado = Object.values(s.archivos).reduce((n, v) => n + v.length, 0)
    if (usado + dataUrl.length > TOPE_ARCHIVOS) throw new ErrorEspacio('limite')
    s.archivos[ruta] = dataUrl
  })
}

export async function descargarArchivoLocal(ruta: string): Promise<Blob> {
  const dataUrl = await conStore((s) => s.archivos[ruta])
  if (!dataUrl) throw new ErrorEspacio('no-encontrado')
  return (await fetch(dataUrl)).blob()
}

export async function borrarArchivoLocal(ruta: string): Promise<void> {
  await conStore((s) => {
    delete s.archivos[ruta]
  })
}

export async function borrarCarpetaLocal(espacioId: string): Promise<void> {
  await conStore((s) => {
    for (const ruta of Object.keys(s.archivos)) {
      if (ruta.startsWith(`${espacioId}/`)) delete s.archivos[ruta]
    }
  })
}
