import type { ComponentType } from 'react'
import biblioteca from '../rooms/biblioteca'
import calendario from '../rooms/calendario'
import hobbies from '../rooms/hobbies'
import idiomas from '../rooms/idiomas'
import entretenimiento from '../rooms/entretenimiento'
import garage from '../rooms/garage'
import jardin from '../rooms/jardin'
import sala from '../rooms/sala'
import cocina from '../rooms/cocina'
import ejercicio from '../rooms/ejercicio'
import despacho from '../rooms/despacho'
import diario from '../rooms/diario'
import descanso from '../rooms/descanso'
import anecdotario from '../rooms/anecdotario'
import caminos from '../rooms/caminos'
import canchas from '../rooms/canchas'
import huerto from '../rooms/huerto'
import granja from '../rooms/granja'
import { fechaLocalISO } from './fechaLocal'
import type { TutorialDef } from './tutorial/tipos'
/**
 * Esquema de captura declarativo: describe QUÉ datos forman un registro del
 * cuarto, sin decir cómo extraerlos del texto. La capa de IA leerá estos
 * esquemas como "herramientas" (el modelo llena los campos y `guardar` crea
 * el registro real vía repos). Las `descripcion` están escritas para el
 * modelo: deben bastar para llenar el campo sin ver el código.
 */
export interface CampoCaptura {
  campo: string
  tipo: 'texto' | 'numero' | 'fecha' | 'opcion' | 'lista'
  /** Qué significa el campo y cómo llenarlo (dirigida al modelo de IA). */
  descripcion: string
  /** Valores permitidos cuando tipo === 'opcion'. */
  opciones?: string[]
  requerido?: boolean
}

export interface EsquemaCaptura {
  /** Identificador del tipo de registro (ej. 'comida', 'agua'). */
  id: string
  /** Qué representa un registro de este tipo (dirigida al modelo de IA). */
  descripcion: string
  campos: CampoCaptura[]
  /** Crea el registro real a partir de los campos llenados (usa repos). */
  guardar: (valores: Record<string, unknown>) => Promise<void>
}

// Coerciones seguras para `guardar`: los valores llegan del modelo (unknown).
export const vTexto = (v: unknown, def = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : def)
export const vNumero = (v: unknown, def = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : def
}
export const vFecha = (v: unknown): string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fechaLocalISO()
/** Lista de textos; tolera que el modelo mande un string con saltos de línea. */
export const vLista = (v: unknown): string[] => {
  const items = Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []
  return items.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
}

/** Lo que se lleva hoy de una meta diaria. */
export interface AvanceDiario {
  /** Cuánto se lleva hoy, en la `unidad` de la meta. */
  hecho: number
  /** Objetivo del día. 0 = sin objetivo configurado: no se evalúa ni se avisa. */
  objetivo: number
  /** Texto corto ya formateado («1.2 / 2 L»); sin valor lo arma el núcleo. */
  detalle?: string
}

/**
 * Meta diaria de una app: declarativa como `esquemas`. La app dice QUÉ mide y el
 * núcleo decide cómo se pinta, se palomea, se avisa y se agenda (src/core/metaDiaria.ts).
 *
 * Solo hace falta declararla si la meta es cuantitativa o tiene un objetivo propio:
 * sin ella, el núcleo sintetiza la genérica ("registra algo hoy") leyendo las mismas
 * fuentes que la gamificación.
 */
export interface MetaDiaria {
  /** Clave i18n de la etiqueta, y su fallback en español. */
  clave: string
  etiquetaEs: string
  /** 'ml', 'min', 'tarjetas'…; vacío = meta booleana (objetivo 1). */
  unidad?: string
  /**
   * Avance y objetivo del día. Lee por repos: se llama dentro de `useLiveQuery`,
   * que rastrea las consultas hechas aquí para re-ejecutarse sola. Un `fetch` o un
   * caché intermedio rompen esa reactividad.
   */
  del: (fecha: string) => Promise<AvanceDiario>
  /** Ni racha ni presión: se celebra pero nunca avisa (jardín). */
  sinRacha?: boolean
  /** Sección de la app a la que saltan el chip y la notificación. */
  seccion?: string
}

/**
 * Evento con fecha que una app aporta al calendario (fila "sin hora"). Solo lectura:
 * el dato sigue siendo suyo y se edita en la app, no en el calendario.
 */
export interface EventoApp {
  /** yyyy-mm-dd */
  fecha: string
  /** Ya traducido por la app. */
  texto: string
  /** Sin valor, el emoji de la plantilla. */
  emoji?: string
  /** Hex; sin valor, el color de la plantilla. */
  color?: string
  /** Sección de la app a la que salta al tocarlo. */
  seccion?: string
}

/**
 * Plantilla de app: una mini-app 2D del catálogo que el usuario puede ASIGNAR a un
 * objeto de un cuarto. La plantilla NO es un cuarto; la identidad del cuarto vive en
 * `Cuarto` (src/core/data/db.ts) y el store dinámico `useCuartos`. Una plantilla aporta
 * el componente `App`, su captura rápida y sus esquemas para el orquestador/IA.
 *
 * Agregar una plantilla = crear su carpeta en src/rooms/ y registrarla abajo.
 */
export interface Plantilla {
  id: string
  nombre: string
  /** Emoji de la plantilla (se hereda al cuarto/objeto si se desea). */
  icon: string
  categoria: 'cuerpo' | 'mente' | 'complemento' | 'config'
  color: string
  /** La mini-app 2D que se abre al usar la plantilla. */
  App: ComponentType
  /** Legado: posición en la cuadrícula del modelo viejo (ya no se usa). */
  posicion?: [number, number, number]
  /**
   * Quick-capture determinista (regex): intenta convertir texto libre en un
   * registro real. Retorna true si guardó algo. Es el fallback sin red/sin IA;
   * la capa de IA usa `esquemas` en su lugar.
   */
  capturar?: (texto: string) => Promise<boolean>
  /** Tipos de registro que esta plantilla puede capturar (contrato para la IA). */
  esquemas?: EsquemaCaptura[]
  /** El cuarto de esta app nace SIN muros exteriores (espacio abierto, p. ej. jardín). */
  sinMuros?: boolean
  /** Secciones/juegos que se pueden abrir por chat («abre el recetario», «juega tetris»). */
  comandos?: ComandoApp[]
  /** Meta diaria propia; sin ella el núcleo sintetiza la genérica desde la actividad. */
  metaDiaria?: MetaDiaria
  /** La app NO tiene meta diaria (calendario, garage: no son un hábito). */
  sinMetaDiaria?: boolean
  /** Eventos con fecha que la app aporta al calendario (ver `EventoApp`). */
  eventos?: () => Promise<EventoApp[]>
  /** Tutorial guiado de la app (botón "?" del header del cuarto). */
  tutorial?: TutorialDef
  /** Tipo: de cuarto (default, asignable a objetos) o de infraestructura (se construye en el mapa). */
  tipo?: 'cuarto' | 'infraestructura'
  /** Solo infraestructura: entra al editor de construcción en el mapa 3D. */
  construir?: () => void
}

/**
 * Un deep link de la app pedible por chat. Al ejecutarse se abre el cuarto de la
 * app y se deja la intención (sección + dato) que la app lee al montarse
 * (`src/core/state/intencionApp.ts`).
 */
export interface ComandoApp {
  /** Sección interna que abre (la app la interpreta; normalmente el id de su pestaña). */
  seccion: string
  /** Dato extra de la sección (p. ej. el id del juego de mesa). */
  dato?: string
  /** Etiqueta corta para el chip del chat («Recetario», «Viborita»). */
  etiqueta: string
  /** Nombres con los que el usuario la pide (en minúsculas y sin acentos). */
  nombres: string[]
}

/** @deprecated Usar `Plantilla`. Alias para no romper los módulos de src/rooms/. */
export type RoomModule = Plantilla

/** Catálogo de plantillas (las apps). Antes eran los "cuartos" cableados. */
export const plantillas: Plantilla[] = [
  cocina,
  ejercicio,
  descanso,
  anecdotario,
  despacho,
  biblioteca,
  entretenimiento,
  sala,
  jardin,
  garage,
  diario,
  hobbies,
  idiomas,
  calendario,
  caminos,
  canchas,
  huerto,
  granja,
]

/** Plantillas personalizadas sintetizadas (las publica plantillasCustomStore al cargar/mutar). */
const custom = new Map<string, Plantilla>()

export const getPlantilla = (id: string) => plantillas.find((p) => p.id === id) ?? custom.get(id)

/** Catálogo completo: apps de código + plantillas personalizadas. */
export const plantillasTodas = (): Plantilla[] => [...plantillas, ...custom.values()]

export const esInfraestructura = (p: Plantilla) => p.tipo === 'infraestructura'

/** Plantillas asignables a cuartos/objetos (excluye las de infraestructura). */
export const plantillasCuarto = (): Plantilla[] =>
  plantillasTodas().filter((p) => !esInfraestructura(p))

/** Plantillas que se construyen en el mapa 3D (Caminos, Canchas, Huerto). */
export const plantillasInfraestructura = (): Plantilla[] => plantillas.filter(esInfraestructura)

/**
 * Apps que se pueden agendar en el calendario. Coincide con las que tienen meta
 * diaria, y por eso se filtra por la misma bandera: las excluidas (garage y el
 * propio calendario) no son hábitos ni tienen nada suyo que ocurra a una hora.
 */
export const plantillasAgendables = (): Plantilla[] =>
  plantillasTodas().filter((p) => !p.sinMetaDiaria)

/** Descripción corta de cada plantilla (para el catálogo de asignación). */
export const DESCRIPCIONES: Record<string, string> = {
  cocina: 'Nutrición: comidas, macros, agua, plan semanal, recetario y lista del súper.',
  ejercicio: 'Rutinas de fuerza, resistencia y flexibilidad con metas.',
  descanso: 'Tu sueño como un cielo nocturno: horario, despertador, puntuación y registro de noches.',
  anecdotario: 'Tu diario personal: anécdotas con fotos y el ánimo de cada día.',
  despacho: 'Finanzas: presupuesto, gastos por categoría, gráficas y metas.',
  biblioteca: 'Enciclopedia conversacional: charlas con IA, entradas wiki y sesiones de estudio.',
  entretenimiento: 'Archivo de películas, series, libros y juegos de mesa.',
  sala: 'Viajes: mapamundi con pines, lugares por conocer, rutas y bitácora.',
  jardin: 'Calma: meditaciones guiadas, respiración y agradecimientos.',
  garage: 'Mantenimiento de tus vehículos y sus servicios.',
  diario: 'Periódico del día: titulares con imagen y efemérides, con reparto por asistentes.',
  hobbies: 'Pasatiempos: sesiones de práctica, rachas, metas y proyectos.',
  idiomas: 'Aprende idiomas: tutor conversacional con IA, vocabulario con repaso espaciado, temario por niveles y ejercicios.',
  calendario: 'Tu calendario: eventos y rutinas por día, semana y mes.',
  caminos: 'Traza pistas de carreras, rieles de tren y montañas rusas sobre el mapa.',
  canchas: 'Coloca canchas de fútbol, tenis y básquet en el mapa.',
  huerto: 'Prepara parcelas, siembra cultivos, riégalos y cosecha en tiempo real.',
  granja: 'Cría gallinas, cerdos, cabras, ovejas y vacas; aliméntalos con tus cosechas.',
}

/**
 * Publica las plantillas personalizadas en el catálogo (reemplaza las anteriores).
 * Dependencia invertida: el store las sintetiza y las inyecta aquí para que
 * `getPlantilla` siga siendo síncrono para todos los consumidores.
 */
export function registrarPlantillasCustom(
  lista: Plantilla[],
  descripciones: Record<string, string>,
) {
  for (const id of custom.keys()) delete DESCRIPCIONES[id]
  custom.clear()
  for (const p of lista) custom.set(p.id, p)
  Object.assign(DESCRIPCIONES, descripciones)
}
