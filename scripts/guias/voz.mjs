// Voz de Pep@ para las guías de la web, una pista por línea del guion:
//   web/public/guias/<tema>/audio/<id>/<parte>.<linea>.mp3 + tiempos.json (segundos)
//
//   node scripts/guias/voz.mjs ejercicio            español
//   node scripts/guias/voz.mjs ejercicio en fr      esos idiomas
//   node scripts/guias/voz.mjs ejercicio --forzar   vuelve a sintetizar todo
//
// Solo resintetiza las líneas cuyo texto cambió (la huella va en tiempos.json).
// Mismo camino que la promo (marketing/promo/voz.mjs): edge-tts + loudnorm, aquí
// en mono a 64 kbps porque la web lo sirve tal cual, y con el tiempo de cada
// palabra (tts_palabras.py) para iluminar el texto mientras suena.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VOCES } from '../video/voces.mjs'

const ejecutar = promisify(execFile)
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const PYTHON = process.env.PYTHON || 'python'
/**
 * Con AZURE_SPEECH_KEY/AZURE_SPEECH_REGION en .env.local se sintetiza con Azure Speech (las
 * mismas voces neuronales, servicio oficial); si no, con edge-tts, que desde oct 2026 da 403.
 */
for (const linea of existsSync(path.join(RAIZ, '.env.local')) ? readFileSync(path.join(RAIZ, '.env.local'), 'utf8').split('\n') : []) {
  const m = /^(AZURE_SPEECH_KEY|AZURE_SPEECH_REGION)=(.*)$/.exec(linea.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const TTS = path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.AZURE_SPEECH_KEY ? 'tts_azure.py' : 'tts_palabras.py')
/** Ritmo de la narración: didáctico, un poco más vivo que el +0 % por defecto. */
const RATE = '+6%'

const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--') && !(a in VOCES))
const ids = args.filter((a) => a in VOCES)
const forzar = args.includes('--forzar')
if (!tema) {
  console.error('uso: node scripts/guias/voz.mjs <tema> [idiomas…] [--forzar]')
  process.exit(1)
}

/**
 * La voz propia de una guía (`marketing/guias/<tema>/voz.json`, opcional): el
 * narrador de Idiomas es un mago viejo, así que va más grave, más lenta y con un
 * temblor leve. `voces` cambia la voz de algún idioma; `filtro` va antes del loudnorm.
 */
const rutaVozTema = path.join(RAIZ, 'marketing', 'guias', tema, 'voz.json')
const VOZ_TEMA = existsSync(rutaVozTema) ? JSON.parse(readFileSync(rutaVozTema, 'utf8')) : {}
const RITMO = VOZ_TEMA.rate ?? RATE
const TONO = VOZ_TEMA.pitch ?? '+0Hz'
const FILTRO = VOZ_TEMA.filtro ? `${VOZ_TEMA.filtro},` : ''

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
// La huella lleva el ritmo, el tono y el filtro: cambiar la voz de la guía rehace sus pistas.
const huella = (s) => createHash('sha1').update(RITMO + (VOZ_TEMA.rate || VOZ_TEMA.pitch || VOZ_TEMA.filtro ? TONO + FILTRO : '') + s).digest('hex').slice(0, 12)

async function duracion(ruta) {
  const { stdout } = await ejecutar(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta])
  return Math.round(Number(stdout.trim()) * 100) / 100
}

/** Sintetiza una línea; devuelve su duración y el segundo en que empieza cada palabra. */
async function sintetizar(voz, texto, ruta) {
  const crudo = ruta + '.crudo.mp3'
  let palabras = []
  // El servicio de edge-tts devuelve 503 a ráfagas: reintentar con espera.
  for (let intento = 1; ; intento++) {
    try {
      const { stdout } = await ejecutar(PYTHON, [TTS, voz, RITMO, crudo, texto, TONO])
      palabras = JSON.parse(stdout.trim())
      // A veces el servicio devuelve un audio vacío (sin palabras): también se reintenta.
      if (!palabras.length) throw new Error('audio vacío')
      // O un audio cortado que ffmpeg no puede leer: se sintetiza otra vez.
      await ejecutar(FFMPEG, ['-y', '-i', crudo, '-af', `${FILTRO}loudnorm=I=-16:TP=-1.5:LRA=11`, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', ruta])
      // Y uno truncado que sí trae palabras: la última empieza después de que acaba el audio.
      if (palabras[palabras.length - 1] > (await duracion(ruta)) - 0.1) throw new Error('audio truncado')
      break
    } catch (e) {
      if (intento >= 10) throw e
      await dormir(3000 * intento)
    }
  }
  unlinkSync(crudo)
  return { dur: await duracion(ruta), palabras }
}

/** Silencio entre líneas dentro de la pista de una parte (s). */
const ENTRE_LINEAS = 0.35

/**
 * Una pista por parte (y otra para el cierre) con sus líneas seguidas: es lo
 * que sirve la web (7 archivos por idioma en vez de 40). `inicios` dice en qué
 * segundo de la pista empieza cada línea; la página salta ahí y cambia de
 * línea al llegar a la siguiente. Las pistas por línea se quedan para el video
 * (casa.mjs y montar.mjs las usan sueltas). Solo se rehace la pista de una
 * parte si cambió alguna de sus líneas.
 */
async function armarPartes(guion, dir, tiempos, previas) {
  const grupos = [
    ...guion.partes.map((p) => [p.id, p.lineas.map((l) => `${p.id}.${l.id}`)]),
    ['cierre', [`cierre.${guion.cierre.id}`]],
  ]
  mkdirSync(path.join(dir, 'partes'), { recursive: true })
  const partes = {}
  for (const [parte, claves] of grupos) {
    const archivo = `partes/${parte}.mp3`
    // Con la duración: una línea resintetizada con el mismo texto (p. ej., la que salió vacía) también rehace la pista.
    const firma = huella(claves.map((c) => `${tiempos._huellas[c]}:${tiempos[c]}`).join('|') + ENTRE_LINEAS)
    const inicios = {}
    let t = 0
    for (const c of claves) {
      inicios[c] = Math.round(t * 1000) / 1000
      t += tiempos[c] + ENTRE_LINEAS
    }
    if (previas[parte]?.firma !== firma || !existsSync(path.join(dir, archivo))) {
      const entradas = claves.flatMap((c) => ['-i', path.join(dir, `${c}.mp3`)])
      const filtro =
        // Cada línea medida justo a su duración + el silencio: los `inicios` no se desvían a lo largo de la parte.
        claves
          .map((c, i) => `[${i}:a]aresample=24000,atrim=duration=${tiempos[c]},apad=whole_dur=${tiempos[c] + (i < claves.length - 1 ? ENTRE_LINEAS : 0)}[l${i}]`)
          .join(';') +
        ';' + claves.map((_, i) => `[l${i}]`).join('') + `concat=n=${claves.length}:v=0:a=1[a]`
      await ejecutar(FFMPEG, ['-y', ...entradas, '-filter_complex', filtro, '-map', '[a]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', path.join(dir, archivo)])
    }
    // `v` cambia con el contenido: la URL de la pista no se queda en caché vieja tras rehacerla.
    partes[parte] = { archivo, v: firma, firma, inicios }
  }
  return partes
}

for (const id of ids.length ? ids : ['es']) {
  const rutaGuion = path.join(RAIZ, 'marketing', 'guias', tema, `guion.${id}.json`)
  if (!existsSync(rutaGuion)) {
    console.log(`✗ ${id}: falta ${path.relative(RAIZ, rutaGuion)}`)
    continue
  }
  const guion = JSON.parse(readFileSync(rutaGuion, 'utf8'))
  const dir = path.join(RAIZ, 'web', 'public', 'guias', tema, 'audio', id)
  mkdirSync(dir, { recursive: true })
  const rutaTiempos = path.join(dir, 'tiempos.json')
  const previo = existsSync(rutaTiempos) ? JSON.parse(readFileSync(rutaTiempos, 'utf8')) : {}
  const huellas = previo._huellas ?? {}
  const lineas = [
    ...guion.partes.flatMap((p) => p.lineas.map((l) => [`${p.id}.${l.id}`, l.texto])),
    [`cierre.${guion.cierre.id}`, guion.cierre.texto],
  ]
  const tiempos = { _huellas: {}, _palabras: {} }
  let hechas = 0
  for (const [clave, texto] of lineas) {
    const ruta = path.join(dir, `${clave}.mp3`)
    const h = huella(texto)
    if (!forzar && huellas[clave] === h && existsSync(ruta) && previo[clave] && previo._palabras?.[clave]) {
      tiempos[clave] = previo[clave]
      tiempos._palabras[clave] = previo._palabras[clave]
    } else {
      const r = await sintetizar(VOZ_TEMA.voces?.[id] ?? VOCES[id].voz, texto, ruta)
      tiempos[clave] = r.dur
      tiempos._palabras[clave] = r.palabras
      hechas++
      process.stdout.write(`  ${id} ${clave} ${tiempos[clave]}s\n`)
      await dormir(300)
    }
    tiempos._huellas[clave] = h
    // Se guarda a cada línea: si el servicio se cae a media lista, la próxima vuelta sigue desde aquí.
    writeFileSync(
      rutaTiempos,
      JSON.stringify({ ...previo, ...tiempos, _huellas: { ...huellas, ...tiempos._huellas }, _palabras: { ...previo._palabras, ...tiempos._palabras } }, null, 1),
    )
  }
  tiempos._partes = await armarPartes(guion, dir, tiempos, previo._partes ?? {})
  writeFileSync(rutaTiempos, JSON.stringify(tiempos, null, 1))
  const total = lineas.reduce((s, [c]) => s + tiempos[c], 0)
  console.log(`✓ ${id}: ${lineas.length} líneas (${hechas} nuevas) · ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')} de voz`)
}
