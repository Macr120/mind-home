import { create } from 'zustand'
import { db, GRUPOS_PLANTILLA_BASE, type GrupoPlantilla } from '../data/db'
import { filasSeed } from '../data/sync/syncables'
import { tGlobal, type TFunc } from '../i18n/useT'

/**
 * Carpetas del catálogo de plantillas: agrupan apps del sistema y plantillas
 * personalizadas. El usuario las crea, renombra, borra, reordena y mueve
 * plantillas entre ellas. Una plantilla vive en un solo grupo; la membresía se
 * guarda en `GrupoPlantilla.miembros` (ids de plantilla en orden).
 *
 * Molde: biblioteca de objetos (carpetas por categoría en `disenoStore`).
 */

// Semilla inicial (solo la primera vez); después el usuario la personaliza. Vive
// en db.ts porque la migración v101 reparte exactamente igual a quien ya la tenía.
const SEED = GRUPOS_PLANTILLA_BASE

/**
 * Nombre visible de una carpeta: las de fábrica se traducen SOLO mientras
 * conserven su nombre sembrado (mismo criterio que `campoBase` de mascotas);
 * un nombre puesto por el usuario se respeta tal cual.
 */
const CLAVE_CARPETA: Record<string, string> = {
  'Cuerpo': 'plantillas.carpeta.cuerpo',
  'Estudio': 'plantillas.carpeta.estudio',
  'Administración': 'plantillas.carpeta.admin',
  'Pasatiempos': 'plantillas.carpeta.pasatiempos',
  'Salud mental': 'plantillas.carpeta.memorias',
  'Studio': 'plantillas.carpeta.studio',
}
export function nombreCarpeta(t: TFunc, nombre: string): string {
  const clave = CLAVE_CARPETA[nombre]
  return clave ? t(clave, nombre) : nombre
}

interface GruposPlantillaState {
  grupos: GrupoPlantilla[]
  /** Crea una carpeta vacía al final. */
  crear: (nombre: string, emoji?: string) => Promise<void>
  renombrar: (id: number, nombre: string, emoji?: string) => Promise<void>
  /** Borra una carpeta creada por el usuario (las base no se pueden borrar); sus miembros pasan a la primera carpeta. */
  eliminar: (id: number) => Promise<void>
  /** Pliega o despliega una carpeta (se recuerda entre sesiones). */
  alternarPlegado: (id: number) => Promise<void>
  /** Reordena las carpetas según el arreglo de ids dado. */
  reordenar: (idsEnOrden: number[]) => Promise<void>
  /** Mueve una plantilla a la carpeta destino (la quita de la actual). */
  mover: (plantillaId: string, grupoDestinoId: number) => Promise<void>
  /** Saca una plantilla de cualquier carpeta (al borrar una custom). */
  quitar: (plantillaId: string) => Promise<void>
  /** Mete en la primera carpeta los ids que aún no estén en ninguna (reconciliación). */
  asegurarMiembros: (ids: string[]) => Promise<void>
}

/** Persiste los `miembros` de los grupos dados (solo los que cambian). */
async function persistirMiembros(grupos: GrupoPlantilla[]) {
  for (const g of grupos) if (g.id != null) await db.gruposPlantilla.update(g.id, { miembros: g.miembros })
}

export const useGruposPlantilla = create<GruposPlantillaState>((set, get) => ({
  grupos: [],
  crear: async (nombre, emoji) => {
    const orden = get().grupos.reduce((m, g) => Math.max(m, g.orden), -1) + 1
    const grupo: GrupoPlantilla = {
      nombre: nombre.trim() || tGlobal('plantillas.grupoNuevo', 'Nuevo grupo'),
      emoji,
      orden,
      miembros: [],
      esBase: false,
    }
    const id = await db.gruposPlantilla.add(grupo)
    set((s) => ({ grupos: [...s.grupos, { id, ...grupo }] }))
  },
  renombrar: async (id, nombre, emoji) => {
    const n = nombre.trim()
    if (!n) return
    const patch = { nombre: n, ...(emoji !== undefined ? { emoji } : {}) }
    set((s) => ({ grupos: s.grupos.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
    await db.gruposPlantilla.update(id, patch)
  },
  eliminar: async (id) => {
    const grupos = get().grupos
    const victima = grupos.find((g) => g.id === id)
    const destino = grupos.find((g) => g.id !== id)
    if (!victima || victima.esBase || !destino) return
    const miembros = [...destino.miembros, ...victima.miembros.filter((m) => !destino.miembros.includes(m))]
    set((s) => ({
      grupos: s.grupos.filter((g) => g.id !== id).map((g) => (g.id === destino.id ? { ...g, miembros } : g)),
    }))
    if (destino.id != null) await db.gruposPlantilla.update(destino.id, { miembros })
    await db.gruposPlantilla.delete(id)
  },
  alternarPlegado: async (id) => {
    const actual = get().grupos.find((g) => g.id === id)
    if (!actual) return
    const plegado = !actual.plegado
    set((s) => ({ grupos: s.grupos.map((g) => (g.id === id ? { ...g, plegado } : g)) }))
    await db.gruposPlantilla.update(id, { plegado })
  },
  reordenar: async (idsEnOrden) => {
    set((s) => ({
      grupos: s.grupos
        .map((g) => ({ ...g, orden: g.id != null ? idsEnOrden.indexOf(g.id) : g.orden }))
        .sort((a, b) => a.orden - b.orden),
    }))
    for (let i = 0; i < idsEnOrden.length; i++) await db.gruposPlantilla.update(idsEnOrden[i], { orden: i })
  },
  mover: async (plantillaId, grupoDestinoId) => {
    if (!get().grupos.some((g) => g.id === grupoDestinoId)) return
    const grupos = get().grupos.map((g) => {
      const dentro = g.miembros.includes(plantillaId)
      if (g.id === grupoDestinoId) return dentro ? g : { ...g, miembros: [...g.miembros, plantillaId] }
      return dentro ? { ...g, miembros: g.miembros.filter((m) => m !== plantillaId) } : g
    })
    set({ grupos })
    await persistirMiembros(grupos)
  },
  quitar: async (plantillaId) => {
    let cambio = false
    const grupos = get().grupos.map((g) => {
      if (!g.miembros.includes(plantillaId)) return g
      cambio = true
      return { ...g, miembros: g.miembros.filter((m) => m !== plantillaId) }
    })
    if (!cambio) return
    set({ grupos })
    await persistirMiembros(grupos)
  },
  asegurarMiembros: async (ids) => {
    const grupos = get().grupos
    if (grupos.length === 0) return
    const enGrupos = new Set(grupos.flatMap((g) => g.miembros))
    const huerfanos = ids.filter((id) => !enGrupos.has(id))
    if (huerfanos.length === 0) return
    const primero = { ...grupos[0], miembros: [...grupos[0].miembros, ...huerfanos] }
    set({ grupos: grupos.map((g) => (g.id === primero.id ? primero : g)) })
    if (primero.id != null) await db.gruposPlantilla.update(primero.id, { miembros: primero.miembros })
  },
}))

/**
 * Una app vive en UNA carpeta, pero el sync de dos dispositivos puede dejarla en
 * dos (p. ej. Metas en Estudio y en Salud mental tras la v140). Se queda en la
 * carpeta base que le toca de fábrica si es una de ellas; si no, en la primera.
 * Las base se reconocen por su posición, como en la migración v140.
 */
async function sinRepetidas(rows: GrupoPlantilla[]): Promise<GrupoPlantilla[]> {
  const base = rows.filter((g) => g.esBase)
  const deFabrica = (id: string) => {
    const i = SEED.findIndex((s) => s.miembros.includes(id))
    return i >= 0 ? base[i] : undefined
  }
  const duenos = new Map<string, GrupoPlantilla>()
  for (const g of rows) {
    for (const m of g.miembros) {
      const actual = duenos.get(m)
      if (!actual || (actual !== deFabrica(m) && g === deFabrica(m))) duenos.set(m, g)
    }
  }
  const out: GrupoPlantilla[] = []
  for (const g of rows) {
    const miembros = g.miembros.filter((m, i) => duenos.get(m) === g && g.miembros.indexOf(m) === i)
    if (miembros.length !== g.miembros.length) {
      if (g.id != null) await db.gruposPlantilla.update(g.id, { miembros })
      out.push({ ...g, miembros })
    } else out.push(g)
  }
  return out
}

/** Carga las carpetas al arrancar; siembra las base la primera vez. */
db.gruposPlantilla
  .orderBy('orden')
  .toArray()
  .then(async (rows) => {
    if (rows.length === 0) {
      // Con uid de SIEMBRA: sin él cada dispositivo sembraba sus carpetas con un
      // uid al azar y el sync las sumaba en vez de fundirlas — el catálogo salía
      // repetido tantas veces como casas hubiera (lo arregla la migración v130).
      const semilla = filasSeed(
        'gruposPlantilla',
        SEED.map((s, i) => ({
          nombre: s.nombre,
          emoji: s.emoji,
          orden: i,
          miembros: [...s.miembros],
          esBase: true,
        })),
      )
      for (const g of semilla) await db.gruposPlantilla.add(g)
      rows = await db.gruposPlantilla.orderBy('orden').toArray()
    }
    rows = await sinRepetidas(rows)
    useGruposPlantilla.setState({ grupos: rows })
  })
  .catch(() => {})
