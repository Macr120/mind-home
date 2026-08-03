/**
 * Fuente única de verdad de la sincronización: qué tablas viajan, qué campos
 * son claves foráneas numéricas (se traducen id local ⇄ uid en la frontera),
 * en qué orden se aplica el pull y qué índices únicos pueden chocar al fusionar.
 *
 * OJO: este módulo NO importa `db` (lo importa `db.ts` para la migración v89).
 */

/**
 * Tablas sincronizables. Las que NO aparecen aquí (además de las internas con
 * prefijo `_`) quedan solo locales: legadas/muertas (planEjercicio,
 * categoriasCardio, registroAnimo, perfilMindfulness, perfilUsuario), cachés
 * regenerables (imagenesEjercicio), efímeras del día (edicionesDiario), audio
 * pesado (pistasMusica) y el guardarropa a medida (prendasCustom,
 * atuendosGuardados — lo puesto viaja inline en disenoAvatar.ropaCustom).
 */
export const TABLAS_SYNC: string[] = [
  'transacciones',
  'sueno',
  'anecdotas',
  'metas',
  'presupuestos',
  'perfilNutricion',
  'registrosComida',
  'registrosAgua',
  'perfilEjercicio',
  'sesionesEjercicio',
  'seriesFuerza',
  'mediaArchivo',
  'sesionesMindfulness',
  'gratitudDiaria',
  'vehiculos',
  'registrosMantenimiento',
  'disenoRooms',
  'disenoAvatar',
  'objetosCuarto',
  'layout',
  'mapaConfig',
  'bitacora',
  'accesos',
  'memorias',
  'mensajesChat',
  'asistentes',
  'rutinas',
  'ejecucionesRutina',
  'fondosImagen',
  'pisosImagenCuarto',
  'techosImagenCuarto',
  'murosImagenCuarto',
  'zonas',
  'pisosExterior',
  'cuartos',
  'murosLibres',
  'recetas',
  'itemsCompra',
  'registrosPeso',
  'perfilSueno',
  'listasCompra',
  'dietasGuardadas',
  'rutinasFuerza',
  'rutinasFlex',
  'seriesFlex',
  'watchlist',
  'lugaresViaje',
  'rutasViaje',
  'bitacoraViaje',
  'portadasViaje',
  'diasItinerario',
  'portadasLugar',
  'itinerariosGuardados',
  'hobbies',
  'sesionesHobby',
  'proyectosHobby',
  'conversacionesBiblio',
  'mensajesBiblio',
  'entradasBiblio',
  'sesionesEstudio',
  'temasArbol',
  'lecturasDiario',
  'plantillasCustom',
  'itemsPlantilla',
  'gruposPlantilla',
  'objetosPlantilla',
  'idiomas',
  'tarjetasIdioma',
  'conversacionesIdioma',
  'mensajesIdioma',
  'temasIdioma',
  'materialesIdioma',
  'repasosIdioma',
  'grafitis',
  'gruposFuerza',
  'gruposFlex',
  'gruposCardio',
  'rutinasCardio',
  'splitsCardio',
  'planesMeta',
  'metasDiariasManual',
  'objetivosDiarios',
  'caminos',
  'cultivos',
  'animales',
  'cesta',
  'marcadores',
  'carreras',
  'corrales',
  'pistasLibres',
  'estadoSisifo',
  'ideas',
  'mapasIdeas',
  'nodosMapa',
  'eventosAgenda',
  'contactosAgenda',
  'proyectosAgenda',
  'medicamentos',
  'mascotas',
  'cuidadosMascota',
  'tramitesVehiculo',
  'talleresVehiculo',
]

/**
 * Fuera del sync desde ago 2026 por estar MUERTAS: se subían y bajaban del
 * servidor sin que nadie las leyera. `actividadesCardio` la sustituyó
 * `gruposCardio`; `juegosMesa` quedó huérfana al convertirse su pestaña en un
 * catálogo de minijuegos; `movimientosFijos` y `posiciones` perdieron su repo
 * (ver `repository.ts`) y sus datos migraron a `transacciones` en la v105.
 * Las tablas se conservan en `db.ts` para no romper respaldos antiguos.
 */

const TABLAS_SYNC_SET = new Set(TABLAS_SYNC)

/** ¿Esta tabla viaja al servidor? (excluye internas `_` y la lista de arriba) */
export function esTablaSync(nombre: string): boolean {
  return TABLAS_SYNC_SET.has(nombre)
}

/**
 * Claves foráneas por id numérico local: `tabla → { campo: tablaDestino }`.
 * En push se traducen a `uid` del padre; en pull, de vuelta al id local.
 * Las referencias por string (`roomId`, `plantillaId`, `asistenteId`,
 * `temaId`/`padreId` de los árboles de biblioteca/idiomas…) son estables entre
 * dispositivos y NO se traducen.
 *
 * Toda FK numérica de una tabla sincronizada TIENE que estar aquí: sin traducir,
 * el id local viaja crudo y en el otro dispositivo apunta a la fila que tenga ese
 * número, que es cualquiera. Al añadir una, comprueba también `ORDEN_TOPO`.
 *
 * Limitación conocida (no soportada por el motor, que solo traduce escalares en
 * `motor.ts`): los arrays de ids `DietaGuardada.recetaIds` y `RutaViaje.lugarIds`
 * viajan sin traducir y pueden apuntar a recetas/lugares equivocados en el
 * segundo dispositivo. Arreglarlo pide soportar arrays en el motor.
 */
export const FK: Record<string, Record<string, string>> = {
  seriesFuerza: { sesionId: 'sesionesEjercicio' },
  seriesFlex: { sesionId: 'sesionesEjercicio' },
  splitsCardio: { sesionId: 'sesionesEjercicio' },
  registrosMantenimiento: { vehiculoId: 'vehiculos' },
  tramitesVehiculo: { vehiculoId: 'vehiculos' },
  talleresVehiculo: { vehiculoId: 'vehiculos' },
  lugaresViaje: { metaId: 'metas' },
  bitacoraViaje: { lugarId: 'lugaresViaje' },
  diasItinerario: { lugarId: 'lugaresViaje' },
  portadasLugar: { lugarId: 'lugaresViaje' },
  sesionesHobby: { hobbyId: 'hobbies', proyectoId: 'proyectosHobby' },
  proyectosHobby: { hobbyId: 'hobbies' },
  mensajesBiblio: { conversacionId: 'conversacionesBiblio' },
  entradasBiblio: { conversacionId: 'conversacionesBiblio' },
  sesionesEstudio: { entradaId: 'entradasBiblio' },
  temasArbol: { conversacionId: 'conversacionesBiblio' },
  tarjetasIdioma: { idiomaId: 'idiomas' },
  conversacionesIdioma: { idiomaId: 'idiomas' },
  repasosIdioma: { idiomaId: 'idiomas' },
  temasIdioma: { idiomaId: 'idiomas', conversacionId: 'conversacionesIdioma' },
  materialesIdioma: { idiomaId: 'idiomas' },
  mensajesIdioma: { conversacionId: 'conversacionesIdioma' },
  ejecucionesRutina: { rutinaId: 'rutinas' },
  planesMeta: { metaId: 'rutinas' }, // las metas del árbol viven en `rutinas`
  rutinas: { padreId: 'rutinas' }, // self-FK del árbol de metas
  animales: { corralId: 'corrales' },
  itemsCompra: { listaId: 'listasCompra' },
  listasCompra: { gastoId: 'transacciones' },
  nodosMapa: { mapaId: 'mapasIdeas' },
  mensajesChat: { mapaId: 'mapasIdeas' },
  // La cancha es un objeto del mapa, así que `canchaId` es el id AUTOINCREMENTAL
  // de `objetosCuarto` (ver `minijuegos.tsx`), no una referencia estable. Además
  // es índice único y clave de merge: sin traducir, el marcador de una cancha
  // podía resolverse contra otra distinta al fusionar dos dispositivos.
  marcadores: { canchaId: 'objetosCuarto' },
  objetosCuarto: { libreriaId: 'objetosCuarto' }, // self-FK: instancia → plantilla de la biblioteca
}

/**
 * Orden de aplicación del pull: los padres antes que sus hijos. Las tablas que
 * no aparecen aquí no tienen padres numéricos y pueden aplicarse primero.
 * (`rutinas` y `objetosCuarto` se auto-referencian: los huérfanos reintentan
 * vía `_pendientes`.)
 */
export const ORDEN_TOPO: string[] = [
  'metas',
  'sesionesEjercicio',
  'vehiculos',
  'hobbies',
  'conversacionesBiblio',
  'idiomas',
  'rutinas',
  'corrales',
  'transacciones',
  'listasCompra',
  'lugaresViaje',
  'conversacionesIdioma',
  'objetosCuarto',
  'seriesFuerza',
  'seriesFlex',
  'splitsCardio',
  'registrosMantenimiento',
  'tramitesVehiculo',
  'talleresVehiculo',
  'bitacoraViaje',
  'diasItinerario',
  'portadasLugar',
  // `proyectosHobby` antes que `sesionesHobby`: la sesión referencia al proyecto.
  'proyectosHobby',
  'sesionesHobby',
  'mensajesBiblio',
  'entradasBiblio',
  'sesionesEstudio',
  'temasArbol',
  'tarjetasIdioma',
  'repasosIdioma',
  'temasIdioma',
  'materialesIdioma',
  'mensajesIdioma',
  'ejecucionesRutina',
  'planesMeta',
  'animales',
  'itemsCompra',
  'mapasIdeas',
  'nodosMapa',
  'mensajesChat',
  'marcadores',
]

/** Tablas de UNA sola fila: si el merge deja más de una, gana la más nueva. */
export const SINGLETONS = new Set<string>([
  'perfilNutricion',
  'perfilEjercicio',
  'perfilSueno',
  'mapaConfig',
  'disenoAvatar',
  'estadoSisifo',
])

/**
 * Índices únicos (aparte de `&uid`) de las tablas sincronizables: al aplicar
 * un registro remoto que choca con una fila local distinta, gana el
 * `updatedAt` mayor y la perdedora se tombstonea.
 */
/**
 * Identidad determinista para filas de SIEMBRA: el mismo contenido genera el
 * mismo uid en todo dispositivo (el servidor deduplica solo) y `updatedAt: 1`
 * garantiza que cualquier edición real (siempre > 1) gane por LWW. El
 * middleware respeta ambos valores cuando el uid empieza con `seed-`.
 */
export function filaSeed<T>(clave: string, fila: T): T {
  return { ...fila, uid: `seed-${clave}`, updatedAt: 1 } as T
}

export function filasSeed<T>(prefijo: string, filas: T[], clave?: (f: T, i: number) => string | number): T[] {
  return filas.map(
    (f, i) => ({ ...f, uid: `seed-${prefijo}-${clave ? clave(f, i) : i}`, updatedAt: 1 }) as T,
  )
}

export const CLAVES_UNICAS: Record<string, string[]> = {
  portadasViaje: ['pais'],
  portadasLugar: ['lugarId'],
  temasArbol: ['temaId'],
  lecturasDiario: ['fecha'],
  idiomas: ['codigo'],
  temasIdioma: ['temaId'],
  repasosIdioma: ['idiomaId', 'fecha'],
  grafitis: ['superficie'],
  objetivosDiarios: ['plantillaId'],
  caminos: ['col', 'row'],
  cultivos: ['col', 'row'],
  cesta: ['especie'],
  marcadores: ['canchaId'],
  carreras: ['metaCol', 'metaRow', 'vehiculo'],
  nodosMapa: ['nodoId'],
  // La agenda no aparece en FK ni en ORDEN_TOPO a propósito: sus referencias
  // (`contactoId`, `proyectoId` y el `ambitoId` de las rutinas que proyecta) son
  // strings estables entre dispositivos, como `roomId` o `plantillaId`.
  eventosAgenda: ['evId'],
  contactosAgenda: ['contactoId'],
  proyectosAgenda: ['proyId'],
  medicamentos: ['medId'],
  mascotas: ['mascId'],
  cuidadosMascota: ['cuidadoId'],
  tramitesVehiculo: ['tramiteId'],
  talleresVehiculo: ['tallerId'],
}
