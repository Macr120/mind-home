import { conversarIA, extraerJSON, type MensajeIA } from '../../core/chat/ia'
import { fechaLocalISO } from '../../core/fechaLocal'
import { temasArbolRepo } from '../../core/data/repository'
import { PILARES } from './pilares'
import { PILAR_GENERAL, getPilar } from './constantes'

/** Datos mínimos del asistente cuya voz usa el chat (Asistente real o semilla). */
export interface VozSabio {
  nombre: string
  emoji: string
  personalidad: string
  historia?: string
}

/** System prompt del bibliotecario para el chat enciclopédico. */
export function systemSabio(voz: VozSabio, pilarTitulo?: string): string {
  return [
    `Eres ${voz.nombre} ${voz.emoji}, el bibliotecario de la enciclopedia personal del usuario en Mind Home.`,
    voz.personalidad ? `Personalidad: ${voz.personalidad}` : '',
    voz.historia ? `Tu historia/contexto como personaje: ${voz.historia}` : '',
    'Eres un tutor enciclopédico: explica con claridad y rigor, define los términos importantes, da ejemplos concretos y estructura en párrafos cortos. Puedes usar guiones para listas, pero NADA de markdown (ni encabezados, ni **negritas**, ni tablas): tus respuestas se muestran como texto plano. Extiéndete unas 150-250 palabras y, cuando aporte, cierra con una pregunta breve que invite a profundizar.',
    'Sé honesto: admite lo que no sepas con certeza y no inventes citas ni fuentes. No tienes herramientas: no digas que "guardaste" o "registraste" nada.',
    pilarTitulo ? `Esta charla se archivará en el campo «${pilarTitulo}» de su enciclopedia.` : '',
    `Hoy es ${fechaLocalISO()}.`,
    'Responde SIEMPRE en el idioma en que escribe el usuario.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Transcript plano y recortado (conserva inicio y final) para microtareas JSON. */
function transcript(mensajes: MensajeIA[], maxChars: number): string {
  const texto = mensajes
    .map((m) => `${m.rol === 'usuario' ? 'Usuario' : 'Sabio'}: ${m.texto}`)
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
 * Clasifica una charla en un campo del conocimiento, le pone título y una
 * descripción corta (para su nodo del árbol si es pregunta libre).
 * Nunca lanza: si la IA falla o el JSON no parsea, cae a General + título derivado.
 */
export async function clasificarConversacion(
  mensajes: MensajeIA[],
): Promise<{ pilarId: string; titulo: string; descripcion: string }> {
  const fallback = { pilarId: PILAR_GENERAL.id, titulo: tituloDerivado(mensajes), descripcion: '' }
  try {
    const system = [
      'Clasificas charlas de una enciclopedia personal en campos del conocimiento.',
      'Campos disponibles:',
      ...PILARES.map((p) => `- ${p.id}: ${p.titulo} — ${p.descripcion}`),
      'Responde ÚNICAMENTE con JSON (sin texto extra ni markdown): {"pilarId":"<id de la lista>","titulo":"<título de máx. 6 palabras, en el idioma del usuario>","descripcion":"<qué trata, una frase corta estilo índice>"}',
    ].join('\n')
    const r = await conversarIA(system, [{ rol: 'usuario', texto: transcript(mensajes, 3000) }], 250)
    const obj = extraerJSON(r)
    const pilarId =
      typeof obj.pilarId === 'string' && PILARES.some((p) => p.id === obj.pilarId)
        ? obj.pilarId
        : fallback.pilarId
    const titulo =
      typeof obj.titulo === 'string' && obj.titulo.trim()
        ? obj.titulo.trim().slice(0, 60)
        : fallback.titulo
    const descripcion = typeof obj.descripcion === 'string' ? obj.descripcion.trim().slice(0, 120) : ''
    return { pilarId, titulo, descripcion }
  } catch {
    return fallback
  }
}

/**
 * Elige bajo qué nodo del campo debe colgarse una charla nueva (colocación
 * profunda en el índice). Nunca lanza: null = colgar directo del campo.
 */
export async function elegirPadre(
  mensajes: MensajeIA[],
  pilarId: string,
  candidatos: { id: string; titulo: string; rama?: string }[],
): Promise<string | null> {
  if (!candidatos.length) return null
  try {
    const system = [
      'Colocas un tema nuevo en el índice de una enciclopedia personal.',
      `Campo: ${getPilar(pilarId).titulo}. Nodos disponibles como padre:`,
      ...candidatos.map((c) => `- ${c.id}: ${c.titulo}${c.rama ? ` (rama: ${c.rama})` : ''}`),
      'Elige el nodo MÁS específico que englobe el tema de la charla; si ninguno encaja bien, usa null.',
      'Responde ÚNICAMENTE con JSON (sin texto extra ni markdown): {"padreId":"<id de la lista o null>"}',
    ].join('\n')
    const r = await conversarIA(system, [{ rol: 'usuario', texto: transcript(mensajes, 3000) }], 100)
    const obj = extraerJSON(r)
    return typeof obj.padreId === 'string' && candidatos.some((c) => c.id === obj.padreId)
      ? obj.padreId
      : null
  } catch {
    return null
  }
}

/**
 * Propone subtemas para ramificar el árbol bajo el tema consultado.
 * Nunca lanza: si la IA falla, devuelve [] y el árbol no crece esta vez.
 */
export async function generarSubtemas(
  mensajes: MensajeIA[],
  ctx: { pilarTitulo: string; temaTitulo: string; existentes: string[] },
): Promise<{ titulo: string; descripcion: string }[]> {
  try {
    const system = [
      'Eres el índice vivo de una enciclopedia personal: a partir de una charla propones subtemas para seguir explorando MÁS a fondo.',
      `Campo: ${ctx.pilarTitulo}. Tema consultado: «${ctx.temaTitulo}».`,
      'Propón de 3 a 5 subtemas más específicos o profundos que el tema consultado, que inviten a la siguiente pregunta.',
      ctx.existentes.length
        ? `PROHIBIDO repetir (ni reformulados) estos temas que ya existen: ${ctx.existentes.slice(0, 80).join(' · ')}`
        : '',
      'Responde ÚNICAMENTE con JSON (sin texto extra ni markdown): {"subtemas":[{"titulo":"<máx. 5 palabras>","descripcion":"<una frase corta estilo índice>"}]}',
      'Escribe en el idioma del usuario.',
    ]
      .filter(Boolean)
      .join('\n')
    const r = await conversarIA(system, [{ rol: 'usuario', texto: transcript(mensajes, 3000) }], 600)
    const obj = extraerJSON(r)
    const lista = Array.isArray(obj.subtemas) ? (obj.subtemas as unknown[]) : []
    return lista
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>
        return {
          titulo: typeof o.titulo === 'string' ? o.titulo.trim().slice(0, 60) : '',
          descripcion: typeof o.descripcion === 'string' ? o.descripcion.trim().slice(0, 120) : '',
        }
      })
      .filter((x) => x.titulo)
      .slice(0, 5)
  } catch {
    return []
  }
}

/** Resultado del destilado de una charla a entrada wiki. */
export interface EntradaDestilada {
  titulo: string
  resumen: string
  puntosClave: string[]
  pilarId: string
  temaId?: string
}

/**
 * Destila una charla en una entrada de enciclopedia. Con `ancla` (nodo del
 * árbol del que nació la charla) el tema/campo ya se conocen y la IA solo
 * redacta. Lanza si la IA no devuelve JSON usable (el caller abre el form vacío).
 */
export async function destilarConversacion(
  mensajes: MensajeIA[],
  pilarActual: string,
  ancla?: { temaId: string; pilarId: string; titulo: string } | null,
): Promise<EntradaDestilada> {
  // Candidatos de temaId solo para charlas libres: estáticos + dinámicos del pilar.
  const estaticos = PILARES.find((p) => p.id === pilarActual)?.ramas.flatMap((r) => r.temas) ?? []
  const dinamicos = ancla
    ? []
    : (await temasArbolRepo.list())
        .filter((n) => n.pilarId === pilarActual)
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  const candidatos = [
    ...estaticos.map((t) => ({ id: t.id, titulo: t.titulo })),
    ...dinamicos.map((n) => ({ id: n.temaId, titulo: n.titulo })),
  ].slice(0, 30)

  const system = [
    'Eres un enciclopedista: destilas una charla en una entrada wiki breve y fiel a lo conversado.',
    ancla
      ? `La entrada pertenece al tema «${ancla.titulo}» del campo ${getPilar(ancla.pilarId).titulo}.`
      : ['Campos del conocimiento disponibles:', ...PILARES.map((p) => `- ${p.id}: ${p.titulo}`)].join('\n'),
    !ancla && candidatos.length
      ? `Temas del campo actual (${getPilar(pilarActual).titulo}) para "temaId" (null si ninguno encaja):\n${candidatos
          .map((t) => `- ${t.id}: ${t.titulo}`)
          .join('\n')}`
      : '',
    'Responde ÚNICAMENTE con JSON (sin texto extra ni markdown):',
    ancla
      ? '{"titulo":"<título estilo wiki>","resumen":"<3-5 frases>","puntosClave":["<de 3 a 6 puntos>"]}'
      : '{"titulo":"<título estilo wiki>","resumen":"<3-5 frases>","puntosClave":["<de 3 a 6 puntos>"],"pilarId":"<id>","temaId":"<id o null>"}',
    'Escribe en el idioma del usuario.',
  ]
    .filter(Boolean)
    .join('\n')

  const r = await conversarIA(system, [{ rol: 'usuario', texto: transcript(mensajes, 6000) }], 1000)
  const obj = extraerJSON(r)
  const titulo = typeof obj.titulo === 'string' ? obj.titulo.trim() : ''
  const resumen = typeof obj.resumen === 'string' ? obj.resumen.trim() : ''
  if (!titulo || !resumen) throw new Error('Destilado incompleto')
  const puntosClave = (Array.isArray(obj.puntosClave) ? obj.puntosClave : [])
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x) => x.trim())
  if (ancla) return { titulo, resumen, puntosClave, pilarId: ancla.pilarId, temaId: ancla.temaId }
  const pilarId =
    typeof obj.pilarId === 'string' && PILARES.some((p) => p.id === obj.pilarId)
      ? obj.pilarId
      : pilarActual
  const temaId =
    typeof obj.temaId === 'string' && candidatos.some((t) => t.id === obj.temaId)
      ? obj.temaId
      : undefined
  return { titulo, resumen, puntosClave, pilarId, temaId }
}
