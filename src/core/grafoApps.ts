import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { plantillasTodas } from './appContrato'
import type { Memoria } from './data/db'
import { visibles } from './data/ejemplos'
import { VACIO, enlacesGrafoRepo, memoriasRepo } from './data/repository'
import {
  enlacesImplicitos,
  refApp,
  refMemoria,
  refNodo,
  type AmbitoGrafo,
  type EnlaceNodo,
  type MemoriaNodo,
  type NodoEntidad,
  type RefNodo,
} from './grafo/memoria'

/**
 * El grafo de memoria con las apps dentro: junta los nodos que declara cada
 * app (`Plantilla.nodosGrafo`) y deriva los enlaces con las memorias.
 *
 * Vive fuera de `core/grafo/` porque importa el catálogo de apps y los repos;
 * aquella carpeta es pura y la revisa `tsconfig.grafo.json`. Importa del
 * contrato (`appContrato`) y no de `registry.ts`, igual que `materialApps.ts`.
 */

/** Un nodo de app con lo que la UI necesita para pintarlo y abrirlo. */
export interface NodoEntidadApp extends NodoEntidad {
  emoji: string
  seccion?: string
  dato?: string
  /** Color propio (una categoría, un asistente); sin él, el de su app. */
  color?: string
  /** Cómo se abre si no es una app (la conversación de un amigo, un sitio web…). */
  abrir?: () => void
}

let cache: { hasta: number; nodos: Promise<NodoEntidadApp[]> } | null = null

/**
 * Los nodos de todas las apps y de las vistas del chat (asistentes, amigos,
 * lugares, navegador). Se guardan 30 s: el chat los pide en cada mensaje y así
 * no se leen las tablas cada vez. Una app que falla no tumba a las demás.
 */
export function nodosDeApps(): Promise<NodoEntidadApp[]> {
  if (cache && cache.hasta > Date.now()) return cache.nodos
  const nodos = nodosDePlantillas().then(async (deApps) => {
    // Import diferido: las vistas tiran del buzón, los asistentes y el
    // navegador, y este módulo lo importan los `index.tsx` de los cuartos
    // (ciclo de importación si fuera estático).
    try {
      const { nodosVistas } = await import('./grafoVistas')
      return [...deApps, ...(await nodosVistas(deApps))]
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[MPH] nodos de las vistas del chat', e)
      return deApps
    }
  })
  cache = { hasta: Date.now() + 30_000, nodos }
  return nodos
}

function nodosDePlantillas(): Promise<NodoEntidadApp[]> {
  return Promise.all(
    plantillasTodas().map(async (p) => {
      if (!p.nodosGrafo) return []
      try {
        return (await p.nodosGrafo()).map(
          (n): NodoEntidadApp => ({
            ref: refNodo(n.tipo, n.uid),
            tipo: n.tipo,
            titulo: n.titulo,
            appId: n.appId ?? p.id,
            resumen: n.resumen,
            alias: n.alias,
            emoji: n.emoji ?? p.icon,
            seccion: n.seccion,
            dato: n.dato,
          }),
        )
      } catch (e) {
        if (import.meta.env.DEV) console.warn(`[MPH] nodosGrafo de ${p.id}`, e)
        return []
      }
    }),
  ).then((listas) => listas.flat())
}

/**
 * Las filas que ve el usuario (sin los ejemplos de fábrica apagados) y con uid,
 * para los `nodosGrafo` de las apps. El uid lo sella el middleware del sync
 * aunque la interfaz de la tabla no lo declare.
 */
export async function filasNodo<T>(repo: { list(): Promise<T[]> }): Promise<(T & { uid: string })[]> {
  const filas = visibles(await repo.list()) as (T & { uid?: string })[]
  return filas.filter((f): f is T & { uid: string } => typeof f.uid === 'string' && f.uid !== '')
}

/** Tras un cambio que el usuario espera ver ya (p. ej. al abrir el grafo). */
export function refrescarNodosDeApps(): void {
  cache = null
}

export function nodoDeMemoria(m: Memoria): MemoriaNodo {
  return { uid: m.uid ?? '', hecho: m.hecho, roomId: m.roomId, asistenteId: m.asistenteId, creado: m.creado }
}

export interface GrafoVivo {
  /** Todas las filas, vigentes o no (el panel muestra también el historial). */
  memorias: Memoria[]
  entidades: NodoEntidadApp[]
  /** Automáticos entre memorias vigentes y cosas de las apps, más los manuales. */
  enlaces: EnlaceNodo[]
  /** Aún no llegan los nodos de las apps. */
  cargando: boolean
}

/**
 * El grafo vivo para la UI: se recalcula cuando cambian las memorias o los
 * enlaces manuales. Un enlace manual hacia algo que ya no existe (una receta
 * borrada) se ignora aquí: nunca se dibuja colgando.
 */
export function useGrafo(): GrafoVivo {
  const memorias = memoriasRepo.useAll() ?? VACIO
  const manuales = enlacesGrafoRepo.useAll() ?? VACIO
  const [entidades, setEntidades] = useState<NodoEntidadApp[] | null>(null)

  useEffect(() => {
    let vivo = true
    void nodosDeApps().then((n) => {
      if (vivo) setEntidades(n)
    })
    return () => {
      vivo = false
    }
  }, [memorias])

  const enlaces = useMemo(() => {
    const vigentes = memorias.filter((m) => m.vigente && m.uid).map(nodoDeMemoria)
    const cosas = entidades ?? VACIO
    const existe = new Set<RefNodo>([
      ...vigentes.map((m) => refMemoria(m.uid)),
      ...cosas.map((e) => e.ref),
      ...cosas.flatMap((e) => (e.appId ? [refApp(e.appId)] : [])),
      ...vigentes.flatMap((m) => (m.roomId ? [refApp(m.roomId)] : [])),
    ])
    const hechosAMano = manuales
      .map((e): EnlaceNodo => ({ desde: e.desde as RefNodo, hacia: e.hacia as RefNodo, manual: true }))
      .filter((e) => existe.has(e.desde) && existe.has(e.hacia))
    return [...enlacesImplicitos(vigentes, cosas), ...hechosAMano]
  }, [memorias, manuales, entidades])

  return { memorias, entidades: entidades ?? VACIO, enlaces, cargando: entidades === null }
}

/** Los nodos unidos a `ref` por un enlace directo, con si el enlace es manual. */
export function conexionesDe(ref: RefNodo, enlaces: readonly EnlaceNodo[]): { ref: RefNodo; manual: boolean }[] {
  const vistos = new Map<RefNodo, boolean>()
  for (const e of enlaces) {
    const otro = e.desde === ref ? e.hacia : e.hacia === ref ? e.desde : null
    if (otro) vistos.set(otro, (vistos.get(otro) ?? false) || e.manual === true)
  }
  return [...vistos].map(([r, manual]) => ({ ref: r, manual }))
}

/**
 * La vista de grafo a pantalla completa (se monta en la raíz de `App`). Cada
 * vista del chat la abre acotada a lo suyo (`ambito`); `null` = todo.
 */
export const useVistaGrafo = create<{
  abierto: boolean
  /** Nodo que se enfoca al abrir (desde un chip «Conectado con»). */
  foco: RefNodo | null
  ambito: AmbitoGrafo | null
  /** Sube en cada apertura: reabrirlo con otro ámbito remonta el overlay. */
  vez: number
  abrir: (foco?: RefNodo, ambito?: AmbitoGrafo | null) => void
  cerrar: () => void
}>((set) => ({
  abierto: false,
  foco: null,
  ambito: 'asistentes',
  vez: 0,
  abrir: (foco, ambito) => {
    refrescarNodosDeApps()
    set((s) => ({
      abierto: true,
      foco: foco ?? null,
      ambito: ambito === undefined ? (foco ? null : 'asistentes') : ambito,
      vez: s.vez + 1,
    }))
  },
  cerrar: () => set({ abierto: false, foco: null }),
}))
