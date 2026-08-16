/**
 * Carga `.env.marketing` (raíz del repo, ignorado por git) en process.env.
 * Variables esperadas — ver marketing/README.md:
 *   META_PAGE_ID, META_PAGE_TOKEN, META_IG_ID, VIDEO_BASE_URL,
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN,
 *   TIKTOK_ACCESS_TOKEN
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const ruta = path.join(RAIZ, '.env.marketing')
if (existsSync(ruta)) {
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

/** Variable obligatoria o aborta con un mensaje útil. */
export function requiere(nombre) {
  const v = process.env[nombre]
  if (!v) {
    console.error(`Falta ${nombre} en .env.marketing (ver marketing/README.md).`)
    process.exit(1)
  }
  return v
}
