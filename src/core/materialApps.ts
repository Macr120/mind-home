import type { ComponentType } from 'react'
import type { TipoMaterial } from './data/db'
import { abrirApp } from './abrirApp'

/**
 * El campo del enlace que guarda el id, según el tipo (ver `MaterialEntrada` en
 * `db.ts`). Vive aquí porque lo necesitan los dos lados: la entrada que enlaza
 * material y el material que quiere saber a qué entradas pertenece.
 */
export const CAMPO_ID_MATERIAL: Record<TipoMaterial, 'hojaId' | 'mapaId' | 'ideaId'> = {
  hoja: 'hojaId',
  mapa: 'mapaId',
  idea: 'ideaId',
}

/** Lo que se está estudiando, para que la IA genere material a la medida. */
export interface ContextoMaterial {
  /** Título de la entrada. */
  titulo: string
  /** Su resumen y puntos clave, en texto plano. */
  texto: string
}

/**
 * Puente para que una app enlace material de OTRA sin importarla.
 *
 * Los cuartos no se importan entre sí (regla dura de CLAUDE.md) y `core` no
 * puede importar cuartos, así que se invierte la dependencia: cada app se
 * apunta desde su propio `rooms/<id>/index.tsx` —que es eager y lo carga
 * `registry.ts`— y quien necesita material pregunta aquí.
 *
 * Consecuencia buena: si una app no está (o su módulo falló al cargar), su
 * proveedor no existe y quien pregunta simplemente no ofrece esa opción. Nadie
 * se rompe por un cuarto que no está construido.
 */
export interface ProveedorMaterial {
  tipo: TipoMaterial
  /** Id de la plantilla dueña ('computo', 'ideas'). */
  appId: string
  /** Sección a la que saltar al abrir el material. */
  seccion: string
  /** Crea el recurso vacío y devuelve su id. */
  crear: (nombre: string) => Promise<number>
  /** Nombre actual del recurso, o null si ya no existe. */
  nombre: (id: number) => Promise<string | null>
  /** Los recursos que ya tienes, para enlazar uno existente. */
  listar: () => Promise<{ id: number; nombre: string }[]>
  /**
   * Crea el recurso CON IA a partir de lo que dice la entrada. Ausente = ese
   * tipo no se puede generar (la hoja de cálculo, por ejemplo) y solo se ofrece
   * crearlo vacío o enlazar uno existente. LANZA con el motivo real.
   */
  generar?: (ctx: ContextoMaterial) => Promise<{ id: number; nombre: string }>
  /**
   * Vista previa embebida del recurso, para verlo sin salir de la entrada. El
   * componente vive en el cuarto dueño y se registra en diferido (`lazy`): la
   * biblioteca no importa nada de la otra app.
   */
  Vista?: ComponentType<{ id: number }>
}

/**
 * El registro cuelga de `globalThis` y no de una variable de módulo: si este
 * archivo llega a evaluarse dos veces (recarga en caliente durante el
 * desarrollo, o un chunk duplicado), las dos copias comparten el mismo mapa. Si
 * no, la segunda arrancaría VACÍA y el material desaparecería sin dar ningún
 * error — que es el peor fallo posible para algo que degrada en silencio.
 */
const GLOBAL = globalThis as { __mhProveedoresMaterial?: Map<TipoMaterial, ProveedorMaterial> }
const PROVEEDORES = (GLOBAL.__mhProveedoresMaterial ??= new Map<TipoMaterial, ProveedorMaterial>())

export function registrarProveedorMaterial(p: ProveedorMaterial): void {
  PROVEEDORES.set(p.tipo, p)
}

export function proveedorMaterial(tipo: TipoMaterial): ProveedorMaterial | undefined {
  return PROVEEDORES.get(tipo)
}

/** Los tipos de material que hoy se pueden enlazar, en orden de menú. */
export function tiposMaterialDisponibles(): TipoMaterial[] {
  return (['hoja', 'mapa', 'idea'] as const).filter((x) => PROVEEDORES.has(x))
}

/**
 * Salta a la app dueña con el recurso ya seleccionado. Devuelve false si la app
 * no tiene ningún objeto en la casa (nada que abrir), para que quien llame
 * pueda explicarlo en vez de no hacer nada.
 */
export function abrirMaterial(tipo: TipoMaterial, id: number): boolean {
  const p = PROVEEDORES.get(tipo)
  if (!p) return false
  return abrirApp(p.appId, p.seccion, String(id)) != null
}
