import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PisoExteriorCelda } from './db'
import type { Table, UpdateSpec } from 'dexie'

/**
 * Fábrica de repositorios reactivos sobre una tabla de Dexie.
 *
 * Cada cuarto usa un repositorio en vez de tocar la base directamente.
 * Esto es la "capa de datos abstracta": para migrar a la nube se reimplementa
 * aquí (mismas firmas) y las apps no se enteran.
 */
export function createRepository<T extends { id?: number }>(
  table: Table<T, number>,
  orderBy = 'fecha',
  reverse = true,
) {
  return {
    /** Hook reactivo: la UI se actualiza sola al cambiar los datos. */
    useAll(): T[] | undefined {
      return useLiveQuery(async () => {
        try {
          const q = table.orderBy(orderBy)
          return await (reverse ? q.reverse() : q).toArray()
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
          return all
        }
      }, [])
    },
    async add(item: Omit<T, 'id'>): Promise<number> {
      return table.add(item as T)
    },
    async update(id: number, cambios: UpdateSpec<T>): Promise<number> {
      return table.update(id, cambios)
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
export const anecdotasRepo = createRepository(db.anecdotas)
export const metasRepo = createRepository(db.metas, 'id', false)
export const presupuestosRepo = createRepository(db.presupuestos, 'id', false)

export const comidasRepo = createRepository(db.registrosComida)
export const planComidasRepo = createRepository(db.planComidas)
export const aguaRepo = createRepository(db.registrosAgua)
export const favoritosRepo = createRepository(db.alimentosFavoritos, 'nombre', false)
export const perfilNutricionRepo = createRepository(db.perfilNutricion, 'id', false)

export const sesionesEjercicioRepo = createRepository(db.sesionesEjercicio)
export const seriesFuerzaRepo = createRepository(db.seriesFuerza, 'orden', false)
export const perfilEjercicioRepo = createRepository(db.perfilEjercicio, 'id', false)

export const mediaArchivoRepo = createRepository(db.mediaArchivo, 'creadoEn')
export const juegosMesaRepo = createRepository(db.juegosMesa, 'creadoEn')
export const progresoTemaRepo = createRepository(db.progresoTema, 'actualizadoEn')
export const noticiasRepo = createRepository(db.noticias)

export const viajesRepo = createRepository(db.viajes, 'fechaInicio')
export const actividadesViajeRepo = createRepository(db.actividadesViaje, 'orden', false)
export const gastosViajeRepo = createRepository(db.gastosViaje)
export const checklistViajeRepo = createRepository(db.checklistViaje, 'id', false)

export function useActividadesViaje(viajeId: number | null) {
  return useLiveQuery(
    () =>
      viajeId
        ? db.actividadesViaje.where('viajeId').equals(viajeId).sortBy('orden')
        : [],
    [viajeId],
  )
}

export function useGastosViaje(viajeId: number | null) {
  return useLiveQuery(async () => {
    if (!viajeId) return []
    const rows = await db.gastosViaje.where('viajeId').equals(viajeId).toArray()
    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [viajeId])
}

export function useChecklistViaje(viajeId: number | null) {
  return useLiveQuery(
    () =>
      viajeId ? db.checklistViaje.where('viajeId').equals(viajeId).toArray() : [],
    [viajeId],
  )
}

export const sesionesMindfulnessRepo = createRepository(db.sesionesMindfulness)
export const registroAnimoRepo = createRepository(db.registroAnimo)
export const gratitudDiariaRepo = createRepository(db.gratitudDiaria)
export const perfilMindfulnessRepo = createRepository(db.perfilMindfulness, 'id', false)

export const vehiculosRepo = createRepository(db.vehiculos, 'creadoEn')
export const perfilUsuarioRepo = createRepository(db.perfilUsuario, 'id', false)
export const disenoRoomsRepo = createRepository(db.disenoRooms, 'roomId', false)
export const disenoAvatarRepo = createRepository(db.disenoAvatar, 'id', false)
export const registrosMantenimientoRepo = createRepository(db.registrosMantenimiento)

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

/** Series de una sesión de fuerza (reactivo). */
export function useSeriesSesion(sesionId: number | null) {
  return useLiveQuery(
    () =>
      sesionId
        ? db.seriesFuerza.where('sesionId').equals(sesionId).sortBy('orden')
        : [],
    [sesionId],
  )
}

/** Rutinas orquestadas (pasos multi-cuarto) y sus ejecuciones por día. */
export const rutinasRepo = createRepository(db.rutinas, 'creadoEn', false)
export const ejecucionesRutinaRepo = createRepository(db.ejecucionesRutina, 'fecha')

/** Zonas libres del editor de planos (croquis). */
export const zonasRepo = createRepository(db.zonas, 'id', false)

/** Pisos exteriores por celda del plano. */
export const pisosExteriorRepo = createRepository(db.pisosExterior, 'id', false)

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

/** Fija/rota la forma de loseta en celdas (o sub-celdas) de piso. Repetir la misma forma rota +90°. */
export async function setFormaPisoExteriorCeldas(
  nivel: number,
  celdas: { col: number; row: number }[],
  forma: 'cuadrado' | 'triangular' | 'circular',
): Promise<void> {
  await limpiarCuadrantesDeCeldas(nivel, celdas)
  for (const c of celdas) {
    const existente = await db.pisosExterior
      .where('[nivel+col+row]')
      .equals([nivel, c.col, c.row])
      .first()
    const prev = existente?.forma
    const rot = prev?.forma === forma ? ((prev.rotacion ?? 0) + 90) % 360 : 0
    const nueva = { forma, rotacion: rot as 0 | 90 | 180 | 270 }
    if (existente?.id != null) {
      await db.pisosExterior.update(existente.id, { forma: nueva })
    } else {
      await db.pisosExterior.add({ nivel, col: c.col, row: c.row, pisoColor: '#5a6e58', forma: nueva })
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

/** Ejecuciones de rutinas de una fecha (reactivo, para el panel del día). */
export function useEjecucionesDeFecha(fecha: string) {
  return useLiveQuery(
    () => db.ejecucionesRutina.where('fecha').equals(fecha).toArray(),
    [fecha],
  )
}
