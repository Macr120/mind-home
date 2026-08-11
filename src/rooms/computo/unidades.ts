import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Las unidades que ofrece el conversor, por categorías.
 *
 * La CUENTA la hace mathjs (`5 km to mile`), que trae el sistema entero y ya
 * está en el cuarto: aquí solo se elige qué enseñar y cómo llamarlo. Cada `u`
 * está comprobada contra la versión de mathjs instalada — escribir un símbolo
 * que no existe no falla al compilar, falla en la cara del usuario.
 *
 * La temperatura funciona igual que las demás aunque no sea un factor sino un
 * desplazamiento: mathjs lo resuelve solo (100 degC → 212 degF).
 *
 * Este archivo son SOLO DATOS. No puede importar el motor: lo leen la tira de
 * categorías y los comandos del chat, y ninguno debe arrastrar mathjs.
 */

export interface Unidad {
  /** Símbolo tal cual lo entiende mathjs. */
  u: string
  /** Trozo de clave i18n (los símbolos llevan `^` y `/`, que no valen). */
  clave: string
  labelEs: string
}

export interface CategoriaUnidad {
  id: string
  icono: NombreIcono
  labelEs: string
  /** Par que se ofrece de entrada, el más habitual de la categoría. */
  de: string
  a: string
  unidades: Unidad[]
}

export const CATEGORIAS: CategoriaUnidad[] = [
  {
    id: 'longitud',
    icono: 'regla',
    labelEs: 'Longitud',
    de: 'km',
    a: 'mile',
    unidades: [
      { u: 'km', clave: 'km', labelEs: 'kilómetros' },
      { u: 'm', clave: 'm', labelEs: 'metros' },
      { u: 'cm', clave: 'cm', labelEs: 'centímetros' },
      { u: 'mm', clave: 'mm', labelEs: 'milímetros' },
      { u: 'mile', clave: 'mile', labelEs: 'millas' },
      { u: 'yd', clave: 'yd', labelEs: 'yardas' },
      { u: 'ft', clave: 'ft', labelEs: 'pies' },
      { u: 'inch', clave: 'inch', labelEs: 'pulgadas' },
    ],
  },
  {
    id: 'masa',
    icono: 'balanza',
    labelEs: 'Masa',
    de: 'kg',
    a: 'lb',
    unidades: [
      { u: 'tonne', clave: 'tonne', labelEs: 'toneladas' },
      { u: 'kg', clave: 'kg', labelEs: 'kilogramos' },
      { u: 'g', clave: 'g', labelEs: 'gramos' },
      { u: 'mg', clave: 'mg', labelEs: 'miligramos' },
      { u: 'lb', clave: 'lb', labelEs: 'libras' },
      { u: 'oz', clave: 'oz', labelEs: 'onzas' },
    ],
  },
  {
    id: 'temperatura',
    icono: 'brillo',
    labelEs: 'Temperatura',
    de: 'degC',
    a: 'degF',
    unidades: [
      { u: 'degC', clave: 'degC', labelEs: 'grados Celsius' },
      { u: 'degF', clave: 'degF', labelEs: 'grados Fahrenheit' },
      { u: 'K', clave: 'K', labelEs: 'kelvin' },
    ],
  },
  {
    id: 'volumen',
    icono: 'tazon',
    labelEs: 'Volumen',
    de: 'L',
    a: 'gal',
    unidades: [
      { u: 'm^3', clave: 'm3', labelEs: 'metros cúbicos' },
      { u: 'L', clave: 'L', labelEs: 'litros' },
      { u: 'mL', clave: 'mL', labelEs: 'mililitros' },
      { u: 'gal', clave: 'gal', labelEs: 'galones' },
      { u: 'qt', clave: 'qt', labelEs: 'cuartos de galón' },
      { u: 'pt', clave: 'pt', labelEs: 'pintas' },
      { u: 'cup', clave: 'cup', labelEs: 'tazas' },
      { u: 'floz', clave: 'floz', labelEs: 'onzas líquidas' },
    ],
  },
  {
    id: 'area',
    icono: 'plano',
    labelEs: 'Área',
    de: 'm^2',
    a: 'sqft',
    unidades: [
      { u: 'km^2', clave: 'km2', labelEs: 'kilómetros cuadrados' },
      { u: 'm^2', clave: 'm2', labelEs: 'metros cuadrados' },
      { u: 'cm^2', clave: 'cm2', labelEs: 'centímetros cuadrados' },
      { u: 'hectare', clave: 'hectare', labelEs: 'hectáreas' },
      { u: 'acre', clave: 'acre', labelEs: 'acres' },
      { u: 'sqft', clave: 'sqft', labelEs: 'pies cuadrados' },
      { u: 'sqmi', clave: 'sqmi', labelEs: 'millas cuadradas' },
    ],
  },
  {
    id: 'tiempo',
    icono: 'cronometro',
    labelEs: 'Tiempo',
    de: 'hour',
    a: 'minute',
    unidades: [
      { u: 'year', clave: 'year', labelEs: 'años' },
      { u: 'month', clave: 'month', labelEs: 'meses' },
      { u: 'week', clave: 'week', labelEs: 'semanas' },
      { u: 'day', clave: 'day', labelEs: 'días' },
      { u: 'hour', clave: 'hour', labelEs: 'horas' },
      { u: 'minute', clave: 'minute', labelEs: 'minutos' },
      { u: 's', clave: 's', labelEs: 'segundos' },
      { u: 'ms', clave: 'ms', labelEs: 'milisegundos' },
    ],
  },
  {
    id: 'velocidad',
    icono: 'auto',
    labelEs: 'Velocidad',
    de: 'km/h',
    a: 'mi/h',
    unidades: [
      { u: 'km/h', clave: 'kmh', labelEs: 'kilómetros por hora' },
      { u: 'mi/h', clave: 'mih', labelEs: 'millas por hora' },
      { u: 'm/s', clave: 'ms1', labelEs: 'metros por segundo' },
      { u: 'ft/s', clave: 'fts', labelEs: 'pies por segundo' },
    ],
  },
  {
    id: 'datos',
    icono: 'chip',
    labelEs: 'Datos',
    de: 'GB',
    a: 'MB',
    unidades: [
      { u: 'TB', clave: 'TB', labelEs: 'terabytes' },
      { u: 'GB', clave: 'GB', labelEs: 'gigabytes' },
      { u: 'MB', clave: 'MB', labelEs: 'megabytes' },
      { u: 'kB', clave: 'kB', labelEs: 'kilobytes' },
      { u: 'B', clave: 'B', labelEs: 'bytes' },
      { u: 'b', clave: 'b', labelEs: 'bits' },
      { u: 'GiB', clave: 'GiB', labelEs: 'gibibytes' },
      { u: 'MiB', clave: 'MiB', labelEs: 'mebibytes' },
      { u: 'KiB', clave: 'KiB', labelEs: 'kibibytes' },
    ],
  },
]
