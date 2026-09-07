import { liveQuery, type Table } from 'dexie'
import { db } from '../data/db'
import { CLAVES_CONSTRUCCION, useLayout, type Construccion } from './layoutStore'
import { CLAVES_DISENO_CUARTOS, useDiseño } from './disenoStore'
import type { PasoHistorial } from './historialEditorStore'

/**
 * Historial de la pestaña MAPA. Como el resto del historial, ESCUCHA los stores en vez de
 * envolver sus decenas de setters; tres fuentes:
 *  - la construcción de rejilla de `layoutStore` (colocación, muros, estilos, pinceles,
 *    formas de celda, sin muros, agua): se guarda la rebanada entera antes/después y se
 *    repone con `restaurarConstruccion`;
 *  - el diseño POR CUARTO de `disenoStore` (colores, pisos y techos del constructor) y el
 *    techo global de la casa, repuestos con `restaurarDisenoCuartos` / `setTechoTipo`;
 *  - las tablas `formasLibres` y `murosLibres`, vigiladas con `liveQuery`: cada emisión se
 *    compara fila a fila y el paso vuelve a poner (o borrar) la fila entera.
 * Las tablas emiten DESPUÉS de la escritura, así que deshacer/rehacer esperan a ver su
 * propio eco antes de resolver: mientras tanto `aplicando` sigue en alto y el eco no se
 * apila como paso nuevo.
 *
 * Fuera de alcance: crecer/encoger la rejilla (vacía la pila: recoloca celdas, piso
 * exterior y formas a la vez), quitar un cuarto (borra sus objetos y diseño: no se
 * resucita), zonas, accesos y piso exterior.
 */

type Registrar = (p: PasoHistorial) => void

/** Copia superficial de las claves indicadas (la referencia de cada mapa, no su contenido). */
function rebanar<K extends string, S extends Record<K, unknown>>(s: S, claves: readonly K[]): Pick<S, K> {
  const out = {} as Pick<S, K>
  for (const k of claves) out[k] = s[k]
  return out
}

export function escucharMapa(
  registrar: Registrar,
  vaciar: () => void,
): { fuera: (() => void)[]; alDia: () => Promise<void> } {
  const fuera: (() => void)[] = []

  // 1) Construcción de rejilla.
  let baseArrastre: Construccion | null = null
  fuera.push(
    useLayout.subscribe((s, prev) => {
      if (!s.cargado || !prev.cargado) return
      if (s.gridCols !== prev.gridCols || s.gridRows !== prev.gridRows) {
        vaciar()
        return
      }
      // Arrastre de un cuarto: el paso se apila al soltar, contra el estado previo al arrastre.
      if (s.draggingId != null) {
        if (prev.draggingId == null) baseArrastre = rebanar(prev, CLAVES_CONSTRUCCION)
        return
      }
      const antes = baseArrastre ?? rebanar(prev, CLAVES_CONSTRUCCION)
      baseArrastre = null
      if (!CLAVES_CONSTRUCCION.some((k) => s[k] !== antes[k])) return
      // Quitar un cuarto borra sus claves (y sus objetos y diseño en la BD): no se apila.
      if (Object.keys(antes.placed).some((id) => !(id in s.placed))) return
      const despues = rebanar(s, CLAVES_CONSTRUCCION)
      registrar({
        deshacer: () => useLayout.getState().restaurarConstruccion(antes),
        rehacer: () => useLayout.getState().restaurarConstruccion(despues),
      })
    }),
  )

  // 2) Diseño por cuarto y techo global de la casa.
  fuera.push(
    useDiseño.subscribe((s, prev) => {
      if (!s.cargado || !prev.cargado) return
      if (s.techoTipo !== prev.techoTipo) {
        const a = prev.techoTipo
        const d = s.techoTipo
        registrar({
          deshacer: () => useDiseño.getState().setTechoTipo(a),
          rehacer: () => useDiseño.getState().setTechoTipo(d),
        })
      }
      if (!CLAVES_DISENO_CUARTOS.some((k) => s[k] !== prev[k])) return
      const antes = rebanar(prev, CLAVES_DISENO_CUARTOS)
      const despues = rebanar(s, CLAVES_DISENO_CUARTOS)
      registrar({
        deshacer: () => useDiseño.getState().restaurarDisenoCuartos(antes),
        rehacer: () => useDiseño.getState().restaurarDisenoCuartos(despues),
      })
    }),
  )

  // 3) Tablas del constructor. Crecer la rejilla recoloca sus filas: esa emisión no se apila.
  const marcaRejilla = () => {
    const s = useLayout.getState()
    return `${s.gridCols}x${s.gridRows}`
  }
  const tablas = [
    vigilarTabla(db.formasLibres, registrar, vaciar, marcaRejilla),
    vigilarTabla(db.murosLibres, registrar, vaciar, marcaRejilla),
  ]
  fuera.push(...tablas.map((t) => t.cancelar))
  return {
    fuera,
    alDia: async () => {
      await Promise.all(tablas.map((t) => t.alDia()))
    },
  }
}

// ── Tablas ──────────────────────────────────────────────────────────────────────

type Fila = { id?: number }

/** La fila sin los sellos del sync: `uid` lo hereda o lo estrena el middleware al escribir. */
function sinMeta<T extends Fila>(f: T): T {
  const c = { ...f } as Record<string, unknown>
  delete c.uid
  delete c.updatedAt
  return c as T
}

const firma = (f: Fila) => JSON.stringify(sinMeta(f))

/** Tiempo máximo esperando el eco de la tabla (si la vista no reemite, no bloquea la pila). */
const ESPERA_ECO_MS = 2500

/**
 * Vigila una tabla con `liveQuery` y apila un paso por cada emisión que cambie filas. El
 * paso escribe las filas enteras (put) o las borra, y espera a ver el eco en la propia
 * consulta antes de resolver. `alDia` espera a que la consulta refleje lo que hay en la
 * tabla (lo usa `agrupar` para cerrar un grupo después de los ecos pendientes).
 */
function vigilarTabla<T extends Fila>(
  tabla: Table<T, number>,
  registrar: Registrar,
  vaciar: () => void,
  marca: () => string,
): { cancelar: () => void; alDia: () => Promise<void> } {
  let prev: Map<number, T> | null = null
  let firmas = new Map<number, string>()
  let marcaPrev = marca()
  const esperas: { listo: (f: Map<number, string>) => boolean; fin: () => void }[] = []
  /** Avisos de «hubo una emisión» para `alDia`. */
  const pendientes: (() => void)[] = []

  const alDia = async () => {
    const limite = Date.now() + ESPERA_ECO_MS
    while (Date.now() < limite) {
      const filas = (await tabla.toArray()).filter((x) => x.id != null)
      if (filas.length === firmas.size && filas.every((x) => firmas.get(x.id as number) === firma(x))) return
      await new Promise<void>((res) => {
        const t = setTimeout(res, 300)
        pendientes.push(() => {
          clearTimeout(t)
          res()
        })
      })
    }
  }

  const aplicar = async (cambios: { id: number; fila: T | undefined }[]) => {
    await db.transaction('rw', tabla, async () => {
      for (const c of cambios) {
        if (c.fila) await tabla.put(sinMeta(c.fila))
        else await tabla.delete(c.id)
      }
    })
    await new Promise<void>((res) => {
      const listo = (f: Map<number, string>) =>
        cambios.every((c) => (c.fila ? f.get(c.id) === firma(c.fila) : !f.has(c.id)))
      if (listo(firmas)) return res()
      const espera = {
        listo,
        fin: () => {
          clearTimeout(t)
          res()
        },
      }
      const t = setTimeout(() => {
        const i = esperas.indexOf(espera)
        if (i >= 0) esperas.splice(i, 1)
        res()
      }, ESPERA_ECO_MS)
      esperas.push(espera)
    })
  }

  const sub = liveQuery(() => tabla.toArray()).subscribe({
    next: (filas) => {
      const m = new Map<number, T>()
      const f = new Map<number, string>()
      for (const x of filas) {
        if (x.id == null) continue
        m.set(x.id, x)
        f.set(x.id, firma(x))
      }
      for (let i = esperas.length - 1; i >= 0; i--) {
        if (esperas[i].listo(f)) esperas.splice(i, 1)[0].fin()
      }
      const mk = marca()
      if (prev && mk === marcaPrev) {
        const cambios: { id: number; antes: T | undefined; despues: T | undefined }[] = []
        for (const [id, x] of m) {
          if (firmas.get(id) !== f.get(id)) cambios.push({ id, antes: prev.get(id), despues: x })
        }
        for (const [id, x] of prev) if (!m.has(id)) cambios.push({ id, antes: x, despues: undefined })
        if (cambios.length) {
          registrar({
            deshacer: () => aplicar(cambios.map((c) => ({ id: c.id, fila: c.antes }))),
            rehacer: () => aplicar(cambios.map((c) => ({ id: c.id, fila: c.despues }))),
          })
        }
      } else if (prev) {
        vaciar()
      }
      prev = m
      firmas = f
      marcaPrev = mk
      for (const fin of pendientes.splice(0)) fin()
    },
  })
  return { cancelar: () => sub.unsubscribe(), alDia }
}
