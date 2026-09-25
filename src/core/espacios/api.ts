/**
 * Llamadas de los espacios compartidos: RPCs `espacio_*` (security definer con
 * `auth.uid()`, patrón `sync_push`) y el bucket privado `espacio-archivos`.
 * Molde literal de `core/partida/api.ts`: el contrato de error del servidor es
 * `{error:'<codigo>'}` en el JSON (nunca `raise`) y aquí se convierte en
 * `ErrorEspacio` para que la UI lo traduzca.
 *
 * Ningún uuid ajeno entra ni sale: se invita por `contacto_id` del buzón y se
 * expulsa por `miembro_id` opaco.
 *
 * Con `?espacioLocal=<codigo>` todo esto se atiende en la propia pestaña
 * (`servidorLocal.ts`), con el mismo JSON.
 */
import type { MotivoReporte } from '../buzon/api'
import { asegurarNormas } from '../buzon/normas'
import { obtenerSupabase } from '../cuenta/supabase'
import type { TFunc } from '../i18n/useT'
import { espacioLocal } from './transporte'
import {
  ErrorEspacio,
  VERSION_PROTO_ESPACIO,
  type CambioEspacio,
  type CodigoErrorEspacio,
  type Espacio,
  type MiembroEspacio,
  type RolEspacio,
  type TipoEspacio,
} from './tipos'

const BUCKET = 'espacio-archivos'

const CODIGOS = new Set<CodigoErrorEspacio>([
  'sin-sesion',
  'peticion-invalida',
  'limite',
  'no-encontrado',
  'no-contacto',
  'sin-permiso',
  'expulsado',
  'enlace-inactivo',
  'bloqueado',
  'es-dueno',
  'cambio-grande',
  'snapshot-grande',
  'version',
])

const codigoDe = (v: string): CodigoErrorEspacio =>
  CODIGOS.has(v as CodigoErrorEspacio) ? (v as CodigoErrorEspacio) : 'servidor'

async function rpc<T>(nombre: string, args: Record<string, unknown> = {}): Promise<T> {
  if (espacioLocal()) {
    const { rpcLocal } = await import('./servidorLocal')
    const d = (await rpcLocal(nombre, args)) as { error?: unknown } | null
    if (d && typeof d === 'object' && typeof d.error === 'string') throw new ErrorEspacio(codigoDe(d.error))
    return d as T
  }
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorEspacio('sin-backend')
  const { data, error } = await sb.rpc(nombre, args)
  if (error) {
    // supabase-js envuelve el fallo de fetch en un PostgrestError sin código.
    if (!error.code || /fetch|network|conexi/i.test(error.message)) throw new ErrorEspacio('red', error.message)
    if (error.code === 'PGRST301' || error.code === '401') throw new ErrorEspacio('sin-sesion', error.message)
    throw new ErrorEspacio('servidor', error.message)
  }
  const d = data as { error?: unknown } | null
  if (d && typeof d === 'object' && typeof d.error === 'string') throw new ErrorEspacio(codigoDe(d.error))
  return data as T
}

// ─── del JSON del servidor a los tipos del cliente ───────────────────────────

interface FilaEspacio {
  espacio_id: string
  tipo: TipoEspacio
  titulo: string | null
  meta: Record<string, unknown> | null
  proto: number
  rol: RolEspacio
  yo: string
  dueno_alias: string | null
  seq: number
  snapshot_seq: number
  bloqueo: { por: string; hasta: string } | null
  n_miembros: number
  creado_en: string
  actualizado_en: string
  token_ver?: string | null
  token_editar?: string | null
  enlace_ver?: boolean
  enlace_editar?: boolean
}

interface FilaMiembro {
  miembro_id: string
  rol: RolEspacio
  estado: 'activo' | 'fuera'
  alias: string | null
  nombre: string | null
  emoji: string | null
  retrato?: string | null
  yo: boolean
}

function aEspacio(d: FilaEspacio): Espacio {
  const conTokens = d.token_ver !== undefined || d.token_editar !== undefined
  return {
    espacioId: d.espacio_id,
    tipo: d.tipo,
    titulo: d.titulo ?? '',
    meta: d.meta ?? {},
    proto: d.proto,
    rol: d.rol,
    yo: d.yo,
    duenoAlias: d.dueno_alias ?? '',
    seq: d.seq ?? 0,
    snapshotSeq: d.snapshot_seq ?? 0,
    bloqueo: d.bloqueo ?? null,
    nMiembros: d.n_miembros ?? 1,
    creadoEn: d.creado_en,
    actualizadoEn: d.actualizado_en,
    ...(conTokens
      ? {
          tokens: {
            ver: d.token_ver ?? null,
            editar: d.token_editar ?? null,
            enlaceVer: d.enlace_ver !== false,
            enlaceEditar: d.enlace_editar !== false,
          },
        }
      : {}),
  }
}

function aMiembro(m: FilaMiembro): MiembroEspacio {
  return {
    miembroId: m.miembro_id,
    rol: m.rol,
    estado: m.estado,
    alias: m.alias ?? '',
    nombre: m.nombre ?? '',
    emoji: m.emoji ?? '🙂',
    retrato: m.retrato ?? null,
    yo: m.yo === true,
  }
}

// ─── RPCs ────────────────────────────────────────────────────────────────────

/** Compartir o entrar por enlace expone a otras personas: antes, las normas de la comunidad. */
async function exigirNormas(): Promise<void> {
  if (!espacioLocal() && !(await asegurarNormas())) throw new ErrorEspacio('normas')
}

export async function crear(
  tipo: TipoEspacio,
  titulo: string,
  meta: Record<string, unknown> = {},
): Promise<Espacio> {
  await exigirNormas()
  const r = await rpc<{ espacio: FilaEspacio }>('espacio_crear', {
    p_tipo: tipo,
    p_titulo: titulo,
    p_meta: meta,
    p_proto: VERSION_PROTO_ESPACIO,
  })
  return aEspacio(r.espacio)
}

export async function listar(): Promise<Espacio[]> {
  const r = await rpc<{ espacios: FilaEspacio[] }>('espacio_listar')
  return (r.espacios ?? []).map(aEspacio)
}

export async function estado(espacioId: string): Promise<{ espacio: Espacio; miembros: MiembroEspacio[] }> {
  const r = await rpc<{ espacio: FilaEspacio; miembros: FilaMiembro[] }>('espacio_estado', { p_id: espacioId })
  return { espacio: aEspacio(r.espacio), miembros: (r.miembros ?? []).map(aMiembro) }
}

export async function editar(espacioId: string, titulo: string, meta: Record<string, unknown>): Promise<void> {
  await rpc('espacio_editar', { p_id: espacioId, p_titulo: titulo, p_meta: meta })
}

export async function entrar(token: string): Promise<{ espacio: Espacio; miembros: MiembroEspacio[] }> {
  await exigirNormas()
  const r = await rpc<{ espacio: FilaEspacio; miembros: FilaMiembro[] }>('espacio_entrar', {
    p_token: token,
    p_proto: VERSION_PROTO_ESPACIO,
  })
  return { espacio: aEspacio(r.espacio), miembros: (r.miembros ?? []).map(aMiembro) }
}

/** Invita a un CONTACTO ACEPTADO del buzón. Devuelve su `miembroId`. */
export async function invitar(espacioId: string, contactoId: string, rol: RolEspacio): Promise<string> {
  const r = await rpc<{ miembro_id: string }>('espacio_invitar', {
    p_id: espacioId,
    p_contacto: contactoId,
    p_rol: rol,
  })
  return r.miembro_id
}

export interface EnlacesEspacio {
  tokenVer: string | null
  tokenEditar: string | null
  enlaceVer: boolean
  enlaceEditar: boolean
}

export async function rotarEnlace(
  espacioId: string,
  cual: 'ver' | 'editar',
  activo: boolean,
): Promise<EnlacesEspacio> {
  const r = await rpc<{
    token_ver: string | null
    token_editar: string | null
    enlace_ver: boolean
    enlace_editar: boolean
  }>('espacio_rotar_enlace', { p_id: espacioId, p_cual: cual, p_activo: activo })
  return {
    tokenVer: r.token_ver ?? null,
    tokenEditar: r.token_editar ?? null,
    enlaceVer: r.enlace_ver !== false,
    enlaceEditar: r.enlace_editar !== false,
  }
}

export async function fijarRol(espacioId: string, miembroId: string, rol: RolEspacio): Promise<void> {
  await rpc('espacio_rol', { p_id: espacioId, p_miembro: miembroId, p_rol: rol })
}

export async function expulsar(espacioId: string, miembroId: string): Promise<void> {
  await rpc('espacio_expulsar', { p_id: espacioId, p_miembro: miembroId })
}

/** Reporta el espacio (sin `miembroId`: a quien lo compartió) o a uno de sus miembros. */
export async function reportar(espacioId: string, miembroId: string | null, motivo: MotivoReporte, detalle = ''): Promise<void> {
  await rpc('espacio_reportar', { p_id: espacioId, p_miembro: miembroId, p_motivo: motivo, p_detalle: detalle })
}

export async function salir(espacioId: string): Promise<void> {
  await rpc('espacio_salir', { p_id: espacioId })
}

export async function borrar(espacioId: string): Promise<void> {
  await rpc('espacio_borrar', { p_id: espacioId })
}

/** Una operación tal como viaja a `espacio_push`. */
export interface CambioSalida {
  uid: string
  tipo: string
  datos: unknown
}

export async function push(
  espacioId: string,
  cambios: CambioSalida[],
): Promise<{ aplicados: number; maxSeq: number }> {
  const r = await rpc<{ aplicados: number; max_seq: number }>('espacio_push', {
    p_id: espacioId,
    p_cambios: cambios,
  })
  return { aplicados: r.aplicados ?? 0, maxSeq: r.max_seq ?? 0 }
}

interface FilaCambio {
  seq: number
  uid: string
  autor: string
  tipo: string
  datos: unknown
  creado_en: string
}

export async function pull(
  espacioId: string,
  desde: number,
): Promise<{ cambios: CambioEspacio[]; maxSeq: number; mas: boolean; snapshotSeq: number }> {
  const r = await rpc<{ cambios: FilaCambio[]; max_seq: number; mas: boolean; snapshot_seq: number }>(
    'espacio_pull',
    { p_id: espacioId, p_desde: desde },
  )
  return {
    cambios: (r.cambios ?? []).map((c) => ({
      seq: c.seq,
      uid: c.uid,
      autor: c.autor,
      tipo: c.tipo,
      datos: c.datos,
      creadoEn: c.creado_en,
    })),
    maxSeq: r.max_seq ?? desde,
    mas: r.mas === true,
    snapshotSeq: r.snapshot_seq ?? 0,
  }
}

export async function leerSnapshot(espacioId: string): Promise<{ snapshot: unknown; snapshotSeq: number }> {
  const r = await rpc<{ snapshot: unknown; snapshot_seq: number }>('espacio_snapshot_leer', { p_id: espacioId })
  return { snapshot: r.snapshot ?? null, snapshotSeq: r.snapshot_seq ?? 0 }
}

export async function guardarSnapshot(espacioId: string, estado: unknown, hastaSeq: number): Promise<number> {
  const r = await rpc<{ snapshot_seq: number }>('espacio_snapshot', {
    p_id: espacioId,
    p_estado: estado,
    p_hasta_seq: hastaSeq,
  })
  return r.snapshot_seq ?? hastaSeq
}

export async function bloquear(espacioId: string): Promise<{ por: string; hasta: string }> {
  return rpc<{ por: string; hasta: string }>('espacio_bloquear', { p_id: espacioId })
}

export async function liberar(espacioId: string): Promise<void> {
  await rpc('espacio_liberar', { p_id: espacioId })
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/** Sube un binario bajo la carpeta del espacio (`<espacio>/<resto>`). */
export async function subirArchivo(espacioId: string, resto: string, blob: Blob): Promise<string> {
  const ruta = `${espacioId}/${resto}`
  if (espacioLocal()) {
    const { subirArchivoLocal } = await import('./servidorLocal')
    await subirArchivoLocal(ruta, blob)
    return ruta
  }
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorEspacio('sin-backend')
  const mime = blob.type || 'application/octet-stream'
  const { error } = await sb.storage.from(BUCKET).upload(ruta, blob, { upsert: true, contentType: mime })
  if (error) throw new ErrorEspacio(/fetch|network/i.test(error.message) ? 'red' : 'servidor', error.message)
  return ruta
}

export async function descargarArchivo(ruta: string): Promise<Blob> {
  if (espacioLocal()) {
    const { descargarArchivoLocal } = await import('./servidorLocal')
    return descargarArchivoLocal(ruta)
  }
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorEspacio('sin-backend')
  const { data, error } = await sb.storage.from(BUCKET).download(ruta)
  if (error || !data) throw new ErrorEspacio('red', error?.message)
  return data
}

/**
 * Borra UN archivo del espacio (best-effort). Lo usa la compactación del dibujo
 * para no dejar atrás los PNG del snapshot anterior, que ya no mira nadie.
 */
export async function borrarArchivo(ruta: string): Promise<void> {
  if (espacioLocal()) {
    const { borrarArchivoLocal } = await import('./servidorLocal')
    await borrarArchivoLocal(ruta)
    return
  }
  const sb = await obtenerSupabase()
  if (!sb) return
  await sb.storage.from(BUCKET).remove([ruta])
}

/**
 * Borra todo lo que cuelga del espacio (best-effort). Se llama ANTES de
 * `espacio_borrar`: al caer la fila, la policy de Storage ya no reconoce al
 * usuario como miembro y denegaría el borrado (igual que `borrarCarpetaHilo`).
 * `list` no es recursivo: las subcarpetas se recorren a mano.
 */
export async function borrarCarpetaEspacio(espacioId: string): Promise<void> {
  if (espacioLocal()) {
    const { borrarCarpetaLocal } = await import('./servidorLocal')
    await borrarCarpetaLocal(espacioId)
    return
  }
  const sb = await obtenerSupabase()
  if (!sb) return
  try {
    const archivos: string[] = []
    const recorrer = async (prefijo: string, nivel: number) => {
      const { data } = await sb.storage.from(BUCKET).list(prefijo, { limit: 1000 })
      for (const f of data ?? []) {
        const ruta = `${prefijo}/${f.name}`
        // Las carpetas vienen sin `id`; los archivos sí lo traen.
        if (f.id) archivos.push(ruta)
        else if (nivel < 3) await recorrer(ruta, nivel + 1)
      }
    }
    await recorrer(espacioId, 0)
    if (archivos.length) await sb.storage.from(BUCKET).remove(archivos)
  } catch {
    // Huérfanos aceptados como deuda conocida (misma decisión que el buzón).
  }
}

// ─── errores ─────────────────────────────────────────────────────────────────

/** El mensaje traducido de un fallo de espacios (cualquier otro cae en «servidor»). */
export function mensajeErrorEspacio(e: unknown, t: TFunc): string {
  const codigo: CodigoErrorEspacio = e instanceof ErrorEspacio ? e.codigo : 'servidor'
  switch (codigo) {
    case 'sin-sesion':
      return t('esp.error.sin-sesion', 'Inicia sesión para compartir')
    case 'sin-backend':
      return t('esp.error.sin-backend', 'Esta versión no puede compartir')
    case 'peticion-invalida':
      return t('esp.error.peticion-invalida', 'La petición no es válida')
    case 'limite':
      return t('esp.error.limite', 'Demasiadas veces seguidas. Espera un momento.')
    case 'no-encontrado':
      return t('esp.error.no-encontrado', 'Ese contenido compartido ya no existe')
    case 'no-contacto':
      return t('esp.error.no-contacto', 'Solo puedes invitar a contactos aceptados')
    case 'sin-permiso':
      return t('esp.error.sin-permiso', 'No tienes permiso para hacer eso aquí')
    case 'expulsado':
      return t('esp.error.expulsado', 'Ya no puedes entrar aquí')
    case 'enlace-inactivo':
      return t('esp.error.enlace-inactivo', 'Ese enlace ya no funciona')
    case 'bloqueado':
      return t('esp.error.bloqueado', 'Otra persona está editando ahora mismo')
    case 'es-dueno':
      return t('esp.error.es-dueno', 'Eres quien lo compartió: bórralo en vez de salir')
    case 'cambio-grande':
      return t('esp.error.cambio-grande', 'Ese cambio es demasiado grande para enviarlo')
    case 'snapshot-grande':
      return t('esp.error.snapshot-grande', 'Esto ya es demasiado grande para compartirlo')
    case 'version':
      return t('esp.error.version', 'Uno de los dos tiene una versión distinta de la app')
    case 'normas':
      return t('esp.error.normas', 'Para compartir con otras personas acepta antes las normas de la comunidad')
    case 'red':
      return t('esp.error.red', 'Sin conexión con el servidor')
    default:
      return t('esp.error.servidor', 'No se pudo completar. Inténtalo de nuevo.')
  }
}
