import type { Plataforma } from '../../../core/redes/tipos'

/** Lo que rellena el usuario en cada formulario (valores nativos de cada red). */

export interface MetaYouTube {
  titulo: string
  descripcion: string
  privacidad: 'public' | 'unlisted' | 'private'
  /** COPPA: YouTube obliga a declararlo; sin elegir no se publica. */
  paraNinos: boolean | null
}

export interface MetaTikTok {
  titulo: string
  /** Sin valor por defecto: lo exige el audit de TikTok. */
  privacidad: string | null
  comentarios: boolean
  duo: boolean
  stitch: boolean
  comercial: boolean
  tuMarca: boolean
  contenidoMarca: boolean
  esIA: boolean
}

export interface MetaFacebook {
  /** id de la Página. */
  destinoId: string
  titulo: string
  descripcion: string
}

export interface MetaInstagram {
  /** id de la cuenta profesional. */
  destinoId: string
  caption: string
}

export type MetaFormulario =
  | { plataforma: 'youtube'; meta: MetaYouTube }
  | { plataforma: 'tiktok'; meta: MetaTikTok }
  | { plataforma: 'facebook'; meta: MetaFacebook }
  | { plataforma: 'instagram'; meta: MetaInstagram }

export const LIMITES = {
  youtube: { titulo: 100, descripcion: 5000 },
  tiktok: { titulo: 2200 },
  facebook: { titulo: 255, descripcion: 5000 },
  instagram: { caption: 2200 },
} as const

export const URL_TIKTOK_MUSICA = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en'
export const URL_TIKTOK_MARCA = 'https://www.tiktok.com/legal/page/global/bc-policy/en'

/** El formulario recién abierto: título = nombre del proyecto, nada elegido de antemano. */
export function metaInicial(plataforma: Plataforma, titulo: string, esIA: boolean): MetaFormulario {
  switch (plataforma) {
    case 'youtube':
      return { plataforma, meta: { titulo: titulo.slice(0, LIMITES.youtube.titulo), descripcion: '', privacidad: 'public', paraNinos: null } }
    case 'tiktok':
      return {
        plataforma,
        meta: { titulo, privacidad: null, comentarios: false, duo: false, stitch: false, comercial: false, tuMarca: false, contenidoMarca: false, esIA },
      }
    case 'facebook':
      return { plataforma, meta: { destinoId: '', titulo: titulo.slice(0, LIMITES.facebook.titulo), descripcion: '' } }
    case 'instagram':
      return { plataforma, meta: { destinoId: '', caption: titulo } }
  }
}
