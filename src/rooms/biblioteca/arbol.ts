import type { MensajeIA } from '../../core/chat/ia'
import { conversacionesBiblioRepo, entradasBiblioRepo, temasArbolRepo } from '../../core/data/repository'
import { PILAR_GENERAL, getPilar } from './constantes'
import { cargarIndice, campos, temasDelCampo } from './semilla'
import {
  clasificarConversacion,
  ubicarConversacion,
  destilarConversacion,
  generarSubtemas,
  type CandidatoTema,
} from './sabio'

/** Nodo del índice del que nace una charla (estático de pilares.ts o dinámico). */
export interface AnclaTema {
  temaId: string
  pilarId: string
}

/** Id único para un nodo dinámico (comparte espacio de ids con pilares.ts). */
function nuevoTemaId(): string {
  return `din-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Mismo idioma que dispatcher.ts/cocina para quitar acentos tras NFD.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Título normalizado para deduplicar (minúsculas, sin acentos). */
function normalizarTitulo(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
}

/** Resuelve un temaId contra el índice vivo (fábrica parcheada + propios). */
export async function resolverTema(
  temaId: string,
): Promise<{ temaId: string; pilarId: string; titulo: string } | null> {
  const n = (await cargarIndice()).porId.get(temaId)
  return n ? { temaId: n.id, pilarId: n.pilarId, titulo: n.titulo } : null
}

/**
 * Candidatos a padre de TODOS los campos, para la llamada única de ubicación.
 * Los propios van primero (son los que el usuario acaba de crear y donde más
 * sentido tiene colgar algo nuevo); `ubicarConversacion` recorta por campo.
 */
async function candidatosDeTodos(): Promise<Record<string, CandidatoTema[]>> {
  const ix = await cargarIndice()
  const mapa: Record<string, CandidatoTema[]> = {}
  for (const campo of campos(ix)) {
    const nodos = temasDelCampo(ix, campo.id).map(({ nodo }) => ({
      id: nodo.id,
      titulo: nodo.titulo,
      rama: nodo.padreId && nodo.padreId !== campo.id ? ix.porId.get(nodo.padreId)?.titulo : undefined,
      fabrica: nodo.fabrica,
    }))
    mapa[campo.id] = [
      ...nodos.filter((n) => !n.fabrica).map(({ fabrica: _f, ...n }) => n),
      ...nodos.filter((n) => n.fabrica).map(({ fabrica: _f, ...n }) => n),
    ]
  }
  return mapa
}

/** Todos los temas visibles de un campo, con la rama de la que cuelgan. */
async function temasDelPilar(pilarId: string): Promise<{ id: string; titulo: string; rama?: string }[]> {
  const ix = await cargarIndice()
  return temasDelCampo(ix, pilarId).map(({ nodo }) => ({
    id: nodo.id,
    titulo: nodo.titulo,
    rama: nodo.padreId && nodo.padreId !== pilarId ? ix.porId.get(nodo.padreId)?.titulo : undefined,
  }))
}

/**
 * Crea el nodo propio de una charla bajo el padre elegido. Si ya existe un
 * tema del pilar con el mismo título (estático o dinámico), lo REUTILIZA
 * (repetir una pregunta no duplica el índice).
 */
async function crearNodoCharla(datos: {
  pilarId: string
  padreId: string | null
  titulo: string
  descripcion: string
  conversacionId: number
}): Promise<{ temaId: string; pilarId: string; titulo: string }> {
  const clave = normalizarTitulo(datos.titulo)
  const existente = (await temasDelPilar(datos.pilarId)).find((t) => normalizarTitulo(t.titulo) === clave)
  if (existente) return { temaId: existente.id, pilarId: datos.pilarId, titulo: existente.titulo }
  const temaId = nuevoTemaId()
  await temasArbolRepo.add({
    temaId,
    pilarId: datos.pilarId,
    padreId: datos.padreId,
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    creadoEn: new Date().toISOString(),
    conversacionId: datos.conversacionId,
    nivel: 'tema',
  })
  return { temaId, pilarId: datos.pilarId, titulo: datos.titulo }
}

/**
 * Ubica una charla en el índice tras su PRIMERA respuesta: pone título (y
 * campo si es libre) y crea su nodo BAJO el mejor padre del campo (colocación
 * profunda con la IA). Ya NO genera subtemas: eso lo decide el usuario con el
 * panel 🌿. Fire-and-forget: nunca lanza; las charlas ancladas no se re-ubican.
 */
export async function ubicarCharla(conversacionId: number, mensajes: MensajeIA[]): Promise<void> {
  try {
    const conv = (await conversacionesBiblioRepo.list()).find((c) => c.id === conversacionId)
    if (!conv) return

    // Anclada o ya ubicada: solo completar el título si falta.
    if (conv.temaId && (await resolverTema(conv.temaId))) {
      if (!conv.titulo) {
        const r = await clasificarConversacion(mensajes)
        await conversacionesBiblioRepo.update(conversacionId, { titulo: r.titulo })
      }
      return
    }

    // Campo, título y nodo padre en UNA llamada: los candidatos de todos los
    // pilares viajan por adelantado porque el padre se elige en el mismo turno.
    const candidatosPorPilar = await candidatosDeTodos()
    const r = await ubicarConversacion(mensajes, candidatosPorPilar)
    await conversacionesBiblioRepo.update(conversacionId, {
      pilarId: r.pilarId,
      titulo: conv.titulo || r.titulo,
    })
    if (r.pilarId === PILAR_GENERAL.id) return // sin campo real no hay dónde colgar

    // Guardia de colocación única (doble envío rápido del primer turno).
    const fresca = (await conversacionesBiblioRepo.list()).find((c) => c.id === conversacionId)
    if (!fresca || fresca.temaId) return

    const nodo = await crearNodoCharla({
      pilarId: r.pilarId,
      padreId: r.padreId,
      titulo: conv.titulo || r.titulo,
      descripcion: r.descripcion,
      conversacionId,
    })
    await conversacionesBiblioRepo.update(conversacionId, { temaId: nodo.temaId })
  } catch {
    // La charla queda sin ubicar; ✨ Clasificar permite reintentar.
  }
}

/** Charlas con un destilado en vuelo: evita que dos disparos escriban dos entradas. */
const destilando = new Set<number>()

/**
 * Destila la charla y escribe SU entrada de la enciclopedia (una por charla:
 * si ya existe, se actualiza). Ya no hay botón: destilar es parte de clasificar,
 * y al salir de la charla se rehace si hubo mensajes nuevos.
 *
 * Fire-and-forget: nunca lanza. Si la IA falla, la charla se queda sin entrada
 * y el ✨ Clasificar permite reintentarlo.
 */
export async function destilarCharla(conversacionId: number, mensajes: MensajeIA[]): Promise<void> {
  if (!mensajes.length || destilando.has(conversacionId)) return
  destilando.add(conversacionId)
  try {
    const conv = (await conversacionesBiblioRepo.list()).find((c) => c.id === conversacionId)
    if (!conv) return
    const ancla = conv.temaId ? await resolverTema(conv.temaId) : null
    const d = await destilarConversacion(mensajes, conv.pilarId, ancla)
    const ahora = new Date().toISOString()
    const datos = {
      titulo: d.titulo,
      pilarId: d.pilarId,
      temaId: d.temaId,
      resumen: d.resumen,
      puntosClave: d.puntosClave,
      actualizadoEn: ahora,
    }
    const previa = (await entradasBiblioRepo.list()).find((e) => e.conversacionId === conversacionId)
    if (previa?.id != null) await entradasBiblioRepo.update(previa.id, datos)
    else await entradasBiblioRepo.add({ ...datos, conversacionId, creadoEn: ahora })
    await conversacionesBiblioRepo.update(conversacionId, { destiladaEn: ahora })
  } catch {
    // Sin entrada esta vez; el ✨ Clasificar la vuelve a intentar.
  } finally {
    destilando.delete(conversacionId)
  }
}

/**
 * Lo que pasa tras la primera respuesta (y cada vez que pulsas ✨): la charla se
 * clasifica, se cuelga del árbol y SALE YA DESTILADA como entrada.
 */
export async function clasificarYDestilar(conversacionId: number, mensajes: MensajeIA[]): Promise<void> {
  await ubicarCharla(conversacionId, mensajes)
  await destilarCharla(conversacionId, mensajes)
}

/**
 * Sugerencias de ramas nuevas bajo el ancla (SIN insertar): el usuario elige
 * cuáles agregar desde el panel 🌿. Nunca lanza (devuelve []).
 */
export async function sugerirRamas(
  mensajes: MensajeIA[],
  ancla: { temaId: string; pilarId: string; titulo: string },
): Promise<{ titulo: string; descripcion: string }[]> {
  try {
    const existentes = (await temasDelPilar(ancla.pilarId)).map((t) => t.titulo)
    const claves = new Set(existentes.map(normalizarTitulo))
    const propuestas = await generarSubtemas(mensajes, {
      pilarTitulo: getPilar(ancla.pilarId).titulo,
      temaTitulo: ancla.titulo,
      existentes,
    })
    const vistas = new Set<string>()
    return propuestas.filter((p) => {
      const clave = normalizarTitulo(p.titulo)
      if (!clave || claves.has(clave) || vistas.has(clave)) return false
      vistas.add(clave)
      return true
    })
  } catch {
    return []
  }
}

/**
 * Inserta las ramas elegidas bajo el padre y devuelve sus ids (reutilizando
 * el tema existente si el título ya estaba en el pilar), para poder anclar
 * charlas nuevas a ellas.
 */
export async function agregarRamas(
  pilarId: string,
  padreId: string,
  ramas: { titulo: string; descripcion: string }[],
  conversacionId?: number,
): Promise<{ temaId: string; titulo: string }[]> {
  const porClave = new Map((await temasDelPilar(pilarId)).map((t) => [normalizarTitulo(t.titulo), t]))
  const ahora = new Date().toISOString()
  const resultado: { temaId: string; titulo: string }[] = []
  for (const r of ramas) {
    const clave = normalizarTitulo(r.titulo)
    if (!clave) continue
    const existente = porClave.get(clave)
    if (existente) {
      resultado.push({ temaId: existente.id, titulo: existente.titulo })
      continue
    }
    const temaId = nuevoTemaId()
    try {
      await temasArbolRepo.add({
        temaId,
        pilarId,
        padreId,
        titulo: r.titulo,
        descripcion: r.descripcion,
        creadoEn: ahora,
        conversacionId,
        nivel: 'tema',
      })
      porClave.set(clave, { id: temaId, titulo: r.titulo })
      resultado.push({ temaId, titulo: r.titulo })
    } catch {
      // Colisión de temaId (rarísima): se omite esa rama, el lote sigue.
    }
  }
  return resultado
}
