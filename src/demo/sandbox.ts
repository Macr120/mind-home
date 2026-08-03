/**
 * La casa demo es un SANDBOX completo: el visitante puede hacer todo —crear
 * cuartos, pintar, mover objetos, vestir su avatar, trazar caminos, registrar
 * una comida, un gasto o una idea— y nada se guarda. Al terminar de construirla
 * se toma una FOTO de sus tablas en `_syncMeta`, y al recargar la página
 * `db.ts` repone lo que se haya tocado.
 *
 * La foto guarda las filas tal cual: IndexedDB clona Blobs, así que aquí NO
 * hace falta el base64 de `casaSnapshot.ts` (aquel existe porque su snapshot
 * viaja a un `casa.json`). `_syncMeta` ya está exenta del sync y del respaldo.
 *
 * Solo se repone lo ENSUCIADO: el guard apunta en localStorage qué tablas
 * escribió el visitante (`demo/demoGuard.ts`), así recargar cuesta lo que se
 * tocó y no la BD entera. Una tabla sin fila de foto nacía vacía: se limpia.
 *
 * La reposición no la dispara este módulo: la llama `db.ts` desde
 * `db.on('ready')`, el único momento en que se puede escribir con la garantía
 * de que ningún store ha leído todavía — Dexie retiene lo encolado hasta que
 * esa promesa resuelve, y los `cargar()` de los stores de la casa se
 * autoinvocan al importarse.
 *
 * Multi-pestaña: una segunda pestaña del demo repone la casa bajo los pies de
 * la primera, que se queda con sus stores en memoria hasta recargar. Abrir una
 * pestaña ES una carga de página y el trato es «al recargar vuelve a su estado
 * original»; los locks solo evitan que foto y reposición se solapen.
 */
import type Dexie from 'dexie'
import { create } from 'zustand'
import { db, type SyncMeta } from '../core/data/db'
import { setConstruyendoDemo, registrarAlEnsuciar, tablasSucias, limpiarTablasSucias } from '../core/data/demoGuard'
import { marcarEscrituraSilenciosa } from '../core/data/sync/middleware'
import { esDemo, esDemoAutor } from '../core/edicion'
import { haySandboxDemoSucio, limpiarSandboxDemoSucio } from './modo'

/** Una fila de `_syncMeta` por tabla: la casa nunca se serializa entera de golpe. */
const PREFIJO_BASE = 'mh.sandbox.base.'

/** Las tablas de datos: todas menos las internas de Dexie/sync (`_*`). */
const tablasDeDatos = (base: Dexie): string[] =>
  base.tables.map((t) => t.name).filter((n) => !n.startsWith('_'))

/**
 * Fotografía la casa demo recién construida: es el ORIGINAL contra el que se
 * repone todo lo que el visitante toque. La llama `construir.ts` al final, ya
 * con `setConstruyendoDemo(true)` puesto.
 */
export async function fotografiarDemo(): Promise<void> {
  if (!esDemo() || esDemoAutor()) return
  // La construcción del demo no siembra la biblioteca de objetos (eso lo hace
  // el catálogo en la casa real): sin esto la pestaña Objetos saldría vacía.
  // Va ANTES de la foto para que el inventario forme parte del estado
  // «original» y no haya que resembrarlo tras cada descarte.
  const { useDiseño } = await import('../core/state/disenoStore')
  await useDiseño.getState().sembrarLibreriaBase()

  const nombres = tablasDeDatos(db)
  await db.transaction('rw', [...nombres.map((n) => db.table(n)), db._syncMeta], async () => {
    marcarEscrituraSilenciosa()
    for (const nombre of nombres) {
      const filas = await db.table(nombre).toArray()
      // Las vacías no se fotografían: al reponer, «sin foto» = nacía vacía.
      if (filas.length) await db._syncMeta.put({ clave: PREFIJO_BASE + nombre, valor: filas })
    }
  })
  // Los builders escribieron por los repos y llenaron la cola de sync con el
  // año entero de Pep@. En demo nadie la vacía (`sync/motor.ts`): peso muerto.
  await db._outbox.clear()
}

/**
 * Repone lo que el visitante ensució. La llama `db.ts` desde `on('ready')` con
 * su propia instancia `vip`: el `db` del módulo está bloqueado hasta que esa
 * promesa resuelva.
 */
export async function restaurarBaseDemo(vip: Dexie): Promise<void> {
  if (!esDemo() || esDemoAutor() || !haySandboxDemoSucio()) return
  const trabajo = () => reponer(vip)
  await (navigator.locks ? navigator.locks.request('mh-demo-sandbox', trabajo) : trabajo())
}

async function reponer(vip: Dexie): Promise<void> {
  const meta = vip.table<SyncMeta>('_syncMeta')
  const conocidas = new Set(tablasDeDatos(vip))
  // Sin lista de sucias (marca de una versión anterior, o localStorage podado)
  // se repone todo: más lento, pero nunca deja la casa demo editada.
  const apuntadas = tablasSucias()
  const nombres = apuntadas.length ? apuntadas.filter((n) => conocidas.has(n)) : [...conocidas]
  if (!nombres.length) {
    limpiarSandboxDemoSucio()
    limpiarTablasSucias()
    return
  }

  setConstruyendoDemo(true)
  try {
    await vip.transaction('rw', [...nombres.map((n) => vip.table(n)), meta], async () => {
      marcarEscrituraSilenciosa()
      for (const nombre of nombres) {
        const tabla = vip.table(nombre)
        await tabla.clear()
        const foto = await meta.get(PREFIJO_BASE + nombre)
        if (!foto) continue // nacía vacía: con limpiarla basta
        const filas = foto.valor as Record<string, unknown>[]
        if (filas.length) await tabla.bulkAdd(filas)
      }
    })
    // La cola de sync no se vacía en demo (`sync/motor.ts`): lo encolado por el
    // visitante ya no corresponde a nada y se va con la reposición.
    await vip.table('_outbox').clear()
  } finally {
    setConstruyendoDemo(false)
  }
  // La foto NO se borra: es el original permanente, y reponer dos veces debe
  // dar lo mismo. Las marcas sí, y FUERA de la transacción: si abortó,
  // sobreviven y se reintenta en la siguiente carga.
  limpiarSandboxDemoSucio()
  limpiarTablasSucias()
  // El store nació con la marca todavía puesta (esto corre en `on('ready')`,
  // después): sin esto la BarraDemo ofrecería descartar una casa ya repuesta.
  useSandboxDemo.setState({ sucio: false })
}

/** Tira los cambios: las marcas ya están puestas, la recarga hace el trabajo. */
export function descartarSandbox(): void {
  location.reload()
}

interface SandboxUiState {
  /** ¿Hay cambios que descartar? (pinta el botón de la BarraDemo) */
  sucio: boolean
}

export const useSandboxDemo = create<SandboxUiState>(() => ({
  sucio: esDemo() && haySandboxDemoSucio(),
}))

// El guard vive en `core/data` y no puede importar de `demo/` (ciclo con db):
// se le inyecta el aviso, igual que se le inyectaba la lista de tablas.
registrarAlEnsuciar(() => useSandboxDemo.setState({ sucio: true }))
