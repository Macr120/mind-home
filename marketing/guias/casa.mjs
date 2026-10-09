// Las tomas en la casa de la app que abren y cierran los videos de una guía,
// grabadas en la demo de Pep@ (BD aparte, nunca la casa real):
//   salida/<id>/casa-entrada.mp4   Pep@ en la caminadora (casa explotada), con un plano distinto por cada frase del gancho,
//                                  y con la mención la cámara se aleja hasta la casa entera;
//                                  dura lo que las líneas `enCasa` del guion, que montar.mjs le pone encima (casa-entrada.json)
//   salida/<id>/casa-salida.mp4    de la casa entera de vuelta a Pep@ en su caminadora
//
//   npm run dev  (puerto de pruebas, p. ej. el preview «mind-home-pruebas»)
//   APP_URL=http://localhost:53379 node marketing/guias/casa.mjs ejercicio [--lang=en]
//
// Mismo piloto que grabar.mjs (cdp.mjs); las ayudas de cámara (moverCam, CASA,
// camJugador, limpiarTodo…) son las del grabador de la promo.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { AYUDAS as AYUDAS_PROMO } from '../promo/grabar/sesion.mjs'
import { DESDE, FFMPEG, LADO, PONER_MARCA, QUITAR_MARCA, RAIZ, W, codigoCaptura, conPagina, esperarDescarga, evaluar, fijarViewport, recortar } from './cdp.mjs'
import { SIN_HUD, abrirDemo, enDemo } from './demo.mjs'

const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
const CRUDO = path.join(RAIZ, tema, 'grabaciones', idioma)
const SALIDA = path.join(RAIZ, tema, 'salida', idioma)
mkdirSync(SALIDA, { recursive: true })

// La entrada lleva la voz de las líneas `enCasa` (el gancho en la caminadora y la mención al alejarse).
const guion = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${idioma}.json`), 'utf8'))
const tiempos = JSON.parse(readFileSync(path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', tema, 'audio', idioma, 'tiempos.json'), 'utf8'))
const enCasa = guion.partes[0].lineas.filter((l) => l.enCasa).map((l) => ({ clave: `${guion.partes[0].id}.${l.id}`, dur: tiempos[`${guion.partes[0].id}.${l.id}`] }))
if (enCasa.length !== 2) throw new Error('la entrada espera dos líneas enCasa: el gancho y la mención')
/** Silencio antes de la primera línea y entre las dos (s). */
const ANTES = 0.8
const ENTRE = 0.35
const [GANCHO, MENCION] = enCasa

/**
 * Segundo (desde que empieza el gancho) en que arranca cada frase: un plano por
 * frase. Las frases se cortan por su puntuación final (también la de japonés,
 * chino, árabe e hindi) y el instante sale de la posición del carácter sobre
 * los tiempos del TTS, en proporción, como el texto iluminado de la página.
 */
const frases = (() => {
  const texto = guion.partes[0].lineas.find((l) => `${guion.partes[0].id}.${l.id}` === GANCHO.clave).texto
  const palabras = tiempos._palabras[GANCHO.clave]
  const inicios = [0]
  for (let i = 0; i < texto.length - 1; i++) {
    const fin = '.?!'.includes(texto[i]) ? /\s/.test(texto[i + 1]) : '。？！؟।'.includes(texto[i])
    if (!fin) continue
    let j = i + 1
    while (j < texto.length && /\s/.test(texto[j])) j++
    if (j < texto.length) inicios.push(palabras[Math.min(palabras.length - 1, Math.round((j / texto.length) * palabras.length))])
  }
  if (inicios.length < 3) throw new Error(`el gancho en ${idioma} necesita al menos tres frases (tiene ${inicios.length})`)
  // La estimación por caracteres puede caer a media palabra: los límites salen de los
  // silencios reales de la voz; la frase empieza al final del silencio y el corte de la
  // pausa va a su mitad.
  const voz = path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', tema, 'audio', idioma, `${GANCHO.clave}.mp3`)
  const { stderr } = spawnSync(FFMPEG, ['-i', voz, '-af', 'silencedetect=noise=-35dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' })
  const silencios = [...stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => ({ de: Number(m[1]), a: Number(m[2]) }))
  // Las pausas entre frases son las más largas de la voz (las de las comas, más cortas):
  // las n−1 más largas, en orden, son los límites de las n frases.
  const largos = silencios
    .filter((x) => x.de > 0.05 && x.a < GANCHO.dur - 0.05)
    .sort((x, y) => y.a - y.de - (x.a - x.de))
    .slice(0, inicios.length - 1)
    .sort((x, y) => x.de - y.de)
  if (largos.length < inicios.length - 1) return inicios.map((t, i) => ({ ini: t, corte: i ? t - 0.08 : 0 }))
  return [{ ini: 0, corte: 0 }, ...largos.map((x) => ({ ini: x.a, corte: (x.de + x.a) / 2 }))]
})()
/**
 * Pausa en la voz tras la segunda frase («…debería hacer ejercicio.») para el
 * «fah»: montar.mjs parte el audio del gancho ahí. `en` es el segundo del gancho
 * donde se corta (en el silencio antes de la tercera frase).
 */
const PAUSA = { en: frases[2].corte, dur: 1.3 }
/** Segundo de la toma en que suena el instante `s` del gancho (contando la pausa). */
const enToma = (s) => ANTES + s + (s >= PAUSA.en ? PAUSA.dur : 0)
/** Los planos de la caminadora, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
const PLANOS = [
  { yaw: [4.3, 4.6], dist: [3.0, 2.5], pitch: [0.4, 0.36] }, // de frente, acercándose
  { yaw: [5.25, 5.05], dist: [2.2, 2.4], pitch: [0.18, 0.22] }, // de lado y bajo, muy cerca
  { iso: true }, // la vista del juego, junto a Pep@
  { yaw: [4.5, 5.1], dist: [5.2, 4.2], pitch: [0.75, 0.6] }, // desde arriba, girando
  { yaw: [5.0, 4.4], dist: [2.7, 3.4], pitch: [0.3, 0.45] }, // girando al revés y alejándose
]

// El lienzo de la promo se pinta a 3× (su viewport es de 360 CSS); aquí el viewport ya da 1080 px a 1,5×.
const AYUDAS = AYUDAS_PROMO.replace(/setPixelRatio\(\d+(\.\d+)?\)/, `setPixelRatio(${LADO / W})`)

/**
 * Pep@ con la ropa del cuarto de la guía, en la caminadora del cuarto de
 * Ejercicio y con la casa EXPLOTADA: con los muros enteros la cámara no lo ve
 * dentro del cuarto. Llega caminando y la usa como el botón contextual del HUD.
 */
const PEP_EN_LA_CAMINADORA = `
  if (!useHouse.getState().explotado) useHouse.getState().toggleExplotado()
  await sleep(1200)
  const acc = await modulo('/src/core/state/accionCuartoStore.ts')
  const { ATUENDOS_PRESET } = await modulo('/src/core/house/atuendos.ts')
  await useDiseño.getState().setAvatarRopaCompleta(ATUENDOS_PRESET.find((a) => a.id === 'deportista').ropa)
  // Siempre desde cero: el «usando» de una corrida anterior puede quedar con Pep@ en otro sitio.
  acc.useAccionCuarto.getState().salirForzado()
  await sleep(600)
  {
    const o = useDiseño.getState().objetos.find((x) => x.tipo === 'caminadora' && x.plantillaId === 'ejercicio')
    if (!o) return 'SIN caminadora en la demo'
    const [rx, , rz] = (await modulo('/src/core/state/layoutStore.ts')).roomWorldPos(o.roomId)
    const hs = await modulo('/src/core/state/houseStore.ts')
    // Al subirse mira hacia donde venía caminando (usarAccion): tiene que llegar justo por detrás,
    // en el eje de la caminadora (+z local), o queda de lado o al revés sobre la banda.
    const rot = ((o.rotY ?? 0) * Math.PI) / 180
    const atras = { x: rx + o.x + Math.sin(rot) * 1.2, z: rz + o.z + Math.cos(rot) * 1.2 }
    useHouse.getState().setTarget(atras.x, atras.z)
    for (let i = 0; i < 80 && Math.hypot(hs.playerPos.x - atras.x, hs.playerPos.z - atras.z) > 0.15; i++) await sleep(250)
    await sleep(300)
    acc.useAccionCuarto.getState().usar(o.id, rx + o.x, rz + o.z, rot, 'caminadora')
    for (let i = 0; i < 20 && !acc.accionCuartoFrame.usando; i++) await sleep(250)
    // Llega caminando hasta el aparato: hasta que esté encima no se graba.
    for (let i = 0; i < 40 && Math.hypot(hs.playerPos.x - rx - o.x, hs.playerPos.z - rz - o.z) > 0.35; i++) await sleep(250)
    await sleep(1200)
  }
  if (!acc.accionCuartoFrame.usando) return 'no se subió a la caminadora'
`

/** Tercera persona cerca de Pep@, girando despacio alrededor (yaw de `de` a `a`, distancia de `d0` a `d1` e inclinación de `p0` a `p1` en `ms`). */
const orbitar = (de, a, ms, d0 = 3.8, d1 = d0, p0 = 0.42, p1 = p0) => `
  await new Promise((r) => {
    const t0 = performance.now()
    const paso = () => {
      const q = Math.min(1, (performance.now() - t0) / ${ms})
      useCam.setState({ vista: 'tercera', yaw: ${de} + (${a} - ${de}) * q, dist3p: ${d0} + (${d1} - ${d0}) * q, pitch: ${p0} + (${p1} - ${p0}) * q })
      if (q < 1) requestAnimationFrame(paso); else r()
    }
    paso()
  })
`
/** El plano `i` durante `ms`, con corte seco al empezar (se apunta para el efecto de montar.mjs). */
function plano(i, ms) {
  const p = PLANOS[i % PLANOS.length]
  const corte = i ? 'window.__marcas.cortes.push(performance.now())' : ''
  if (p.iso) {
    return `
      ${corte}
      useCam.setState({ vista: 'iso' })
      await cortarCam(await camJugador(80, -1.2))
      { const a = camAhora(); await moverCam(a, { ...a, az: a.az + 0.25, zoom: a.zoom * 1.12 }, ${ms}, ease) }
    `
  }
  return `
    ${corte}
    ${orbitar(p.yaw[0], p.yaw[1], ms, p.dist[0], p.dist[1], p.pitch[0], p.pitch[1])}
  `
}

/** Deja la cámara de tercera persona como la tiene la app. */
const CAMARA_NORMAL = `useCam.setState({ vista: 'iso', yaw: Math.PI, dist3p: 7, pitch: 0.25 })`

const TOMAS = [
  {
    nombre: 'casa-entrada',
    preparar: `
      await limpiarTodo()
      useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })
      ${PEP_EN_LA_CAMINADORA}
      // Pasar antes por la vista iso junto a Pep@: entrando directo a tercera, la caminadora no se dibuja.
      await cortarCam(await camJugador(80, -1.2))
      await sleep(1500)
      useCam.setState({ vista: 'tercera', yaw: ${PLANOS[0].yaw[0]}, dist3p: ${PLANOS[0].dist[0]}, pitch: ${PLANOS[0].pitch[0]} })
      await sleep(2000)
      prep()
      return 'ok'
    `,
    // Caminando en la caminadora mientras dice el gancho, un plano por frase; con la mención,
    // vista iso y la cámara se aleja hasta la casa entera. Se apunta cuándo empieza cada cosa.
    accion: `
      ${QUITAR_MARCA}
      window.__marcas = { t0: performance.now(), cortes: [] }
      ${frases
        .map((f, i) => {
          const desde = i ? enToma(f.ini) : 0
          const hasta = i < frases.length - 1 ? enToma(frases[i + 1].ini) : enToma(GANCHO.dur) + ENTRE
          return plano(i, Math.round((hasta - desde) * 1000))
        })
        .join('\n')}
      window.__marcas.cortes.push(performance.now())
      useCam.setState({ vista: 'iso' })
      await cortarCam(await camJugador(80, -1.2))
      window.__marcas.mencion = performance.now()
      await moverCam(camAhora(), { ...CASA, az: CASA.az + Math.PI / 7 }, ${Math.round((MENCION.dur + 0.4) * 1000)}, ease)
      await sleep(900)
    `,
  },
  {
    nombre: 'casa-salida',
    preparar: `
      await limpiarTodo()
      useCiclo.setState({ minutos: 16 * 60 + 20, modo: 'manual' })
      ${PEP_EN_LA_CAMINADORA}
      await cortarCam({ ...CASA, az: CASA.az - Math.PI / 7, zoom: CASA.zoom * 0.8 })
      await sleep(1500)
      prep()
      return 'ok'
    `,
    // La casa entera con la luz de la tarde, de vuelta con Pep@ y, al final, en tercera persona en su caminadora.
    accion: `
      ${QUITAR_MARCA}
      await sleep(700)
      await moverCam(camAhora(), await camJugador(80, -1.2), 4600, ease)
      ${orbitar(4.6, 5.3, 2800)}
    `,
    limpiar: CAMARA_NORMAL,
  },
]
await conPagina(CRUDO, async (c) => {
  await fijarViewport(c)
  if (!(await enDemo(c, idioma))) await abrirDemo(c, idioma)
  for (const toma of TOMAS) {
    const previo = new Set(readdirSync(CRUDO))
    // Con la máquina cargada la demo a veces se recarga sola a media toma: se vuelve a entrar y se repite.
    for (let intento = 1; ; intento++) {
      try {
        const r = await evaluar(c, `(async () => { ${AYUDAS}\n${toma.preparar} })()`, { timeout: 120000 })
        if (r !== 'ok') throw new Error(`${toma.nombre}: ${r}`)
        await evaluar(c, `(() => { ${SIN_HUD}; ${PONER_MARCA} })()`)
        await evaluar(c, codigoCaptura(toma.nombre, `${AYUDAS}\n${toma.accion}`, 200), { userGesture: true, timeout: 120000 })
        break
      } catch (e) {
        if (intento === 3 || !/navigated or closed|context|reload/i.test(e.message)) throw e
        console.log(`  ${toma.nombre}: la demo se recargó, otra vez (${intento})`)
        await abrirDemo(c, idioma)
      }
    }
    const crudo = await esperarDescarga(CRUDO, toma.nombre, previo)
    const destino = path.join(SALIDA, `${toma.nombre}.mp4`)
    const vp = await recortar(crudo, destino)
    unlinkSync(crudo)
    if (toma.limpiar) await evaluar(c, toma.limpiar)
    if (toma.nombre === 'casa-entrada') {
      // La acción arranca 1,5 s después de empezar a grabar y el recorte quita los primeros DESDE s.
      const m = await evaluar(c, 'window.__marcas')
      const base = 1.5 - DESDE
      // El gancho en dos trozos, con la pausa del «fah» en medio.
      const voces = [
        { clave: GANCHO.clave, en: base + ANTES, hasta: PAUSA.en },
        { clave: GANCHO.clave, en: base + ANTES + PAUSA.en + PAUSA.dur, desde: PAUSA.en },
        { clave: MENCION.clave, en: base + (m.mencion - m.t0) / 1000 },
      ]
      const efectos = [{ sonido: 'faa', en: base + ANTES + PAUSA.en + 0.1 }]
      const cortes = m.cortes.map((t) => base + (t - m.t0) / 1000)
      writeFileSync(path.join(SALIDA, 'casa-entrada.json'), JSON.stringify({ voces, cortes, efectos, wow: voces[2].en + MENCION.dur + 0.1 }, null, 2) + '\n')
    }
    console.log(`✓ ${toma.nombre}.mp4 · viewport ${vp.w}×${vp.h}`)
  }
})
