/**
 * Publica un lote de videos (uno por idioma) en las cuentas conectadas de la app
 * —YouTube, TikTok, Facebook e Instagram— por el mismo servidor que usa el
 * Studio (`redes-publicar`), sin abrir la app ni iniciar sesión.
 *
 *   node scripts/redes/publicar-lote.mjs --cuentas
 *     Lista las cuentas conectadas y a qué idioma corresponde cada una.
 *
 *   node scripts/redes/publicar-lote.mjs <lote.json>                 ← ensayo (tabla, no sube nada)
 *   node scripts/redes/publicar-lote.mjs <lote.json> --publicar      ← publica de verdad
 *     [--redes=youtube,tiktok] [--idiomas=es,pt] [--espera=0] [--repetir]
 *
 * El lote (JSON) dice qué subir:
 *   {
 *     "carpeta": "ruta (absoluta o relativa al lote)",
 *     "archivo": "MindHaOS-anuncio-{id}-musica.mp4",   ← {id} = idioma
 *     "aspecto": "9:16",                                 ← 9:16 | 1:1 | 16:9
 *     "redes": ["youtube", "tiktok", "facebook", "instagram"],
 *     "privacidad": { "youtube": "unlisted", "tiktok": "PUBLIC_TO_EVERYONE" },
 *     "publicar_en": "2026-10-20T15:00:00-06:00",        ← opcional: YouTube y Facebook
 *     "textos": { "es": { "titulo": "…", "descripcion": "…", "hashtags": ["MindHaOS"] } },
 *     "cuentas": { "tiktok:pt": "MindHaOS.pt" }          ← opcional: forzar la cuenta por nombre
 *   }
 * Solo se publican los idiomas que tengan texto en `textos` y archivo en la carpeta.
 *
 * Lo publicado se anota en `<lote>.registro.json`: al repetir el comando solo se
 * sube lo que falta o falló (con `--repetir` se vuelve a subir todo).
 *
 * Necesita `.env.redes` en la raíz del repo (ignorado por git) con
 * `REDES_SCRIPT_CLAVE`, la misma clave que el secreto del servidor; la URL y la
 * anon key se leen de `.env.local`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs'
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

function requiere(nombre) {
  const v = process.env[nombre]
  if (!v) {
    console.error(`Falta ${nombre} (en .env.redes o .env.local).`)
    process.exit(1)
  }
  return v
}

const URL_FN = `${requiere('VITE_SUPABASE_URL').replace(/\/$/, '')}/functions/v1/redes-publicar`
const CABECERAS = {
  Authorization: `Bearer ${requiere('VITE_SUPABASE_ANON_KEY')}`,
  'x-redes-script': requiere('REDES_SCRIPT_CLAVE'),
}

const args = process.argv.slice(2)
const opcion = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1]
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

class ErrorServidor extends Error {
  constructor(codigo, mensaje, recibido) {
    super(mensaje)
    this.codigo = codigo
    this.recibido = recibido
  }
}

/** fetch que reintenta los cortes de red (no las respuestas del servidor). */
async function pedir(url, init) {
  for (let intento = 1; ; intento++) {
    try {
      return await fetch(url, init)
    } catch (e) {
      if (intento >= 4) throw e
      await espera(3000 * intento)
    }
  }
}

async function llamar(cuerpo) {
  const resp = await pedir(URL_FN, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new ErrorServidor(json?.error ?? 'proveedor', json?.mensaje ?? `HTTP ${resp.status}`, json?.recibido)
  return json
}

async function enviarTrozo(sesion, offset, bytes) {
  const q = new URLSearchParams({ accion: 'trozo', sesion, offset: String(offset) })
  const resp = await pedir(`${URL_FN}?${q}`, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'application/octet-stream' },
    body: bytes,
  })
  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new ErrorServidor(json?.error ?? 'proveedor', json?.mensaje ?? `HTTP ${resp.status}`, json?.recibido)
  return json
}

// ─── Cuentas: de su nombre al idioma ─────────────────────────────────────────

/** Sufijos no latinos de los nombres de cuenta (MindHaOS-日本, Mindhaos-عربي, MindHaOS.hi…). */
const ALIAS = { 日本: 'ja', 中文: 'zh', 한국: 'ko', рус: 'ru', عربي: 'ar', हिं: 'hi' }

/** «MindHaOS-pt» → pt, «mindhaos.ja» → ja, «MindHaOS» / «mindhaos.app» → en. */
function idiomaDeCuenta(nombre) {
  const n = String(nombre ?? '').trim().toLowerCase()
  if (!n.startsWith('mindhaos')) return null
  const resto = n.slice('mindhaos'.length)
  if (resto === '' || resto === '.app') return 'en'
  const sufijo = resto.replace(/^[-.]/, '')
  return ALIAS[sufijo] ?? (/^[a-z]{2}$/.test(sufijo) ? sufijo : null)
}

async function mapaCuentas() {
  const { cuentas } = await llamar({ accion: 'cuentas' })
  const mapa = new Map() // `${plataforma}:${idioma}` → [cuentas]
  for (const c of cuentas) {
    const id = idiomaDeCuenta(c.nombre)
    if (!id) continue
    const clave = `${c.plataforma}:${id}`
    mapa.set(clave, [...(mapa.get(clave) ?? []), c])
  }
  return { cuentas, mapa }
}

if (args.includes('--cuentas')) {
  const { cuentas } = await mapaCuentas()
  const filas = cuentas
    .map((c) => ({ red: c.plataforma, idioma: idiomaDeCuenta(c.nombre) ?? '?', nombre: c.nombre, ranura: c.ranura, estado: c.estado }))
    .sort((a, b) => a.red.localeCompare(b.red) || a.idioma.localeCompare(b.idioma))
  console.table(filas)
  process.exit(0)
}

// ─── Lote ────────────────────────────────────────────────────────────────────

const rutaLote = args.find((a) => !a.startsWith('--'))
if (!rutaLote) {
  console.error('uso: publicar-lote.mjs <lote.json> [--publicar] [--redes=…] [--idiomas=…] [--espera=min] [--repetir] | --cuentas')
  process.exit(1)
}
const EN_SERIO = args.includes('--publicar')
const lote = JSON.parse(readFileSync(rutaLote, 'utf8'))
const carpeta = path.resolve(path.dirname(rutaLote), lote.carpeta ?? '.')
const redes = (opcion('redes')?.split(',') ?? lote.redes ?? []).filter(Boolean)
const idiomas = opcion('idiomas')?.split(',') ?? Object.keys(lote.textos ?? {})
const esperaMin = Number(opcion('espera') ?? 0)
const aspecto = lote.aspecto ?? '9:16'

const RUTA_REGISTRO = rutaLote.replace(/\.json$/i, '') + '.registro.json'
const registro = existsSync(RUTA_REGISTRO) ? JSON.parse(readFileSync(RUTA_REGISTRO, 'utf8')) : {}
const anotar = (clave, dato) => {
  registro[clave] = { ...dato, fecha: new Date().toISOString() }
  writeFileSync(RUTA_REGISTRO, JSON.stringify(registro, null, 2) + '\n', 'utf8')
}

function duracionDe(ruta) {
  try {
    return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta]).toString().trim()) || 0
  } catch {
    return 0
  }
}

/** Texto final por red: YouTube y Facebook separan título y descripción; TikTok e Instagram solo tienen caption. */
function metaDe(red, texto, duracion, idioma) {
  const etiquetas = (texto.hashtags ?? []).map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')
  const descripcion = [texto.descripcion, etiquetas].filter(Boolean).join('\n\n')
  const caption = [texto.titulo, texto.descripcion, etiquetas].filter(Boolean).join('\n\n')
  const base = { aspecto, duracion_seg: duracion, idioma, publicar_en: lote.publicar_en || undefined }
  const priv = lote.privacidad?.[red]
  switch (red) {
    case 'youtube':
      return { ...base, titulo: texto.titulo, descripcion, privacidad: priv ?? 'public', youtube: { madeForKids: false, categoryId: '22' } }
    case 'facebook':
      return { ...base, titulo: texto.titulo, descripcion }
    case 'tiktok':
      return { ...base, publicar_en: undefined, titulo: caption, privacidad: priv ?? 'PUBLIC_TO_EVERYONE', tiktok: {} }
    case 'instagram':
      return { ...base, publicar_en: undefined, titulo: caption, instagram: { share_to_feed: true } }
  }
}

const { mapa } = await mapaCuentas()
const trabajos = []
const avisos = []
for (const idioma of idiomas) {
  const texto = lote.textos?.[idioma]
  if (!texto?.titulo) {
    avisos.push(`${idioma}: sin título en «textos», se omite`)
    continue
  }
  const archivo = path.join(carpeta, String(lote.archivo).replaceAll('{id}', idioma))
  if (!existsSync(archivo)) {
    avisos.push(`${idioma}: no existe ${archivo}`)
    continue
  }
  for (const red of redes) {
    const clave = `${red}:${idioma}`
    if (!args.includes('--repetir') && registro[clave]?.estado === 'publicado') continue
    const forzada = lote.cuentas?.[clave]
    const candidatas = forzada ? [...mapa.values()].flat().filter((c) => c.plataforma === red && c.nombre === forzada) : mapa.get(clave) ?? []
    if (candidatas.length !== 1) {
      avisos.push(`${clave}: ${candidatas.length ? `${candidatas.length} cuentas posibles (${candidatas.map((c) => c.nombre).join(', ')}); fija una en «cuentas»` : 'sin cuenta conectada'}`)
      continue
    }
    const cuenta = candidatas[0]
    if (cuenta.estado !== 'ok') {
      avisos.push(`${clave}: la cuenta ${cuenta.nombre} caducó, reconéctala en la app`)
      continue
    }
    trabajos.push({ clave, red, idioma, archivo, cuenta, texto })
  }
}

console.log(`\nLote «${path.basename(rutaLote)}» · ${EN_SERIO ? 'PUBLICAR' : 'ensayo'} · ${trabajos.length} publicaciones\n`)
console.table(
  trabajos.map((t) => ({
    red: t.red,
    idioma: t.idioma,
    cuenta: `${t.cuenta.nombre} (#${t.cuenta.ranura})`,
    privacidad: lote.privacidad?.[t.red] ?? '(por defecto)',
    MB: (statSync(t.archivo).size / 1048576).toFixed(1),
    titulo: t.texto.titulo.slice(0, 50),
  })),
)
for (const a of avisos) console.log(`  ! ${a}`)
if (!EN_SERIO) {
  console.log('\nEnsayo: no se subió nada. Añade --publicar para publicar de verdad.')
  process.exit(0)
}

// ─── Subidas ─────────────────────────────────────────────────────────────────

function leerTrozo(fd, offset, largo) {
  const buf = Buffer.alloc(largo)
  const leidos = readSync(fd, buf, 0, largo, offset)
  return buf.subarray(0, leidos)
}

async function subirYouTube(inicio, fd, tamano, ranura) {
  let token = inicio.access_token
  let offset = 0
  let intentos = 0
  const cabeceras = (rango) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'video/mp4', 'Content-Range': rango })
  const recibidoDe = (resp) => {
    const fin = Number((resp.headers.get('Range') ?? '').split('-')[1])
    return Number.isFinite(fin) ? fin + 1 : null
  }
  while (offset < tamano) {
    const fin = Math.min(tamano, offset + inicio.trozo)
    let resp
    try {
      resp = await fetch(inicio.upload_url, { method: 'PUT', headers: cabeceras(`bytes ${offset}-${fin - 1}/${tamano}`), body: leerTrozo(fd, offset, fin - offset) })
    } catch {
      if (++intentos > 4) throw new Error('Se perdió la conexión con YouTube.')
      await espera(2000 * intentos)
      const q = await fetch(inicio.upload_url, { method: 'PUT', headers: cabeceras(`bytes */${tamano}`) }).catch(() => null)
      if (q?.status === 308) offset = recibidoDe(q) ?? 0
      else if (q?.ok) return resultadoYouTube(q)
      continue
    }
    if (resp.status === 308) {
      offset = recibidoDe(resp) ?? fin
      intentos = 0
      process.stdout.write(`\r    subiendo ${Math.round((offset / tamano) * 100)} %   `)
    } else if (resp.ok) {
      process.stdout.write('\n')
      return resultadoYouTube(resp)
    } else if (resp.status === 401) {
      token = (await llamar({ accion: 'token-youtube', ranura })).access_token
    } else if (resp.status >= 500 || resp.status === 429) {
      if (++intentos > 4) throw new Error(`YouTube no aceptó la subida (HTTP ${resp.status}).`)
      await espera(2000 * intentos)
    } else {
      const j = await resp.json().catch(() => ({}))
      throw new Error(`YouTube: ${j.error?.message ?? `HTTP ${resp.status}`}`)
    }
  }
  throw new Error('YouTube no confirmó el video.')
}

async function resultadoYouTube(resp) {
  const j = await resp.json().catch(() => ({}))
  if (!j.id) throw new Error('YouTube no devolvió el id del video.')
  return { id: j.id, url: `https://youtu.be/${j.id}`, privacidad: j.status?.privacyStatus }
}

async function subirPorTrozos(inicio, fd, tamano) {
  let offset = 0
  let intentos = 0
  while (offset < tamano) {
    const fin = Math.min(tamano, offset + inicio.trozo)
    // El último trozo se lleva el resto (< 2 trozos): TikTok exige el número exacto.
    const finReal = tamano - fin < inicio.trozo ? tamano : fin
    try {
      const r = await enviarTrozo(inicio.sesion, offset, leerTrozo(fd, offset, finReal - offset))
      offset = r.recibido
      intentos = 0
      process.stdout.write(`\r    subiendo ${Math.round((offset / tamano) * 100)} %   `)
    } catch (e) {
      if (e instanceof ErrorServidor && e.codigo === 'orden' && typeof e.recibido === 'number') {
        offset = e.recibido
        continue
      }
      if (++intentos > 4 || (e instanceof ErrorServidor && !['proveedor', 'limite'].includes(e.codigo))) throw e
      await espera(2000 * intentos)
    }
  }
  process.stdout.write('\n')
  await llamar({ accion: 'finalizar', sesion: inicio.sesion })
  const tope = Date.now() + 15 * 60_000
  while (Date.now() < tope) {
    await espera(inicio.poll_ms ?? 10_000)
    const e = await llamar({ accion: 'estado-publicacion', sesion: inicio.sesion })
    if (e.estado === 'publicado') return { id: e.id, url: e.url, privado: e.privado }
    if (e.estado === 'fallo') throw new Error(e.motivo || 'La red no pudo procesar el video.')
  }
  throw new Error('La red tarda demasiado en procesar; revisa la cuenta en un rato.')
}

const duraciones = new Map()
let anterior = null
for (const t of trabajos) {
  if (anterior && esperaMin > 0 && anterior !== t.idioma) {
    console.log(`… esperando ${esperaMin} min antes de ${t.idioma}`)
    await espera(esperaMin * 60_000)
  }
  anterior = t.idioma
  if (!duraciones.has(t.archivo)) duraciones.set(t.archivo, duracionDe(t.archivo))
  const tamano = statSync(t.archivo).size
  console.log(`→ ${t.red} ${t.idioma} en ${t.cuenta.nombre}`)
  const fd = openSync(t.archivo, 'r')
  try {
    const meta = metaDe(t.red, t.texto, duraciones.get(t.archivo), t.idioma)
    const inicio = await llamar({ accion: 'iniciar-publicacion', plataforma: t.red, ranura: t.cuenta.ranura, tamano, mime: 'video/mp4', meta })
    const r = inicio.modo === 'directo' ? await subirYouTube(inicio, fd, tamano, t.cuenta.ranura) : await subirPorTrozos(inicio, fd, tamano)
    anotar(t.clave, { estado: 'publicado', cuenta: t.cuenta.nombre, ...r })
    console.log(`  ✓ ${r.url ?? r.id}${r.privacidad ? ` (${r.privacidad})` : r.privado ? ' (privado)' : ''}`)
  } catch (e) {
    anotar(t.clave, { estado: 'fallo', cuenta: t.cuenta.nombre, motivo: e.message })
    console.error(`  ✗ ${e.message}`)
  } finally {
    closeSync(fd)
  }
}

const filas = trabajos.map((t) => ({ red: t.red, idioma: t.idioma, estado: registro[t.clave]?.estado, enlace: registro[t.clave]?.url ?? registro[t.clave]?.motivo }))
console.log('\nResultado:')
console.table(filas)
console.log(`Registro: ${RUTA_REGISTRO}`)
