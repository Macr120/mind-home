import { conversarIA, extraerJSON, type MensajeIA } from '../../core/chat/ia'
import { fechaLocalISO } from '../../core/fechaLocal'
import type { TipoTarjeta } from '../../core/data/db'
import { NIVELES } from './constantes'

/** Datos mínimos del asistente cuya voz usa el chat (Asistente real o semilla). */
export interface VozTutor {
  nombre: string
  emoji: string
  personalidad: string
  historia?: string
}

/** Perfil mínimo del idioma que necesita el tutor. */
export interface PerfilTutor {
  nombre: string
  nivel: string
}

/** System prompt del tutor para la charla de práctica. */
export function systemTutor(voz: VozTutor, perfil: PerfilTutor, temaTitulo?: string): string {
  return [
    `Eres ${voz.nombre} ${voz.emoji}, el tutor personal de idiomas del usuario en Mind Home.`,
    voz.personalidad ? `Personalidad: ${voz.personalidad}` : '',
    voz.historia ? `Tu historia/contexto como personaje: ${voz.historia}` : '',
    `Le enseñas ${perfil.nombre} a un estudiante de nivel MCER ${perfil.nivel} cuya lengua materna es el español.`,
    `Conversa PRINCIPALMENTE en ${perfil.nombre}, adaptado a su nivel: en A1-A2 usa frases muy cortas y vocabulario básico, añadiendo entre paréntesis la traducción al español de lo difícil; en B1-B2 lenguaje natural con aclaraciones puntuales en español; en C1-C2 háblale como a un nativo, con matices e idiomatismos.`,
    `Si el usuario escribe en español, responde en ${perfil.nombre} (con la ayuda en español que pida su nivel) e invítalo a intentarlo en el idioma.`,
    'Corrige sus errores con suavidad: cuando se equivoque, muestra la forma correcta en una línea que empiece con "✔" y sigue la conversación sin regañar ni detenerte en el error.',
    'Mensajes cortos (60-150 palabras) y SIEMPRE cierra con una pregunta sencilla para que practique. NADA de markdown (ni encabezados ni **negritas**): tus respuestas se muestran como texto plano.',
    'No tienes herramientas: no digas que "guardaste" o "registraste" nada.',
    temaTitulo ? `Tema de práctica de esta charla: «${temaTitulo}». Mantén la conversación alrededor de él.` : '',
    `Hoy es ${fechaLocalISO()}.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Transcript plano y recortado (conserva inicio y final) para microtareas JSON. */
function transcript(mensajes: MensajeIA[], maxChars: number): string {
  const texto = mensajes
    .map((m) => `${m.rol === 'usuario' ? 'Estudiante' : 'Tutor'}: ${m.texto}`)
    .join('\n')
  if (texto.length <= maxChars) return texto
  const mitad = Math.floor(maxChars / 2)
  return `${texto.slice(0, mitad)}\n[…]\n${texto.slice(-mitad)}`
}

/** Título de emergencia: primeras palabras del primer mensaje del usuario. */
export function tituloDerivado(mensajes: MensajeIA[]): string {
  const primero = mensajes.find((m) => m.rol === 'usuario')?.texto ?? ''
  const palabras = primero.trim().split(/\s+/).slice(0, 6).join(' ')
  return palabras.length > 60 ? `${palabras.slice(0, 57)}…` : palabras || 'Charla'
}

/**
 * Clasifica una charla de práctica: título, tema del temario (o null si
 * ninguno encaja) y nivel practicado. Nunca lanza: si la IA falla cae al
 * título derivado sin tema.
 */
export async function clasificarCharla(
  mensajes: MensajeIA[],
  perfil: PerfilTutor,
  temas: { id: string; titulo: string; nivel: string }[],
): Promise<{ titulo: string; temaId: string | null; nivel: string; descripcion: string }> {
  const fallback = { titulo: tituloDerivado(mensajes), temaId: null, nivel: perfil.nivel, descripcion: '' }
  try {
    const system = [
      `Clasificas charlas de práctica de ${perfil.nombre} en el temario de un curso por niveles MCER.`,
      'Temas disponibles:',
      ...temas.slice(0, 60).map((t) => `- ${t.id}: ${t.titulo} (nivel ${t.nivel})`),
      'Responde ÚNICAMENTE con JSON (sin texto extra ni markdown): {"titulo":"<máx. 6 palabras, en español>","temaId":"<id de la lista o null si ninguno encaja>","nivel":"A1|A2|B1|B2|C1|C2","descripcion":"<qué se practicó, una frase corta>"}',
    ].join('\n')
    const r = await conversarIA(system, [{ rol: 'usuario', texto: transcript(mensajes, 3000) }], 250)
    const obj = extraerJSON(r)
    const titulo =
      typeof obj.titulo === 'string' && obj.titulo.trim() ? obj.titulo.trim().slice(0, 60) : fallback.titulo
    const temaId = typeof obj.temaId === 'string' && temas.some((t) => t.id === obj.temaId) ? obj.temaId : null
    const nivel = typeof obj.nivel === 'string' && NIVELES.includes(obj.nivel) ? obj.nivel : perfil.nivel
    const descripcion = typeof obj.descripcion === 'string' ? obj.descripcion.trim().slice(0, 120) : ''
    return { titulo, temaId, nivel, descripcion }
  } catch {
    return fallback
  }
}

/** Tarjeta propuesta por la IA (extraída o generada), pendiente de revisión. */
export interface TarjetaPropuesta {
  termino: string
  traduccion: string
  ejemplo?: string
  tipo: TipoTarjeta
  nivel: string
}

const normalizar = (s: string) => s.trim().toLowerCase()

/** Contrato JSON común a extraer y generar tarjetas. */
function contratoTarjetas(idioma: string): string {
  return `Responde ÚNICAMENTE con JSON (sin texto extra ni markdown): {"tarjetas":[{"termino":"<en ${idioma}>","traduccion":"<en español>","ejemplo":"<frase corta en ${idioma} que use el término>","tipo":"palabra|frase|expresion","nivel":"A1|A2|B1|B2|C1|C2"}]}`
}

/** Valida campo a campo la lista de la IA, deduplicando contra `existentes`. */
function validarTarjetas(
  obj: Record<string, unknown>,
  nivelFallback: string,
  existentes: string[],
): TarjetaPropuesta[] {
  const lista = Array.isArray(obj.tarjetas) ? (obj.tarjetas as unknown[]) : []
  const vistos = new Set(existentes.map(normalizar))
  const out: TarjetaPropuesta[] = []
  for (const x of lista) {
    const o = (x ?? {}) as Record<string, unknown>
    const termino = typeof o.termino === 'string' ? o.termino.trim() : ''
    const traduccion = typeof o.traduccion === 'string' ? o.traduccion.trim() : ''
    if (!termino || !traduccion) continue
    const clave = normalizar(termino)
    if (vistos.has(clave)) continue
    vistos.add(clave)
    out.push({
      termino: termino.slice(0, 80),
      traduccion: traduccion.slice(0, 120),
      ejemplo: typeof o.ejemplo === 'string' && o.ejemplo.trim() ? o.ejemplo.trim().slice(0, 200) : undefined,
      tipo: o.tipo === 'frase' || o.tipo === 'expresion' ? o.tipo : 'palabra',
      nivel: typeof o.nivel === 'string' && NIVELES.includes(o.nivel) ? o.nivel : nivelFallback,
    })
    if (out.length >= 12) break
  }
  return out
}

/**
 * Extrae vocabulario de la charla como tarjetas propuestas. LANZA si la IA no
 * devuelve nada usable (el caller abre el form manual, patrón destilar).
 */
export async function extraerTarjetas(
  mensajes: MensajeIA[],
  perfil: PerfilTutor,
  existentes: string[],
): Promise<TarjetaPropuesta[]> {
  const system = [
    `Eres un lexicógrafo: extraes vocabulario útil de una charla de práctica de ${perfil.nombre} (estudiante nivel ${perfil.nivel}, lengua materna español) para tarjetas de repaso espaciado.`,
    'Elige de 3 a 10 términos, frases o expresiones que APARECIERON en la charla y valga la pena memorizar.',
    existentes.length
      ? `PROHIBIDO repetir (ni con variantes) estos términos que ya tiene: ${existentes.slice(0, 80).join(' · ')}`
      : '',
    contratoTarjetas(perfil.nombre),
  ]
    .filter(Boolean)
    .join('\n')
  const r = await conversarIA(system, [{ rol: 'usuario', texto: transcript(mensajes, 6000) }], 1200)
  const propuestas = validarTarjetas(extraerJSON(r), perfil.nivel, existentes)
  if (!propuestas.length) throw new Error('Extracción vacía')
  return propuestas
}

/**
 * Genera tarjetas nuevas para un tema del temario. Nunca lanza: si la IA
 * falla devuelve [] y la UI avisa.
 */
export async function generarTarjetasTema(
  perfil: PerfilTutor,
  tema: { titulo: string; nivel: string },
  n: number,
  existentes: string[],
): Promise<TarjetaPropuesta[]> {
  try {
    const system = [
      `Eres un profesor de ${perfil.nombre}: creas vocabulario de estudio para hispanohablantes.`,
      `Genera ${n} tarjetas del tema «${tema.titulo}» de nivel MCER ${tema.nivel}: los términos más útiles y frecuentes del tema a ese nivel, cada uno con un ejemplo natural.`,
      existentes.length
        ? `PROHIBIDO repetir (ni con variantes) estos términos que ya tiene: ${existentes.slice(0, 80).join(' · ')}`
        : '',
      contratoTarjetas(perfil.nombre),
    ]
      .filter(Boolean)
      .join('\n')
    const r = await conversarIA(system, [{ rol: 'usuario', texto: 'Genera las tarjetas.' }], 1500)
    return validarTarjetas(extraerJSON(r), tema.nivel, existentes)
  } catch {
    return []
  }
}
