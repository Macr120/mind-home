import { esVehiculo } from '../house/vehiculos'
import {
  TIPO_CUADRO_FOTO,
  TIPO_ESPEJO,
  esAnuncio,
  grupoFx,
} from '../house/especiales'
import { esEspecialPlantilla } from '../house/especialesPlantillaMeta'
import type { NombreIcono } from './iconos/catalogo'

/**
 * El nivel de arriba del Inventario: las carpetas (categorías) se reparten en
 * unas pocas carpetas superiores. Con ~90 objetos la lista plana ya no se leía.
 *
 * Dos repartos distintos, uno por sub-pestaña:
 *   - «Objetos» agrupa por QUÉ es la cosa (casa, arquitectura) y añade dos
 *     carpetas de enlace (ropa y animales) que llevan a donde eso ya se edita.
 *   - «Objetos especiales» agrupa por EL EFECTO que tienen: es lo que los hace
 *     especiales, y sale de lo que el código ya sabe (`grupoFx`, `esAnuncio`,
 *     `esVehiculo`, `esEspecialPlantilla`), no de una lista aparte.
 *
 * Las categorías siguen siendo la fuente: nada se renombra ni se migra, esto
 * solo las lee para decidir bajo qué carpeta se pintan.
 */

/** Carpetas que viven en la sub-pestaña «Objetos especiales», no en «Objetos». */
export const CATS_ESPECIALES = [
  'Pistolas',
  'Vehículos',
  'Cuadro y espejo',
  'Fuentes',
  'Parque',
  'Luces',
  'Anuncios',
  'Principales',
]

export interface GrupoInventario {
  id: string
  /** Rótulo en español; su clave de i18n es `inv.grupo.<id>`. */
  nombre: string
  /** Icono del catálogo (`ui/iconos`); un emoji crudo no seguiría el tema. */
  icono: NombreIcono
}

// ----- Sub-pestaña «Objetos» -----

export const GRUPO_MOBILIARIO = 'mobiliario'
export const GRUPO_CASA = 'casa'
export const GRUPO_ROPA = 'ropa'
export const GRUPO_ANIMALES = 'animales'

export const GRUPOS_OBJETOS: GrupoInventario[] = [
  { id: GRUPO_MOBILIARIO, nombre: 'Mobiliario', icono: 'sofa' },
  { id: GRUPO_CASA, nombre: 'Casa', icono: 'casa' },
  { id: GRUPO_ROPA, nombre: 'Ropa', icono: 'ropa' },
  { id: GRUPO_ANIMALES, nombre: 'Animales', icono: 'animal' },
]

/**
 * Carpeta superior de una categoría. TODO lo que se coloca en un cuarto es
 * mobiliario (la vegetación incluida: una maceta se pone y se quita como una
 * silla). «Casa» ya no agrupa categorías: es la construcción de la casa —
 * muros, puertas, ventanas y pisos— y esa la arma `catalogoCasa`.
 */
export function grupoDeCategoria(_categoria: string): string {
  return GRUPO_MOBILIARIO
}

/** Las carpetas retiradas viven en el catálogo de recursos: ver `recursos.ts`. */
export { CATS_RETIRADAS } from '../house/recursos'

// ----- Sub-pestaña «Objetos especiales» -----

export const GRUPOS_ESPECIALES: GrupoInventario[] = [
  { id: 'agua', nombre: 'Agua', icono: 'olas' },
  { id: 'luz', nombre: 'Luz y fuego', icono: 'foco' },
  { id: 'movimiento', nombre: 'Se mueven solos', icono: 'repetir' },
  { id: 'conducir', nombre: 'Se conducen', icono: 'auto' },
  { id: 'disparar', nombre: 'Se disparan', icono: 'objetivo' },
  { id: 'reflejo', nombre: 'Reflejo e imagen', icono: 'espejo' },
]

/** Reparto de las carpetas de fábrica; sirve también si están vacías. */
const GRUPO_POR_CATEGORIA_ESPECIAL: Record<string, string> = {
  Fuentes: 'agua',
  Luces: 'luz',
  Anuncios: 'luz',
  Parque: 'movimiento',
  Principales: 'movimiento',
  Vehículos: 'conducir',
  Pistolas: 'disparar',
  'Cuadro y espejo': 'reflejo',
}

/** El efecto de un objeto especial, deducido de su tipo. */
function grupoEspecialDeTipo(tipo: string): string {
  if (esVehiculo(tipo)) return 'conducir'
  if (tipo === TIPO_CUADRO_FOTO || tipo === TIPO_ESPEJO) return 'reflejo'
  if (esAnuncio(tipo)) return 'luz'
  const fx = grupoFx(tipo)
  if (fx === 'agua') return 'agua'
  if (fx === 'luz') return 'luz'
  if (fx === 'juego' || esEspecialPlantilla(tipo)) return 'movimiento'
  return 'disparar' // las pistolas son recursos normales: no hay guard que las delate
}

/**
 * Carpeta superior de una carpeta de especiales. Manda el nombre de fábrica; si
 * la renombraste, se deduce del tipo de lo que guarda (así renombrarla no la
 * manda a un cajón raro).
 */
export function grupoDeCategoriaEspecial(categoria: string, tipos: string[]): string {
  const fijo = GRUPO_POR_CATEGORIA_ESPECIAL[categoria]
  if (fijo) return fijo
  return tipos.length > 0 ? grupoEspecialDeTipo(tipos[0]) : 'movimiento'
}
