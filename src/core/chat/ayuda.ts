import { normalizar } from './dispatcher'
import { plantillasTodas } from '../registry'
import { claveNucleoDe, tutorialDeApp, tutorialMenuPorId } from '../tutorial/registro'
import { tutorialCasa } from '../tutorial/menus.meta'
import type { TutorialDef } from '../tutorial/tipos'

/**
 * Capa de ayuda del chat (determinista, sin IA):
 *   «¿cómo funciona X?» → responde con el resumen del tutorial de X.
 *   «tutorial de X»     → abre la superficie de X y lanza el tour del mago.
 * X puede ser una app (la detecta el dispatcher por nombre) o un menú/HUD
 * (diccionario de alias de abajo).
 */

export interface AyudaDetectada {
  modo: 'explicar' | 'tour'
  tutorial: TutorialDef
  /** Id de plantilla si el objetivo es una app (para nombrarla traducida). */
  plantillaId?: string
  /**
   * Clave con la que lanzar el tour cuando corre sobre la casa demo pero no es
   * una app (los del calendario). Aparte de `plantillaId` porque ese id se usa
   * para nombrar la app, y aquí no hay ninguna que nombrar.
   */
  claveFlujo?: string
}

// Verbos (sobre texto normalizado, sin acentos). ES + EN.
const RE_TOUR = /\b(tutorial(es)?|ensename|muestrame|guiame|show me)\b/
const RE_EXPLICAR =
  /(como (funciona|se usa|se usan|uso|sirve)|que (es|hace|hacen)|para que (es|sirve)|ayuda con|explicame|explica el|explica la|how (does|do) .*work|how (do i|to) use|what (is|does)|help with)/

/** Alias de menús/HUD → id de tutorial (los más específicos primero). */
const ALIAS_MENU: [string, string][] = [
  ['rueda de herramientas', 'herramientas'],
  ['menu de cuartos', 'menu-cuartos'],
  ['plantilla propia', 'plantillas-custom'],
  ['plantillas propias', 'plantillas-custom'],
  ['plantillas personalizadas', 'plantillas-custom'],
  ['editor de personajes', 'editor-personajes'],
  ['editor de objetos', 'editor-objetos'],
  ['editor de mapa', 'editor-mapa'],
  ['plantillas', 'menu-plantillas'],
  ['inventario', 'menu-inventario'],
  ['herramientas', 'herramientas'],
  ['rueda', 'herramientas'],
  ['editor', 'editor-mapa'],
  ['mapa', 'editor-mapa'],
  // El calendario del reloj y su recorrido de metas: tours del núcleo, no de una app.
  ['cronograma', 'metas'],
  ['planes', 'metas'],
  ['metas', 'metas'],
  ['chips', 'enlaces'],
  ['enlaces', 'enlaces'],
  ['calendario', 'calendario'],
  ['reloj', 'calendario'],
  ['rutinas', 'rutinas'],
  ['montana de sisifo', 'progreso'],
  ['sisifo', 'progreso'],
  ['insignias', 'progreso'],
  ['rangos', 'progreso'],
  ['mi progreso', 'progreso'],
  ['mi resumen', 'wrapped'],
  ['wrapped', 'wrapped'],
  ['lista de hoy', 'hoy'],
  ['pasos de hoy', 'hoy'],
  ['musica', 'musica'],
  ['respaldo', 'respaldo'],
  ['copia de seguridad', 'respaldo'],
  ['exportar mis datos', 'respaldo'],
  ['inteligencia artificial', 'cuenta-ia'],
  ['creditos', 'cuenta-ia'],
  ['mi cuenta', 'cuenta-ia'],
  ['personajes', 'editor-personajes'],
  ['avatar', 'editor-personajes'],
  ['guardarropa', 'editor-personajes'],
  ['atuendos', 'editor-personajes'],
  ['ejemplo', 'ejemplos'],
  ['camara', 'navegacion'],
  ['vistas', 'navegacion'],
  ['navegacion', 'navegacion'],
  ['controles', 'navegacion'],
  ['moverme', 'navegacion'],
  ['registros del chat', 'chat-registros'],
  ['memorias', 'chat-registros'],
  ['asistentes', 'chat'],
  ['asistente', 'chat'],
  ['arquitecto', 'chat'],
  ['chat', 'chat'],
  ['cuartos', 'menu-cuartos'],
  ['menu', 'menu-cuartos'],
  ['hoy', 'hoy'],
  ['casa', 'casa'],
  ['juego', 'casa'],
]

/**
 * Busca una plantilla del catálogo por id o nombre corto mencionados en el
 * texto. Directo contra el catálogo (no contra las asignadas, como hace el
 * dispatcher): la ayuda debe funcionar aunque la app aún no esté en la casa.
 * Incluye las de infraestructura (huerto, granja, caminos, canchas), que nunca
 * se asignan a un cuarto pero también tienen tutorial.
 */
function buscarPlantilla(norm: string): string | null {
  for (const p of plantillasTodas()) {
    const id = normalizar(p.id)
    const nombre = normalizar(p.nombre.split(' · ')[0])
    if (norm.includes(` ${id} `) || norm.includes(` ${nombre} `)) return p.id
  }
  return null
}

/** Detecta una petición de ayuda/tutorial en el texto del chat; null si no lo es. */
export function interpretarAyuda(texto: string): AyudaDetectada | null {
  // Sin acentos ni puntuación («¿cómo funciona la cocina?» → ' como funciona la cocina ').
  const norm = ` ${normalizar(texto).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `
  const tour = RE_TOUR.test(norm)
  const explicar = RE_EXPLICAR.test(norm)
  if (!tour && !explicar) return null
  const modo: AyudaDetectada['modo'] = tour ? 'tour' : 'explicar'

  // 1. Apps: por id o nombre de plantilla («la cocina», «finanzas»), estén asignadas o no.
  const plantillaId = buscarPlantilla(norm)
  if (plantillaId) {
    const tutorial = tutorialDeApp(plantillaId)
    if (tutorial) return { modo, tutorial, plantillaId }
  }

  // 2. Menús/HUD por alias (incluidos los tours del núcleo).
  for (const [alias, id] of ALIAS_MENU) {
    if (norm.includes(` ${alias} `)) {
      const tutorial = tutorialMenuPorId(id)
      if (tutorial) return { modo, tutorial, claveFlujo: claveNucleoDe(tutorial.id) }
    }
  }

  // 3. «tutorial» a secas: el tour general de la casa.
  if (tour) return { modo, tutorial: tutorialCasa }
  return null
}
