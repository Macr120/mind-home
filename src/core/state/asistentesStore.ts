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
import { EXPRESION_DEFAULT, parseRopa, serializarRopa, type ExpresionId, type PeinadoId } from '../house/apariencia'
import { aplicarCuerpoPreset, CUERPOS_PRESET, piezasBase } from '../house/cuerpos'
import { ATUENDO_POR_TEMA, esAtuendoDeTema } from '../house/atuendos'
import type { TemaId } from '../house/temas'

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
  /** El tema de la casa viste a todos los asistentes; sin tema (null) les repone su ropa. */
  vestirPorTema: (tema: TemaId | null, previo: TemaId | null) => Promise<void>
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
    ropaSinTema: row.ropaSinTema ? parseRopa(row.ropaSinTema) : undefined,
    cuerpoPresetId: row.cuerpoPresetId || undefined,
    expresion: (row.expresion as ExpresionId) || undefined,
    rostro: row.rostro,
    peinado: (row.peinado as PeinadoId) || undefined,
    peloColor: row.peloColor || undefined,
    modelo3d,
    modeloGlb: row.modeloGlb,
    animacion,
    enMapa: row.enMapa,
    vozNombre: row.vozNombre || undefined,
    vozPitch: row.vozPitch,
    vozRate: row.vozRate,
    vozVolumen: row.vozVolumen,
    vozIA: row.vozIA,
    vozIaVoz: row.vozIaVoz || undefined,
    vozLeer: row.vozLeer,
    espontaneo: row.espontaneo,
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
    // No usa serializarRopa: '' significa «sin respaldo» y {} se perdería.
    ropaSinTema: a.ropaSinTema ? JSON.stringify(a.ropaSinTema) : '',
    cuerpoPresetId: a.cuerpoPresetId ?? '',
    expresion: a.expresion ?? '',
    rostro: a.rostro,
    peinado: a.peinado ?? '',
    peloColor: a.peloColor ?? '',
    modelo3d: a.modelo3d ? JSON.stringify(a.modelo3d) : '',
    modeloGlb: a.modeloGlb,
    animacion: a.animacion ? JSON.stringify(a.animacion) : '',
    enMapa: a.enMapa,
    vozNombre: a.vozNombre ?? '',
    vozPitch: a.vozPitch,
    vozRate: a.vozRate,
    vozVolumen: a.vozVolumen,
    vozIA: a.vozIA,
    vozIaVoz: a.vozIaVoz ?? '',
    vozLeer: a.vozLeer,
    espontaneo: a.espontaneo,
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
  vestirPorTema: async (tema, previo) => {
    if (tema && tema === previo) return
    // Mismo trato que el avatar: el respaldo se toma al pasar de «sin tema» a un tema,
    // sobrevive al cambio entre temas y se repone al quitarlo. «Sin tema» desviste
    // aunque el tema ya estuviera en null, y si no hay respaldo pero la ropa es tal
    // cual el atuendo de un tema (versión anterior, fila del sync), se quita.
    const vestir = (a: Asistente): Asistente => {
      if (tema) return { ...a, ropa: ATUENDO_POR_TEMA[tema], ropaSinTema: previo ? a.ropaSinTema : (a.ropa ?? {}) }
      if (a.ropaSinTema) return { ...a, ropa: a.ropaSinTema, ropaSinTema: undefined }
      if (esAtuendoDeTema(a.ropa)) return { ...a, ropa: {} }
      return a
    }
    const antes = get().lista
    const lista = antes.map(vestir)
    set({ lista })
    await Promise.all(lista.filter((a, i) => a !== antes[i]).map((a) => persistir(a)))
  },
}))

// ─── Modelos como personajes ─────────────────────────────────────────────────

/**
 * Los 12 modelos del editor de personajes como personajes «de fábrica» sin
 * cuenta propia (id `modelo:<id>`): el cuerpo Humano, las 5 formas y los 6
 * cuerpos prediseñados. Los usa el Studio de video (avatar, actores de película
 * y voces) para elegir cualquier personaje, no solo los asistentes de la casa.
 */
export const PREFIJO_MODELO = 'modelo:'
export const esModelo = (id: string) => id.startsWith(PREFIJO_MODELO)
export interface ModeloPersonaje {
  id: string
  emoji: string
  /** Nombre traducible: la misma clave y español que en el editor de personajes. */
  claveNombre: string
  es: string
}
const PRINCESA = CUERPOS_PRESET.find((c) => c.id === 'princesa')
export const MODELOS_PERSONAJE: readonly ModeloPersonaje[] = [
  { id: `${PREFIJO_MODELO}base`, emoji: '🧍', claveNombre: 'editor.pers.modeloBase', es: 'Humano' },
  ...(PRINCESA ? [{ id: `${PREFIJO_MODELO}${PRINCESA.id}`, emoji: PRINCESA.emoji, claveNombre: `editor.pers.cuerpo.${PRINCESA.id}`, es: PRINCESA.nombre }] : []),
  ...MASCOTAS.map((m) => ({ id: `${PREFIJO_MODELO}${m.id}`, emoji: m.emoji, claveNombre: `mascota.${m.id}.nombre`, es: m.nombre })),
  ...CUERPOS_PRESET.filter((c) => c.id !== 'princesa').map((c) => ({ id: `${PREFIJO_MODELO}${c.id}`, emoji: c.emoji, claveNombre: `editor.pers.cuerpo.${c.id}`, es: c.nombre })),
]
const modelosCache = new Map<string, Asistente>()
/** Asistente sintético de un modelo; la MISMA referencia en cada llamada (los memos del 3D dependen de ella). */
function asistenteDeModelo(id: string): Asistente | undefined {
  const cacheado = modelosCache.get(id)
  if (cacheado) return cacheado
  const clave = id.slice(PREFIJO_MODELO.length)
  const vacio = { historia: '', personalidad: '', saludo: '', cuartos: [] as string[] }
  const forma = MASCOTAS.find((m) => m.id === clave)
  let a: Asistente
  if (forma) a = { ...asistenteDesdePlantilla(forma), ...vacio, id }
  else if (clave === 'base') {
    a = { ...asistenteDesdePlantilla(MASCOTAS[0]), ...vacio, id, nombre: 'Humano', emoji: '🧍', modelo3d: piezasBase('#3b82f6'), cuerpoPresetId: 'base', expresion: EXPRESION_DEFAULT }
  } else {
    const preset = CUERPOS_PRESET.find((c) => c.id === clave)
    if (!preset) return undefined
    a = { ...asistenteDesdePlantilla(MASCOTAS[0]), ...vacio, id, nombre: preset.nombre, emoji: preset.emoji, ...aplicarCuerpoPreset(preset), expresion: preset.id === 'princesa' ? EXPRESION_DEFAULT : undefined }
  }
  modelosCache.set(id, a)
  return a
}

/** Asistente por id con fallback seguro (un modelo `modelo:<id>`, la plantilla integrada o el primero). */
export function getAsistente(id: string): Asistente {
  if (esModelo(id)) {
    const m = asistenteDeModelo(id)
    if (m) return m
  }
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
