import { tGlobal, type TFunc } from '../i18n/useT'
import { confirmar } from '../state/confirmarStore'
import type { NombreIcono } from '../ui/iconos/catalogo'
import { ErrorBuzon, TOPE_CONTENIDO } from './tipos'

/**
 * Contenido de los cuartos que se puede mandar por el buzón (una receta, una
 * rutina, un mapa…). Mismo patrón que `recursosStudio.ts`: los cuartos no se
 * importan entre sí y `core` no importa cuartos, así que cada uno registra su
 * proveedor desde su `index.tsx` (módulo eager) y aquí solo vive un mapa
 * colgado de `globalThis` (sobrevive a la recarga en caliente y a un chunk
 * duplicado). Lo pesado (empaquetar, importar) va con `import()` dentro del
 * proveedor para no engordar el arranque.
 *
 * Un id local no significa nada en la casa del receptor: el paquete lleva el
 * contenido MATERIALIZADO (`datos` + blobs), y `importar` lo crea de nuevo allá.
 */

export interface Paquete {
  app: string
  tipo: string
  version: 1
  nombre: string
  /** Línea secundaria ya traducida («4 porciones · 25 min»). */
  resumen?: string
  emoji?: string
  datos: unknown
  /** Binarios (foto, miniatura…) por clave; viajan a Storage aparte del JSON. */
  blobs?: Record<string, Blob>
  /** Alias de quien lo mandó (lo rellena el receptor al importar). */
  deAlias?: string
}

export interface ItemCompartible {
  clave: string
  nombre: string
  detalle?: string
  miniatura?: Blob
}

export interface TipoCompartible {
  tipo: string
  icono: NombreIcono
  /** «Receta», «Rutina»… ya traducido. */
  etiqueta: (t: TFunc) => string
  listar(): Promise<ItemCompartible[]>
  empaquetar(clave: string): Promise<Paquete | null>
  /**
   * Guarda en la app y dice a dónde navegar. `aviso` (ya traducido) se muestra
   * al usuario; `cancelado` = el usuario declinó (p. ej. ya existía) y no se marca como guardado.
   */
  importar(p: Paquete): Promise<{ seccion?: string; dato?: string; aviso?: string; cancelado?: boolean }>
  /** Archivos para sacarlo FUERA de la app (ver `exportar.ts`); sin él, un .txt con sus textos y fotos. */
  exportar?(p: Paquete): Promise<File[]>
}

export interface ProveedorCompartible {
  app: string
  tipos: TipoCompartible[]
}

const GLOBAL = globalThis as { __mhProveedoresCompartibles?: Map<string, ProveedorCompartible> }
const PROVEEDORES = (GLOBAL.__mhProveedoresCompartibles ??= new Map<string, ProveedorCompartible>())

export function registrarProveedorCompartible(p: ProveedorCompartible): void {
  PROVEEDORES.set(p.app, p)
}

/** En orden de registro (el de `registry.ts`). */
export function proveedoresCompartibles(): ProveedorCompartible[] {
  return Array.from(PROVEEDORES.values())
}

export function tipoCompartible(app: string, tipo: string): TipoCompartible | undefined {
  return PROVEEDORES.get(app)?.tipos.find((x) => x.tipo === tipo)
}

/** Mide `datos` serializados; el servidor rechaza más de 64 KB. */
export function validarPaquete(p: Paquete): void {
  if (JSON.stringify(p.datos ?? null).length > TOPE_CONTENIDO) throw new ErrorBuzon('contenido-grande')
}

/** Pregunta si guardar una copia cuando ya hay algo con ese nombre. */
export async function confirmarDuplicado(nombre: string): Promise<boolean> {
  return confirmar({
    titulo: tGlobal('buzon.duplicado', '«{n}» ya existe. ¿Guardar una copia de todos modos?', { n: nombre }),
    textoOk: tGlobal('buzon.guardarCopia', 'Guardar copia'),
  })
}
