import type { CategoriaWeb, SitioWeb } from '../data/db'
import type { NombreIcono } from '../ui/iconos/catalogo'

/**
 * Categorías de los sitios web. Ocho FIJAS (traducidas, con icono y color) y
 * las propias del usuario (`categoriasWeb`, clave `c-…`). Un sitio cae en la
 * categoría que fijó el usuario (o la IA), si no en la del diccionario de
 * fábrica, y si no en «otros». Renombrar una fija o ponerle límite crea su fila
 * en `categoriasWeb` con la misma clave.
 */

export type ClaveFija = 'redes' | 'video' | 'noticias' | 'trabajo' | 'compras' | 'aprendizaje' | 'juegos' | 'otros'

export interface CategoriaFija {
  clave: ClaveFija
  nombreEs: string
  icono: NombreIcono
  color: string
}

export const CATEGORIAS_FIJAS: CategoriaFija[] = [
  { clave: 'redes', nombreEs: 'Redes sociales', icono: 'chat', color: '#ec4899' },
  { clave: 'video', nombreEs: 'Video y música', icono: 'pelicula', color: '#f97316' },
  { clave: 'noticias', nombreEs: 'Noticias', icono: 'periodico', color: '#eab308' },
  { clave: 'trabajo', nombreEs: 'Trabajo', icono: 'maletin', color: '#3b82f6' },
  { clave: 'compras', nombreEs: 'Compras', icono: 'tab-compras', color: '#22c55e' },
  { clave: 'aprendizaje', nombreEs: 'Aprendizaje', icono: 'libro', color: '#8b5cf6' },
  { clave: 'juegos', nombreEs: 'Juegos', icono: 'cuarto-entretenimiento', color: '#14b8a6' },
  { clave: 'otros', nombreEs: 'Otros', icono: 'etiqueta', color: '#94a3b8' },
]

const FIJAS = new Set<string>(CATEGORIAS_FIJAS.map((c) => c.clave))

export function esFija(clave: string): clave is ClaveFija {
  return FIJAS.has(clave)
}

/** Diccionario de fábrica: dominio registrable → categoría. Lo que no esté aquí es «otros» hasta que el usuario lo mueva. */
const DE_FABRICA: Record<ClaveFija, string[]> = {
  redes: [
    'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'reddit.com', 'threads.net', 'snapchat.com',
    'pinterest.com', 'linkedin.com', 'tumblr.com', 'discord.com', 'whatsapp.com', 'telegram.org', 'messenger.com',
    'bsky.app', 'mastodon.social', 'vk.com', 'weibo.com', 'quora.com', 'meetup.com', 'nextdoor.com', 'tinder.com', 'badoo.com',
  ],
  video: [
    'youtube.com', 'youtu.be', 'netflix.com', 'twitch.tv', 'primevideo.com', 'disneyplus.com', 'hbomax.com', 'max.com',
    'hulu.com', 'vimeo.com', 'dailymotion.com', 'spotify.com', 'soundcloud.com', 'deezer.com', 'crunchyroll.com', 'plex.tv',
    'kick.com', 'rumble.com', 'paramountplus.com', 'peacocktv.com', 'tidal.com', 'pandora.com', 'bandcamp.com', 'mubi.com',
    'filmin.es', 'vix.com',
  ],
  noticias: [
    'bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'theguardian.com', 'elpais.com', 'elmundo.es', 'abc.es',
    'lavanguardia.com', 'clarin.com', 'lanacion.com.ar', 'infobae.com', 'eluniversal.com.mx', 'milenio.com', 'reforma.com',
    'excelsior.com.mx', 'elcomercio.pe', 'eltiempo.com', 'emol.com', 'latercera.com', 'reuters.com', 'apnews.com',
    'bloomberg.com', 'ft.com', 'wsj.com', 'washingtonpost.com', 'lemonde.fr', 'spiegel.de', 'corriere.it', 'globo.com',
    'uol.com.br', 'msn.com', 'foxnews.com', 'nbcnews.com', 'cbsnews.com', 'aljazeera.com', 'dw.com', 'rtve.es',
    '20minutos.es', 'elconfidencial.com', 'marca.com', 'as.com', 'espn.com', 'lequipe.fr',
  ],
  trabajo: [
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'notion.so', 'slack.com', 'trello.com', 'asana.com',
    'atlassian.com', 'figma.com', 'canva.com', 'miro.com', 'zoom.us', 'microsoft.com', 'office.com', 'live.com',
    'outlook.com', 'google.com', 'gmail.com', 'dropbox.com', 'box.com', 'airtable.com', 'monday.com', 'clickup.com',
    'linear.app', 'vercel.com', 'netlify.com', 'cloudflare.com', 'digitalocean.com', 'heroku.com', 'docker.com',
    'npmjs.com', 'pypi.org', 'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com', 'perplexity.ai', 'hubspot.com',
    'salesforce.com', 'zendesk.com', 'mailchimp.com', 'calendly.com', 'docusign.com', 'adobe.com', 'overleaf.com',
  ],
  compras: [
    'amazon.com', 'amazon.es', 'amazon.com.mx', 'amazon.com.br', 'amazon.co.uk', 'amazon.de', 'ebay.com', 'aliexpress.com',
    'alibaba.com', 'mercadolibre.com', 'mercadolibre.com.mx', 'mercadolibre.com.ar', 'mercadolivre.com.br', 'walmart.com',
    'walmart.com.mx', 'target.com', 'bestbuy.com', 'etsy.com', 'shein.com', 'temu.com', 'zara.com', 'hm.com', 'ikea.com',
    'liverpool.com.mx', 'coppel.com', 'elcorteingles.es', 'pccomponentes.com', 'wish.com', 'apple.com', 'samsung.com',
    'nike.com', 'adidas.com', 'booking.com', 'airbnb.com', 'expedia.com', 'trivago.com', 'uber.com', 'rappi.com',
    'ubereats.com', 'glovoapp.com',
  ],
  aprendizaje: [
    'wikipedia.org', 'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'duolingo.com', 'platzi.com',
    'domestika.org', 'skillshare.com', 'brilliant.org', 'codecademy.com', 'freecodecamp.org', 'w3schools.com',
    'mozilla.org', 'medium.com', 'dev.to', 'quizlet.com', 'ted.com', 'archive.org', 'researchgate.net', 'academia.edu',
    'jstor.org', 'britannica.com', 'wolframalpha.com', 'geeksforgeeks.org', 'leetcode.com', 'hackerrank.com', 'kaggle.com',
    'wordreference.com', 'rae.es', 'linguee.com', 'deepl.com', 'memrise.com', 'babbel.com', 'busuu.com', 'unam.mx',
    'mit.edu', 'stanford.edu', 'harvard.edu',
  ],
  juegos: [
    'steampowered.com', 'steamcommunity.com', 'epicgames.com', 'roblox.com', 'minecraft.net', 'xbox.com', 'playstation.com',
    'nintendo.com', 'ea.com', 'blizzard.com', 'battle.net', 'riotgames.com', 'leagueoflegends.com', 'chess.com',
    'lichess.org', 'poki.com', 'miniclip.com', 'itch.io', 'ign.com', 'gamespot.com', 'kongregate.com', 'friv.com',
    'crazygames.com', 'y8.com', 'gog.com', 'humblebundle.com', 'fortnite.com', 'ubisoft.com', 'rockstargames.com',
    'nexusmods.com', 'curseforge.com',
  ],
  otros: [],
}

const DOMINIOS_FABRICA = new Map<string, ClaveFija>()
for (const clave of Object.keys(DE_FABRICA) as ClaveFija[]) for (const d of DE_FABRICA[clave]) DOMINIOS_FABRICA.set(d, clave)

export function categoriaDeFabrica(sitio: string): ClaveFija | null {
  return DOMINIOS_FABRICA.get(sitio) ?? null
}

/** Los dominios de fábrica de una categoría fija (para bloquearlos en el modo foco). */
export function dominiosDeFabrica(clave: string): string[] {
  return esFija(clave) ? DE_FABRICA[clave] : []
}

/** Clave de categoría de un sitio: la fijada (usuario o IA), si no la de fábrica, si no «otros». */
export function categoriaDe(sitio: string, ficha?: Pick<SitioWeb, 'categoria'> | null): string {
  return ficha?.categoria || categoriaDeFabrica(sitio) || 'otros'
}

/** Una categoría lista para pintar: nombre traducido o del usuario, icono o emoji, color. */
export interface CategoriaVisible {
  clave: string
  nombre: string
  icono?: NombreIcono
  emoji?: string
  color: string
  propia: boolean
  limiteMin?: number
  /** Fila de `categoriasWeb` si existe (renombre, límite o propia). */
  filaId?: number
}

/**
 * Las categorías tal como se ven: las fijas (con los renombres y límites que
 * el usuario haya guardado) y después las propias por su orden; «otros»
 * siempre la última.
 */
export function categoriasVisibles(
  propias: CategoriaWeb[],
  t: (clave: string, es: string) => string,
): CategoriaVisible[] {
  const porClave = new Map(propias.map((c) => [c.clave, c]))
  const fijas = CATEGORIAS_FIJAS.filter((c) => c.clave !== 'otros').map((c) => aFija(c, porClave.get(c.clave), t))
  const otras = propias
    .filter((c) => !esFija(c.clave))
    .sort((a, b) => a.orden - b.orden)
    .map<CategoriaVisible>((c) => ({
      clave: c.clave,
      nombre: c.nombre || c.clave,
      emoji: c.emoji || undefined,
      icono: c.emoji ? undefined : 'etiqueta',
      color: c.color || '#a78bfa',
      propia: true,
      limiteMin: c.limiteMin,
      filaId: c.id,
    }))
  const otros = CATEGORIAS_FIJAS.find((c) => c.clave === 'otros')!
  return [...fijas, ...otras, aFija(otros, porClave.get('otros'), t)]
}

function aFija(c: CategoriaFija, fila: CategoriaWeb | undefined, t: (clave: string, es: string) => string): CategoriaVisible {
  return {
    clave: c.clave,
    nombre: fila?.nombre || t(`nav.cat.${c.clave}`, c.nombreEs),
    icono: c.icono,
    color: fila?.color || c.color,
    propia: false,
    limiteMin: fila?.limiteMin,
    filaId: fila?.id,
  }
}

/** Clave nueva para una categoría propia (estable entre dispositivos: viaja con la fila). */
export function nuevaClavePropia(): string {
  return `c-${crypto.randomUUID().slice(0, 8)}`
}
