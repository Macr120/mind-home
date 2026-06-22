import Dexie, { type Table } from 'dexie'

/**
 * Capa de datos LOCAL (IndexedDB vía Dexie).
 *
 * Este archivo es el ÚNICO punto que toca la base de datos directamente.
 * Cuando migremos a la nube (Supabase), reescribimos solo este archivo y
 * `repository.ts`; ninguna de las apps de los cuartos cambia.
 */

// ----- Entidades (modelos de datos compartidos) -----

export interface Transaccion {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  tipo: 'ingreso' | 'gasto'
  categoria: string
  monto: number
  nota?: string
}

export interface RegistroSueno {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  horas: number
  calidad: number // 1-5
  nota?: string
}

export interface Anecdota {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  titulo: string
  contenido: string
  animo: string // emoji o palabra
}

/** Meta de ahorro (Finanzas). */
export interface Meta {
  id?: number
  nombre: string
  objetivo: number
  ahorrado: number
}

/** Presupuesto. categoria '__mensual__' = presupuesto total del mes. */
export interface Presupuesto {
  id?: number
  categoria: string
  monto: number
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

/** Comida planificada (semana). */
export interface PlanComida {
  id?: number
  fecha: string
  momento: MomentoComida
  nombre: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  preparado: boolean
}

export interface RegistroAgua {
  id?: number
  fecha: string
  ml: number
}

/** Despensa rápida para registrar en un toque. */
export interface AlimentoFavorito {
  id?: number
  nombre: string
  porcion: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

// ----- Ejercicio · Rutinas -----

export type TipoEntrenamiento = 'fuerza' | 'resistencia' | 'flexibilidad'

/** Objetivos semanales por modalidad. */
export interface PerfilEjercicio {
  id?: number
  sesionesFuerzaSemana: number
  minutosResistenciaSemana: number
  minutosFlexibilidadSemana: number
  diasActivosSemana: number
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

// ----- Entretenimiento · Archivo multimedia -----

export type TipoMedia = 'pelicula' | 'serie' | 'libro' | 'videojuego'

export type EstadoMedia = 'pendiente' | 'en_curso' | 'completado'

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
  creadoEn: string
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
}

// ----- Biblioteca · Enciclopedia -----

export type EstadoTemaEnciclopedia = 'explorado' | 'en_estudio' | 'revisado'

/** Progreso del usuario sobre un tema del índice enciclopédico. */
export interface ProgresoTema {
  id?: number
  pilarId: string
  temaId: string
  estado: EstadoTemaEnciclopedia
  nota?: string
  actualizadoEn: string
}

// ----- Diario · Central de noticias -----

export type CategoriaNoticia =
  | 'mundo'
  | 'nacional'
  | 'politica'
  | 'economia'
  | 'tecnologia'
  | 'ciencia'
  | 'salud'
  | 'deportes'
  | 'cultura'
  | 'entretenimiento'
  | 'local'
  | 'otro'

/** Noticia guardada en la central personal. */
export interface Noticia {
  id?: number
  /** Fecha de publicación o del día (ISO yyyy-mm-dd). */
  fecha: string
  categoria: CategoriaNoticia
  titulo: string
  resumen: string
  fuente?: string
  url?: string
  leido: boolean
  destacada: boolean
  creadoEn: string
}

// ----- Sala · Viajes -----

export type EstadoViaje = 'wishlist' | 'planificado' | 'proximo' | 'completado'

export type TipoViaje =
  | 'playa'
  | 'ciudad'
  | 'aventura'
  | 'negocios'
  | 'ruta'
  | 'otro'

/** Viaje pasado, en curso o futuro. */
export interface Viaje {
  id?: number
  titulo: string
  destino: string
  pais: string
  fechaInicio: string
  fechaFin: string
  estado: EstadoViaje
  tipoViaje: TipoViaje
  presupuesto: number
  moneda: string
  calificacion: number
  resena: string
  companeros?: string
  creadoEn: string
}

/** Parada o actividad dentro de un viaje. */
export interface ActividadViaje {
  id?: number
  viajeId: number
  fecha: string
  titulo: string
  hora?: string
  nota?: string
  orden: number
}

export type CategoriaGastoViaje =
  | 'vuelo'
  | 'hotel'
  | 'comida'
  | 'transporte'
  | 'actividad'
  | 'otro'

export interface GastoViaje {
  id?: number
  viajeId: number
  concepto: string
  monto: number
  categoria: CategoriaGastoViaje
  fecha: string
}

export type CategoriaChecklist = 'documentos' | 'equipaje' | 'reservas' | 'otro'

export interface ChecklistViaje {
  id?: number
  viajeId: number
  texto: string
  listo: boolean
  categoria: CategoriaChecklist
}

// ----- Jardín · Mindfulness -----

export type TipoPractica =
  | 'meditacion'
  | 'respiracion'
  | 'sueno'
  | 'gratitud'
  | 'sonido'
  | 'movimiento'

/** Sesión de mindfulness completada o en curso. */
export interface SesionMindfulness {
  id?: number
  fecha: string
  tipo: TipoPractica
  titulo: string
  duracionMin: number
  nota?: string
  /** Id de práctica guiada predefinida. */
  presetId?: string
}

/** Check-in diario de ánimo (un registro por día). */
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
}

/** Objetivos de práctica diaria. */
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

export type UnidadOdometro = 'km' | 'mi'

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

// ----- Perfil y personalización de la casa (editor de mapa) -----

/** Perfil del usuario (una sola fila, id=1). */
export interface PerfilUsuario {
  id?: number
  nombre: string
  emoji: string
  nacimiento?: string // ISO yyyy-mm-dd
  bio: string
}

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
}

/** Objeto colocado en un cuarto (catálogo o mueble temático). */
export interface ObjetoCuarto {
  id?: number
  roomId: string
  tipo: string  // id del catálogo o `mueble:<roomId>`
  color: string // hex
  slot: number  // (heredado) ranura; con x/z se ignora
  x?: number    // posición libre dentro del cuarto (relativa al centro)
  z?: number
  /** Rotación en grados (eje Y). */
  rotY?: number
  /** Mueble principal del cuarto: no se puede quitar, sí mover y recolorear. */
  permanente?: boolean
  /** ID del grupo al que pertenece este objeto (para mover conjuntos juntos). */
  grupoId?: string
  /** Plantilla (app) asignada a este objeto; vacío = objeto decorativo sin app. */
  plantillaId?: string
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
}

/** Configuración global del mapa (tamaño de la rejilla). */
export interface MapaConfig {
  id?: number
  cols: number
  rows: number
}

/**
 * Acceso para subir a un nivel ≥ 1: hay UNO por nivel, en la celda del primer cuarto
 * que se construyó en ese nivel. Conecta el nivel `nivel-1` con el `nivel`.
 */
export interface Acceso {
  id?: number
  nivel: number // nivel al que sube (≥ 1)
  tipo: 'escalera' | 'elevador' | 'resbaladilla'
  col: number // celda ancla del acceso
  row: number
  /** Pared del cuarto superior a la que se ancla (N/S/E/O). Vacío = derivar hacia el centro. */
  lado?: 'N' | 'S' | 'E' | 'O'
}

/** Layout editable: qué cuartos están colocados, en qué celda y con qué forma. */
export interface LayoutCuarto {
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
  /** Legado: desplazamiento de puerta por lado (ya no se usa). */
  puertas?: Partial<Record<'N' | 'S' | 'E' | 'O', number>>
}

/** Imagen personalizada de piso de un cuarto. */
export interface PisoImagenCuarto {
  id?: number
  roomId: string
  imagen: Blob
  /** Repeticiones por celda: 'x1' | 'x2' | 'x4' */
  ajuste: string
  /** ¿Está siendo usada actualmente como piso del cuarto? */
  activa: boolean
}

/** Imagen personalizada de techo de un cuarto. */
export interface TechoImagenCuarto {
  id?: number
  roomId: string
  imagen: Blob
  /** Repeticiones por celda: 'x1' | 'x2' | 'x4' */
  ajuste: string
  /** ¿Está siendo usada actualmente como techo del cuarto? */
  activa: boolean
}

/** Imagen personalizada de un muro (arista) de un cuarto. */
export interface MuroImagenCuarto {
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
export interface DisenoAvatar {
  id?: number
  cabeza: string   // hex
  torso: string    // hex
  piernas: string  // hex
  /** Modelo 3D generado por IA: JSON de piezas primitivas (Pieza3D[]). */
  modelo3d?: string
  /** Modelo .glb subido por el usuario (gana a modelo3d y a los cubos). */
  modeloGlb?: Blob
}

// ----- Bitácora · el arquitecto (orquestador) -----

/**
 * Entrada de la bitácora: lo que el usuario le dice al "arquitecto" desde el
 * chat box. En la capa SIN IA se guarda el texto tal cual, etiquetado al cuarto
 * que el dispatcher determinista detecta (o sin cuarto). La capa de IA luego
 * leerá estas entradas para convertirlas en registros reales de cada cuarto.
 */
export interface EntradaBitacora {
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
export interface Memoria {
  id?: number
  hecho: string
  roomId?: string   // cuarto relacionado (vacío = sobre el usuario en general)
  origen?: number   // id de la entrada de bitácora que la originó
  creado: string    // ISO timestamp
  /** false = ya no aplica; se conserva como historia, la IA la ignora. */
  vigente: boolean
}

/**
 * Mensaje de la conversación con un asistente (interfaz tipo chat).
 * Cada asistente tiene su propio hilo: lo que el usuario escribió y lo que
 * el asistente respondió quedan aquí para releerlos cuando se quiera.
 */
export interface MensajeChat {
  id?: number
  asistenteId: string // 'mago', 'gato', … o 'custom-<n>'
  rol: 'usuario' | 'asistente'
  texto: string
  creado: string // ISO timestamp
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
  /** Modelo 3D generado por IA: JSON de piezas primitivas (Pieza3D[]). */
  modelo3d?: string
  /** Modelo .glb subido por el usuario. */
  modeloGlb?: Blob
  enMapa: boolean // aparece como personaje en el mapa
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
 */
export type RepeticionRutina = 'una_vez' | 'semanal' | 'indefinido' | 'personalizado'

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
  /** Color del evento en el calendario (hex; vacío = verde por defecto). */
  color?: string
  pasos: PasoRutina[]
  activa: boolean
  creadoEn: string
}

/** Qué pasos de una rutina se completaron en un día (para rachas y digest). */
export interface EjecucionRutina {
  id?: number
  rutinaId: number
  fecha: string // yyyy-mm-dd
  /** Índices de pasos completados. */
  pasosHechos: number[]
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

export class MindHomeDB extends Dexie {
  transacciones!: Table<Transaccion, number>
  sueno!: Table<RegistroSueno, number>
  anecdotas!: Table<Anecdota, number>
  metas!: Table<Meta, number>
  presupuestos!: Table<Presupuesto, number>
  perfilNutricion!: Table<PerfilNutricion, number>
  registrosComida!: Table<RegistroComida, number>
  planComidas!: Table<PlanComida, number>
  registrosAgua!: Table<RegistroAgua, number>
  alimentosFavoritos!: Table<AlimentoFavorito, number>
  perfilEjercicio!: Table<PerfilEjercicio, number>
  sesionesEjercicio!: Table<SesionEjercicio, number>
  seriesFuerza!: Table<SerieFuerza, number>
  mediaArchivo!: Table<MediaArchivo, number>
  viajes!: Table<Viaje, number>
  actividadesViaje!: Table<ActividadViaje, number>
  gastosViaje!: Table<GastoViaje, number>
  checklistViaje!: Table<ChecklistViaje, number>
  sesionesMindfulness!: Table<SesionMindfulness, number>
  registroAnimo!: Table<RegistroAnimo, number>
  gratitudDiaria!: Table<GratitudDiaria, number>
  perfilMindfulness!: Table<PerfilMindfulness, number>
  vehiculos!: Table<Vehiculo, number>
  registrosMantenimiento!: Table<RegistroMantenimiento, number>
  juegosMesa!: Table<JuegoMesa, number>
  progresoTema!: Table<ProgresoTema, number>
  noticias!: Table<Noticia, number>
  perfilUsuario!: Table<PerfilUsuario, number>
  disenoRooms!: Table<DisenoRoom, number>
  disenoAvatar!: Table<DisenoAvatar, number>
  objetosCuarto!: Table<ObjetoCuarto, number>
  layout!: Table<LayoutCuarto, number>
  mapaConfig!: Table<MapaConfig, number>
  accesos!: Table<Acceso, number>
  bitacora!: Table<EntradaBitacora, number>
  memorias!: Table<Memoria, number>
  rutinas!: Table<Rutina, number>
  ejecucionesRutina!: Table<EjecucionRutina, number>
  mensajesChat!: Table<MensajeChat, number>
  asistentes!: Table<AsistenteGuardado, number>
  fondosImagen!: Table<FondoImagen, number>
  pisosImagenCuarto!: Table<PisoImagenCuarto, number>
  techosImagenCuarto!: Table<TechoImagenCuarto, number>
  murosImagenCuarto!: Table<MuroImagenCuarto, number>
  zonas!: Table<ZonaPlano, number>
  pisosExterior!: Table<PisoExteriorCelda, number>
  cuartos!: Table<Cuarto, string>

  constructor() {
    super('mind-home')
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
  }
}

export const db = new MindHomeDB()

db.open().catch((err) => {
  console.error('[Mind Home] No se pudo abrir IndexedDB:', err)
})
