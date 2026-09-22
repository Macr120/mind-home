/**
 * Catálogo de precios de fábrica del taller: los materiales con los que se
 * estrena el cotizador. NO son un «catálogo del sistema» aparte — son filas del
 * usuario como cualquier otra, editables y borrables una a una, porque los
 * precios de un tablero cambian por país, por proveedor y por mes.
 *
 * EXCEPCIÓN A LA REGLA 1 DE CLAUDE.md (las apps no importan `db`): se escribe
 * con `db` directo y no por repo porque `repository.add` sella
 * `updatedAt: Date.now()` y pisaría el `updatedAt: 1` de `filaSeed`. Ese 1 es lo
 * que hace que la edición real de otro dispositivo gane siempre por LWW y que
 * `sync/motor.ts` pueda borrar las semillas vírgenes que el servidor no conoce.
 * Mismo motivo y mismo patrón que `rooms/computo/siembra.ts`.
 */
import { db, type MaterialTaller } from '../data/db'
import { filaSeed } from '../data/sync/syncables'
import { claveLS, esVisita } from '../edicion'
import { tGlobal } from '../i18n/useT'
import { TABLERO_ESTANDAR } from './materiales'

let sembrado = false

/** Bandera versionada: subir la versión añade lo nuevo sin repetir lo viejo. */
const LS_CATALOGO = claveLS('muebles.catalogoSembrado')
const VERSION_CATALOGO = '1'

type FilaFabrica = Omit<MaterialTaller, 'id' | 'creadoEn' | 'uid'>

/**
 * Precios orientativos de mercado (MXN, 2026). El usuario los ajusta a los de
 * su proveedor: lo que importa es que el cotizador arranque con algo creíble en
 * vez de con una tabla vacía.
 */
export function catalogoFabrica(): FilaFabrica[] {
  const hoja = { hojaAncho: TABLERO_ESTANDAR.ancho, hojaAlto: TABLERO_ESTANDAR.alto }
  const tablero = (
    clave: string,
    nombre: string,
    materialId: MaterialTaller['materialId'],
    grosor: number,
    precio: number,
    orden: number,
  ): FilaFabrica => ({
    clave,
    tipo: 'tablero',
    nombre: tGlobal(`muebles.mat.seed.${clave}`, nombre),
    orden,
    activo: true,
    precio,
    unidad: 'hoja',
    materialId,
    grosor,
    ...hoja,
  })

  const canto = (clave: string, nombre: string, cintaMm: number, precio: number, orden: number): FilaFabrica => ({
    clave,
    tipo: 'canto',
    nombre: tGlobal(`muebles.mat.seed.${clave}`, nombre),
    orden,
    activo: true,
    precio,
    unidad: 'ml',
    cintaMm,
  })

  const tubo = (
    clave: string,
    nombre: string,
    tuboId: MaterialTaller['tuboId'],
    seccion: number[],
    pared: number,
    precio: number,
    orden: number,
  ): FilaFabrica => ({
    clave,
    tipo: 'tubo',
    nombre: tGlobal(`muebles.mat.seed.${clave}`, nombre),
    orden,
    activo: true,
    precio,
    unidad: 'ml',
    tuboId,
    perfil: seccion.length > 1 ? 'rectangular' : 'cuadrado',
    seccion,
    pared,
    largoComercial: 6000,
  })

  const herraje = (
    clave: string,
    nombre: string,
    herrajeClave: string,
    unidad: MaterialTaller['unidad'],
    precio: number,
    orden: number,
  ): FilaFabrica => ({
    clave,
    tipo: 'herraje',
    nombre: tGlobal(`muebles.mat.seed.${clave}`, nombre),
    orden,
    activo: true,
    precio,
    unidad,
    herrajeClave,
  })

  const servicio = (
    clave: string,
    nombre: string,
    unidad: MaterialTaller['unidad'],
    precio: number,
    orden: number,
  ): FilaFabrica => ({
    clave,
    tipo: 'servicio',
    nombre: tGlobal(`muebles.mat.seed.${clave}`, nombre),
    orden,
    activo: true,
    precio,
    unidad,
  })

  return [
    tablero('tab-melamina-16', 'Melamina blanca 16 mm', 'melamina', 16, 980, 1),
    tablero('tab-melamina-18', 'Melamina blanca 18 mm', 'melamina', 18, 1150, 2),
    tablero('tab-melamina-15', 'Melamina 15 mm', 'melamina', 15, 890, 3),
    tablero('tab-mdf-15', 'MDF 15 mm', 'mdf', 15, 720, 4),
    tablero('tab-mdf-18', 'MDF 18 mm', 'mdf', 18, 860, 5),
    tablero('tab-mdf-3', 'MDF 3 mm (traseras)', 'mdf', 3, 180, 6),
    tablero('tab-mdfh-18', 'MDF hidrófugo 18 mm', 'mdf-hidrofugo', 18, 1450, 7),
    tablero('tab-aglomerado-16', 'Aglomerado 16 mm', 'aglomerado', 16, 560, 8),
    tablero('tab-triplay-18', 'Triplay 18 mm', 'triplay', 18, 890, 9),
    tablero('tab-triplay-6', 'Triplay 6 mm (traseras)', 'triplay', 6, 320, 10),
    tablero('tab-pino-18', 'Pino 18 mm', 'pino', 18, 1100, 11),
    tablero('tab-encino-19', 'Encino 19 mm', 'encino', 19, 2600, 12),

    canto('can-melamina-22', 'Canto de melamina 22 mm', 22, 12, 20),
    canto('can-melamina-19', 'Canto de melamina 19 mm', 19, 10, 21),
    canto('can-abs-22', 'Canto ABS 22 mm', 22, 18, 22),
    canto('can-abs-45', 'Canto ABS 45 mm', 45, 32, 23),

    tubo('tub-ptr-25', 'PTR acero negro 25 × 25', 'acero-negro', [25], 1.5, 62, 30),
    tubo('tub-ptr-38', 'PTR acero negro 38 × 38', 'acero-negro', [38], 1.5, 85, 31),
    tubo('tub-inox-38', 'Tubo inoxidable 38 mm', 'acero-inox', [38], 1.5, 320, 32),
    tubo('tub-aluminio-25', 'Tubo de aluminio 25 mm', 'aluminio', [25], 1.2, 140, 33),
    tubo('tub-galv-25', 'Tubo galvanizado 25 mm', 'galvanizado', [25], 1.2, 110, 34),

    herraje('her-bisagra-cazoleta', 'Bisagra de cazoleta', 'her-bisagra-cazoleta', 'pz', 28, 40),
    herraje('her-corredera', 'Corredera de 45 cm', 'her-corredera', 'par', 95, 41),
    herraje('her-tirador', 'Tirador', 'her-tirador', 'pz', 45, 42),
    herraje('her-soporte-tubo', 'Soporte de tubo', 'her-soporte-tubo', 'par', 35, 43),
    herraje('her-nivelador', 'Nivelador', 'her-nivelador', 'pz', 12, 44),
    herraje('her-rodaja', 'Rodaja con freno', 'her-rodaja', 'pz', 38, 45),
    herraje('her-riel-corredizo', 'Riel corredizo', 'her-riel-corredizo', 'juego', 420, 46),
    herraje('her-rejilla', 'Rejilla metálica', 'her-rejilla', 'pz', 210, 47),

    servicio('srv-corte', 'Servicio de corte', 'ml', 18, 50),
    servicio('srv-canto', 'Pegado de canto', 'ml', 14, 51),
    servicio('srv-mano-obra', 'Mano de obra', 'hora', 180, 52),
  ]
}

/**
 * Siembra el catálogo de precios. Idempotente por tres vías: la guardia de
 * módulo, la bandera de localStorage (que es lo que impide resucitar lo que el
 * usuario borró a propósito) y la comprobación fila a fila por `clave` (que
 * cubre «restauré un respaldo en un navegador nuevo»).
 */
export async function sembrarCatalogoTaller(): Promise<void> {
  if (sembrado) return
  sembrado = true
  // En casa ajena la bandera va con prefijo `visita:` y siempre estaría sin
  // poner: sembraría el catálogo entero en cada visita (lo descartaría el
  // guard, pero es trabajo y ruido dentro de la casa de otro).
  if (esVisita()) return
  if (localStorage.getItem(LS_CATALOGO) === VERSION_CATALOGO) return
  await reponerCatalogo()
  localStorage.setItem(LS_CATALOGO, VERSION_CATALOGO)
}

/** Añade las filas de fábrica que falten, sin tocar las que el usuario ya editó. */
export async function reponerCatalogo(): Promise<number> {
  const existentes = new Set((await db.materialesTaller.toArray()).map((m) => m.clave))
  const ahora = new Date().toISOString()
  const nuevas = catalogoFabrica()
    .filter((f) => !existentes.has(f.clave))
    .map((f) => filaSeed(`materialesTaller-${f.clave}`, { ...f, creadoEn: ahora }))
  if (nuevas.length) await db.materialesTaller.bulkAdd(nuevas as MaterialTaller[])
  return nuevas.length
}
