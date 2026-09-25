/**
 * El modelo de la vista de Archivo: dónde está el usuario (`Ubicacion`), qué se
 * pinta (`Item`) y a dónde se puede soltar algo (`data-destino`).
 *
 * Tres clases de cosas conviven en la vista:
 * - carpetas y archivos de la nube (filas reales: se seleccionan, arrastran,
 *   renombran, mueven y van a la papelera);
 * - carpetas VIRTUALES: los cuartos, las fuentes de una app («Fotos de
 *   recetas») y las apps sin cuarto; solo se abren (y los cuartos reciben lo soltado);
 * - elementos de las apps (`ElementoApp`): de solo lectura.
 */
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ArchivoNube, CarpetaArchivo, Cuarto } from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { useCuartos } from '../../core/state/cuartosStore'
import { useDiseño } from '../../core/state/disenoStore'
import { useNombreCuarto } from '../../core/ui/roomDisplay'
import { FUENTES, type ElementoApp } from './fuentes'

export type Ubicacion =
  | { tipo: 'mia'; carpetaId: number | null }
  | { tipo: 'cuartos' }
  /** `carpetaId` null = la raíz del cuarto; `fuente` = una de las carpetas de su app. */
  | { tipo: 'cuarto'; cuartoId: string; carpetaId: number | null; fuente?: string }
  | { tipo: 'otras'; appId?: string; fuente?: string }
  | { tipo: 'recientes' }
  | { tipo: 'destacados' }
  | { tipo: 'papelera' }

export type Item =
  | { k: string; tipo: 'carpeta'; carpeta: CarpetaArchivo; n: number }
  | { k: string; tipo: 'archivo'; archivo: ArchivoNube }
  | { k: string; tipo: 'virtual'; nombre: string; icono: NombreIcono; ir: Ubicacion; n?: number; destino?: string; cuarto?: Cuarto }
  | { k: string; tipo: 'app'; elem: ElementoApp }

export const nombreDe = (i: Item): string =>
  i.tipo === 'carpeta' ? i.carpeta.nombre : i.tipo === 'archivo' ? i.archivo.nombre : i.tipo === 'app' ? i.elem.nombre : i.nombre

export const fechaDe = (i: Item): string =>
  i.tipo === 'carpeta' ? i.carpeta.creadoEn : i.tipo === 'archivo' ? i.archivo.creadoEn : i.tipo === 'app' ? i.elem.creadoEn : ''

export const bytesDe = (i: Item): number => (i.tipo === 'archivo' ? i.archivo.bytes : i.tipo === 'app' ? i.elem.bytes : 0)

/** Solo las filas reales se seleccionan y se arrastran. */
export const esReal = (i: Item): i is Extract<Item, { tipo: 'carpeta' | 'archivo' }> => i.tipo === 'carpeta' || i.tipo === 'archivo'

export type Orden = { por: 'nombre' | 'fecha' | 'tamano'; asc: boolean }

/** Grupos siempre en este orden (virtuales, carpetas, archivos); dentro, el criterio elegido. */
export function ordenar(items: Item[], orden: Orden): Item[] {
  const grupo = (i: Item) => (i.tipo === 'virtual' ? 0 : i.tipo === 'carpeta' ? 1 : 2)
  const signo = orden.asc ? 1 : -1
  return [...items].sort((a, b) => {
    const g = grupo(a) - grupo(b)
    if (g) return g
    if (orden.por === 'fecha') return signo * fechaDe(a).localeCompare(fechaDe(b))
    if (orden.por === 'tamano') return signo * (bytesDe(a) - bytesDe(b))
    return signo * nombreDe(a).localeCompare(nombreDe(b), undefined, { numeric: true, sensitivity: 'base' })
  })
}

/** Sin acentos ni mayúsculas, para el buscador. */
export const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Destinos de soltar (`data-destino`). */
export const DESTINO_MIA = 'mia'
export const DESTINO_PAPELERA = 'papelera'
export const DESTINO_DESTACADOS = 'destacados'
export const destinoCarpeta = (id: number) => `carpeta:${id}`
export const destinoCuarto = (id: string) => `cuarto:${id}`

export interface CuartoArchivo {
  cuarto: Cuarto
  nombre: string
  appId?: string
}

/**
 * Los cuartos de la casa, en el orden del panel de acceso rápido, con su app
 * (la primera, como el menú lateral). El propio cuarto de Archivo no sale: su
 * carpeta es «Mi Archivo».
 */
export function useCuartosArchivo(): CuartoArchivo[] {
  const cuartos = useCuartos((s) => s.cuartos)
  const nombreCuarto = useNombreCuarto()
  const appPorCuarto = useDiseño(
    useShallow((s) => {
      const m: Record<string, string> = {}
      for (const o of s.objetos) if (o.plantillaId && !(o.roomId in m)) m[o.roomId] = o.plantillaId
      return m
    }),
  )
  return useMemo(
    () =>
      cuartos
        .map((c, i) => ({ c, k: c.ordenPanel ?? cuartos.length + i }))
        .sort((a, b) => a.k - b.k)
        .map(({ c }) => ({ cuarto: c, nombre: nombreCuarto(c), appId: appPorCuarto[c.id] }))
        .filter((c) => c.appId !== 'archivos'),
    [cuartos, nombreCuarto, appPorCuarto],
  )
}

/** Apps con archivos propios que no están en ningún cuarto: su contenido va a «Otras apps». */
export const appsSinCuarto = (cuartos: CuartoArchivo[]): string[] =>
  Object.keys(FUENTES).filter((a) => !cuartos.some((c) => c.appId === a))
