import { plantillasTodas, type Plantilla } from '../registry'
import { useDiseño } from '../state/disenoStore'
import { useCuartos } from '../state/cuartosStore'

/**
 * Apps (plantillas) que el usuario realmente tiene: las asignadas a algún objeto
 * de algún cuarto. El orquestador SOLO clasifica/captura hacia estas (no hacia el
 * catálogo completo), porque la asignación vive en los objetos-app del cuarto.
 */
export function appsAsignadas(): Plantilla[] {
  const ids = new Set<string>()
  for (const o of useDiseño.getState().objetos) if (o.plantillaId) ids.add(o.plantillaId)
  return plantillasTodas().filter((p) => ids.has(p.id))
}

/**
 * El "arquitecto" sin IA.
 *
 * Recibe el texto del chat box y decide qué hacer con él. Esta es la ÚNICA
 * pieza con lógica de intención: cuando lleguen los wraps de IA, se reemplaza
 * `interpretar` por una versión que llama al modelo (misma firma), y ni el
 * ChatBox ni los cuartos cambian.
 *
 * Reglas deterministas (capa actual):
 *   0. Comandos del arquitecto: "agregar <cuarto>" / "quitar <cuarto>" /
 *      "recuerda que <hecho>" (memoria del arquitecto).
 *   1. Prefijo explícito `@cuarto` o `#cuarto` al inicio → gana siempre.
 *   2. Si no, primera palabra clave que coincida (orden de `rooms`).
 *   3. Si nada coincide → sin cuarto (queda sin clasificar en la bitácora).
 */

type Comando = 'agregar' | 'quitar' | 'recordar'

export interface Interpretacion {
  /** Cuarto principal detectado (primero), o null si quedó sin clasificar. */
  roomId: string | null
  /** TODOS los cuartos detectados (un mensaje puede tocar varios). */
  roomIds: string[]
  /** Texto a guardar (sin prefijos ni comandos). */
  texto: string
  /** Cómo se decidió (para mostrar feedback en la UI). */
  motivo: 'prefijo' | 'palabra' | 'ninguno'
  /** Comando del arquitecto si lo hay (no se guarda en bitácora). */
  comando?: Comando
  /** Objeto del catálogo a crear, si el usuario lo pidió. */
  objeto?: string
}

/** Palabras clave por cuarto (capa sin IA). Acentos ignorados al comparar. */
const PALABRAS: Record<string, string[]> = {
  // 'pese' (me pesé) y no 'peso': chocaría con ejercicio ("peso muerto").
  cocina: ['comi', 'comer', 'comida', 'desayuno', 'almuerzo', 'cena', 'nutricion', 'agua', 'calorias', 'receta', 'macros', 'pese'],
  ejercicio: ['entrene', 'gym', 'gimnasio', 'pesas', 'corri', 'correr', 'rutina', 'fuerza', 'cardio', 'flexibilidad'],
  descanso: ['dormi', 'sueno', 'descanse', 'descanso', 'siesta', 'alarma', 'despertador'],
  anecdotario: ['anecdota', 'anecdotario', 'recuerdo'],
  despacho: ['gaste', 'gasto', 'pague', 'compre', 'ingreso', 'dinero', 'presupuesto', 'ahorro', 'finanzas', 'factura', 'cobre'],
  biblioteca: ['estudie', 'aprendi', 'curso', 'leccion', 'tema'],
  entretenimiento: ['pelicula', 'serie', 'vi', 'jugue', 'videojuego', 'partida'],
  sala: ['viaje', 'viajar', 'vuelo', 'destino', 'ruta', 'bitacora', 'visite', 'visitar'],
  jardin: ['medite', 'meditacion', 'respiracion', 'gratitud', 'animo', 'mindfulness'],
  garage: ['coche', 'auto', 'moto', 'bici', 'bicicleta', 'mantenimiento', 'aceite', 'servicio', 'taller', 'odometro'],
  diario: ['noticia', 'noticias', 'briefing'],
  hobbies: ['hobby', 'pasatiempo', 'manualidad', 'proyecto'],
  idiomas: ['idioma', 'idiomas', 'vocabulario', 'ingles', 'frances', 'aleman', 'japones', 'italiano', 'portugues', 'repase', 'repasar', 'practique', 'tarjetas'],
}

/**
 * Sinónimos → id de objeto del catálogo (capa sin IA). Las claves deben existir
 * como `id` en CATALOGO (catalogo.tsx). Permite "crea una guitarra" → 'guitarra'.
 */
export const OBJETOS: Record<string, string[]> = {
  guitarra: ['guitarra', 'guitar'],
  planta: ['planta', 'maceta', 'flor', 'flores', 'cactus'],
  lampara: ['lampara', 'luz', 'foco'],
  silla: ['silla', 'asiento'],
  mesa: ['mesa', 'escritorio'],
  alfombra: ['alfombra', 'tapete'],
  baul: ['baul', 'cofre', 'caja'],
  cuadro: ['cuadro', 'pintura', 'foto', 'retrato'],
  pelota: ['pelota', 'balon', 'bola'],
  libro: ['libro', 'libreta', 'novela'],
}

/** Verbos que solo tienen sentido para crear un objeto (no para cuartos). */
const VERBOS_OBJETO = /^(crea|crear|genera|generar|generame|crearme|dame|fabrica|fabricar|invoca|invocar|construye|construir|haz|hazme|quiero|necesito)\s+(.+)$/

/** Busca un objeto del catálogo en un fragmento, ignorando artículos. */
function buscarObjeto(fragmento: string): string | undefined {
  const tokens = normalizar(fragmento)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  for (const tok of tokens) {
    for (const tipo in OBJETOS) {
      if (OBJETOS[tipo].includes(tok)) return tipo
    }
  }
  return undefined
}

/** Rango de marcas diacríticas combinadas (tildes) U+0300–U+036F. */
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Quita acentos y pasa a minúsculas para comparar sin fallar por tildes. */
export function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
}

/** Palabras a ignorar al buscar un cuarto (artículos, preposiciones, sufijos comunes). */
const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'en', 'y', 'mapa', 'cuarto', 'habitacion', 'room'])

/** Tokens relevantes de un fragmento (sin stopwords ni artículos). */
function tokensRelevantes(fragmento: string): string[] {
  return normalizar(fragmento)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Busca un CUARTO (instancia) por id o nombre — para comandos agregar/quitar. */
export function buscarCuarto(fragmento: string) {
  const tokens = tokensRelevantes(fragmento)
  if (tokens.length === 0) return undefined
  const cuartos = useCuartos.getState().cuartos
  for (const tok of tokens) {
    const exacto = cuartos.find((r) => r.id === tok)
    if (exacto) return exacto
  }
  for (const tok of tokens) {
    const parcial = cuartos.find(
      (r) => normalizar(r.id).startsWith(tok) || normalizar(r.nombre).startsWith(tok),
    )
    if (parcial) return parcial
  }
  return undefined
}

/** Busca una APP asignada por id o nombre — para forzar destino con @app. */
function buscarApp(fragmento: string) {
  const tokens = tokensRelevantes(fragmento)
  if (tokens.length === 0) return undefined
  const apps = appsAsignadas()
  for (const tok of tokens) {
    const exacto = apps.find((p) => p.id === tok)
    if (exacto) return exacto
  }
  for (const tok of tokens) {
    const parcial = apps.find(
      (p) => normalizar(p.id).startsWith(tok) || normalizar(p.nombre).startsWith(tok),
    )
    if (parcial) return parcial
  }
  return undefined
}

export function interpretar(texto: string): Interpretacion {
  const limpio = texto.trim()
  const norm = normalizar(limpio)

  // 0. Crear objeto con verbo exclusivo: "crea/genera/dame <objeto>"
  const objMatch = VERBOS_OBJETO.exec(norm)
  if (objMatch) {
    const tipo = buscarObjeto(objMatch[2])
    if (tipo) {
      return { roomId: null, roomIds: [], texto: limpio, motivo: 'prefijo', objeto: tipo }
    }
  }

  // 1. Memoria del arquitecto: "recuerda (que) <hecho>" / "memoriza <hecho>".
  //    Se aplica sobre el texto original para conservar acentos y mayúsculas.
  const recMatch = /^(?:recu[eé]rda(?:me)?|memoriza)\s+(?:que\s+)?([\s\S]+)$/i.exec(limpio)
  if (recMatch) {
    const hecho = recMatch[1].trim()
    // Etiqueta el hecho a las apps asignadas por palabras clave (igual que la bitácora).
    const tokensHecho = new Set(normalizar(hecho).split(/[^a-z0-9]+/).filter(Boolean))
    const relacionados = appsAsignadas()
      .filter((p) => PALABRAS[p.id]?.some((k) => tokensHecho.has(k)))
      .map((p) => p.id)
    return {
      roomId: relacionados[0] ?? null,
      roomIds: relacionados,
      texto: hecho,
      motivo: 'prefijo',
      comando: 'recordar',
    }
  }

  // 1b. Comandos del arquitecto: "agregar <cuarto>" / "quitar <cuarto>"
  const cmdMatch = /^(agregar|agrega|quitar|quita|añadir|añade|eliminar|elimina|poner|pon|coloca|colocar|remover|remueve)\s+(.+)$/i.exec(norm)
  if (cmdMatch) {
    const accion = cmdMatch[1]
    const VERBOS_QUITAR = new Set(['quitar', 'quita', 'eliminar', 'elimina', 'remover', 'remueve'])
    const cmd: Comando = VERBOS_QUITAR.has(accion) ? 'quitar' : 'agregar'
    const resto = cmdMatch[2].trim()
    const room = buscarCuarto(resto)
    if (room) {
      return { roomId: room.id, roomIds: [room.id], texto: limpio, motivo: 'prefijo', comando: cmd }
    }
    // "agrega/pon una guitarra" → no es cuarto, pero sí un objeto del catálogo
    if (cmd === 'agregar') {
      const tipo = buscarObjeto(resto)
      if (tipo) {
        return { roomId: null, roomIds: [], texto: limpio, motivo: 'prefijo', objeto: tipo }
      }
    }
  }

  // 2. Prefijo explícito @app / #app (fuerza el destino a una app asignada)
  const prefijo = /^[@#]([a-zà-ÿ]+)\s+([\s\S]+)$/i.exec(limpio)
  if (prefijo) {
    const app = buscarApp(prefijo[1])
    if (app) {
      return { roomId: app.id, roomIds: [app.id], texto: prefijo[2].trim(), motivo: 'prefijo' }
    }
  }

  // 3. Palabras clave: recolecta TODAS las apps asignadas mencionadas (multi-app).
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))
  const detectados: string[] = []
  for (const app of appsAsignadas()) {
    const claves = PALABRAS[app.id]
    if (claves && claves.some((k) => tokens.has(k))) detectados.push(app.id)
  }
  if (detectados.length > 0) {
    return { roomId: detectados[0], roomIds: detectados, texto: limpio, motivo: 'palabra' }
  }

  // 4. Sin clasificar
  return { roomId: null, roomIds: [], texto: limpio, motivo: 'ninguno' }
}
