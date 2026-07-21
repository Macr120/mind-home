import type { TipoTarjeta } from '../../core/data/db'

export const COLOR = '#f472b6'

/** Niveles MCER, de principiante a maestría. */
export const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Días de espera por caja Leitner (0 = vuelve a entrar hoy mismo). */
export const INTERVALOS_DIAS = [0, 1, 2, 4, 8, 16, 32]
export const CAJA_MAX = INTERVALOS_DIAS.length - 1
/** Desde esta caja la tarjeta cuenta como dominada. */
export const CAJA_DOMINADA = 5

export const TIPOS_TARJETA: { id: TipoTarjeta; labelEs: string }[] = [
  { id: 'palabra', labelEs: 'Palabra' },
  { id: 'frase', labelEs: 'Frase' },
  { id: 'expresion', labelEs: 'Expresión' },
]

/** Idioma del catálogo curado (código BCP-47 correcto para la voz del navegador). */
export interface IdiomaCatalogo {
  codigo: string
  nombre: string
  bandera: string
}

export const CATALOGO_IDIOMAS: IdiomaCatalogo[] = [
  { codigo: 'en-US', nombre: 'Inglés', bandera: '🇺🇸' },
  { codigo: 'en-GB', nombre: 'Inglés británico', bandera: '🇬🇧' },
  { codigo: 'fr-FR', nombre: 'Francés', bandera: '🇫🇷' },
  { codigo: 'de-DE', nombre: 'Alemán', bandera: '🇩🇪' },
  { codigo: 'it-IT', nombre: 'Italiano', bandera: '🇮🇹' },
  { codigo: 'pt-BR', nombre: 'Portugués', bandera: '🇧🇷' },
  { codigo: 'ja-JP', nombre: 'Japonés', bandera: '🇯🇵' },
  { codigo: 'ko-KR', nombre: 'Coreano', bandera: '🇰🇷' },
  { codigo: 'zh-CN', nombre: 'Chino mandarín', bandera: '🇨🇳' },
  { codigo: 'ru-RU', nombre: 'Ruso', bandera: '🇷🇺' },
  { codigo: 'ar-SA', nombre: 'Árabe', bandera: '🇸🇦' },
  { codigo: 'nl-NL', nombre: 'Neerlandés', bandera: '🇳🇱' },
  { codigo: 'pl-PL', nombre: 'Polaco', bandera: '🇵🇱' },
  { codigo: 'sv-SE', nombre: 'Sueco', bandera: '🇸🇪' },
  { codigo: 'tr-TR', nombre: 'Turco', bandera: '🇹🇷' },
  { codigo: 'el-GR', nombre: 'Griego', bandera: '🇬🇷' },
]
