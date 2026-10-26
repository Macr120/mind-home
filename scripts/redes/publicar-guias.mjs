/**
 * Publica las guías de video poco a poco: cada día, en cada red e idioma, los
 * siguientes `porDia` videos de su fila, a la hora local de ese idioma.
 *
 *   node scripts/redes/publicar-guias.mjs <calendario.json>              ← ensayo: qué toca ahora
 *   node scripts/redes/publicar-guias.mjs <calendario.json> --publicar   ← lo publica
 *     [--sin-hora]   ← no espera a la hora de cada idioma (pruebas)
 *
 * Pensado para correr cada hora: cada idioma publica UNA cosa en cada una de sus
 * `horarios[idioma].horas` locales (p. ej. [13, 19]); si la PC estuvo apagada en
 * una, se pone al día en la siguiente corrida.
 *
 * La fila va guía por guía: primero el carrusel con sus fotos (Facebook e
 * Instagram), luego sus partes (1, 2, 3…) y al acabarlas el
 * completo; después la guía siguiente del `orden`. Cada grupo de idiomas empieza la
 * vuelta en una guía distinta (`grupos[].inicio`), así nunca salen las 16 cuentas
 * con el mismo video. Las redes de `soloPartes` (TikTok) se saltan el completo.
 *
 * Cada video es un lote de `publicar-lote.mjs` en `<carpeta del calendario>/lotes/`,
 * y su registro dice qué ya salió: lo que falla se reintenta al día siguiente
 * antes de avanzar. Los textos salen del `paquete.json` de cada guía e idioma.
 */
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LOTE_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publicar-lote.mjs')
const FOTOS_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publicar-plantillas.mjs')

const args = process.argv.slice(2)
const rutaCal = args.find((a) => !a.startsWith('--'))
if (!rutaCal) {
  console.error('uso: publicar-guias.mjs <calendario.json> [--publicar] [--sin-hora]')
  process.exit(1)
}
const EN_SERIO = args.includes('--publicar')
const SIN_HORA = args.includes('--sin-hora')
const cal = JSON.parse(readFileSync(rutaCal, 'utf8'))
const dirCal = path.dirname(path.resolve(rutaCal))
const raiz = path.resolve(dirCal, cal.raiz ?? '..')
const dirLotes = path.join(dirCal, 'lotes')
mkdirSync(dirLotes, { recursive: true })

// Con la tarea cada hora, una subida larga no debe pisarse con la siguiente corrida.
const CANDADO = path.join(dirCal, '.en-curso')
if (EN_SERIO && existsSync(CANDADO) && Date.now() - statSync(CANDADO).mtimeMs < 3 * 3600_000) {
  console.log('Otra corrida sigue publicando; se omite esta.')
  process.exit(0)
}

const hoy = new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD local de la PC
const rutaLog = path.join(dirCal, `registro-${hoy}.log`)
const log = (s = '') => {
  console.log(s)
  appendFileSync(rutaLog, s + '\n', 'utf8')
}

/** Fecha (AAAA-MM-DD) y hora de un instante en la zona de un idioma. */
function enZona(instante, zona) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  )
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) }
}

// ─── Textos dentro de los límites de YouTube ─────────────────────────────────

const bytes = (s) => Buffer.byteLength(s, 'utf8')

/** YouTube corta el título a 100 caracteres: se recorta en un espacio y con «…». */
function tituloYT(t) {
  const c = [...t]
  if (c.length <= 100) return t
  const corto = c.slice(0, 99).join('')
  return corto.slice(0, corto.lastIndexOf(' ') > 60 ? corto.lastIndexOf(' ') : undefined).trimEnd() + '…'
}

/** La descripción admite 5000 BYTES (no caracteres): sobran en ja/zh/hi. Se quitan fuentes del final. */
function descripcionYT(d) {
  if (bytes(d) <= 5000) return d
  const lineas = d.split('\n')
  while (lineas.length > 1 && bytes(lineas.join('\n')) > 4990) lineas.pop()
  let r = lineas.join('\n').trimEnd()
  while (bytes(r) > 5000) r = [...r].slice(0, -1).join('')
  return r
}

function textoPara(red, v) {
  switch (red) {
    case 'youtube':
      return { titulo: tituloYT(v.youtube.titulo), descripcion: descripcionYT(v.youtube.descripcion) }
    case 'facebook':
      return { titulo: tituloYT(v.youtube.titulo), descripcion: v.facebook.texto }
    case 'tiktok':
      return { titulo: v.tiktok.texto }
    case 'instagram':
      return { titulo: v.instagram.texto }
  }
}

// ─── La fila de videos ───────────────────────────────────────────────────────

const numParte = (a) => Number(a.match(/^parte-(\d+)\.mp4$/)?.[1] ?? Infinity)

/**
 * Por guía: el carrusel de sus fotos (en `fotos`: Facebook e Instagram), que
 * cuenta como una publicación más del día; luego sus partes y el completo al final.
 */
const videos = []
for (const guia of cal.orden) {
  const dirEs = path.join(raiz, guia, 'es')
  if (!existsSync(dirEs)) {
    log(`! ${guia}: no existe ${dirEs}`)
    continue
  }
  const partes = readdirSync(dirEs).filter((a) => /^parte-\d+\.mp4$/.test(a)).sort((a, b) => numParte(a) - numParte(b))
  videos.push({ guia, archivo: 'fotos', fotos: true })
  for (const archivo of [...partes, 'completo.mp4']) videos.push({ guia, archivo, completo: archivo === 'completo.mp4' })
}

/** La vuelta completa empezando por la guía `inicio` del grupo. */
/**
 * Publicaciones sueltas que van ANTES de las guías en todos los idiomas
 * (`antes`: [{ nombre, lote }], el lote en el formato de publicar-lote.mjs).
 */
const extras = (cal.antes ?? []).map(({ nombre, lote }) => {
  const ruta = path.resolve(dirCal, lote)
  const l = JSON.parse(readFileSync(ruta, 'utf8'))
  return { guia: nombre, archivo: 'video', extra: { ...l, carpeta: path.resolve(path.dirname(ruta), l.carpeta ?? '.') } }
})

function filaDesde(inicio) {
  const i = Math.max(0, videos.findIndex((v) => v.guia === inicio))
  return [...extras, ...videos.slice(i), ...videos.slice(0, i)]
}

const paquetes = new Map()
function paquete(guia, idioma) {
  const clave = `${guia}/${idioma}`
  if (!paquetes.has(clave)) {
    const ruta = path.join(raiz, guia, idioma, 'paquete.json')
    paquetes.set(clave, existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : null)
  }
  return paquetes.get(clave)
}

const REDES_FOTOS = cal.fotos ?? ['facebook', 'instagram']
const RUTA_FOTOS = path.join(dirCal, 'plantillas.registro.json')
const registroFotos = existsSync(RUTA_FOTOS) ? JSON.parse(readFileSync(RUTA_FOTOS, 'utf8')).publicadas ?? {} : {}

const nombreLote = (item, red) => path.join(dirLotes, `${item.guia}-${item.archivo.replace(/\.mp4$/, '')}-${red}.json`)
const registros = new Map()
const registroDe = (item, red) => {
  const ruta = nombreLote(item, red).replace(/\.json$/, '.registro.json')
  if (!registros.has(ruta)) registros.set(ruta, existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : {})
  return registros.get(ruta)
}

// Qué toca ahora: por red e idioma, si ya es su hora, lo que falte del día de los primeros de su fila.
const porDia = cal.porDia ?? 2
const ahora = new Date()
const tareas = new Map() // `${guia}|${archivo}|${red}` → { item, red, idiomas }
const resumen = []
for (const grupo of cal.grupos) {
  const fila = filaDesde(grupo.inicio)
  for (const red of cal.redes) {
    for (const idioma of grupo.idiomas) {
      const h = cal.horarios?.[idioma] ?? {}
      const zona = h.zona ?? 'America/Mexico_City'
      const horas = h.horas ?? [h.hora ?? 19]
      const local = enZona(ahora, zona)
      // Cuántas le tocan ya hoy: una por cada horario que ya pasó (nunca más de porDia).
      const permitidas = Math.min(porDia, SIN_HORA ? horas.length : horas.filter((x) => local.hora >= x).length)
      const siguiente = horas.find((x) => local.hora < x)
      const clave = `${red}:${idioma}`
      let hechos = 0
      let deHoy = 0
      let fallaHoy = false
      const pendientes = []
      for (const item of fila) {
        if (item.completo && cal.soloPartes?.includes(red)) continue
        if (item.fotos && !REDES_FOTOS.includes(red)) continue
        const r = item.fotos ? registroFotos[`${item.guia}/carrusel|${clave}`] : registroDe(item, red)[clave]
        const delDia = r?.fecha && enZona(new Date(r.fecha), zona).dia === local.dia
        if (r?.estado === 'publicado') {
          hechos++
          if (delDia) deHoy++
        } else {
          // Un fallo de hoy espera a mañana: reintentar cada hora gasta el tope diario de la red.
          if (r?.estado === 'fallo' && delDia) fallaHoy = true
          pendientes.push(item)
        }
      }
      const toca = fallaHoy ? [] : pendientes.slice(0, Math.max(0, permitidas - deHoy))
      for (const item of toca) {
        const k = `${item.guia}|${item.archivo}|${red}`
        if (!tareas.has(k)) tareas.set(k, { item, red, idiomas: [] })
        tareas.get(k).idiomas.push(idioma)
      }
      resumen.push({
        red,
        idioma,
        publicados: `${hechos}/${hechos + pendientes.length}`,
        ahora: toca.length
          ? toca.map((v) => `${v.guia} ${v.archivo.replace('.mp4', '')}`).join(', ')
          : fallaHoy ? 'falló hoy, mañana' : deHoy >= porDia || siguiente === undefined ? 'listo hoy' : `a las ${siguiente}:00 (${local.hora}:00 allá)`,
      })
    }
  }
}

if (!tareas.size && EN_SERIO) {
  console.log(`${ahora.toLocaleTimeString('es-MX')}: nada que publicar en esta hora.`)
  process.exit(0)
}

log(`\n═══ Guías · ${ahora.toLocaleString('es-MX')} · ${EN_SERIO ? 'PUBLICAR' : 'ensayo'} ═══`)
console.table(resumen)

// ─── Un lote por video y red, con los idiomas a los que les toca ────────────

if (EN_SERIO) writeFileSync(CANDADO, String(process.pid))
try {
  const ordenadas = [...tareas.values()].sort((a, b) => cal.redes.indexOf(a.red) - cal.redes.indexOf(b.red))
  for (const { item, red, idiomas } of ordenadas) {
    if (item.fotos) {
      log(`\n── ${red} · ${item.guia} fotos (carrusel) · ${idiomas.join(',')}`)
      const r = spawnSync(process.execPath, [FOTOS_JS, rutaCal, `--guia=${item.guia}`, `--redes=${red}`, `--idiomas=${idiomas.join(',')}`, ...(EN_SERIO ? ['--publicar'] : [])], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`
      const util = EN_SERIO ? salida.trimEnd() : salida.split('\n').filter((l) => l.trimStart().startsWith('!')).join('\n')
      if (util) log(util)
      continue
    }
    const textos = {}
    for (const idioma of idiomas) {
      if (item.extra) {
        if (item.extra.textos?.[idioma]) textos[idioma] = item.extra.textos[idioma]
        else log(`! ${item.guia}/${idioma}: su lote no trae textos en ese idioma`)
        continue
      }
      const v = paquete(item.guia, idioma)?.videos.find((x) => x.archivo === item.archivo)
      if (v) textos[idioma] = textoPara(red, v)
      else log(`! ${item.guia}/${idioma}: el paquete.json no trae ${item.archivo}`)
    }
    const rutaLote = nombreLote(item, red)
    const lote = item.extra
      ? { carpeta: item.extra.carpeta, archivo: item.extra.archivo, aspecto: item.extra.aspecto ?? '9:16', redes: [red], textos }
      : { carpeta: path.join(raiz, item.guia), archivo: `{id}/${item.archivo}`, aspecto: '1:1', redes: [red], textos }
    writeFileSync(rutaLote, JSON.stringify(lote, null, 2) + '\n', 'utf8')

    log(`\n── ${red} · ${item.guia} ${item.archivo} · ${Object.keys(textos).join(',')}`)
    const r = spawnSync(process.execPath, [LOTE_JS, rutaLote, `--idiomas=${Object.keys(textos).join(',')}`, ...(EN_SERIO ? ['--publicar'] : [])], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`
    // En ensayo solo interesan los avisos (cuentas que faltan, archivos…); publicando, todo.
    const util = EN_SERIO ? salida.trimEnd() : salida.split('\n').filter((l) => l.trimStart().startsWith('!')).join('\n')
    if (util) log(util)
  }
} finally {
  if (EN_SERIO) rmSync(CANDADO, { force: true })
}
log(`\nRegistro del día: ${rutaLog}`)
