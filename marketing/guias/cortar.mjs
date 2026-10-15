// Las partes sueltas de una guía, cortadas del video completo (pedido del usuario, 15 oct 2026):
// cada parte empieza cuando el narrador dice «Parte X. Título» y termina justo antes de
// «Parte X+1» (los capítulos de capitulos.ffmeta). Las partes que no son la última acaban con
// la tarjeta de 3 s de tarjeta.mjs («Arma tu casa gratis hoy» + los botones); la última llega
// hasta el final del completo (el cierre y la vuelta a la casa). El gancho no va en ninguna.
//   salida/<id>/final/parte-N.mp4
//
//   node marketing/guias/cortar.mjs metas [--lang=es]
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FFMPEG, FFPROBE, RAIZ, ejecutar } from './cdp.mjs'

/** Segundos de la tarjeta final y de los fundidos de audio en los cortes. */
const TARJETA = 3
const ENTRA = 0.3
const SALE = 0.6

const duracion = async (archivo) =>
  Number((await ejecutar(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo])).stdout.trim())

/** Los inicios de los capítulos (en segundos) de capitulos.ffmeta: el 0 es el gancho y el último el cierre. */
function capitulos(archivo) {
  return [...readFileSync(archivo, 'utf8').matchAll(/^START=(\d+)$/gm)].map((m) => Number(m[1]) / 1000)
}

export async function cortarPartes(tema, idioma, alTerminar = () => {}) {
  const FINAL = path.join(RAIZ, tema, 'salida', idioma, 'final')
  const completo = path.join(FINAL, 'completo.mp4')
  const tarjeta = path.join(RAIZ, tema, 'salida', idioma, 'tarjeta.png')
  if (!existsSync(tarjeta)) throw new Error(`falta ${tarjeta}: corre antes tarjeta.mjs ${tema} ${idioma}`)
  const inicios = capitulos(path.join(FINAL, 'capitulos.ffmeta'))
  const total = await duracion(completo)
  // Capítulos 1…N = las partes; el siguiente (el cierre «MindHaOS») marca el fin de la última parte.
  const N = inicios.length - 2
  for (let n = 1; n <= N; n++) {
    const ultima = n === N
    const desde = inicios[n]
    const hasta = ultima ? total : inicios[n + 1]
    const d = hasta - desde
    const salida = path.join(FINAL, `parte-${n}.mp4`)
    const audio = `[0:a]afade=t=in:d=${ENTRA}${ultima ? '' : `,afade=t=out:st=${(d - SALE).toFixed(3)}:d=${SALE}`}[a0]`
    const filtro = ultima
      ? `[0:v]null[v];${audio.replace('[a0]', '[a]')}`
      : `${audio};` +
        `[1:v]scale=1080:1080,fps=30,format=yuv420p,setsar=1,fade=t=in:d=0.35[t];` +
        `anullsrc=r=48000:cl=stereo,atrim=duration=${TARJETA}[s];` +
        `[0:v][a0][t][s]concat=n=2:v=1:a=1[v][a]`
    await ejecutar(
      FFMPEG,
      [
        '-y', '-ss', desde.toFixed(3), '-to', hasta.toFixed(3), '-i', completo,
        ...(ultima ? [] : ['-loop', '1', '-framerate', '30', '-t', String(TARJETA), '-i', tarjeta]),
        '-filter_complex', filtro, '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', salida,
      ],
      { maxBuffer: 1 << 26 },
    )
    alTerminar(n, await duracion(salida))
  }
  return N
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
  const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
  await cortarPartes(tema, idioma, (n, d) => console.log(`✓ parte-${n}.mp4 · ${d.toFixed(1)} s`))
}
