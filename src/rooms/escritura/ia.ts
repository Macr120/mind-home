import { conversarIA } from '../../core/chat/ia'
import { MAX_TEXTO_CONTINUAR, MAX_TEXTO_MEJORAR, MAX_TEXTO_RESUMIR } from './constantes'

/**
 * Microtareas de IA del Studio de escritura. Todas LANZAN con el motivo real
 * (la UI lo muestra tal cual) y devuelven TEXTO PLANO: el editor lo escapa y lo
 * convierte a párrafos (`parrafosHtml`), nunca se inserta HTML del modelo.
 */

const SYSTEM =
  'Eres un asistente de escritura. Responde ÚNICAMENTE con el texto pedido, en texto plano: ' +
  'párrafos separados por una línea en blanco, sin markdown, sin numerar títulos, sin comillas ' +
  'alrededor y sin comentar la tarea. Escribe en el idioma del usuario.'

/** Redacta un documento (o una sección) desde la instrucción del usuario. */
export async function redactar(instruccion: string): Promise<string> {
  return conversarIA(SYSTEM, [{ rol: 'usuario', texto: instruccion }], 3000)
}

/** Mejora o corrige la selección (misma longitud aproximada, mismo idioma). */
export async function mejorar(seleccion: string, instruccion?: string): Promise<string> {
  const texto = [
    instruccion?.trim() || 'Mejora la redacción y corrige ortografía y gramática, sin cambiar el sentido ni alargar.',
    '',
    seleccion.slice(0, MAX_TEXTO_MEJORAR),
  ].join('\n')
  return conversarIA(SYSTEM, [{ rol: 'usuario', texto }], 1200)
}

/** Resume el documento en unos pocos párrafos. */
export async function resumir(documento: string): Promise<string> {
  const texto = `Resume este documento en 2 o 3 párrafos breves:\n\n${documento.slice(0, MAX_TEXTO_RESUMIR)}`
  return conversarIA(SYSTEM, [{ rol: 'usuario', texto }], 800)
}

/** Continúa el texto donde va, siguiendo tono y tema. */
export async function continuar(documento: string): Promise<string> {
  const cola = documento.slice(-MAX_TEXTO_CONTINUAR)
  const texto = `Continúa este texto con 1 o 2 párrafos más, siguiendo su tono y su tema. No repitas lo ya escrito:\n\n…${cola}`
  return conversarIA(SYSTEM, [{ rol: 'usuario', texto }], 1000)
}
