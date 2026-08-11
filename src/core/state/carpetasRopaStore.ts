import { create } from 'zustand'
import { db, type CarpetaRopa } from '../data/db'
import { PRENDAS, type PrendaCategoriaId } from '../house/apariencia'

/**
 * Carpetas del guardarropa: dentro de cada categoría de la pestaña Ropa agrupan
 * la prenda de fábrica que las originó y los elementos que agregue el usuario.
 *
 * Molde: `gruposPlantillaStore`. La diferencia es que aquí la membresía NO vive
 * en la carpeta: cada `prendaCustom` guarda su `carpetaId`, porque las prendas
 * de fábrica son constantes de código y no tienen fila propia.
 */

/** Categoría donde caen las prendas huérfanas (guardarropa anterior a las carpetas). */
const CAT_HUERFANAS: PrendaCategoriaId = 'accesorios'

interface CarpetasRopaState {
  carpetas: CarpetaRopa[]
  /** Crea una carpeta vacía al final de su categoría; devuelve su id. */
  crear: (categoria: PrendaCategoriaId, nombre: string, emoji?: string) => Promise<number>
  renombrar: (id: number, nombre: string, emoji?: string) => Promise<void>
  /**
   * Las de fábrica se ESCONDEN (se pueden recuperar); las del usuario se borran
   * y sus elementos pasan a la primera carpeta de la misma categoría.
   */
  eliminar: (id: number) => Promise<void>
  /** Vuelve a mostrar una carpeta de fábrica escondida. */
  restaurar: (id: number) => Promise<void>
  /** Reordena las carpetas de una categoría según el arreglo de ids dado. */
  reordenar: (idsEnOrden: number[]) => Promise<void>
}

export const useCarpetasRopa = create<CarpetasRopaState>((set, get) => ({
  carpetas: [],

  crear: async (categoria, nombre, emoji) => {
    const orden =
      get()
        .carpetas.filter((c) => c.categoria === categoria)
        .reduce((m, c) => Math.max(m, c.orden), -1) + 1
    const carpeta: CarpetaRopa = {
      categoria,
      nombre: nombre.trim() || 'Nueva carpeta',
      emoji,
      orden,
      creadoEn: Date.now(),
    }
    const id = await db.carpetasRopa.add(carpeta)
    set((s) => ({ carpetas: [...s.carpetas, { id, ...carpeta }] }))
    return id
  },

  renombrar: async (id, nombre, emoji) => {
    const n = nombre.trim()
    if (!n) return
    const patch = { nombre: n, ...(emoji !== undefined ? { emoji } : {}) }
    set((s) => ({ carpetas: s.carpetas.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    await db.carpetasRopa.update(id, patch)
  },

  eliminar: async (id) => {
    const victima = get().carpetas.find((c) => c.id === id)
    if (!victima) return
    if (victima.base) {
      set((s) => ({ carpetas: s.carpetas.map((c) => (c.id === id ? { ...c, oculta: true } : c)) }))
      await db.carpetasRopa.update(id, { oculta: true })
      return
    }
    const destino = get().carpetas.find((c) => c.id !== id && c.categoria === victima.categoria)
    // Sin destino en su categoría, los elementos quedan sueltos y la carga los
    // reubica en la carpeta de huérfanas.
    await db.prendasCustom
      .where('carpetaId')
      .equals(id)
      .modify({ carpetaId: destino?.id })
    set((s) => ({ carpetas: s.carpetas.filter((c) => c.id !== id) }))
    await db.carpetasRopa.delete(id)
  },

  restaurar: async (id) => {
    set((s) => ({ carpetas: s.carpetas.map((c) => (c.id === id ? { ...c, oculta: false } : c)) }))
    await db.carpetasRopa.update(id, { oculta: false })
  },

  reordenar: async (idsEnOrden) => {
    set((s) => ({
      carpetas: s.carpetas
        .map((c) => (c.id != null && idsEnOrden.includes(c.id) ? { ...c, orden: idsEnOrden.indexOf(c.id) } : c))
        .sort((a, b) => a.orden - b.orden),
    }))
    for (let i = 0; i < idsEnOrden.length; i++) await db.carpetasRopa.update(idsEnOrden[i], { orden: i })
  },
}))

/**
 * Carga al arrancar. Siembra una carpeta por prenda de fábrica si la tabla está
 * vacía — lo que cubre por igual la BD nueva, la casa demo y la que acaba de
 * subir a la v121 (los upgrades de Dexie no corren en los dos primeros casos).
 *
 * Después reconcilia: las prendas a medida sin carpeta válida (guardarropa
 * anterior, o un respaldo viejo restaurado) caen en una carpeta «Guardarropa»,
 * porque si no desaparecerían de la interfaz.
 */
db.carpetasRopa
  .orderBy('orden')
  .toArray()
  .then(async (rows) => {
    if (rows.length === 0) {
      const porCategoria = new Map<string, number>()
      for (const p of PRENDAS) {
        const orden = porCategoria.get(p.categoria) ?? 0
        porCategoria.set(p.categoria, orden + 1)
        await db.carpetasRopa.add({
          categoria: p.categoria,
          nombre: p.nombre,
          emoji: p.emoji,
          base: p.id,
          orden,
          creadoEn: Date.now(),
        })
      }
      rows = await db.carpetasRopa.orderBy('orden').toArray()
    }

    const validas = new Set(rows.map((c) => c.id))
    const huerfanas = (await db.prendasCustom.toArray()).filter(
      (p) => p.carpetaId == null || !validas.has(p.carpetaId),
    )
    if (huerfanas.length > 0) {
      let cajon = rows.find((c) => c.categoria === CAT_HUERFANAS && !c.base)
      if (!cajon) {
        const orden = rows.filter((c) => c.categoria === CAT_HUERFANAS).length
        const nueva: CarpetaRopa = {
          categoria: CAT_HUERFANAS,
          nombre: 'Guardarropa',
          emoji: '🧵',
          orden,
          creadoEn: Date.now(),
        }
        cajon = { id: await db.carpetasRopa.add(nueva), ...nueva }
        rows = [...rows, cajon]
      }
      for (const p of huerfanas) {
        if (p.id != null) await db.prendasCustom.update(p.id, { carpetaId: cajon.id })
      }
    }

    useCarpetasRopa.setState({ carpetas: rows })
  })
  .catch(() => {})
