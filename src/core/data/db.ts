import Dexie, { type Table } from 'dexie'
import { esDemo, esDemoAutor } from '../edicion'
import { demoGuard } from './demoGuard'
import { fechaLocalISO } from '../fechaLocal'
import { nombreAleatorio } from '../house/nombresAnimales'
import { syncMiddleware } from './sync/middleware'
import { TABLAS_SYNC } from './sync/syncables'
import { haySandboxDemoSucio } from '../../demo/modo'

/**
 * Capa de datos LOCAL (IndexedDB vía Dexie).
 *
 * Este archivo es el ÚNICO punto que toca la base de datos directamente.
 * Cuando migremos a la nube (Supabase), reescribimos solo este archivo y
 * `repository.ts`; ninguna de las apps de los cuartos cambia.
 */

// ----- Entidades (modelos de datos compartidos) -----

/** Cada cuánto se repite un movimiento. Sin valor (filas viejas) = 'unico'. */
export type PeriodoMovimiento = 'unico' | 'dia' | 'semana' | 'mes' | 'anio'

export interface Transaccion {
  id?: number
  /** ISO yyyy-mm-dd. Si se repite, es la fecha en que ARRANCA la repetición. */
  fecha: string
  tipo: 'ingreso' | 'gasto'
  /** Texto libre: el usuario escribe la suya y la app le sugiere las conocidas. */
  categoria: string
  monto: number
  nota?: string
  /** Plazo: 'unico' o cada día/semana/mes/año (antes, la tabla `movimientosFijos`). */
  periodo?: PeriodoMovimiento
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
}

export interface RegistroSueno {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  horas: number
  calidad: number // 1-5
  nota?: string
  /** Hora en que se acostó ('HH:mm'); permite puntuar la constancia del horario. */
  horaAcostarse?: string
  /** Hora en que despertó ('HH:mm'). */
  horaDespertar?: string
  /** Veces que se despertó durante la noche. */
  interrupciones?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Horario de sueño y despertador (una fila, estilo Apple Sueño). */
export interface PerfilSueno {
  id?: number
  horaDormir: string    // 'HH:mm' hora de dormir programada
  horaDespertar: string // 'HH:mm' hora del despertador
  objetivoHoras: number // objetivo de sueño por noche
  alarmaActiva: boolean // el despertador suena (con la app abierta)
  // Recordatorios de la noche (opcionales: las filas viejas no los traen).
  avisoDormir?: boolean    // aviso a la hora de dormir
  avisoPantallas?: boolean // aviso una hora antes, para dejar las pantallas
  /** Tono del despertador: id del catálogo o `pista:<id>` de `pistasMusica`. */
  tono?: string
  /** Volumen del despertador (0–1), independiente del de la música. */
  volumenAlarma?: number
  /** El despertador solo se apaga con una foto que la IA apruebe. */
  evidenciaActiva?: boolean
  /** Qué debe mostrar esa foto (ej. «mi cama tendida»). */
  evidenciaTarea?: string
}

interface Anecdota {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  titulo: string
  contenido: string
  animo: string // emoji o palabra
  /** Fotos del recuerdo (redimensionadas al guardar). */
  fotos?: Blob[]
  /**
   * Miniaturas ~200px, paralelas a `fotos` (mismo índice). Las rejillas pintan
   * la mini y el visor la foto completa. Dexie no indexa blobs: agregar el
   * campo NO requiere subir la versión del esquema. Entradas viejas no la
   * tienen y caen a la foto completa.
   */
  miniaturas?: Blob[]
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Meta de ahorro, inversión o deuda (Finanzas). */
export interface Meta {
  id?: number
  nombre: string
  objetivo: number
  /** Lo acumulado: ahorrado, invertido o pagado según el tipo. */
  ahorrado: number
  /** Las filas viejas no lo traen: cuentan como 'ahorro'. */
  tipo?: 'ahorro' | 'inversion' | 'deuda'
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
}

/**
 * Movimiento fijo mensual (Finanzas). RETIRADA en v105: lo fijo es ahora el
 * `periodo` de una `Transaccion`. La tabla se conserva (vacía tras migrar) para
 * que los respaldos anteriores sigan restaurando sin error.
 */
export interface MovimientoFijo {
  id?: number
  tipo: 'ingreso' | 'gasto'
  categoria: string
  monto: number
  nota?: string
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
}

/**
 * Posición del portafolio de inversiones (Finanzas). Los precios son en USD.
 * RETIRADA: el tercer menú del despacho es ahora Mercados (solo consulta); la
 * tabla se queda por los respaldos que ya la traigan.
 */
export interface Posicion {
  id?: number
  tipo: 'accion' | 'cripto'
  /** Ticker US (AAPL) o id de CoinGecko (bitcoin). */
  simbolo: string
  cantidad: number
  /** Precio de compra por unidad (USD). */
  costoUnitario: number
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
}

/** Presupuesto. categoria '__mensual__' = presupuesto total del mes. */
interface Presupuesto {
  id?: number
  categoria: string
  monto: number
}

/**
 * Activo que el usuario sigue en Mercados, en cualquiera de los cuatro mercados.
 * `mercado` y `etiqueta` son opcionales y sin índice nuevo, así que no hacen
 * falta migración ni versión: las filas anteriores son acciones.
 */
export interface AccionWatch {
  id?: number
  /**
   * Identificador según el mercado: ticker US (`AAPL`), par de divisas
   * (`EUR/GBP`), id de CoinGecko (`cardano`) o ETF de materia prima (`PALL`).
   */
  simbolo: string
  /** Sin valor = 'acciones' (las filas creadas antes de los cuatro mercados). */
  mercado?: 'divisas' | 'criptos' | 'acciones' | 'commodities'
  /** Nombre que le pone el usuario; las materias primas lo necesitan (los ETF no traen nombre). */
  etiqueta?: string
}

// ----- Cocina · Nutrición -----

/** Objetivos diarios de macros y agua (una fila por usuario). */
export interface PerfilNutricion {
  id?: number
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  aguaMl: number
  // Datos para la TDEE (persisten entre sesiones; el peso se sincroniza al pesarse).
  pesoKg?: number
  alturaCm?: number
  edad?: number
  sexo?: 'm' | 'f'
  /** Factor de actividad (1.2–1.9). */
  actividad?: number
  /** Preset de dieta aplicado sobre la TDEE. */
  objetivo?: 'deficit' | 'mantener' | 'superavit'
  /** Peso al que se quiere llegar (kg); ausente = sin meta de peso. */
  pesoObjetivoKg?: number
  /** Ritmo pactado en kg por semana (siempre positivo; el signo lo da `objetivo`). */
  ritmoKgSemana?: number
}

/** Pesaje corporal (kg) para seguir la tendencia de la dieta. */
export interface RegistroPeso {
  id?: number
  fecha: string
  kg: number
}

export type MomentoComida = 'desayuno' | 'comida' | 'cena' | 'snack'

/** Registro real de lo consumido. */
export interface RegistroComida {
  id?: number
  fecha: string
  momento: MomentoComida
  nombre: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  nota?: string
}

export interface RegistroAgua {
  id?: number
  fecha: string
  ml: number
}

/** Lista de compras guardada (colección con nombre) del súper. */
export interface ListaCompra {
  id?: number
  nombre: string
  creadoEn: string
  /**
   * Gasto del despacho (tabla `transacciones`) con la cuenta de esta lista. Se
   * crea al registrar la cuenta y se actualiza si el total cambia, así que la
   * compra vive en un único movimiento y no en uno por cada retoque.
   */
  gastoId?: number
}

/** Artículo de la lista de compras del súper, agrupado por categoría (pasillo). */
export interface ItemCompra {
  id?: number
  nombre: string
  /** Cantidad en texto libre: "2 kg", "3 piezas" (opcional). */
  cantidad?: string
  /** Id de CATEGORIAS_COMPRA (rooms/cocina/categoriasCompra.ts). */
  categoria: string
  comprado: boolean
  creadoEn: string
  /** Lista guardada a la que pertenece; ausente = suelto en el generador ("Crear lista"). */
  listaId?: number
  /** Lo que costó (la cuenta de la lista es su suma). */
  precio?: number
}

/** Receta del recetario (manual o pedida a la IA). Macros POR PORCIÓN. */
export interface Receta {
  id?: number
  nombre: string
  emoji: string
  porciones: number
  /** Tiempo total de preparación en minutos. */
  minutos: number
  etiquetas: string[]
  /** Carpeta/cocina para agrupar (ej. "Italiana", "Mexicana"). Vacío = sin carpeta. */
  carpeta?: string
  /** Cada ingrediente incluye su cantidad: "200 g de arroz". */
  ingredientes: string[]
  pasos: string[]
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  fuente: 'manual' | 'ia' | 'seed'
  creadaEn: string
  /** Foto del platillo: subida por el usuario o generada con IA (sin índice). */
  foto?: Blob
}

/** Dieta preguardada: plan de alimentación con recetas asociadas y metas opcionales. */
export interface DietaGuardada {
  id?: number
  nombre: string
  descripcion: string
  /** Metas opcionales que se pueden aplicar al perfil de objetivos. */
  calorias?: number
  proteinas?: number
  carbohidratos?: number
  grasas?: number
  /** Ids de Receta que acompañan a la dieta. */
  recetaIds: number[]
  creadoEn: string
  /** Portada opcional: subida por el usuario o generada con IA (sin índice). */
  foto?: Blob
}

// ----- Ejercicio · Rutinas -----

export type TipoEntrenamiento = 'fuerza' | 'resistencia' | 'flexibilidad'

/**
 * Sistema de medidas con el que se muestran pesos y distancias.
 * Los datos SIEMPRE se guardan en kg y km; esto solo afecta a la presentación.
 */
export type SistemaUnidades = 'internacional' | 'ingles'

/** Objetivos semanales por modalidad. */
export interface PerfilEjercicio {
  id?: number
  sesionesFuerzaSemana: number
  minutosResistenciaSemana: number
  minutosFlexibilidadSemana: number
  diasActivosSemana: number
  /** Sin índice: no necesita versión nueva de la base. */
  unidades?: SistemaUnidades
}

/** Sesión registrada (cualquier modalidad). */
export interface SesionEjercicio {
  id?: number
  fecha: string
  tipo: TipoEntrenamiento
  titulo: string
  duracionMin: number
  nota?: string
  /** Resistencia: km recorridos (opcional). */
  distanciaKm?: number
  /** Esfuerzo percibido 1–10 (todas las modalidades). */
  rpe?: number
  /** Flexibilidad: zona corporal o estilo. */
  enfoque?: string
  /** Fuerza: volumen total calculado (kg·reps). */
  volumenKg?: number
  /** Resistencia: pulsaciones promedio y máximas (sensor Bluetooth o manual). */
  ppmProm?: number
  ppmMax?: number
  /** Resistencia: trazo GPS de la ruta grabada en vivo. */
  ruta?: { lat: number; lng: number }[]
}

/** Serie de un ejercicio dentro de una sesión de fuerza. */
export interface SerieFuerza {
  id?: number
  sesionId: number
  ejercicio: string
  series: number
  repeticiones: number
  pesoKg: number
  orden: number
}

/** Rutina agendada en el plan semanal de ejercicio (0 = lunes … 6 = domingo). */
export interface RutinaProgramada {
  id?: number
  diaSemana: number
  tipo: TipoEntrenamiento
  rutinaNombre: string
  duracionMin: number
}

/** Rutina de fuerza (plantilla reutilizable): preguardada sembrada o creada por el usuario. */
export interface RutinaFuerza {
  id?: number
  nombre: string
  duracionMin: number
  ejercicios: string[]
  descripcion?: string
  creadoEn: string
}

/** Actividad de cardio añadida por el usuario al catálogo de resistencia. */
export interface ActividadCardio {
  id?: number
  nombre: string
  creadoEn: string
}

/** Categoría editable del catálogo de cardio (una lista de actividades). */
export interface CategoriaCardio {
  id?: number
  nombre: string
  actividades: string[]
  creadoEn: string
}

/** Rutina de flexibilidad (plantilla): sembrada de fundamentales o creada por el usuario. */
export interface RutinaFlex {
  id?: number
  nombre: string
  duracionMin: number
  ejercicios: string[]
  enfoque?: string
  descripcion?: string
  creadoEn: string
}

/** Ejercicio de fuerza dentro de un grupo del catálogo: nombre y técnica. */
export interface EjercicioFuerza {
  nombre: string
  descripcion?: string
}

/**
 * Grupo (categoría muscular) editable del catálogo de fuerza — p. ej. "Pecho".
 * `grupoId` es un slug estable: en los grupos de la semilla coincide con el id
 * original que referencia la pirámide de enfoques (`ejercicio.grupo.<id>` en i18n).
 */
export interface GrupoFuerza {
  id?: number
  grupoId: string
  label: string
  orden: number
  ejercicios: EjercicioFuerza[]
}

/** Postura de flexibilidad dentro de un grupo del catálogo. */
export interface EjercicioFlex {
  nombre: string
  descripcion?: string
  dificultad?: string
  tiempo?: string
}

/** Grupo (enfoque) editable del catálogo de flexibilidad. */
export interface GrupoFlex {
  id?: number
  grupoId: string
  label: string
  orden: number
  ejercicios: EjercicioFlex[]
}

/** Actividad de cardio dentro de un grupo del catálogo: nombre y técnica. */
export interface EjercicioCardio {
  nombre: string
  descripcion?: string
}

/** Grupo (categoría) editable del catálogo de resistencia. Sustituye a `CategoriaCardio`. */
export interface GrupoCardio {
  id?: number
  grupoId: string
  label: string
  orden: number
  ejercicios: EjercicioCardio[]
}

/** Rutina de resistencia (plantilla): lista de actividades que se hacen como tramos. */
export interface RutinaCardio {
  id?: number
  nombre: string
  duracionMin: number
  ejercicios: string[]
  descripcion?: string
  creadoEn: string
}

/**
 * Tramo ("split", como en un triatlón) dentro de una sesión de resistencia: la
 * sesión es la suma de sus tramos. Las sesiones grabadas en vivo con GPS no
 * tienen tramos (son una sola actividad continua con su ruta).
 */
export interface SplitCardio {
  id?: number
  sesionId: number
  actividad: string
  minutos: number
  km?: number
  orden: number
}

/** Postura dentro de una sesión de flexibilidad: tiempo (seg) × repeticiones. */
export interface SerieFlex {
  id?: number
  sesionId: number
  ejercicio: string
  segundos: number
  repeticiones: number
  orden: number
}

/** Imagen (miniatura) subida para un ejercicio del catálogo; indexada por nombre normalizado. */
export interface ImagenEjercicio {
  id?: number
  /** Nombre del ejercicio normalizado (normalizarEjercicio); único. */
  clave: string
  imagen: Blob
}

// ----- Entretenimiento · Archivo multimedia -----

export type TipoMedia = 'pelicula' | 'serie' | 'libro' | 'videojuego'

export type EstadoMedia = 'pendiente' | 'en_curso' | 'completado'

/** Resumen de la obra generado por IA (no es la reseña del usuario). */
export interface ResumenMedia {
  /** Datos en una línea: año, país o estudio, duración/temporadas/páginas. */
  ficha: string
  sinopsis: string
  /** Apuntes cortos: temas, estilo, por qué destaca. */
  claves: string[]
  /** La sinopsis evita el desenlace (obra pendiente o en curso). */
  sinSpoilers: boolean
  /** Título del artículo en Wikipedia en inglés, si la IA lo reconoció. */
  wiki?: string
  creadoEn: string
}

/** Entrada del archivo personal (películas, series, libros, juegos). */
export interface MediaArchivo {
  id?: number
  tipo: TipoMedia
  titulo: string
  genero: string
  /** Fecha de consumo, lectura o estreno (ISO yyyy-mm-dd). */
  fecha: string
  estado: EstadoMedia
  /** Calificación 0–5 (0 = sin puntuar). */
  calificacion: number
  resena: string
  /** Autor, director, desarrollador, etc. */
  autor?: string
  /** Resumen pedido a la IA (campo sin índice: no sube versión). */
  resumen?: ResumenMedia
  /** URL remota de la carátula (Wikipedia u Open Library). */
  portada?: string
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

export type CategoriaJuegoMesa =
  | 'estrategia'
  | 'familiar'
  | 'party'
  | 'cooperativo'
  | 'rol'
  | 'cartas'
  | 'otro'

export type EstadoJuegoMesa = 'coleccion' | 'wishlist' | 'prestado'

/** Juego de mesa en la colección. */
export interface JuegoMesa {
  id?: number
  nombre: string
  categoria: CategoriaJuegoMesa
  jugadoresMin: number
  jugadoresMax: number
  /** Duración estimada en minutos. */
  duracionMin?: number
  editorial?: string
  calificacion: number
  notas: string
  vecesJugado: number
  ultimaPartida?: string
  estado: EstadoJuegoMesa
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

// ----- Biblioteca · Enciclopedia conversacional -----

/** Charla con el Sabio, clasificada en un campo del conocimiento (pilar). */
export interface ConversacionBiblio {
  id?: number
  /** Lo genera la IA tras el primer intercambio; editable por el usuario. */
  titulo: string
  /** Id de PILARES o 'general' mientras no esté clasificada. */
  pilarId: string
  /** Nodo del índice del que nació la charla (ancla de ramificación del árbol). */
  temaId?: string
  /** ISO: ya se ofreció/hizo la ramificación (panel 🌿); silencia el panel al salir. */
  ramificadaEn?: string
  creadoEn: string
  actualizadoEn: string
}

/** Mensaje dentro de una charla de la biblioteca. */
export interface MensajeBiblio {
  id?: number
  conversacionId: number
  rol: 'usuario' | 'asistente'
  texto: string
  creado: string
}

/** Entrada wiki de la enciclopedia personal (destilada de una charla o manual). */
export interface EntradaBiblio {
  id?: number
  /** Id de PILARES o 'general'. */
  pilarId: string
  /** Tema del índice de pilares.ts si aplica. */
  temaId?: string
  titulo: string
  resumen: string
  puntosClave: string[]
  /** Ilustración de la entrada (subida o generada con IA); sin índice, no pide migración. */
  imagen?: Blob
  /** Charla origen (ausente = entrada manual o charla borrada). */
  conversacionId?: number
  creadoEn: string
  actualizadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Sesión de estudio con temporizador (minutos por campo). */
export interface SesionEstudio {
  id?: number
  pilarId: string
  entradaId?: number
  minutos: number
  /** yyyy-mm-dd local. */
  fecha: string
  nota?: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Nodo dinámico del índice vivo (los temas de pilares.ts son el esqueleto estático). */
export interface TemaArbol {
  id?: number
  /** Id único estable ('din-…'); comparte espacio con los ids de pilares.ts en temaId de entradas/charlas. */
  temaId: string
  pilarId: string
  /** Id de tema estático, temaId de otro nodo dinámico, o null = raíz del campo (pregunta libre). */
  padreId: string | null
  titulo: string
  descripcion: string
  creadoEn: string
  /** Charla que lo desbloqueó (se desliga si la charla se borra). */
  conversacionId?: number
}

// ----- Diario · Periódico del día (titulares + efemérides) -----

export type CategoriaTitular =
  | 'mundo'
  | 'economia'
  | 'tecnologia'
  | 'salud'
  | 'deportes'
  | 'entretenimiento'

/** Titular del feed del día (tarjeta con imagen). */
export interface Titular {
  categoria: CategoriaTitular
  titulo: string
  resumen: string
  fuente: string
  url: string
  /** URL remota de la imagen del artículo (si el feed la trae). */
  imagen?: string
  /** Fecha-hora de publicación según el feed. */
  publicado: string
}

export type TipoEfemeride =
  | 'historia'
  | 'arte'
  | 'libro'
  | 'personalidad'
  | 'especie'
  | 'palabra'
  | 'frase'

/** Tarjeta de efeméride del día. */
export interface Efemeride {
  tipo: TipoEfemeride
  /** Evento / obra / libro / nombre / especie / palabra / cita. */
  titulo: string
  /** Artista / autor / ocupación / nombre científico / clase gramatical. */
  subtitulo?: string
  texto: string
  /** URL remota (Wikipedia). */
  imagen?: string
  /** '1885', 'n. 1975', … */
  anio?: string
}

/** Edición del periódico: efímera, solo vive la del día actual. */
export interface EdicionDiario {
  id?: number
  /** Fecha local yyyy-mm-dd. */
  fecha: string
  titulares: Titular[]
  efemerides: Efemeride[]
  /** Idioma con el que se armó; si cambia, la edición se rehace. */
  idioma?: 'es' | 'en'
}

/** Día en que se abrió el diario (histórico ligero para el progreso). */
export interface LecturaDiario {
  id?: number
  fecha: string
}

// ----- Sala · Viajes (mapa, lugares, rutas y bitácora) -----

/** Lugar del mundo: pendiente por conocer o ya visitado. */
export interface LugarViaje {
  id?: number
  nombre: string
  pais: string
  estado?: string
  ciudad?: string
  lat?: number
  lng?: number
  /** 0 = por conocer, 1 = visitado (numérico para poder indexarlo). */
  visitado: 0 | 1
  fechaVisita?: string
  /** Fecha agendada del lugar (solo pendientes; aparece en el calendario). */
  fechaPlan?: string
  /** Meta de ahorro vinculada en el despacho (suma de su hoja de plan). */
  metaId?: number
  nota?: string
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Fila de la hoja de plan día a día de un lugar por conocer. */
export interface DiaItinerario {
  id?: number
  lugarId: number
  /** Día 1, 2, 3… (autonumerado al agregar). */
  dia: number
  /** yyyy-mm-dd → aparece en el calendario global. */
  fecha?: string
  inicio?: string
  destino?: string
  hospedaje?: string
  actividades?: string
  transporte?: string
  presupuesto?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Ruta de viaje: secuencia ordenada de lugares. */
export interface RutaViaje {
  id?: number
  nombre: string
  lugarIds: number[]
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Foto de portada elegida para la carpeta (país) de la bitácora. */
export interface PortadaViaje {
  id?: number
  pais: string
  foto: Blob
}

/** Foto de portada elegida para el álbum de un lugar de la bitácora. */
export interface PortadaLugar {
  id?: number
  lugarId: number
  foto: Blob
}

/** Fila congelada dentro de un itinerario guardado (copia, no referencia a diasItinerario). */
export interface FilaItinerarioGuardado {
  dia: number
  fecha?: string
  inicio?: string
  destino?: string
  hospedaje?: string
  actividades?: string
  transporte?: string
  presupuesto?: number
}

/** Itinerario guardado a mano: snapshot independiente del lugar de origen (sobrevive aunque se borre). */
export interface ItinerarioGuardado {
  id?: number
  nombre: string
  contexto?: string
  filas: FilaItinerarioGuardado[]
  creadoEn: string
}

/** Recuerdo de la bitácora de viajes: foto y anécdota de un lugar visitado. */
export interface RecuerdoViaje {
  id?: number
  lugarId: number
  fecha: string
  texto: string
  fotos?: Blob[]
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

// ----- Jardín · Mindfulness -----

export type TipoPractica =
  | 'meditacion'
  | 'respiracion'
  | 'sueno'
  | 'gratitud'
  | 'sonido'
  | 'movimiento'

/** Sesión de meditación o respiración completada. */
export interface SesionMindfulness {
  id?: number
  fecha: string
  tipo: TipoPractica
  titulo: string
  duracionMin: number
  nota?: string
  /** Pista de sonido de la meditación (bosque, lluvia…) o patrón de respiración (caja, 478). */
  tema?: string
  /** Check-in emocional 1–5 antes/después de la sesión (opcional). */
  animoAntes?: number
  animoDespues?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Legado (app vieja del jardín): se conserva por datos históricos. */
export interface RegistroAnimo {
  id?: number
  fecha: string
  nivel: number
  emocion: string
  nota?: string
}

/** Diario de gratitud (tres cosas del día). */
export interface GratitudDiaria {
  id?: number
  fecha: string
  item1: string
  item2: string
  item3: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Legado (app vieja del jardín): se conserva por datos históricos. */
export interface PerfilMindfulness {
  id?: number
  minutosDiariosObjetivo: number
}

/** Tipos de vehículo en el garaje. */
export type TipoVehiculo =
  | 'bicicleta'
  | 'auto'
  | 'moto'
  | 'scooter'
  | 'camioneta'
  | 'otro'

type UnidadOdometro = 'km' | 'mi'

/** Vehículo registrado (bicicleta, auto, moto, etc.). */
export interface Vehiculo {
  id?: number
  nombre: string
  tipo: TipoVehiculo
  marca?: string
  modelo?: string
  anio?: number
  matricula?: string
  odometroActual?: number
  unidad: UnidadOdometro
  notas?: string
  creadoEn: string
}

/** Categoría de servicio o mantenimiento. */
export type TipoMantenimiento =
  | 'aceite'
  | 'filtros'
  | 'frenos'
  | 'llantas'
  | 'cadena'
  | 'transmision'
  | 'bateria'
  | 'revision'
  | 'lavado'
  | 'seguro'
  | 'licencia'
  | 'otro'

/** Registro de mantenimiento o servicio realizado. */
export interface RegistroMantenimiento {
  id?: number
  vehiculoId: number
  fecha: string
  tipo: TipoMantenimiento
  titulo: string
  costo?: number
  odometro?: number
  taller?: string
  nota?: string
  proximoOdometro?: number
  proximaFecha?: string
}

/**
 * Trámite o documento periódico de un vehículo. Los cuatro primeros solo tienen
 * sentido con placa (`Vehiculo.matricula`): una bicicleta no paga tenencia.
 */
export type TipoTramite =
  | 'mantenimiento'
  | 'tenencia'
  | 'verificacion'
  | 'circulacion'
  | 'seguro'
  | 'otro'

/**
 * Obligación con fecha de un vehículo (tenencia, verificación, póliza, servicio).
 * `fecha` es SIEMPRE el próximo vencimiento: al marcarlo hecho se guarda el gasto
 * en `registrosMantenimiento` y la fecha salta `cadaMeses` hacia adelante, así que
 * la fila no crece con el historial y el calendario nunca tiene que repetirla.
 */
export interface TramiteVehiculo {
  id?: number
  /** Id estable ('tv-…'): amarra las rutinas que proyecta en el calendario. */
  tramiteId: string
  vehiculoId: number
  tipo: TipoTramite
  titulo: string
  /** Próximo vencimiento (yyyy-mm-dd). */
  fecha: string
  /** 'HH:mm' del recordatorio; vacío = HORA_TRAMITE. */
  hora?: string
  /** Meses entre repeticiones; 0/ausente = trámite de una sola vez. */
  cadaMeses?: number
  /** Días de anticipación del aviso previo; 0/ausente = avisar solo el día. */
  avisoDias?: number
  costo?: number
  /** Póliza, folio o número de referencia. */
  folio?: string
  /** Contacto que lo atiende (`TallerVehiculo.tallerId`). */
  tallerId?: string
  nota?: string
  activo: boolean
  creadoEn: string
}

/** A qué se dedica el contacto guardado en el garaje. */
export type TipoTaller =
  | 'taller'
  | 'aseguradora'
  | 'verificentro'
  | 'refaccionaria'
  | 'grua'
  | 'otro'

/** Contacto del garaje: mecánico, aseguradora, verificentro, grúa… */
export interface TallerVehiculo {
  id?: number
  /** Id estable ('tl-…'): es lo que guarda `TramiteVehiculo.tallerId`. */
  tallerId: string
  nombre: string
  tipo: TipoTaller
  telefono?: string
  correo?: string
  direccion?: string
  /** Vehículo al que atiende; vacío = sirve para todos. */
  vehiculoId?: number
  notas?: string
  creadoEn: string
}

// ----- Perfil y personalización de la casa (editor de mapa) -----

/** Personalización visual de un cuarto. */
export interface DisenoRoom {
  id?: number
  roomId: string  // coincide con RoomModule.id
  color: string   // hex
  nombre?: string // nombre personalizado (vacío = usar el default)
  muebleColor?: string // color del mueble principal (vacío = default)
  /** Material del piso interno; vacío = derivar del color del cuarto. */
  pisoTipo?: string
  /** Color del piso cuando no hay material o es personalizado. */
  pisoColor?: string
  /**
   * Material del piso EXTERIOR de las celdas con forma (triángulo/círculo): el trozo
   * de celda fuera de la silueta del cuarto. Id de material, '__color__' = color sólido
   * (pisoExtColor), ausente/'' = jardín por defecto.
   */
  pisoExtTipo?: string
  /** Color del piso exterior cuando pisoExtTipo = '__color__'. */
  pisoExtColor?: string
  /** Tinte de color del techo (vacío = color nativo del material). */
  techoColor?: string
  /**
   * Techo propio del cuarto: id del material, '__color__' = color del cuarto,
   * ausente = heredar el techo global de la casa.
   */
  techoTipo?: string
  /** Forma del techo del cuarto (plano | dos_aguas | abovedado | cupula). */
  techoForma?: string
  /** Parámetros editables de la forma del techo (altura, aguas, curva, inclinación, dir). */
  techoParams?: import('../house/techos').TechoParams
  /** Celdas absolutas (col,row) donde el techo se extiende más allá del footprint. */
  techoExtra?: import('../house/walls').Cell[]
  /**
   * Forma de techo POR CELDA (clave `offCol,offRow`). Si una celda aparece aquí,
   * su techo se fabrica individualmente con esa forma; las demás usan la forma del
   * cuarto. Vacío/ausente = techo en conjunto (forma única del cuarto).
   */
  techoFormasCelda?: Record<string, import('../house/techos').TechoCeldaForma>
  /** Personalización del usuario de un tema (solo en filas centinela `__tema_ov_<id>__`). */
  temaOverride?: import('../house/temas').TemaOverride
  /** Config de efectos de "sin tema" (solo en la fila centinela `__estilo__`). */
  efectosConfig?: import('../house/estilos').EfectosConfig
}

/** Objeto colocado en un cuarto (catálogo o mueble temático). */
export interface ObjetoCuarto {
  id?: number
  roomId: string
  tipo: string  // id del catálogo, `mueble:<roomId>`, `recurso:<n>` o 'piezas'
  color: string // hex
  slot: number  // (heredado) ranura; con x/z se ignora
  x?: number    // posición libre dentro del cuarto (relativa al centro)
  z?: number
  /** Rotación en grados (eje Y = girar). */
  rotY?: number
  /** Rotación en grados eje X (inclinar adelante/atrás). */
  rotX?: number
  /** Rotación en grados eje Z (inclinar a los lados). */
  rotZ?: number
  /** Altura extra en unidades (levantar/flotar sobre el suelo). */
  y?: number
  /** Tamaño del objeto (1 = normal). Solo visual; no afecta colisiones. */
  escala?: number
  /** Intensidad de los efectos del objeto especial (agua, luz o velocidad del juego); 1 = normal. */
  fx?: number
  /** Objeto construido con geometría básica (tipo 'piezas'): sus primitivas. */
  piezas?: import('../chat/mascotas').Pieza3D[]
  /** Tipo previo de un objeto convertido a piezas (para regresar a lo predeterminado). */
  tipoOriginal?: string
  /** Nombre personalizado del objeto (vacío = el del catálogo/recurso o genérico). */
  nombre?: string
  /** Mueble principal del cuarto: no se puede quitar, sí mover y recolorear. */
  permanente?: boolean
  /** ID del grupo al que pertenece este objeto (para mover conjuntos juntos). */
  grupoId?: string
  /** Plantilla (app) asignada a este objeto; vacío = objeto decorativo sin app. */
  plantillaId?: string
  /** Solo objetos de biblioteca (roomId LIBRERIA): categoría/carpeta del inventario. */
  categoria?: string
  /** Solo objetos de biblioteca BASE: id del recurso del catálogo del que salió. */
  baseId?: number
  /** Solo objetos de biblioteca: posición dentro de su carpeta (drag & drop). */
  orden?: number
  /** Instancia colocada: id del objeto de biblioteca del que salió (para su fila hija en el inventario). */
  libreriaId?: number
  /** Objeto con un modelo .glb subido por el usuario (tipo 'glb'), ya optimizado/decimado. */
  modeloGlb?: Blob
  /** Animación del objeto (preset de conjunto y/o poses de piezas). */
  animacion?: import('../house/animacion').AnimacionModelo
  /** Foto del usuario mostrada en el marco (objetos especiales 'cuadro-foto' y 'espectacular'). */
  foto?: Blob
  /** Texto que muestra el letrero (solo anuncios: espectacular/letrero-vegas/letrero-neon). */
  texto?: string
}

/**
 * Cuarto creado por el usuario (instancia genérica). La identidad del cuarto es
 * independiente de las apps: las apps son plantillas que se asignan a los objetos
 * del cuarto (ver ObjetoCuarto.plantillaId). El layout 3D, el diseño y los objetos
 * se relacionan con el cuarto por su `id` (string).
 */
export interface Cuarto {
  /** Id estable generado al crear (referido por layout/disenoRooms/objetosCuarto). */
  id: string
  nombre: string
  /** Emoji que flota sobre el cuarto y se muestra en el menú. */
  icon: string
  color: string  // hex
  categoria: 'cuerpo' | 'mente' | 'complemento' | 'config'
  creado: string // ISO timestamp
  /** Orden de aparición en el menú lateral. */
  orden: number
  /** Ambiente musical fijado por el usuario ('silencio' = cuarto callado); ausente = auto por su app. */
  temaMusical?: import('../state/ajustesStore').MoodMusica | 'silencio'
}

/**
 * Cuadrante del mapa: rectángulo de celdas al que la cámara puede saltar en mapas
 * grandes. OJO: aquí "cuadrante" es una ZONA DEL MAPA, no el ¼ de celda del pincel
 * fino (`svgACuadrante`) ni las esquinas del HUD.
 */
export interface CuadranteMapa {
  id: string
  nombre: string
  /** Celda superior-izquierda. */
  col: number
  row: number
  /** Tamaño en celdas. */
  cols: number
  rows: number
  /** Color de la zona dibujada (los bloques automáticos no lo usan). */
  color?: string
}

/** Configuración global del mapa (tamaño de la rejilla). */
interface MapaConfig {
  id?: number
  cols: number
  rows: number
  /** Lado de cada celda en metros (default 6, ver walls.TAM_CELDA_BASE). */
  celda?: number
  /** Cuadrantes dibujados por el usuario (los automáticos se calculan, no se guardan). */
  cuadrantes?: CuadranteMapa[]
}

/**
 * Acceso para subir a un nivel ≥ 1: hay UNO por nivel, en la celda del primer cuarto
 * que se construyó en ese nivel. Conecta el nivel `nivel-1` con el `nivel`.
 */
export interface Acceso {
  id?: number
  nivel: number // nivel al que sube (≥ 1) o del sótano (-1)
  tipo: 'escalera' | 'elevador' | 'resbaladilla' | 'escalera-marina'
  col: number // celda ancla del acceso
  row: number
  /** Pared del cuarto superior a la que se ancla (N/S/E/O). Vacío = derivar hacia el centro. */
  lado?: 'N' | 'S' | 'E' | 'O'
}

/** Layout editable: qué cuartos están colocados, en qué celda y con qué forma. */
interface LayoutCuarto {
  id?: number
  roomId: string
  placed: boolean
  col?: number // celda ancla en la rejilla (vacío = celda por defecto)
  row?: number
  /** Forma del cuarto: celdas como offsets desde el ancla (vacío = legado w×h). */
  footprint?: { col: number; row: number }[]
  /** Nivel/piso del cuarto: 0 = planta baja (vacío = 0). */
  nivel?: number
  w?: number // legado: tamaño en celdas (ancho) — migrado a footprint
  h?: number // legado: tamaño en celdas (largo)
  /** Paredes/vanos manuales por arista. Clave `${offCol},${offRow},${lado}`. */
  muros?: Record<string, 'pared' | 'puerta' | 'abierto'>
  /** Estilo visual por arista (tipo y color de muro/puerta). */
  estilos?: Record<string, import('../house/murosPuertas').EstiloArista>
  /** Pincel activo: tipos y colores por defecto al pintar aristas nuevas. */
  pinceles?: import('../house/murosPuertas').PincelesCuarto
  /** Forma de loseta por offset de footprint: clave `offCol,offRow`. */
  formasCelda?: Record<string, { forma: 'cuadrado' | 'triangular' | 'circular'; rotacion: 0 | 90 | 180 | 270 }>
  /** Espacio abierto (jardín): no dibuja muros, puertas/portones ni techo, y no colisiona. */
  sinMuros?: boolean
  /** Alberca (solo sótanos): el cuarto se llena de agua animada y nunca lleva techo. */
  agua?: boolean
  /** Legado: desplazamiento de puerta por lado (ya no se usa). */
  puertas?: Partial<Record<'N' | 'S' | 'E' | 'O', number>>
}

/** Imagen personalizada de piso de un cuarto. */
interface PisoImagenCuarto {
  id?: number
  roomId: string
  imagen: Blob
  /** Repeticiones por celda: 'x1' | 'x2' | 'x4' */
  ajuste: string
  /** ¿Está siendo usada actualmente como piso del cuarto? */
  activa: boolean
}

/** Imagen personalizada de techo de un cuarto. */
interface TechoImagenCuarto {
  id?: number
  roomId: string
  imagen: Blob
  /** Repeticiones por celda: 'x1' | 'x2' | 'x4' */
  ajuste: string
  /** ¿Está siendo usada actualmente como techo del cuarto? */
  activa: boolean
}

/** Imagen personalizada de un muro (arista) de un cuarto. */
interface MuroImagenCuarto {
  id?: number
  roomId: string
  /** Clave de arista `${offCol},${offRow},${lado}`. */
  clave: string
  imagen: Blob
  /** Repeticiones de la textura: 'x1' | 'x2' | 'x4' */
  ajuste: string
  /** ¿Está siendo usada actualmente como textura del muro? */
  activa: boolean
}

/** Grafiti pintado sobre una cara de un muro (juguete Grafiti). */
export interface Grafiti {
  id?: number
  /** Identidad de la cara: `cuarto:${roomId}:${clave}:${cara}` (cara N|S|E|O mundial)
   *  o `libre:${muroLibreId}:${seg}:${cara}` (cara A|B local del segmento). */
  superficie: string
  /** PNG con transparencia (proporción = cara del muro). */
  imagen: Blob
}

/** Imagen personalizada de fondo de cielo (wallpaper). */
export interface FondoImagen {
  id?: number
  nombre: string
  imagen: Blob
  ancho: number
  alto: number
  /** Punto de anclaje horizontal 0–1. */
  ajusteX: number
  /** Punto de anclaje vertical 0–1. */
  ajusteY: number
  /** Zoom (1 = cubrir). */
  escala: number
  creado: string
}

/** Colores del avatar Roblox del usuario. */
interface DisenoAvatar {
  id?: number
  /** Nombre del personaje principal (vacío = "Tú" por defecto). */
  nombre?: string
  cabeza: string   // hex
  torso: string    // hex
  piernas: string  // hex
  /** Tamaño del personaje (1 = normal). */
  escala?: number
  /** Ropa puesta: JSON de prendas (Ropa de house/apariencia). */
  ropa?: string
  /** Expresión del rostro dibujado (ExpresionId de house/apariencia; '' = por defecto). */
  expresion?: string
  /** Imagen de rostro subida por el usuario (tapa el frente de la cabeza). */
  rostro?: Blob
  /** Peinado dibujado (PeinadoId de house/apariencia; '' = sin pelo). */
  peinado?: string
  /** Color del pelo ('' = por defecto). */
  peloColor?: string
  /** Forma integrada (MascotaId) usada como cuerpo del avatar ('' = ninguna). */
  forma?: string
  /** Color del cuerpo con `forma` ('' = el propio de la forma, COLOR_FORMA). */
  formaColor?: string
  /** Qué preset de CUERPOS_PRESET (o 'base') originó `modelo3d` ('' = ninguno/editado). */
  cuerpoPresetId?: string
  /** Modelo 3D generado por IA: JSON de piezas primitivas (Pieza3D[]). */
  modelo3d?: string
  /** Modelo .glb subido por el usuario (gana a modelo3d y a los cubos). */
  modeloGlb?: Blob
  /** Animación del personaje: JSON de AnimacionModelo (house/animacion). */
  animacion?: string
  /** Prendas a medida puestas: JSON de {refId, nombre, piezas} (guardarropa). */
  ropaCustom?: string
}

/**
 * Guardarropa a medida: prendas creadas por el usuario (por IA o a mano) que se
 * pueden poner al personaje principal. `piezas` es el JSON de las primitivas
 * (Pieza3D[]). Tabla LOCAL (no sincroniza); lo puesto viaja inline en el avatar.
 */
interface PrendaCustom {
  id?: number
  nombre: string
  /** JSON de Pieza3D[] (la geometría de la prenda). */
  piezas: string
  creadoEn: number
}

/**
 * Atuendo guardado por el usuario: una combinación de prendas (con sus colores)
 * lista para aplicarse de un toque. Tabla LOCAL (no sincroniza), igual que
 * `prendasCustom`.
 */
interface AtuendoGuardado {
  id?: number
  nombre: string
  /** JSON de Ropa (house/apariencia): qué prendas lleva y de qué color. */
  ropa: string
  creadoEn: number
}

// ----- Bitácora · el arquitecto (orquestador) -----

/**
 * Entrada de la bitácora: lo que el usuario le dice al "arquitecto" desde el
 * chat box. En la capa SIN IA se guarda el texto tal cual, etiquetado al cuarto
 * que el dispatcher determinista detecta (o sin cuarto). La capa de IA luego
 * leerá estas entradas para convertirlas en registros reales de cada cuarto.
 */
interface EntradaBitacora {
  id?: number
  texto: string
  roomId?: string   // id del cuarto detectado (vacío = sin clasificar)
  creado: string    // ISO timestamp
  /** true si quick-capture pudo convertirlo en un registro real del cuarto. */
  procesado?: boolean
}

/**
 * Memoria del arquitecto: un hecho destilado sobre el usuario que persiste
 * entre sesiones ("entrena en ayunas", "su presupuesto es $8000/mes").
 * Hoy se crean con el comando "recuerda que…"; la capa de IA las generará
 * automáticamente desde la bitácora y las usará como contexto al interpretar.
 */
interface Memoria {
  id?: number
  hecho: string
  roomId?: string   // cuarto relacionado (vacío = sobre el usuario en general)
  origen?: number   // id de la entrada de bitácora que la originó
  creado: string    // ISO timestamp
  /** false = ya no aplica; se conserva como historia, la IA la ignora. */
  vigente: boolean
}

/**
 * A dónde lleva el chip de un mensaje del asistente: el menú de la app donde
 * quedó lo que ese turno guardó o cambió (app de un cuarto, side menu, editor…).
 */
export type DestinoChat =
  | { tipo: 'app'; appId: string; seccion?: string; dato?: string }
  | { tipo: 'menu'; tab: 'cuartos' | 'plantillas' | 'inventario' }
  | { tipo: 'editor'; tab: 'mapa' | 'personajes' | 'objetos' | 'config'; grupo?: string }
  | { tipo: 'rutinas' }

/**
 * Mensaje de la conversación con un asistente (interfaz tipo chat).
 * Cada asistente tiene su propio hilo: lo que el usuario escribió y lo que
 * el asistente respondió quedan aquí para releerlos cuando se quiera.
 */
interface MensajeChat {
  id?: number
  asistenteId: string // 'mago', 'gato', … o 'custom-<n>'
  rol: 'usuario' | 'asistente'
  texto: string
  creado: string // ISO timestamp
  /** Mapa de Ideas dibujado en ese turno: la conversación lo muestra en miniatura. */
  mapaId?: number
  /** Chip "abrir X" bajo el mensaje: lleva a donde quedó lo guardado. */
  destino?: DestinoChat
  /** Imagen generada con IA en ese turno: se muestra dentro de la burbuja. */
  imagen?: Blob
}

/**
 * Asistente guardado: personalización de uno integrado (mago, gato, …) o
 * uno creado por el usuario. Los integrados sin fila usan su plantilla.
 */
export interface AsistenteGuardado {
  id?: number
  asistenteId: string // coincide con la plantilla integrada o 'custom-<n>'
  nombre: string
  emoji: string
  forma: string // modelo 3D base: mago | gato | perro | buho | robot
  /** Historia/contexto del personaje (quién es, de dónde viene). */
  historia?: string
  personalidad: string
  saludo: string
  /** Ids de cuartos de los que es responsable de archivar (vacío = todos). */
  cuartos?: string[]
  color?: string // color principal del modelo 3D (vacío = el de la forma)
  /** Tamaño del personaje (1 = normal). */
  escala?: number
  /** Ropa puesta: JSON de prendas (Ropa de house/apariencia). */
  ropa?: string
  /** Qué preset de CUERPOS_PRESET (o 'base') originó `modelo3d` ('' = ninguno/editado). */
  cuerpoPresetId?: string
  /** Expresión del rostro dibujado (ExpresionId de house/apariencia; '' = por defecto). Solo Base/Princesa. */
  expresion?: string
  /** Imagen de rostro subida por el usuario (tapa el frente de la cabeza). Solo Base/Princesa. */
  rostro?: Blob
  /** Peinado dibujado (PeinadoId de house/apariencia; '' = sin pelo). Solo Base. */
  peinado?: string
  /** Color del pelo ('' = por defecto). */
  peloColor?: string
  /** Modelo 3D generado por IA: JSON de piezas primitivas (Pieza3D[]). */
  modelo3d?: string
  /** Modelo .glb subido por el usuario. */
  modeloGlb?: Blob
  /** Animación del personaje: JSON de AnimacionModelo (house/animacion). */
  animacion?: string
  enMapa: boolean // aparece como personaje en el mapa
  /** Voz TTS: nombre de la voz del sistema (vacío = automática por idioma). */
  vozNombre?: string
  /** Voz TTS: tono 0.5–1.5. */
  vozPitch?: number
  /** Voz TTS: velocidad 0.6–1.4. */
  vozRate?: number
  /** Corazón 0–1: qué tan seguido comenta por su cuenta (0 = nunca). */
  corazon?: number
  /** Integrado "eliminado" por el usuario (se puede restaurar). */
  oculto?: boolean
}

// ----- Rutinas orquestadas (la casa como orquestadora) -----

/**
 * Paso de una rutina: una acción en un cuarto. Si trae `esquemaId` + `valores`,
 * al completarlo se registra automáticamente vía el esquema de captura del
 * cuarto (la fecha se pone al completar); sin esquema es solo un check.
 */
export interface PasoRutina {
  titulo: string
  roomId: string
  esquemaId?: string
  valores?: Record<string, unknown>
}

/**
 * Cómo se repite un evento/rutina en el calendario.
 * - una_vez: solo en `fechaInicio`
 * - semanal: cada semana en los días de `dias` (puede terminar en `fechaFin`)
 * - indefinido: como semanal pero sin fecha de fin (`dias` vacío = todos los días)
 * - personalizado: legacy (se trata como semanal)
 * - mensual: el mismo día del mes que `fechaInicio`, cada mes
 * - anual: el mismo día y mes que `fechaInicio`, cada año
 * - rango: activa todos los días de `fechaInicio` a `fechaFin` (una meta con
 *   principio y final, trazada sobre el calendario)
 * (mensual/anual/rango solo salen de trazar una meta en el calendario; no
 * tienen editor manual, ver EditorRutina)
 */
export type RepeticionRutina =
  | 'una_vez'
  | 'semanal'
  | 'indefinido'
  | 'personalizado'
  | 'mensual'
  | 'anual'
  | 'rango'

/**
 * Capa con la que algo pinta en el calendario: año atrás (lava suave todo el año)
 * … hora al frente (solo su franja). Es jerarquía de fondo, no de estructura.
 *
 * En una rutina normal es un campo que se elige. En una meta ya NO se guarda: se
 * deriva de cuánto dura su periodo (`alcanceDe` en `core/metas.ts`), porque una
 * meta de tres semanas es "de mes" por definición y pedírselo al usuario era
 * hacerle repetir con un selector lo que ya dijo con las fechas.
 */
export type Alcance = 'anio' | 'mes' | 'semana' | 'dia' | 'hora'

/**
 * Rutina: secuencia de pasos que cruza cuartos, programada por hora y días.
 * Es la pieza "orquestadora": un hábito toca cocina + ejercicio + jardín
 * en un solo flujo. Las crea el usuario (panel ⏰) o el asistente (IA).
 */
export interface Rutina {
  id?: number
  nombre: string
  emoji: string
  /** 'HH:mm' — vacío = sin hora fija (solo manual). */
  hora?: string
  /** 'HH:mm' fin del bloque en el calendario (vacío = 1 h por defecto). */
  horaFin?: string
  /** Días de la semana 0=domingo … 6=sábado; vacío = todos los días (series). */
  dias: number[]
  /** Modo de repetición (sin valor = legacy: personalizado/indefinido según `dias`). */
  repeticion?: RepeticionRutina
  /** Fecha del evento único o inicio de la serie (yyyy-mm-dd). */
  fechaInicio?: string
  /** Fin de la serie (yyyy-mm-dd); vacío = sin fin. */
  fechaFin?: string
  /** Fechas (yyyy-mm-dd) que la serie se salta: ese día se editó por separado. */
  excepciones?: string[]
  /** Color del evento en el calendario (hex; vacío = verde por defecto). */
  color?: string
  pasos: PasoRutina[]
  activa: boolean
  creadoEn: string
  /** Rutina espejo de otra fuente: 'sueno' la genera el horario de Descanso. */
  origen?: 'sueno'
  /**
   * App (plantilla) a la que pertenece el evento o la meta: le da su color en el
   * calendario, la mete en el cronograma de esa app y decide qué aviso se calla
   * desde Configuraciones. Sin valor = evento de la casa, sin app.
   */
  plantillaId?: string
  /**
   * `false` silencia el aviso de esta rutina. Lo usa el espejo de sueño, que hasta
   * ahora se callaba por no tener pasos (ver `debeAvisar` en core/rutinas.ts).
   */
  avisar?: boolean
  /**
   * Actividad CONCRETA que este bloque agenda: `fuerza:12`, `momento:cena`,
   * `hobby:3`. Con `plantillaId` la fila dice de qué APP es; con `actividadId`,
   * de QUÉ de esa app — sin él, los cuatro momentos de cocina serían la misma cosa.
   * Lo arma `actividadId()` (core/rutinas.ts) y el prefijo evita que `hobby:3`
   * choque con `fuerza:3`.
   *
   * Solo vive mientras la fila es el espejo de esa actividad: lo borran partir un
   * día de la serie (`soloEseDia`) y cambiar de app en el editor.
   */
  actividadId?: string
  /** Sección de la app a la que lleva su aviso (la pestaña donde se registra). */
  seccion?: string
  /**
   * Sub-ámbito DENTRO de la app al que pertenece la meta: `hobby:3`,
   * `proyecto:7`. Con `plantillaId` la meta sale en el cronograma de la app; con
   * `ambitoId`, en el de ese hobby o ese proyecto concreto. Las sub-metas lo
   * heredan de su madre (ver `crearMeta`). Mismo formato `tipo:id` que
   * `actividadId`, y las hijas lo heredan igual.
   */
  ambitoId?: string
  /** Nota libre (sobre todo para metas sueltas, sin checklist de pasos). */
  nota?: string
  /**
   * Solo rutinas: no aparece en ningún día del calendario. En una meta ya no se
   * usa — ahí lo dice `fechaInicio` (con fecha, va al calendario; sin fecha, vive
   * solo en la lista), que es lo que el usuario ya editaba a mano.
   */
  suelta?: boolean
  /** Completada, solo para metas sueltas (las agendadas usan `EjecucionRutina.hecho`, con fecha). */
  completada?: boolean
  /**
   * Índices de `pasos` ya hechos, solo para ramas del árbol sin agendar: no tienen
   * fecha que sirva de llave (las agendadas usan `EjecucionRutina.pasosHechos`).
   */
  pasosHechos?: number[]
  /**
   * Capa en la que pinta (Mes/Año); sin valor = 'dia', la más específica.
   * Solo rutinas: en una meta se deriva de la duración y este campo se ignora.
   */
  alcance?: Alcance
  /** Pertenece a la lista de Metas del calendario. */
  esMeta?: boolean
  /** Meta que la contiene; sin valor = está en el primer nivel de la lista. */
  padreId?: number
  /** Posición entre hermanas (arrastrar para reordenar). */
  orden?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/**
 * Palomita MANUAL de la meta diaria de una app. La fila SOLO existe cuando el
 * usuario contradice (o confirma a mano) lo que dice la actividad real: sin fila
 * manda el automático. Es por día, así que caduca sola a medianoche.
 */
export interface MetaDiariaManual {
  id?: number
  plantillaId: string
  /** yyyy-mm-dd local (nunca toISOString: ver core/fechaLocal.ts). */
  fecha: string
  hecha: boolean
}

/**
 * Objetivo diario de las apps que no lo tienen ya en su propio perfil (biblioteca
 * y las genéricas). Cocina, jardín e idiomas NO usan esta tabla: el suyo vive en
 * `perfilNutricion`, `perfilMindfulness` y las tarjetas vencidas del SRS.
 */
export interface ObjetivoDiario {
  id?: number
  plantillaId: string
  /** 0 = meta apagada (no se evalúa ni avisa). */
  valor: number
}

/**
 * Traduce el plan viejo de ejercicio a bloques del calendario (ver la v82). Va
 * aparte y sin tocar IndexedDB porque es donde están las dos trampas del cambio y
 * conviene poder mirarlas sin montar una migración: **agrupar** («Pierna» los L, X
 * y V son TRES filas allá y UN bloque aquí) y el **desfase de días** (`diaSemana`
 * es 0=lunes; `Rutina.dias`, 0=domingo).
 *
 * `catalogo` mapea `${tipo}|${nombre}` → id de la rutina del catálogo, que es de
 * donde sale la llave estable: la fila vieja solo guardaba el nombre.
 */
export function planAEjercicioBloques(
  plan: RutinaProgramada[],
  catalogo: Map<string, number>,
  fechaInicio: string,
): Omit<Rutina, 'id'>[] {
  const grupos = new Map<string, RutinaProgramada[]>()
  for (const p of plan) {
    const clave = `${p.tipo}|${p.rutinaNombre}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), p])
  }

  const usadas = new Set<string>()
  const bloques: Omit<Rutina, 'id'>[] = []
  for (const [clave, filas] of grupos) {
    const { tipo, rutinaNombre, duracionMin } = filas[0]
    const idCat = catalogo.get(clave)
    // Dos rutinas del catálogo con el mismo nombre: la segunda va sin llave, o el
    // control adoptaría un bloque ajeno.
    const llave = idCat != null && !usadas.has(clave) ? `${tipo}:${idCat}` : undefined
    if (llave) usadas.add(clave)
    bloques.push({
      nombre: rutinaNombre,
      emoji: '💪',
      // Sin hora a propósito: `planEjercicio` nunca la tuvo, e inventar un '07:00'
      // sería pintarle al usuario una alarma que jamás puso. Cae en la fila "Sin
      // hora" del calendario con sus días, que es el dato que sí había.
      dias: [...new Set(filas.map((f) => (f.diaSemana + 1) % 7))].sort((a, b) => a - b),
      repeticion: 'semanal',
      fechaInicio,
      color: '#fb7185',
      pasos: [
        {
          titulo: rutinaNombre,
          roomId: 'ejercicio',
          esquemaId: 'sesion',
          valores: { tipo, titulo: rutinaNombre, duracionMin },
        },
      ],
      activa: true,
      creadoEn: new Date().toISOString(),
      plantillaId: 'ejercicio',
      actividadId: llave,
      seccion: tipo,
      // Nunca encender un aviso que nadie pidió: el plan viejo no avisaba.
      avisar: false,
    })
  }
  return bloques
}

export type NivelPartida = 'cero' | 'algo' | 'medio' | 'avanzado'

/** Lo que se le pregunta al usuario antes de pedirle un plan a la IA. */
export interface EntradaPlan {
  /** yyyy-mm-dd; el día 0 del plan. Sin valor (planes viejos) = el día que se generó. */
  fechaInicio?: string
  /** yyyy-mm-dd; sin valor = sin fecha objetivo (la IA decide cuánto debe durar). */
  fechaObjetivo?: string
  horasSemana: number
  /** Días que puede dedicarle, 0=domingo … 6=sábado como en `Rutina.dias`. */
  dias: number[]
  nivel: NivelPartida
}

/** Un nodo del árbol propuesto. Todavía NO es una meta: vive embebido en su plan. */
export interface NodoPlan {
  /** Id local dentro del plan (1..N), para que `padre` no dependa de la posición. */
  id: number
  /** Id local de su padre; sin valor = primer nivel del plan. */
  padre?: number
  nombre: string
  /** Día en que empieza, contado desde el día 0 del plan (nunca desde su padre). */
  ini: number
  /** Último día que ocupa, inclusivo. */
  fin: number
}

/** Material propio de la app elegido para un plan (una receta, un mazo…). */
export interface MaterialPlan {
  nombre: string
  /** Nombre de la actividad agendable donde va («Desayuno»); sin valor = general. */
  rutina?: string
  /** Por qué esta pieza sirve a la meta, en una frase. */
  motivo: string
}

/**
 * Un cronograma ALTERNATIVO para una meta: lo propone la IA, el usuario lo compara
 * contra el real superpuesto en el mismo eje y, si le gusta, lo acepta.
 *
 * Los nodos llevan días RELATIVOS a `inicioISO` en vez de fechas porque la IA cuenta
 * enteros pequeños mucho mejor que calendarios (con fechas ISO devuelve días que no
 * existen y años equivocados); de paso, correr el plan entero a otro arranque es
 * cambiar un campo y no cuesta otra llamada.
 */
export interface PlanMeta {
  id?: number
  /** `Rutina.id` de la meta (con `esMeta`) para la que se propuso. */
  metaId: number
  /** Etiqueta corta ("Plan A"); es dato, como el nombre de una meta. */
  nombre: string
  /** El día 0 del plan en el calendario. Reanclar = cambiar SOLO esto. */
  inicioISO: string
  nodos: NodoPlan[]
  /** Lo que se contestó en el formulario: para enseñarlo y para regenerar. */
  entrada: EntradaPlan
  /** La frase con la que la IA resume su propuesta. */
  resumen?: string
  /** Material de la app repartido por el plan (recetas → momentos de comida). */
  material?: MaterialPlan[]
  creadoEn: string
  /** Cuándo se pasó al cronograma real; sin valor = sigue siendo propuesta. */
  aceptadoEn?: string
}

/** Qué pasos de una rutina se completaron en un día (para rachas y digest). */
export interface EjecucionRutina {
  id?: number
  rutinaId: number
  fecha: string // yyyy-mm-dd
  /** Índices de pasos completados. */
  pasosHechos: number[]
  /** Palomeada entera desde Metas (sin índice: no necesita migración de esquema). */
  hecho?: boolean
}

// ----- Base de datos -----

/** Zona libre del croquis de planos (sin mini-app). */
export interface ZonaPlano {
  id?: number
  nombre: string
  color: string
  nivel: number
  celdas: { col: number; row: number }[]
  pisoTipo?: string | null
  pisoColor?: string
  /** Imagen personalizada del piso (cuando pisoImagenActiva). */
  pisoImagen?: Blob
  pisoImagenActiva?: boolean
  /** Repeticiones por celda: 'x1' | 'x2' | 'x4' */
  pisoImagenAjuste?: string
  /** Overrides de aristas (puerta/pared/abierto); puertas de fachada al construir. */
  muros?: Record<string, 'pared' | 'puerta' | 'abierto'>
  /** App del registro vinculada (cuarto con mini-app). */
  roomId?: string
  /** Forma de cada celda absoluta: clave `col,row`. */
  formasCelda?: Record<string, { forma: 'cuadrado' | 'triangular' | 'circular'; rotacion: 0 | 90 | 180 | 270 }>
}

/**
 * Muro independiente del plano (no ligado a un cuarto). Dos clases:
 * - `arista`: un lado recto de la rejilla (orient h/v en la esquina col,row). Las 4
 *   "paredes del cuadrado" se ponen una por una.
 * - `forma`: solo el segmento de una celda — diagonal (triangular) o arco (circular).
 * Estilo editable (textura, color, altura) común a ambas.
 */
export interface MuroLibre {
  id?: number
  nivel: number
  clase: 'arista' | 'forma'
  /** clase 'arista': orientación del lado (h = horizontal, v = vertical). */
  orient?: 'h' | 'v'
  /** arista: índice de esquina de rejilla; forma: celda. */
  col: number
  row: number
  /** clase 'forma': triángulo (diagonal) o círculo (arco). */
  forma?: 'triangular' | 'circular'
  rotacion?: 0 | 90 | 180 | 270
  /** Textura del muro (TipoMuroId): solido, ladrillo, madera, vitraje… */
  tipo?: string
  color?: string
  /** Altura como factor de WALL_H (1 = altura normal). */
  alto?: number
  /** Silueta superior: recta (default), arco o triángulo. */
  silueta?: 'recta' | 'arco' | 'triangulo'
  /** Parámetros de la silueta (igual que los muros de cuarto). */
  formaAlto?: number // alto del arco/pico, factor de WALL_H
  formaAncho?: number // ancho del pico (triángulo), factor del largo
  formaPosX?: number // posición del pico (triángulo), -1…1
  formaDividir?: boolean // la silueta lleva color propio
  formaColor?: string
  /** Ventana en el muro (arista/triángulo): hueco + cristal. */
  ventana?: boolean
  ventAncho?: number // factor del largo del muro
  ventAlto?: number // factor del alto del muro (0–1)
  ventColor?: string
  /** Puerta en el muro: hueco que llega al piso (+ hoja sólida animada). */
  puerta?: boolean
  puertaAncho?: number // factor del largo del muro
  puertaColor?: string
  puertaAlto?: number // alto de la puerta, factor del alto del muro (0–1)
  puertaTipo?: 'recta' | 'sin' | 'doble' | 'porton' | 'corredera' // tipo de hoja (como en cuartos); 'sin' = vano abierto
  /** Remate del vano sobre la hoja (como la silueta de los muros). */
  puertaForma?: 'recta' | 'arco' | 'triangulo'
  puertaFormaAlto?: number // alto del arco/pico, factor de WALL_H
  puertaFormaAncho?: number // base del pico (triángulo), factor del ancho del vano
  puertaFormaPosX?: number // posición del pico dentro de su base (-1…1)
  /** Geometría de la abertura (compartida entre puerta y ventana). */
  ventForma?: 'cuadrado' | 'circulo' | 'triangulo' // forma del hueco (ventana)
  ventPosX?: number // posición horizontal a lo largo del muro (-1 izq … 1 der)
  ventPosY?: number // centro vertical de la ventana, factor del alto (0–1)
  ventRot?: number // rotación de la forma en grados (cuadrado → rombo)
  ventMosaico?: boolean // cristal dividido en piezas (vitral)
  ventMulticolor?: boolean // cada pieza del mosaico con un color distinto
}

/** Piso personalizado de una celda o sub-celda (¼) del plano. */
export interface PisoExteriorCelda {
  id?: number
  nivel: number
  col: number
  row: number
  pisoTipo?: string | null
  pisoColor?: string
  pisoImagen?: Blob
  pisoImagenActiva?: boolean
  pisoImagenAjuste?: string
  /** Forma de la loseta (cuadrado por defecto). */
  forma?: { forma: 'cuadrado' | 'triangular' | 'circular'; rotacion: 0 | 90 | 180 | 270 }
}

// ----- Infraestructura del mapa (caminos y huerto) -----

/** Tramo de camino por celda del mapa exterior (pista, riel o montaña rusa). */
export interface CaminoCelda {
  id?: number
  col: number
  row: number
  tipo: 'pista' | 'riel' | 'coaster'
  /** Solo montaña rusa: nivel de altura del riel (0–6, cada nivel = 0.6 u). */
  altura?: number
  /** Solo pista: celda con la línea de meta del circuito (una sola en el mapa). */
  meta?: boolean
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Especies sembrables del huerto (catálogo con tiempos en src/core/house/cultivos.ts). */
export type EspecieCultivo = 'zanahoria' | 'lechuga' | 'girasol' | 'tomate' | 'maiz' | 'calabaza'

/** Parcela de tierra por celda; con especie = cultivo en curso (estado derivado de timestamps). */
export interface CultivoCelda {
  id?: number
  col: number
  row: number
  especie?: EspecieCultivo
  /** ms época de la siembra. */
  plantadoEn?: number
  /** ms época del último riego (al sembrar = plantadoEn). */
  regadoEn?: number
  /** Cosechas acumuladas de la parcela. */
  cosechas?: number
  /** ms época de instalación del aspersor (riega su celda + 8 vecinas para siempre). */
  aspersorEn?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Tipos de animal de granja (catálogo con tiempos en src/core/state/granjaStore.ts). */
export type TipoAnimal = 'gallina' | 'cerdo' | 'vaca' | 'cabra' | 'oveja' | 'caballo'

/** Accesorio de juego dentro de un corral: ocupa una celda del rect (máx. 1 por celda). */
export type TipoAccesorio = 'lodo' | 'tina' | 'pelota'

export interface AccesorioCorral {
  tipo: TipoAccesorio
  /** Celda ABSOLUTA del mapa (sobrevive a agrandar el corral). */
  col: number
  row: number
}

/** Corral de la granja: rectángulo de celdas del mapa con varios animales dentro. */
export interface Corral {
  id?: number
  /** Celda de origen (esquina). */
  col: number
  row: number
  /** Tamaño en celdas, ≥1. */
  ancho: number
  alto: number
  accesorios?: AccesorioCorral[]
  /** ms época de la última limpieza; sucio al pasar la semana (el ánimo cae al doble). */
  limpiadoEn?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Animal de granja: vive dentro de un corral (varios por corral). */
export interface AnimalGranja {
  id?: number
  corralId: number
  tipo: TipoAnimal
  /** ms época de la última comida; hambriento al vencer la ventana de su especie. */
  alimentadoEn: number
  /** ms época del último mimo (caricia, baño o juego); aburrido al vencer la ventana. */
  mimadoEn?: number
  /**
   * ms época en que la app DETECTÓ la enfermedad, no en que empezó: el plazo para
   * curarlo antes de que muera corre desde que pudiste verlo. Sin esto, volver tras
   * un mes fuera encontraría el corral entero muerto en vez de enfermo.
   */
  enfermoDesde?: number
  nombre?: string
  /** Celda legada pre-v86 (solo la lee la reparación de respaldos viejos). */
  col?: number
  row?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Cesta del huerto: cosechas acumuladas por especie (el alimento de la granja). */
export interface CestaEspecie {
  id?: number
  especie: EspecieCultivo
  cantidad: number
}

/** Marcador persistente del minijuego de una cancha (`canchaId` = id del objeto de mapa). */
export interface MarcadorCancha {
  id?: number
  canchaId: number
  /** Goles/puntos; en tenis, los puntos del juego en curso (0,1,2,3,AD…). */
  yo: number
  rival: number
  // Tenis contra la IA: partido al mejor de 3 sets.
  juegosYo?: number
  juegosRival?: number
  setsYo?: number
  setsRival?: number
  /** Tenis solo: récord de golpes seguidos contra el frontón. */
  mejorPeloteo?: number
}

/** Pista de carreras de trazo libre: curva Catmull-Rom por puntos de control. */
export interface PistaLibre {
  id?: number
  /** Puntos de control en coordenadas de mundo (la META va en el primero). */
  puntos: { x: number; z: number }[]
  /** Circuito cerrado (el final se une con la meta; requisito para correr). */
  cerrada: boolean
  fecha: number
}

/** Récords del modo carrera: una fila por línea de meta y por vehículo. */
export interface RecordCarrera {
  id?: number
  metaCol: number
  metaRow: number
  /** TipoVehiculo terrestre (bicicleta/motocicleta/automovil). */
  vehiculo: string
  /** Mejor vuelta en ms. */
  mejorVuelta?: number
  /** Mejor tiempo total (ms) y a cuántas vueltas se logró. */
  mejorTotal?: number
  vueltasDeTotal?: number
  // Contra un asistente rival.
  victorias?: number
  derrotas?: number
  fecha: number
}

// ----- Hobbies · Práctica de pasatiempos -----

/** Pasatiempo del usuario, con color propio y meta semanal opcional. */
export interface Hobby {
  id?: number
  nombre: string
  emoji: string
  /** Hex de la paleta del cuarto; tiñe heatmaps y acentos. */
  color: string
  /** Meta: días de práctica por semana (1–7); sin meta si falta. */
  metaDiasSemana?: number
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Sesión de práctica registrada de un hobby. */
export interface SesionHobby {
  id?: number
  hobbyId: number
  fecha: string // yyyy-mm-dd local
  minutos: number
  nota?: string
  /** Proyecto al que se dedicó la sesión (opcional). */
  proyectoId?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Proyecto dentro de un hobby (ej. "tejer bufanda" en "tejido"). */
export interface ProyectoHobby {
  id?: number
  hobbyId: number
  nombre: string
  estado: 'en-curso' | 'terminado'
  creadoEn: string
  terminadoEn?: string // yyyy-mm-dd local al terminar
  /** Descripción libre del proyecto. */
  nota?: string
  /** Fotos del avance (JPEG comprimidos, ver `comprimirFoto`). */
  imagenes?: Blob[]
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Tipo de herramienta (bloque) de una plantilla personalizada. */
export type TipoBloque =
  | 'notas'
  | 'checklist'
  | 'contador'
  | 'enlaces'
  | 'lista'
  | 'valoracion'
  | 'bitacora'
  | 'progreso'
  | 'habito'
  | 'sesiones'
  | 'cuenta'
  | 'galeria'

/** Bloque de una plantilla personalizada (estructura, no datos). */
export interface BloqueDef {
  /** Id estable dentro de la plantilla; forma parte del nombre de la tool de IA. */
  id: string
  tipo: TipoBloque
  titulo: string
  /** Meta opcional: contador/progreso (valor a alcanzar), sesiones (minutos), hábito (veces/semana). */
  meta?: number
  /** Solo progreso: unidad de la medición (kg, $, págs…). */
  unidad?: string
  /** Solo cuenta regresiva: fecha objetivo `yyyy-mm-dd`. */
  fecha?: string
}

/** Plantilla (app) creada por el usuario combinando bloques genéricos. */
export interface PlantillaCustom {
  /** 'custom-<timestamp>' — nunca choca con los ids de las apps de código. */
  id: string
  nombre: string
  icon: string // emoji
  color: string
  bloques: BloqueDef[]
  creadoEn: string
}

/** Dato de un bloque: fila única (nota/contador/valoración) o n filas (checklist, lista, bitácora…). */
export interface ItemPlantilla {
  id?: number
  plantillaId: string
  bloqueId: string
  /** Nota, pendiente, item de lista, entrada de bitácora, título de enlace o nota de sesión. */
  texto?: string
  /** Solo checklist. */
  hecho?: boolean
  /** Solo enlaces. */
  url?: string
  /** Contador (acumulado), valoración (1-5), progreso (medición) o sesiones (minutos). */
  valor?: number
  /** Solo galería: imagen comprimida. */
  foto?: Blob
  creadoEn: string
}

/**
 * Carpeta del catálogo de plantillas: agrupa apps del sistema y plantillas
 * personalizadas. El nombre es editable y `miembros` guarda los ids de plantilla
 * en orden. Una plantilla pertenece a un solo grupo.
 */
export interface GrupoPlantilla {
  id?: number
  nombre: string
  /** Emoji opcional que se muestra en el encabezado de la carpeta. */
  emoji?: string
  /** Orden de la carpeta en el catálogo (arrastrar para reordenar). */
  orden: number
  /** Ids de plantilla en este grupo, en orden. */
  miembros: string[]
  /** Carpeta de la semilla inicial: no se puede borrar (las creadas por el usuario sí). */
  esBase?: boolean
  /** Plegada en el catálogo: solo se ve su encabezado. */
  plegado?: boolean
}

/**
 * Carpetas base del catálogo de plantillas. Es a la vez la semilla de la primera
 * carga (`gruposPlantillaStore`) y el destino de la migración v101, para que
 * ambas rutas den exactamente el mismo reparto. Cubren TODAS las apps de cuarto;
 * las personalizadas caen en la primera por reconciliación (`asegurarMiembros`).
 */
export const GRUPOS_PLANTILLA_BASE: { nombre: string; emoji: string; miembros: string[] }[] = [
  { nombre: 'Cuerpo', emoji: '💪', miembros: ['ejercicio', 'cocina', 'descanso'] },
  { nombre: 'Estudio', emoji: '📚', miembros: ['biblioteca', 'idiomas', 'ideas'] },
  { nombre: 'Administración', emoji: '🗂️', miembros: ['despacho', 'garage', 'calendario', 'agenda'] },
  { nombre: 'Pasatiempos', emoji: '🎉', miembros: ['entretenimiento', 'diario', 'hobbies'] },
  { nombre: 'Memorias y salud mental', emoji: '🧠', miembros: ['anecdotario', 'sala', 'jardin'] },
]

/** Objeto del conjunto de una app: recurso 3D (o `tipo` especial), su posición y si es el principal. */
export interface SiembraGuardada {
  /** Id de recurso del catálogo; ausente si es un objeto especial (`tipo`). */
  recurso?: number
  /** Tipo literal de un objeto especial (p. ej. el principal animado); gana sobre `recurso`. */
  tipo?: string
  x: number
  z: number
  /** El objeto principal es el punto de entrada del cuarto (uno por conjunto). */
  principal?: boolean
  /** Rotación en Y (grados); ausente = 0. */
  rotY?: number
  /** Escala visual del objeto; ausente = 1. */
  escala?: number
}

/** Conjunto de objetos que coloca una app al asignarse (editable por el usuario). */
export interface ObjetosPlantilla {
  plantillaId: string
  objetos: SiembraGuardada[]
}

// ----- Idiomas · aprendizaje de lenguas -----

/** Perfil de un idioma que el usuario aprende (una fila por idioma). */
export interface PerfilIdioma {
  id?: number
  /** Código BCP-47 para la voz del navegador: 'en-US', 'fr-FR', 'ja-JP'… */
  codigo: string
  nombre: string
  /** Emoji de bandera (dato → <Icono emoji={…}>). */
  bandera: string
  /** Nivel MCER del usuario en este idioma: A1…C2. */
  nivel: string
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

export type TipoTarjeta = 'palabra' | 'frase' | 'expresion'

/** Tarjeta de vocabulario con su estado de repaso espaciado (Leitner) embebido. */
export interface TarjetaIdioma {
  id?: number
  idiomaId: number
  /** En el idioma objetivo. */
  termino: string
  /** En español. */
  traduccion: string
  /** Frase de ejemplo en el idioma objetivo (alimenta el ejercicio de completar). */
  ejemplo?: string
  /** Imagen mnemotécnica (subida o generada con IA); sin índice, no pide migración. */
  imagen?: Blob
  tipo: TipoTarjeta
  /** Tema del temario (estático de temario.ts o dinámico); ausente = suelta. */
  temaId?: string
  /** Nivel MCER del término. */
  nivel: string
  /** Caja Leitner 0..6 (los intervalos crecen con la caja). */
  caja: number
  /** yyyy-mm-dd local del próximo repaso (vencida si <= hoy). */
  proximaISO: string
  ultimaISO?: string
  fuente: 'manual' | 'charla' | 'ia'
  creadoEn: string
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Charla de práctica con el tutor, por idioma. */
export interface ConversacionIdioma {
  id?: number
  idiomaId: number
  /** Lo pone la IA tras el primer intercambio; editable. */
  titulo: string
  /** Tema del temario del que nació o al que se clasificó. */
  temaId?: string
  /** ISO: ya se extrajo vocabulario (silencia el ofrecimiento al salir). */
  destiladaEn?: string
  creadoEn: string
  actualizadoEn: string
}

export interface MensajeIdioma {
  id?: number
  conversacionId: number
  rol: 'usuario' | 'asistente'
  texto: string
  creado: string
}

/** Nodo dinámico del temario (los temas de temario.ts son el esqueleto estático). */
export interface TemaIdioma {
  id?: number
  /** Id único estable 'din-…'; comparte espacio con los ids de temario.ts. */
  temaId: string
  idiomaId: number
  /** Nivel MCER del que cuelga. */
  nivel: string
  /** Tema estático u otro dinámico; null = raíz del nivel. */
  padreId: string | null
  titulo: string
  descripcion: string
  creadoEn: string
  /** Charla que lo desbloqueó (se desliga si la charla se borra). */
  conversacionId?: number
  /** Sección del ejemplo de fábrica al que pertenece (ver core/data/ejemplos.ts). */
  ejemploDe?: string
}

/** Material propio que el usuario sube a un tema del temario (apuntes o fotos). */
export interface MaterialIdioma {
  id?: number
  idiomaId: number
  /** Tema del temario (estático de temario.ts o dinámico) al que se adjuntó. */
  temaId: string
  tipo: 'texto' | 'imagen'
  /** Nombre visible; en las notas es el título que puso el usuario. */
  titulo: string
  /** Cuerpo de la nota (solo en `tipo: 'texto'`). */
  texto?: string
  /** Imagen comprimida a JPEG (solo en `tipo: 'imagen'`). */
  blob?: Blob
  creadoEn: string
}

/** Actividad de repaso agregada: una fila por idioma y día (heatmap/racha/XP). */
export interface RepasoIdioma {
  id?: number
  idiomaId: number
  /** yyyy-mm-dd local. */
  fecha: string
  /** Respuestas dadas ese día (tarjetas + ejercicios). */
  repasos: number
  aciertos: number
}

// ----- Ideas · diario, mapas conceptuales y diagramas de decisión -----

/**
 * Idea del diario. `tema` agrupa las de una misma lluvia (y es su carpeta en la
 * vista por temas); sin tema es una idea suelta que solo cae en su día.
 */
export interface Idea {
  id?: number
  texto: string
  /** Desarrollo opcional de la idea (el «detrás» que no cabe en una línea). */
  detalle?: string
  /** Tema de la lluvia a la que pertenece; vacío = idea suelta. */
  tema?: string
  /** Destacada. NO se indexa: IndexedDB no acepta booleanos como clave. */
  favorita?: boolean
  fecha: string
  creadoEn: string
}

/**
 * Formato del mapa. Decide el layout, el fondo y cómo se dibujan las uniones.
 *
 * Mapas conceptuales:
 * - `mental`   radial clásico (burbujas alrededor de la idea central)
 * - `arbol`    jerarquía de arriba a abajo (organigrama)
 * - `llaves`   el todo y sus partes, de izquierda a derecha con llaves
 * - `circulo`  idea al centro rodeada de su contexto
 * - `flujo`    secuencia de pasos con flechas (inicio, proceso, decisión, fin)
 * - `venn`     2 o 3 conjuntos que se solapan; cada elemento cae en una región
 * - `comparacion` dos temas enfrentados: lo propio de cada uno y lo común
 *
 * - `linea`    hitos en orden sobre una recta, alternando arriba y abajo
 * - `ciclo`    etapas encadenadas en círculo que vuelven a empezar
 * - `piramide` cuatro niveles apilados: la base sostiene a la cima
 *
 * Diagramas de decisión (misma tabla y mismo lienzo, otra geometría):
 * - `proscontras` ventajas y desventajas de UNA opción, en dos columnas con peso
 * - `fuerzas`  campo de fuerzas: lo que empuja el cambio contra lo que lo frena
 * - `foda`     cuatro cuadrantes: fortalezas, oportunidades, debilidades, amenazas
 * - `eisenhower` urgente contra importante, en los mismos cuatro cuadrantes
 * - `decision` árbol de decisiones: cada opción y sus consecuencias
 * - `tier`     filas de la S a la D para ordenar cualquier cosa por nivel
 * - `matriz`   matriz de decisión ponderada; NO es un lienzo, es una tabla
 * - `ishikawa` espina de pescado: un problema y las causas que lo empujan
 */
export type TipoMapa =
  | 'mental'
  | 'arbol'
  | 'llaves'
  | 'circulo'
  | 'flujo'
  | 'linea'
  | 'ciclo'
  | 'piramide'
  | 'venn'
  | 'comparacion'
  | 'proscontras'
  | 'fuerzas'
  | 'foda'
  | 'eisenhower'
  | 'decision'
  | 'tier'
  | 'matriz'
  | 'ishikawa'

/** Mapa conceptual de lienzo libre; sus nodos viven en `nodosMapa`. */
export interface MapaIdeas {
  id?: number
  nombre: string
  /** Formato; sin valor = 'mental' (los mapas creados antes de la v98). */
  tipo?: TipoMapa
  /** Hex del nodo raíz (sin valor, el color de la app). */
  color?: string
  /**
   * Es el ejemplo de fábrica de su formato (uno por tipo): se crea al pedirlo
   * desde la app, lleva su guía encima y se puede editar o borrar como
   * cualquier otro mapa.
   */
  ejemplo?: boolean
  fecha: string
  creadoEn: string
}

/** Forma del nodo en un diagrama de flujo (sin valor = proceso). */
export type FormaNodo = 'inicio' | 'proceso' | 'decision' | 'fin'

/**
 * Nodo de un mapa, con posición propia en el lienzo.
 *
 * Las RAÍCES (`padreId: null`) son los ejes del mapa: una sola en los formatos
 * jerárquicos, y 2-3 en `venn`/`comparacion` (un nodo por conjunto/tema).
 */
export interface NodoMapa {
  id?: number
  mapaId: number
  /** Id único estable ('nod-…'): identidad entre dispositivos (patrón temasArbol). */
  nodoId: string
  /** nodoId del padre, o null = nodo raíz del mapa. */
  padreId: string | null
  texto: string
  /** Centro en unidades del mundo (px a zoom 1; la raíz nace en 0,0). */
  x: number
  y: number
  /** Hex heredado de su rama de primer nivel (la raíz usa el del mapa). */
  color?: string
  /**
   * Región a la que pertenece en los mapas por zonas: en `venn` la combinación
   * de conjuntos ('a', 'b', 'ab', 'abc'…) y en `comparacion` 'izq'|'centro'|'der'.
   *
   * La `matriz` no es un lienzo sino una tabla y la reaprovecha: sus filas raíz
   * llevan 'criterio' u 'opcion', y cada celda cuelga de su criterio (`padreId`)
   * guardando aquí el `nodoId` de su opción. Así la tabla vive en las mismas dos
   * tablas que los mapas, sin esquema propio.
   */
  zona?: string
  /** Solo en `flujo`: qué figura se dibuja. */
  forma?: FormaNodo
  /**
   * En `proscontras` y `fuerzas`, cuánto pesa ese punto (1-5): sin valor cuenta
   * como 1, así la suma de una columna sin tocar es su número de puntos. En
   * `matriz` es la importancia del criterio y el puntaje de cada celda.
   */
  peso?: number
  fecha: string
  creadoEn: string
}

// ----- Agenda · trabajo, salud y personas -----

/** Sección de la agenda: decide pestaña, color del bloque y a dónde salta el aviso. */
export type AreaAgenda = 'trabajo' | 'salud' | 'personas'

/**
 * Una cosa que hacer o a la que ir. Es la fila COMÚN de las tres secciones: la
 * junta del martes, la cita con el dentista y el café con Ana tienen la misma
 * forma (qué, cuándo, dónde, con quién) y solo cambian de `area`. Una sola tabla
 * = un CRUD, un formulario, un archivador y un puente al calendario en vez de tres.
 *
 * SIN `fecha` es un pendiente de bandeja (solo Trabajo los ofrece) y no proyecta
 * ninguna rutina. Con `fecha` y sin `hora` cae en la fila "sin hora" del
 * calendario, y por eso no avisa: `core/avisos.ts` exige hora para notificar.
 */
export interface EventoAgenda {
  id?: number
  /** Id único estable ('ag-…'): amarra la fila con la rutina que proyecta. */
  evId: string
  area: AreaAgenda
  titulo: string
  /** yyyy-mm-dd LOCAL (fechaLocalISO, nunca toISOString). */
  fecha?: string
  /** 'HH:mm' de inicio. */
  hora?: string
  /** 'HH:mm' de fin; vacío = una hora. */
  horaFin?: string
  lugar?: string
  /** Con quién: el médico, el cliente, la persona (texto libre, sin ficha). */
  con?: string
  /** `contactoId` de la persona ligada (string estable, no el id numérico). */
  contactoId?: string
  /** `proyId` del proyecto que lo agrupa (Trabajo). */
  proyectoId?: string
  /** `mascId` de la mascota a la que pertenece la cita (Salud). */
  mascotaId?: string
  /** 1 alta · 2 media · 3 baja; sin valor = media. */
  prioridad?: number
  notas?: string
  hecho?: boolean
  /** yyyy-mm-dd en que se palomeó (es lo que cuenta como actividad del día). */
  hechoEn?: string
  /**
   * Columna del tablero Kanban de Trabajo: sin valor = «Por hacer». `hecho`
   * MANDA sobre esto (una tarjeta palomeada está en «Hecho» aunque quedara
   * marcada en curso). No se indexa: IndexedDB no acepta booleanos como clave.
   */
  enCurso?: boolean
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
  creadoEn: string
}

/**
 * Persona de la libreta. El cumpleaños no es adorno: proyecta una rutina anual
 * con hora, que es la única forma de que el calendario lo pinte Y avise.
 */
export interface ContactoAgenda {
  id?: number
  /** Id único estable ('ct-…'). */
  contactoId: string
  nombre: string
  /** Vínculo libre ('familia', 'trabajo', 'amigos'): agrupa la libreta en carpetas. */
  relacion?: string
  telefono?: string
  correo?: string
  /** yyyy-mm-dd; el año es el de nacimiento (de ahí sale la edad que cumple). */
  cumple?: string
  /** 'HH:mm' del recordatorio; vacío = HORA_CUMPLE. */
  horaCumple?: string
  /** Retrato ya comprimido (comprimirFoto de rooms/_shared/fotos.tsx). */
  foto?: Blob
  direccion?: string
  notas?: string
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
  creadoEn: string
}

/** Proyecto de Trabajo: agrupa pendientes y eventos. No agenda nada por sí mismo. */
export interface ProyectoAgenda {
  id?: number
  /** Id único estable ('py-…'). */
  proyId: string
  nombre: string
  /** Hex propio del chip; vacío = el color de Trabajo. */
  color?: string
  activo: boolean
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
  creadoEn: string
}

/**
 * Medicamento en curso. Cada hora de `horas` se proyecta como UNA rutina
 * recurrente con aviso; editarlo las regenera todas (ver rooms/agenda/calendario.ts).
 */
export interface Medicamento {
  id?: number
  /** Id único estable ('md-…'). */
  medId: string
  nombre: string
  /** '500 mg', '1 pastilla', '10 gotas'. */
  dosis?: string
  /** `mascId` de la mascota que lo toma; vacío = es tuyo. */
  mascotaId?: string
  /** Horas de toma 'HH:mm'; vacío = sin recordatorio (solo queda registrado). */
  horas: string[]
  /** Días 0=domingo … 6=sábado; vacío = todos los días. */
  dias: number[]
  fechaInicio: string
  /** yyyy-mm-dd; vacío = tratamiento indefinido. */
  fechaFin?: string
  notas?: string
  activo: boolean
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
  creadoEn: string
}

/** Especie de la mascota: decide el emoji con el que se pinta su ficha. */
export type EspecieMascota =
  | 'perro'
  | 'gato'
  | 'ave'
  | 'pez'
  | 'roedor'
  | 'reptil'
  | 'caballo'
  | 'otro'

/**
 * Mascota de la casa. Vive en Salud porque lo que se agenda de ella es de la
 * misma naturaleza que lo tuyo: citas, tratamientos y cuidados que se repiten.
 * No agenda nada por sí misma; lo hacen sus cuidados (`CuidadoMascota`) y las
 * citas y medicamentos que la señalan con `mascotaId`.
 */
export interface Mascota {
  id?: number
  /** Id único estable ('ms-…'): es lo que guardan cuidados, citas y medicamentos. */
  mascId: string
  nombre: string
  especie: EspecieMascota
  raza?: string
  /** yyyy-mm-dd; de aquí sale la edad que se muestra en la ficha. */
  nacimiento?: string
  /** Kilos del último pesaje. */
  peso?: number
  /** Veterinario de cabecera (texto libre, sin ficha propia). */
  veterinario?: string
  telefono?: string
  /** Retrato ya comprimido (comprimirFoto de rooms/_shared/fotos.tsx). */
  foto?: Blob
  notas?: string
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
  creadoEn: string
}

/** A qué corresponde el cuidado: decide su emoji en el calendario. */
export type TipoCuidadoMascota =
  | 'vacuna'
  | 'desparasitacion'
  | 'veterinario'
  | 'bano'
  | 'peluqueria'
  | 'alimento'
  | 'otro'

/**
 * Cuidado que le toca a una mascota. `fecha` es SIEMPRE la próxima vez, y
 * `cadaMeses` la empuja al siguiente periodo cuando lo das por hecho (mismo
 * patrón que los trámites del garaje): así el calendario nunca queda apuntando
 * a una vacuna que ya se puso.
 */
export interface CuidadoMascota {
  id?: number
  /** Id único estable ('cu-…'): amarra la rutina que proyecta en el calendario. */
  cuidadoId: string
  /** `Mascota.mascId` (string estable, no el id numérico). */
  mascotaId: string
  tipo: TipoCuidadoMascota
  titulo: string
  /** Próxima vez (yyyy-mm-dd). */
  fecha: string
  /** 'HH:mm' del recordatorio; vacío = HORA_CUIDADO. */
  hora?: string
  /** Meses entre repeticiones; 0/ausente = cuidado de una sola vez. */
  cadaMeses?: number
  /** yyyy-mm-dd de la última vez que se dio por hecho. */
  ultima?: string
  nota?: string
  activo: boolean
  /** Fila del ejemplo de fábrica: se puede borrar toda de golpe. */
  ejemplo?: boolean
  creadoEn: string
}

// ----- Música -----

/** Pista subida por el usuario (Blob local): suena en el Wrapped o de ambiente. */
export interface PistaMusica {
  id?: number
  nombre: string
  blob: Blob
  creadoEn: string
  duracionSeg?: number
}

// ----- Gamificación · Montaña de Sísifo -----

/**
 * Estado del ascenso anual (una sola fila, patrón singleton igual que
 * `disenoAvatar`/`mapaConfig`: `toArray()[0]` + `add`/`update`, sin id fijo).
 * `altura` (0–365 días subidos) es el único número del que se derivan rango e
 * insignias; `estrellas` es el trofeo permanente que sobrevive al reinicio de
 * cada año. Se reconcilia desde la actividad real (ver core/gamificacion/sisifo.ts).
 */
export interface EstadoSisifo {
  id?: number
  /** Días subidos en el ciclo actual (0–365). */
  altura: number
  /** Estrellas ganadas (un año completado = una estrella). Permanente. */
  estrellas: number
  /** Última fecha local ya procesada por la reconciliación (yyyy-mm-dd). */
  ultimaFecha: string
  /** Días de gracia ya gastados en el mes en curso. */
  graciasGastadas: number
  /** Mes en curso `yyyy-mm` (al cambiar se reinician las gracias). */
  mes: string
  /** Nº de insignias ya vistas por el usuario (para el badge "nueva insignia"). */
  insigniasVistas: number
  /** Hay una estrella recién ganada pendiente de celebrar. */
  estrellaNueva: boolean
}

class MindHomeDB extends Dexie {
  transacciones!: Table<Transaccion, number>
  sueno!: Table<RegistroSueno, number>
  perfilSueno!: Table<PerfilSueno, number>
  anecdotas!: Table<Anecdota, number>
  metas!: Table<Meta, number>
  presupuestos!: Table<Presupuesto, number>
  perfilNutricion!: Table<PerfilNutricion, number>
  registrosComida!: Table<RegistroComida, number>
  registrosAgua!: Table<RegistroAgua, number>
  recetas!: Table<Receta, number>
  dietasGuardadas!: Table<DietaGuardada, number>
  itemsCompra!: Table<ItemCompra, number>
  listasCompra!: Table<ListaCompra, number>
  registrosPeso!: Table<RegistroPeso, number>
  perfilEjercicio!: Table<PerfilEjercicio, number>
  sesionesEjercicio!: Table<SesionEjercicio, number>
  seriesFuerza!: Table<SerieFuerza, number>
  planEjercicio!: Table<RutinaProgramada, number>
  rutinasFuerza!: Table<RutinaFuerza, number>
  actividadesCardio!: Table<ActividadCardio, number>
  categoriasCardio!: Table<CategoriaCardio, number>
  rutinasFlex!: Table<RutinaFlex, number>
  seriesFlex!: Table<SerieFlex, number>
  gruposFuerza!: Table<GrupoFuerza, number>
  gruposFlex!: Table<GrupoFlex, number>
  gruposCardio!: Table<GrupoCardio, number>
  rutinasCardio!: Table<RutinaCardio, number>
  splitsCardio!: Table<SplitCardio, number>
  imagenesEjercicio!: Table<ImagenEjercicio, number>
  mediaArchivo!: Table<MediaArchivo, number>
  lugaresViaje!: Table<LugarViaje, number>
  diasItinerario!: Table<DiaItinerario, number>
  rutasViaje!: Table<RutaViaje, number>
  bitacoraViaje!: Table<RecuerdoViaje, number>
  portadasViaje!: Table<PortadaViaje, number>
  portadasLugar!: Table<PortadaLugar, number>
  itinerariosGuardados!: Table<ItinerarioGuardado, number>
  sesionesMindfulness!: Table<SesionMindfulness, number>
  registroAnimo!: Table<RegistroAnimo, number>
  gratitudDiaria!: Table<GratitudDiaria, number>
  perfilMindfulness!: Table<PerfilMindfulness, number>
  vehiculos!: Table<Vehiculo, number>
  registrosMantenimiento!: Table<RegistroMantenimiento, number>
  tramitesVehiculo!: Table<TramiteVehiculo, number>
  talleresVehiculo!: Table<TallerVehiculo, number>
  juegosMesa!: Table<JuegoMesa, number>
  conversacionesBiblio!: Table<ConversacionBiblio, number>
  mensajesBiblio!: Table<MensajeBiblio, number>
  entradasBiblio!: Table<EntradaBiblio, number>
  sesionesEstudio!: Table<SesionEstudio, number>
  temasArbol!: Table<TemaArbol, number>
  edicionesDiario!: Table<EdicionDiario, number>
  lecturasDiario!: Table<LecturaDiario, number>
  disenoRooms!: Table<DisenoRoom, number>
  disenoAvatar!: Table<DisenoAvatar, number>
  prendasCustom!: Table<PrendaCustom, number>
  atuendosGuardados!: Table<AtuendoGuardado, number>
  objetosCuarto!: Table<ObjetoCuarto, number>
  layout!: Table<LayoutCuarto, number>
  mapaConfig!: Table<MapaConfig, number>
  accesos!: Table<Acceso, number>
  bitacora!: Table<EntradaBitacora, number>
  memorias!: Table<Memoria, number>
  rutinas!: Table<Rutina, number>
  planesMeta!: Table<PlanMeta, number>
  ejecucionesRutina!: Table<EjecucionRutina, number>
  metasDiariasManual!: Table<MetaDiariaManual, number>
  objetivosDiarios!: Table<ObjetivoDiario, number>
  mensajesChat!: Table<MensajeChat, number>
  asistentes!: Table<AsistenteGuardado, number>
  fondosImagen!: Table<FondoImagen, number>
  pisosImagenCuarto!: Table<PisoImagenCuarto, number>
  techosImagenCuarto!: Table<TechoImagenCuarto, number>
  murosImagenCuarto!: Table<MuroImagenCuarto, number>
  grafitis!: Table<Grafiti, number>
  zonas!: Table<ZonaPlano, number>
  pisosExterior!: Table<PisoExteriorCelda, number>
  murosLibres!: Table<MuroLibre, number>
  cuartos!: Table<Cuarto, string>
  watchlist!: Table<AccionWatch, number>
  movimientosFijos!: Table<MovimientoFijo, number>
  posiciones!: Table<Posicion, number>
  hobbies!: Table<Hobby, number>
  sesionesHobby!: Table<SesionHobby, number>
  proyectosHobby!: Table<ProyectoHobby, number>
  plantillasCustom!: Table<PlantillaCustom, string>
  itemsPlantilla!: Table<ItemPlantilla, number>
  gruposPlantilla!: Table<GrupoPlantilla, number>
  objetosPlantilla!: Table<ObjetosPlantilla, string>
  idiomas!: Table<PerfilIdioma, number>
  tarjetasIdioma!: Table<TarjetaIdioma, number>
  conversacionesIdioma!: Table<ConversacionIdioma, number>
  mensajesIdioma!: Table<MensajeIdioma, number>
  temasIdioma!: Table<TemaIdioma, number>
  materialesIdioma!: Table<MaterialIdioma, number>
  repasosIdioma!: Table<RepasoIdioma, number>
  caminos!: Table<CaminoCelda, number>
  cultivos!: Table<CultivoCelda, number>
  animales!: Table<AnimalGranja, number>
  corrales!: Table<Corral, number>
  cesta!: Table<CestaEspecie, number>
  marcadores!: Table<MarcadorCancha, number>
  carreras!: Table<RecordCarrera, number>
  pistasLibres!: Table<PistaLibre, number>
  pistasMusica!: Table<PistaMusica, number>
  estadoSisifo!: Table<EstadoSisifo, number>
  ideas!: Table<Idea, number>
  mapasIdeas!: Table<MapaIdeas, number>
  nodosMapa!: Table<NodoMapa, number>
  eventosAgenda!: Table<EventoAgenda, number>
  contactosAgenda!: Table<ContactoAgenda, number>
  proyectosAgenda!: Table<ProyectoAgenda, number>
  medicamentos!: Table<Medicamento, number>
  mascotas!: Table<Mascota, number>
  cuidadosMascota!: Table<CuidadoMascota, number>
  // Internas de sincronización (prefijo `_`: ni respaldo ni sync ni UI).
  _outbox!: Table<EntradaOutbox, number>
  _syncMeta!: Table<SyncMeta, string>
  _pendientes!: Table<PendienteSync, number>

  constructor() {
    // En modo demo se abre una BD PARALELA: la casa de Pep@ vive ahí completa
    // (sin marcas de ejemplo) y la BD real del usuario queda intacta. Cambiar
    // de modo siempre recarga la página (esDemo está congelado a la carga).
    super(esDemo() ? 'mind-home-demo' : 'mind-home')
    this.version(1).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
    })
    // v2: Finanzas premium (metas de ahorro y presupuestos)
    this.version(2).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
    })
    // v3: Cocina · Nutrición premium
    this.version(3).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
    })
    // v4: Ejercicio · Fuerza, resistencia y flexibilidad
    this.version(4).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId',
    })
    // v5: índice en `orden` para consultas de series de fuerza
    this.version(5).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
    })
    // v6: Biblioteca · archivo multimedia
    this.version(6).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
    })
    // v7: Sala · planificador de viajes
    this.version(7).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
    })
    // v8: Jardín · mindfulness premium
    this.version(8).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
      sesionesMindfulness: '++id, fecha, tipo',
      registroAnimo: '++id, fecha',
      gratitudDiaria: '++id, fecha',
      perfilMindfulness: '++id',
    })
    // v9: Garage · mantenimiento de vehículos
    this.version(9).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
      sesionesMindfulness: '++id, fecha, tipo',
      registroAnimo: '++id, fecha',
      gratitudDiaria: '++id, fecha',
      perfilMindfulness: '++id',
      vehiculos: '++id, tipo, creadoEn',
      registrosMantenimiento: '++id, vehiculoId, fecha, tipo',
    })
    // v10: Entretenimiento · juegos de mesa
    this.version(10).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
      sesionesMindfulness: '++id, fecha, tipo',
      registroAnimo: '++id, fecha',
      gratitudDiaria: '++id, fecha',
      perfilMindfulness: '++id',
      vehiculos: '++id, tipo, creadoEn',
      registrosMantenimiento: '++id, vehiculoId, fecha, tipo',
      juegosMesa: '++id, categoria, estado, creadoEn, ultimaPartida',
    })
    // v11: Biblioteca · enciclopedia y progreso por tema
    this.version(11).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
      sesionesMindfulness: '++id, fecha, tipo',
      registroAnimo: '++id, fecha',
      gratitudDiaria: '++id, fecha',
      perfilMindfulness: '++id',
      vehiculos: '++id, tipo, creadoEn',
      registrosMantenimiento: '++id, vehiculoId, fecha, tipo',
      juegosMesa: '++id, categoria, estado, creadoEn, ultimaPartida',
      progresoTema: '++id, temaId, pilarId, estado, actualizadoEn',
    })
    // v12: Diario · central de noticias
    this.version(12).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
      sesionesMindfulness: '++id, fecha, tipo',
      registroAnimo: '++id, fecha',
      gratitudDiaria: '++id, fecha',
      perfilMindfulness: '++id',
      vehiculos: '++id, tipo, creadoEn',
      registrosMantenimiento: '++id, vehiculoId, fecha, tipo',
      juegosMesa: '++id, categoria, estado, creadoEn, ultimaPartida',
      progresoTema: '++id, temaId, pilarId, estado, actualizadoEn',
      noticias: '++id, fecha, categoria, leido, destacada, creadoEn',
    })
    // v13: Configuraciones y Diseño de casa
    this.version(13).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
      metas: '++id',
      presupuestos: '++id, categoria',
      perfilNutricion: '++id',
      registrosComida: '++id, fecha, momento',
      planComidas: '++id, fecha, momento',
      registrosAgua: '++id, fecha',
      alimentosFavoritos: '++id, nombre',
      perfilEjercicio: '++id',
      sesionesEjercicio: '++id, fecha, tipo',
      seriesFuerza: '++id, sesionId, orden',
      mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn',
      viajes: '++id, estado, pais, fechaInicio, creadoEn',
      actividadesViaje: '++id, viajeId, fecha, orden',
      gastosViaje: '++id, viajeId, fecha, categoria',
      checklistViaje: '++id, viajeId, categoria',
      sesionesMindfulness: '++id, fecha, tipo',
      registroAnimo: '++id, fecha',
      gratitudDiaria: '++id, fecha',
      perfilMindfulness: '++id',
      vehiculos: '++id, tipo, creadoEn',
      registrosMantenimiento: '++id, vehiculoId, fecha, tipo',
      juegosMesa: '++id, categoria, estado, creadoEn, ultimaPartida',
      progresoTema: '++id, temaId, pilarId, estado, actualizadoEn',
      noticias: '++id, fecha, categoria, leido, destacada, creadoEn',
      perfilUsuario: '++id',
      disenoRooms: '++id, roomId',
      disenoAvatar: '++id',
    })
    // v14: objetos de decoración por cuarto (Dexie conserva las tablas previas)
    this.version(14).stores({
      objetosCuarto: '++id, roomId',
    })
    // v15: layout editable del mapa (qué cuartos están colocados)
    this.version(15).stores({
      layout: '++id, roomId',
    })
    // v16: rotación de objetos en el cuarto (rotY en objetosCuarto, sin índice nuevo)
    this.version(16).stores({
      layout: '++id, roomId',
    })
    // v18: configuración del tamaño de la rejilla del mapa
    this.version(18).stores({
      mapaConfig: '++id',
    })
    // v19: bitácora del arquitecto (chat box orquestador)
    this.version(19).stores({
      bitacora: '++id, creado, roomId',
    })
    // v17: renombrar cuartos configuraciones→bodega, diseno→hobbies
    this.version(17).stores({
      layout: '++id, roomId',
    }).upgrade(async (trans) => {
      const renombrar = async (tabla: string) => {
        const filas = await trans.table(tabla).toArray() as { id?: number; roomId?: string }[]
        for (const fila of filas) {
          if (fila.roomId === 'configuraciones' && fila.id != null) {
            await trans.table(tabla).update(fila.id, { roomId: 'bodega' })
          }
          if (fila.roomId === 'diseno' && fila.id != null) {
            await trans.table(tabla).update(fila.id, { roomId: 'hobbies' })
          }
        }
      }
      await renombrar('disenoRooms')
      await renombrar('layout')
      await renombrar('objetosCuarto')
    })
    // v20: niveles (pisos). `nivel` en layout no necesita índice; accesos por nivel.
    this.version(20).stores({
      accesos: '++id, nivel',
    })
    // v21: memorias del arquitecto (hechos sobre el usuario)
    this.version(21).stores({
      memorias: '++id, creado, roomId',
    })
    // v22: conversaciones por asistente + asistentes personalizables
    this.version(22).stores({
      mensajesChat: '++id, creado, asistenteId',
      asistentes: '++id, asistenteId',
    })
    // v23: rutinas orquestadas (pasos multi-cuarto) + ejecuciones por día
    this.version(23).stores({
      rutinas: '++id, creadoEn',
      ejecucionesRutina: '++id, rutinaId, fecha',
    })
    // v24: repetición de rutinas (una vez, semanal, indefinido, personalizado)
    this.version(24).stores({
      rutinas: '++id, creadoEn',
      ejecucionesRutina: '++id, rutinaId, fecha',
    })
    // v25: fondos de cielo con imagen personalizada
    this.version(25).stores({
      fondosImagen: '++id, creado',
    })
    // v26: imágenes de piso personalizadas por cuarto
    this.version(26).stores({
      pisosImagenCuarto: '++id, roomId',
    })
    // v27: imágenes de techo personalizadas por cuarto
    this.version(27).stores({
      techosImagenCuarto: '++id, roomId',
    })
    // v28: imágenes de muro (por arista) personalizadas por cuarto
    this.version(28).stores({
      murosImagenCuarto: '++id, roomId, [roomId+clave]',
    })
    // v29: zonas libres del editor de planos
    this.version(29).stores({
      zonas: '++id, nivel',
    })
    // v30: muros por arista en zonas del plano
    this.version(30).stores({
      zonas: '++id, nivel',
    })
    // v31: pisos exteriores por celda (editor de planos)
    this.version(31).stores({
      pisosExterior: '++id, nivel, [nivel+col+row]',
    })
    // v32: imagen personalizada en pisos de zonas y celdas exteriores
    this.version(32).stores({
      zonas: '++id, nivel',
      pisosExterior: '++id, nivel, [nivel+col+row]',
    })
    // v33: formas de loseta por celda (cuadrado / triangular / circular)
    this.version(33).stores({
      zonas: '++id, nivel',
      layout: '++id, roomId',
    })
    // v34: cuartos creados por el usuario (instancias genéricas). plantillaId en
    // objetosCuarto no necesita índice. Clave primaria string provista por la app.
    this.version(34).stores({
      cuartos: 'id, orden',
    })
    // v35: muros independientes por celda libre (forma + rotación)
    this.version(35).stores({
      murosLibres: '++id, nivel, [nivel+col+row]',
    })
    // v36: muros independientes rediseñados (arista | forma + estilo). El modelo
    // anterior es incompatible; se limpia la tabla (era experimental y sin datos reales).
    this.version(36)
      .stores({ murosLibres: '++id, nivel' })
      .upgrade((tx) => tx.table('murosLibres').clear())
    // v37: tamaño (escala) por objeto. Campo sin índice en objetosCuarto.
    this.version(37).stores({
      objetosCuarto: '++id, roomId',
    })
    // v38: objetos construidos con geometría básica (piezas en objetosCuarto, sin índice).
    this.version(38).stores({
      objetosCuarto: '++id, roomId',
    })
    // v39: tipo original de objetos convertidos a piezas (campo sin índice).
    this.version(39).stores({
      objetosCuarto: '++id, roomId',
    })
    // v40: nombre personalizado por objeto (campo sin índice).
    this.version(40).stores({
      objetosCuarto: '++id, roomId',
    })
    // v41: recetario de cocina.
    this.version(41).stores({
      recetas: '++id, nombre, creadaEn',
    })
    // v42: lista de compras del súper.
    this.version(42).stores({
      itemsCompra: '++id, creadoEn',
    })
    // v43: pesajes corporales; perfilNutricion gana datos TDEE (sin índice).
    this.version(43).stores({
      registrosPeso: '++id, fecha',
    })
    // v44: plan semanal de rutinas de ejercicio.
    this.version(44).stores({
      planEjercicio: '++id, diaSemana',
    })
    // v45: cardio en vivo — ppm y ruta GPS en sesionesEjercicio (campos sin índice).
    this.version(45).stores({
      sesionesEjercicio: '++id, fecha, tipo',
    })
    // v46: la recámara se separa en dos apps (descanso + anecdotario). Perfil de
    // sueño (horario + despertador); sueño gana horas/interrupciones y anécdotas
    // ganan fotos (campos sin índice). Migra referencias 'recamara' → nueva app.
    this.version(46)
      .stores({ perfilSueno: '++id' })
      .upgrade(async (tx) => {
        // Objetos con la app vieja ligada → la app de descanso (la cama).
        const objetos = (await tx.table('objetosCuarto').toArray()) as { id?: number; plantillaId?: string }[]
        for (const o of objetos) {
          if (o.plantillaId === 'recamara' && o.id != null) {
            await tx.table('objetosCuarto').update(o.id, { plantillaId: 'descanso' })
          }
        }
        // Asistentes que archivaban la recámara → descanso + anecdotario.
        const asistentes = (await tx.table('asistentes').toArray()) as { id?: number; cuartos?: string[] }[]
        for (const a of asistentes) {
          if (a.cuartos?.includes('recamara') && a.id != null) {
            const cuartos = a.cuartos.flatMap((c) => (c === 'recamara' ? ['descanso', 'anecdotario'] : [c]))
            await tx.table('asistentes').update(a.id, { cuartos })
          }
        }
        // Pasos de rutinas que apuntaban a la recámara → por esquema.
        const rutinas = (await tx.table('rutinas').toArray()) as { id?: number; pasos?: { roomId: string; esquemaId?: string }[] }[]
        for (const r of rutinas) {
          if (r.id != null && r.pasos?.some((p) => p.roomId === 'recamara')) {
            const pasos = r.pasos.map((p) =>
              p.roomId === 'recamara'
                ? { ...p, roomId: p.esquemaId === 'anecdota' ? 'anecdotario' : 'descanso' }
                : p,
            )
            await tx.table('rutinas').update(r.id, { pasos })
          }
        }
      })
    // v47: listas de compras guardadas (itemsCompra gana listaId, sin índice);
    // se elimina la despensa rápida (favoritos): se borra su tabla.
    this.version(47).stores({
      listasCompra: '++id, creadoEn',
      alimentosFavoritos: null,
    })
    // v48: dietas preguardadas (recetas asociadas). Receta gana carpeta (sin índice).
    this.version(48).stores({
      dietasGuardadas: '++id, creadoEn',
    })
    // v49: rutinas de fuerza creadas por el usuario (plantillas del catálogo).
    this.version(49).stores({
      rutinasFuerza: '++id, creadoEn',
    })
    // v50: actividades de cardio personalizadas del usuario.
    this.version(50).stores({
      actividadesCardio: '++id, creadoEn',
    })
    // v51: rutinas de flexibilidad (fundamentales sembradas + propias del usuario).
    this.version(51).stores({
      rutinasFlex: '++id, creadoEn',
    })
    // v52: categorías editables del catálogo de cardio.
    this.version(52).stores({
      categoriasCardio: '++id, creadoEn',
    })
    // v53: posturas (tiempo × reps) de las sesiones de flexibilidad.
    this.version(53).stores({
      seriesFlex: '++id, sesionId',
    })
    // v54: imágenes (miniaturas) subidas por ejercicio del catálogo, por nombre normalizado.
    this.version(54).stores({
      imagenesEjercicio: '++id, &clave',
    })
    // v55: watchlist de acciones de la pestaña Mercados (despacho).
    this.version(55).stores({
      watchlist: '++id, simbolo',
    })
    // v56: sala rehecha — mapamundi con pines, lugares por conocer, rutas y
    // bitácora. Se eliminan las tablas del planificador de viajes anterior.
    this.version(56).stores({
      lugaresViaje: '++id, visitado, pais, creadoEn',
      rutasViaje: '++id, creadoEn',
      bitacoraViaje: '++id, lugarId, fecha',
      viajes: null,
      actividadesViaje: null,
      gastosViaje: null,
      checklistViaje: null,
    })
    // v57: itinerarios con nombre (LugarViaje gana itinerarioId/fechaPlan, sin
    // índice) y portada elegida por país para los álbumes de la bitácora.
    this.version(57).stores({
      itinerariosViaje: '++id, creadoEn',
      portadasViaje: '++id, &pais',
    })
    // v58: hoja de plan día a día por itinerario (calendario + meta en despacho).
    this.version(58).stores({
      diasItinerario: '++id, itinerarioId',
    })
    // v59: el plan pasa de "itinerarios con nombre" a un plan por cada lugar.
    // Los días se reindexan por lugarId y se elimina la tabla de itinerarios;
    // las portadas de la bitácora ahora también pueden ser por lugar.
    this.version(59)
      .stores({
        diasItinerario: '++id, lugarId',
        portadasLugar: '++id, &lugarId',
        itinerariosViaje: null,
      })
      .upgrade(async (tx) => {
        // Los días viejos apuntaban a itinerarios que ya no existen: se limpian.
        await tx.table('diasItinerario').clear()
        // Sus metas de ahorro quedan huérfanas en el despacho (nombre "✈️ …").
        const metas = tx.table('metas')
        for (const m of await metas.toArray()) {
          if (typeof m.nombre === 'string' && m.nombre.startsWith('✈️')) await metas.delete(m.id)
        }
      })
    // v60: itinerarios guardados a mano (snapshot independiente del lugar de origen).
    this.version(60).stores({
      itinerariosGuardados: '++id, creadoEn',
    })
    // v61: hobbies con seguimiento real — sesiones de práctica y proyectos.
    this.version(61).stores({
      hobbies: '++id, creadoEn',
      sesionesHobby: '++id, hobbyId, fecha',
      proyectosHobby: '++id, hobbyId, creadoEn',
    })
    // v62: biblioteca rehecha — enciclopedia conversacional: charlas con IA,
    // entradas wiki destiladas y sesiones de estudio. Se elimina el marcado
    // manual de temas (progresoTema); la cobertura ahora sale de las entradas.
    this.version(62).stores({
      conversacionesBiblio: '++id, pilarId, actualizadoEn',
      mensajesBiblio: '++id, conversacionId, creado',
      entradasBiblio: '++id, pilarId, conversacionId, actualizadoEn',
      sesionesEstudio: '++id, pilarId, fecha',
      progresoTema: null,
    })
    // v63: índice vivo de la biblioteca — cada charla desbloquea subtemas que
    // cuelgan de los temas semilla de pilares.ts (o del campo, si es pregunta libre).
    this.version(63).stores({
      temasArbol: '++id, &temaId, pilarId, padreId',
    })
    // v64: diario rehecho — periódico efímero del día (titulares + efemérides)
    // que se regenera a medianoche; se elimina la central de noticias manual.
    this.version(64).stores({
      edicionesDiario: '++id, &fecha',
      lecturasDiario: '++id, &fecha',
      noticias: null,
    })
    // v65: los asistentes ya no se inventan por app (id `app-<plantillaId>`). Ahora
    // se elige uno de los asistentes existentes desde el catálogo de Plantillas;
    // se borran los asistentes automáticos que creó el modelo anterior.
    this.version(65).upgrade(async (tx) => {
      const tabla = tx.table('asistentes')
      const filas = (await tabla.toArray()) as { id?: number; asistenteId?: string }[]
      for (const a of filas) {
        if (a.id != null && a.asistenteId?.startsWith('app-')) await tabla.delete(a.id)
      }
    })
    // v66: plantillas personalizadas — el usuario arma su propia app combinando
    // bloques (notas, checklist, contador, enlaces); definición + datos por bloque.
    this.version(66).stores({
      plantillasCustom: 'id, creadoEn',
      itemsPlantilla: '++id, plantillaId, [plantillaId+bloqueId]',
    })
    // v67: carpetas del catálogo de plantillas (grupos editables con miembros).
    this.version(67).stores({
      gruposPlantilla: '++id, orden',
    })
    // v68: las carpetas de la semilla inicial no se pueden borrar (esBase); las
    // filas ya existentes son todas de la semilla, así que se marcan.
    this.version(68).upgrade(async (tx) => {
      const tabla = tx.table('gruposPlantilla')
      for (const g of await tabla.toArray()) {
        if (g.id != null && g.esBase === undefined) await tabla.update(g.id, { esBase: true })
      }
    })
    // v69: conjunto de objetos editable por app (override de la siembra de código).
    this.version(69).stores({
      objetosPlantilla: 'plantillaId',
    })
    // v70: objetos con modelo .glb subido (tipo 'glb'). Campo sin índice en objetosCuarto.
    this.version(70).stores({
      objetosCuarto: '++id, roomId',
    })
    // v71: rotación en 3 ejes (rotX/rotZ) y altura (y) por objeto. Campos sin índice.
    this.version(71).stores({
      objetosCuarto: '++id, roomId',
    })
    // v72: animación por objeto/personaje (preset, poses, activación). Campos sin índice
    // también en asistentes y disenoAvatar.
    this.version(72).stores({
      objetosCuarto: '++id, roomId',
    })
    // v73: app de idiomas — tutor conversacional, vocabulario con repaso
    // espaciado (Leitner), temario por niveles MCER y actividad diaria.
    this.version(73).stores({
      idiomas: '++id, &codigo, creadoEn',
      tarjetasIdioma: '++id, idiomaId, [idiomaId+proximaISO], creadoEn',
      conversacionesIdioma: '++id, idiomaId, actualizadoEn',
      mensajesIdioma: '++id, conversacionId, creado',
      temasIdioma: '++id, &temaId, idiomaId, creadoEn',
      repasosIdioma: '++id, &[idiomaId+fecha], idiomaId, fecha',
    })
    // v74: objetos especiales — foto del usuario en cuadros (tipo 'cuadro-foto').
    // Campo sin índice en objetosCuarto.
    this.version(74).stores({
      objetosCuarto: '++id, roomId',
    })
    // v75: juguete Grafiti — pintura por cara de muro (PNG transparente).
    this.version(75).stores({
      grafitis: '++id, &superficie',
    })
    // v76: catálogos de fuerza y flexibilidad editables (grupos + ejercicios
    // propios, además de la semilla). grupoId es estable para no romper la
    // pirámide de enfoques al agregar o borrar grupos.
    this.version(76).stores({
      gruposFuerza: '++id, orden',
      gruposFlex: '++id, orden',
    })
    // v77: resistencia con la misma estructura que fuerza/flex — catálogo de
    // grupos editables (con descripción), rutinas propias y sesiones por tramos
    // ("splits" tipo triatlón). `categoriasCardio` queda obsoleta: sus datos se
    // migran a `gruposCardio` en el seed.
    this.version(77).stores({
      gruposCardio: '++id, orden',
      rutinasCardio: '++id, creadoEn',
      splitsCardio: '++id, sesionId, orden',
    })
    // v78: las metas del calendario pasan de 4 listas planas a un árbol. `esMeta`
    // marca la pertenencia al árbol (antes lo hacía `suelta`, que ahora solo dice
    // "sin fecha"): las metas de siempre quedan como raíces de su plazo. Los campos
    // nuevos no llevan índice, así que solo hace falta migrar los datos.
    this.version(78).upgrade(async (tx) => {
      await tx
        .table('rutinas')
        .toCollection()
        .modify((r: Rutina) => {
          if (r.suelta) r.esMeta = true
        })
    })
    // v79: las metas dejan de ser un árbol de peldaños fijos (año→mes→semana→día→
    // hora, repartido en cuatro listas de plazo) y pasan a ser UNA lista anidable
    // libre. El modelo viejo no se puede traducir al nuevo sin inventar: el plazo
    // de cada rama era obligatorio y cargaba el significado de sus fechas, así que
    // se arranca de cero por decisión del usuario.
    //
    // El filtro por `esMeta` es la parte importante: las metas comparten tabla con
    // las rutinas del calendario (ejercicio, descanso, recordatorios…), que NO se
    // tocan. Nunca un `clear()` aquí.
    this.version(79).upgrade(async (tx) => {
      await tx
        .table('rutinas')
        .toCollection()
        .filter((r: Rutina) => r.esMeta === true)
        .delete()
    })
    // v80: cronogramas ALTERNATIVOS para una meta — los propone la IA y el usuario
    // los compara superpuestos sobre el real antes de aceptarlos. Los nodos van
    // embebidos (todavía no son metas: no tienen por qué ensuciar `rutinas`) y con
    // días relativos a `inicioISO`. `metaId` va indexado porque borrar una meta
    // tiene que llevarse sus planes.
    this.version(80).stores({
      planesMeta: '++id, metaId, creadoEn',
    })
    // v81: la meta diaria de cada app. `metasDiariasManual` solo guarda los días en
    // que el usuario contradice al automático (sin fila manda la actividad real), y
    // `objetivosDiarios` el objetivo de las apps que no lo tienen en su propio perfil.
    // `Rutina.plantillaId` y `Rutina.avisar` no llevan índice: como en v78, basta con
    // migrar los datos.
    //
    // El espejo de sueño se callaba por no tener pasos, que es justo de lo que
    // `debeAvisar` deja de depender; sin este `avisar: false` pasaría a notificar
    // cada noche a la hora de dormir. Filtrado por `origen`: nunca un `clear()`.
    this.version(81)
      .stores({
        metasDiariasManual: '++id, [plantillaId+fecha], fecha',
        objetivosDiarios: '++id, &plantillaId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('rutinas')
          .toCollection()
          .modify((r: Rutina) => {
            if (r.origen === 'sueno') r.avisar = false
          })
      })
    // v82: el plan de ejercicio pasa a ser calendario. `planEjercicio` guardaba
    // "los lunes toca Pierna" en una tabla suya, con UNA FILA POR DÍA, sin hora y
    // sin forma de borrarlo; ahora cada rutina agendada es un bloque de `rutinas`
    // como los demás, con hora, aviso y su «Quitar».
    //
    // La tabla vieja se queda con sus datos a propósito: el respaldo vuelca
    // `db.tables` entero, así que quitarla haría que los respaldos anteriores la
    // reportaran como "tabla desconocida". Deja de leerse, y ya.
    this.version(82).upgrade(async (tx) => {
      const plan = (await tx.table('planEjercicio').toArray()) as RutinaProgramada[]
      if (plan.length === 0) return

      // Los catálogos dan el id de la llave estable; la fila vieja solo tiene el nombre.
      const catalogo = new Map<string, number>()
      for (const [tipo, tabla] of [
        ['fuerza', 'rutinasFuerza'],
        ['resistencia', 'rutinasCardio'],
        ['flexibilidad', 'rutinasFlex'],
      ] as const) {
        for (const r of await tx.table(tabla).toArray()) {
          const clave = `${tipo}|${r.nombre}`
          if (r.id != null && !catalogo.has(clave)) catalogo.set(clave, r.id)
        }
      }

      const hoy = new Date()
      const fechaInicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
      const bloques = planAEjercicioBloques(plan, catalogo, fechaInicio)
      if (bloques.length > 0) await tx.table('rutinas').bulkAdd(bloques)
    })
    // v83: infraestructura del mapa — caminos por celda (pistas/rieles/montaña rusa)
    // y huerto (parcelas + cultivos). El índice único &[col+row] = una fila por celda.
    this.version(83).stores({
      caminos: '++id, &[col+row]',
      cultivos: '++id, &[col+row]',
    })
    // v84 (fase 2): granja (un animal por celda-corral), cesta de cosechas por
    // especie (alimento de los animales) y marcador persistente por cancha.
    this.version(84).stores({
      animales: '++id, &[col+row]',
      cesta: '++id, &especie',
      marcadores: '++id, &canchaId',
    })
    // v85: modo carrera — récords por línea de meta y vehículo.
    this.version(85).stores({
      carreras: '++id, &[metaCol+metaRow+vehiculo]',
    })
    // v86: corrales rectangulares multi-animal. El animal deja de anclarse a su
    // celda (índice único &[col+row]) y cuelga de un corral con nombre propio.
    this.version(86)
      .stores({
        corrales: '++id',
        animales: '++id, corralId',
      })
      .upgrade(async (tx) => {
        // Cada animal existente estrena corral 1×1 en su celda y nombre aleatorio.
        // col/row se conservan a propósito: reparan respaldos pre-v86 restaurados.
        const animales = await tx.table('animales').toArray()
        for (const a of animales) {
          const corralId = await tx.table('corrales').add({ col: a.col, row: a.row, ancho: 1, alto: 1 })
          await tx.table('animales').update(a.id, { corralId, nombre: nombreAleatorio(), mimadoEn: Date.now() })
        }
        // Los tiempos de cultivo se acortaron (÷12): refrescar el riego de los
        // cultivos en curso para que no amanezcan marchitos con la ventana nueva.
        const ahora = Date.now()
        await tx
          .table('cultivos')
          .toCollection()
          .modify((c) => {
            if (c.especie && c.plantadoEn != null) c.regadoEn = ahora
          })
      })
    // v87: pista de carreras de TRAZO LIBRE (curva por puntos de control).
    this.version(87).stores({
      pistasLibres: '++id',
    })
    // v88: pistas de música subidas por el usuario (el blob no se indexa).
    this.version(88).stores({
      pistasMusica: '++id, creadoEn',
    })
    // v89: sincronización multi-dispositivo. Cada tabla sincronizable gana el
    // índice único `&uid` (identidad global entre dispositivos) y aparecen las
    // internas `_outbox` (cola de cambios), `_syncMeta` (cursor/estado) y
    // `_pendientes` (registros remotos esperando a su padre). El backfill solo
    // AÑADE campos (uid/updatedAt): no re-codifica blobs ni borra nada.
    // Las tablas excluidas del sync (ver sync/syncables.ts) no se tocan.
    this.version(89)
      .stores({
        _outbox: '++id, [tabla+uid]',
        _syncMeta: 'clave',
        _pendientes: '++id, tabla',
        transacciones: '++id, fecha, tipo, categoria, &uid',
        sueno: '++id, fecha, &uid',
        anecdotas: '++id, fecha, &uid',
        metas: '++id, &uid',
        presupuestos: '++id, categoria, &uid',
        perfilNutricion: '++id, &uid',
        registrosComida: '++id, fecha, momento, &uid',
        planComidas: '++id, fecha, momento, &uid',
        registrosAgua: '++id, fecha, &uid',
        perfilEjercicio: '++id, &uid',
        sesionesEjercicio: '++id, fecha, tipo, &uid',
        seriesFuerza: '++id, sesionId, orden, &uid',
        mediaArchivo: '++id, tipo, genero, fecha, estado, creadoEn, &uid',
        sesionesMindfulness: '++id, fecha, tipo, &uid',
        gratitudDiaria: '++id, fecha, &uid',
        vehiculos: '++id, tipo, creadoEn, &uid',
        registrosMantenimiento: '++id, vehiculoId, fecha, tipo, &uid',
        juegosMesa: '++id, categoria, estado, creadoEn, ultimaPartida, &uid',
        disenoRooms: '++id, roomId, &uid',
        disenoAvatar: '++id, &uid',
        objetosCuarto: '++id, roomId, &uid',
        layout: '++id, roomId, &uid',
        mapaConfig: '++id, &uid',
        bitacora: '++id, creado, roomId, &uid',
        accesos: '++id, nivel, &uid',
        memorias: '++id, creado, roomId, &uid',
        mensajesChat: '++id, creado, asistenteId, &uid',
        asistentes: '++id, asistenteId, &uid',
        rutinas: '++id, creadoEn, &uid',
        ejecucionesRutina: '++id, rutinaId, fecha, &uid',
        fondosImagen: '++id, creado, &uid',
        pisosImagenCuarto: '++id, roomId, &uid',
        techosImagenCuarto: '++id, roomId, &uid',
        murosImagenCuarto: '++id, roomId, [roomId+clave], &uid',
        zonas: '++id, nivel, &uid',
        pisosExterior: '++id, nivel, [nivel+col+row], &uid',
        cuartos: 'id, orden, &uid',
        murosLibres: '++id, nivel, &uid',
        recetas: '++id, nombre, creadaEn, &uid',
        itemsCompra: '++id, creadoEn, &uid',
        registrosPeso: '++id, fecha, &uid',
        perfilSueno: '++id, &uid',
        listasCompra: '++id, creadoEn, &uid',
        dietasGuardadas: '++id, creadoEn, &uid',
        rutinasFuerza: '++id, creadoEn, &uid',
        actividadesCardio: '++id, creadoEn, &uid',
        rutinasFlex: '++id, creadoEn, &uid',
        seriesFlex: '++id, sesionId, &uid',
        watchlist: '++id, simbolo, &uid',
        lugaresViaje: '++id, visitado, pais, creadoEn, &uid',
        rutasViaje: '++id, creadoEn, &uid',
        bitacoraViaje: '++id, lugarId, fecha, &uid',
        portadasViaje: '++id, &pais, &uid',
        diasItinerario: '++id, lugarId, &uid',
        portadasLugar: '++id, &lugarId, &uid',
        itinerariosGuardados: '++id, creadoEn, &uid',
        hobbies: '++id, creadoEn, &uid',
        sesionesHobby: '++id, hobbyId, fecha, &uid',
        proyectosHobby: '++id, hobbyId, creadoEn, &uid',
        conversacionesBiblio: '++id, pilarId, actualizadoEn, &uid',
        mensajesBiblio: '++id, conversacionId, creado, &uid',
        entradasBiblio: '++id, pilarId, conversacionId, actualizadoEn, &uid',
        sesionesEstudio: '++id, pilarId, fecha, &uid',
        temasArbol: '++id, &temaId, pilarId, padreId, &uid',
        lecturasDiario: '++id, &fecha, &uid',
        plantillasCustom: 'id, creadoEn, &uid',
        itemsPlantilla: '++id, plantillaId, [plantillaId+bloqueId], &uid',
        gruposPlantilla: '++id, orden, &uid',
        objetosPlantilla: 'plantillaId, &uid',
        idiomas: '++id, &codigo, creadoEn, &uid',
        tarjetasIdioma: '++id, idiomaId, [idiomaId+proximaISO], creadoEn, &uid',
        conversacionesIdioma: '++id, idiomaId, actualizadoEn, &uid',
        mensajesIdioma: '++id, conversacionId, creado, &uid',
        temasIdioma: '++id, &temaId, idiomaId, creadoEn, &uid',
        repasosIdioma: '++id, &[idiomaId+fecha], idiomaId, fecha, &uid',
        grafitis: '++id, &superficie, &uid',
        gruposFuerza: '++id, orden, &uid',
        gruposFlex: '++id, orden, &uid',
        gruposCardio: '++id, orden, &uid',
        rutinasCardio: '++id, creadoEn, &uid',
        splitsCardio: '++id, sesionId, orden, &uid',
        planesMeta: '++id, metaId, creadoEn, &uid',
        metasDiariasManual: '++id, [plantillaId+fecha], fecha, &uid',
        objetivosDiarios: '++id, &plantillaId, &uid',
        caminos: '++id, &[col+row], &uid',
        cultivos: '++id, &[col+row], &uid',
        animales: '++id, corralId, &uid',
        cesta: '++id, &especie, &uid',
        marcadores: '++id, &canchaId, &uid',
        carreras: '++id, &[metaCol+metaRow+vehiculo], &uid',
        corrales: '++id, &uid',
        pistasLibres: '++id, &uid',
      })
      .upgrade(async (tx) => {
        // Identidad global para lo ya existente. `modify` reescribe el registro
        // (clon estructurado, inevitable en IndexedDB) pero sin re-codificar
        // los blobs; las tablas pesadas excluidas no pasan por aquí.
        for (const nombre of TABLAS_SYNC) {
          await tx
            .table(nombre)
            .toCollection()
            .modify((r: Record<string, unknown>) => {
              if (typeof r.uid !== 'string' || !r.uid) r.uid = crypto.randomUUID()
              if (typeof r.updatedAt !== 'number') r.updatedAt = Date.now()
            })
        }
      })
    // v90: guardarropa a medida — prendas creadas por el usuario (IA o a mano)
    // para vestir al personaje. Tabla LOCAL (fuera del sync): lo que el avatar
    // trae puesto viaja inline en `disenoAvatar.ropaCustom`.
    this.version(90).stores({
      prendasCustom: '++id, creadoEn',
    })
    // v91: atuendos guardados por el usuario (combinaciones de prendas listas
    // para aplicarse). Tabla LOCAL, mismo trato que prendasCustom.
    this.version(91).stores({
      atuendosGuardados: '++id, creadoEn',
    })
    // v92: gamificación · Montaña de Sísifo. Fila única con el estado del
    // ascenso anual. Sincroniza para que la estrella permanente no se pierda al
    // cambiar de dispositivo (singleton: gana la más nueva por LWW).
    this.version(92).stores({
      estadoSisifo: '++id, &uid',
    })
    // v92 se envió una tarde con `&id` fijo (keyPath 'id' SIN auto-incremento):
    // cada escritura fallaba. Dexie no soporta cambiar la clave primaria de un
    // store con `stores()` normal ("UpgradeError: Not yet support for changing
    // primary key") — hay que borrarlo en una versión y recrearlo en la
    // siguiente (patrón documentado de Dexie para este caso exacto).
    this.version(93).stores({
      estadoSisifo: null,
    })
    this.version(94).stores({
      estadoSisifo: '++id, &uid',
    })
    // v95: fuera `planComidas`. El "plan semanal de comidas" nunca se construyó
    // (cero repo, cero consumidores) y la pestaña Dieta usa `dietasGuardadas`.
    this.version(95).stores({
      planComidas: null,
    })
    // v96: material propio del temario de idiomas (apuntes y fotos que sube el
    // usuario a un tema). El blob no se indexa.
    this.version(96).stores({
      materialesIdioma: '++id, idiomaId, temaId, creadoEn, &uid',
    })
    // v97: app Ideas — lluvia de ideas, mapas mentales de lienzo libre y tablero
    // Kanban con sprints y retrospectivas. `nodosMapa.nodoId` es la identidad
    // estable entre dispositivos (patrón temasArbol); las columnas del tablero y
    // la retro del sprint viajan embebidas en su fila.
    this.version(97).stores({
      ideas: '++id, fecha, creadoEn, &uid',
      mapasIdeas: '++id, creadoEn, &uid',
      nodosMapa: '++id, mapaId, &nodoId, creadoEn, &uid',
      tablerosKanban: '++id, creadoEn, &uid',
      tarjetasKanban: '++id, orden, sprintId, creadoEn, &uid',
      sprints: '++id, inicio, creadoEn, &uid',
    })
    // v98: Ideas se concentra en los mapas conceptuales (7 formatos). Fuera la
    // lluvia de ideas y el módulo ágil (tablero Kanban y sprints): se quitaron
    // por decisión del usuario y con ellos sus tablas.
    this.version(98).stores({
      ideas: null,
      tablerosKanban: null,
      tarjetasKanban: null,
      sprints: null,
    })
    // v99: app Agenda — trabajo, salud y personas. Una sola tabla de eventos con
    // `area` (un CRUD y un puente al calendario en vez de tres) más tres tablas de
    // apoyo. Cada fila lleva un id string estable (`evId`/`contactoId`/`proyId`/
    // `medId`, patrón `nodosMapa.nodoId`): es lo que la amarra con las rutinas que
    // proyecta en el calendario, sin clave foránea numérica — un medicamento genera
    // N rutinas (una por toma) y el motor de sync solo traduce campos escalares.
    // `hecho`/`activo` NO se indexan: IndexedDB no acepta booleanos como clave y la
    // fila desaparecería del índice en silencio.
    this.version(99).stores({
      eventosAgenda: '++id, area, fecha, contactoId, proyectoId, creadoEn, &evId, &uid',
      contactosAgenda: '++id, nombre, cumple, creadoEn, &contactoId, &uid',
      proyectosAgenda: '++id, creadoEn, &proyId, &uid',
      medicamentos: '++id, creadoEn, &medId, &uid',
    })
    // v100: Ideas se ordena en tres secciones (diario, mapas y diagramas).
    // Vuelve la tabla `ideas` que se fue en la v98, pero ahora es un DIARIO: cada
    // fila es una idea con su `tema`, y las que comparten tema son una lluvia (no
    // hace falta una tabla de sesiones para agruparlas). Mismo esquema que en la
    // v97, así que los respaldos viejos siguen restaurando.
    // Los diagramas de decisión (pros/contras, FODA e Ishikawa) NO añaden tablas:
    // son formatos nuevos de `mapasIdeas` y `tipo` no está indexado.
    this.version(100).stores({
      ideas: '++id, fecha, creadoEn, &uid',
    })
    // v101: el catálogo de plantillas pasa de 4 a 5 carpetas base, con nombres y
    // reparto nuevos (`GRUPOS_PLANTILLA_BASE`). Las carpetas base se reescriben en
    // su sitio conservando las plantillas personalizadas que vivieran en ellas; a
    // las carpetas del usuario solo se les quitan las apps del sistema (que ahora
    // tienen carpeta fija) y se recolocan detrás de las base.
    this.version(101).upgrade(async (tx) => {
      const tabla = tx.table('gruposPlantilla')
      const filas = (await tabla.toArray()) as GrupoPlantilla[]
      if (filas.length === 0) return
      const custom = new Set(
        (await tx.table('plantillasCustom').toArray()).map((p: { id: string }) => p.id),
      )
      const delSistema = new Set(GRUPOS_PLANTILLA_BASE.flatMap((g) => g.miembros))
      const base = filas.filter((g) => g.esBase).sort((a, b) => a.orden - b.orden)
      const propias = filas.filter((g) => !g.esBase).sort((a, b) => a.orden - b.orden)

      for (let i = 0; i < GRUPOS_PLANTILLA_BASE.length; i++) {
        const nueva = GRUPOS_PLANTILLA_BASE[i]
        const vieja = base[i]
        const suyas = (vieja?.miembros ?? []).filter((m) => custom.has(m))
        const fila = {
          nombre: nueva.nombre,
          emoji: nueva.emoji,
          orden: i,
          miembros: [...nueva.miembros, ...suyas],
          esBase: true,
        }
        if (vieja?.id != null) await tabla.update(vieja.id, fila)
        else await tabla.add(fila)
      }
      for (let i = 0; i < propias.length; i++) {
        const g = propias[i]
        if (g.id == null) continue
        await tabla.update(g.id, {
          orden: GRUPOS_PLANTILLA_BASE.length + i,
          miembros: g.miembros.filter((m) => !delSistema.has(m)),
        })
      }
    })
    // v102: el garaje agenda trámites (tenencia, verificación, tarjeta de
    // circulación, seguro y servicio periódico) y guarda la libreta de talleres.
    // Mismo patrón que la agenda: id string estable (`tramiteId`/`tallerId`) para
    // amarrar las rutinas que se proyectan en el calendario, y `vehiculoId` como
    // clave foránea numérica (declarada en `FK`, que sí traduce el sync).
    // `activo` no se indexa: IndexedDB no acepta booleanos como clave.
    this.version(102).stores({
      tramitesVehiculo: '++id, vehiculoId, fecha, tipo, creadoEn, &tramiteId, &uid',
      talleresVehiculo: '++id, vehiculoId, nombre, creadoEn, &tallerId, &uid',
    })
    // v103: Salud de la agenda también lleva las mascotas. Mismo patrón que el
    // resto de la agenda: id string estable (`mascId`/`cuidadoId`) para amarrar
    // las rutinas del calendario, y `mascotaId` como referencia por string (no es
    // FK numérica, así que el sync no tiene que traducirla). Las citas y los
    // medicamentos NO cambian de esquema: su `mascotaId` es un campo suelto sin
    // índice. `activo` no se indexa: IndexedDB no acepta booleanos como clave.
    this.version(103).stores({
      mascotas: '++id, nombre, creadoEn, &mascId, &uid',
      cuidadosMascota: '++id, mascotaId, fecha, creadoEn, &cuidadoId, &uid',
    })
    // v104: el despacho se reorganiza en Balance / Metas / Portafolio. Trae los
    // movimientos fijos mensuales (gastos e ingresos que se repiten cada mes y
    // suman al resumen) y las posiciones del portafolio de inversión (acciones
    // y cripto valuadas con los precios de Mercados). El `tipo` de `metas`
    // (ahorro/inversión/deuda) no se indexa: las filas viejas son 'ahorro'.
    this.version(104).stores({
      movimientosFijos: '++id, tipo, &uid',
      posiciones: '++id, simbolo, &uid',
    })
    // v105: fijo/variable deja de ser una tabla aparte y pasa a ser el `periodo`
    // de cada movimiento (único, o cada día/semana/mes/año), que se elige al
    // capturarlo. Los fijos que ya existían se vuelven movimientos mensuales que
    // arrancan hoy. Conservan su `uid`: así los demás dispositivos reconocen la
    // fila migrada como la misma (LWW) en vez de duplicarla.
    this.version(105).upgrade(async (tx) => {
      const viejos = tx.table('movimientosFijos')
      const filas = (await viejos.toArray()) as (MovimientoFijo & { uid?: string })[]
      if (filas.length === 0) return
      const hoy = fechaLocalISO()
      for (const f of filas) {
        await tx.table('transacciones').add({
          fecha: hoy,
          tipo: f.tipo,
          categoria: f.categoria,
          monto: f.monto,
          nota: f.nota,
          periodo: 'mes',
          ejemplo: f.ejemplo,
          uid: f.uid,
        })
      }
      await viejos.clear()
    })
    // v106: la granja gana enfermedad (el animal que lleva mucho sin comer enferma
    // y hay que curarlo) y limpieza semanal del corral. Los corrales que ya existen
    // se sellan como recién limpiados: sin esto amanecerían todos sucios de golpe.
    this.version(106).upgrade(async (tx) => {
      const ahora = Date.now()
      await tx
        .table('corrales')
        .toCollection()
        .modify((c) => {
          c.limpiadoEn = ahora
        })
    })
  }
}

/** Cola local de cambios pendientes de push (la escribe el middleware). */
export interface EntradaOutbox {
  id?: number
  tabla: string
  uid: string
  op: 'upsert' | 'delete'
}

/** Metadatos del motor de sync (cursor de pull, bootstrap, hashes de blobs). */
export interface SyncMeta {
  clave: string
  valor: unknown
}

/** Registro remoto cuyo padre (FK numérica) aún no llegó: se reintenta. */
export interface PendienteSync {
  id?: number
  tabla: string
  uid: string
  datos: unknown
  updatedAt: number
  deleted: boolean
}

export const db = new MindHomeDB()

// Toda transacción de ESCRITURA incluye `_outbox`: así el middleware puede
// encolar el cambio DENTRO de la misma transacción aunque el caller solo haya
// declarado su tabla (mismo truco que dexie-observable con `_changes`).
type CreadorTx = (
  mode: IDBTransactionMode,
  storeNames: string[],
  dbschema: unknown,
  parentTransaction?: unknown,
) => unknown
const dbConTx = db as unknown as { _createTransaction: CreadorTx }
const crearTxOriginal = dbConTx._createTransaction.bind(db)
dbConTx._createTransaction = (mode, storeNames, dbschema, parentTransaction) => {
  const stores =
    mode === 'readwrite' && !storeNames.includes('_outbox')
      ? [...storeNames, '_outbox']
      : storeNames
  return crearTxOriginal(mode, stores, dbschema, parentTransaction)
}

// Sella uid/updatedAt y encola en _outbox en TODA mutación sincronizable.
db.use(syncMiddleware)

// En la casa demo se puede escribir todo, pero nada persiste: el marcador
// apunta qué tablas tocó el visitante (level 2, por fuera del sync). En modo
// AUTOR (solo dev) ni se instala: se edita la casa de Pep@ de verdad.
if (esDemo() && !esDemoAutor()) {
  db.use(demoGuard)
  // El visitante dejó cambios: la casa vuelve a su estado original AQUÍ y no en
  // otro sitio. `on('ready')` es el único punto seguro — Dexie retiene toda
  // consulta encolada hasta que su promesa resuelve, y los `cargar()` de los
  // stores de la casa se autoinvocan al importarse, antes de que corra `main`.
  // Va obligatoriamente ANTES del `db.open()`.
  if (haySandboxDemoSucio()) {
    db.on('ready', (vip) => import('../../demo/sandbox').then((m) => m.restaurarBaseDemo(vip as Dexie)))
  }
}

db.open().catch((err) => {
  console.error('[MPH] No se pudo abrir IndexedDB:', err)
})
