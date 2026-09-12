// Graba los clips del anuncio desde la casa demo, con la UI en cada idioma:
//   public/clips/<idioma>/<toma>.mp4   (1080×1920, 30 fps, H.264)
//
//   node grabar/grabar.mjs                    los 16 idiomas, todas las tomas
//   node grabar/grabar.mjs es en              solo esos idiomas
//   node grabar/grabar.mjs es --escena=02-casa-gira,07-baile
//   node grabar/grabar.mjs es --escena=02-casa-gira --spike   (deja también el crudo)
//
// Necesita el dev server `mind-home-pruebas` (localhost:53378) levantado. El
// Chrome grabador se lanza solo (perfil propio en marketing/promo/perfil-chrome).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESCENAS } from './escenas.mjs'
import { codigoGrabar } from './grabador-pagina.mjs'
import { ajustarVentana, arrancarChrome, conNavegador, conSesion, dormir, esperarDemo, gpu, intacto, AYUDAS } from './sesion.mjs'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const CLIPS = path.join(RAIZ, '..', 'public', 'clips')
const DESCARGAS = path.join(RAIZ, '..', 'perfil-chrome', 'descargas')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']
/** Frases del chat demo (pregunta/respuesta) en los 16 idiomas: las mismas de las capturas de tienda. */
const COPIA = JSON.parse(readFileSync(path.join(RAIZ, '..', '..', 'tienda', 'generador', 'copia.json'), 'utf8'))

const args = process.argv.slice(2)
const opcion = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const pedidos = args.filter((a) => IDIOMAS.includes(a))
const idiomas = pedidos.length ? pedidos : IDIOMAS
const soloEscenas = opcion('escena')?.split(',').filter(Boolean)
const escenas = soloEscenas ? ESCENAS.filter((e) => soloEscenas.includes(e.nombre)) : ESCENAS
const spike = args.includes('--spike')
if (soloEscenas && escenas.length !== soloEscenas.length) {
  console.error('escena desconocida; las que hay: ' + ESCENAS.map((e) => e.nombre).join(', '))
  process.exit(1)
}

function sonda(ruta) {
  const j = JSON.parse(
    execFileSync(FFPROBE, [
      '-v', 'error', '-select_streams', 'v:0', '-count_frames',
      '-show_entries', 'stream=codec_name,width,height,nb_read_frames',
      '-show_entries', 'format=duration', '-of', 'json', ruta,
    ]).toString(),
  )
  const s = j.streams?.[0] || {}
  const dur = Number(j.format?.duration || 0)
  return { codec: s.codec_name, w: s.width, h: s.height, frames: Number(s.nb_read_frames || 0), dur, fps: dur ? Number(s.nb_read_frames) / dur : 0 }
}

/** Crudo del navegador → mp4 H.264 a 30 fps constantes, recortado al viewport (1080×1920 desde la esquina). */
function convertir(crudo, salida, ajustes) {
  if (ajustes.width < 1080 || ajustes.height < 1920) throw new Error(`la captura salió a ${ajustes.width}×${ajustes.height}: no cubre 1080×1920`)
  const filtros = ['crop=1080:1920:0:0', 'fps=30']
  execFileSync(FFMPEG, [
    '-y', '-i', crudo, '-vf', filtros.join(','), '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-fps_mode', 'cfr', '-movflags', '+faststart',
    salida,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
}

async function grabarEscena(c, b, esc, id) {
  rmSync(DESCARGAS, { recursive: true, force: true })
  mkdirSync(DESCARGAS, { recursive: true })
  const L = COPIA[id] || COPIA.es
  const cabecera = `const CHAT_Q = ${JSON.stringify(L.chatQ)}; const CHAT_A = ${JSON.stringify(L.chatA)};`
  // La descarga se anuncia por el WebSocket del NAVEGADOR (donde se fijó la carpeta).
  const descarga = new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('la descarga no llegó en 90 s')), 90000)
    const quitar = b.escuchar('Browser.downloadProgress', (p) => {
      if (p.state === 'completed') { clearTimeout(timer); quitar(); res(p.guid) }
      if (p.state === 'canceled') { clearTimeout(timer); quitar(); rej(new Error('descarga cancelada')) }
    })
  })
  descarga.catch(() => {})
  const r = await c.enviar('Runtime.evaluate', {
    expression: codigoGrabar(esc, AYUDAS + cabecera),
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'excepción en la página')
  const v = r.result?.value || {}
  if (v.error) console.log(`    aviso de la escena: ${v.error}`)
  const guid = await descarga
  const crudo = path.join(DESCARGAS, guid)
  for (let i = 0; i < 50 && !existsSync(crudo); i++) await dormir(200)
  if (!existsSync(crudo)) throw new Error('no apareció el archivo descargado')
  const aj = v.ajustes || {}
  if (!aj.width || aj.width < 1080) throw new Error(`la captura salió a ${aj.width}×${aj.height} (dpr ${v.dpr}): no es 3×`)
  if (!v.bytes) throw new Error(`el grabador no produjo datos (${v.mime}, ${aj.width}×${aj.height})`)
  const dir = path.join(CLIPS, id)
  mkdirSync(dir, { recursive: true })
  const salida = path.join(dir, esc.nombre + '.mp4')
  const ext = v.mime && v.mime.includes('mp4') ? 'mp4' : 'webm'
  const crudoFinal = path.join(dir, esc.nombre + '.crudo.' + ext)
  renameSync(crudo, crudoFinal)
  const antes = sonda(crudoFinal)
  convertir(crudoFinal, salida, aj)
  const despues = sonda(salida)
  if (!spike) unlinkSync(crudoFinal)
  const extra = v.extra && v.extra !== 'ok' ? `  [${v.extra}]` : ''
  console.log(
    `  ${esc.nombre.padEnd(20)} ${aj.width}×${aj.height} ${v.mime}  crudo ${antes.fps.toFixed(1)} fps/${antes.dur.toFixed(1)} s → ${despues.w}×${despues.h} ${despues.codec} ${despues.dur.toFixed(2)} s${extra}`,
  )
  return despues
}

async function grabarIdioma(id, b) {
  return conSesion(async (c, t) => {
    const estado = await esperarDemo(c, id)
    if (estado !== 'ok') return estado
    const v = await ajustarVentana(c, b, t.id)
    console.log(`  área de contenido ${v.iw}×${v.ih} DIP (viewport 360×640 en la esquina)`)
    console.log('  GPU: ' + (await gpu(c)))
    const fallos = []
    for (const esc of escenas) {
      if (!(await intacto(c))) return 'RECARGA'
      try {
        await grabarEscena(c, b, esc, id)
      } catch (e) {
        console.log(`  ${esc.nombre.padEnd(20)} ✗ ${e.message}`)
        fallos.push(esc.nombre)
      }
    }
    return fallos.length ? `fallaron: ${fallos.join(', ')}` : 'ok'
  })
}

await arrancarChrome()
await dormir(1500)
const resultados = {}
await conNavegador(async (b) => {
  await b.enviar('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: DESCARGAS, eventsEnabled: true })
  for (const id of idiomas) {
    console.log(`=== ${id} ===`)
    let r = ''
    for (let intento = 1; intento <= 2; intento++) {
      try {
        r = await grabarIdioma(id, b)
      } catch (e) {
        r = e.message
      }
      if (r === 'ok' || r.startsWith('fallaron')) break
      console.log(`  intento ${intento}: ${r}`)
    }
    resultados[id] = r
    console.log('  ' + r)
  }
})
console.log('\nclips en ' + CLIPS)
const mal = Object.entries(resultados).filter(([, r]) => r !== 'ok')
if (mal.length) console.log('con problemas: ' + mal.map(([id, r]) => `${id} (${r})`).join(' · '))
console.log('siguiente: node preparar.mjs')
