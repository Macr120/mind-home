/**
 * Doblaje con edge-tts (gratis), POR SEGMENTO del SRT: sintetiza cada frase,
 * comprueba que quepa en su presupuesto de tiempo y si no re-sintetiza más
 * rápido (+10/20/30 %); lo que aún sobre se comprime con atempo (≤ ×1.15) al
 * mezclar. El resultado es una sola pista `tts/<id>/mezcla.m4a` normalizada,
 * lista para `montar.mjs`.
 *
 *   node scripts/video/doblar.mjs lanzamiento de
 *   node scripts/video/doblar.mjs lanzamiento --todos [--incluir-es] [--alterna]
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsearSrt, presupuesto } from './srt.mjs'
import { VOCES, IDIOMAS_DESTINO } from './voces.mjs'

const ejecutar = promisify(execFile)
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const EDGE_TTS = process.env.EDGE_TTS || 'edge-tts'
/** Compresión máxima aceptable sin re-escribir la traducción. */
const ATEMPO_MAX = 1.15
const RATES = ['+0%', '+10%', '+20%', '+30%']

const args = process.argv.slice(2)
const [slug] = args
const flag = (n) => args.includes(`--${n}`)
if (!slug) {
  console.error('uso: doblar.mjs <slug> <idioma|--todos> [--incluir-es] [--alterna]')
  process.exit(1)
}
const DIR = path.join(RAIZ, 'marketing', 'video', slug)
const ids = flag('todos')
  ? [...IDIOMAS_DESTINO, ...(flag('incluir-es') ? ['es'] : [])]
  : args.filter((a) => !a.startsWith('--')).slice(1)
if (!ids.length) {
  console.error('¿Qué idioma? (código o --todos)')
  process.exit(1)
}

async function duracionDe(ruta) {
  const { stdout } = await ejecutar(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta])
  return Number(stdout.trim())
}

async function sintetizar(voz, rate, texto, ruta) {
  const extra = rate === '+0%' ? [] : [`--rate=${rate}`]
  await ejecutar(EDGE_TTS, ['--voice', voz, ...extra, '--text', texto, '--write-media', ruta])
  return duracionDe(ruta)
}

async function doblarIdioma(id) {
  const voz = flag('alterna') ? VOCES[id].alterna : VOCES[id].voz
  const segmentos = parsearSrt(readFileSync(path.join(DIR, `${id}.srt`), 'utf8'))
  const dirTts = path.join(DIR, 'tts', id)
  mkdirSync(dirTts, { recursive: true })

  const reporte = []
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i]
    const hueco = presupuesto(segmentos, i)
    const ruta = path.join(dirTts, `seg-${String(s.n).padStart(2, '0')}.mp3`)
    let dur = 0
    let rate = RATES[0]
    for (const r of RATES) {
      rate = r
      dur = await sintetizar(voz, r, s.texto.replace(/\n/g, ' '), ruta)
      if (dur <= hueco) break
    }
    const atempo = dur > hueco ? dur / hueco : 1
    const estado = atempo === 1 ? 'ok' : atempo <= ATEMPO_MAX ? 'atempo' : 'NO CABE'
    reporte.push({ n: s.n, inicio: s.inicio, hueco: +hueco.toFixed(2), dur: +dur.toFixed(2), rate, atempo: +Math.min(atempo, ATEMPO_MAX).toFixed(3), estado, ruta })
    console.log(`  #${String(s.n).padStart(2)} ${dur.toFixed(2)}s / ${hueco.toFixed(2)}s  rate ${rate}  ${estado === 'ok' ? '' : estado}`)
    if (estado === 'NO CABE') console.warn(`    → acorta la traducción del segmento ${s.n} en guion.${id}.json y repite (meter + doblar)`)
  }

  // Mezcla: cada segmento retrasado a su `inicio` (adelay), todo sumado y normalizado.
  const entradas = reporte.flatMap((r) => ['-i', r.ruta])
  const cadenas = reporte.map((r, i) => {
    const tempo = r.atempo > 1.001 ? `atempo=${r.atempo},` : ''
    return `[${i}:a]${tempo}adelay=${Math.round(r.inicio * 1000)}:all=1[a${i}]`
  })
  const suma = reporte.map((_, i) => `[a${i}]`).join('')
  const filtro = `${cadenas.join(';')};${suma}amix=inputs=${reporte.length}:normalize=0[m];[m]loudnorm=I=-16:TP=-1.5:LRA=11[out]`
  const mezcla = path.join(dirTts, 'mezcla.m4a')
  await ejecutar(FFMPEG, ['-y', ...entradas, '-filter_complex', filtro, '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', mezcla])

  writeFileSync(path.join(dirTts, 'reporte.json'), JSON.stringify(reporte, null, 2) + '\n', 'utf8')
  const rojos = reporte.filter((r) => r.estado === 'NO CABE').length
  console.log(`${rojos ? '✗' : '✓'} ${id}: ${reporte.length} segmentos → tts/${id}/mezcla.m4a${rojos ? ` (${rojos} NO CABEN)` : ''}`)
  return rojos
}

let rojosTotales = 0
for (const id of ids) {
  if (!existsSync(path.join(DIR, `${id}.srt`))) {
    console.error(`✗ ${id}: falta ${id}.srt (corre antes guion.mjs meter)`)
    rojosTotales++
    continue
  }
  console.log(`— ${id} (${flag('alterna') ? VOCES[id].alterna : VOCES[id].voz})`)
  rojosTotales += await doblarIdioma(id)
}
process.exit(rojosTotales ? 1 : 0)
