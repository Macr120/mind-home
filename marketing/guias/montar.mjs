// Monta los videos de una guía a partir de las tomas de grabar.mjs y casa.mjs:
//   salida/<id>/final/completo.mp4    la casa → las partes → el cierre → de vuelta a la casa, con capítulos
//   salida/<id>/final/parte-N.mp4     su línea destacada (el gancho) → la parte → el cierre → de vuelta a la casa
//   salida/<id>/final/capitulos.txt   marcas de tiempo para la descripción de YouTube
//
// Las tomas intermedias de la escena (casa-<extra>, Pep@ abriendo las otras
// entradas del cuarto) van así: sin voz, de puente entre la casa y la página;
// con voz, dentro de la toma de la página que se saltó esa línea (parte-N.json).
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
import { pathToFileURL } from 'node:url'
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
/** Lo propio del cuarto: los efectos de ambiente de la toma de entrada. */
const ESCENA = await import(pathToFileURL(path.join(RAIZ, tema, 'escena.mjs')).href)

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

/**
 * Música de fondo (marketing/guias/musica/, créditos en musica.json): suenan por turnos, bajo la voz.
 * Un tema puede llevar su propia lista, en su orden: musica/<tema>.json.
 */
const MUSICA = path.join(RAIZ, 'musica')
// La escena puede pedir la lista de otra guía (Música usa la del mago de Idiomas).
const LISTA = ESCENA.MUSICA_LISTA ?? (existsSync(path.join(MUSICA, `${tema}.json`)) ? `${tema}.json` : 'musica.json')
// Sin música de fondo si la escena lo pide (Música: los ejemplos que suenan chocarían con ella).
const CANCIONES = ESCENA.SIN_MUSICA ? [] : await Promise.all(
  JSON.parse(readFileSync(path.join(MUSICA, LISTA), 'utf8')).canciones.map(async (c) => ({ ...c, ruta: path.join(MUSICA, c.archivo), dur: await duracion(path.join(MUSICA, c.archivo)) })),
)
/** Volumen de la música sin voz encima; con voz, el compresor la baja (ducking). */
const VOLUMEN_MUSICA = 0.15
/** Cuánto baja además la música donde suena un ejemplo (las herramientas de la página, el Himno de las tomas). */
const AGACHE_EJEMPLOS = 0.3

/** Tramos (s, relativos a cada clip) donde suena un ejemplo: ahí la música de fondo se agacha más. */
const EJEMPLOS = new Map()
const SUENAN = new Set(ESCENA.HERRAMIENTAS_QUE_SUENAN ?? [])
const LINEAS = new Map(guion.partes.flatMap((p) => p.lineas.map((l) => [`${p.id}.${l.id}`, l])))
/** Los tramos de la toma de la página `i` en que se narra una línea cuya herramienta suena (y un respiro después). */
function tramosPagina(i) {
  const ruta = path.join(TOMAS, `parte-${i + 1}.json`)
  if (!SUENAN.size || !existsSync(ruta)) return []
  const marcas = JSON.parse(readFileSync(ruta, 'utf8')).lineas ?? []
  return marcas.flatMap((m, k) => {
    if (!SUENAN.has(LINEAS.get(m.clave)?.visual?.herramienta)) return []
    const fin = marcas[k + 1]?.en ?? m.en + (tiemposVoz[m.clave] ?? 10) + 0.5
    return [[m.en, fin + 0.8]]
  })
}
/** Los tramos de un recorte [de, de + dur] de la toma, relativos al recorte. */
const recortarTramos = (tramos, de, dur) => tramos.map(([a, b]) => [Math.max(0, a - de), Math.min(dur ?? Infinity, b - de)]).filter(([a, b]) => b > a)

/**
 * `[av]` (voz y efectos de las tomas) + las `n` canciones desde la entrada `desde`
 * → `[a]`: encadenadas con fundido entre una y otra, recortadas al video, con
 * entrada y salida suaves y agachadas mientras suena la voz.
 */
function musica(desde, n, total, tramos = []) {
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
    `[${previo}]atrim=end=${total.toFixed(3)},volume=${VOLUMEN_MUSICA},${tramos.length ? `volume='if(gt(${tramos.map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join('+')},0),${AGACHE_EJEMPLOS},1)':eval=frame,` : ''}afade=t=in:d=2,afade=t=out:st=${(total - 4).toFixed(3)}:d=4[mus]`,
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
/** Los tramos con ejemplo de cada clip, ya en el tiempo del video entero. */
function tramosDe(clips, durs) {
  let t = 0
  return clips.flatMap((c, i) => {
    const r = (EJEMPLOS.get(c) ?? []).map(([a, b]) => [t + a, t + Math.min(b, durs[i])])
    t += durs[i]
    return r
  })
}

async function unir(clips, salida, metadatos, tramos, primeraCancion = 0) {
  const durs = await Promise.all(clips.map(duracion))
  const total = durs.reduce((a, b) => a + b, 0)
  // Las canciones en turno (empezando por `primeraCancion`) hasta cubrir el video.
  const lista = []
  for (let i = primeraCancion, t = 0; CANCIONES.length && t < total; i++) {
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
    ';' + (lista.length ? musica(clips.length, lista.length, total, tramosDe(clips, durs)) : '[av]anull[a]')
  const meta = metadatos ? ['-i', metadatos, '-map_metadata', String(clips.length + lista.length), '-map_chapters', String(clips.length + lista.length)] : []
  await ejecutar(
    FFMPEG,
    ['-y', ...entradas, ...meta, '-filter_complex', filtro, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', salida],
    { maxBuffer: 1 << 26 },
  )
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
  ...ESCENA.ambiente(marcas.cortes ?? [], EFECTOS),
])
const salida = await conAudio('casa-salida', [{ archivo: path.join(SONIDOS, 'nice.mp3'), en: 5.4, volumen: 0.5 }])

/** La pista de música de una toma (`musica: { archivo, volumen }`, ruta desde la carpeta del tema), recortada a la toma. */
async function musicaDeToma(nombre, mu, en) {
  const dur = await duracion(path.join(TOMAS, `${nombre}.mp4`))
  return { archivo: path.join(RAIZ, tema, mu.archivo), en: Math.max(0, en - 0.4), volumen: mu.volumen ?? 0.3, desde: 0, hasta: Math.max(1, dur - en + 0.4), fuera: 1.2 }
}

// Las tomas intermedias con su voz (si la llevan) y un «tic» al tocar la entrada.
const extras = []
for (const x of ESCENA.TOMAS_EXTRA ?? []) {
  const nombre = `casa-${x.nombre}`
  const m = JSON.parse(readFileSync(path.join(TOMAS, `${nombre}.json`), 'utf8'))
  const clip = await conAudio(nombre, [
    ...(m.voz ? [{ archivo: path.join(VOCES, `${m.voz.clave}.mp3`), en: m.voz.en, volumen: 1 }] : []),
    ...(m.toque != null ? [{ archivo: path.join(SONIDOS, 'tic.mp3'), en: m.toque + 0.2, volumen: 0.35 }] : []),
    // Música de ejemplo bajo la voz (Música: el Himno por capas), desde que empieza a hablar hasta el final, con fundido.
    ...(x.musica ? [await musicaDeToma(nombre, x.musica, m.voz?.en ?? 0)] : []),
  ])
  if (x.musica) EJEMPLOS.set(clip, [[Math.max(0, (m.voz?.en ?? 0) - 0.4), Infinity]])
  extras.push({ voz: x.voz, clip })
}
/** Sin voz: puentes entre la entrada en la casa y la página. */
const puentes = extras.filter((x) => !x.voz).map((x) => x.clip)

/**
 * Una toma de la página con sus tomas de la casa metidas donde se saltó su
 * línea (parte-N.json de grabar.mjs) → la lista de clips que la forman.
 */
async function conInsertos(i) {
  const ruta = path.join(TOMAS, `parte-${i + 1}.json`)
  if (!existsSync(ruta) || !JSON.parse(readFileSync(ruta, 'utf8')).cortes?.length) {
    EJEMPLOS.set(tomas[i], tramosPagina(i))
    return [tomas[i]]
  }
  const clips = []
  let desde = 0
  const trozo = async (k, de, dur) => {
    const salidaTrozo = path.join(FINAL, `parte-${i + 1}-${k}.mp4`)
    await ejecutar(FFMPEG, ['-y', '-ss', String(de), ...(dur != null ? ['-t', String(dur)] : []), '-i', tomas[i], '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', salidaTrozo])
    EJEMPLOS.set(salidaTrozo, recortarTramos(tramosPagina(i), de, dur))
    return salidaTrozo
  }
  for (const [k, c] of JSON.parse(readFileSync(ruta, 'utf8')).cortes.entries()) {
    const x = extras.find((e) => e.voz === c.clave)
    if (!x) throw new Error(`la toma de la página ${i + 1} se saltó ${c.clave}, pero la escena no tiene su toma de la casa`)
    clips.push(await trozo(k, desde, c.en - desde), x.clip)
    desde = c.en
  }
  clips.push(await trozo('fin', desde))
  return clips
}
/**
 * El gancho de la parte suelta: su línea `destacada`, recortada de la toma de la
 * página (grabar.mjs apunta dónde empieza cada línea), con un fundido corto al
 * final. Sin línea destacada (o sin marcas), la parte suelta abre con la casa.
 */
async function anzuelo(i) {
  const linea = guion.partes[i].lineas.find((l) => l.destacada && !l.enCasa)
  const ruta = path.join(TOMAS, `parte-${i + 1}.json`)
  if (!linea || !existsSync(ruta)) return null
  const marcas = JSON.parse(readFileSync(ruta, 'utf8')).lineas ?? []
  const k = marcas.findIndex((m) => m.clave === `${guion.partes[i].id}.${linea.id}`)
  if (k < 0) return null
  const de = marcas[k].en
  const hasta = marcas[k + 1]?.en ?? de + (tiemposVoz[marcas[k].clave] ?? 10) + 0.4
  const dur = hasta - de
  const salida = path.join(FINAL, `anzuelo-${i + 1}.mp4`)
  await ejecutar(FFMPEG, [
    '-y', '-ss', String(de), '-t', String(dur), '-i', tomas[i],
    '-vf', `fade=t=out:st=${(dur - 0.35).toFixed(3)}:d=0.35`, '-af', `afade=t=out:st=${(dur - 0.35).toFixed(3)}:d=0.35`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', salida,
  ])
  EJEMPLOS.set(salida, recortarTramos(tramosPagina(i), de, dur))
  return salida
}
const tiemposVoz = JSON.parse(readFileSync(path.join(VOCES, 'tiempos.json'), 'utf8'))

/**
 * La entrada del video completo con la pregunta en grande encima (titulo.png de
 * casa.mjs) los primeros segundos: así quien pasa el dedo sabe de qué va antes de decidir.
 */
async function conTitulo(clip) {
  const png = path.join(TOMAS, 'titulo.png')
  if (!existsSync(png)) return clip
  const salida = path.join(FINAL, 'casa-entrada-titulo.mp4')
  await ejecutar(FFMPEG, [
    '-y', '-i', clip, '-loop', '1', '-t', '3.6', '-i', png,
    '-filter_complex', '[1:v]format=rgba,fade=t=out:st=2.9:d=0.7:alpha=1[t];[0:v][t]overlay=0:0:eof_action=pass[v]',
    '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'copy', salida,
  ])
  return salida
}

/** Cada parte (y el cierre) como lista de clips, con su duración. */
const segmentos = []
for (let i = 0; i <= N; i++) segmentos.push(await conInsertos(i))
const dur = async (clips) => (await Promise.all(clips.map(duracion))).reduce((a, b) => a + b, 0)
const durs = await Promise.all(segmentos.map(dur))
const dEntrada = await dur([entrada, ...puentes])
const dSalida = await duracion(salida)

// ─── Completo con capítulos ───
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
// Un tramo por capítulo (con sus tomas metidas); el cierre y la vuelta a la casa van juntos.
const inicio = [await conTitulo(entrada), ...puentes]
await unir([...inicio, ...segmentos.flat(), salida], path.join(FINAL, 'completo.mp4'), rutaMeta, [inicio.length, ...segmentos.slice(0, N).map((x) => x.length), segmentos[N].length + 1])
writeFileSync(path.join(FINAL, 'capitulos.txt'), capitulos.map((m) => `${mmss(m.inicio)} ${m.titulo}`).join('\n') + '\n')
console.log(`✓ completo.mp4 · ${mmss(total)}`)

// ─── Partes sueltas: su línea destacada + la parte (que lee su título) + el cierre + la casa ───
for (let n = 1; n <= N; n++) {
  // En redes los primeros segundos deciden: abre con lo más fuerte de la parte (sin ella, con la casa).
  const gancho = await anzuelo(n - 1)
  const abre = gancho ? [gancho] : inicio
  // Cada parte suelta empieza con otra canción, para que no suenen todas igual.
  await unir([...abre, ...segmentos[n - 1], ...segmentos[N], salida], path.join(FINAL, `parte-${n}.mp4`), null, [abre.length, segmentos[n - 1].length, segmentos[N].length + 1], n)
  console.log(`✓ parte-${n}.mp4 · ${mmss((gancho ? await duracion(gancho) : dEntrada) + durs[n - 1] + durs[N] + dSalida)}`)
}
