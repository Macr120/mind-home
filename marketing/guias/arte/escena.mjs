// Lo propio de la guía de Arte en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está Pep@ en la casa (junto al caballete del Studio Arte) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// El tiempo avanza con el video: la casa cambia de tema parte a parte (y el tema
// viste a Pep@): medieval en la entrada y la parte 1, pirata en la 2 (Durero),
// vaquero en la 3, tren en la 4, cyberpunk en la 5 y nave espacial en la 6 y la
// salida. En la página, Pep@ lleva la ropa de la misma época (EPOCAS_GUIA de pep.ts).
//
// El Studio Arte está en el PISO 1 (casa apilada), en la esquina sureste. Sus
// entradas vienen FIJAS en la casa de la demo (public/demo/casa.json, DEMO_VERSION 50):
// el caballete (abre la app), el cuadro del muro norte con la pregunta (abre la guía
// web) y el cuaderno de bocetos de la mesa de centro (abre la galería).
import path from 'node:path'

/** Atuendo de Pep@ si una toma no tiene tema (todas lo tienen: lo viste el tema). */
export const ATUENDO = 'artista'

/** Solo el cuadrante de la casa a la vista (pedido del usuario: los temas se ven mejor sin el resto del mapa). */
export const CUADRANTE = 'zona-casa'

/** El tema de la casa en la entrada (y en las tomas sin el suyo) y en la salida. */
export const TEMA = 'medieval'
export const TEMA_SALIDA = 'nave'

/** Pep@ en el piso del cuarto y `window.__arte` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const caballete = useDiseño.getState().objetos.find((x) => x.tipo === 'caballete-arte' && x.plantillaId === 'arte')
  if (!caballete) return 'SIN caballete en el Studio Arte de la demo: ¿la demo es anterior a DEMO_VERSION 50? (abrirDemo con rehacer)'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[caballete.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(caballete.roomId)
  window.__arte = { cuarto: caballete.roomId, rx, rz, caballete: caballete.id }
`

const HERRAMIENTA = `(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta`

/** Suelta el gesto prestado (para caminar). */
const SOLTAR_GESTO = `;${HERRAMIENTA}.getState().setEmote(null)`

/**
 * Los gestos que Pep@ hace en la casa con el hueco de un baile: explicar, señalar
 * (a su izquierda), pintar (el brazo izquierdo hacia el lienzo, a trazos) y medir
 * (el brazo estirado al frente, como quien mide con el lápiz).
 */
const GESTOS = `
  const { ciclo } = await modulo('/src/rooms/ejercicio/anim/pose.ts')
  window.__gestos = {
    explica: ciclo(3.2, [
      { t: 0, pose: { hombroD: [18, 12, 0], codoD: 55, hombroI: [12, 8, 0], codoI: 35 } },
      { t: 0.35, pose: { hombroD: [38, 18, 10], codoD: 85, hombroI: [16, 10, 0], codoI: 40, cuello: [4, 6, 0] } },
      { t: 0.7, pose: { hombroD: [24, 10, 0], codoD: 65, hombroI: [30, 16, 10], codoI: 75, cuello: [2, -5, 0] } },
    ]),
    senala: ciclo(2.4, [
      { t: 0, pose: { hombroI: [80, 55, 0], codoI: 8, cuello: [0, 18, 0], tronco: [0, 8, 0] } },
      { t: 0.5, pose: { hombroI: [86, 58, 0], codoI: 4, cuello: [0, 20, 0], tronco: [0, 10, 0] } },
    ]),
    pinta: ciclo(1.3, [
      { t: 0, pose: { hombroI: [72, 48, 0], codoI: 28, cuello: [0, 22, 0], tronco: [0, 10, 0] } },
      { t: 0.35, pose: { hombroI: [62, 58, 0], codoI: 44, cuello: [0, 24, 0], tronco: [0, 12, 0] } },
      { t: 0.7, pose: { hombroI: [78, 52, 0], codoI: 22, cuello: [0, 20, 0], tronco: [0, 9, 0] } },
    ]),
    mide: ciclo(3, [
      { t: 0, pose: { hombroD: [88, 4, 0], codoD: 2, cuello: [6, 0, 0] } },
      { t: 0.5, pose: { hombroD: [92, 6, 0], codoD: 0, cuello: [8, 0, 0] } },
    ]),
  }
`
/** Pone el gesto `nombre` en el hueco prestado (en TODAS las copias del módulo de los bailes). */
const gesto = (nombre) => `
  {
    const urls = [...new Set(performance.getEntriesByType('resource').map((x) => x.name).filter((n) => n.includes('/src/core/house/emotesPatrones.ts')))]
    for (const url of urls) (await import(url)).PATRONES_EMOTE.electroShuffle = window.__gestos.${nombre}
    ;${HERRAMIENTA}.getState().setEmote(null)
    await sleep(120)
    ;${HERRAMIENTA}.getState().setEmote('electroShuffle')
  }
`

/**
 * Pep@ junto al caballete (al oeste, con el caballete a su izquierda y el lienzo
 * mirando al este), explicando. Llega caminando hacia el sur: de cara a la cámara.
 */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + caballete.x - 0.85, z: rz + caballete.z + 0.45 }
  window.__arte.sitio = SITIO
  await teletransportar(SITIO.x, SITIO.z - 0.9)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre el caballete (la esfera y sus llamitas): fuera en esta
  // toma (React lo remonta: se repasa toda la toma). El lienzo no pasa de 1,7 m: lo de más arriba es el marcador.
  const [mx, mz] = [rx + caballete.x, rz + caballete.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - mx, z - mz) < 0.4 && y > piso + 1.9) m.visible = false
    })
  }, 300)
  ${GESTOS}
  const { useHerramienta } = await modulo('/src/core/state/herramientaStore.ts')
  // El módulo de los bailes es perezoso y lo carga la app con SU URL: primero se le
  // hace cargar, luego se cambia el patrón en TODAS las instancias y se pone el gesto.
  useHerramienta.getState().setEmote('electroShuffle')
  // Con el servidor recién arrancado (o varios grabadores a la vez) el módulo tarda en llegar.
  const cargados = () => [...new Set(performance.getEntriesByType('resource').map((x) => x.name).filter((n) => n.includes('/src/core/house/emotesPatrones.ts')))]
  for (let i = 0; i < 50 && !cargados().length; i++) await sleep(300)
  await sleep(300)
  useHerramienta.getState().setEmote(null)
  const urls = cargados()
  if (!urls.length) return 'no encontré el módulo de los emotes que carga la app'
  for (const url of urls) (await import(url)).PATRONES_EMOTE.electroShuffle = window.__gestos.explica
  await sleep(300)
  useHerramienta.getState().setEmote('electroShuffle')
  await sleep(800)
`

/** Las entradas fijas del cuarto (vienen en la casa de la demo): sus ids en `window.__entradas`. */
export const ENTRADAS = () => `
  ${EN_EL_CUARTO}
  const objs = useDiseño.getState().objetos.filter((x) => x.roomId === caballete.roomId)
  const guia = objs.find((x) => x.enlaceUrl?.includes('/guias/arte'))
  const app = objs.find((x) => x.enlaceApp?.plantillaId === 'arte')
  if (!guia || !app) return 'faltan las entradas fijas del Studio Arte: ¿la demo es anterior a DEMO_VERSION 50? (abrirDemo con rehacer)'
  window.__entradas = { cuarto: caballete.roomId, caballete: caballete.id, guia: guia.id, app: app.id }
`

/** Posición en el mundo de un objeto del cuarto: [x, z]. */
const MUNDO = `
  const mundo = async (id) => {
    const o = useDiseño.getState().objetos.find((x) => x.id === id)
    const [rx, , rz] = (await modulo('/src/core/state/layoutStore.ts')).roomWorldPos(o.roomId)
    return [rx + o.x, rz + o.z]
  }
`
/**
 * La cámara en tercera persona sin esperar (corre mientras Pep@ camina): yaw,
 * distancia e inclinación de inicio a fin. `window.__soltarCam = true` la corta.
 */
const girar = (de, a, ms, d0, d1, p0, p1) => `
  window.__soltarCam = false
  void new Promise((r) => {
    const t0 = performance.now()
    const paso = () => {
      if (window.__soltarCam) return r()
      const q = Math.min(1, (performance.now() - t0) / ${ms})
      useCam.setState({ vista: 'tercera', yaw: ${de} + (${a} - ${de}) * q, dist3p: ${d0} + (${d1} - ${d0}) * q, pitch: ${p0} + (${p1} - ${p0}) * q })
      if (q < 1) requestAnimationFrame(paso); else r()
    }
    paso()
  })
`
/** Espera a que acabe la voz de la toma (más un respiro). */
const hastaFinVoz = (dur) => `
  {
    const fin = window.__marcas.voz + ${Math.round((dur + 0.6) * 1000)}
    while (performance.now() < fin) await sleep(100)
  }
`
/** Las tomas que hablan: arrancan su voz a los 0,3 s del corte. */
const VOZ = `window.__marcas.voz = performance.now() + 300`

/** De vuelta a su sitio junto al caballete (aparece un paso al norte y avanza: queda de cara al sur). */
const AL_SITIO = `
  ${SOLTAR_GESTO}
  {
    const s = window.__arte.sitio
    await teletransportar(s.x, s.z - 0.6)
    await irA(s.x, s.z, 0.12)
    await sleep(400)
  }
`

/**
 * El dibujo de Pep@ pintándose a sí mismo (el lienzo del caballete repite la escena
 * hacia dentro): se pinta en un canvas de la página y se guarda como un dibujo más
 * de la galería (una vez por demo; el nombre no lleva texto que traducir). Su id
 * queda en `window.__dibujoPep`. Sirve igual en la casa y en la app 2D del cierre.
 */
export const DIBUJO_PEP = `
  {
    const real = async (ruta) => import(performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes(ruta)) ?? ruta)
    const { dibujosRepo } = await real('/src/core/data/repository.ts')
    const NOMBRE = 'Pep@ ∞'
    let d = (await dibujosRepo.list()).find((x) => x.nombre === NOMBRE)
    if (!d) {
      const W = 1200
      const H = 900
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      const g = cv.getContext('2d')
      // La escena en un rectángulo de w × h (en su origen); dentro del lienzo, ella misma más pequeña.
      const escena = (w, h, nivel) => {
        g.fillStyle = '#f6ead6'
        g.fillRect(0, 0, w, h)
        g.fillStyle = '#c08a57'
        g.fillRect(0, h * 0.74, w, h * 0.26)
        g.fillStyle = '#a8743f'
        for (let k = 0; k < 6; k++) g.fillRect(0, h * (0.78 + k * 0.04), w, h * 0.006)
        const u = h / 100
        const caja = (x, y, a, b, c) => { g.fillStyle = c; g.fillRect(x * u, y * u, a * u, b * u) }
        // Pep@ de lado, mirando al caballete: piernas moradas, torso rojo, cabeza amarilla.
        caja(20, 62, 7, 18, '#b36bfb'); caja(29, 62, 7, 18, '#b36bfb')
        caja(17, 38, 22, 26, '#f53b4b')
        caja(16, 14, 24, 24, '#ffd23b')
        g.strokeStyle = '#1c2333'; g.lineWidth = 0.6 * u; g.strokeRect(16 * u, 14 * u, 24 * u, 24 * u)
        caja(31, 21, 3.2, 3.2, '#1c2333'); caja(36, 21, 2.6, 3.2, '#1c2333')
        g.strokeStyle = '#8b1e2b'; g.lineWidth = 0.9 * u
        g.beginPath(); g.moveTo(31 * u, 31 * u); g.quadraticCurveTo(35 * u, 33.5 * u, 39 * u, 30.5 * u); g.stroke()
        // El brazo hacia el lienzo, con el pincel.
        g.save(); g.translate(36 * u, 42 * u); g.rotate(-0.35)
        caja(0, -3, 20, 6.5, '#f53b4b'); caja(19, -3, 4, 6.5, '#ffd23b')
        g.fillStyle = '#7c4a1d'; g.fillRect(22 * u, -0.6 * u, 12 * u, 1.4 * u)
        g.fillStyle = '#ef4444'; g.fillRect(33 * u, -1.1 * u, 3 * u, 2.4 * u)
        g.restore()
        // El caballete y su lienzo.
        g.strokeStyle = '#8b5a2b'; g.lineWidth = 2.2 * u; g.lineCap = 'round'
        g.beginPath(); g.moveTo(66 * u, 16 * u); g.lineTo(58 * u, 92 * u); g.moveTo(66 * u, 16 * u); g.lineTo(76 * u, 92 * u); g.moveTo(66 * u, 16 * u); g.lineTo(68 * u, 90 * u); g.stroke()
        const [lx, ly, lw, lh] = [52 * u, 20 * u, 30 * u, 23 * u]
        g.fillStyle = '#7c4a1d'; g.fillRect(lx - 1.2 * u, ly - 1.2 * u, lw + 2.4 * u, lh + 2.4 * u)
        caja(50, 44, 34, 2, '#8b5a2b')
        if (nivel < 5) {
          g.save(); g.translate(lx, ly); g.beginPath(); g.rect(0, 0, lw, lh); g.clip()
          g.scale(lw / w, lh / h)
          escena(w, h, nivel + 1)
          g.restore()
        } else {
          g.fillStyle = '#ffffff'; g.fillRect(lx, ly, lw, lh)
        }
      }
      escena(W, H, 0)
      // La firma, como en los cuadros.
      g.fillStyle = '#7c2d12'; g.font = 'italic 700 34px Georgia, serif'; g.fillText('Pep@', W - 140, H - 30)
      const imagen = await new Promise((r) => cv.toBlob(r, 'image/png'))
      const { miniaturaFoto } = await real('/src/rooms/_shared/fotos.tsx')
      const ahora = new Date().toISOString()
      await dibujosRepo.add({ nombre: NOMBRE, imagen, miniatura: await miniaturaFoto(imagen), ancho: W, alto: H, creadoEn: ahora, actualizadoEn: ahora })
      d = (await dibujosRepo.list()).find((x) => x.nombre === NOMBRE)
    }
    window.__dibujoPep = d.id
  }
`
/** La app de Arte se abre en el dibujo de Pep@ (el próximo «Entrar» la lee al montarse). */
const ABRIR_EN_DIBUJO = `
  {
    const real = async (ruta) => import(performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes(ruta)) ?? ruta)
    ;(await real('/src/core/state/intencionApp.ts')).lanzarIntencionApp({ appId: 'arte', dato: 'dibujo:' + window.__dibujoPep })
  }
`

/** La toma empieza con la casa ENTERA (se ve en qué se convirtió: barco, tren, nave…). */
const DESDE_LEJOS = `
  useCam.setState({ vista: 'iso' })
  {
    const V = window.__casaVista ?? CASA
    await cortarCam({ ...V, az: V.az + Math.PI / 7, zoom: V.zoom * (window.__casaVista ? 1 : 0.7) })
  }
`
/**
 * Mientras Pep@ dice en qué época está la casa, la cámara baja desde la casa entera
 * hasta él (`ms`) y luego pasa a tercera persona y gira (`de`→`a`) hasta el final.
 */
const BAJAR_Y_GIRAR = (dur, ms, de, a, d0, d1, p0, p1) => `
  ${VOZ}
  await sleep(300)
  await moverCam(camAhora(), await camJugador(80, -1.2), ${ms}, ease)
  ${girar(de, a, Math.max(1000, Math.round(dur * 1000) - ms + 300), d0, d1, p0, p1)}
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 * `accion(dur)` recibe lo que dura la voz; apunta `__marcas.voz` y `__marcas.toque`.
 * `tema`: la época de la casa en esa toma. Las de época abren con la casa entera
 * (la línea empieza diciendo en qué se convirtió) y bajan hasta Pep@.
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // Plano nuevo tras el corte: el cuadro del muro norte en la vista iso; Pep@ llega
    // caminando hacia el norte hasta su lado este (al oeste queda el caballete).
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 0.95, bz + 2.6)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.6, y + 1.0, bz + 1.0], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    // Toda en la vista iso, sin cortes (un corte de tercera persona a iso se ve como un barrido).
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.4, y + 1.3, bz + 0.5], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx + 0.95, bz + 0.8, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al cuadro: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «fíjate en la casa: es un castillo de la Edad Media…»: el castillo entero y Pep@ junto a la mesa del cuaderno.
    nombre: 'castillo',
    voz: 'arte.castillo',
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [ax, az] = await mundo(window.__entradas.app)
      // Al oeste de la mesa, de cara al sur (avanza un paso para girarse): la mesa le queda a la izquierda.
      await teletransportar(ax - 0.7, az - 0.9)
      await irA(ax - 0.7, az - 0.3, 0.15)
      await sleep(400)
      ${gesto('senala')}
      ${DESDE_LEJOS}
    `,
    accion: (dur) => BAJAR_Y_GIRAR(dur, 4200, 0.6, 0.25, 3.0, 2.6, 0.45, 0.4) + hastaFinVoz(dur),
  },
  {
    // Parte 2, «la casa ya es un barco…» y la rejilla de Durero (1525): el barco entero y Pep@ pintando.
    nombre: 'durero',
    voz: 'historia.durero',
    tema: 'pirata',
    preparar: `
      ${AL_SITIO}
      ${gesto('pinta')}
      ${DESDE_LEJOS}
    `,
    accion: (dur) => BAJAR_Y_GIRAR(dur, 4500, 1.5, 1.05, 3.0, 2.5, 0.4, 0.34) + hastaFinVoz(dur),
  },
  {
    // Parte 3, «la casa está en el Lejano Oeste…» y medir con el lápiz: el pueblo en sepia y Pep@ midiendo.
    nombre: 'oeste',
    voz: 'elementos.oeste',
    tema: 'vaquero',
    preparar: `
      ${AL_SITIO}
      ${gesto('mide')}
      ${DESDE_LEJOS}
    `,
    accion: (dur) => BAJAR_Y_GIRAR(dur, 4500, 0.25, -0.15, 3.0, 2.5, 0.36, 0.32) + hastaFinVoz(dur),
  },
  {
    // Parte 4, «la casa ya es un tren…» y mirar una obra diez minutos: el tren entero y Pep@ señalando el lienzo.
    nombre: 'tren',
    voz: 'mirar.tren',
    tema: 'tren',
    preparar: `
      ${AL_SITIO}
      ${gesto('senala')}
      ${DESDE_LEJOS}
    `,
    accion: (dur) => BAJAR_Y_GIRAR(dur, 4500, 0.95, 0.6, 3.1, 2.6, 0.42, 0.38) + hastaFinVoz(dur),
  },
  {
    // Parte 5, «la casa llegó a la era digital…» y la mención: el neón entero; Pep@ va al cuaderno y abre la galería.
    nombre: 'plan',
    voz: 'hacer.mencion-plan',
    tema: 'cyberpunk',
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      ${DIBUJO_PEP}
      const [ax, az] = await mundo(window.__entradas.app)
      await teletransportar(ax - 1.7, az - 0.5)
      ${DESDE_LEJOS}
    `,
    accion: (dur) => `
      ${MUNDO}
      const e = window.__entradas
      const [ax, az] = await mundo(e.app)
      ${VOZ}
      await sleep(300)
      await moverCam(camAhora(), await camJugador(80, -1.2), 4200, ease)
      ${girar(0.35, 0.8, 2400, 3.0, 2.4, 0.42, 0.5)}
      await irA(ax - 0.6, az - 0.1, 0.25)
      await sleep(300)
      useInteractUi.getState().selectEnlace(e.app)
      await sleep(400)
      sinPaneles()
      await sleep(500)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 6, «la casa ya llegó al futuro: es una nave espacial…»: la nave entera; Pep@ abre la app en su dibujo.
    nombre: 'futuro',
    voz: 'plan.futuro',
    tema: 'nave',
    preparar: `
      ${AL_SITIO}
      ${DIBUJO_PEP}
      ${gesto('explica')}
      ${DESDE_LEJOS}
    `,
    accion: (dur) => `
      const e = window.__entradas
      ${BAJAR_Y_GIRAR(dur, 4500, 0.35, 0.05, 3.0, 2.6, 0.4, 0.36)}
      await sleep(${Math.max(1500, Math.round(dur * 1000) - 4500 - 3200)})
      ${ABRIR_EN_DIBUJO}
      useInteractUi.getState().selectMueble(e.cuarto)
      await sleep(400)
      sinPaneles()
      await sleep(500)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      ${hastaFinVoz(dur)}
    `,
  },
]

/** La salida (en la nave espacial): de vuelta en su sitio, pintando en el caballete. */
export const PREPARAR_SALIDA = `
  ${DIBUJO_PEP}
  ${gesto('pinta')}
  await sleep(600)
`

/** El final de la salida: Pep@ abre la app por la entrada principal (el caballete), en su dibujo. */
export const FIN_SALIDA = `
  ${gesto('explica')}
  ${ABRIR_EN_DIBUJO}
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  // Que se vea la app ya cargada, con el dibujo abierto, antes de terminar.
  await sleep(4500)
`

/** El plano iso del gancho: corrido desde Pep@ (al oeste del caballete) hacia el centro de lo que se ve del cuarto. */
export const ISO = { zoom: 84, dx: 0.7, dz: -1.3, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Casi todos los niños dibujan sin miedo»: pinta en el caballete; desde el este, con el lienzo de frente.
  { yaw: [1.45, 1.15], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('pinta') },
  // «Y casi todos los adultos dicen que no saben…»: desde arriba, explicando.
  { yaw: [-0.45, -0.25], dist: [2.6, 2.3], pitch: [0.72, 0.64], antes: gesto('explica') },
  // «¿Es cuestión de talento, o se puede aprender?»: la vista del juego.
  { iso: true },
  // La promesa (frase larga): un giro amplio, del lienzo a su cara, bajando desde arriba.
  { yaw: [1.35, -0.35], dist: [3.6, 2.5], pitch: [0.62, 0.36], antes: gesto('explica') },
]

/** El final de la salida: tercera persona girando alrededor de Pep@ (yaw de inicio a fin): del lienzo a su cara. */
export const ORBITA_SALIDA = [1.3, 0.6]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * al ponerse a pintar y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'magia.mp3'), en: cortes[0] + 0.2, volumen: 0.22 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «una galería…, un lienzo
 * por capas… y ayudas de dibujo», la toma pasa por cada cosa justo al nombrarla:
 * la galería, un dibujo abierto con su panel de capas y el de las ayudas.
 * `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['galeria', 'capas', 'ayudas'],
  textos: '{}',
  ayudas: `
    /** El dibujo de Pep@ pintándose (lo crea DIBUJO_PEP en preparar). */
    const dibujo = () => tut('arte.dibujo.' + window.__dibujoPep) ?? document.querySelector('[data-tut^="arte.dibujo."]')
    const herr = (id) => tut('arte.herr.' + id)
  `,
  /** La app en la galería, arriba del todo. */
  preparar: `
    ${DIBUJO_PEP}
    await dormir(800)
    if (tut('arte.volver')) await tocar(tut('arte.volver'))
    await dormir(600)
    main().scrollTop = 0
  `,
  /** `T` = segundo del cierre en que se dice cada ancla, y `fin`. */
  accion: (T) => `
    await hasta(t0, ${T.galeria} + 0.6)
    await bajarHasta(main(), 0, t0 + ${T.galeria + 2.2} * 1000)
    await hasta(t0, ${T.capas} - 1.2)
    main().scrollTop = 0
    if (dibujo()) await tocar(dibujo())
    await hasta(t0, ${T.capas} + 0.2)
    if (herr('capas')) await tocar(herr('capas'))
    await hasta(t0, ${T.ayudas} - 0.3)
    if (herr('capas')?.getAttribute('aria-pressed') === 'true') await tocar(herr('capas'))
    await dormir(300)
    if (herr('ayudas')) await tocar(herr('ayudas'))
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a Pep@ (miniaturas.mjs). */
export const MINIATURA = { objeto: '🎨' }

/** El «fah» del gancho, tras la frase que incomoda (la de los adultos, la tercera): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
