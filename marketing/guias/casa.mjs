// Las tomas en la casa de la app que abren y cierran los videos de una guía,
// grabadas en la demo de Pep@ (BD aparte, nunca la casa real):
//   salida/<id>/casa-entrada.mp4   Pep@ en su sitio del cuarto (casa explotada), con un plano distinto por cada frase del gancho,
//                                  y con la mención la cámara se aleja hasta la casa entera;
//                                  dura lo que las líneas `enCasa` del guion, que montar.mjs le pone encima (casa-entrada.json)
//   salida/<id>/casa-salida.mp4    de la casa entera de vuelta a Pep@ en su sitio (y, si la escena lo pide,
//                                  entra al cuarto por su mueble principal)
//   salida/<id>/casa-<extra>.mp4   las tomas intermedias de la escena (TOMAS_EXTRA): Pep@ abre las otras
//                                  entradas del cuarto (la página de la guía, una sección de la app) + su .json
//
// Lo propio de cada cuarto (dónde está Pep@, con qué ropa, los planos) vive en
// <tema>/escena.mjs; aquí, lo común a todas las guías.
//
//   npm run dev  (puerto de pruebas, p. ej. el preview «mind-home-pruebas»)
//   APP_URL=http://localhost:53379 node marketing/guias/casa.mjs ejercicio [--lang=en] [--tomas=casa-salida]
//
// Mismo piloto que grabar.mjs (cdp.mjs); las ayudas de cámara (moverCam, CASA,
// camJugador, limpiarTodo…) son las del grabador de la promo.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { AYUDAS as AYUDAS_PROMO } from '../promo/grabar/sesion.mjs'
import { DESDE, FFMPEG, LADO, PONER_MARCA, QUITAR_MARCA, RAIZ, W, codigoCaptura, conPagina, esperarDescarga, evaluar, fijarViewport, recortar } from './cdp.mjs'
import { SIN_HUD, abrirDemo } from './demo.mjs'
import { capturarTitulo } from './titulo.mjs'

const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
const CRUDO = path.join(RAIZ, tema, 'grabaciones', idioma)
const SALIDA = path.join(RAIZ, tema, 'salida', idioma)
mkdirSync(SALIDA, { recursive: true })
const ESCENA = await import(pathToFileURL(path.join(RAIZ, tema, 'escena.mjs')).href)

// La entrada lleva la voz de las líneas `enCasa` (el gancho con Pep@ en su sitio y la mención al alejarse).
const guion = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${idioma}.json`), 'utf8'))
const tiempos = JSON.parse(readFileSync(path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', tema, 'audio', idioma, 'tiempos.json'), 'utf8'))
// (Las `enCasa` de la parte 1 que tienen su propia toma intermedia, TOMAS_EXTRA con esa voz, no son de la entrada.)
const enCasa = guion.partes[0].lineas
  .map((l) => ({ l, clave: `${guion.partes[0].id}.${l.id}` }))
  .filter(({ l, clave }) => l.enCasa && !(ESCENA.TOMAS_EXTRA ?? []).some((x) => x.voz === clave))
  .map(({ clave }) => ({ clave, dur: tiempos[clave] }))
if (enCasa.length !== 2) throw new Error('la entrada espera dos líneas enCasa: el gancho y la mención')
/** Silencio antes de la primera línea y entre las dos (s); con el corte a iso, entre el gancho y la mención queda ~1,5 s. */
const ANTES = 0.8
const ENTRE = 1.3
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
// La escena puede pedir el «fah» más adelante (PAUSA_ANTES_DE = la frase que espera; 2 por defecto).
const PAUSA = { en: frases[Math.min(ESCENA.PAUSA_ANTES_DE ?? 2, frases.length - 1)].corte, dur: 1.3 }
/** Segundo de la toma en que suena el instante `s` del gancho (contando la pausa). */
const enToma = (s) => ANTES + s + (s >= PAUSA.en ? PAUSA.dur : 0)
const PLANOS = ESCENA.PLANOS

// El lienzo de la promo se pinta a 3× (su viewport es de 360 CSS); aquí el viewport ya da 1080 px a 1,5×.
const AYUDAS_BASE = AYUDAS_PROMO.replace(/setPixelRatio\(\d+(\.\d+)?\)/, `setPixelRatio(${LADO / W})`)
/** Página de la guía en el idioma del video (la que abre su entrada en el cuarto). */
const URL_GUIA = `https://mindhaos.com${idioma === 'es' ? '' : `/${idioma}`}/guias/${tema}`
/**
 * Ayudas para las entradas del cuarto: caminar a un punto, la burbuja del
 * objeto y «tocarla» con un círculo visible (como el recorrido de la app 2D).
 */
const AYUDAS = `${AYUDAS_BASE}
/** El encuadre iso del cuarto: sobre Pep@, corrido como pida la escena (ISO). */
const camIso = async () => {
  const c = await camJugador(${ESCENA.ISO?.zoom ?? 80}, ${ESCENA.ISO?.dy ?? -1.2})
  c.focus[0] += ${ESCENA.ISO?.dx ?? 0}
  c.focus[2] += ${ESCENA.ISO?.dz ?? 0}
  return c
}
/**
 * Camina hasta (x, z) del mundo y espera a llegar. El lienzo dibuja solo cuando
 * algo se lo pide: sin una cámara moviéndose, Pep@ se quedaría congelado, así
 * que se le piden cuadros mientras camina.
 */
const irA = async (x, z, tope = 0.15) => {
  const hs = await modulo('/src/core/state/houseStore.ts')
  let andando = true
  const latir = () => { window.__r3f().invalidate(); if (andando) requestAnimationFrame(latir) }
  latir()
  useHouse.getState().setTarget(x, z)
  // Si el punto choca con un mueble no llega del todo: se sigue a los 4 s.
  for (let i = 0; i < 40 && Math.hypot(hs.playerPos.x - x, hs.playerPos.z - z) > tope; i++) await sleep(100)
  andando = false
}
/**
 * Abre la cámara desde un encuadre cercano (\`cerca\`) hasta uno lejano (\`lejos\`) sin perder lo
 * de cerca: el zoom cambia en proporción (no en línea recta) y el punto enfocado al principio
 * se desliza en pantalla hasta donde queda en el encuadre lejano. Con \`cerrar\`, al revés.
 * Sin esto, foco y zoom en línea recta pasan por encima de lo que hay en medio.
 */
const abrirCam = (cerca, lejos, ms, cerrar = false) => new Promise((r) => {
  const A = cerca.focus
  const S = [0, 1, 2].map((i) => (A[i] - lejos.focus[i]) * lejos.zoom)
  const t0 = performance.now()
  const paso = () => {
    const q = Math.min(1, (performance.now() - t0) / ms)
    const e = cerrar ? 1 - ease(q) : ease(q)
    const z = cerca.zoom * Math.pow(lejos.zoom / cerca.zoom, e)
    useCam.setState({ focus: [0, 1, 2].map((i) => A[i] - (S[i] * e) / z), zoom: z, az: cerca.az + (lejos.az - cerca.az) * e, el: cerca.el + (lejos.el - cerca.el) * e })
    if (q < 1) requestAnimationFrame(paso); else r()
  }
  paso()
})
/**
 * Pone a Pep@ en (x, z) del mundo al instante (como el arrastre del editor). Al
 * caminar va en línea recta y se atora con cualquier objeto: desde lejos (el
 * patio, tras recargarse la demo) no llega.
 */
const teletransportar = async (x, z) => {
  Object.assign(window.dragChar, { id: 'avatar', x, z })
  await sleep(300)
  window.dragChar.id = null
  await sleep(150)
}
/**
 * Oculta los paneles que aparecen al seleccionar un objeto (la pila de acciones
 * de abajo: «Visitar», «Agarrar»…), que SIN_HUD no vio porque no existían aún.
 * Deja la burbuja sobre el objeto (\`.z-30\`), que es la que se toca.
 */
const sinPaneles = () => {
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e)
    if ((cs.position === 'fixed' || cs.position === 'absolute') && e.tagName !== 'CANVAS' && !e.querySelector('canvas') && !e.closest('.z-30') && !e.querySelector('.z-30') && !e.closest('[data-sin-hud]')) e.setAttribute('data-sin-hud', '')
  }
}
/** El botón de la burbuja del objeto seleccionado («Entrar», «Visitar», «Abrir»). */
const burbuja = () => document.querySelector('.z-30 button.pointer-events-auto')
const tocar = async (el) => {
  if (!el) throw new Error('no apareció la burbuja')
  const r = el.getBoundingClientRect()
  const o = document.createElement('i')
  o.style.cssText = 'position:fixed;z-index:2147483646;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;pointer-events:none;background:rgb(192 125 254 / .35);border:2px solid rgb(192 125 254 / .9);left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2) + 'px;transition:transform .35s,opacity .35s'
  document.body.appendChild(o)
  await sleep(260)
  o.style.transform = 'scale(1.6)'
  o.style.opacity = '0'
  el.click()
  setTimeout(() => o.remove(), 400)
}
`

/**
 * Solo un cuadrante del mapa a la vista (`ESCENA.CUADRANTE`, el id de la zona; Arte:
 * la de la casa), con la misma función del editor (Mapa → Cuadrantes → Ocultar): se
 * ocultan los bloques A1… que no lo tocan, así el piso, la rejilla y el vehículo del
 * tema (y su fondo) se quedan con él. `window.__casaVista` lo encuadra en lugar de CASA.
 * Sin CUADRANTE se vuelven a mostrar todos (una guía anterior pudo dejarlos ocultos).
 * CUADRANTE también puede ser una función del tema de la toma (Matemáticas: la casa demo
 * entera sin tema y solo A1 con la nave).
 */
const soloCuadrante = (tema) => `
  {
    const lay = await modulo('/src/core/state/layoutStore.ts')
    const cm = await modulo('/src/core/house/cuadrantesMapa.ts')
    const s = lay.useLayout.getState()
    const id = ${JSON.stringify((typeof ESCENA.CUADRANTE === 'function' ? ESCENA.CUADRANTE(tema) : ESCENA.CUADRANTE) ?? null)}
    const q = id && cm.cuadrantePorId(id, s.gridCols, s.gridRows, s.cuadrantes)
    if (id && !q) return 'no encontré el cuadrante ' + id + ' en el mapa de la demo'
    const toca = (b) => b.col < q.col + q.cols && q.col < b.col + b.cols && b.row < q.row + q.rows && q.row < b.row + b.rows
    const quiero = q ? cm.cuadrantesAuto(s.gridCols, s.gridRows).filter((b) => !toca(b)).map((b) => b.id) : []
    for (const b of new Set([...s.cuadrantesOcultos, ...quiero]))
      if (lay.useLayout.getState().cuadrantesOcultos.includes(b) !== quiero.includes(b)) await lay.useLayout.getState().alternarCuadranteOculto(b)
    if (q) {
      const r = cm.rectMundo(cm.mapaVisible(s.gridCols, s.gridRows, quiero)?.rect ?? q)
      window.__casaVista = { focus: [r.centro[0], 1, r.centro[2]], zoom: Math.min(innerWidth, innerHeight) / (Math.max(r.ancho, r.largo) * 1.25), az: ISO_AZ, el: ISO_EL }
    } else delete window.__casaVista
    await sleep(600)
  }
`

/**
 * La casa entera de la mención y del arranque de la salida: CASA, o la de la escena
 * (`VISTA_CASA`, Mindfulness: el jardín abajo y la casa completa arriba). `GIRO_CASA`:
 * cuánto gira la cámara al alejarse (π/7 de fábrica; 0 = solo se abre).
 */
const VISTA_CASA_JS = ESCENA.VISTA_CASA ? JSON.stringify(ESCENA.VISTA_CASA) : 'CASA'
const GIRO_CASA_JS = ESCENA.GIRO_CASA ?? Math.PI / 7

/**
 * Pep@ con la ropa del cuarto de la guía, en su sitio del cuarto (escena.mjs).
 * La casa va EXPLOTADA si el cuarto está en la planta baja y APILADA (como es) si
 * está en un piso de arriba: explotada, los pisos altos flotan muy por encima.
 *
 * `tema`: el tema de la casa en esa toma (guías por épocas, como Arte: la escena da
 * el de la entrada en TEMA, el de cada toma intermedia en su `tema` y el de la salida
 * en TEMA_SALIDA); el tema también viste a Pep@. Sin él, la casa sin tema (una guía
 * anterior pudo dejarle uno a la demo) y la ropa del cuarto.
 */
const pepEnSuSitio = (tema = null) => `
  if (useDiseño.getState().temaGlobal !== ${JSON.stringify(tema)}) {
    await useDiseño.getState().setTemaGlobal(${JSON.stringify(tema)})
    await sleep(2500)
  }
  {
    // El fondo de la escena (Mindfulness: la playa tropical sin tema); sin tema ni FONDO, el ciclo de día de fábrica.
    const fondo = ${JSON.stringify(ESCENA.FONDO ?? null)} ?? (${JSON.stringify(tema)} ? null : 'auto')
    if (fondo && useDiseño.getState().fondoId !== fondo) {
      await useDiseño.getState().setFondoId(fondo)
      await sleep(1500)
    }
  }
  ${soloCuadrante(tema)}
  {
    // El tamaño de celda de la escena (Metas: 9 m, cuartos más amplios y claros); sin CELDA, el de fábrica.
    const L = (await modulo('/src/core/state/layoutStore.ts')).useLayout
    const celda = ${JSON.stringify(ESCENA.CELDA ?? 6)}
    if (L.getState().tamCelda !== celda) {
      await L.getState().setTamCeldaMapa(celda)
      await sleep(2500)
    }
  }
  {
    const principal = useDiseño.getState().objetos.find((o) => o.plantillaId === ${JSON.stringify(guion.plantillaId)})
    const niveles = (await modulo('/src/core/state/layoutStore.ts')).useLayout.getState().niveles
    const arriba = !!principal && (niveles[principal.roomId] ?? 0) > 0
    if (arriba === useHouse.getState().explotado) useHouse.getState().toggleExplotado()
  }
  await sleep(1200)
  ${ESCENA.ENTRADAS ? `{
    // Las entradas del cuarto (la de la guía, la de la app), en todas las tomas.
    const fallo = await (async () => { ${ESCENA.ENTRADAS({ url: URL_GUIA, titulo: guion.pregunta, guion })} })()
    if (fallo) return fallo
  }` : ''}
  ${ESCENA.CUERPO ? `
  // El narrador es un cuerpo prediseñado de la app (Metas: la princesa), sin ropa.
  {
    const { CUERPOS_PRESET } = await modulo('/src/core/house/cuerpos.ts')
    const preset = CUERPOS_PRESET.find((c) => c.id === ${JSON.stringify(ESCENA.CUERPO)})
    if (!preset) return 'no existe el cuerpo ${ESCENA.CUERPO}'
    // CUERPO_COLORES cambia colores de sus piezas (Mindfulness: el vestido verde); sin él, el de fábrica.
    const colores = ${JSON.stringify(ESCENA.CUERPO_COLORES ?? {})}
    const piezas = preset.piezas().map((p) => (colores[p.color] ? { ...p, color: colores[p.color] } : p))
    const av = useDiseño.getState().avatar
    if (av.cuerpoPresetId !== preset.id || JSON.stringify(av.modelo3d) !== JSON.stringify(piezas)) {
      await useDiseño.getState().setAvatarCuerpoPreset({ ...preset, piezas: () => piezas })
    }
    await useDiseño.getState().setAvatarRopaCompleta({})
  }
  ` : ESCENA.FORMA ? `
  // El narrador no es Pep@: el avatar toma la forma integrada de la escena (Idiomas: el mago), sin ropa.
  if (useDiseño.getState().avatar.modelo3d?.length) await useDiseño.getState().quitarAvatarModelo()
  await useDiseño.getState().setAvatarForma(${JSON.stringify(ESCENA.FORMA)})
  // Su color (Música: el mago de verde); sin FORMA_COLOR, el de fábrica.
  await useDiseño.getState().setAvatarFormaColor(${JSON.stringify(ESCENA.FORMA_COLOR ?? null)})
  await useDiseño.getState().setAvatarRopaCompleta({})
  ` : `
  // Pep@ de nuevo (una guía anterior pudo dejarle la forma del mago) y con la ropa del cuarto (o la del tema).
  if (useDiseño.getState().avatar.forma || useDiseño.getState().avatar.modelo3d?.length) await useDiseño.getState().quitarAvatarModelo()
  ${tema ? '' : `
  const { ATUENDOS_PRESET } = await modulo('/src/core/house/atuendos.ts')
  await useDiseño.getState().setAvatarRopaCompleta(ATUENDOS_PRESET.find((a) => a.id === ${JSON.stringify(ESCENA.ATUENDO)}).ropa)
  `}
  `}
  {
    const fallo = await (async () => { ${ESCENA.PEP_EN_SU_SITIO} })()
    if (fallo) return fallo
  }
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
/**
 * El plano `i` durante `ms`, con corte seco al empezar (se apunta para el efecto de montar.mjs).
 * `hasta` (s desde `__marcas.t0`): el plano acaba a esa hora y no tras `ms` fijos; si no, los
 * retrasos de cada plano se suman y la mención llegaba ~2,5 s tarde tras el gancho.
 */
function plano(i, ms, hasta) {
  if (hasta != null) ms = 'msPlano'
  const p = PLANOS[i % PLANOS.length]
  // `antes`: lo que hace Pep@ al empezar el plano (escena.mjs; no debe esperar: corre junto con la cámara).
  const corte = (i ? 'window.__marcas.cortes.push(performance.now())' : '') + (p.antes ? `
${p.antes}` : '')
  const reloj = hasta != null ? `const msPlano = Math.max(300, window.__marcas.t0 + ${Math.round(hasta * 1000)} - performance.now())` : ''
  if (p.iso) {
    return `{
      ${corte}
      ${reloj}
      useCam.setState({ vista: 'iso' })
      // dx/dz del plano: corrimiento extra si Pep@ no está en su sitio (p. ej., acostado).
      { const c = await camIso(); c.focus[0] += ${p.dx ?? 0}; c.focus[2] += ${p.dz ?? 0}; await cortarCam(c) }
      { const a = camAhora(); await moverCam(a, { ...a, az: a.az + 0.25, zoom: a.zoom * 1.12 }, ${ms}, ease) }
    }`
  }
  return `{
    ${corte}
    ${reloj}
    ${orbitar(p.yaw[0], p.yaw[1], ms, p.dist[0], p.dist[1], p.pitch[0], p.pitch[1])}
  }`
}

/** Deja la cámara de tercera persona como la tiene la app. */
const CAMARA_NORMAL = `useCam.setState({ vista: 'iso', yaw: Math.PI, dist3p: 7, pitch: 0.25 })`

const TOMAS = [
  {
    nombre: 'casa-entrada',
    preparar: `
      await limpiarTodo()
      useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })
      ${pepEnSuSitio(ESCENA.TEMA)}
      // Pasar antes por la vista iso junto a Pep@: entrando directo a tercera, el cuarto no se dibuja.
      await cortarCam(await camJugador(80, -1.2))
      await sleep(1500)
      useCam.setState({ vista: 'tercera', yaw: ${PLANOS[0].yaw[0]}, dist3p: ${PLANOS[0].dist[0]}, pitch: ${PLANOS[0].pitch[0]} })
      await sleep(2000)
      prep()
      return 'ok'
    `,
    // Pep@ en lo suyo mientras dice el gancho, un plano por frase; con la mención,
    // vista iso y la cámara se aleja hasta la casa entera. Se apunta cuándo empieza cada cosa.
    accion: `
      ${QUITAR_MARCA}
      window.__marcas = { t0: performance.now(), cortes: [] }
      ${frases
        .map((f, i) => {
          const desde = i ? enToma(f.ini) : 0
          const hasta = i < frases.length - 1 ? enToma(frases[i + 1].ini) : enToma(GANCHO.dur) + ENTRE
          return plano(i, Math.round((hasta - desde) * 1000), hasta)
        })
        .join('\n')}
      window.__marcas.cortes.push(performance.now())
      useCam.setState({ vista: 'iso' })
      await cortarCam(await camIso())
      window.__marcas.mencion = performance.now()
      { const V = window.__casaVista ?? ${VISTA_CASA_JS}; await ${ESCENA.VISTA_CASA ? 'abrirCam' : 'moverCam'}(camAhora(), { ...V, az: V.az + ${GIRO_CASA_JS} }, ${Math.round((MENCION.dur + 0.4) * 1000)}${ESCENA.VISTA_CASA ? '' : ', ease'}) }
      await sleep(900)
    `,
  },
  {
    nombre: 'casa-salida',
    preparar: `
      await limpiarTodo()
      useCiclo.setState({ minutos: 16 * 60 + 20, modo: 'manual' })
      ${pepEnSuSitio(ESCENA.TEMA_SALIDA ?? ESCENA.TEMA)}
      ${ESCENA.PREPARAR_SALIDA ?? ''}
      { const V = window.__casaVista ?? ${VISTA_CASA_JS}; await cortarCam({ ...V, az: V.az - ${GIRO_CASA_JS}, zoom: V.zoom * (window.__casaVista || ${JSON.stringify(!!ESCENA.VISTA_CASA)} ? 1 : 0.8) }) }
      await sleep(1500)
      prep()
      return 'ok'
    `,
    // La casa entera con la luz de la tarde, de vuelta con Pep@ y, al final, en tercera persona a su alrededor.
    accion: `
      ${QUITAR_MARCA}
      await sleep(700)
      ${ESCENA.VISTA_CASA ? 'await abrirCam(await camJugador(80, -1.2), camAhora(), 4600, true)' : 'await moverCam(camAhora(), await camJugador(80, -1.2), 4600, ease)'}
      ${orbitar(ESCENA.ORBITA_SALIDA[0], ESCENA.ORBITA_SALIDA[1], 2800, ESCENA.ORBITA_SALIDA[2])}
      ${ESCENA.FIN_SALIDA ?? ''}
    `,
    limpiar: CAMARA_NORMAL,
  },
  // Las tomas intermedias: Pep@ abre las otras entradas del cuarto. Con `voz`, la
  // línea del guion que se narra encima (la acción apunta cuándo empieza en __marcas.voz).
  ...(ESCENA.TOMAS_EXTRA ?? []).map((x) => ({
    nombre: `casa-${x.nombre}`,
    voz: x.voz,
    preparar: `
      await limpiarTodo()
      useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })
      ${pepEnSuSitio('tema' in x ? x.tema : ESCENA.TEMA)}
      await cortarCam(await camJugador(80, -1.2))
      await sleep(1500)
      ${x.preparar ?? ''}
      await sleep(1500)
      prep()
      return 'ok'
    `,
    accion: `
      ${QUITAR_MARCA}
      window.__marcas = { t0: performance.now() }
      // La página o la app que abra la entrada no sale de esta pestaña: el video corta a ella.
      window.open = () => null
      ${x.accion(x.voz ? tiempos[x.voz] : 0)}
    `,
    limpiar: CAMARA_NORMAL,
  })),
]
await conPagina(CRUDO, async (c) => {
  await fijarViewport(c)
  // Siempre se vuelve a abrir: la página tiene que cargar con el registro de recursos
  // ampliado (cdp.mjs) para que `modulo()` encuentre los módulos reales de la app.
  await abrirDemo(c, idioma)
  // `--tomas=casa-guia,casa-plan`: solo esas.
  const solo = args.find((a) => a.startsWith('--tomas='))?.slice(8).split(',')
  for (const toma of TOMAS.filter((x) => !solo || solo.includes(x.nombre))) {
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
    } else if (toma.nombre !== 'casa-salida') {
      // Toma intermedia: dónde suena su línea y cuándo se toca la entrada (montar.mjs les pone voz y efectos).
      const m = await evaluar(c, 'window.__marcas')
      const base = 1.5 - DESDE
      const en = (t) => (t == null ? undefined : Math.round((base + (t - m.t0) / 1000) * 1000) / 1000)
      writeFileSync(path.join(SALIDA, `${toma.nombre}.json`), JSON.stringify({ voz: toma.voz ? { clave: toma.voz, en: en(m.voz) } : undefined, toque: en(m.toque) }, null, 2) + '\n')
    }
    console.log(`✓ ${toma.nombre}.mp4 · viewport ${vp.w}×${vp.h}`)
  }
  // La pregunta en grande para el primer segundo del video completo (montar.mjs).
  await capturarTitulo(c, tema, idioma, path.join(SALIDA, 'titulo.png'), ESCENA.TITULO_ESCALA)
  console.log('✓ titulo.png')
})
