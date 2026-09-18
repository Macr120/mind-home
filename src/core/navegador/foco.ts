import { db } from '../data/db'
import { tGlobal } from '../i18n/useT'
import { categoriaDe, dominiosDeFabrica } from './categoriasWeb'
import { sitioDe } from './dominio'

/** La página que se muestra en lugar de un sitio bloqueado (escritorio y WebView del teléfono). */
export function htmlFoco(): string {
  const titulo = tGlobal('nav.foco.pagina', 'Estás en modo foco')
  const sub = tGlobal('nav.foco.paginaSub', 'Este sitio espera a que termine. Puedes acabar antes desde la tira del navegador.')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#e5e7eb;font-family:system-ui,sans-serif;text-align:center"><div style="padding:24px"><div style="font-size:64px">🎯</div><h1 style="font-size:22px;margin:8px 0">${titulo}</h1><p style="opacity:.7;max-width:36ch">${sub}</p></div></body></html>`
}

/**
 * Modo foco: qué sitios quedan bloqueados. La lista sale de los sitios
 * marcados a mano, de las fichas de `sitiosWeb` cuya categoría está bloqueada
 * y de los dominios de fábrica de esas categorías. Un dominio DESCONOCIDO de
 * una categoría bloqueada no se bloquea hasta que esté clasificado (limitación
 * asumida: no hay forma de saber de qué va sin verlo).
 */
export async function hostsBloqueados(categorias: string[], sitios: string[]): Promise<string[]> {
  const set = new Set<string>()
  for (const s of sitios) {
    const h = sitioDe(/^https?:/.test(s) ? s : `https://${s.trim()}`)
    if (h.includes('.')) set.add(h)
  }
  if (categorias.length) {
    const cats = new Set(categorias)
    for (const c of categorias) for (const d of dominiosDeFabrica(c)) set.add(d)
    for (const f of await db.sitiosWeb.toArray()) if (cats.has(categoriaDe(f.host, f))) set.add(f.host)
  }
  return [...set]
}

/** ¿`host` cae en la lista (él o un subdominio suyo)? Misma regla que aplica el shell. */
export function hostBloqueado(host: string, bloqueados: string[]): boolean {
  const h = host.toLowerCase()
  return bloqueados.some((b) => h === b || h.endsWith('.' + b))
}
