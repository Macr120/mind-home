/**
 * Recursos del Studio (audio, arte y escritura) que otras apps pueden traer
 * como material — hoy, el panel de medios del Studio de video. Mismo patrón
 * que `materialApps.ts`: los cuartos no se importan entre sí, así que cada uno
 * registra su proveedor desde su `index.tsx` (módulo eager) y aquí solo vive
 * un mapa colgado de `globalThis` (sobrevive a la recarga en caliente y a un
 * chunk duplicado). Lo pesado (renderizar una canción, decodificar) va con
 * `import()` dentro del proveedor para no engordar el arranque.
 */

export type AppStudio = 'audio' | 'arte' | 'escritura'
type TipoRecurso = 'audio' | 'imagen' | 'texto'

export interface RecursoStudio {
  /** Única dentro de su app ('proyecto:12', 'grab:3', 'dibujo:7', 'doc:9'…). */
  clave: string
  tipo: TipoRecurso
  nombre: string
  /** Línea secundaria ya traducida («Canción · 0:32», «1280×720», «320 palabras»). */
  detalle?: string
  /** Subgrupo dentro de la app (canciones / grabaciones / tu música; el libro), ya traducido. */
  grupo?: string
  miniatura?: Blob
  /** Segundos (audio) o estimación de lectura (texto): la sombra del arrastre la necesita antes de materializar. */
  duracion?: number
  /** Cambia cuando cambia el recurso: quien lo copió sabe si su copia quedó vieja. */
  actualizadoEn: string
}

export type ContenidoRecurso =
  | { tipo: 'audio' | 'imagen'; blob: Blob; nombre: string; duracion?: number; ancho?: number; alto?: number; miniatura?: Blob }
  | { tipo: 'texto'; texto: string; nombre: string }

export interface ProveedorRecursos {
  app: AppStudio
  listar(): Promise<RecursoStudio[]>
  /** Materializa el recurso (render, decodificación, texto plano); null si ya no existe. */
  obtener(clave: string): Promise<ContenidoRecurso | null>
}

export const APPS_STUDIO: AppStudio[] = ['audio', 'arte', 'escritura']

const GLOBAL = globalThis as { __mhProveedoresRecursos?: Map<AppStudio, ProveedorRecursos> }
const PROVEEDORES = (GLOBAL.__mhProveedoresRecursos ??= new Map<AppStudio, ProveedorRecursos>())

export function registrarProveedorRecursos(p: ProveedorRecursos): void {
  PROVEEDORES.set(p.app, p)
}

export function proveedorRecursos(app: AppStudio): ProveedorRecursos | undefined {
  return PROVEEDORES.get(app)
}
