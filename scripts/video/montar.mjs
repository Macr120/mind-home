/**
 * Montaje final por idioma con ffmpeg (cwd = carpeta del slug, para esquivar el
 * escapado de rutas Windows en los filtros):
 *
 *   1. `salida/<id>.sin-subs.mp4` — el video original con el audio doblado
 *      (y `musica.mp3` por debajo al 22 % si existe). El español conserva su voz.
 *   2. `salida/<id>.mp4` — subtítulos quemados con libass (fuente Noto según
 *      idioma; MarginV alto para librar la UI de TikTok/Reels).
 *   3. `salida/<id>.srt` — la pista aparte (YouTube).
 *
 *   node scripts/video/montar.mjs lanzamiento de
 *   node scripts/video/montar.mjs lanzamiento --todos
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IDIOMAS_DESTINO, fuenteDe } from './voces.mjs'

const ejecutar = promisify(execFile)
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'

const args = process.argv.slice(2)
const [slug] = args
const flag = (n) => args.includes(`--${n}`)
if (!slug) {
  console.error('uso: montar.mjs <slug> <idioma|--todos>')
  process.exit(1)
}
const DIR = path.join(RAIZ, 'marketing', 'video', slug)
const ids = flag('todos') ? ['es', ...IDIOMAS_DESTINO] : args.filter((a) => !a.startsWith('--')).slice(1)
if (!ids.length) {
  console.error('¿Qué idioma? (código o --todos)')
  process.exit(1)
}

const ff = (argumentos) => ejecutar(FFMPEG, ['-y', ...argumentos], { cwd: DIR })
const hayMusica = existsSync(path.join(DIR, 'musica.mp3'))

/** Paso 1: audio sobre el video. El doblaje va encima; la música (si hay) por debajo. */
async function sinSubs(id) {
  const destino = `salida/${id}.sin-subs.mp4`
  const conVozOriginal = id === 'es'
  if (conVozOriginal && !hayMusica) {
    await ff(['-i', 'original.mp4', '-c', 'copy', destino])
    return
  }
  const voz = conVozOriginal ? ['-i', 'original.mp4'] : ['-i', `tts/${id}/mezcla.m4a`]
  const pistaVoz = conVozOriginal ? '0:a' : '1:a'
  if (hayMusica) {
    await ff([
      '-i', 'original.mp4', ...(conVozOriginal ? [] : voz), '-i', 'musica.mp3',
      '-filter_complex',
      `[${conVozOriginal ? 1 : 2}:a]volume=0.22[m];[${pistaVoz}][m]amix=inputs=2:duration=first:normalize=0,apad[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', destino,
    ])
  } else {
    await ff([
      '-i', 'original.mp4', ...voz,
      '-map', '0:v', '-map', '1:a', '-af', 'apad', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', destino,
    ])
  }
}

/** Paso 2: quemar subtítulos con libass (estilo legible 9:16, fuente por idioma). */
async function quemar(id) {
  const srt = id === 'es' ? 'es.srt' : `${id}.srt`
  const estilo = [
    `FontName=${fuenteDe(id)}`,
    'FontSize=15',
    'PrimaryColour=&H00FFFFFF',
    'OutlineColour=&H00000000',
    'BorderStyle=1',
    'Outline=1',
    'Shadow=0',
    'Alignment=2',
    'MarginV=120',
  ].join(',')
  await ff([
    '-i', `salida/${id}.sin-subs.mp4`,
    '-vf', `subtitles=${srt}:fontsdir=../fuentes:force_style='${estilo}'`,
    '-c:a', 'copy', `salida/${id}.mp4`,
  ])
}

mkdirSync(path.join(DIR, 'salida'), { recursive: true })
for (const id of ids) {
  const srt = path.join(DIR, id === 'es' ? 'es.srt' : `${id}.srt`)
  if (!existsSync(srt)) {
    console.error(`✗ ${id}: falta ${path.basename(srt)}`)
    process.exitCode = 1
    continue
  }
  if (id !== 'es' && !existsSync(path.join(DIR, 'tts', id, 'mezcla.m4a'))) {
    console.error(`✗ ${id}: falta tts/${id}/mezcla.m4a (corre antes doblar.mjs)`)
    process.exitCode = 1
    continue
  }
  await sinSubs(id)
  await quemar(id)
  copyFileSync(srt, path.join(DIR, 'salida', `${id}.srt`))
  console.log(`✓ ${id}: salida/${id}.mp4 + .sin-subs.mp4 + .srt`)
}
