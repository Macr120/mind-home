import type { CategoriaNoticia } from '../../core/data/db'
import { noticiasRepo } from '../../core/data/repository'
import { hoyISO } from './fecha'

const CLAVE_SYNC = 'mh-diario-ultima-sync'

/** Feeds RSS en español / internacional (vía rss2json, una vez al día). */
const FEEDS: { categoria: CategoriaNoticia; url: string; fuente: string }[] = [
  {
    categoria: 'nacional',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana',
    fuente: 'El País',
  },
  {
    categoria: 'mundo',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional',
    fuente: 'El País',
  },
  {
    categoria: 'tecnologia',
    url: 'https://www.xataka.com/index.xml',
    fuente: 'Xataka',
  },
  {
    categoria: 'ciencia',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia',
    fuente: 'El País',
  },
  {
    categoria: 'economia',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia',
    fuente: 'El País',
  },
  {
    categoria: 'deportes',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/deportes',
    fuente: 'El País',
  },
]

const POR_FEED = 3

export interface ResultadoSync {
  nuevas: number
  error?: string
}

type Rss2JsonResponse = {
  status: string
  items?: {
    title: string
    description: string
    link: string
  }[]
}

function textoPlano(html: string): string {
  const limpio = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return limpio.length > 420 ? `${limpio.slice(0, 417)}…` : limpio
}

export function fechaUltimaSync(): string | null {
  return localStorage.getItem(CLAVE_SYNC)
}

export function necesitaSyncHoy(): boolean {
  return fechaUltimaSync() !== hoyISO()
}

/** Importa titulares del día desde RSS (requiere conexión). */
export async function actualizarBriefingDelDia(): Promise<ResultadoSync> {
  const hoy = hoyISO()
  const existentes = await noticiasRepo.list()
  const urls = new Set(existentes.map((n) => n.url).filter(Boolean) as string[])
  let nuevas = 0
  let fallos = 0

  for (const feed of FEEDS) {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=${POR_FEED}`,
      )
      if (!res.ok) {
        fallos++
        continue
      }
      const data = (await res.json()) as Rss2JsonResponse
      if (data.status !== 'ok' || !data.items?.length) {
        fallos++
        continue
      }

      for (const item of data.items.slice(0, POR_FEED)) {
        const link = item.link?.trim()
        if (!link || urls.has(link)) continue
        const titulo = item.title?.trim()
        const resumen = textoPlano(item.description ?? '')
        if (!titulo || !resumen) continue

        await noticiasRepo.add({
          fecha: hoy,
          categoria: feed.categoria,
          titulo,
          resumen,
          fuente: feed.fuente,
          url: link,
          leido: false,
          destacada: nuevas === 0,
          creadoEn: hoy,
        })
        urls.add(link)
        nuevas++
      }
    } catch {
      fallos++
    }
  }

  localStorage.setItem(CLAVE_SYNC, hoy)

  if (nuevas === 0 && fallos === FEEDS.length) {
    return {
      nuevas: 0,
      error: 'No se pudo conectar a las fuentes. Revisa tu internet e inténtalo de nuevo.',
    }
  }
  if (nuevas === 0 && fallos > 0) {
    return { nuevas: 0, error: 'Ya tienes el briefing de hoy o no hubo titulares nuevos.' }
  }
  return { nuevas }
}
