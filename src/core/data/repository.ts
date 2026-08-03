import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, type EventoAgenda, type Medicamento, type PisoExteriorCelda, type MuroLibre } from './db'
import type { Table, UpdateSpec } from 'dexie'
import { marcarRegistro } from '../state/registroSesion'
import { useClaveEncendidos, visibles } from './ejemplos'

/**
 * Lista vacía ESTABLE para el `?? VACIO` de los `useAll()` mientras la consulta
 * carga (devuelve `undefined`).
 *
 * Un `?? []` escrito en el cuerpo del componente crea un array NUEVO en cada
 * render, así que cualquier `useMemo`/`useEffect` que lo tenga como dependencia
 * se reejecuta siempre — que es lo que denunciaban los 49 avisos de
 * `react-hooks/exhaustive-deps`. Con una referencia única el memo vuelve a
 * memoizar de verdad.
 */
export const VACIO: never[] = []

/**
 * Fábrica de repositorios reactivos sobre una tabla de Dexie.
 *
 * Cada cuarto usa un repositorio en vez de tocar la base directamente.
 * Esto es la "capa de datos abstracta": para migrar a la nube se reimplementa
 * aquí (mismas firmas) y las apps no se enteran.
 */
function createRepository<T extends { id?: number }>(
  table: Table<T, number>,
  orderBy = 'fecha',
  reverse = true,
) {
  return {
    /**
     * Hook reactivo: la UI se actualiza sola al cambiar los datos.
     *
     * Aquí se esconden las filas de los ejemplos de fábrica apagados: es el
     * único sitio por el que pasan todas las pantallas, así que basta con
     * filtrar una vez (ver `ejemplos.ts`).
     *
     * `limit` acota la consulta sobre el índice (para historiales que crecen
     * sin tope: la vista pide N y sube el límite con «Cargar más» en vez de
     * materializar la tabla entera en cada escritura). Cuenta filas de la BD:
     * con ejemplos apagados pueden verse unas menos — irrelevante para paginar.
     */
    useAll(opts?: { limit?: number }): T[] | undefined {
      const encendidos = useClaveEncendidos()
      const limite = opts?.limit
      const filas = useLiveQuery(async () => {
        try {
          let q = table.orderBy(orderBy)
          if (reverse) q = q.reverse()
          return await (limite ? q.limit(limite) : q).toArray()
        } catch {
          const all = await table.toArray()
          if (orderBy !== 'id') {
            all.sort((a, b) => {
              const va = (a as Record<string, unknown>)[orderBy]
              const vb = (b as Record<string, unknown>)[orderBy]
              if (typeof va === 'string' && typeof vb === 'string') {
                return reverse ? vb.localeCompare(va) : va.localeCompare(vb)
              }
              return reverse ? Number(vb) - Number(va) : Number(va) - Number(vb)
            })
          } else if (reverse) {
            all.reverse()
          }
          return limite ? all.slice(0, limite) : all
        }
      }, [limite])
      // eslint-disable-next-line react-hooks/exhaustive-deps -- `encendidos` es la clave serializada del store
      return useMemo(() => (filas ? visibles(filas) : filas), [filas, encendidos])
    },
    // Toda escritura sella `updatedAt` (época ms): base para resolver conflictos
    // cuando haya sincronización multi-dispositivo. Dexie guarda el campo extra
    // aunque el tipo T no lo declare (solo los índices van en el esquema).
    async add(item: Omit<T, 'id'>): Promise<number> {
      marcarRegistro()
      return table.add({ ...item, updatedAt: Date.now() } as unknown as T)
    },
    async bulkAdd(items: Omit<T, 'id'>[]): Promise<void> {
      marcarRegistro()
      const ahora = Date.now()
      await table.bulkAdd(items.map((i) => ({ ...i, updatedAt: ahora })) as unknown as T[])
    },
    async update(id: number, cambios: UpdateSpec<T>): Promise<number> {
      return table.update(id, { ...cambios, updatedAt: Date.now() } as UpdateSpec<T>)
    },
    async remove(id: number): Promise<void> {
      return table.delete(id)
    },
    async list(): Promise<T[]> {
      return table.toArray()
    },
  }
}

export const finanzasRepo = createRepository(db.transacciones)
export const suenoRepo = createRepository(db.sueno)
export const perfilSuenoRepo = createRepository(db.perfilSueno, 'id', false)
export const anecdotasRepo = createRepository(db.anecdotas)
export const metasRepo = createRepository(db.metas, 'id', false)
export const presupuestosRepo = createRepository(db.presupuestos, 'id', false)
export const watchlistRepo = createRepository(db.watchlist, 'id', false)
// RETIRADOS: movimientosFijos (v105, lo fijo pasó al `periodo` de cada movimiento)
// y posiciones (el tercer menú pasó a ser Mercados) ya no tienen repo; las tablas
// se conservan en db.ts para que los respaldos anteriores sigan restaurando.

export const comidasRepo = createRepository(db.registrosComida)
export const aguaRepo = createRepository(db.registrosAgua)
export const perfilNutricionRepo = createRepository(db.perfilNutricion, 'id', false)
export const recetasRepo = createRepository(db.recetas, 'creadaEn')
export const dietasGuardadasRepo = createRepository(db.dietasGuardadas, 'creadoEn', false)
export const itemsCompraRepo = createRepository(db.itemsCompra, 'creadoEn', false)
export const listasCompraRepo = createRepository(db.listasCompra, 'creadoEn', false)
export const pesoRepo = createRepository(db.registrosPeso)

export const sesionesEjercicioRepo = createRepository(db.sesionesEjercicio)
export const seriesFuerzaRepo = createRepository(db.seriesFuerza, 'orden', false)
export const perfilEjercicioRepo = createRepository(db.perfilEjercicio, 'id', false)
// RETIRADO: planEjercicio ya no tiene repo; la tabla se conserva en db.ts para respaldos viejos.
export const rutinasFuerzaRepo = createRepository(db.rutinasFuerza, 'creadoEn', false)
export const rutinasFlexRepo = createRepository(db.rutinasFlex, 'creadoEn', false)
export const seriesFlexRepo = createRepository(db.seriesFlex, 'orden', false)
/** Catálogo editable: grupos (categorías) con sus ejercicios embebidos. */
export const gruposFuerzaRepo = createRepository(db.gruposFuerza, 'orden', false)
export const gruposFlexRepo = createRepository(db.gruposFlex, 'orden', false)
export const gruposCardioRepo = createRepository(db.gruposCardio, 'orden', false)
export const rutinasCardioRepo = createRepository(db.rutinasCardio, 'creadoEn', false)
/** Tramos ("splits") de una sesión de resistencia; la sesión es su suma. */
export const splitsCardioRepo = createRepository(db.splitsCardio, 'orden', false)
/** Imágenes (miniaturas) subidas por ejercicio del catálogo, indexadas por nombre normalizado. */
export const imagenesEjercicioRepo = createRepository(db.imagenesEjercicio, 'id', false)

export const mediaArchivoRepo = createRepository(db.mediaArchivo, 'creadoEn')
export const edicionesDiarioRepo = createRepository(db.edicionesDiario, 'fecha', false)
export const lecturasDiarioRepo = createRepository(db.lecturasDiario, 'fecha', false)

/** Personalización · guardarropa a medida del personaje (prendas propias). */
export const prendasCustomRepo = createRepository(db.prendasCustom, 'creadoEn', false)
/** Personalización · atuendos guardados por el usuario (combinaciones de prendas). */
export const atuendosGuardadosRepo = createRepository(db.atuendosGuardados, 'creadoEn', false)

// Biblioteca · enciclopedia conversacional
export const conversacionesBiblioRepo = createRepository(db.conversacionesBiblio, 'actualizadoEn')
export const mensajesBiblioRepo = createRepository(db.mensajesBiblio, 'creado', false)
export const entradasBiblioRepo = createRepository(db.entradasBiblio, 'actualizadoEn')
export const sesionesEstudioRepo = createRepository(db.sesionesEstudio)
/** Nodos dinámicos del índice vivo; orden cronológico = hermanos estables en el árbol. */
export const temasArbolRepo = createRepository(db.temasArbol, 'creadoEn', false)

/** Mensajes de una charla de la biblioteca, del más antiguo al más nuevo. */
export function useMensajesConversacionBiblio(conversacionId: number | null) {
  return useLiveQuery(async () => {
    if (conversacionId == null) return []
    const rows = await db.mensajesBiblio.where('conversacionId').equals(conversacionId).toArray()
    return rows.sort((a, b) => a.creado.localeCompare(b.creado))
  }, [conversacionId])
}

/** Entrada wiki ligada a una charla (null si no tiene). */
export function useEntradaDeConversacion(conversacionId: number | null) {
  return useLiveQuery(async () => {
    if (conversacionId == null) return null
    return (await db.entradasBiblio.where('conversacionId').equals(conversacionId).first()) ?? null
  }, [conversacionId])
}

/** Borra una charla con sus mensajes; la entrada y los temas que desbloqueó SE CONSERVAN y se desligan. */
export async function eliminarConversacionBiblio(id: number) {
  await db.transaction('rw', db.conversacionesBiblio, db.mensajesBiblio, db.entradasBiblio, db.temasArbol, async () => {
    await db.mensajesBiblio.where('conversacionId').equals(id).delete()
    const ligadas = await db.entradasBiblio.where('conversacionId').equals(id).toArray()
    for (const e of ligadas) {
      if (e.id != null) await db.entradasBiblio.update(e.id, { conversacionId: undefined })
    }
    const nodos = (await db.temasArbol.toArray()).filter((n) => n.conversacionId === id)
    for (const n of nodos) {
      if (n.id != null) await db.temasArbol.update(n.id, { conversacionId: undefined })
    }
    await db.conversacionesBiblio.delete(id)
  })
}

// Idiomas · aprendizaje de lenguas
export const idiomasRepo = createRepository(db.idiomas, 'creadoEn', false)
export const tarjetasIdiomaRepo = createRepository(db.tarjetasIdioma, 'creadoEn')
export const conversacionesIdiomaRepo = createRepository(db.conversacionesIdioma, 'actualizadoEn')
export const mensajesIdiomaRepo = createRepository(db.mensajesIdioma, 'creado', false)
/** Nodos dinámicos del temario; orden cronológico = hermanos estables en el árbol. */
export const temasIdiomaRepo = createRepository(db.temasIdioma, 'creadoEn', false)
/** Apuntes y fotos que el usuario sube a un tema del temario. */
export const materialesIdiomaRepo = createRepository(db.materialesIdioma, 'creadoEn')
export const repasosIdiomaRepo = createRepository(db.repasosIdioma, 'fecha')

/** Mensajes de una charla de idiomas, del más antiguo al más nuevo. */
export function useMensajesConversacionIdioma(conversacionId: number | null) {
  return useLiveQuery(async () => {
    if (conversacionId == null) return []
    const rows = await db.mensajesIdioma.where('conversacionId').equals(conversacionId).toArray()
    return rows.sort((a, b) => a.creado.localeCompare(b.creado))
  }, [conversacionId])
}

/**
 * Suma repasos al contador del día (fila única por idioma+fecha). Transacción:
 * serializa lectura+escritura para que respuestas seguidas no dupliquen la fila.
 */
export async function registrarRepasoDia(idiomaId: number, fecha: string, repasos = 1, aciertos = repasos) {
  await db.transaction('rw', db.repasosIdioma, async () => {
    const fila = await db.repasosIdioma.where('[idiomaId+fecha]').equals([idiomaId, fecha]).first()
    if (fila?.id != null) {
      await db.repasosIdioma.update(fila.id, {
        repasos: fila.repasos + repasos,
        aciertos: fila.aciertos + aciertos,
      })
    } else {
      await db.repasosIdioma.add({ idiomaId, fecha, repasos, aciertos })
    }
  })
}

/** Borra una charla de idiomas con sus mensajes; los temas que desbloqueó y las tarjetas extraídas SE CONSERVAN (los temas se desligan). */
export async function eliminarConversacionIdioma(id: number) {
  await db.transaction('rw', db.conversacionesIdioma, db.mensajesIdioma, db.temasIdioma, async () => {
    await db.mensajesIdioma.where('conversacionId').equals(id).delete()
    const nodos = (await db.temasIdioma.toArray()).filter((n) => n.conversacionId === id)
    for (const n of nodos) {
      if (n.id != null) await db.temasIdioma.update(n.id, { conversacionId: undefined })
    }
    await db.conversacionesIdioma.delete(id)
  })
}

/** Borra un idioma con TODO lo suyo: tarjetas, charlas y mensajes, temas dinámicos, material y actividad. */
export async function eliminarIdiomaCascada(id: number) {
  await db.transaction(
    'rw',
    [
      db.idiomas,
      db.tarjetasIdioma,
      db.conversacionesIdioma,
      db.mensajesIdioma,
      db.temasIdioma,
      db.materialesIdioma,
      db.repasosIdioma,
    ],
    async () => {
      const charlas = await db.conversacionesIdioma.where('idiomaId').equals(id).toArray()
      for (const c of charlas) {
        if (c.id != null) await db.mensajesIdioma.where('conversacionId').equals(c.id).delete()
      }
      await db.conversacionesIdioma.where('idiomaId').equals(id).delete()
      await db.tarjetasIdioma.where('idiomaId').equals(id).delete()
      await db.temasIdioma.where('idiomaId').equals(id).delete()
      await db.materialesIdioma.where('idiomaId').equals(id).delete()
      await db.repasosIdioma.where('idiomaId').equals(id).delete()
      await db.idiomas.delete(id)
    },
  )
}

export const lugaresViajeRepo = createRepository(db.lugaresViaje, 'creadoEn')
export const diasItinerarioRepo = createRepository(db.diasItinerario, 'dia', false)
export const rutasViajeRepo = createRepository(db.rutasViaje, 'creadoEn')
export const bitacoraViajeRepo = createRepository(db.bitacoraViaje)
export const portadasViajeRepo = createRepository(db.portadasViaje, 'id', false)
export const portadasLugarRepo = createRepository(db.portadasLugar, 'id', false)
export const itinerariosGuardadosRepo = createRepository(db.itinerariosGuardados, 'creadoEn')

export const sesionesMindfulnessRepo = createRepository(db.sesionesMindfulness)
export const gratitudDiariaRepo = createRepository(db.gratitudDiaria)

export const vehiculosRepo = createRepository(db.vehiculos, 'creadoEn')
export const registrosMantenimientoRepo = createRepository(db.registrosMantenimiento)
/** Trámites (tenencia, verificación, seguro…) del más próximo a vencer al último. */
export const tramitesVehiculoRepo = createRepository(db.tramitesVehiculo, 'fecha', false)
export const talleresVehiculoRepo = createRepository(db.talleresVehiculo, 'nombre', false)

export const hobbiesRepo = createRepository(db.hobbies, 'creadoEn', false)
export const sesionesHobbyRepo = createRepository(db.sesionesHobby)
export const proyectosHobbyRepo = createRepository(db.proyectosHobby, 'creadoEn', false)

/** Datos de los bloques de las plantillas personalizadas (notas, listas, contadores, fotos…). */
export const itemsPlantillaRepo = createRepository(db.itemsPlantilla, 'creadoEn', false)

/** Items de una plantilla personalizada, del más antiguo al más nuevo. */
export function useItemsPlantilla(plantillaId: string) {
  return useLiveQuery(async () => {
    const rows = await db.itemsPlantilla.where('plantillaId').equals(plantillaId).toArray()
    return rows.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  }, [plantillaId])
}

/**
 * Suma n al contador de un bloque (fila única por bloque). Transacción:
 * serializa lectura+escritura para que dos clics rápidos no dupliquen la fila.
 */
export async function sumarContadorPlantilla(plantillaId: string, bloqueId: string, n: number) {
  await db.transaction('rw', db.itemsPlantilla, async () => {
    const fila = await db.itemsPlantilla
      .where('[plantillaId+bloqueId]')
      .equals([plantillaId, bloqueId])
      .first()
    if (fila?.id != null) await db.itemsPlantilla.update(fila.id, { valor: (fila.valor ?? 0) + n })
    else await db.itemsPlantilla.add({ plantillaId, bloqueId, valor: n, creadoEn: new Date().toISOString() })
  })
}

/**
 * Marca/desmarca el día de un bloque hábito (una fila por día). El día local se
 * guarda en `texto` para deduplicar sin depender del huso de `creadoEn`.
 */
export async function alternarHabitoDia(plantillaId: string, bloqueId: string, diaISO: string) {
  await db.transaction('rw', db.itemsPlantilla, async () => {
    const fila = await db.itemsPlantilla
      .where('[plantillaId+bloqueId]')
      .equals([plantillaId, bloqueId])
      .filter((i) => i.texto === diaISO)
      .first()
    if (fila?.id != null) await db.itemsPlantilla.delete(fila.id)
    else await db.itemsPlantilla.add({ plantillaId, bloqueId, texto: diaISO, creadoEn: new Date().toISOString() })
  })
}

/** Bitácora del arquitecto (chat box orquestador): más reciente primero. */
export const bitacoraRepo = createRepository(db.bitacora, 'creado')

/** Memorias del arquitecto: hechos sobre el usuario, más reciente primero. */
export const memoriasRepo = createRepository(db.memorias, 'creado')

/** Conversaciones con los asistentes (interfaz tipo chat). */
export const mensajesChatRepo = createRepository(db.mensajesChat, 'creado')

/** Mensajes de la conversación con un asistente, del más antiguo al más nuevo. */
export function useMensajesAsistente(asistenteId: string | null) {
  return useLiveQuery(async () => {
    if (!asistenteId) return []
    const rows = await db.mensajesChat.where('asistenteId').equals(asistenteId).toArray()
    return rows.sort((a, b) => a.creado.localeCompare(b.creado))
  }, [asistenteId])
}

/** Borra todo el hilo de conversación con un asistente. */
export async function limpiarConversacion(asistenteId: string) {
  await db.mensajesChat.where('asistenteId').equals(asistenteId).delete()
}

/**
 * Últimos `n` mensajes del hilo de un asistente, del más antiguo al más nuevo,
 * como contexto para la IA (cada texto recortado para no inflar la llamada).
 */
export async function ultimosMensajesAsistente(
  asistenteId: string,
  n = 12,
): Promise<{ rol: 'usuario' | 'asistente'; texto: string }[]> {
  const rows = await db.mensajesChat.where('asistenteId').equals(asistenteId).toArray()
  rows.sort((a, b) => a.creado.localeCompare(b.creado))
  return rows
    .slice(-n)
    .map((m) => ({ rol: m.rol, texto: m.texto.length > 600 ? `${m.texto.slice(0, 600)}…` : m.texto }))
}

/** Último mensaje de cada conversación (para la lista de chats). */
export function useUltimosMensajes() {
  return useLiveQuery(async () => {
    const rows = await db.mensajesChat.orderBy('creado').reverse().toArray()
    const ultimo: Record<string, (typeof rows)[number]> = {}
    for (const m of rows) if (!ultimo[m.asistenteId]) ultimo[m.asistenteId] = m
    return ultimo
  }, [])
}

export function useMantenimientosVehiculo(vehiculoId: number | null) {
  return useLiveQuery(async () => {
    if (!vehiculoId) return []
    const rows = await db.registrosMantenimiento
      .where('vehiculoId')
      .equals(vehiculoId)
      .toArray()
    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [vehiculoId])
}

/** Rutinas orquestadas (pasos multi-cuarto) y sus ejecuciones por día. */
export const rutinasRepo = createRepository(db.rutinas, 'creadoEn', false)
export const ejecucionesRutinaRepo = createRepository(db.ejecucionesRutina, 'fecha')

/** Palomitas manuales de la meta diaria. */
export const metasDiariasManualRepo = createRepository(db.metasDiariasManual, 'fecha')

/**
 * Fija a mano la meta diaria de una app en un día (una fila por app y día).
 * Transacción: serializa lectura+escritura para que dos clics rápidos no dupliquen.
 */
export async function fijarMetaDiariaManual(plantillaId: string, fecha: string, hecha: boolean) {
  await db.transaction('rw', db.metasDiariasManual, async () => {
    const fila = await db.metasDiariasManual
      .where('[plantillaId+fecha]')
      .equals([plantillaId, fecha])
      .first()
    if (fila?.id != null) await db.metasDiariasManual.update(fila.id, { hecha })
    else await db.metasDiariasManual.add({ plantillaId, fecha, hecha })
  })
}

/** Quita la palomita manual: ese día vuelve a mandar la actividad real. */
export async function borrarMetaDiariaManual(plantillaId: string, fecha: string) {
  await db.metasDiariasManual.where('[plantillaId+fecha]').equals([plantillaId, fecha]).delete()
}

/**
 * Objetivo diario configurado para una app. Vive aquí y no en core/metaDiaria.ts
 * porque las apps lo llaman desde su `metaDiaria`, y ese módulo importa el
 * registro de plantillas: colgarlo de ahí cerraría un ciclo de imports.
 */
export async function objetivoDiarioDe(plantillaId: string, porDefecto: number): Promise<number> {
  const fila = (await db.objetivosDiarios.toArray()).find((o) => o.plantillaId === plantillaId)
  return fila?.valor ?? porDefecto
}

/** Objetivo diario de una app (fila única por app). */
export async function fijarObjetivoDiario(plantillaId: string, valor: number) {
  await db.transaction('rw', db.objetivosDiarios, async () => {
    const fila = await db.objetivosDiarios.where('plantillaId').equals(plantillaId).first()
    if (fila?.id != null) await db.objetivosDiarios.update(fila.id, { valor })
    else await db.objetivosDiarios.add({ plantillaId, valor })
  })
}

/** Cronogramas alternativos de una meta; el orden de alta es el de "Plan A, B…". */
export const planesMetaRepo = createRepository(db.planesMeta, 'creadoEn', false)

/** Los planes cuelgan de su meta: sin esto quedarían huérfanos en el selector. */
export async function borrarPlanesDeMetas(ids: number[]): Promise<void> {
  await db.planesMeta.where('metaId').anyOf(ids).delete()
}

/** Zonas libres del editor de planos (croquis). */
export const zonasRepo = createRepository(db.zonas, 'id', false)

/** Pisos exteriores por celda del plano. */
export const pisosExteriorRepo = createRepository(db.pisosExterior, 'id', false)

/** Tramos de camino por celda del mapa (pistas, rieles, montaña rusa). */
export const caminosRepo = createRepository(db.caminos, 'id', false)
/** Pistas de carreras de trazo libre (curvas por puntos de control). */
export const pistasLibresRepo = createRepository(db.pistasLibres, 'id', false)
/** Récords del modo carrera (una fila por meta × vehículo). */
export const carrerasRepo = createRepository(db.carreras, 'id', false)

/** Pistas de música subidas por el usuario (Wrapped y música ambiental). */
export const pistasMusicaRepo = createRepository(db.pistasMusica, 'creadoEn')

/** Parcelas y cultivos del huerto por celda del mapa. */
export const cultivosRepo = createRepository(db.cultivos, 'id', false)

/** Animales de la granja (varios por corral). */
export const animalesRepo = createRepository(db.animales, 'id', false)

/** Corrales rectangulares de la granja. */
export const corralesRepo = createRepository(db.corrales, 'id', false)

/** Cesta de cosechas por especie (alimento de la granja). */
export const cestaRepo = createRepository(db.cesta, 'id', false)

/** Marcadores persistentes de los minijuegos de cancha. */
export const marcadoresRepo = createRepository(db.marcadores, 'id', false)

export const murosLibresRepo = createRepository(db.murosLibres, 'id', false)

/** Estilo por defecto de un muro libre nuevo. */
const MURO_LIBRE_DEFECTO = { tipo: 'solido', color: '#8c8073', alto: 1 }

/**
 * Toggle de clic de una arista recta: si no existe la coloca, si ya existe la borra.
 * Devuelve el id colocado, o null si se borró (para deseleccionar).
 * Lo usa el croquis 2D (cada arista es un elemento clicable individual) y el mapa 3D
 * (la arista más cercana al punto, según la orientación H/V elegida).
 */
export async function crearMuroAristaLibre(
  nivel: number,
  orient: 'h' | 'v',
  col: number,
  row: number,
): Promise<number | null> {
  // Transacción: serializa lectura+escritura para que dos clics rápidos no dupliquen.
  return db.transaction('rw', db.murosLibres, async () => {
    const ex = (await db.murosLibres.where('nivel').equals(nivel).toArray()).find(
      (m) => m.clase === 'arista' && m.orient === orient && m.col === col && m.row === row,
    )
    if (ex?.id != null) {
      await db.murosLibres.delete(ex.id)
      return null
    }
    return db.murosLibres.add({ nivel, clase: 'arista', orient, col, row, ...MURO_LIBRE_DEFECTO })
  })
}

/** Rotaciones distintas del muro CIRCULAR, en el orden del ciclo de clic (las 4 esquinas). */
const CICLO_ROT_CIRCULAR: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270]

/**
 * Rotación inicial válida para la forma: el triángulo usa directamente la diagonal elegida
 * por el botón (0° o 90°, sin ciclo previo); el círculo respeta la preferida si es una de
 * sus 4 esquinas, si no cae en la primera.
 */
export function primeraRotMuroForma(
  forma: 'triangular' | 'circular',
  preferida: 0 | 90 | 180 | 270,
): 0 | 90 | 180 | 270 {
  if (forma === 'triangular') return preferida
  return CICLO_ROT_CIRCULAR.includes(preferida) ? preferida : CICLO_ROT_CIRCULAR[0]
}

/**
 * Siguiente rotación del ciclo de clic de un muro de forma, o null si toca borrar.
 * El triángulo es un simple toggle (colocar/borrar): un muro ya existente siempre borra
 * en el próximo clic, sin pasar por la otra diagonal. El círculo sí cicla sus 4 esquinas.
 * El fantasma del mapa 3D/croquis usa esto para predecir el clic.
 */
export function siguienteRotMuroForma(
  forma: 'triangular' | 'circular',
  actual: number,
): (0 | 90 | 180 | 270) | null {
  if (forma === 'triangular') return null
  const i = CICLO_ROT_CIRCULAR.indexOf(actual as 0 | 90 | 180 | 270)
  return i >= 0 && i + 1 < CICLO_ROT_CIRCULAR.length ? CICLO_ROT_CIRCULAR[i + 1] : null
}

/**
 * Clic de una forma (triángulo/círculo) en el mismo lugar del mapa 3D o croquis:
 * - Celda libre → coloca la forma con la variante del botón (diagonal o esquina).
 * - Misma forma → el triángulo es un toggle simple y borra directamente; el círculo avanza
 *   a la siguiente esquina del ciclo y borra tras la última.
 * - Otra forma sobre la celda → la convierte a la del pincel (variante del botón).
 * Devuelve { id, rot } de lo colocado (para sincronizar el botón), o null si se borró.
 */
export async function ciclarMuroFormaLibre(
  nivel: number,
  col: number,
  row: number,
  forma: 'triangular' | 'circular',
  rotInicial: 0 | 90 | 180 | 270 = 0,
): Promise<{ id: number; rot: 0 | 90 | 180 | 270 } | null> {
  // Transacción: serializa lectura+escritura para que dos clics rápidos no dupliquen.
  return db.transaction('rw', db.murosLibres, async () => {
    const ex = (await db.murosLibres.where('nivel').equals(nivel).toArray()).find(
      (m) => m.clase === 'forma' && m.col === col && m.row === row,
    )
    if (!ex || ex.id == null) {
      const rot = primeraRotMuroForma(forma, rotInicial)
      const id = await db.murosLibres.add({ nivel, clase: 'forma', col, row, forma, rotacion: rot, ...MURO_LIBRE_DEFECTO })
      return { id, rot }
    }
    const formaEx = (ex.forma ?? 'triangular') as 'triangular' | 'circular'
    if (formaEx !== forma) {
      const rot = primeraRotMuroForma(forma, rotInicial)
      await db.murosLibres.update(ex.id, { forma, rotacion: rot })
      return { id: ex.id, rot }
    }
    const sig = siguienteRotMuroForma(formaEx, ex.rotacion ?? 0)
    if (sig == null) {
      await db.murosLibres.delete(ex.id) // fin del ciclo → se borra
      return null
    }
    await db.murosLibres.update(ex.id, { rotacion: sig })
    return { id: ex.id, rot: sig }
  })
}

/** Cambia textura, color, altura, silueta, rotación o sus parámetros de un muro libre. */
export async function setEstiloMuroLibre(
  id: number,
  patch: Partial<
    Pick<
      MuroLibre,
      | 'tipo' | 'color' | 'alto' | 'silueta' | 'formaAlto' | 'formaAncho' | 'formaPosX' | 'formaDividir' | 'formaColor'
      | 'ventana' | 'ventAncho' | 'ventAlto' | 'ventColor' | 'puerta' | 'puertaAncho' | 'puertaColor' | 'puertaAlto'
      | 'puertaTipo' | 'puertaForma' | 'puertaFormaAlto' | 'puertaFormaAncho' | 'puertaFormaPosX'
      | 'ventForma' | 'ventPosX' | 'ventPosY' | 'ventRot' | 'ventMosaico' | 'ventMulticolor' | 'rotacion'
    >
  >,
): Promise<void> {
  await db.murosLibres.update(id, patch)
}

export async function eliminarMuroLibre(id: number): Promise<void> {
  await db.murosLibres.delete(id)
}

/** Aplica material de piso a varias celdas exteriores del mismo nivel. */
export async function aplicarPisoExteriorCeldas(
  nivel: number,
  celdas: { col: number; row: number }[],
  pisoTipo: string | null,
  pisoColor: string,
  opts?: { limpiarImagen?: boolean },
): Promise<void> {
  await limpiarCuadrantesDeCeldas(nivel, celdas)
  for (const c of celdas) {
    const existente = await db.pisosExterior
      .where('[nivel+col+row]')
      .equals([nivel, c.col, c.row])
      .first()
    const patch: Partial<PisoExteriorCelda> = { pisoTipo, pisoColor }
    if (opts?.limpiarImagen) {
      patch.pisoImagen = undefined
      patch.pisoImagenActiva = false
    }
    if (existente?.id != null) {
      await db.pisosExterior.update(existente.id, patch)
    } else {
      await db.pisosExterior.add({ nivel, col: c.col, row: c.row, ...patch })
    }
  }
}

/** Sube imagen de piso a celdas exteriores seleccionadas. */
export async function subirPisoExteriorImagen(
  nivel: number,
  celdas: { col: number; row: number }[],
  blob: Blob,
  ajuste = 'x1',
): Promise<void> {
  await limpiarCuadrantesDeCeldas(nivel, celdas)
  for (const c of celdas) {
    const existente = await db.pisosExterior
      .where('[nivel+col+row]')
      .equals([nivel, c.col, c.row])
      .first()
    const patch = {
      pisoImagen: blob,
      pisoImagenActiva: true,
      pisoImagenAjuste: ajuste,
      pisoTipo: null as string | null,
    }
    if (existente?.id != null) {
      await db.pisosExterior.update(existente.id, patch)
    } else {
      await db.pisosExterior.add({
        nivel,
        col: c.col,
        row: c.row,
        pisoColor: '#5a6e58',
        ...patch,
      })
    }
  }
}

export async function activarPisoExteriorImagen(
  nivel: number,
  celdas: { col: number; row: number }[],
  activa: boolean,
): Promise<void> {
  for (const c of celdas) {
    const existente = await db.pisosExterior
      .where('[nivel+col+row]')
      .equals([nivel, c.col, c.row])
      .first()
    if (existente?.id != null) {
      await db.pisosExterior.update(existente.id, {
        pisoImagenActiva: activa,
        ...(activa ? { pisoTipo: null } : {}),
      })
    }
  }
}

export async function ajustarPisoExteriorImagen(
  nivel: number,
  celdas: { col: number; row: number }[],
  ajuste: string,
): Promise<void> {
  for (const c of celdas) {
    const existente = await db.pisosExterior
      .where('[nivel+col+row]')
      .equals([nivel, c.col, c.row])
      .first()
    if (existente?.id != null) {
      await db.pisosExterior.update(existente.id, { pisoImagenAjuste: ajuste })
    }
  }
}

export async function eliminarPisoExteriorImagen(
  nivel: number,
  celdas: { col: number; row: number }[],
): Promise<void> {
  for (const c of celdas) {
    const existente = await db.pisosExterior
      .where('[nivel+col+row]')
      .equals([nivel, c.col, c.row])
      .first()
    if (existente?.id != null) {
      await db.pisosExterior.update(existente.id, {
        pisoImagen: undefined,
        pisoImagenActiva: false,
        pisoImagenAjuste: undefined,
      })
    }
  }
}

/** Offsets de los 4 cuadrantes (¼) de una celda. */
const CUADRANTE_OFFS = [
  [-0.25, -0.25],
  [0.25, -0.25],
  [-0.25, 0.25],
  [0.25, 0.25],
]

/** Borra los 4 cuadrantes finos de cada celda ENTERA dada: pintar el cuadro sobreescribe lo fino. */
async function limpiarCuadrantesDeCeldas(
  nivel: number,
  celdas: { col: number; row: number }[],
): Promise<void> {
  for (const c of celdas) {
    if (!Number.isInteger(c.col) || !Number.isInteger(c.row)) continue
    for (const [dx, dy] of CUADRANTE_OFFS) {
      const ex = await db.pisosExterior
        .where('[nivel+col+row]')
        .equals([nivel, c.col + dx, c.row + dy])
        .first()
      if (ex?.id != null) await db.pisosExterior.delete(ex.id)
    }
  }
}

/**
 * Traslada los pisos por sub-celda (¼) pintados dentro de `celdas` por (dc,dr), para que se
 * muevan junto al cuarto/zona. Solo afecta a los cuadrantes de esas celdas (no al jardín).
 */
export async function trasladarPisosInteriores(
  nivel: number,
  celdas: { col: number; row: number }[],
  dc: number,
  dr: number,
): Promise<void> {
  if (dc === 0 && dr === 0) return
  const dentro = new Set<string>()
  for (const c of celdas) for (const [dx, dy] of CUADRANTE_OFFS) dentro.add(`${c.col + dx},${c.row + dy}`)
  const todos = await db.pisosExterior.where('nivel').equals(nivel).toArray()
  for (const p of todos) {
    if (p.id == null) continue
    if (Number.isInteger(p.col) && Number.isInteger(p.row)) continue // celda entera = jardín, no se mueve
    if (!dentro.has(`${p.col},${p.row}`)) continue
    await db.pisosExterior.update(p.id, { col: p.col + dc, row: p.row + dr })
  }
}

/**
 * Desplaza TODO el piso exterior (jardín + sub-celdas) por (dc,dr). Se usa al crecer o
 * encoger la rejilla por el borde O/N, que recentra el contenido +1/−1 celda: el suelo
 * debe seguirlo para no desalinearse de los cuartos. Los registros que se salgan de la
 * rejilla (col/row negativos) se eliminan.
 */
export async function desplazarPisoExteriorTodo(dc: number, dr: number): Promise<void> {
  if (dc === 0 && dr === 0) return
  const todos = await db.pisosExterior.toArray()
  for (const p of todos) {
    if (p.id == null) continue
    const col = p.col + dc
    const row = p.row + dr
    if (col < -0.5 || row < -0.5) await db.pisosExterior.delete(p.id)
    else await db.pisosExterior.update(p.id, { col, row })
  }
}

/**
 * Al crecer la rejilla: rellena la fila/columna de celdas nuevas del borde copiando el
 * piso exterior de la celda contigua ya existente, para que el jardín continúe sin cortes.
 * Si la celda contigua no tiene registro (jardín por defecto), la nueva también queda por
 * defecto. Debe llamarse DESPUÉS de `desplazarPisoExteriorTodo` cuando la dirección es O/N.
 */
export async function rellenarBordePisoExterior(
  dir: 'N' | 'S' | 'E' | 'O',
  newCols: number,
  newRows: number,
): Promise<void> {
  const pares: { destino: { col: number; row: number }; origen: { col: number; row: number } }[] = []
  if (dir === 'E') {
    for (let row = 0; row < newRows; row++)
      pares.push({ destino: { col: newCols - 1, row }, origen: { col: newCols - 2, row } })
  } else if (dir === 'O') {
    for (let row = 0; row < newRows; row++)
      pares.push({ destino: { col: 0, row }, origen: { col: 1, row } })
  } else if (dir === 'S') {
    for (let col = 0; col < newCols; col++)
      pares.push({ destino: { col, row: newRows - 1 }, origen: { col, row: newRows - 2 } })
  } else {
    for (let col = 0; col < newCols; col++)
      pares.push({ destino: { col, row: 0 }, origen: { col, row: 1 } })
  }

  const niveles = [...new Set((await db.pisosExterior.toArray()).map((p) => p.nivel))]
  if (!niveles.includes(0)) niveles.push(0)

  for (const nivel of niveles) {
    for (const { destino, origen } of pares) {
      const src = await db.pisosExterior
        .where('[nivel+col+row]')
        .equals([nivel, origen.col, origen.row])
        .first()
      if (!src) continue // celda contigua = jardín por defecto: la nueva también.
      const datos = {
        pisoTipo: src.pisoTipo,
        pisoColor: src.pisoColor,
        pisoImagen: src.pisoImagen,
        pisoImagenActiva: src.pisoImagenActiva,
        pisoImagenAjuste: src.pisoImagenAjuste,
      }
      const dst = await db.pisosExterior
        .where('[nivel+col+row]')
        .equals([nivel, destino.col, destino.row])
        .first()
      if (dst?.id != null) await db.pisosExterior.update(dst.id, datos)
      else await db.pisosExterior.add({ nivel, col: destino.col, row: destino.row, ...datos })
    }
  }
}

/** Ejecuciones de rutinas de una fecha (reactivo, para el panel del día). */
export function useEjecucionesDeFecha(fecha: string) {
  return useLiveQuery(
    () => db.ejecucionesRutina.where('fecha').equals(fecha).toArray(),
    [fecha],
  )
}

// Ideas · diario, mapas conceptuales y diagramas
export const ideasRepo = createRepository(db.ideas, 'creadoEn')
export const mapasIdeasRepo = createRepository(db.mapasIdeas, 'creadoEn')
export const nodosMapaRepo = createRepository(db.nodosMapa, 'creadoEn', false)

/** Nodos de un mapa, del más antiguo al más nuevo (hermanos estables). */
export function useNodosMapa(mapaId: number | null) {
  return useLiveQuery(
    async () =>
      mapaId == null ? [] : db.nodosMapa.where('mapaId').equals(mapaId).sortBy('creadoEn'),
    [mapaId],
  )
}

/** Borra un mapa con todos sus nodos (fila a fila: cada tombstone viaja). */
export async function borrarMapaIdeas(mapaId: number): Promise<void> {
  await db.transaction('rw', db.mapasIdeas, db.nodosMapa, async () => {
    const ids = await db.nodosMapa.where('mapaId').equals(mapaId).primaryKeys()
    await db.nodosMapa.bulkDelete(ids)
    await db.mapasIdeas.delete(mapaId)
  })
}

/** Borra un lote de nodos (el subárbol lo calcula el caller). */
export async function borrarNodosMapa(ids: number[]): Promise<void> {
  await db.nodosMapa.bulkDelete(ids)
}

// Agenda · trabajo, salud y personas
// OJO con el `orderBy`: nunca 'fecha'. `useAll` hace `table.orderBy(campo)` e
// IndexedDB omite en silencio las filas con ese campo `undefined`; los pendientes
// sin fecha —media sección Trabajo— desaparecerían de la lista sin dar error.
export const eventosAgendaRepo = createRepository(db.eventosAgenda, 'creadoEn')
export const contactosAgendaRepo = createRepository(db.contactosAgenda, 'nombre', false)
export const proyectosAgendaRepo = createRepository(db.proyectosAgenda, 'creadoEn', false)
export const medicamentosRepo = createRepository(db.medicamentos, 'creadoEn', false)
export const mascotasRepo = createRepository(db.mascotas, 'nombre', false)
export const cuidadosMascotaRepo = createRepository(db.cuidadosMascota, 'creadoEn', false)

/** Eventos ligados a un contacto (su historial dentro de la ficha). */
export function useEventosDeContacto(contactoId: string | null) {
  return useLiveQuery(
    async () =>
      contactoId == null ? [] : db.eventosAgenda.where('contactoId').equals(contactoId).toArray(),
    [contactoId],
  )
}

/**
 * Borra un contacto y DESLIGA sus eventos en vez de arrastrarlos: perder la cita
 * del dentista por borrar la ficha del dentista sería destructivo.
 */
export async function borrarContactoAgenda(contactoId: string): Promise<void> {
  await db.transaction('rw', db.contactosAgenda, db.eventosAgenda, async () => {
    const ligados = await db.eventosAgenda.where('contactoId').equals(contactoId).toArray()
    for (const e of ligados) {
      if (e.id != null)
        await db.eventosAgenda.update(e.id, { contactoId: undefined, updatedAt: Date.now() } as UpdateSpec<EventoAgenda>)
    }
    const fila = await db.contactosAgenda.where('contactoId').equals(contactoId).first()
    if (fila?.id != null) await db.contactosAgenda.delete(fila.id)
  })
}

/**
 * Borra la ficha de una mascota y DESLIGA sus citas y tratamientos en vez de
 * arrastrarlos: el historial médico no tiene por qué irse con la ficha. Sus
 * cuidados sí se van con ella, pero los borra `rooms/agenda/crear.ts` (uno a uno
 * y con las rutinas que hubieran puesto en el calendario).
 */
export async function borrarMascotaAgenda(mascId: string): Promise<void> {
  await db.transaction('rw', db.mascotas, db.eventosAgenda, db.medicamentos, async () => {
    for (const e of await db.eventosAgenda.where('area').equals('salud').toArray()) {
      if (e.mascotaId === mascId && e.id != null)
        await db.eventosAgenda.update(e.id, { mascotaId: undefined, updatedAt: Date.now() } as UpdateSpec<EventoAgenda>)
    }
    for (const m of await db.medicamentos.toArray()) {
      if (m.mascotaId === mascId && m.id != null)
        await db.medicamentos.update(m.id, { mascotaId: undefined, updatedAt: Date.now() } as UpdateSpec<Medicamento>)
    }
    const fila = await db.mascotas.where('mascId').equals(mascId).first()
    if (fila?.id != null) await db.mascotas.delete(fila.id)
  })
}

/** Borra un proyecto; sus pendientes sobreviven sueltos (no se pierde trabajo). */
export async function borrarProyectoAgenda(proyId: string): Promise<void> {
  await db.transaction('rw', db.proyectosAgenda, db.eventosAgenda, async () => {
    const ligados = await db.eventosAgenda.where('proyectoId').equals(proyId).toArray()
    for (const e of ligados) {
      if (e.id != null)
        await db.eventosAgenda.update(e.id, { proyectoId: undefined, updatedAt: Date.now() } as UpdateSpec<EventoAgenda>)
    }
    const fila = await db.proyectosAgenda.where('proyId').equals(proyId).first()
    if (fila?.id != null) await db.proyectosAgenda.delete(fila.id)
  })
}
