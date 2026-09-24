/**
 * Órdenes que se escriben DENTRO del hilo con una persona, además de «jugar»:
 *
 *   enviar receta Tacos          → manda esa receta como tarjeta (igual que «+» → Contenido)
 *   enviar                       → abre el selector de contenido
 *   colaborar documento Capítulo → la invita a editar ese documento compartido
 *   colaborar calendario Familia → igual; si el calendario no existe, lo crea
 *
 * Deterministas y sin IA (el hilo con una persona nunca pasa por el modelo).
 * Si el tipo no se reconoce, NO es una orden y el texto sale como mensaje normal.
 *
 * Aquí solo se reconoce la orden (va en el arranque con el ChatBox); lo que la
 * ejecuta vive en `ordenesHiloEjecutar.ts` y se carga al usarla.
 */
import { normalizarOrden } from '../navegador/ordenes'
import type { TipoEspacio } from '../espacios/tipos'

export interface OrdenHilo {
  accion: 'enviar' | 'colaborar'
  /** Palabra del tipo tal cual se escribió (normalizada); vacía = sin tipo. */
  tipo: string
  /** Nombre normalizado, para comparar. */
  nombre: string
  /** El nombre como se escribió (para crear un calendario con sus mayúsculas). */
  nombreOriginal: string
}

const VERBOS: Record<OrdenHilo['accion'], string[]> = {
  enviar: ['enviale', 'enviar', 'envia', 'mandale', 'mandar', 'manda', 'compartir', 'comparte', 'send', 'share'],
  colaborar: ['colaboremos en', 'colaborar en', 'collaborate on', 'invitar a editar', 'edit together', 'colaboremos', 'colaborar', 'colabora', 'collaborate'],
}

const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'mi', 'mis', 'un', 'una', 'the', 'my', 'a', 'an'])

/** Palabra → contenido que se manda por el buzón (ver `registrarProveedorCompartible`). */
export const TIPOS_ENVIAR: Record<string, [app: string, tipo: string]> = {
  receta: ['cocina', 'receta'], recetas: ['cocina', 'receta'], recipe: ['cocina', 'receta'],
  dieta: ['cocina', 'dieta'], diet: ['cocina', 'dieta'],
  hoja: ['computo', 'hoja'], sheet: ['computo', 'hoja'], spreadsheet: ['computo', 'hoja'],
  rutina: ['ejercicio', 'rutina'], routine: ['ejercicio', 'rutina'], workout: ['ejercicio', 'rutina'],
  documento: ['escritura', 'documento'], doc: ['escritura', 'documento'], document: ['escritura', 'documento'],
  idea: ['ideas', 'idea'],
  mapa: ['ideas', 'mapa'], map: ['ideas', 'mapa'],
  itinerario: ['sala', 'itinerario'], viaje: ['sala', 'itinerario'], itinerary: ['sala', 'itinerario'], trip: ['sala', 'itinerario'],
  dibujo: ['arte', 'dibujo'], drawing: ['arte', 'dibujo'],
  pelicula: ['entretenimiento', 'obra'], peli: ['entretenimiento', 'obra'], serie: ['entretenimiento', 'obra'],
  libro: ['entretenimiento', 'obra'], videojuego: ['entretenimiento', 'obra'], obra: ['entretenimiento', 'obra'],
  movie: ['entretenimiento', 'obra'], film: ['entretenimiento', 'obra'], series: ['entretenimiento', 'obra'],
  show: ['entretenimiento', 'obra'], book: ['entretenimiento', 'obra'], videogame: ['entretenimiento', 'obra'],
  mazo: ['idiomas', 'mazo'], vocabulario: ['idiomas', 'mazo'], tarjetas: ['idiomas', 'mazo'],
  deck: ['idiomas', 'mazo'], vocabulary: ['idiomas', 'mazo'], flashcards: ['idiomas', 'mazo'],
  entrada: ['biblioteca', 'entrada'], apuntes: ['biblioteca', 'entrada'], articulo: ['biblioteca', 'entrada'],
  entry: ['biblioteca', 'entrada'], article: ['biblioteca', 'entrada'],
  meta: ['metas', 'meta'], objetivo: ['metas', 'meta'], goal: ['metas', 'meta'],
  proyecto: ['hobbies', 'proyecto'], project: ['hobbies', 'proyecto'], hobby: ['hobbies', 'proyecto'],
  cancion: ['audio', 'cancion'], melodia: ['audio', 'cancion'], song: ['audio', 'cancion'], tune: ['audio', 'cancion'],
}

/** Palabra → tipo de espacio compartido (colaboración en vivo). */
export const TIPOS_COLABORAR: Record<string, TipoEspacio> = {
  documento: 'documento', doc: 'documento', document: 'documento',
  dibujo: 'dibujo', drawing: 'dibujo',
  audio: 'audio', cancion: 'audio', musica: 'audio', song: 'audio', music: 'audio',
  video: 'video', pelicula: 'video', movie: 'video',
  calendario: 'calendario', calendar: 'calendario',
}

/** ¿Es una orden de enviar/colaborar? null = mensaje normal. */
export function ordenHilo(texto: string): OrdenHilo | null {
  const n = normalizarOrden(texto)
  for (const accion of ['colaborar', 'enviar'] as const) {
    const verbo = VERBOS[accion].find((v) => n === v || n.startsWith(`${v} `))
    if (!verbo) continue
    const palabras = n.slice(verbo.length).trim().split(' ').filter(Boolean)
    let i = 0
    while (i < palabras.length && ARTICULOS.has(palabras[i])) i++
    const tipo = palabras[i] ?? ''
    const tabla = accion === 'enviar' ? TIPOS_ENVIAR : TIPOS_COLABORAR
    // «enviar» a secas abre el selector; con un tipo desconocido es una frase normal.
    if (tipo && !(tipo in tabla)) return null
    if (!tipo && accion === 'colaborar') return null
    // El nombre se toma del texto ORIGINAL: mismas palabras, sin normalizar.
    const saltar = verbo.split(' ').length + i + (tipo ? 1 : 0)
    const nombreOriginal = texto.trim().split(/\s+/).slice(saltar).join(' ')
    return { accion, tipo, nombre: palabras.slice(i + 1).join(' '), nombreOriginal }
  }
  return null
}
