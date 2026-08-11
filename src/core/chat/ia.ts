// Solo tipos: el SDK (pesado) se importa dinámico al primer uso real de Claude.
import type Anthropic from '@anthropic-ai/sdk'
import { getPlantilla } from '../appContrato'
import type { CampoCaptura } from '../appContrato'
import { appsAsignadas } from './dispatcher'
import { TOOLS_EDITOR, ejecutarToolEditor, descripcionCuartos, hayIntencionEditor } from './editorAcciones'
import { memoriasRepo, rutinasRepo } from '../data/repository'
import type { DestinoChat, PasoRutina } from '../data/db'
import { destinoDeTool } from './destinoChat'
import { generarImagen, imagenIaActiva, type AspectoImagen } from '../imagenIA'
import { getAsistente } from '../state/asistentesStore'
import { useDiseño } from '../state/disenoStore'
import { TIPO_PIEZAS } from '../house/catalogo'
import { playerPos } from '../state/houseStore'
import type { Pieza3D } from './mascotas'
import { fechaLocalISO } from '../fechaLocal'
import { devIA, esPro, iaHabilitada } from '../edicion'
import { usarViaCuenta, iaChatCuenta, ErrorIA } from '../cuenta/api'
import { hayBackend } from '../cuenta/supabase'
import { opDeTexto } from '../cuenta/costos'
import { useGastoByok, type CategoriaGastoByok } from '../cuenta/gastoByok'
import { costoTexto } from '../cuenta/tarifasByok'
import { useCuotaAgotada } from '../state/avisosPlanStore'
import { tGlobal } from '../i18n/useT'
import { systemModelo3D, type TipoModelo3D, type EstiloModelo3D } from './prompt3d'
import type { GrupoAccion } from '../state/accionCuartoStore'

// El prompt 3D vive en `prompt3d.ts` (sin dependencias, medible por el banco de
// pruebas); se re-exporta para no tocar a quien ya importa los tipos de aquí.
export type { TipoModelo3D, EstiloModelo3D }

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
  { id: 'deepseek', nombre: 'DeepSeek', emoji: '🐋', modelo: 'deepseek-v4-flash', base: 'https://api.deepseek.com/v1' },
  { id: 'local', nombre: 'Local (Ollama)', emoji: '💻', modelo: 'gemma4', base: 'http://localhost:11434/v1', sinClave: true },
]

/**
 * Perfil de la llamada. `rapido` (todo el chat) usa el modelo barato sin
 * razonamiento; `calidad` sube a un modelo mayor con razonamiento adaptativo y
 * esfuerzo alto. Se reserva para tareas raras donde la calidad manda y el
 * modelo pequeño se queda corto: la GEOMETRÍA de los modelos 3D.
 */
export type PerfilIA = 'rapido' | 'calidad'

/** Modelo de Claude para el perfil `calidad` (el de `PROVEEDORES[0]` es el rápido). */
const MODELO_CALIDAD = 'claude-sonnet-5'

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

/**
 * ¿La superficie de IA está viva? Con transporte (proxy de la cuenta u Ollama/
 * clave propia) es un sí literal. Sin transporte pero con backend también, a
 * propósito: en modo local sin créditos el botón sigue pulsable y `exigirTransporte`
 * lo convierte en el modal de recarga — si se ocultara, nadie descubriría la IA.
 */
export function iaActiva(): boolean {
  if (!iaHabilitada()) return false
  if (usarViaCuenta()) return navigator.onLine
  const prov = getProveedor()
  if (prov.sinClave) return true // Ollama es localhost: ni clave ni internet
  if (getIaKey(prov.id).length > 0) return navigator.onLine
  return hayBackend() && navigator.onLine
}

/**
 * Como `iaActiva()`, pero solo si puede EJECUTAR de verdad. Para la IA de FONDO
 * (latidos, efemérides, reparto): esas llamadas no deben disparar avisos sin
 * acción del usuario NI gastar créditos de recarga por su cuenta — quien compró
 * 150 créditos no espera encontrarlos vacíos por los latidos del personaje.
 */
export function iaOperativa(): boolean {
  return (esPro() || devIA()) && iaActiva()
}

/**
 * Corta ANTES de salir cuando no hay forma de pagar la llamada: ni cuenta con
 * créditos ni clave propia. Abre el modal de recarga en vez de morir con un
 * error de red que el usuario no puede interpretar.
 */
function exigirTransporte(): void {
  if (usarViaCuenta()) return
  const prov = getProveedor()
  if (prov.sinClave || getIaKey(prov.id).length > 0) return
  useCuotaAgotada.getState().abrir()
  throw new ErrorIA('cuota-agotada', tGlobal('cuenta.creditos.faltan', 'Te quedaste sin créditos de IA.'))
}

// ----- Esquemas de captura → herramientas (formato neutro) -----

export interface ToolNeutra {
  name: string
  description: string
  schema: Record<string, unknown>
  /** Marca un breakpoint de prompt caching al final de esta tool (proxy de la cuenta). */
  cache?: boolean
}

function campoASchema(c: CampoCaptura): Record<string, unknown> {
  if (c.tipo === 'lista') {
    return { type: 'array', items: { type: 'string' }, description: c.descripcion }
  }
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
  // Herramienta creativa: generar un modelo 3D y guardarlo en el inventario.
  tools.push({
    name: 'crear_modelo_3d',
    description:
      'Crea un modelo 3D low-poly (objeto, personaje o pieza arquitectónica) a partir de una descripción y lo guarda en el inventario del usuario. Úsala cuando pida crear/generar/hacer un objeto, mueble, planta, aparato, personaje, animal, columna, arco, muro u otra forma 3D (ej. "crea una silla de madera", "genera un gato robot", "haz una columna griega"). NO la uses si pide una imagen, foto o dibujo plano: eso es generar_imagen.',
    schema: {
      type: 'object',
      properties: {
        descripcion: {
          type: 'string',
          description: 'Qué crear, con detalle (ej. "silla de madera con cojín rojo")',
        },
        tipo: {
          type: 'string',
          enum: ['objeto', 'personaje', 'arquitectura'],
          description:
            'objeto = props/muebles/plantas/aparatos; personaje = seres con cara; arquitectura = columnas/arcos/muros/escaleras. Por defecto objeto.',
        },
        estilo: {
          type: 'string',
          enum: ['normal', 'detallado', 'minimalista', 'redondeado', 'bloques'],
          description: 'Estilo opcional de las piezas. Por defecto normal.',
        },
      },
      required: ['descripcion'],
    },
  })
  // Imagen 2D en la conversación (solo si el proveedor de imagen está disponible).
  if (imagenIaActiva()) {
    tools.push({
      name: 'generar_imagen',
      description:
        'Genera una IMAGEN 2D real (ilustración, dibujo, foto) y la muestra dentro de la conversación. Úsala cuando el usuario pida una imagen, foto, dibujo, ilustración o póster de algo (ej. "una imagen de un dragón", "dibújame un atardecer en la playa"). NO la uses para crear objetos, muebles o decoración de la casa: eso es crear_modelo_3d.',
      schema: {
        type: 'object',
        properties: {
          descripcion: {
            type: 'string',
            description: 'Qué mostrar, con detalle visual (estilo, colores, ambiente)',
          },
          aspecto: {
            type: 'string',
            enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
            description: 'Proporción de la imagen; 1:1 si el usuario no pide otra',
          },
        },
        required: ['descripcion'],
      },
    })
  }
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
  /** Descripción del modelo 3D creado y guardado en el inventario (si lo pidió). */
  creado3d?: string
  /** Confirmaciones de las ediciones de la casa hechas por el modelo. */
  ediciones: string[]
  /** Comentario del modelo en la voz de la mascota (null = usar plantilla). */
  respuesta: string | null
  /**
   * Chips de navegación del mensaje: un turno puede tocar varias apps (gasto en
   * Finanzas + comida en Cocina) y cada una aporta el suyo, en orden de ejecución.
   */
  destinos: DestinoChat[]
  /** Imagen generada en este turno (tool generar_imagen): se muestra en la burbuja. */
  imagen?: Blob
  /** El modelo pidió una imagen pero la generación falló (cuota, red…). */
  imagenFallo?: boolean
}

/** Añade el chip si no estaba ya: varias tools pueden apuntar al mismo sitio. */
function sumarDestino(lista: DestinoChat[], d?: DestinoChat): void {
  if (d && !lista.some((x) => JSON.stringify(x) === JSON.stringify(d))) lista.push(d)
}

/** Llamada de tool ya normalizada, venga del proveedor que venga. */
interface LlamadaTool {
  name: string
  input: Record<string, unknown>
}

async function construirSystem(mascotaId: string, conImagen: boolean, conEditor: boolean): Promise<string> {
  const mascota = getAsistente(mascotaId)
  const memorias = (await memoriasRepo.list()).filter((m) => m.vigente)
  const hoy = fechaLocalISO()
  return [
    `Eres ${mascota.nombre} ${mascota.emoji}, el asistente-arquitecto de Mind Planner Home: una casa virtual donde cada cuarto registra una parte de la vida del usuario.`,
    mascota.personalidad ? `Personalidad: ${mascota.personalidad}` : '',
    mascota.historia ? `Tu historia/contexto como personaje: ${mascota.historia}` : '',
    mascota.cuartos.length
      ? `Eres responsable de archivar SOLO estas apps: ${mascota.cuartos
          .map((id) => getPlantilla(id)?.nombre ?? id)
          .join(', ')}. Solo tienes herramientas de captura de esas apps. Si el usuario te pide registrar algo de otra, díselo amablemente y sugiérele cambiar al asistente que la maneja (conversar sí puedes de lo que sea).`
      : 'Eres responsable de archivar en todas las apps asignadas de la casa.',
    'Cuando el usuario te cuente qué hizo, registra los datos con las herramientas (usa varias si el mensaje toca varios cuartos; estima valores razonables como calorías si no se mencionan). Si pide crear una rutina o hábito recurrente, usa crear_rutina con pasos concretos y, cuando el paso sea medible, su esquema y valores para auto-registro. Después de usar herramientas responde SIEMPRE con un comentario breve (1–2 frases) en tu personalidad y en el idioma del usuario.',
    'También puede platicar contigo de cualquier tema: preguntas de curiosidad o conocimiento general («¿por qué el cielo es azul?»), opiniones o charla casual. Ahí no uses herramientas ni fuerces ningún registro: contesta de verdad, con una explicación clara y correcta (2–5 frases, admite si no estás seguro de algo) en tu personalidad y en el idioma del usuario. Cuando salga natural, remata con UNA frase que conecte el tema con la vida de la casa (explorarlo a fondo en la biblioteca, la calma del jardín, probar algo en la cocina, registrarlo en un cuarto…); si no hay conexión razonable, omite el guiño en vez de forzarlo.',
    'Si recibes mensajes previos, son el contexto de una conversación continua: retómala con naturalidad, no repitas saludos y no vuelvas a registrar lo que ya quedó registrado en turnos anteriores.',
    'Si el usuario pide crear/generar/hacer un objeto, mueble, planta, aparato, personaje, animal o elemento arquitectónico en 3D (ej. "crea una silla de madera", "genera un gato robot", "haz una columna griega"), usa crear_modelo_3d: se generará y se guardará en su inventario, en la carpeta según el tipo.',
    imagenIaActiva()
      ? 'Si pide una IMAGEN, foto, dibujo o ilustración («una imagen de X», «dibújame X»), usa generar_imagen: la imagen aparecerá dentro de la conversación. Los objetos, muebles y personajes 3D para la casa son de crear_modelo_3d, no de generar_imagen.'
      : '',
    // Párrafos de arquitecto: solo cuando el mensaje trae las TOOLS_EDITOR
    // (gating por intención — ahorra ~5.5k tokens en la plática normal).
    conEditor
      ? `También eres el arquitecto de la casa: cuando el usuario pida MODIFICAR la casa (pintar/crear/renombrar/eliminar cuartos, pisos, techos, objetos, vestir o redimensionar al personaje, tema estacional, fondo de cielo) o controlar la experiencia (música ambiental, vista de cámara, montar un vehículo, abrir su resumen Wrapped) usa las herramientas editor_* (puedes usar varias en un mismo mensaje). Para apuntar a un cuarto, usa su id. ${descripcionCuartos()}`
      : '',
    conEditor
      ? 'Las CONFIGURACIONES de la app también son tuyas: idioma, tema y tipografía de la interfaz, apariencia (claro/oscuro/transparente), estilo de iconos y vidrio de los paneles, estilo visual del mapa y sus efectos, avisos y respaldo. Aplica el cambio con su herramienta en vez de explicar dónde está el menú. Lo que NO puedes hacer por chat —iniciar sesión, restaurar un respaldo, borrar los datos— ábrelo con editor_ajustes_abrir en su grupo para que el usuario lo confirme.'
      : '',
    conEditor
      ? 'Fuera de los cuartos, el MAPA exterior se construye con las herramientas editor_infra_*: huerto, granja, caminos (pista de carreras, vías de tren, montaña rusa) y canchas deportivas. Regar, cosechar, alimentar, mimar, colocar una cancha, correr una carrera y montar el tren se hacen al vuelo; en cambio editor_infra_construir abre un editor a pantalla completa que cierra el chat, así que llámala SOLA. Para jugar paintball contra los asistentes (1 vs 1, 2 vs 2 o batalla campal, con la casa de campo de batalla) usa editor_paintball.'
      : '',
    conEditor
      ? 'Cuando un tema se entienda mejor DIBUJADO —una explicación con pasos, tipos, partes o dos cosas comparadas— puedes llevarlo a la app Ideas con editor_mapa_ideas, que dibuja el mapa entero y lo abre. Hazlo cuando el usuario lo pida o acepte tu ofrecimiento; si no, basta con ofrecérselo en una frase al final de la explicación.'
      : '',
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

/** Transporte de la cuenta (Pro): Edge Function `ia-chat`, clave del servidor + cuota. */
async function llamarCuenta(
  system: string,
  texto: string,
  imagen: ImagenAdjunta | null,
  tools: ToolNeutra[],
  historial: MensajeIA[] = [],
  perfil: PerfilIA = 'rapido',
): Promise<{ respuesta: string | null; llamadas: LlamadaTool[] }> {
  const r = await iaChatCuenta({
    system,
    mensajes: [...historial, { rol: 'usuario', texto, imagen: imagen ?? undefined }],
    tools: tools.length ? tools : undefined,
    // El razonamiento del perfil `calidad` también sale de max_tokens. El 2048
    // del chat es el espejo del tope del servidor (TOPES.chat en ia-chat):
    // menor que texto_largo a propósito, para que declarar la op barata no
    // regale la salida larga.
    maxTokens: perfil === 'calidad' ? 8192 : 2048,
    perfil,
    // El chat de la casa cabe en 1 crédito porque su entrada (tools + system)
    // va cacheada; el modelo 3D paga aparte.
    op: perfil === 'calidad' ? 'modelo3d' : 'chat',
  })
  return { respuesta: r.texto?.trim() || null, llamadas: r.llamadas }
}

/** Transporte Claude (SDK oficial). */
async function llamarClaude(
  system: string,
  texto: string,
  imagen: ImagenAdjunta | null,
  tools: ToolNeutra[],
  historial: MensajeIA[] = [],
  perfil: PerfilIA = 'rapido',
  /** Categoría del gasto BYOK ('chat' salvo que el caller pida otra, ej. modelo3d). */
  categoria: CategoriaGastoByok = 'chat',
): Promise<{ respuesta: string | null; llamadas: LlamadaTool[] }> {
  if (usarViaCuenta()) return llamarCuenta(system, texto, imagen, tools, historial, perfil)
  // maxRetries bajo: si falla, el dispatcher determinista responde al instante.
  const { default: AnthropicSDK } = await import('@anthropic-ai/sdk')
  const client = new AnthropicSDK({ apiKey: getIaKey('claude'), dangerouslyAllowBrowser: true, maxRetries: 1 })
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

  const calidad = perfil === 'calidad'
  const res = await client.messages.create({
    model: calidad ? MODELO_CALIDAD : PROVEEDORES[0].modelo,
    // Holgado: una sola respuesta puede traer varias recetas completas + la
    // dieta que las agrupa + su lista del súper (varios tool_use encadenados).
    // En `calidad` el razonamiento también consume de este tope.
    max_tokens: calidad ? 8192 : 4096,
    // Razonar antes de responder es lo que endereza la geometría 3D.
    // `low` medido en scripts/bench3d.mjs: ~10s por objeto contra ~19s de
    // `high` (hasta 40s en el peor caso), con la misma silueta correcta y sin
    // piezas bajo el suelo. Para más detalle está el estilo 'detallado', que
    // sube las piezas sin pagar razonamiento.
    ...(calidad
      ? { thinking: { type: 'adaptive' as const }, output_config: { effort: 'low' as const } }
      : {}),
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
    messages: [
      ...historial.map((m) => ({
        role: m.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
        content: m.texto,
      })),
      { role: 'user', content: contenido },
    ],
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
  useGastoByok.getState().sumar(
    categoria,
    costoTexto(calidad ? MODELO_CALIDAD : PROVEEDORES[0].modelo, {
      entrada: res.usage.input_tokens,
      salida: res.usage.output_tokens,
      cacheCrear: res.usage.cache_creation_input_tokens ?? undefined,
      cacheLeer: res.usage.cache_read_input_tokens ?? undefined,
    }),
  )
  return { respuesta, llamadas }
}

/**
 * Tope de tokens en el formato que espera cada proveedor: el endpoint real de
 * OpenAI (ChatGPT) ya no acepta `max_tokens` en sus modelos de razonamiento
 * («Unsupported parameter: 'max_tokens' [...] Use 'max_completion_tokens'»);
 * los demás (Gemini vía su compat-OpenAI, DeepSeek, Ollama local) siguen
 * usando el nombre clásico.
 */
function paramTokens(prov: Proveedor, n: number): Record<string, number> {
  return prov.id === 'chatgpt' ? { max_completion_tokens: n } : { max_tokens: n }
}

/** Transporte compatible-OpenAI: Gemini, ChatGPT, DeepSeek y Ollama local. */
async function llamarOpenAICompat(
  prov: Proveedor,
  system: string,
  texto: string,
  imagen: ImagenAdjunta | null,
  tools: ToolNeutra[],
  historial: MensajeIA[] = [],
  /** Categoría del gasto BYOK ('chat' salvo que el caller pida otra, ej. modelo3d). */
  categoria: CategoriaGastoByok = 'chat',
): Promise<{ respuesta: string | null; llamadas: LlamadaTool[] }> {
  if (usarViaCuenta()) return llamarCuenta(system, texto, imagen, tools, historial)
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
      ...paramTokens(prov, 4096),
      messages: [
        { role: 'system', content: system },
        ...historial.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
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
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const msg = data.choices?.[0]?.message
  const respuesta = msg?.content?.trim() || null
  const llamadas: LlamadaTool[] = []
  for (const tc of msg?.tool_calls ?? []) {
    if (!tc.function?.name) continue
    let input: Record<string, unknown>
    try {
      input = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
    } catch {
      continue
    }
    llamadas.push({ name: tc.function.name, input })
  }
  if (data.usage) {
    useGastoByok
      .getState()
      .sumar(categoria, costoTexto(modelo, { entrada: data.usage.prompt_tokens ?? 0, salida: data.usage.completion_tokens ?? 0 }))
  }
  return { respuesta, llamadas }
}

// ----- Conversación multi-turno (chat embebido de las apps) -----

/** Turno de una conversación multi-turno (formato neutro de la app). */
export interface MensajeIA {
  rol: 'usuario' | 'asistente'
  texto: string
}

/**
 * Normaliza un historial para la API (que exige turnos alternados empezando
 * por el usuario): descarta vacíos, fusiona mensajes consecutivos del mismo
 * rol y quita un saludo inicial del asistente.
 */
export function normalizarHistorial(mensajes: MensajeIA[]): MensajeIA[] {
  const historial: MensajeIA[] = []
  for (const m of mensajes) {
    if (!m.texto.trim()) continue
    const previo = historial[historial.length - 1]
    if (previo && previo.rol === m.rol) previo.texto += `\n\n${m.texto}`
    else historial.push({ ...m })
  }
  while (historial.length && historial[0].rol !== 'usuario') historial.shift()
  return historial
}

/**
 * Conversación multi-turno SIN herramientas, multi-proveedor: recibe el
 * historial completo y devuelve la siguiente respuesta del asistente.
 * Lanza error si el proveedor falla o responde vacío (el caller decide la UI).
 */
export async function conversarIA(
  system: string,
  mensajes: MensajeIA[],
  maxTokens = 1500,
): Promise<string> {
  const historial = normalizarHistorial(mensajes)
  if (!historial.length) throw new Error('Conversación vacía')
  exigirTransporte()

  // Vía cuenta: proxy del servidor con cuota; los errores tipados (ErrorIA)
  // llegan al caller con mensaje listo para mostrarse. La tarifa la decide lo
  // que se pida de salida — un plan de metas de 3000 tokens no vale lo mismo
  // que una receta de 1200 (ver opDeTexto).
  //
  // Caching: el proxy ya marca system + último mensaje con cache_control; aquí
  // no hay más breakpoints que añadir porque estos system van a Haiku, cuyo
  // mínimo cacheable (4096 tok) los deja como no-op sin costo. El hilo ≥2
  // mensajes sí se cachea turno a turno. El system 3D (Sonnet, mínimo 1024)
  // queda cubierto por el mismo marcador de system del proxy.
  if (usarViaCuenta()) {
    const r = await iaChatCuenta({ system, mensajes: historial, maxTokens, op: opDeTexto(maxTokens) })
    const texto = r.texto?.trim()
    if (!texto) throw new Error('La IA respondió vacío')
    return texto
  }

  const prov = getProveedor()
  if (prov.id === 'claude') {
    const { default: AnthropicSDK } = await import('@anthropic-ai/sdk')
    const client = new AnthropicSDK({ apiKey: getIaKey('claude'), dangerouslyAllowBrowser: true, maxRetries: 1 })
    const res = await client.messages.create({
      model: prov.modelo,
      max_tokens: maxTokens,
      system,
      messages: historial.map((m) => ({
        role: m.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
        content: m.texto,
      })),
    })
    const texto = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()
    if (!texto) throw new Error('La IA respondió vacío')
    useGastoByok.getState().sumar(
      'chat',
      costoTexto(prov.modelo, {
        entrada: res.usage.input_tokens,
        salida: res.usage.output_tokens,
        cacheCrear: res.usage.cache_creation_input_tokens ?? undefined,
        cacheLeer: res.usage.cache_read_input_tokens ?? undefined,
      }),
    )
    return texto
  }

  const key = getIaKey(prov.id)
  const modelo = prov.id === 'local' ? getModeloLocal() : prov.modelo
  const res = await fetch(`${prov.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model: modelo,
      ...paramTokens(prov, maxTokens),
      messages: [
        { role: 'system', content: system },
        ...historial.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      ],
    }),
  })
  if (!res.ok) throw new Error(`${prov.nombre} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const texto = data.choices?.[0]?.message?.content?.trim()
  if (!texto) throw new Error('La IA respondió vacío')
  if (data.usage) {
    useGastoByok
      .getState()
      .sumar('chat', costoTexto(modelo, { entrada: data.usage.prompt_tokens ?? 0, salida: data.usage.completion_tokens ?? 0 }))
  }
  return texto
}

/**
 * Una sola pregunta al modelo SOBRE una imagen, sin herramientas ni historial
 * (visión pura, multi-proveedor). Devuelve el texto crudo; lanza si viene vacío.
 */
export async function analizarImagenIA(
  system: string,
  texto: string,
  imagen: ImagenAdjunta,
): Promise<string> {
  exigirTransporte()
  // La vía cuenta manda SIEMPRE, igual que en conversarIA: mirar primero el
  // proveedor dejaba que una clave BYOK guardada en localStorage saltara el
  // proxy — y con él la cuota.
  if (usarViaCuenta()) {
    const r = await iaChatCuenta({
      system,
      mensajes: [{ rol: 'usuario', texto, imagen }],
      maxTokens: 1500,
      op: 'vision',
    })
    const salida = r.texto?.trim()
    if (!salida) throw new Error('La IA respondió vacío')
    return salida
  }

  const prov = getProveedor()
  const { respuesta } =
    prov.id === 'claude'
      ? await llamarClaude(system, texto, imagen, [])
      : await llamarOpenAICompat(prov, system, texto, imagen, [])
  if (!respuesta) throw new Error('La IA respondió vacío')
  return respuesta
}

/**
 * Extrae el primer objeto JSON de una respuesta de IA tolerando texto o
 * markdown alrededor (mismo truco que generarModelo3D con arreglos).
 * Lanza si no hay JSON parseable.
 */
export function extraerJSON(respuesta: string): Record<string, unknown> {
  const ini = respuesta.indexOf('{')
  const fin = respuesta.lastIndexOf('}')
  if (ini < 0 || fin <= ini) throw new Error('Respuesta sin JSON')
  const obj: unknown = JSON.parse(respuesta.slice(ini, fin + 1))
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('JSON inesperado')
  return obj as Record<string, unknown>
}

/**
 * Genera un modelo 3D a partir de una descripción en texto, según la categoría
 * (`personaje` por defecto, `objeto` o `arquitectura`) y un `estilo` opcional que
 * modula el prompt. La IA devuelve piezas primitivas (cajas, esferas, conos,
 * cilindros, planos) que se renderizan tal cual. Lanza error si la IA no está
 * activa o la respuesta no es interpretable.
 */
/** Extrae la palabra de clasificación de grupo que la IA escribe tras el arreglo de piezas (solo categoría 'objeto'). */
function extraerGrupoAccion(texto: string): GrupoAccion | 'ninguno' | null {
  const m = texto.match(/\b(asiento|acostarse|vehiculo|ninguno)\b/)
  return (m?.[1] as GrupoAccion | 'ninguno' | undefined) ?? null
}

export async function generarModelo3D(
  descripcion: string,
  tipo: TipoModelo3D = 'personaje',
  estilo: EstiloModelo3D = 'normal',
): Promise<{ piezas: Pieza3D[]; grupo: GrupoAccion | 'ninguno' | null }> {
  exigirTransporte()
  const system = systemModelo3D(tipo, estilo)

  // Perfil `calidad`: la geometría es lo que peor sale con el modelo rápido.
  // La vía cuenta va primero para que el perfil (y su tarifa) no se pierdan
  // cuando hay una clave BYOK guardada — antes se colaba por la rama del
  // proveedor y se cobraba como un chat cualquiera.
  const prov = getProveedor()
  const { respuesta } =
    usarViaCuenta() || prov.id === 'claude'
      ? await llamarClaude(system, descripcion, null, [], [], 'calidad', 'modelo3d')
      : await llamarOpenAICompat(prov, system, descripcion, null, [], [], 'modelo3d')
  if (!respuesta) throw new Error('La IA no devolvió ninguna forma')

  // Tolerar texto/markdown alrededor: extraer el primer arreglo JSON.
  const ini = respuesta.indexOf('[')
  const fin = respuesta.lastIndexOf(']')
  if (ini < 0 || fin <= ini) throw new Error('Respuesta sin JSON de piezas')
  const piezas = JSON.parse(respuesta.slice(ini, fin + 1)) as Pieza3D[]
  const validas = piezas.filter(
    (p) =>
      ['caja', 'esfera', 'cono', 'cilindro', 'plano'].includes(p.tipo) &&
      Array.isArray(p.pos) &&
      p.pos.length === 3 &&
      Array.isArray(p.tam) &&
      p.tam.length > 0 &&
      typeof p.color === 'string',
  )
  if (validas.length === 0) throw new Error('La IA no devolvió piezas válidas')
  const grupo = tipo === 'objeto' ? extraerGrupoAccion(respuesta.slice(fin + 1)) : null
  return { piezas: validas, grupo }
}

/**
 * TOOLS_EDITOR con la última tool marcada como breakpoint de caché: el bloque
 * es estático por build y va PRIMERO en el arreglo, así el prefijo cacheado
 * (~5.5k tokens) se comparte entre TODOS los usuarios del proxy.
 */
const TOOLS_EDITOR_CACHE: ToolNeutra[] = TOOLS_EDITOR.map((t, i, a) =>
  i === a.length - 1 ? { ...t, cache: true } : t,
)

export async function interpretarIA(
  texto: string,
  mascotaId: string,
  imagen: ImagenAdjunta | null = null,
  historialCrudo: MensajeIA[] = [],
): Promise<ResultadoIA> {
  exigirTransporte()
  const prov = getProveedor()

  // Alternancia estricta: si el hilo quedó en un turno del usuario (la IA no
  // llegó a responder), ese texto se funde con el mensaje actual.
  const historial = normalizarHistorial(historialCrudo)
  if (historial.length && historial[historial.length - 1].rol === 'usuario') {
    const previo = historial.pop() as MensajeIA
    texto = `${previo.texto}\n\n${texto}`
  }

  // Gating: las 54 tools del editor (y sus párrafos del system) solo viajan
  // si el mensaje o los últimos turnos huelen a edición/control de la casa.
  const conEditor = hayIntencionEditor([...historial.slice(-2).map((m) => m.texto), texto])
  const tools = conEditor
    ? [...TOOLS_EDITOR_CACHE, ...construirTools(getAsistente(mascotaId).cuartos)]
    : construirTools(getAsistente(mascotaId).cuartos)
  const system = await construirSystem(mascotaId, !!imagen, conEditor)

  const { respuesta, llamadas } =
    prov.id === 'claude'
      ? await llamarClaude(system, texto, imagen, tools, historial)
      : await llamarOpenAICompat(prov, system, texto, imagen, tools, historial)

  const resultado: ResultadoIA = {
    roomIds: [],
    capturado: false,
    memoriaGuardada: false,
    ediciones: [],
    destinos: [],
    respuesta,
  }

  for (const { name, input } of llamadas) {
    if (name.startsWith('editor_')) {
      const confirm = await ejecutarToolEditor(name, input)
      if (confirm) {
        resultado.ediciones.push(confirm)
        sumarDestino(resultado.destinos, destinoDeTool(name))
      }
      continue
    }
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
      sumarDestino(resultado.destinos, destinoDeTool(name))
      continue
    }
    if (name === 'crear_modelo_3d') {
      const descripcion = typeof input.descripcion === 'string' ? input.descripcion.trim() : ''
      if (!descripcion) continue
      const tipo: TipoModelo3D =
        input.tipo === 'personaje' || input.tipo === 'arquitectura' ? input.tipo : 'objeto'
      const estilo: EstiloModelo3D = ['detallado', 'minimalista', 'redondeado', 'bloques'].includes(
        input.estilo as string,
      )
        ? (input.estilo as EstiloModelo3D)
        : 'normal'
      try {
        const { piezas, grupo } = await generarModelo3D(descripcion, tipo, estilo)
        const categoria =
          tipo === 'personaje' ? 'Personajes' : tipo === 'arquitectura' ? 'Arquitectura' : 'Objetos'
        const libId = await useDiseño
          .getState()
          .addObjetoLibreria(
            TIPO_PIEZAS,
            piezas[0]?.color ?? '#f59e0b',
            categoria,
            piezas,
            grupo && grupo !== 'ninguno' ? grupo : undefined,
          )
        // Coloca una copia junto al avatar (mismo punto donde se reubica el asistente).
        await useDiseño
          .getState()
          .instanciarObjetoEnMapa(libId, { x: playerPos.x + 1.2, z: playerPos.z + 1.2 })
        resultado.creado3d = descripcion
        sumarDestino(resultado.destinos, destinoDeTool(name))
      } catch (err) {
        console.warn('[MPH] No se pudo crear el modelo 3D desde el chat:', err)
      }
      continue
    }
    if (name === 'generar_imagen') {
      const descripcion = typeof input.descripcion === 'string' ? input.descripcion.trim() : ''
      if (!descripcion) continue
      const aspectos: AspectoImagen[] = ['1:1', '16:9', '9:16', '4:3', '3:4']
      const aspecto = aspectos.includes(input.aspecto as AspectoImagen) ? (input.aspecto as AspectoImagen) : '1:1'
      try {
        resultado.imagen = await generarImagen(descripcion, 768, undefined, aspecto)
      } catch (err) {
        // Sin relanzar: el modal de cuota ya lo abre la capa de cuenta, y así
        // no se pierden ni la respuesta ni los registros del mismo turno.
        console.warn('[MPH] No se pudo generar la imagen desde el chat:', err)
        resultado.imagenFallo = true
      }
      continue
    }
    const [roomId, esquemaId] = name.split('__')
    const esquema = getPlantilla(roomId)?.esquemas?.find((e) => e.id === esquemaId)
    if (!esquema) continue
    await esquema.guardar(input)
    resultado.capturado = true
    sumarDestino(resultado.destinos, { tipo: 'app', appId: roomId })
    if (!resultado.roomIds.includes(roomId)) resultado.roomIds.push(roomId)
  }

  return resultado
}
