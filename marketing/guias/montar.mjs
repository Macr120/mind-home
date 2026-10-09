// Monta los videos de una guía a partir de las tomas de grabar.mjs y casa.mjs:
//   salida/<id>/final/completo.mp4    la casa → las partes → el cierre → de vuelta a la casa, con capítulos
//   salida/<id>/final/parte-N.mp4     la casa → la parte → el cierre → de vuelta a la casa
//   salida/<id>/final/capitulos.txt   marcas de tiempo para la descripción de YouTube
//
//   node marketing/guias/montar.mjs ejercicio [--lang=es]
//
// Las tomas de la casa salen mudas de la app: aquí se les pone la voz de las
// líneas `enCasa` (casa-entrada.json, lo escribe casa.mjs) y su efecto («wow»
// cuando aparece la casa entera, «nice» al volver con Pep@).
//
// Debajo de todo va la música de fondo (musica.json), que se agacha cuando habla Pep@.
// Todos llevan en el borde izquierdo la línea de tiempo, de arriba abajo: un
// tramo por parte, que destella al terminar cada una.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { FFMPEG, FFPROBE, LADO, RAIZ, ejecutar } from './cdp.mjs'

const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
const guion = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${idioma}.json`), 'utf8'))
const N = guion.partes.length
const TOMAS = path.join(RAIZ, tema, 'salida', idioma)
const FINAL = path.join(TOMAS, 'final')
const SONIDOS = path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', 'sonidos')
/** Efectos que solo usa el video (no se publican con la web): pasos, motor de la caminadora… */
const EFECTOS = path.join(RAIZ, 'efectos')
const VOCES = path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', tema, 'audio', idioma)
mkdirSync(FINAL, { recursive: true })

const tomas = Array.from({ length: N + 1 }, (_, i) => path.join(TOMAS, `parte-${i + 1}.mp4`))
for (const t of [...tomas, path.join(TOMAS, 'casa-entrada.mp4'), path.join(TOMAS, 'casa-salida.mp4'), path.join(TOMAS, 'casa-entrada.json')]) {
  if (!existsSync(t)) throw new Error(`falta ${path.relative(RAIZ, t)}: corre antes grabar.mjs y casa.mjs`)
}

const duracion = async (ruta) =>
  Number((await ejecutar(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta])).stdout.trim())

/**
 * Toma de la casa con sus pistas encima: `{ archivo, en (s), volumen, desde?, hasta?, fuera? }`
 * (desde/hasta recortan la pista, en s; `fuera` la apaga en esos últimos segundos).
 */
async function conAudio(nombre, pistas) {
  const salida = path.join(FINAL, `${nombre}.mp4`)
  const filtro =
    pistas.map((p, i) => `[${i + 1}:a]${p.desde != null || p.hasta != null ? `atrim=start=${p.desde ?? 0}${p.hasta != null ? `:end=${p.hasta}` : ''},asetpts=PTS-STARTPTS,` : ''}${p.fuera && p.hasta != null ? `afade=t=out:st=${(p.hasta - (p.desde ?? 0) - p.fuera).toFixed(3)}:d=${p.fuera},` : ''}adelay=${Math.round(p.en * 1000)}:all=1,volume=${p.volumen},aresample=48000,aformat=channel_layouts=stereo[e${i}]`).join(';') +
    ';[0:a]' + pistas.map((_, i) => `[e${i}]`).join('') + `amix=inputs=${pistas.length + 1}:duration=first:normalize=0[a]`
  await ejecutar(FFMPEG, [
    '-y', '-i', path.join(TOMAS, `${nombre}.mp4`), ...pistas.flatMap((p) => ['-i', p.archivo]),
    '-filter_complex', filtro, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', salida,
  ])
  return salida
}

/** Grosor de la barra de progreso (px del video). */
const ALTO = 10
const MORADO = '0xC07DFE'
// Se ve sobre la casa (oscura) y sobre la página (clara): riel gris medio, destello rosa con halo morado.
const RIEL = '0x8a8f9c@0.55'
const DESTELLO = '0xF5B8FF'

/**
 * La línea de tiempo en el borde izquierdo, de arriba abajo, sobre `[vc]` →
 * `[v]`: el riel, el relleno que baja con el tiempo, las separaciones entre
 * tramos (uno por segmento de `durs`), un destello del tramo que acaba de
 * terminar y la cabeza (blanca con borde morado).
 */
function barra(durs) {
  const T = durs.reduce((a, b) => a + b, 0)
  const yDe = (s) => Math.round((LADO * s) / T)
  const bordes = []
  for (let i = 0, acc = 0; i < durs.length - 1; i++) bordes.push((acc += durs[i]))
  const f = [
    `[vc]drawbox=x=0:y=0:w=${ALTO}:h=ih:color=${RIEL}:t=fill[b0]`,
    `color=c=${MORADO}:s=${ALTO}x${LADO}:r=30:d=${T.toFixed(3)}[relleno]`,
    `[b0][relleno]overlay=x=0:y='-h+main_h*t/${T.toFixed(3)}':eof_action=pass[b1]`,
    `[b1]${bordes.map((b) => `drawbox=x=0:y=${yDe(b) - 2}:w=${ALTO}:h=4:color=0x0f1115@0.9:t=fill`).join(',') || 'null'}[b2]`,
  ]
  // El destello: el tramo en rosa con halo morado, que aparece de golpe y se apaga en ~1,5 s.
  const M = 24
  let previo = 'b2'
  bordes.forEach((b, i) => {
    const ya = yDe(i ? bordes[i - 1] : 0)
    const h = yDe(b) - ya
    f.push(
      `color=c=${MORADO}@0:s=${ALTO + 2 * M}x${h + 2 * M}:r=30:d=1.6,format=rgba,` +
        `drawbox=x=${M - 6}:y=${M - 6}:w=${ALTO + 12}:h=${h + 12}:color=${MORADO}@1:t=fill:replace=1,boxblur=luma_radius=12:luma_power=2:alpha_radius=12:alpha_power=2,` +
        `drawbox=x=${M}:y=${M}:w=${ALTO}:h=${h}:color=${DESTELLO}@1:t=fill:replace=1,` +
        `fade=t=in:st=0:d=0.12:alpha=1,fade=t=out:st=0.35:d=1.2:alpha=1,setpts=PTS+${b.toFixed(3)}/TB[g${i}]`,
      `[${previo}][g${i}]overlay=x=${-M}:y=${ya - M}:eof_action=pass[c${i}]`,
    )
    previo = `c${i}`
  })
  f.push(
    `color=c=white:s=18x18:r=30:d=${T.toFixed(3)},format=rgba,geq=r='if(gt(hypot(X-8.5,Y-8.5),5),192,255)':g='if(gt(hypot(X-8.5,Y-8.5),5),125,255)':b='if(gt(hypot(X-8.5,Y-8.5),5),254,255)':a='255*lte(hypot(X-8.5,Y-8.5),8.5)'[cabeza]`,
    `[${previo}][cabeza]overlay=x=${ALTO / 2 - 9}:y='main_h*t/${T.toFixed(3)}-9':eof_action=pass[v]`,
  )
  return f.join(';')
}

/** Música de fondo (marketing/guias/musica/, créditos en musica.json): suenan por turnos, bajo la voz. */
const MUSICA = path.join(RAIZ, 'musica')
const CANCIONES = await Promise.all(
  JSON.parse(readFileSync(path.join(MUSICA, 'musica.json'), 'utf8')).canciones.map(async (c) => ({ ...c, ruta: path.join(MUSICA, c.archivo), dur: await duracion(path.join(MUSICA, c.archivo)) })),
)
/** Volumen de la música sin voz encima; con voz, el compresor la baja (ducking). */
const VOLUMEN_MUSICA = 0.15

/**
 * `[av]` (voz y efectos de las tomas) + las `n` canciones desde la entrada `desde`
 * → `[a]`: encadenadas con fundido entre una y otra, recortadas al video, con
 * entrada y salida suaves y agachadas mientras suena la voz.
 */
function musica(desde, n, total) {
  const ids = Array.from({ length: n }, (_, i) => `[${desde + i}:a]aresample=48000,aformat=channel_layouts=stereo[m${i}]`)
  let previo = 'm0'
  const cruces = []
  for (let i = 1; i < n; i++) {
    cruces.push(`[${previo}][m${i}]acrossfade=d=3[x${i}]`)
    previo = `x${i}`
  }
  return [
    ...ids,
    ...cruces,
    `[${previo}]atrim=end=${total.toFixed(3)},volume=${VOLUMEN_MUSICA},afade=t=in:d=2,afade=t=out:st=${(total - 4).toFixed(3)}:d=4[mus]`,
    '[av]asplit=2[voz][guia]',
    // Agachada apenas: con la voz encima la música baja ~4 dB y se sigue distinguiendo.
    '[mus][guia]sidechaincompress=threshold=0.06:ratio=2.2:attack=40:release=500:makeup=1[fondo]',
    '[voz][fondo]amix=inputs=2:duration=first:normalize=0[a]',
  ].join(';')
}

/**
 * Une clips re-codificando (las tomas no comparten parámetros exactos de audio)
 * con la barra de progreso; `tramos` agrupa clips consecutivos en un solo tramo
 * (p. ej. el cierre y la vuelta a la casa).
 */
async function unir(clips, salida, metadatos, tramos, primeraCancion = 0) {
  const durs = await Promise.all(clips.map(duracion))
  const total = durs.reduce((a, b) => a + b, 0)
  // Las canciones en turno (empezando por `primeraCancion`) hasta cubrir el video.
  const lista = []
  for (let i = primeraCancion, t = 0; t < total; i++) {
    const c = CANCIONES[i % CANCIONES.length]
    lista.push(c)
    t += c.dur
  }
  const entradas = [...clips, ...lista.map((c) => c.ruta)].flatMap((c) => ['-i', c])
  const segs = (tramos ?? clips.map(() => 1)).map((n, i, a) => {
    const desde = a.slice(0, i).reduce((x, y) => x + y, 0)
    return durs.slice(desde, desde + n).reduce((x, y) => x + y, 0)
  })
  const filtro =
    clips.map((_, i) => `[${i}:v]fps=30,format=yuv420p,setsar=1[v${i}];[${i}:a]aresample=48000,aformat=channel_layouts=stereo[a${i}]`).join(';') +
    ';' + clips.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${clips.length}:v=1:a=1[vc][av];` + barra(segs) +
    ';' + musica(clips.length, lista.length, total)
  const meta = metadatos ? ['-i', metadatos, '-map_metadata', String(clips.length + lista.length), '-map_chapters', String(clips.length + lista.length)] : []
  await ejecutar(
    FFMPEG,
    ['-y', ...entradas, ...meta, '-filter_complex', filtro, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', salida],
    { maxBuffer: 1 << 26 },
  )
}

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs (uno por frase y el último al alejarse): pasos y motor de la
 * caminadora mientras se ve a Pep@ de cerca, un «blip» tras cada pregunta del
 * gancho (frases 1 y 4) y una subida que lleva al alejarse hasta la casa.
 */
function ambienteCaminadora(cortes) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pasos-caminadora.mp3'), en: 0, volumen: 0.2, hasta: alejarse + 1.5, fuera: 1.5 },
    { archivo: path.join(EFECTOS, 'motor.mp3'), en: 0, volumen: 0.22, hasta: alejarse + 1.5, fuera: 1.5 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

// La entrada: la voz del gancho y de la mención donde casa.mjs las midió, y el «wow» con la casa entera.
// La salida pasa a tercera persona a ~5,5 s.
const marcas = JSON.parse(readFileSync(path.join(TOMAS, 'casa-entrada.json'), 'utf8'))
const entrada = await conAudio('casa-entrada', [
  ...marcas.voces.map((v) => ({ archivo: path.join(VOCES, `${v.clave}.mp3`), en: v.en, volumen: 1, desde: v.desde, hasta: v.hasta })),
  ...(marcas.efectos ?? []).map((e) => ({ archivo: path.join(SONIDOS, `${e.sonido}.mp3`), en: e.en, volumen: 0.55 })),
  // Un soplo suave en cada cambio de plano.
  ...(marcas.cortes ?? []).map((en) => ({ archivo: path.join(SONIDOS, 'whoosh.mp3'), en: Math.max(0, en - 0.15), volumen: 0.18 })),
  { archivo: path.join(SONIDOS, 'wow.mp3'), en: marcas.wow, volumen: 0.5 },
  ...ambienteCaminadora(marcas.cortes ?? []),
])
const salida = await conAudio('casa-salida', [{ archivo: path.join(SONIDOS, 'nice.mp3'), en: 5.4, volumen: 0.5 }])
const dEntrada = await duracion(entrada)
const dSalida = await duracion(salida)

// ─── Completo con capítulos ───
const durs = await Promise.all(tomas.map(duracion))
const capitulos = [{ inicio: 0, fin: dEntrada, titulo: guion.pregunta }]
let t = dEntrada
for (let i = 0; i < N; i++) {
  capitulos.push({ inicio: t, fin: t + durs[i], titulo: guion.partes[i].titulo })
  t += durs[i]
}
capitulos.push({ inicio: t, fin: t + durs[N] + dSalida, titulo: 'MindHaOS' })
const total = t + durs[N] + dSalida
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const ffmeta =
  ';FFMETADATA1\ntitle=' + guion.pregunta + '\n' +
  capitulos.map((m) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(m.inicio * 1000)}\nEND=${Math.round(m.fin * 1000)}\ntitle=${m.titulo}\n`).join('')
const rutaMeta = path.join(FINAL, 'capitulos.ffmeta')
writeFileSync(rutaMeta, ffmeta)
// Un tramo por capítulo: el cierre y la vuelta a la casa van juntos.
await unir([entrada, ...tomas, salida], path.join(FINAL, 'completo.mp4'), rutaMeta, [1, ...Array(N).fill(1), 2])
writeFileSync(path.join(FINAL, 'capitulos.txt'), capitulos.map((m) => `${mmss(m.inicio)} ${m.titulo}`).join('\n') + '\n')
console.log(`✓ completo.mp4 · ${mmss(total)}`)

// ─── Partes sueltas: la casa + la parte (que lee su título) + el cierre + la casa ───
for (let n = 1; n <= N; n++) {
  // Cada parte suelta empieza con otra canción, para que no suenen todas igual.
  await unir([entrada, tomas[n - 1], tomas[N], salida], path.join(FINAL, `parte-${n}.mp4`), null, [1, 1, 2], n)
  console.log(`✓ parte-${n}.mp4 · ${mmss(dEntrada + durs[n - 1] + durs[N] + dSalida)}`)
}
