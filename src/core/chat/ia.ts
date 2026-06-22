import Anthropic from '@anthropic-ai/sdk'
import { getPlantilla } from '../registry'
import type { CampoCaptura } from '../registry'
import { appsAsignadas } from './dispatcher'
import { memoriasRepo, rutinasRepo } from '../data/repository'
import type { PasoRutina } from '../data/db'
import { getAsistente } from '../state/asistentesStore'
import type { Pieza3D } from './mascotas'

/**
 * Capa de IA del arquitecto (wrap sobre el seam del dispatcher), multi-proveedor.
 *
 * El modelo recibe los `esquemas` de los cuartos como herramientas (tool use)
 * y las memorias vigentes como contexto; interpreta el texto (y foto) del
 * usuario, llena los campos y aquí se ejecuta cada `guardar()`. La respuesta
 * sale en la voz de la mascota activa (su `personalidad` va al system prompt).
 *
 * Transportes: Claude usa el SDK oficial; Gemini/ChatGPT/DeepSeek/local (Ollama)
 * comparten el formato compatible-OpenAI, así que son UNA sola implementación.
 * Sin clave o con error → el ChatBox cae al dispatcher determinista.
 *
 * Futuro agéntico por asistente: cada cuarto podrá aportar herramientas de
 * ACCIÓN además de captura (chef → buscar recetas; finanzas → proponer
 * inversiones). Regla de permisos ya decidida: lectura = automática; acciones
 * con consecuencias (dinero) = el asistente PROPONE y el usuario confirma.
 */

// ----- Proveedores -----

export type ProveedorId = 'claude' | 'gemini' | 'chatgpt' | 'deepseek' | 'local'

export interface Proveedor {
  id: ProveedorId
  nombre: string
  emoji: string
  /** Modelo por defecto (captura = microtarea: el barato/rápido de cada casa). */
  modelo: string
  /** Base URL compatible-OpenAI (vacío = usa el SDK de Anthropic). */
  base?: string
  /** true = no requiere clave (Ollama local). */
  sinClave?: boolean
}

export const PROVEEDORES: Proveedor[] = [
  { id: 'claude', nombre: 'Claude', emoji: '✴️', modelo: 'claude-haiku-4-5' },
  { id: 'gemini', nombre: 'Gemini', emoji: '♊', modelo: 'gemini-flash-latest', base: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { id: 'chatgpt', nombre: 'ChatGPT', emoji: '🟢', modelo: 'gpt-5-mini', base: 'https://api.openai.com/v1' },
  { id: 'deepseek', nombre: 'DeepSeek', emoji: '🐋', modelo: 'deepseek-chat', base: 'https://api.deepseek.com/v1' },
  { id: 'local', nombre: 'Local (Ollama)', emoji: '💻', modelo: 'gemma4', base: 'http://localhost:11434/v1', sinClave: true },
]

const LS_PROVEEDOR = 'mh.iaProveedor'
const LS_KEY_PREFIX = 'mh.iaKey.'
const LS_KEY_LEGADO = 'mh.iaKey' // clave de Claude guardada antes del selector
const LS_MODELO_LOCAL = 'mh.iaModeloLocal'

export function getProveedor(): Proveedor {
  const id = localStorage.getItem(LS_PROVEEDOR) as ProveedorId | null
  return PROVEEDORES.find((p) => p.id === id) ?? PROVEEDORES[0]
}

export function setProveedor(id: ProveedorId) {
  localStorage.setItem(LS_PROVEEDOR, id)
}

export function getIaKey(prov: ProveedorId): string {
  const key = localStorage.getItem(LS_KEY_PREFIX + prov)
  if (key) return key
  return prov === 'claude' ? (localStorage.getItem(LS_KEY_LEGADO) ?? '') : ''
}

export function setIaKey(prov: ProveedorId, key: string) {
  const limpia = key.trim()
  if (limpia) localStorage.setItem(LS_KEY_PREFIX + prov, limpia)
  else localStorage.removeItem(LS_KEY_PREFIX + prov)
}

/** Modelo del proveedor local (depende de qué tenga instalado el usuario en Ollama). */
export function getModeloLocal(): string {
  return localStorage.getItem(LS_MODELO_LOCAL) ?? 'gemma4'
}

export function setModeloLocal(modelo: string) {
  localStorage.setItem(LS_MODELO_LOCAL, modelo.trim() || 'gemma4')
}

/** ¿La capa de IA puede usarse ahora con el proveedor elegido? */
export function iaActiva(): boolean {
  const prov = getProveedor()
  if (prov.sinClave) return true // Ollama es localhost: ni clave ni internet
  return getIaKey(prov.id).length > 0 && navigator.onLine
}

// ----- Esquemas de captura → herramientas (formato neutro) -----

interface ToolNeutra {
  name: string
  description: string
  schema: Record<string, unknown>
}

function campoASchema(c: CampoCaptura): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: c.tipo === 'numero' ? 'number' : 'string',
    description: c.descripcion,
  }
  if (c.tipo === 'opcion' && c.opciones) schema.enum = c.opciones
  return schema
}

/**
 * Construye las herramientas que verá el modelo. La base son las APPS ASIGNADAS
 * (las que el usuario tiene en objetos de sus cuartos), no el catálogo completo.
 * Si `cuartosPermitidos` trae ids, se acota además a esas apps (el asistente es
 * responsable de archivar SOLO ahí). Vacío/undefined = todas las apps asignadas.
 */
function construirTools(cuartosPermitidos?: string[]): ToolNeutra[] {
  const tools: ToolNeutra[] = []
  const apps = appsAsignadas()
  const responsable = cuartosPermitidos?.length
    ? apps.filter((r) => cuartosPermitidos.includes(r.id))
    : apps
  for (const room of responsable) {
    for (const e of room.esquemas ?? []) {
      tools.push({
        name: `${room.id}__${e.id}`,
        description: `${room.nombre} — ${e.descripcion}`,
        schema: {
          type: 'object',
          properties: Object.fromEntries(e.campos.map((c) => [c.campo, campoASchema(c)])),
          required: e.campos.filter((c) => c.requerido).map((c) => c.campo),
        },
      })
    }
  }
  // Herramienta de memoria: hechos duraderos sobre el usuario.
  tools.push({
    name: 'recordar',
    description:
      'Guarda un hecho duradero sobre el usuario (preferencia, hábito, dato personal) en tu memoria entre sesiones. Úsala cuando el usuario revele algo que conviene recordar o lo pida explícitamente. NO es para eventos puntuales (esos van en los cuartos).',
    schema: {
      type: 'object',
      properties: {
        hecho: { type: 'string', description: 'El hecho, en una sola frase' },
        roomId: {
          type: 'string',
          description: `App relacionada si aplica: ${apps.map((r) => r.id).join(', ')}`,
        },
      },
      required: ['hecho'],
    },
  })
  // Herramienta orquestadora: crear rutinas multi-app.
  const esquemasPorCuarto = apps
    .filter((r) => r.esquemas?.length)
    .map((r) => `${r.id}: ${r.esquemas!.map((e) => e.id).join('|')}`)
    .join(' · ')
  tools.push({
    name: 'crear_rutina',
    description:
      'Crea una rutina orquestada: secuencia de pasos en varios cuartos, programada por hora y días. Úsala cuando el usuario pida crear/armar una rutina, hábito o ritual recurrente (ej. "rutina de mañana con agua, estiramiento y gratitud").',
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre corto de la rutina (ej. "Mañana energética")' },
        emoji: { type: 'string', description: 'Un emoji que la represente' },
        hora: { type: 'string', description: 'Hora de inicio HH:mm en 24h (omitir si no se menciona)' },
        horaFin: { type: 'string', description: 'Hora de fin HH:mm (omitir = 1 hora de duración)' },
        color: { type: 'string', description: 'Color hex del evento en el calendario (ej. #3b82f6; omitir = verde)' },
        dias: {
          type: 'array',
          items: { type: 'number' },
          description: 'Días de la semana: 0=domingo, 1=lunes … 6=sábado. Vacío u omitido = todos los días.',
        },
        pasos: {
          type: 'array',
          description: 'Pasos en orden. Cada paso vive en un cuarto.',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string', description: 'Qué hacer, breve (ej. "Beber un vaso de agua")' },
              roomId: { type: 'string', description: `App del paso: ${apps.map((r) => r.id).join(', ')}` },
              esquemaId: {
                type: 'string',
                description: `Para auto-registrar al completar el paso (opcional). Esquemas por cuarto: ${esquemasPorCuarto}`,
              },
              valores: {
                type: 'object',
                description: 'Campos del esquema ya llenados (sin fecha: se pone al completar). Ej. agua: {"ml":250}',
              },
            },
            required: ['titulo', 'roomId'],
          },
        },
      },
      required: ['nombre', 'pasos'],
    },
  })
  return tools
}

// ----- Interpretación -----

/** Imagen adjunta del usuario (foto de comida, ticket, etc.). */
export interface ImagenAdjunta {
  base64: string
  mediaType: string // ej. image/jpeg
}

export interface ResultadoIA {
  /** Cuartos donde se registró algo. */
  roomIds: string[]
  /** true si al menos un esquema guardó un registro real. */
  capturado: boolean
  memoriaGuardada: boolean
  /** Nombre de la rutina creada por el modelo (si pidió crear una). */
  rutinaCreada?: string
  /** Comentario del modelo en la voz de la mascota (null = usar plantilla). */
  respuesta: string | null
}

/** Llamada de tool ya normalizada, venga del proveedor que venga. */
interface LlamadaTool {
  name: string
  input: Record<string, unknown>
}

async function construirSystem(mascotaId: string, conImagen: boolean): Promise<string> {
  const mascota = getAsistente(mascotaId)
  const memorias = (await memoriasRepo.list()).filter((m) => m.vigente)
  const hoy = new Date().toISOString().slice(0, 10)
  return [
    `Eres ${mascota.nombre} ${mascota.emoji}, el asistente-arquitecto de Mind Home: una casa virtual donde cada cuarto registra una parte de la vida del usuario.`,
    mascota.personalidad ? `Personalidad: ${mascota.personalidad}` : '',
    mascota.historia ? `Tu historia/contexto como personaje: ${mascota.historia}` : '',
    mascota.cuartos.length
      ? `Eres responsable de archivar SOLO estas apps: ${mascota.cuartos
          .map((id) => getPlantilla(id)?.nombre ?? id)
          .join(', ')}. Solo tienes herramientas de captura de esas apps. Si el usuario te cuenta algo de otra, díselo amablemente y sugiérele cambiar al asistente que la maneja.`
      : 'Eres responsable de archivar en todas las apps asignadas de la casa.',
    'El usuario te cuenta qué hizo. Registra los datos con las herramientas (usa varias si el mensaje toca varios cuartos; estima valores razonables como calorías si no se mencionan). Si pide crear una rutina o hábito recurrente, usa crear_rutina con pasos concretos y, cuando el paso sea medible, su esquema y valores para auto-registro. Después de usar herramientas, o si no hay nada registrable, responde SIEMPRE con un comentario breve (1–2 frases) en tu personalidad y en el idioma del usuario.',
    conImagen
      ? 'El mensaje incluye una imagen: interprétala y registra lo que muestre (ej. foto de un platillo → registra la comida estimando macros; un ticket → registra el gasto).'
      : '',
    `Hoy es ${hoy}.`,
    memorias.length
      ? `Lo que recuerdas del usuario:\n${memorias.map((m) => `- ${m.hecho}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Transporte Claude (SDK oficial). */
async function llamarClaude(
  system: string,
  texto: string,
  imagen: ImagenAdjunta | null,
  tools: ToolNeutra[],
): Promise<{ respuesta: string | null; llamadas: LlamadaTool[] }> {
  // maxRetries bajo: si falla, el dispatcher determinista responde al instante.
  const client = new Anthropic({ apiKey: getIaKey('claude'), dangerouslyAllowBrowser: true, maxRetries: 1 })
  const contenido: Anthropic.ContentBlockParam[] = []
  if (imagen) {
    contenido.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imagen.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: imagen.base64,
      },
    })
  }
  contenido.push({ type: 'text', text: texto })

  const res = await client.messages.create({
    model: PROVEEDORES[0].modelo,
    max_tokens: 1024,
    system,
    ...(tools.length
      ? {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.schema as Anthropic.Tool['input_schema'],
          })),
        }
      : {}),
    messages: [{ role: 'user', content: contenido }],
  })

  let respuesta: string | null = null
  const llamadas: LlamadaTool[] = []
  for (const block of res.content) {
    if (block.type === 'text' && block.text.trim()) {
      respuesta = (respuesta ? respuesta + ' ' : '') + block.text.trim()
    } else if (block.type === 'tool_use') {
      llamadas.push({ name: block.name, input: block.input as Record<string, unknown> })
    }
  }
  return { respuesta, llamadas }
}

/** Transporte compatible-OpenAI: Gemini, ChatGPT, DeepSeek y Ollama local. */
async function llamarOpenAICompat(
  prov: Proveedor,
  system: string,
  texto: string,
  imagen: ImagenAdjunta | null,
  tools: ToolNeutra[],
): Promise<{ respuesta: string | null; llamadas: LlamadaTool[] }> {
  const key = getIaKey(prov.id)
  const modelo = prov.id === 'local' ? getModeloLocal() : prov.modelo
  const contenidoUsuario = imagen
    ? [
        { type: 'text', text: texto },
        { type: 'image_url', image_url: { url: `data:${imagen.mediaType};base64,${imagen.base64}` } },
      ]
    : texto

  const res = await fetch(`${prov.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: contenidoUsuario },
      ],
      ...(tools.length
        ? {
            tools: tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.schema },
            })),
          }
        : {}),
    }),
  })
  if (!res.ok) {
    throw new Error(`${prov.nombre} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null
        tool_calls?: { function?: { name?: string; arguments?: string } }[]
      }
    }[]
  }
  const msg = data.choices?.[0]?.message
  const respuesta = msg?.content?.trim() || null
  const llamadas: LlamadaTool[] = []
  for (const tc of msg?.tool_calls ?? []) {
    if (!tc.function?.name) continue
    let input: Record<string, unknown> = {}
    try {
      input = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
    } catch {
      continue
    }
    llamadas.push({ name: tc.function.name, input })
  }
  return { respuesta, llamadas }
}

/**
 * Genera un modelo 3D de personaje a partir de una descripción en texto.
 * El modelo de IA devuelve piezas primitivas (cajas, esferas, conos, cilindros)
 * que `Asistente3D` renderiza tal cual. Lanza error si la IA no está activa
 * o la respuesta no es interpretable.
 */
export async function generarModelo3D(descripcion: string): Promise<Pieza3D[]> {
  const prov = getProveedor()
  const system = [
    'Eres un diseñador de personajes 3D low-poly estilo Roblox/voxel.',
    'A partir de la descripción del usuario, construye un personaje con piezas primitivas.',
    'Responde ÚNICAMENTE con un arreglo JSON (sin texto extra ni markdown) de piezas:',
    '{"tipo":"caja"|"esfera"|"cono"|"cilindro","pos":[x,y,z],"tam":[...],"color":"#hex","rot":[x,y,z]?}',
    'tam según tipo — caja: [ancho,alto,fondo] · esfera: [radio] · cono: [radio,alto] · cilindro: [radioArriba,radioAbajo,alto].',
    'Reglas: el personaje mide ~1.4–1.7 de alto, está de pie sobre y=0 (pos es el CENTRO de cada pieza, así que una caja de alto 0.6 apoyada en el suelo va en y=0.3), mira hacia +Z (ojos/cara en z positiva), usa 8–20 piezas, colores hex vivos y coherentes.',
    'Incluye detalles que lo hagan reconocible (ojos, orejas, sombrero, cola… según la descripción).',
  ].join('\n')

  const { respuesta } =
    prov.id === 'claude'
      ? await llamarClaude(system, descripcion, null, [])
      : await llamarOpenAICompat(prov, system, descripcion, null, [])
  if (!respuesta) throw new Error('La IA no devolvió ninguna forma')

  // Tolerar texto/markdown alrededor: extraer el primer arreglo JSON.
  const ini = respuesta.indexOf('[')
  const fin = respuesta.lastIndexOf(']')
  if (ini < 0 || fin <= ini) throw new Error('Respuesta sin JSON de piezas')
  const piezas = JSON.parse(respuesta.slice(ini, fin + 1)) as Pieza3D[]
  const validas = piezas.filter(
    (p) =>
      ['caja', 'esfera', 'cono', 'cilindro'].includes(p.tipo) &&
      Array.isArray(p.pos) &&
      p.pos.length === 3 &&
      Array.isArray(p.tam) &&
      p.tam.length > 0 &&
      typeof p.color === 'string',
  )
  if (validas.length === 0) throw new Error('La IA no devolvió piezas válidas')
  return validas
}

export async function interpretarIA(
  texto: string,
  mascotaId: string,
  imagen: ImagenAdjunta | null = null,
): Promise<ResultadoIA> {
  const prov = getProveedor()
  const tools = construirTools(getAsistente(mascotaId).cuartos)
  const system = await construirSystem(mascotaId, !!imagen)

  const { respuesta, llamadas } =
    prov.id === 'claude'
      ? await llamarClaude(system, texto, imagen, tools)
      : await llamarOpenAICompat(prov, system, texto, imagen, tools)

  const resultado: ResultadoIA = {
    roomIds: [],
    capturado: false,
    memoriaGuardada: false,
    respuesta,
  }

  for (const { name, input } of llamadas) {
    if (name === 'recordar') {
      const hecho = typeof input.hecho === 'string' ? input.hecho.trim() : ''
      if (!hecho) continue
      const roomId = typeof input.roomId === 'string' && getPlantilla(input.roomId) ? input.roomId : undefined
      await memoriasRepo.add({ hecho, roomId, creado: new Date().toISOString(), vigente: true })
      resultado.memoriaGuardada = true
      continue
    }
    if (name === 'crear_rutina') {
      const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : ''
      const pasosCrudos = Array.isArray(input.pasos) ? (input.pasos as Record<string, unknown>[]) : []
      const pasos: PasoRutina[] = pasosCrudos
        .filter((p) => typeof p.titulo === 'string' && typeof p.roomId === 'string' && getPlantilla(p.roomId as string))
        .map((p) => ({
          titulo: (p.titulo as string).trim(),
          roomId: p.roomId as string,
          esquemaId: typeof p.esquemaId === 'string' ? p.esquemaId : undefined,
          valores:
            p.valores && typeof p.valores === 'object' && !Array.isArray(p.valores)
              ? (p.valores as Record<string, unknown>)
              : undefined,
        }))
      if (!nombre || pasos.length === 0) continue
      const hora = typeof input.hora === 'string' && /^\d{2}:\d{2}$/.test(input.hora) ? input.hora : undefined
      const horaFin =
        hora && typeof input.horaFin === 'string' && /^\d{2}:\d{2}$/.test(input.horaFin) && input.horaFin > hora
          ? input.horaFin
          : undefined
      const color = typeof input.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : undefined
      const dias = Array.isArray(input.dias)
        ? (input.dias as unknown[]).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : []
      await rutinasRepo.add({
        nombre,
        emoji: typeof input.emoji === 'string' && input.emoji ? input.emoji : '⏰',
        hora,
        horaFin,
        dias,
        color,
        pasos,
        activa: true,
        creadoEn: new Date().toISOString(),
      })
      resultado.rutinaCreada = nombre
      continue
    }
    const [roomId, esquemaId] = name.split('__')
    const esquema = getPlantilla(roomId)?.esquemas?.find((e) => e.id === esquemaId)
    if (!esquema) continue
    await esquema.guardar(input)
    resultado.capturado = true
    if (!resultado.roomIds.includes(roomId)) resultado.roomIds.push(roomId)
  }

  return resultado
}
