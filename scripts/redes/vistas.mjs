/**
 * Cuánto se ha visto lo que publicaron publicar-guias.mjs y publicar-plantillas.mjs.
 *
 *   node scripts/redes/vistas.mjs <calendario.json>
 *
 * YouTube: las vistas públicas de la página de cada video (el permiso de los
 * canales es solo de subida). Facebook: reproducciones, me gusta y comentarios;
 * Instagram: me gusta y comentarios (sus reproducciones piden un permiso que la
 * app no tiene). TikTok no devuelve nada: su permiso es solo de publicar.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
for (const archivo of ['.env.redes', '.env.local']) {
  const ruta = path.join(RAIZ, archivo)
  if (!existsSync(ruta)) continue
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const rutaCal = process.argv[2]
if (!rutaCal) {
  console.error('uso: vistas.mjs <calendario.json>')
  process.exit(1)
}
const dirCal = path.dirname(path.resolve(rutaCal))

const URL_FN = `${process.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/redes-publicar`
async function llamar(cuerpo) {
  const resp = await fetch(URL_FN, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`, 'x-redes-script': process.env.REDES_SCRIPT_CLAVE, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(120_000),
  })
  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(json?.mensaje ?? `HTTP ${resp.status}`)
  return json
}

// ─── Lo publicado, de los registros ──────────────────────────────────────────

const publicadas = []
const dirLotes = path.join(dirCal, 'lotes')
for (const f of readdirSync(dirLotes).filter((a) => a.endsWith('.registro.json'))) {
  const que = f.replace(/-(youtube|facebook|instagram|tiktok)\.registro\.json$/, '')
  for (const [clave, r] of Object.entries(JSON.parse(readFileSync(path.join(dirLotes, f), 'utf8')))) {
    if (r.estado === 'publicado') publicadas.push({ red: clave.split(':')[0], idioma: clave.split(':')[1], que, id: r.id, url: r.url, cuenta: r.cuenta })
  }
}
const rutaFotos = path.join(dirCal, 'plantillas.registro.json')
if (existsSync(rutaFotos)) {
  for (const [k, r] of Object.entries(JSON.parse(readFileSync(rutaFotos, 'utf8')).publicadas ?? {})) {
    const [que, clave] = k.split('|')
    if (r.estado === 'publicado') publicadas.push({ red: clave.split(':')[0], idioma: clave.split(':')[1], que: que.replace('/', '-'), id: r.id, url: r.url, cuenta: r.cuenta })
  }
}

// Se sale con `break fin` y no con process.exit: cortar con sockets de fetch abiertos revienta libuv en Windows.
fin: {
const { cuentas } = await llamar({ accion: 'cuentas' })
const ranuraDe = (red, nombre) => cuentas.find((c) => c.plataforma === red && c.nombre === nombre)?.ranura

for (const p of publicadas.filter((x) => x.red === 'youtube')) {
  const html = await fetch(`https://www.youtube.com/watch?v=${p.id}&hl=en`, { headers: { 'Accept-Language': 'en-US', 'User-Agent': 'Mozilla/5.0' } })
    .then((r) => r.text())
    .catch(() => '')
  p.vistas = Number(html.match(/"viewCount":"(\d+)"/)?.[1] ?? NaN)
}

// Facebook e Instagram: una llamada por cuenta con todos sus ids.
for (const red of ['facebook', 'instagram']) {
  const porCuenta = new Map()
  for (const p of publicadas.filter((x) => x.red === red && x.id)) porCuenta.set(p.cuenta, [...(porCuenta.get(p.cuenta) ?? []), p])
  for (const [cuenta, lista] of porCuenta) {
    try {
      const { datos } = await llamar({ accion: 'estadisticas', plataforma: red, ranura: ranuraDe(red, cuenta), ids: lista.map((p) => String(p.id)) })
      for (const p of lista) {
        const d = datos[p.id] ?? {}
        p.vistas = d.views
        p.megusta = d.like_count ?? d.likes?.summary?.total_count ?? d.reactions?.summary?.total_count
        p.comentarios = d.comments_count ?? d.comments?.summary?.total_count
        if (d.error) p.error = d.error
      }
    } catch (e) {
      for (const p of lista) p.error = e.message
    }
  }
}

const num = (n) => (Number.isFinite(n) ? n : '')
console.table(
  publicadas
    .sort((a, b) => a.red.localeCompare(b.red) || a.idioma.localeCompare(b.idioma) || a.que.localeCompare(b.que))
    .map((p) => ({ red: p.red, idioma: p.idioma, que: p.que, vistas: num(p.vistas), megusta: num(p.megusta), coment: num(p.comentarios), error: p.error?.slice(0, 50) ?? '' })),
)
const suma = (red, campo) => publicadas.filter((p) => p.red === red).reduce((s, p) => s + (Number.isFinite(p[campo]) ? p[campo] : 0), 0)
for (const red of ['youtube', 'facebook', 'instagram', 'tiktok']) {
  console.log(`${red}: ${publicadas.filter((p) => p.red === red).length} publicadas · ${suma(red, 'vistas')} vistas · ${suma(red, 'megusta')} me gusta · ${suma(red, 'comentarios')} comentarios`)
}
break fin
}
