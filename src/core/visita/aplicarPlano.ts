/**
 * El plano de la casa, LADO INVITADO: vuelca lo que mandó el anfitrión en la BD
 * `mind-home-visita`.
 *
 * NO reutiliza `restaurarSnapshot` (`demo/casaSnapshot.ts`) a propósito: aquello
 * escribe lo que venga —es una foto que hizo esta misma app— y esto es un
 * paquete de OTRA persona que llegó por la red. Aquí el orden es: tope de bytes
 * antes de parsear, allowlist de tablas, allowlist de campos, coerción numérica
 * acotada, truncado de textos y rechazo de todo `data:`; y solo entonces una
 * única transacción `rw` marcada como escritura silenciosa (que es lo que la
 * exime del guard, ver `data/visitaGuard.ts`).
 *
 * Corre dentro del `db.on('ready')` de `db.ts` y por eso escribe con el `vip`
 * que Dexie entrega: `db` está retenido hasta que esta promesa resuelva.
 */
import type Dexie from 'dexie'
import { salaVisitada } from '../edicion'
import { abrirApp } from '../abrirApp'
import { marcarEscrituraSilenciosa } from '../data/sync/middleware'
import { notificarRepintado } from '../data/sync/repintar'
import { serializarRopa } from '../house/apariencia'
import { aAvatar } from '../partida/aspecto'
import { JUEGOS_INVITABLES, posicionDeJuego, type JuegoInvitable } from '../partida/juegosInvitables'
import { esObjetoLibreria, useDiseño } from '../state/disenoStore'
import { aplicarSpawnVisita, guardarSpawnVisita } from '../../demo/spawn'
import { traerPlano } from './almacenPlano'
import { CAMPOS_PLANO, tablasDelPlano } from './plano'
import { aspectoDelInvitado, consumirJuegoVisita, juegoPendienteVisita, useVisita } from './visitaStore'

/** Tope del plano YA inflado. Se comprueba ANTES de parsear el JSON. */
export const TOPE_PLANO_BYTES = 4 * 1024 * 1024

const MAX_FILAS = 20_000
const MAX_TEXTO = 4_000
const MAX_ELEMENTOS = 4_000
const MAX_CLAVES = 400
const MAX_HONDO = 6
/** Ni una coordenada, fecha ni contador de la casa se sale de aquí. */
const NUM_TOPE = 1e12

const CLAVES_PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Un valor del plano, acotado. Devuelve `undefined` para lo que no se acepta:
 * cadenas `data:` (una imagen disfrazada), números no finitos, objetos que no
 * son literales y cualquier cosa más honda de `MAX_HONDO`.
 */
function limpiar(v: unknown, hondo: number): unknown {
  if (v === null) return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return undefined
    return Math.min(NUM_TOPE, Math.max(-NUM_TOPE, v))
  }
  if (typeof v === 'string') {
    if (/^\s*data:/i.test(v)) return undefined
    return v.length > MAX_TEXTO ? v.slice(0, MAX_TEXTO) : v
  }
  if (hondo >= MAX_HONDO) return undefined
  if (Array.isArray(v)) {
    const salida: unknown[] = []
    for (const item of v.slice(0, MAX_ELEMENTOS)) {
      const limpio = limpiar(item, hondo + 1)
      if (limpio !== undefined) salida.push(limpio)
    }
    return salida
  }
  if (typeof v !== 'object') return undefined
  // Solo objetos literales: lo que trae `JSON.parse` y nada más.
  const proto = Object.getPrototypeOf(v) as unknown
  if (proto !== Object.prototype && proto !== null) return undefined
  const salida: Record<string, unknown> = {}
  let claves = 0
  for (const [k, item] of Object.entries(v as Record<string, unknown>)) {
    if (CLAVES_PROHIBIDAS.has(k) || k.length > 120) continue
    if (++claves > MAX_CLAVES) break
    const limpio = limpiar(item, hondo + 1)
    if (limpio !== undefined) salida[k] = limpio
  }
  return salida
}

/** Una fila del plano reducida a los campos permitidos de su tabla. */
function filaSegura(tabla: string, bruta: unknown): Record<string, unknown> | null {
  if (typeof bruta !== 'object' || bruta === null || Array.isArray(bruta)) return null
  const fila = bruta as Record<string, unknown>
  const salida: Record<string, unknown> = {}
  for (const campo of CAMPOS_PLANO[tabla]) {
    if (!(campo in fila)) continue
    const limpio = limpiar(fila[campo], 0)
    if (limpio !== undefined) salida[campo] = limpio
  }
  // Los ids se CONSERVAN (layout → cuartos, animales → corrales): sin ellos la
  // casa llega desarmada. Uno inventado por el emisor no puede hacer daño: la
  // BD es desechable y no sale de esta pestaña.
  const id = salida.id
  if (id !== undefined && typeof id !== 'number' && typeof id !== 'string') delete salida.id
  return Object.keys(salida).length > 0 ? salida : null
}

/** La fila `disenoAvatar` del INVITADO: su personaje, no el del anfitrión. */
function filaAvatar(): Record<string, unknown> | null {
  const aspecto = aspectoDelInvitado()
  if (!aspecto) return null
  // `aAvatar` ya valida campo a campo contra el catálogo local (aspecto.ts).
  const av = aAvatar(aspecto)
  return {
    nombre: av.nombre ?? '',
    cabeza: av.cabeza,
    torso: av.torso,
    piernas: av.piernas,
    escala: av.escala,
    ropa: serializarRopa(av.ropa),
    ropaCustom: '',
    ropaSinTema: '',
    expresion: av.expresion ?? '',
    peinado: av.peinado ?? '',
    peloColor: av.peloColor ?? '',
    forma: av.forma ?? '',
    formaColor: av.formaColor ?? '',
    cuerpoPresetId: av.cuerpoPresetId ?? '',
    modelo3d: av.modelo3d ? JSON.stringify(av.modelo3d) : '',
    animacion: '',
  }
}

/**
 * Dónde aparece el invitado. La puerta real del anfitrión no viaja en el plano
 * v1 (habría que reconstruir sus vanos), así que se usa el borde SUR del mapa:
 * está fuera de la casa, así nadie aparece dentro de la recámara de otro.
 */
function puntoDeEntrada(mapa: Record<string, unknown> | undefined): { x: number; z: number } {
  const rows = typeof mapa?.rows === 'number' && mapa.rows > 0 ? Math.min(mapa.rows, 200) : 16
  const celda = typeof mapa?.celda === 'number' && mapa.celda > 0 ? Math.min(mapa.celda, 20) : 6
  return { x: 0, z: ((rows - 1) / 2) * celda }
}

/**
 * Baja el plano, lo valida y lo vuelca. Lo llama `db.on('ready')`; si algo falla
 * LANZA, y quien llama abandona la visita (C10) en vez de dejar la app sin BD.
 */
export async function volcarVisita(vip: Dexie): Promise<void> {
  const salaId = salaVisitada()
  if (!salaId) throw new Error('visita sin sala')
  const { fijarFase } = useVisita.getState()
  fijarFase('bajando')

  const bruto = await traerPlano(salaId)
  if (bruto.byteLength > TOPE_PLANO_BYTES) throw new Error('plano demasiado grande')
  const plano = JSON.parse(new TextDecoder().decode(bruto)) as unknown
  if (typeof plano !== 'object' || plano === null) throw new Error('plano ilegible')
  const { version, tablas } = plano as { version?: unknown; tablas?: unknown }
  if (version !== 1) throw new Error('plano de otra versión')
  if (typeof tablas !== 'object' || tablas === null) throw new Error('plano sin tablas')

  fijarFase('aplicando')
  const permitidas = new Set(tablasDelPlano(useVisita.getState().apps))
  const limpias: Record<string, Record<string, unknown>[]> = {}
  for (const [nombre, filas] of Object.entries(tablas as Record<string, unknown>)) {
    if (!permitidas.has(nombre) || !Array.isArray(filas)) continue
    if (!vip.tables.some((t) => t.name === nombre)) continue
    const buenas: Record<string, unknown>[] = []
    for (const bruta of filas.slice(0, MAX_FILAS)) {
      const fila = filaSegura(nombre, bruta)
      if (fila) buenas.push(fila)
    }
    limpias[nombre] = buenas
  }

  // Se vacía la BD ENTERA, no solo lo que trae este plano: si no, la casa del
  // anfitrión anterior asomaría por las tablas que este no manda.
  const propias = vip.tables.filter((t) => !t.name.startsWith('_'))
  const avatar = filaAvatar()
  await vip.transaction('rw', propias, async () => {
    marcarEscrituraSilenciosa()
    for (const tabla of propias) await tabla.clear()
    for (const [nombre, filas] of Object.entries(limpias)) {
      if (filas.length) await vip.table(nombre).bulkAdd(filas)
    }
    if (avatar) await vip.table('disenoAvatar').add(avatar)
  })

  // Con un enlace de juego el invitado aterriza EN la cancha, no en la entrada.
  const juego = juegoPendienteVisita()
  const entrada =
    (juego && posicionDeJuego(juego, limpias.objetosCuarto ?? [], 1)) ?? puntoDeEntrada(limpias.mapaConfig?.[0])
  guardarSpawnVisita(entrada.x, entrada.z)
  // En esta carga hay que aplicarlo aquí: el velo de la visita retiene el
  // `<Canvas>` hasta la fase `lista`, así que `Character` aún no ha montado y
  // `playerPos` es su posición inicial (en una recarga lo hace ya `main.tsx`).
  aplicarSpawnVisita()

  // Los 4 stores de la casa hidrataron vacíos mientras la BD estaba retenida:
  // este es el aviso que los vuelve a leer (el mismo del pull del sync).
  notificarRepintado(new Set([...Object.keys(limpias), 'disenoAvatar']))
  fijarFase('lista')
  if (juego) llevarAlJuego(juego)
}

/** ¿La casa recién volcada ya tiene la app de Entretenimiento montada? */
function hayMesa(): boolean {
  return useDiseño.getState().objetos.some((o) => o.plantillaId === 'entretenimiento' && !esObjetoLibreria(o))
}

/**
 * El invitado llegó por un enlace de juego. La cancha ya está resuelta (el
 * spawn cayó en ella) y el paintball lo abre el anfitrión desde su menú de
 * batalla; un juego de mesa, en cambio, necesita que `useDiseño` haya releído
 * la casa que se acaba de volcar, así que se espera a que su objeto aparezca.
 */
function llevarAlJuego(juego: JuegoInvitable): void {
  consumirJuegoVisita()
  const dato = JUEGOS_INVITABLES[juego].mesa
  if (!dato) return
  const abrir = () => abrirApp('entretenimiento', 'mesa', dato)
  if (hayMesa()) {
    abrir()
    return
  }
  // Tope: si la casa del anfitrión no trae esa app, nadie desuscribiría nunca.
  let corte = 0
  const quitar = useDiseño.subscribe(() => {
    if (!hayMesa()) return
    window.clearTimeout(corte)
    quitar()
    abrir()
  })
  corte = window.setTimeout(quitar, 15_000)
}
