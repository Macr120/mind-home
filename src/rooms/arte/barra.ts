import type { HerramientaArte } from './lienzo'

/**
 * La barra de herramientas del editor de arte a gusto del usuario: el orden de
 * los grupos y qué herramienta va en cada uno se arrastran (gesto de la casa,
 * `core/ui/comun/arrastre.tsx`) y se guardan en localStorage. Es preferencia
 * de la PERSONA (como el idioma o el HUD), no de la casa: sin `claveLS`.
 */

export type GrupoBarra = 'pintar' | 'formas' | 'objetos' | 'lienzo' | 'color' | 'historial'

/** Cada botón de la barra. Las herramientas del lienzo más las acciones. */
export type HerrBarra =
  | HerramientaArte
  | 'foto'
  | 'separar'
  | 'capas'
  | 'tamano'
  | 'ayudas'
  | 'filtros'
  | 'png'
  | 'deshacer'
  | 'rehacer'
  | 'limpiar'

export interface Barra {
  grupos: GrupoBarra[]
  /** Herramientas de cada grupo, en orden. «color» va vacío: su contenido (grosores y paleta) es fijo. */
  herr: Record<GrupoBarra, HerrBarra[]>
}

export const BARRA_DEFECTO: Barra = {
  grupos: ['pintar', 'formas', 'objetos', 'lienzo', 'color', 'historial'],
  herr: {
    pintar: ['pincel', 'spray', 'borrador', 'relleno', 'gotero'],
    formas: ['linea', 'rect', 'elipse', 'compas', 'texto'],
    objetos: ['mover', 'foto', 'separar', 'capas'],
    lienzo: ['tamano', 'ayudas', 'filtros', 'png'],
    color: [],
    historial: ['deshacer', 'rehacer', 'limpiar'],
  },
}

const LS_BARRA = 'mh.arte.barra'

const GRUPOS = new Set<string>(BARRA_DEFECTO.grupos)
/** Grupo de fábrica de cada herramienta (a donde vuelve la que se quede sin sitio). */
const GRUPO_DE = new Map<string, GrupoBarra>()
for (const g of BARRA_DEFECTO.grupos) for (const h of BARRA_DEFECTO.herr[g]) GRUPO_DE.set(h, g)

/**
 * La barra guardada, saneada: grupos desconocidos o repetidos fuera, los que
 * falten al final; herramientas desconocidas fuera, repetidas solo la primera,
 * y las que falten (las nuevas de una versión posterior) a su grupo de fábrica.
 */
export function cargarBarra(): Barra {
  let crudo: unknown = null
  try {
    crudo = JSON.parse(localStorage.getItem(LS_BARRA) ?? 'null')
  } catch {
    /* JSON corrupto: se vuelve a la de fábrica */
  }
  const guardada = (crudo ?? {}) as Partial<Barra>
  const grupos: GrupoBarra[] = []
  for (const g of Array.isArray(guardada.grupos) ? guardada.grupos : []) {
    if (GRUPOS.has(g) && !grupos.includes(g)) grupos.push(g)
  }
  for (const g of BARRA_DEFECTO.grupos) if (!grupos.includes(g)) grupos.push(g)

  const herr = Object.fromEntries(grupos.map((g) => [g, [] as HerrBarra[]])) as Record<GrupoBarra, HerrBarra[]>
  const puestas = new Set<HerrBarra>()
  for (const g of grupos) {
    if (g === 'color') continue
    const lista = guardada.herr?.[g]
    for (const h of Array.isArray(lista) ? lista : []) {
      if (GRUPO_DE.has(h) && !puestas.has(h)) {
        herr[g].push(h)
        puestas.add(h)
      }
    }
  }
  for (const [h, g] of GRUPO_DE) if (!puestas.has(h as HerrBarra)) herr[g].push(h as HerrBarra)
  return { grupos, herr }
}

export function guardarBarra(barra: Barra): void {
  localStorage.setItem(LS_BARRA, JSON.stringify(barra))
}

export const esBarraDefecto = (barra: Barra): boolean => JSON.stringify(barra) === JSON.stringify(BARRA_DEFECTO)

/** Dónde cae lo que va en la mano. */
export type DestinoBarra =
  /** Un grupo entero, antes o después de otro grupo. */
  | { tipo: 'grupo'; grupo: GrupoBarra; despues: boolean }
  /** Una herramienta, antes o después de otra (de cualquier grupo). */
  | { tipo: 'herr'; herr: HerrBarra; despues: boolean }
  /** Una herramienta, al final de un grupo (se soltó sobre su cabecera o su hueco). */
  | { tipo: 'fin'; grupo: GrupoBarra }

export function moverGrupo(barra: Barra, grupo: GrupoBarra, destino: { grupo: GrupoBarra; despues: boolean }): Barra {
  const grupos = barra.grupos.filter((g) => g !== grupo)
  // El índice del destino se busca DESPUÉS de sacar el grupo: si venía de antes, todo se corrió.
  const i = grupos.indexOf(destino.grupo)
  if (i < 0) return barra
  grupos.splice(destino.despues ? i + 1 : i, 0, grupo)
  return { ...barra, grupos }
}

export function moverHerr(barra: Barra, herr: HerrBarra, destino: DestinoBarra): Barra {
  if (destino.tipo === 'grupo') return barra
  const nuevo = Object.fromEntries(
    barra.grupos.map((g) => [g, barra.herr[g].filter((h) => h !== herr)]),
  ) as Record<GrupoBarra, HerrBarra[]>
  if (destino.tipo === 'fin') {
    if (destino.grupo === 'color') return barra
    nuevo[destino.grupo].push(herr)
  } else {
    const grupo = barra.grupos.find((g) => nuevo[g].includes(destino.herr))
    if (!grupo) return barra
    const i = nuevo[grupo].indexOf(destino.herr)
    nuevo[grupo].splice(destino.despues ? i + 1 : i, 0, herr)
  }
  return { ...barra, herr: nuevo }
}
