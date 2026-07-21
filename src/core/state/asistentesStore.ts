import { create } from 'zustand'
import { db, type AsistenteGuardado } from '../data/db'
import { useMascota } from './mascotaStore'
import {
  MASCOTAS,
  asistenteDesdePlantilla,
  type Asistente,
  type MascotaId,
  type Pieza3D,
} from '../chat/mascotas'
import type { AnimacionModelo } from '../house/animacion'
import { parseRopa, serializarRopa } from '../house/apariencia'

/**
 * Asistentes del arquitecto: los 5 integrados (plantillas de `mascotas.ts`)
 * más los creados por el usuario. Aquí se gestionan crear/editar/eliminar,
 * y el flag `enMapa` (aparecer como personaje 3D además del activo).
 *
 * Persistencia en `db.asistentes`: los integrados solo tienen fila si fueron
 * personalizados u ocultados; los custom siempre tienen fila.
 */
interface AsistentesState {
  /** Asistentes visibles (integrados no eliminados + custom). */
  lista: Asistente[]
  /** Integrados "eliminados" por el usuario (se pueden restaurar). */
  ocultos: Asistente[]
  /** Crea o actualiza un asistente (estado al instante, disco en segundo plano). */
  guardar: (a: Asistente) => Promise<void>
  /** Elimina: integrado → se oculta (restaurable); custom → se borra. */
  eliminar: (id: string) => Promise<void>
  restaurar: (id: string) => Promise<void>
}

function aAsistente(row: AsistenteGuardado): Asistente {
  let modelo3d: Pieza3D[] | undefined
  if (row.modelo3d) {
    try {
      modelo3d = JSON.parse(row.modelo3d) as Pieza3D[]
    } catch {
      modelo3d = undefined
    }
  }
  let animacion: AnimacionModelo | undefined
  if (row.animacion) {
    try {
      animacion = JSON.parse(row.animacion) as AnimacionModelo
    } catch {
      animacion = undefined
    }
  }
  return {
    id: row.asistenteId,
    nombre: row.nombre,
    emoji: row.emoji,
    forma: row.forma as MascotaId,
    historia: row.historia ?? '',
    personalidad: row.personalidad,
    saludo: row.saludo,
    cuartos: row.cuartos ?? [],
    color: row.color || undefined,
    escala: row.escala,
    ropa: parseRopa(row.ropa),
    modelo3d,
    modeloGlb: row.modeloGlb,
    animacion,
    enMapa: row.enMapa,
    vozNombre: row.vozNombre || undefined,
    vozPitch: row.vozPitch,
    vozRate: row.vozRate,
    corazon: row.corazon,
  }
}

/** Mezcla las filas guardadas sobre las plantillas integradas. */
function componer(rows: AsistenteGuardado[]): { lista: Asistente[]; ocultos: Asistente[] } {
  const porId = new Map(rows.map((r) => [r.asistenteId, r]))
  const lista: Asistente[] = []
  const ocultos: Asistente[] = []
  for (const plantilla of MASCOTAS) {
    const row = porId.get(plantilla.id)
    if (!row) lista.push(asistenteDesdePlantilla(plantilla))
    else if (row.oculto) ocultos.push(aAsistente(row))
    else lista.push(aAsistente(row))
  }
  for (const row of rows) {
    if (MASCOTAS.some((m) => m.id === row.asistenteId)) continue
    if (!row.oculto) lista.push(aAsistente(row))
  }
  return { lista, ocultos }
}

async function persistir(a: Asistente, oculto = false) {
  const row: Omit<AsistenteGuardado, 'id'> = {
    asistenteId: a.id,
    nombre: a.nombre,
    emoji: a.emoji,
    forma: a.forma,
    historia: a.historia,
    personalidad: a.personalidad,
    saludo: a.saludo,
    cuartos: a.cuartos,
    color: a.color ?? '',
    escala: a.escala,
    ropa: serializarRopa(a.ropa),
    modelo3d: a.modelo3d ? JSON.stringify(a.modelo3d) : '',
    modeloGlb: a.modeloGlb,
    animacion: a.animacion ? JSON.stringify(a.animacion) : '',
    enMapa: a.enMapa,
    vozNombre: a.vozNombre ?? '',
    vozPitch: a.vozPitch,
    vozRate: a.vozRate,
    corazon: a.corazon,
    oculto,
  }
  const existente = await db.asistentes.where('asistenteId').equals(a.id).first()
  if (existente?.id != null) await db.asistentes.update(existente.id, row)
  else await db.asistentes.add(row as AsistenteGuardado)
}

export const useAsistentes = create<AsistentesState>((set, get) => ({
  lista: MASCOTAS.map(asistenteDesdePlantilla),
  ocultos: [],
  guardar: async (a) => {
    // Estado primero (síncrono) para que los inputs controlados no salten.
    set((s) => ({
      lista: s.lista.some((x) => x.id === a.id)
        ? s.lista.map((x) => (x.id === a.id ? a : x))
        : [...s.lista, a],
    }))
    await persistir(a)
  },
  eliminar: async (id) => {
    const { lista, ocultos } = get()
    if (lista.length <= 1) return // siempre debe quedar al menos un asistente
    const a = lista.find((x) => x.id === id)
    if (!a) return
    const esIntegrado = MASCOTAS.some((m) => m.id === id)
    set({
      lista: lista.filter((x) => x.id !== id),
      ocultos: esIntegrado ? [...ocultos, a] : ocultos,
    })
    if (esIntegrado) {
      await persistir(a, true)
    } else {
      const row = await db.asistentes.where('asistenteId').equals(id).first()
      if (row?.id != null) await db.asistentes.delete(row.id)
    }
    // Si era el activo, pasa el mando al primero disponible.
    const st = useMascota.getState()
    if (st.mascota === id) await st.setMascota(get().lista[0].id)
  },
  restaurar: async (id) => {
    const a = get().ocultos.find((x) => x.id === id)
    if (!a) return
    set((s) => ({
      lista: [...s.lista, a],
      ocultos: s.ocultos.filter((x) => x.id !== id),
    }))
    await persistir(a, false)
  },
}))

/** Asistente por id con fallback seguro (plantilla integrada o el primero). */
export function getAsistente(id: string): Asistente {
  const { lista, ocultos } = useAsistentes.getState()
  return (
    lista.find((a) => a.id === id) ??
    ocultos.find((a) => a.id === id) ??
    lista[0] ??
    asistenteDesdePlantilla(MASCOTAS[0])
  )
}

/** Carga los asistentes guardados al arrancar. */
db.asistentes
  .toArray()
  .then((rows) => {
    if (rows.length > 0) useAsistentes.setState(componer(rows))
  })
  .catch(() => {})
