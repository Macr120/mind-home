import type { MensajeIA } from '../../core/chat/ia'
import { conversacionesBiblioRepo, temasArbolRepo } from '../../core/data/repository'
import { PILAR_GENERAL, getPilar } from './constantes'
import { PILARES, todosLosTemas } from './pilares'
import {
  clasificarConversacion,
  ubicarConversacion,
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

/** Resuelve un temaId contra el índice estático y luego el dinámico. */
export async function resolverTema(
  temaId: string,
): Promise<{ temaId: string; pilarId: string; titulo: string } | null> {
  const est = todosLosTemas().find((t) => t.id === temaId)
  if (est) return { temaId: est.id, pilarId: est.pilarId, titulo: est.titulo }
  const din = (await temasArbolRepo.list()).find((n) => n.temaId === temaId)
  return din ? { temaId: din.temaId, pilarId: din.pilarId, titulo: din.titulo } : null
}

/**
 * Candidatos a padre de TODOS los pilares, para la llamada única de ubicación.
 * Los dinámicos van primero (son los que el usuario acaba de crear y donde más
 * sentido tiene colgar algo nuevo); `ubicarConversacion` recorta por pilar.
 */
async function candidatosDeTodos(): Promise<Record<string, CandidatoTema[]>> {
  const dinamicos = await temasArbolRepo.list()
  const mapa: Record<string, CandidatoTema[]> = {}
  for (const p of PILARES) {
    const propios = dinamicos
      .filter((n) => n.pilarId === p.id)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .map((n) => ({ id: n.temaId, titulo: n.titulo }))
    const estaticos = p.ramas.flatMap((rama) =>
      rama.temas.map((t) => ({ id: t.id, titulo: t.titulo, rama: rama.titulo })),
    )
    mapa[p.id] = [...propios, ...estaticos]
  }
  return mapa
}

/** Todos los temas de un pilar (estáticos con su rama + dinámicos). */
async function temasDelPilar(pilarId: string): Promise<{ id: string; titulo: string; rama?: string }[]> {
  const pilar = PILARES.find((p) => p.id === pilarId)
  const estaticos = (pilar?.ramas ?? []).flatMap((rama) =>
    rama.temas.map((t) => ({ id: t.id, titulo: t.titulo, rama: rama.titulo })),
  )
  const dinamicos = (await temasArbolRepo.list())
    .filter((n) => n.pilarId === pilarId)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    .map((n) => ({ id: n.temaId, titulo: n.titulo }))
  return [...estaticos, ...dinamicos]
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
      })
      porClave.set(clave, { id: temaId, titulo: r.titulo })
      resultado.push({ temaId, titulo: r.titulo })
    } catch {
      // Colisión de temaId (rarísima): se omite esa rama, el lote sigue.
    }
  }
  return resultado
}
