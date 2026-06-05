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

// ----- Configuraciones · Perfil y diseño -----

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
}

/** Layout editable: qué cuartos están colocados y en qué celda de la rejilla. */
export interface LayoutCuarto {
  id?: number
  roomId: string
  placed: boolean
  col?: number // celda en la rejilla (vacío = celda por defecto)
  row?: number
  w?: number // tamaño en celdas (ancho)
  h?: number // tamaño en celdas (largo)
  /** Paredes/vanos manuales por lado (vacío = automático). */
  muros?: Partial<Record<'N' | 'S' | 'E' | 'O', 'pared' | 'puerta' | 'abierto'>>
  /** Desplazamiento de la puerta por lado (-1..1, 0 = centro). */
  puertas?: Partial<Record<'N' | 'S' | 'E' | 'O', number>>
}

/** Colores del avatar Roblox del usuario. */
export interface DisenoAvatar {
  id?: number
  cabeza: string   // hex
  torso: string    // hex
  piernas: string  // hex
}

// ----- Base de datos -----

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
  }
}

export const db = new MindHomeDB()

db.open().catch((err) => {
  console.error('[Mind Home] No se pudo abrir IndexedDB:', err)
})
