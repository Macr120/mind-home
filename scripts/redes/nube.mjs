/**
 * La publicación de las guías corre en la nube (GitHub Actions,
 * `.github/workflows/publicar-guias.yml`) y no en la PC. Este comando mueve lo
 * necesario entre la PC y R2:
 *
 *   node scripts/redes/nube.mjs <calendario.json> subir-guias
 *     Los videos (parte-N.mp4, completo.mp4) al bucket público `mindhaos-media`
 *     (guias-video/…) y sus textos e imágenes (paquete.json, plantilla-*.jpg) al
 *     privado `mindhaos-publicacion` (escritorio/…). Solo copia lo nuevo o cambiado:
 *     córrelo cada vez que termines una guía o retoques una.
 *
 *   node scripts/redes/nube.mjs <calendario.json> bajar-estado
 *     Trae a la carpeta del calendario lo que dejó la nube: registros de qué salió,
 *     bitácoras y vistas-historial.json. Para revisar cómo vamos.
 *
 *   node scripts/redes/nube.mjs <calendario.json> subir-estado
 *     Lleva la carpeta del calendario a la nube. LA NUBE ES LA COPIA BUENA: solo
 *     tras editar calendario.json (o al mudarse), y siempre después de bajar-estado,
 *     o se pisan los registros de lo ya publicado.
 *
 * En R2 las carpetas guardan la misma forma que en el disco (relativas a la `raiz`
 * del calendario), así la corrida en la nube las arma igual. Usa rclone con la
 * llave S3 de R2 de `.env.r2` (ignorado por git).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const rutaEnv = path.join(RAIZ, '.env.r2')
const env = {}
if (existsSync(rutaEnv)) {
  for (const linea of readFileSync(rutaEnv, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
for (const k of ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT']) {
  if (!env[k]) {
    console.error(`Falta ${k} en .env.r2`)
    process.exit(1)
  }
}
const rclone = (...a) => {
  const r = spawnSync(process.env.RCLONE ?? 'rclone', [...a, '--s3-no-check-bucket', '--transfers', '8', '--checkers', '16', '--stats-one-line', '--stats', '30s', '-v'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      RCLONE_CONFIG_R2_TYPE: 's3',
      RCLONE_CONFIG_R2_PROVIDER: 'Cloudflare',
      RCLONE_CONFIG_R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
      RCLONE_CONFIG_R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
      RCLONE_CONFIG_R2_ENDPOINT: env.R2_ENDPOINT,
    },
  })
  if (r.status !== 0) {
    console.error(`rclone terminó con error (${r.status ?? r.error?.message}).`)
    process.exit(1)
  }
}

const [rutaCal, accion] = process.argv.slice(2)
if (!rutaCal || !['subir-guias', 'bajar-estado', 'subir-estado'].includes(accion)) {
  console.error('uso: nube.mjs <calendario.json> subir-guias | bajar-estado | subir-estado')
  process.exit(1)
}
const cal = JSON.parse(readFileSync(rutaCal, 'utf8'))
const dirCal = path.dirname(path.resolve(rutaCal))
const raiz = path.resolve(dirCal, cal.raiz ?? '..')
const estadoR2 = `r2:mindhaos-publicacion/escritorio/${path.relative(raiz, dirCal).split(path.sep).join('/')}`
// El candado de una corrida local nunca viaja: en la nube detendría las corridas.
const sinCandado = ['--exclude', '.en-curso']

if (accion === 'bajar-estado') rclone('copy', estadoR2, dirCal, ...sinCandado)
else if (accion === 'subir-estado') rclone('copy', dirCal, estadoR2, ...sinCandado)
else {
  // Las rutas relativas a la raíz: videos por un lado, textos e imágenes por otro.
  const videos = []
  const datos = []
  const rel = (p) => path.relative(raiz, p).split(path.sep).join('/')
  for (const guia of cal.orden) {
    const dir = path.join(raiz, guia)
    if (!existsSync(dir)) continue
    for (const id of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
      for (const a of readdirSync(path.join(dir, id))) {
        if (/^(parte-\d+|completo)\.mp4$/.test(a)) videos.push(rel(path.join(dir, id, a)))
        else if (a === 'paquete.json' || /^plantilla-.+\.jpg$/.test(a)) datos.push(rel(path.join(dir, id, a)))
      }
    }
  }
  // Las publicaciones sueltas de `antes`: su lote y el video de cada idioma.
  for (const { lote } of cal.antes ?? []) {
    const rutaLote = path.resolve(dirCal, lote)
    const l = JSON.parse(readFileSync(rutaLote, 'utf8'))
    datos.push(rel(rutaLote))
    for (const id of Object.keys(l.textos ?? {})) {
      const v = path.resolve(path.dirname(rutaLote), l.carpeta ?? '.', String(l.archivo).replaceAll('{id}', id))
      if (existsSync(v)) videos.push(rel(v))
    }
  }
  const tmp = mkdtempSync(path.join(tmpdir(), 'nube-'))
  try {
    writeFileSync(path.join(tmp, 'videos.txt'), videos.join('\n') + '\n')
    writeFileSync(path.join(tmp, 'datos.txt'), datos.join('\n') + '\n')
    console.log(`${datos.length} textos e imágenes → mindhaos-publicacion`)
    rclone('copy', raiz, 'r2:mindhaos-publicacion/escritorio', '--files-from', path.join(tmp, 'datos.txt'))
    console.log(`${videos.length} videos → mindhaos-media/guias-video`)
    rclone('copy', raiz, 'r2:mindhaos-media/guias-video', '--files-from', path.join(tmp, 'videos.txt'))
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}
