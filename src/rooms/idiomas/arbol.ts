import type { MensajeIA } from '../../core/chat/ia'
import { conversacionesIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { cargarTemario, todosVivos } from './temarioVivo'
import { clasificarCharla, type PerfilTutor } from './tutor'

/** Tema del temario del que nace una charla (estático de temario.ts o dinámico). */
export interface AnclaTema {
  temaId: string
  titulo: string
}

/** Id único para un nodo dinámico (comparte espacio de ids con temario.ts). */
function nuevoTemaId(): string {
  return `din-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Mismo idioma que biblioteca/arbol.ts para quitar acentos tras NFD.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Título normalizado para deduplicar (minúsculas, sin acentos). */
function normalizarTitulo(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
}

/** Resuelve un temaId contra el temario VIVO del idioma (fábrica parcheada + propios). */
export async function resolverTema(
  temaId: string,
  idiomaId: number,
): Promise<{ temaId: string; titulo: string; nivel: string } | null> {
  const n = (await cargarTemario(idiomaId)).porId.get(temaId)
  return n ? { temaId: n.id, titulo: n.titulo, nivel: n.nivel } : null
}

/** Todos los temas vivos del idioma, para clasificar y para los selects. */
export async function temasDelIdioma(idiomaId: number): Promise<{ id: string; titulo: string; nivel: string }[]> {
  return todosVivos(await cargarTemario(idiomaId)).map((t) => ({ id: t.id, titulo: t.titulo, nivel: t.nivel }))
}

/**
 * Ubica una charla en el temario tras su PRIMERA respuesta: pone título y, si
 * es libre, su tema (uno existente o un nodo dinámico nuevo bajo el nivel
 * detectado, con dedupe por título). Fire-and-forget: nunca lanza; las charlas
 * ancladas no se re-ubican.
 */
export async function ubicarCharla(
  conversacionId: number,
  idiomaId: number,
  perfil: PerfilTutor,
  mensajes: MensajeIA[],
): Promise<void> {
  try {
    const conv = (await conversacionesIdiomaRepo.list()).find((c) => c.id === conversacionId)
    if (!conv) return

    // Anclada o ya ubicada: solo completar el título si falta.
    if (conv.temaId && (await resolverTema(conv.temaId, idiomaId))) {
      if (!conv.titulo) {
        const r = await clasificarCharla(mensajes, perfil, [])
        await conversacionesIdiomaRepo.update(conversacionId, { titulo: r.titulo })
      }
      return
    }

    const temas = await temasDelIdioma(idiomaId)
    const r = await clasificarCharla(mensajes, perfil, temas)
    await conversacionesIdiomaRepo.update(conversacionId, { titulo: conv.titulo || r.titulo })

    // Guardia de colocación única (doble envío rápido del primer turno).
    const fresca = (await conversacionesIdiomaRepo.list()).find((c) => c.id === conversacionId)
    if (!fresca || fresca.temaId) return

    if (r.temaId) {
      await conversacionesIdiomaRepo.update(conversacionId, { temaId: r.temaId })
      return
    }

    // Ningún tema encaja: nodo dinámico bajo el nivel detectado (reutiliza por título).
    const titulo = conv.titulo || r.titulo
    const existente = temas.find((t) => normalizarTitulo(t.titulo) === normalizarTitulo(titulo))
    if (existente) {
      await conversacionesIdiomaRepo.update(conversacionId, { temaId: existente.id })
      return
    }
    const temaId = nuevoTemaId()
    await temasIdiomaRepo.add({
      temaId,
      idiomaId,
      nivel: r.nivel,
      padreId: null,
      titulo,
      descripcion: r.descripcion,
      creadoEn: new Date().toISOString(),
      conversacionId,
    })
    await conversacionesIdiomaRepo.update(conversacionId, { temaId })
  } catch {
    // La charla queda sin ubicar; ✨ Clasificar permite reintentar.
  }
}
