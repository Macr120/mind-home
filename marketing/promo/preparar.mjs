// Arma `src/generado/manifiesto.json`, la única fuente de verdad que leen el
// Studio y el render: qué guion, qué voces, qué clips y qué música hay por
// idioma, con sus duraciones (ffprobe). Corre después de `voz.mjs` y de
// `grabar/grabar.mjs`, y antes de abrir el Studio o renderizar.
//
//   node preparar.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(RAIZ, 'public')
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']
/** Idiomas que lucen en la ráfaga «16 idiomas», por orden de preferencia (escrituras distintas primero). */
const RAFAGA = ['ja', 'ar', 'hi', 'ko', 'ru', 'zh', 'de', 'pt', 'fr', 'tr', 'pl', 'it', 'nl', 'id', 'en', 'es']
const RAFAGA_N = 6

const rel = (...p) => p.join('/')
const duraciones = new Map()
function duracion(ruta) {
  if (!duraciones.has(ruta)) {
    const s = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta]).toString().trim()
    duraciones.set(ruta, Math.round(Number(s) * 100) / 100)
  }
  return duraciones.get(ruta)
}

// 1. Fuentes Noto (las mismas del doblaje), copiadas una vez.
const ORIGEN_FUENTES = path.join(RAIZ, '..', 'video', 'fuentes')
mkdirSync(path.join(PUBLIC, 'fuentes'), { recursive: true })
for (const f of readdirSync(ORIGEN_FUENTES)) {
  if (!f.endsWith('.ttf')) continue
  const destino = path.join(PUBLIC, 'fuentes', f)
  if (!existsSync(destino)) copyFileSync(path.join(ORIGEN_FUENTES, f), destino)
}

// 2. Por idioma.
const guionEs = JSON.parse(readFileSync(path.join(RAIZ, 'guion', 'es.json'), 'utf8'))
const idiomas = {}
const avisos = []
for (const id of IDIOMAS) {
  const rutaGuion = path.join(RAIZ, 'guion', id + '.json')
  let guion = guionEs
  if (existsSync(rutaGuion)) guion = JSON.parse(readFileSync(rutaGuion, 'utf8'))
  else avisos.push(`${id}: sin guion/${id}.json, usa el español`)

  const voz = {}
  const rutaTiempos = path.join(PUBLIC, 'voz', id, 'tiempos.json')
  if (existsSync(rutaTiempos)) {
    const t = JSON.parse(readFileSync(rutaTiempos, 'utf8'))
    for (const [clave, seg] of Object.entries(t)) {
      if (existsSync(path.join(PUBLIC, 'voz', id, clave + '.mp3'))) voz[clave] = { ruta: rel('voz', id, clave + '.mp3'), seg }
    }
  }
  const sinVoz = Object.keys(guion.lineas).filter((k) => !voz[k])
  if (sinVoz.length) avisos.push(`${id}: sin voz para ${sinVoz.join(', ')} (node voz.mjs ${id})`)

  const clips = {}
  for (const origen of [id, 'es']) {
    const dir = path.join(PUBLIC, 'clips', origen)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.mp4')) continue
      const nombre = f.slice(0, -4)
      if (clips[nombre]) continue
      clips[nombre] = { ruta: rel('clips', origen, f), seg: duracion(path.join(dir, f)) }
    }
  }
  const prestados = Object.values(clips).filter((c) => !c.ruta.startsWith('clips/' + id + '/')).length
  if (id !== 'es' && prestados) avisos.push(`${id}: ${prestados} clips prestados del español (node grabar/grabar.mjs ${id})`)

  const rafaga = []
  for (const otro of RAFAGA) {
    if (otro === id || rafaga.length >= RAFAGA_N) continue
    const r = path.join(PUBLIC, 'clips', otro, '05-calendario.mp4')
    if (existsSync(r)) rafaga.push(rel('clips', otro, '05-calendario.mp4'))
  }

  idiomas[id] = {
    guion,
    voz,
    clips,
    rafaga,
    escritorio: rel('marca', id === 'es' ? 'escritorio-es.png' : 'escritorio-en.png'),
  }
}

const musica = existsSync(path.join(PUBLIC, 'musica.mp3')) ? 'musica.mp3' : null
if (!musica) avisos.push('sin public/musica.mp3: el anuncio sale sin música')

mkdirSync(path.join(RAIZ, 'src', 'generado'), { recursive: true })
const manifiesto = { fps: 30, musica, idiomas }
writeFileSync(path.join(RAIZ, 'src', 'generado', 'manifiesto.json'), JSON.stringify(manifiesto, null, 2) + '\n')

for (const id of IDIOMAS) {
  const d = idiomas[id]
  const vozSeg = Object.values(d.voz).reduce((a, m) => a + m.seg, 0)
  console.log(`${id}: ${Object.keys(d.clips).length} clips · ${Object.keys(d.voz).length} voces (${vozSeg.toFixed(1)} s) · ráfaga ${d.rafaga.length}`)
}
if (avisos.length) console.log('\nAvisos:\n- ' + avisos.join('\n- '))
console.log('\nmanifiesto → src/generado/manifiesto.json')
