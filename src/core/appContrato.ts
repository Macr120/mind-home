import type { ComponentType } from 'react'
import type { OperacionIA } from './cuenta/catalogoIA'
import { fechaLocalISO } from './fechaLocal'
import type { TutorialDef } from './tutorial/tipos'
// Solo el TIPO (se borra al compilar): no crea ciclo con la UI en tiempo de ejecución.
import type { Actividad } from './ui/HorarioActividad'
import type { ContextoPlanApp } from './planIA'

/**
 * El CONTRATO de una app (tipos y coerciones) y el catálogo vivo donde se
 * consultan. Módulo hoja a propósito: no importa ningún cuarto.
 *
 * Por qué separado de `registry.ts`: el registro importa las 21 apps para armar
 * la lista. Si los cuartos —o los servicios del núcleo que ellos usan (chat,
 * rutinas)— leyeran el contrato o el catálogo desde `registry.ts`, cada cuarto
 * volvería a entrar al núcleo y se formaría un ciclo de importación. En
 * producción se tolera, pero en desarrollo rompe el hot-reload con
 * `Cannot access '<X>' before initialization` (TDZ) al editar cualquier cuarto.
 *
 * Regla: los cuartos importan de AQUÍ, nunca de `registry.ts`.
 */

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

/** Lo que escribe el botón de registro de un objetivo (mismo motor que `PasoRutina`). */
export interface RegistroObjetivo {
  /** Esquema de captura de la app dueña (`Plantilla.esquemas[].id`). */
  esquemaId: string
  /** Valores del esquema; la `fecha` la pone quien registra. */
  valores: Record<string, unknown>
  /** Etiqueta del botón: clave i18n y su fallback en español. */
  clave: string
  etiquetaEs: string
}

/**
 * Un objetivo del día de una app: declarativo como `esquemas`. La app dice QUÉ
 * mide y el núcleo decide cómo se pinta, se palomea, se avisa y se agenda
 * (src/core/metaDiaria.ts, y la lista de hoy de src/core/hoy.ts).
 *
 * Una app puede declarar varios en `Plantilla.objetivosDia` — cocina mide el agua
 * y las comidas por separado, y cumplir una no es cumplir la otra. Sin ninguno, el
 * núcleo sintetiza la genérica ("registra algo hoy") leyendo las mismas fuentes que
 * la gamificación.
 */
export interface ObjetivoDia {
  /**
   * Clave i18n de la etiqueta, y ADEMÁS la identidad del objetivo dentro de su app:
   * es lo que distingue la palomita a mano del agua de la de las comidas. Única por
   * app y estable — cambiarla pierde los overrides ya guardados.
   */
  clave: string
  etiquetaEs: string
  /** 'ml', 'min', 'tarjetas'…; vacío = objetivo booleano (objetivo 1). */
  unidad?: string
  /**
   * Avance y objetivo del día. Lee por repos: se llama dentro de `useLiveQuery`,
   * que rastrea las consultas hechas aquí para re-ejecutarse sola. Un `fetch` o un
   * caché intermedio rompen esa reactividad, y con ella lo único que de verdad
   * importa: que el paso se tache solo en cuanto existe el registro.
   */
  del: (fecha: string) => Promise<AvanceDiario>
  /** Ni racha ni presión: se celebra pero nunca avisa (jardín). */
  sinRacha?: boolean
  /** Sección de la app a la que saltan el chip y la notificación. */
  seccion?: string
  /** Registro de un toque desde la lista de hoy; sin él, la fila solo lleva a su sección. */
  registro?: RegistroObjetivo
  /**
   * La cifra se puede cambiar desde su propia fila (escribe en `objetivosDiarios`).
   * Solo lo declaran los objetivos que leen `objetivoDiarioDe`: si el objetivo vive
   * en el perfil de la app —el agua, en el de nutrición— editarlo aquí crearía una
   * segunda verdad que la app ignoraría; esos llevan al suyo por `seccion`.
   */
  ajustable?: boolean
  /** El bloque de calendario que agenda este objetivo (botón 📅 de su fila). */
  actividad?: () => Actividad
}

/** Nombre histórico: la meta diaria era el único objetivo del día de una app. */
export type MetaDiaria = ObjetivoDia

/**
 * Una rutina YA creada en la app, ofrecida al planificador ✨ del cronograma: al
 * pedir un plan para una meta («preparar un maratón»), la IA elige de esta lista y
 * lo elegido se agenda con el MISMO bloque de calendario que la app escribiría.
 */
export interface RutinaSugerible {
  /** El bloque agendable, tal como lo arma la propia app (ver `agendarActividad`). */
  actividad: Actividad
  /** Familia con la que se elige con criterio («fuerza», «resistencia»…). */
  tipo: string
  /** La familia ya traducida, para pintarla en la sugerencia. */
  tipoEtiqueta: string
  descripcion?: string
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
 * Agregar una plantilla = crear su carpeta en src/rooms/ y registrarla en `registry.ts`.
 */
export interface Plantilla {
  id: string
  nombre: string
  /** Emoji de la plantilla (se hereda al cuarto/objeto si se desea). */
  icon: string
  categoria: 'cuerpo' | 'mente' | 'complemento' | 'config'
  color: string
  /**
   * La mini-app 2D que se abre al usar la plantilla. Las apps de código la
   * declaran con `lazy(() => import('./XApp'))`: los puntos de montaje
   * (RoomOverlay, PlantillasCatalogo) ya envuelven en Suspense+ErrorBoundary,
   * y así el código de los 21 cuartos no entra al bundle de arranque.
   */
  App: ComponentType
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
  /**
   * Varios objetivos del día (cocina: hidratación y comidas). Manda sobre
   * `metaDiaria`, que es el atajo para declarar uno solo; el PRIMERO de la lista
   * es el principal (el que avisa y el que sale en el widget).
   */
  objetivosDia?: ObjetivoDia[]
  /** La app NO tiene meta diaria (calendario, garage: no son un hábito). */
  sinMetaDiaria?: boolean
  /** Eventos con fecha que la app aporta al calendario (ver `EventoApp`). */
  eventos?: () => Promise<EventoApp[]>
  /** Rutinas existentes que el planificador ✨ del cronograma puede sugerir y agendar.
   * `ambitoId` acota cuando el cronograma es de UNA cosa (un hobby, un proyecto). */
  rutinasPlan?: (ambitoId?: string) => Promise<RutinaSugerible[]>
  /** Acota el planificador ✨: qué clase de plan genera la IA en esta app y con qué
   * datos reales del usuario. `ambitoId` acota igual que en `rutinasPlan`. */
  planMetas?: (ambitoId?: string) => Promise<ContextoPlanApp>
  /** Lo que se le puede pedir a la IA en esta app y cuánto cuesta, para el
   * catálogo de precios (`core/cuenta/catalogoIA.ts`). Se declaran en
   * `rooms/<id>/costosIA.ts`: así el núcleo arma la tabla sin importar cuartos. */
  operacionesIA?: OperacionIA[]
  /** Flujos de tutorial (menú del "?": varios tours profundos por app). Corren
   * sobre el año de datos de la CASA DEMO — ids 'app-<plantillaId>--<flujo>',
   * sin crear datos de ejemplo. Sin esto, la app cae en el tutorial genérico. */
  flujos?: TutorialDef[]
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

/* ── Catálogo vivo ──────────────────────────────────────────────────────────
 * Las dos listas se INYECTAN desde fuera (dependencia invertida): las apps de
 * código las publica `registry.ts` al evaluarse, y las personalizadas
 * `plantillasCustomStore`. Así los consumidores del catálogo (chat, rutinas,
 * el planificador) no importan a `registry.ts` y quedan fuera del ciclo.
 */

/** Apps de código, en el orden del catálogo. Las publica `registry.ts`. */
let codigo: Plantilla[] = []
/** Plantillas personalizadas sintetizadas (las publica plantillasCustomStore). */
const custom = new Map<string, Plantilla>()

/** La llama SOLO `registry.ts`, que es quien conoce las 21 apps de código. */
export const registrarPlantillasCodigo = (lista: Plantilla[]) => {
  codigo = lista
}

/** Reemplaza las plantillas personalizadas (la llama `registrarPlantillasCustom`). */
export const fijarPlantillasCustom = (lista: Plantilla[]) => {
  custom.clear()
  for (const p of lista) custom.set(p.id, p)
}

export const getPlantilla = (id: string) => codigo.find((p) => p.id === id) ?? custom.get(id)

/** Catálogo completo: apps de código + plantillas personalizadas. */
export const plantillasTodas = (): Plantilla[] => [...codigo, ...custom.values()]

export const esInfraestructura = (p: Plantilla) => p.tipo === 'infraestructura'

/** Plantillas asignables a cuartos/objetos (excluye las de infraestructura). */
export const plantillasCuarto = (): Plantilla[] =>
  plantillasTodas().filter((p) => !esInfraestructura(p))

/** Plantillas que se construyen en el mapa 3D (Caminos, Canchas, Huerto). */
export const plantillasInfraestructura = (): Plantilla[] => codigo.filter(esInfraestructura)

/**
 * Apps que se pueden agendar en el calendario. Coincide con las que tienen meta
 * diaria, y por eso se filtra por la misma bandera: las excluidas (el garage) no
 * son hábitos ni tienen nada suyo que ocurra a una hora.
 */
export const plantillasAgendables = (): Plantilla[] =>
  plantillasTodas().filter((p) => !p.sinMetaDiaria)
