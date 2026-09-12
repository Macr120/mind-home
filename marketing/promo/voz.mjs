// Voz en off con edge-tts, una pista por línea del guion:
//   public/voz/<id>/<linea>.mp3 + public/voz/<id>/tiempos.json (segundos por línea)
//
//   node voz.mjs                          los 16 idiomas
//   node voz.mjs es en ar                 solo esos
//   node voz.mjs es --solo=gancho,cta     solo esas líneas
//   node voz.mjs de --rate=+10%           todas las líneas más rápidas (edge-tts)
//   node voz.mjs --forzar                 vuelve a sintetizar aunque nada haya cambiado
//
// Cada línea tiene un TOPE de segundos (lo que dura lo visual de su escena, ver
// `src/escenas.ts`): si la voz se pasa mucho, se vuelve a sintetizar más rápida
// (+10 %, +20 %), igual que hace `scripts/video/doblar.mjs`. Pasarse un poco
// no es problema: la escena se alarga sola.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VOCES } from '../../scripts/video/voces.mjs'

const ejecutar = promisify(execFile)
const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(RAIZ, 'public')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const EDGE_TTS = process.env.EDGE_TTS || 'edge-tts'
const IDIOMAS = Object.keys(VOCES)

/** Segundos que dura lo visual de cada escena (espejo de `src/escenas.ts`). */
const TOPES = { gancho: 3.2, casa: 7.2, disena: 8.0, metas: 8.2, ia: 7.8, cerebro: 9.6, idiomas: 7.2, cta: 3.2, eslogan: 6.5 }
/** Hasta aquí se tolera que la voz alargue la escena antes de acelerarla. */
const HOLGURA = 1.3
/** Ritmo base +15 %: a +0 % la voz neuronal va lenta para un anuncio y el total pasaba de 70 s. */
const RATES = ['+15%', '+25%', '+35%']

const args = process.argv.slice(2)
const opcion = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const ids = args.filter((a) => IDIOMAS.includes(a))
const objetivo = ids.length ? ids : IDIOMAS
const solo = opcion('solo')?.split(',').filter(Boolean)
const rateFijo = opcion('rate')
const forzar = args.includes('--forzar')

async function duracion(ruta) {
  const { stdout } = await ejecutar(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta])
  return Number(stdout.trim())
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function sintetizar(voz, rate, texto, ruta) {
  const crudo = ruta + '.crudo.mp3'
  const extra = rate === '+0%' ? [] : [`--rate=${rate}`]
  // El servicio de edge-tts devuelve 503 a ráfagas de peticiones: reintentar con espera.
  for (let intento = 1; ; intento++) {
    try {
      await ejecutar(EDGE_TTS, ['--voice', voz, ...extra, '--text', texto, '--write-media', crudo])
      break
    } catch (e) {
      if (intento >= 5) throw e
      await dormir(4000 * intento)
    }
  }
  await dormir(300)
  // Mismo volumen en los 16 idiomas: normalización de sonoridad (como doblar.mjs).
  await ejecutar(FFMPEG, ['-y', '-i', crudo, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'libmp3lame', '-b:a', '160k', ruta])
  unlinkSync(crudo)
  return Math.round((await duracion(ruta)) * 100) / 100
}

let problemas = 0
for (const id of objetivo) {
  const rutaGuion = path.join(RAIZ, 'guion', id + '.json')
  if (!existsSync(rutaGuion)) {
    console.log(`✗ ${id}: falta guion/${id}.json`)
    problemas++
    continue
  }
  const guion = JSON.parse(readFileSync(rutaGuion, 'utf8'))
  const dir = path.join(PUBLIC, 'voz', id)
  mkdirSync(dir, { recursive: true })
  const rutaTiempos = path.join(dir, 'tiempos.json')
  const tiempos = existsSync(rutaTiempos) ? JSON.parse(readFileSync(rutaTiempos, 'utf8')) : {}
  // Firma de cada línea (texto + ajustes): lo que no cambió no se vuelve a sintetizar.
  const rutaFirmas = path.join(dir, 'firmas.json')
  const firmas = existsSync(rutaFirmas) ? JSON.parse(readFileSync(rutaFirmas, 'utf8')) : {}
  const voz = VOCES[id].voz
  console.log(`— ${id} (${voz})`)
  for (const [clave, texto] of Object.entries(guion.lineas)) {
    if (solo && !solo.includes(clave)) continue
    const ruta = path.join(dir, clave + '.mp3')
    const tope = (TOPES[clave] ?? 8) * HOLGURA
    const firma = [voz, rateFijo || RATES.join(), HOLGURA, tope.toFixed(2), texto].join('|')
    if (!forzar && firmas[clave] === firma && tiempos[clave] && existsSync(ruta)) {
      console.log(`  ${clave.padEnd(8)} ${tiempos[clave].toFixed(2)} s  (sin cambios)`)
      continue
    }
    let seg = 0
    let rate = rateFijo || RATES[0]
    for (const r of rateFijo ? [rateFijo] : RATES) {
      rate = r
      seg = await sintetizar(voz, r, texto, ruta)
      if (seg <= tope) break
    }
    tiempos[clave] = seg
    firmas[clave] = firma
    writeFileSync(rutaTiempos, JSON.stringify(tiempos, null, 2) + '\n')
    writeFileSync(rutaFirmas, JSON.stringify(firmas, null, 2) + '\n')
    const aviso = seg > tope ? `  ¡se pasa del tope ${tope.toFixed(1)} s: acorta la línea!` : rate !== RATES[0] ? `  (rate ${rate})` : ''
    console.log(`  ${clave.padEnd(8)} ${seg.toFixed(2)} s${aviso}`)
    if (seg > tope) problemas++
  }
  writeFileSync(rutaTiempos, JSON.stringify(tiempos, null, 2) + '\n')
}
console.log(problemas ? `\n${problemas} líneas se pasan: acórtalas en guion/<id>.json y repite` : '\nvoces listas → node preparar.mjs')
process.exit(problemas ? 1 : 0)
