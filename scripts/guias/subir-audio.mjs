// Sube el audio de las guías a R2 (bucket `mindhaos-media`, servido en
// media.mindhaos.com): por tema e idioma, el `tiempos.json` y una pista por
// parte (`partes/*.mp3`, las arma voz.mjs). Las pistas por línea NO se suben:
// solo las usa el video.
//
//   node scripts/guias/subir-audio.mjs ejercicio            todos los idiomas
//   node scripts/guias/subir-audio.mjs ejercicio en fr      esos idiomas
//
// Recuerda qué subió (subido.json, junto al audio) y no repite una pista cuya
// versión ya está arriba. El CORS del bucket está en r2-cors.json (la boca de
// Pep@ analiza el audio, y sin CORS llega en silencio).
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ejecutar = promisify(execFile)
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BUCKET = 'mindhaos-media'
const [tema, ...pedidos] = process.argv.slice(2)
if (!tema) {
  console.error('uso: node scripts/guias/subir-audio.mjs <tema> [idiomas…]')
  process.exit(1)
}
const AUDIO = path.join(RAIZ, 'web', 'public', 'guias', tema, 'audio')
const ids = pedidos.length ? pedidos : readdirSync(AUDIO).filter((d) => existsSync(path.join(AUDIO, d, 'tiempos.json')))

/** wrangler por npx (en Windows, a través de cmd). */
const wrangler = (args) => ejecutar(process.platform === 'win32' ? 'cmd' : 'npx', [...(process.platform === 'win32' ? ['/c', 'npx'] : []), 'wrangler', ...args], { cwd: RAIZ, maxBuffer: 1 << 24 })

async function subir(local, clave, tipo, cache) {
  for (let intento = 1; ; intento++) {
    try {
      await wrangler(['r2', 'object', 'put', `${BUCKET}/${clave}`, '--file', local, '--content-type', tipo, '--cache-control', cache, '--remote'])
      return
    } catch (e) {
      if (intento >= 3) throw e
    }
  }
}

for (const id of ids) {
  const dir = path.join(AUDIO, id)
  const tiempos = JSON.parse(readFileSync(path.join(dir, 'tiempos.json'), 'utf8'))
  if (!tiempos._partes) throw new Error(`${id}: tiempos.json sin _partes; corre antes scripts/guias/voz.mjs`)
  const rutaSubido = path.join(dir, 'subido.json')
  const subido = existsSync(rutaSubido) ? JSON.parse(readFileSync(rutaSubido, 'utf8')) : {}
  let n = 0
  for (const [parte, p] of Object.entries(tiempos._partes)) {
    if (subido[parte] === p.v) continue
    // La URL lleva ?v=<versión>: la pista puede quedarse en caché todo un año.
    await subir(path.join(dir, p.archivo), `guias/${tema}/audio/${id}/${p.archivo}`, 'audio/mpeg', 'public, max-age=31536000, immutable')
    subido[parte] = p.v
    writeFileSync(rutaSubido, JSON.stringify(subido, null, 1))
    n++
  }
  // Los tiempos van siempre (pesan poco) y con caché corta: dicen qué versión de cada pista pedir.
  await subir(path.join(dir, 'tiempos.json'), `guias/${tema}/audio/${id}/tiempos.json`, 'application/json', 'public, max-age=300')
  console.log(`✓ ${id}: ${n} pistas subidas`)
}
