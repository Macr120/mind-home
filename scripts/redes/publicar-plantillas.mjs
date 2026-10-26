/**
 * Publica las plantillas de cada guía (imágenes 4:5 de
 * `marketing/guias/plantillas.mjs`: portada, una por parte y cierre) en
 * Facebook e Instagram como UNA sola publicación por guía: álbum en Facebook,
 * carrusel en Instagram. Es lo primero de cada guía y lo llama
 * `publicar-guias.mjs` cuando le toca (él lleva la fila y los horarios).
 *
 *   node scripts/redes/publicar-plantillas.mjs <calendario.json> --guia=Metas              ← ensayo
 *   node scripts/redes/publicar-plantillas.mjs <calendario.json> --guia=Metas --publicar   ← lo publica
 *     [--redes=facebook] [--idiomas=es,en]
 *
 * Lee `<raiz>/<Guía>/<id>/plantilla-*.jpg` y su `paquete.json`. Meta baja
 * las imágenes de una URL pública: antes de publicarlas se suben a R2
 * (media.mindhaos.com/guias/<tema>/plantillas/<id>/<nombre>-<huella>.jpg).
 * Lo publicado se anota en `plantillas.registro.json`, junto al calendario.
 * Opcional en el calendario: `"plantillas": { "redes": ["facebook", "instagram"] }`.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function cargarEnv(archivo) {
  const ruta = path.join(RAIZ, archivo)
  if (!existsSync(ruta)) return
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
cargarEnv('.env.redes')
cargarEnv('.env.local')

const args = process.argv.slice(2)
const opcion = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1]
const rutaCal = args.find((a) => !a.startsWith('--'))
if (!rutaCal) {
  console.error('uso: publicar-plantillas.mjs <calendario.json> --guia=<Guía> [--publicar] [--redes=…] [--idiomas=…]')
  process.exit(1)
}
for (const v of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'REDES_SCRIPT_CLAVE']) {
  if (!process.env[v]) {
    console.error(`Falta ${v} (en .env.redes o .env.local).`)
    process.exit(1)
  }
}
const EN_SERIO = args.includes('--publicar')
const cal = JSON.parse(readFileSync(rutaCal, 'utf8'))
const dirCal = path.dirname(path.resolve(rutaCal))
const raiz = path.resolve(dirCal, cal.raiz ?? '..')
const redes = opcion('redes')?.split(',') ?? cal.plantillas?.redes ?? ['facebook', 'instagram']
const idiomas = opcion('idiomas')?.split(',') ?? cal.idiomas ?? cal.grupos.flatMap((g) => g.idiomas)

const hoy = new Date().toLocaleDateString('sv-SE')
const rutaLog = path.join(dirCal, `plantillas-${hoy}.log`)
const log = (s = '') => {
  console.log(s)
  appendFileSync(rutaLog, s + '\n', 'utf8')
}
const RUTA_REGISTRO = path.join(dirCal, 'plantillas.registro.json')
const registro = existsSync(RUTA_REGISTRO) ? JSON.parse(readFileSync(RUTA_REGISTRO, 'utf8')) : { subidas: {}, publicadas: {} }
const guardar = () => writeFileSync(RUTA_REGISTRO, JSON.stringify(registro, null, 2) + '\n', 'utf8')

// ─── Servidor ────────────────────────────────────────────────────────────────

const URL_FN = `${process.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/redes-publicar`
async function llamar(cuerpo) {
  const resp = await fetch(URL_FN, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`, 'x-redes-script': process.env.REDES_SCRIPT_CLAVE, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(180_000),
  })
  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(json?.mensaje ?? `HTTP ${resp.status}`)
  return json
}

/** Como en publicar-lote.mjs: «Mindhaos-pt» → pt, «mindhaos.ja» → ja, «MindHaOS» → en. */
const ALIAS = { 日本: 'ja', 中文: 'zh', 한국: 'ko', рус: 'ru', عربي: 'ar', हिं: 'hi' }
function idiomaDeCuenta(nombre) {
  const n = String(nombre ?? '').trim().toLowerCase()
  if (!n.startsWith('mindhaos')) return null
  const resto = n.slice('mindhaos'.length)
  if (resto === '' || resto === '.app') return 'en'
  const sufijo = resto.replace(/^[-.]/, '')
  return ALIAS[sufijo] ?? (/^[a-z]{2}$/.test(sufijo) ? sufijo : null)
}

// ─── Una publicación por guía ────────────────────────────────────────────────

const paquetes = new Map()
function paquete(guia, idioma) {
  const clave = `${guia}/${idioma}`
  if (!paquetes.has(clave)) {
    const ruta = path.join(raiz, guia, idioma, 'paquete.json')
    paquetes.set(clave, existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : null)
  }
  return paquetes.get(clave)
}

/** Las imágenes de la guía en orden: portada, partes y cierre (como las tiene la carpeta de ese idioma). */
const numParte = (a) => Number(a.match(/^plantilla-parte-(\d+)\.jpg$/)?.[1] ?? Infinity)
function imagenes(guia, idioma) {
  const dir = path.join(raiz, guia, idioma)
  if (!existsSync(dir)) return []
  const partes = readdirSync(dir).filter((a) => /^plantilla-parte-\d+\.jpg$/.test(a)).sort((a, b) => numParte(a) - numParte(b))
  return [existsSync(path.join(dir, 'plantilla-portada.jpg')) && 'plantilla-portada.jpg', ...partes, existsSync(path.join(dir, 'plantilla-cierre.jpg')) && 'plantilla-cierre.jpg']
    .filter(Boolean)
    .slice(0, 20) // tope de Meta para un carrusel
}

/** El texto es el del video completo de la guía (enlaces con utm_medium=imagen). */
function textoPara(red, guia, idioma) {
  const v = paquete(guia, idioma)?.videos.find((x) => x.archivo === 'completo.mp4')
  if (!v) return null
  if (red === 'instagram') return v.instagram.texto
  return `${v.youtube.titulo}\n\n${v.facebook.texto.replaceAll('utm_medium=video', 'utm_medium=imagen')}`
}

const clave = (guia, red, idioma) => `${guia}/carrusel|${red}:${idioma}`

// Qué carrusel publicar lo decide publicar-guias.mjs (va primero en la fila de cada guía): aquí solo se publica.
const guia = opcion('guia')
if (!guia || !cal.orden.includes(guia)) {
  console.error('Falta --guia=<una guía del orden del calendario>.')
  process.exit(1)
}
const ahora = new Date()
const tareas = []
for (const red of redes) {
  for (const idioma of idiomas) {
    if (registro.publicadas[clave(guia, red, idioma)]?.estado !== 'publicado') tareas.push({ guia, red, idioma })
  }
}
log(`
═══ Carrusel de ${guia} · ${ahora.toLocaleString('es-MX')} · ${EN_SERIO ? 'PUBLICAR' : 'ensayo'} ═══`)
console.table(tareas.map((t) => ({ red: t.red, idioma: t.idioma, fotos: imagenes(guia, t.idioma).length })))

// Se sale con `break fin` y no con process.exit: cortar con sockets de fetch abiertos revienta libuv en Windows.
fin: {
const { cuentas } = await llamar({ accion: 'cuentas' })
const cuentaDe = (red, idioma) => cuentas.filter((c) => c.plataforma === red && idiomaDeCuenta(c.nombre) === idioma)
for (const t of tareas) {
  const n = cuentaDe(t.red, t.idioma)
  if (n.length !== 1) log(`! ${t.red}:${t.idioma}: ${n.length ? `${n.length} cuentas posibles (${n.map((c) => c.nombre).join(', ')})` : 'sin cuenta conectada'}`)
  else if (n[0].estado !== 'ok') log(`! ${t.red}:${t.idioma}: la cuenta ${n[0].nombre} caducó, reconéctala en la app`)
}
if (!EN_SERIO) {
  log('\nEnsayo: no se publicó nada. Añade --publicar para publicar de verdad.')
  break fin
}

/** Sube la imagen a R2 (una vez por versión: la huella va en el nombre) y devuelve su URL pública. */
function urlPublica(guia, idioma, archivo) {
  const local = path.join(raiz, guia, idioma, archivo)
  const huella = createHash('sha256').update(readFileSync(local)).digest('hex').slice(0, 10)
  const tema = paquete(guia, idioma)?.tema ?? guia.toLowerCase()
  const claveR2 = `guias/${tema}/plantillas/${idioma}/${archivo.replace(/^plantilla-|\.jpg$/g, '')}-${huella}.jpg`
  if (!registro.subidas[claveR2]) {
    const npx = process.platform === 'win32' ? ['cmd', ['/c', 'npx']] : ['npx', []]
    execFileSync(npx[0], [...npx[1], 'wrangler', 'r2', 'object', 'put', `mindhaos-media/${claveR2}`, '--file', local, '--content-type', 'image/jpeg', '--cache-control', 'public, max-age=31536000, immutable', '--remote'], { cwd: RAIZ, stdio: 'ignore' })
    registro.subidas[claveR2] = new Date().toISOString()
    guardar()
  }
  return `https://media.mindhaos.com/${claveR2}`
}

for (const t of tareas) {
  const [cuenta] = cuentaDe(t.red, t.idioma)
  if (!cuenta || cuentaDe(t.red, t.idioma).length !== 1 || cuenta.estado !== 'ok') continue
  const k = clave(t.guia, t.red, t.idioma)
  const texto = textoPara(t.red, t.guia, t.idioma)
  const archivos = imagenes(t.guia, t.idioma)
  if (!texto || archivos.length < 2) {
    log(`! ${k}: faltan las imágenes o el paquete.json`)
    continue
  }
  const inicio = Date.now()
  try {
    const urls = archivos.map((a) => urlPublica(t.guia, t.idioma, a))
    const r = await llamar({ accion: 'publicar-foto', plataforma: t.red, ranura: cuenta.ranura, urls, texto })
    registro.publicadas[k] = { estado: 'publicado', cuenta: cuenta.nombre, id: r.id, url: r.url, fotos: urls.length, fecha: new Date().toISOString() }
    log(`✓ ${k} (${urls.length} fotos) → ${r.url ?? r.id}${r.privado ? ' (privado)' : ''}`)
  } catch (e) {
    // Si se cortó la conexión, la red pudo publicarlo igual: se mira lo último de la cuenta antes de darlo por fallido.
    const hecho = await llamar({ accion: 'estadisticas', plataforma: t.red, ranura: cuenta.ranura, recientes: true })
      .then(({ recientes }) => recientes.find((m) => new Date(m.timestamp ?? m.created_time).getTime() >= inicio - 60_000 && (t.red === 'facebook' || m.media_type === 'CAROUSEL_ALBUM')))
      .catch(() => null)
    if (hecho) {
      registro.publicadas[k] = { estado: 'publicado', cuenta: cuenta.nombre, id: hecho.id, url: hecho.permalink ?? hecho.permalink_url, fotos: archivos.length, fecha: new Date().toISOString() }
      log(`✓ ${k} (salió pese al error «${e.message}») → ${hecho.permalink ?? hecho.permalink_url ?? hecho.id}`)
      guardar()
      continue
    }
    registro.publicadas[k] = { estado: 'fallo', cuenta: cuenta.nombre, motivo: e.message, fecha: new Date().toISOString() }
    log(`✗ ${k}: ${e.message}`)
  }
  guardar()
}
log(`\nRegistro: ${RUTA_REGISTRO}`)
}
