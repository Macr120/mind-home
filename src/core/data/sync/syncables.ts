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
 * pesado (pistasMusica — y con él sus carpetasPista, que sin las pistas del
 * dispositivo llegarían vacías) y el guardarropa a medida (prendasCustom,
 * atuendosGuardados — lo puesto viaja inline en disenoAvatar.ropaCustom).
 */
export const TABLAS_SYNC: string[] = [
  'transacciones',
  'sueno',
  'anecdotas',
  'metas',
  'patrimonio',
  'presupuestos',
  'perfilNutricion',
  'registrosComida',
  'planComidas',
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
  'temasPropios',
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
  'ajustesTemario',
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
  'cumplimientosDiarios',
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
  'medicamentos',
  'mascotas',
  'cuidadosMascota',
  'cuidados',
  'ajustesCiclo',
  'diasCiclo',
  'tramitesVehiculo',
  'talleresVehiculo',
  'carpetasFormula',
  'formulas',
  'hojasCalculo',
  'calculosComputo',
  'ajustesSemilla',
  'carpetasIdea',
  'partidasEjercicio',
  // Al final del array a propósito: `materialEntrada` apunta a entradasBiblio,
  // hojasCalculo, mapasIdeas e ideas, así que se aplica cuando todas ya están.
  'materialEntrada',
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
 * segundo dispositivo. Lo mismo con `PlanMeta.nodos[].metaRealId`, que además va
 * anidado — ese sí se defiende solo: `planMeta.espejoDePlan` comprueba que el id
 * caiga en la descendencia de la meta origen antes de creerle, y si no, vuelve a
 * emparejar por nombre. Arreglarlo de raíz pide soportar arrays en el motor.
 */
export const FK: Record<string, Record<string, string>> = {
  seriesFuerza: { sesionId: 'sesionesEjercicio' },
  seriesFlex: { sesionId: 'sesionesEjercicio' },
  splitsCardio: { sesionId: 'sesionesEjercicio' },
  registrosMantenimiento: { vehiculoId: 'vehiculos' },
  tramitesVehiculo: { vehiculoId: 'vehiculos' },
  talleresVehiculo: { vehiculoId: 'vehiculos' },
  lugaresViaje: { metaId: 'metas' },
  transacciones: { metaId: 'metas' }, // el gasto que nace de abonar a una meta
  patrimonio: { metaId: 'metas' }, // la deuda o la inversión que se abona desde Metas
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
  ajustesTemario: { idiomaId: 'idiomas' },
  materialesIdioma: { idiomaId: 'idiomas' },
  mensajesIdioma: { conversacionId: 'conversacionesIdioma' },
  ejecucionesRutina: { rutinaId: 'rutinas' },
  planesMeta: { metaId: 'rutinas' }, // las metas del árbol viven en `rutinas`
  // Self-FK del árbol de metas (`padreId`) y del bloque que nació de una meta
  // (`deMetaId`): las dos apuntan a `rutinas`.
  rutinas: { padreId: 'rutinas', deMetaId: 'rutinas' },
  animales: { corralId: 'corrales' },
  itemsCompra: { listaId: 'listasCompra' },
  listasCompra: { gastoId: 'transacciones' },
  planComidas: { recetaId: 'recetas', comidaId: 'registrosComida' },
  nodosMapa: { mapaId: 'mapasIdeas' },
  mensajesChat: { mapaId: 'mapasIdeas' },
  // La cancha es un objeto del mapa, así que `canchaId` es el id AUTOINCREMENTAL
  // de `objetosCuarto` (ver `minijuegos.tsx`), no una referencia estable. Además
  // es índice único y clave de merge: sin traducir, el marcador de una cancha
  // podía resolverse contra otra distinta al fusionar dos dispositivos.
  marcadores: { canchaId: 'objetosCuarto' },
  objetosCuarto: { libreriaId: 'objetosCuarto' }, // self-FK: instancia → plantilla de la biblioteca
  partidasEjercicio: { idiomaId: 'idiomas' },
  // Tres ids separados y no uno polimórfico: el motor traduce por CAMPO, así que
  // un `refId` que apuntara a tres tablas según `tipo` no se podría traducir.
  materialEntrada: {
    entradaId: 'entradasBiblio',
    hojaId: 'hojasCalculo',
    mapaId: 'mapasIdeas',
    ideaId: 'ideas',
  },
  // El tema propio recuerda qué imagen de cielo llevaba puesta.
  temasPropios: { fondoImagenActivo: 'fondosImagen' },
}

/**
 * Orden de aplicación del pull: los padres antes que sus hijos. Las tablas que
 * no aparecen aquí no tienen padres numéricos y pueden aplicarse primero.
 * (`rutinas` y `objetosCuarto` se auto-referencian: los huérfanos reintentan
 * vía `_pendientes`.)
 */
export const ORDEN_TOPO: string[] = [
  'metas',
  'patrimonio', // su `metaId` apunta a `metas`
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
  'partidasEjercicio',
  'temasIdioma',
  'ajustesTemario',
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
  // `recetas` y `registrosComida` no aparecen antes porque no tienen padres
  // numéricos: las tablas ausentes de esta lista se aplican primero.
  'planComidas',
  // `fondosImagen` tampoco aparece antes (no tiene padres numéricos), así que ya
  // está aplicada cuando llega el tema propio que la referencia.
  'temasPropios',
  // El último: apunta a entradasBiblio, hojasCalculo, mapasIdeas e ideas, y
  // `hojasCalculo`/`ideas` no aparecen antes porque no tienen padres numéricos
  // (las tablas ausentes de esta lista se aplican primero).
  'materialEntrada',
]

/** Tablas de UNA sola fila: si el merge deja más de una, gana la más nueva. */
export const SINGLETONS = new Set<string>([
  'perfilNutricion',
  'perfilEjercicio',
  'perfilSueno',
  'mapaConfig',
  'disenoAvatar',
  'estadoSisifo',
  'ajustesCiclo',
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

/**
 * Una fila de siembra que NADIE ha tocado todavía: es catálogo, no actividad.
 * En cuanto el usuario la edita, el middleware le pone `updatedAt: Date.now()`
 * y deja de serlo — editar una fórmula sembrada SÍ cuenta como actividad.
 *
 * Lo usa la gamificación para no regalar XP por lo que trae la app puesto.
 */
export function esSeedIntacta(fila: unknown): boolean {
  const f = fila as { uid?: string; updatedAt?: number }
  return typeof f.uid === 'string' && f.uid.startsWith('seed-') && f.updatedAt === 1
}

export const CLAVES_UNICAS: Record<string, string[]> = {
  portadasViaje: ['pais'],
  portadasLugar: ['lugarId'],
  temasArbol: ['temaId'],
  // El parche de un nodo de fábrica es único por nodo; el enlace de material y
  // la carpeta del diario llevan id propio estable entre dispositivos.
  ajustesSemilla: ['nodoId'],
  materialEntrada: ['materialId'],
  carpetasIdea: ['carpetaId'],
  // `partidasEjercicio` NO lleva clave única: varias partidas del mismo día,
  // idioma y modo son legítimas y no deben fusionarse en una.
  lecturasDiario: ['fecha'],
  idiomas: ['codigo'],
  temasIdioma: ['temaId'],
  // El parche de un tema de fábrica es único POR IDIOMA: el mismo 'a1-saludos'
  // se puede renombrar distinto en el inglés y en el japonés.
  ajustesTemario: ['idiomaId', 'temaId'],
  repasosIdioma: ['idiomaId', 'fecha'],
  grafitis: ['superficie'],
  // Por app Y objetivo: con solo `plantillaId`, dos objetivos distintos de la
  // misma app se tomarían por la misma fila y uno borraría al otro al fusionar.
  objetivosDiarios: ['plantillaId', 'clave'],
  // El sello de un día es único por app, objetivo y fecha: sin esto cada
  // dispositivo sellaría su copia del mismo día.
  cumplimientosDiarios: ['plantillaId', 'clave', 'fecha'],
  caminos: ['col', 'row'],
  cultivos: ['col', 'row'],
  cesta: ['especie'],
  marcadores: ['canchaId'],
  carreras: ['metaCol', 'metaRow', 'vehiculo'],
  nodosMapa: ['nodoId'],
  // La agenda no aparece en FK ni en ORDEN_TOPO a propósito: sus referencias
  // (`contactoId` y el `ambitoId` de las rutinas que proyecta) son strings
  // estables entre dispositivos, como `roomId` o `plantillaId`.
  eventosAgenda: ['evId'],
  contactosAgenda: ['contactoId'],
  medicamentos: ['medId'],
  mascotas: ['mascId'],
  cuidadosMascota: ['cuidadoId'],
  cuidados: ['cuidadoId'],
  // Un registro por día: la fecha ES la identidad entre dispositivos.
  diasCiclo: ['fecha'],
  tramitesVehiculo: ['tramiteId'],
  talleresVehiculo: ['tallerId'],
  // La sala de cómputo tampoco aparece en FK ni en ORDEN_TOPO: el `padreId` de
  // las carpetas y el `carpetaId` de las fórmulas son strings estables. Y sin
  // estas claves, dos dispositivos que copian la misma fórmula de fábrica
  // crearían dos filas en vez de converger en una.
  carpetasFormula: ['carpetaId'],
  formulas: ['formulaId'],
}
