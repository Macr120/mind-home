import { callarVoz, hablarVoz, hayVoz, langVoz, vocesDisponibles } from '../../core/audio/voz'
import { puedeSintetizarArchivo } from '../../core/audio/vozArchivo'
import { callarVozIA, hablarVozIA, hayVozIA, vocesIaDisponibles } from '../../core/audio/vozIA'
import type { TFunc } from '../../core/i18n/useT'

/**
 * Las voces del Studio de video: las IA (`VOCES_IA`, con créditos) y las del
 * DISPOSITIVO (`speechSynthesis`, gratis), guardadas como `sys:<nombre>`
 * (`sys:` a secas = la del idioma de la app). Sin IA todo sigue andando con la
 * del dispositivo: muestra, «Escuchar el guion» y la narración EN VIVO del
 * preview; y donde el sistema sintetiza a archivo (shell de escritorio, app de
 * tienda: `core/audio/vozArchivo.ts`), también el audio del clip y del export.
 */

/**
 * Descriptores de las voces IA (`VOCES_IA` de core/audio/vozIA.ts) para que el
 * nombre en crudo («onyx») diga algo al elegir narrador. Los de Gemini son los
 * oficiales de Google; los de OpenAI, orientativos.
 */
const DESCRIPTORES: Record<string, [clave: string, es: string]> = {
  alloy: ['video.voz.desc.alloy', 'neutra'],
  echo: ['video.voz.desc.echo', 'masculina y clara'],
  fable: ['video.voz.desc.fable', 'expresiva, acento británico'],
  onyx: ['video.voz.desc.onyx', 'grave'],
  nova: ['video.voz.desc.nova', 'femenina y cálida'],
  shimmer: ['video.voz.desc.shimmer', 'femenina y brillante'],
  Zephyr: ['video.voz.desc.zephyr', 'luminosa'],
  Puck: ['video.voz.desc.puck', 'animada'],
  Charon: ['video.voz.desc.charon', 'informativa'],
  Kore: ['video.voz.desc.kore', 'firme'],
  Fenrir: ['video.voz.desc.fenrir', 'enérgica'],
  Leda: ['video.voz.desc.leda', 'juvenil'],
  Orus: ['video.voz.desc.orus', 'firme y grave'],
  Aoede: ['video.voz.desc.aoede', 'fresca'],
}

/** «onyx · grave»; una voz sin descriptor sale por su nombre. */
export function etiquetaVoz(t: TFunc, voz: string): string {
  const d = DESCRIPTORES[voz]
  return d ? `${voz} · ${t(d[0], d[1])}` : voz
}

export const PREFIJO_DISPOSITIVO = 'sys:'
export const esVozDispositivo = (voz?: string): boolean => !!voz && voz.startsWith(PREFIJO_DISPOSITIVO)
/** Nombre exacto de la voz del sistema; undefined = automática por el idioma de la app. */
export const nombreVozDispositivo = (voz: string): string | undefined => voz.slice(PREFIJO_DISPOSITIVO.length) || undefined
/** Una voz IA sin nadie que la sirva (clave que ya no está) se lee con la del dispositivo. */
export const usaDispositivo = (voz?: string): boolean => esVozDispositivo(voz) || !hayVozIA()

export interface OpcionVoz {
  id: string
  etiqueta: string
}
export interface GrupoVoces {
  id: 'ia' | 'dispositivo'
  etiqueta: string
  voces: OpcionVoz[]
}

/** Voces del dispositivo para el idioma de la app; `sys:` sola si el navegador no las enumera. */
function vocesDispositivo(): string[] {
  if (!hayVoz()) return []
  const lista = vocesDisponibles(langVoz()).map((v) => PREFIJO_DISPOSITIVO + v.name)
  return lista.length ? lista : [PREFIJO_DISPOSITIVO]
}

/** Ids de las voces elegibles ahora: IA si alguien la sirve, y las del dispositivo. */
export function vocesElegibles(): string[] {
  return [...(hayVozIA() ? vocesIaDisponibles() : []), ...vocesDispositivo()]
}

/** Etiqueta de cualquier voz, IA o del dispositivo. */
export function etiquetaDeVoz(t: TFunc, voz: string): string {
  if (!esVozDispositivo(voz)) return etiquetaVoz(t, voz)
  return nombreVozDispositivo(voz) ?? t('video.voz.automatica', 'Automática (idioma de la app)')
}

/** Las elegibles por grupos y con etiqueta, para los selectores. */
export function gruposVoz(t: TFunc): GrupoVoces[] {
  const grupos: GrupoVoces[] = []
  if (hayVozIA()) {
    grupos.push({
      id: 'ia',
      etiqueta: t('video.voz.grupoIA', 'Voz IA (créditos)'),
      voces: vocesIaDisponibles().map((v) => ({ id: v, etiqueta: etiquetaVoz(t, v) })),
    })
  }
  const dispositivo = vocesDispositivo()
  if (dispositivo.length) {
    grupos.push({
      id: 'dispositivo',
      etiqueta: t('video.voz.grupoDispositivo', 'Voz del dispositivo (gratis)'),
      voces: dispositivo.map((id) => ({ id, etiqueta: etiquetaDeVoz(t, id) })),
    })
  }
  return grupos
}

/** La voz tal cual si está entre las elegibles; si no, la primera (undefined si no hay ninguna). */
export function vozValida(voz: string | undefined, elegibles: string[]): string | undefined {
  return voz && elegibles.includes(voz) ? voz : elegibles[0]
}

/** ¿Con esta voz se puede dejar un ARCHIVO de audio (timeline y export)? */
export function vozDejaArchivo(voz: string | undefined): boolean {
  return usaDispositivo(voz) ? puedeSintetizarArchivo() : true
}

/** Lee un texto con la voz dada. Resuelve true si arrancó; `onFin` una sola vez al terminar. */
export function hablarConVoz(texto: string, voz: string | undefined, opts: { onFin?: () => void } = {}): Promise<boolean> {
  if (usaDispositivo(voz)) {
    const vozNombre = voz && esVozDispositivo(voz) ? nombreVozDispositivo(voz) : undefined
    return Promise.resolve(hablarVoz(texto, { vozNombre, onFin: opts.onFin }))
  }
  return hablarVozIA(texto, { voz, onFin: opts.onFin })
}

/** Corta cualquier lectura, IA o del dispositivo. */
export function callarVoces(): void {
  callarVoz()
  callarVozIA()
}
