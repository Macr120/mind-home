/**
 * Voz neuronal de edge-tts por idioma (los 16 de `src/core/i18n/idiomas.ts`).
 * El usuario eligió voz MASCULINA para el doblaje; `alterna` es la femenina por
 * si algún idioma suena mal en el piloto. El español normalmente conserva la
 * voz real del master (solo se dobla con `--incluir-es`).
 *
 * Ver el catálogo: edge-tts --list-voices
 */
export const VOCES = {
  es: { voz: 'es-MX-JorgeNeural', alterna: 'es-MX-DaliaNeural' },
  en: { voz: 'en-US-AndrewNeural', alterna: 'en-US-AriaNeural' },
  pt: { voz: 'pt-BR-AntonioNeural', alterna: 'pt-BR-FranciscaNeural' },
  fr: { voz: 'fr-FR-HenriNeural', alterna: 'fr-FR-DeniseNeural' },
  de: { voz: 'de-DE-ConradNeural', alterna: 'de-DE-KatjaNeural' },
  it: { voz: 'it-IT-DiegoNeural', alterna: 'it-IT-IsabellaNeural' },
  ja: { voz: 'ja-JP-KeitaNeural', alterna: 'ja-JP-NanamiNeural' },
  zh: { voz: 'zh-CN-YunxiNeural', alterna: 'zh-CN-XiaoxiaoNeural' },
  ko: { voz: 'ko-KR-InJoonNeural', alterna: 'ko-KR-SunHiNeural' },
  ru: { voz: 'ru-RU-DmitryNeural', alterna: 'ru-RU-SvetlanaNeural' },
  hi: { voz: 'hi-IN-MadhurNeural', alterna: 'hi-IN-SwaraNeural' },
  tr: { voz: 'tr-TR-AhmetNeural', alterna: 'tr-TR-EmelNeural' },
  id: { voz: 'id-ID-ArdiNeural', alterna: 'id-ID-GadisNeural' },
  pl: { voz: 'pl-PL-MarekNeural', alterna: 'pl-PL-ZofiaNeural' },
  nl: { voz: 'nl-NL-MaartenNeural', alterna: 'nl-NL-FennaNeural' },
  ar: { voz: 'ar-SA-HamedNeural', alterna: 'ar-SA-ZariyahNeural' },
}

/** Los 15 idiomas destino (todos menos el español, que es el original). */
export const IDIOMAS_DESTINO = Object.keys(VOCES).filter((id) => id !== 'es')

/** Fuente Noto para quemar subtítulos según el idioma (ver marketing/video/fuentes/). */
export function fuenteDe(id) {
  if (id === 'ar') return 'Noto Naskh Arabic'
  if (id === 'ja') return 'Noto Sans JP'
  if (id === 'zh') return 'Noto Sans SC'
  if (id === 'ko') return 'Noto Sans KR'
  if (id === 'hi') return 'Noto Sans Devanagari'
  return 'Noto Sans'
}
