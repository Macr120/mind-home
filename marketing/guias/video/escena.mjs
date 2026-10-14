// Lo propio de la guía de Video en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el mago, en el Studio de video) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// La narra el mago (como Idiomas y Música), aquí de ROJO (FORMA_COLOR), sin tema en la casa.
// El Studio de video está en la planta baja del ala del Studio (src/demo/mapa/casa.ts,
// `ALA_STUDIO`): la cámara en tripié al noroeste (abre la app), la lámpara de estudio a su
// lado y el escritorio con el monitor al este. Sus dos entradas extra se arman EN VIVO
// (ENTRADAS, idempotente): un cartel de claqueta con la pregunta en el muro norte (abre la
// guía web) y el monitor del escritorio (abre los Videos de la app).
import path from 'node:path'

/** El narrador: el avatar con la forma integrada del mago (casa.mjs le quita la ropa), de rojo. */
export const FORMA = 'mago'
export const FORMA_COLOR = '#b91c1c'
/** La música de fondo: la misma del mago en Idiomas (musica/idiomas.json). */
export const MUSICA_LISTA = 'idiomas.json'
/** Sin uso con FORMA (casa.mjs lo pide si no la hay). */
export const ATUENDO = 'academico'

/** El narrador en su piso y `window.__video` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const camara = useDiseño.getState().objetos.find((x) => x.tipo === 'camara-video' && x.plantillaId === 'video')
  if (!camara) return 'SIN cámara de video en el Studio de video de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[camara.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(camara.roomId)
  window.__video = { cuarto: camara.roomId, rx, rz, camara: camara.id }
`

/**
 * Los gestos del mago: el de la app no tiene emotes, solo el brazo del orbe
 * articulado. Un bucle mueve ese brazo según `window.__gestoMago` ('explica',
 * 'senala' o null = quieto); lo vuelve a buscar si React remonta el avatar.
 */
const GESTOS_MAGO = `
  if (!window.__bucleMago) {
    const hs = await modulo('/src/core/state/houseStore.ts')
    const buscar = () => {
      let b = null
      window.__r3f().scene.traverse((m) => {
        if (b || !m.isMesh || m.geometry.type !== 'BoxGeometry') return
        const p = m.geometry.parameters
        if (Math.abs(p.width - 0.14) > 0.001 || Math.abs(p.height - 0.44) > 0.001 || Math.abs(m.parent.position.x - 0.32) > 0.01) return
        m.updateWorldMatrix(true, false)
        const [x, , z] = m.matrixWorld.elements.slice(12, 15)
        if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 1) b = m.parent
      })
      return b
    }
    let brazo = null
    let visto = 0
    window.__bucleMago = true
    const paso = () => {
      const ahora = performance.now()
      if (!brazo?.parent || ahora - visto > 2000) {
        brazo = buscar() ?? brazo
        visto = ahora
      }
      const t = ahora / 1000
      const g = window.__gestoMago
      if (brazo) {
        const [z, x] =
          g === 'explica' ? [0.4 + 0.25 * Math.sin(t * 2.1), -0.5 + 0.25 * Math.sin(t * 1.3)]
          : g === 'senala' ? [1.4 + 0.05 * Math.sin(t * 2.6), -0.45]
          : [0, 0]
        brazo.rotation.z += (z - brazo.rotation.z) * 0.15
        brazo.rotation.x += (x - brazo.rotation.x) * 0.15
      }
      window.__r3f().invalidate()
      requestAnimationFrame(paso)
    }
    paso()
  }
`
/** Pone un gesto (o ninguno); instala el bucle si la página es nueva (casa.mjs reabre la demo entre tomas). */
const gesto = (nombre) => (nombre ? `${GESTOS_MAGO}
  window.__gestoMago = '${nombre}'` : 'window.__gestoMago = null')

/** Su sitio: delante (al sur) de la cámara y de la lámpara, lejos del escritorio, de cara al sur. Coordenadas del cuarto. */
const SITIO = { x: -0.75, z: -0.35 }

/** En su sitio junto a la cámara: llega caminando hacia el sur (de cara a la cámara), explicando. */
export const PEP_EN_SU_SITIO = `
  ${EN_EL_CUARTO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.45)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre la cámara: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + camara.x, rz + camara.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - mx, z - mz) < 0.3 && y > piso + 1.2) m.visible = false
    })
  }, 300)
  ${gesto('explica')}
  await sleep(600)
`

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el cartel de claqueta de la
 * guía en el muro norte y el monitor del escritorio (los Videos de la app). Sus ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const cuarto = camara.roomId
  // El cartel: una claqueta grande (franjas blancas y negras arriba), la pregunta y una fila de fotogramas.
  const CARTEL = { x: 0.2, z: -2.9 }
  let cartel = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/video'))
  if (cartel && (cartel.tipo !== 'piezas' || Math.hypot(cartel.x - CARTEL.x, cartel.z - CARTEL.z) > 0.05 || cartel.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(cartel.id)
    cartel = undefined
  }
  if (!cartel) {
    const Y = 1.6
    const franjas = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ tipo: 'caja', pos: [-0.54 + i * 0.18, Y + 0.38, 0.043], tam: [0.09, 0.1, 0.006], color: '#f9fafb' }))
    const fotogramas = [0, 1, 2, 3, 4].map((i) => ({ tipo: 'caja', pos: [-0.4 + i * 0.2, Y - 0.27, 0.043], tam: [0.16, 0.12, 0.006], color: ['#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#c4b5fd'][i] }))
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.36, 0.96, 0.06], color: '#111827' },
      { tipo: 'caja', pos: [0, Y + 0.38, 0.035], tam: [1.28, 0.12, 0.012], color: '#111827' },
      ...franjas,
      { tipo: 'plano', pos: [0, Y + 0.12, 0.042], tam: [1.2, 0.28], color: '#111827', tinta: '#ffffff', texto: ${JSON.stringify(titulo)} },
      { tipo: 'caja', pos: [0, Y - 0.27, 0.038], tam: [1.1, 0.18, 0.006], color: '#0b0f19' },
      ...fotogramas,
      { tipo: 'plano', pos: [0.4, Y - 0.42, 0.042], tam: [0.4, 0.08], color: '#b91c1c', tinta: '#ffffff', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#111827', undefined, CARTEL, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    cartel = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El monitor del escritorio: abre los Videos de la app.
  const monitor = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:50')
  if (!monitor) return 'SIN monitor en el Studio de video de la demo'
  if (monitor.enlaceApp?.plantillaId !== 'video') {
    await useDiseño.getState().setObjetoEnlaceApp(monitor.id, { plantillaId: 'video', seccion: 'videos', titulo: tGlobal('video.tab.videos', 'Videos') })
  }
  window.__entradas = { cuarto, camara: camara.id, guia: cartel.id, app: monitor.id }
`

/**
 * La app abierta dentro de la casa (el panel del cuarto): espera un elemento por su
 * `data-tut` y abre el anuncio de fábrica («Día 1 → Día 365») en el editor.
 */
const EN_LA_APP = `
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = document.querySelector('[data-tut="' + clave + '"]')
      if (el) return el
      await sleep(200)
    }
    return null
  }
  const porEtiqueta = (clave, es) => [...document.querySelectorAll('main button')].find((b) => b.getAttribute('aria-label') === tGlobal(clave, es))
  /** Los botones de la cabecera del editor: … Exportar, IA (el último). */
  const cabecera = () => [...(document.querySelector('[data-tut="video.editor.cabecera"]')?.querySelectorAll('button') ?? [])]
`
const ANUNCIO_EN_EL_EDITOR = (play = true) => `
  {
    const pestana = await esperarTut('video.tab.videos')
    await sleep(700)
    if (pestana) await tocar(pestana)
    await sleep(600)
    const anuncio = await esperarTut('video.lista.anuncio', 4000)
    if (anuncio) await tocar(anuncio)
    await esperarTut('video.editor.cabecera', 6000)
    await sleep(900)
    ${play ? `const play = porEtiqueta('video.preview.play', 'Reproducir')
    if (play) await tocar(play)` : ''}
  }
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
 * La cámara en tercera persona sin esperar (corre mientras el mago camina): yaw,
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

/** El mago en su sitio junto a la cámara, de cara al sur, con un gesto. */
const EN_SU_SITIO = (g) => `
  ${EN_EL_CUARTO}
  await teletransportar(rx + ${SITIO.x}, rz + ${SITIO.z} - 0.5)
  await irA(rx + ${SITIO.x}, rz + ${SITIO.z}, 0.12)
  await sleep(300)
  ${gesto(g)}
`
/** Una toma que se narra con el mago quieto y la cámara girando a su alrededor. */
const conGiro = (yaw, dist, pitch) => (dur) => `
  ${VOZ}
  ${girar(yaw[0], yaw[1], `${Math.round(dur * 1000) + 600}`, dist[0], dist[1], pitch[0], pitch[1])}
  ${hastaFinVoz(dur)}
`
/**
 * Una toma en la que el mago va al monitor del escritorio, lo toca y la app se abre
 * (el anuncio en el editor); `luego` = lo que hace en la app. Con `hablaDespues`, la voz
 * arranca cuando la app ya muestra lo que dice (si no, desde el principio de la toma).
 */
const alMonitor = (luego, hablaDespues = false) => (dur) => `
  ${MUNDO}
  const e = window.__entradas
  const [mx, mz] = await mundo(e.app)
  ${hablaDespues ? '' : VOZ}
  ${girar(-0.5, -0.15, 2400, 3.0, 2.5, 0.44, 0.5)}
  await irA(mx - 0.75, mz + 0.15, 0.25)
  await sleep(300)
  useInteractUi.getState().selectEnlace(e.app)
  await sleep(400)
  sinPaneles()
  await sleep(500)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    ${luego}
  }
  ${hablaDespues ? `await sleep(400)
  ${VOZ}` : ''}
  ${hastaFinVoz(dur + 1.5)}
`
/** El mago al suroeste del escritorio, a `lejos` del monitor (más cerca: llega antes y toca antes). */
const PREPARAR_MONITOR = (lejos = 1.7) => `
  ${MUNDO}
  ${gesto(null)}
  const [mx, mz] = await mundo(window.__entradas.app)
  await teletransportar(mx - ${lejos}, mz + 0.5)
  // Desde el suroeste: se le ve de lado camino al escritorio.
  useCam.setState({ vista: 'tercera', yaw: -0.5, dist3p: 3.0, pitch: 0.44 })
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El cartel de claqueta del muro norte en la vista iso; el mago camina hasta él y lo toca.
    preparar: `
      ${MUNDO}
      ${gesto(null)}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx - 0.6, bz + 1.9)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx - 0.2, y + 1.0, bz + 1.2], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx, y + 1.3, bz + 0.5], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx - 0.1, bz + 0.85, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al cartel: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «frente a mi cámara… encuadre, luz y sonido»: señalando la cámara del tripié, desde el sureste.
    nombre: 'camara',
    voz: 'video.camara',
    preparar: `
      ${EN_SU_SITIO('senala')}
      useCam.setState({ vista: 'tercera', yaw: 0.55, dist3p: 3.0, pitch: 0.4 })
    `,
    accion: conGiro([0.55, 0.2], [3.0, 2.6], [0.4, 0.36]),
  },
  {
    // Parte 2, «el estudio cabe en el bolsillo»: en medio del cuarto, la cámara lo rodea.
    nombre: 'celular',
    voz: 'historia.celular',
    preparar: `
      ${EN_EL_CUARTO}
      await teletransportar(rx - 0.4, rz + 0.1)
      await irA(rx - 0.4, rz + 0.7, 0.12)
      await sleep(300)
      useCam.setState({ vista: 'tercera', yaw: -0.4, dist3p: 3.2, pitch: 0.38 })
      ${gesto('explica')}
    `,
    accion: conGiro([-0.4, 0.4], [3.2, 2.7], [0.38, 0.34]),
  },
  {
    // Parte 3, «mi cámara va en tripié»: al oeste del tripié, de cara a él (al este), señalándolo; la
    // cámara, desde el sur y baja, casi a la altura de los ojos: el mago de perfil y el tripié a su lado.
    nombre: 'tripie',
    voz: 'encuadre.tripie',
    preparar: `
      ${EN_EL_CUARTO}
      ${gesto(null)}
      await teletransportar(rx - 2.6, rz - 1.35)
      await irA(rx - 2.05, rz - 1.35, 0.12)
      await sleep(300)
      ${gesto('senala')}
      useCam.setState({ vista: 'tercera', yaw: -0.25, dist3p: 2.6, pitch: 0.24 })
    `,
    accion: conGiro([-0.25, 0.15], [2.6, 2.3], [0.24, 0.2]),
  },
  {
    // Parte 4, «esta lámpara de estudio como luz principal»: desde el sur-suroeste, con la lámpara detrás.
    nombre: 'lampara',
    voz: 'luzSonido.ventana',
    preparar: `
      ${EN_SU_SITIO('senala')}
      useCam.setState({ vista: 'tercera', yaw: -0.15, dist3p: 3.0, pitch: 0.4 })
    `,
    accion: conGiro([-0.15, 0.25], [3.0, 2.5], [0.4, 0.36]),
  },
  {
    // Parte 5, la mención: va al monitor, abre la app y el anuncio corre en el editor (clips, música, voz, textos).
    nombre: 'edicion',
    voz: 'edicion.mencion-edicion',
    preparar: PREPARAR_MONITOR(),
    accion: alMonitor(ANUNCIO_EN_EL_EDITOR(true)),
  },
  {
    // Parte 6, «aquí lo convierto en tomas: desde este menú añado clips, textos, voz y música»: abre la
    // app y el menú «Añadir y editar» ANTES de hablar (llega casi junto al monitor), y luego lo dice.
    nombre: 'guion',
    voz: 'historiaContar.escribe',
    preparar: PREPARAR_MONITOR(1.0),
    accion: alMonitor(`${ANUNCIO_EN_EL_EDITOR(false)}
      const anadir = await esperarTut('video.editor.anadir', 3000)
      if (anadir) await tocar(anadir)`, true),
  },
  {
    // Parte 7, «publica aunque no salga perfecto… grabo aquí mismo, dentro de mi casa, vuelvo al Studio
    // con la toma como clip y desde ahí la publico»: de frente; abre la app, «Grabar dentro de la app»
    // (la app se cierra y graba la casa con él delante), Detener (vuelve al editor con la toma) y
    // Exportar o publicar. Los tiempos van en fracciones de la voz (sirven en cualquier idioma).
    nombre: 'publica',
    voz: 'plan.publica',
    preparar: `
      ${EN_SU_SITIO('explica')}
      useCam.setState({ vista: 'tercera', yaw: 0.15, dist3p: 2.8, pitch: 0.36 })
    `,
    accion: (dur) => `
      const e = window.__entradas
      ${VOZ}
      ${girar(0.15, -0.1, Math.round(dur * 1000), 2.8, 2.5, 0.36, 0.34)}
      const enVoz = async (q) => {
        const fin = window.__marcas.voz + q * ${Math.round(dur * 1000)}
        while (performance.now() < fin) await sleep(50)
      }
      await enVoz(0.1)
      useInteractUi.getState().selectEnlace(e.app)
      await sleep(300)
      sinPaneles()
      await sleep(300)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      {
        ${EN_LA_APP}
        ${ANUNCIO_EN_EL_EDITOR(false)}
        await enVoz(0.25)
        const grabar = cabecera().find((b) => b.innerText.includes(tGlobal('video.grabar.boton', 'Grabar dentro de la app')))
        if (grabar) await tocar(grabar)
        // La app se cierra y la casa se graba: el mago otra vez de frente, explicando.
        await sleep(500)
        window.__soltarCam = true
        useCam.setState({ vista: 'tercera', yaw: 0.05, dist3p: 2.6, pitch: 0.34 })
        ${gesto('explica')}
        // Detener solo cuando ya graba (tras la cuenta de 3 s; antes, cancelaría la toma), con al menos 1,5 s de toma.
        const { useGrabacionPantalla } = await modulo('/src/core/grabacionPantalla.ts')
        for (let i = 0; i < 60 && useGrabacionPantalla.getState().estado !== 'grabando'; i++) await sleep(150)
        await sleep(1500)
        await enVoz(0.66)
        const detener = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(tGlobal('video.grabar.detener', 'Detener')))
        if (detener) await tocar(detener)
        // Vuelve al editor con la toma como clip; y a publicar.
        await esperarTut('video.editor.cabecera', 9000)
        await enVoz(0.86)
        const exportar = cabecera().at(-2)
        if (exportar) await tocar(exportar)
      }
      ${hastaFinVoz(dur + 1.5)}
    `,
  },
]

/** La salida: de vuelta en su sitio, explicando (la cámara llega a él y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el mago abre la app por la entrada principal (la cámara) y pone el anuncio en el editor. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    ${ANUNCIO_EN_EL_EDITOR(true)}
  }
  // Que se vea el anuncio andando antes de terminar.
  await sleep(3200)
`

/** El plano iso del gancho: corrido desde el mago (en (−0,75, −0,35) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: 0.75, dz: 0.35, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Hoy una IA genera un video entero»: desde el este, con la lámpara y la cámara detrás; señala.
  { yaw: [0.85, 1.1], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «Y aun así, cada minuto se suben cientos de horas»: desde el oeste, la cámara del tripié delante.
  { yaw: [-0.7, -0.45], dist: [2.8, 2.5], pitch: [0.44, 0.4] },
  // «¿Entonces por qué vale la pena…?»: la vista del juego.
  { iso: true, antes: gesto('explica') },
  // La promesa: de frente, más cerca.
  { yaw: [0.3, -0.1], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando alrededor del mago (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * de magia al señalar la cámara y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'magia.mp3'), en: cortes[0] + 0.2, volumen: 0.28 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras el mago dice «editar tus tomas…, ponerles
 * voz…, animar escenas en 3D… y publicarlos directo», la toma pasa por cada cosa justo al
 * nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['editar', 'voz', 'animar', 'publicar'],
  textos: '{}',
  ayudas: `
    /** Un botón por su etiqueta accesible (los de icono no tienen texto). */
    const porEtiqueta = (texto) => [...document.querySelectorAll('main button')].find((b) => b.getAttribute('aria-label') === texto)
    /** Los botones de la cabecera del editor: … Exportar, IA (el último). */
    const cabecera = () => [...(document.querySelector('[data-tut="video.editor.cabecera"]')?.querySelectorAll('button') ?? [])]
    /** Espera un elemento por su data-tut. */
    const esperarTut = async (clave, ms = 6000) => {
      for (let i = 0; i < ms / 150; i++) {
        const el = tut(clave)
        if (el) return el
        await dormir(150)
      }
      return null
    }
  `,
  /** La app en Videos, con la lista a la vista (el anuncio de fábrica arriba). */
  preparar: `
    await dormir(800)
    tut('video.editor.volver')?.click()
    await dormir(500)
    tut('video.tab.videos')?.click()
    // El anuncio se siembra al abrir la app en cada idioma: puede tardar unos segundos.
    if (!(await esperarTut('video.lista.anuncio', 12000))) return 'no encontré el anuncio de fábrica en Videos'
    main().scrollTop = 0
  `,
  /**
   * `T` = segundo del cierre en que se dice cada ancla, y `fin`. Editar: el anuncio en el
   * editor, corriendo; voz: el menú «Añadir y editar» (narración, música, texto…); animar:
   * la pestaña Animación 3D; publicar: el anuncio y el menú «Exportar o publicar» con las redes.
   */
  accion: (T) => `
    await hasta(t0, ${T.editar} - 0.5)
    await tocar(tut('video.lista.anuncio'))
    await esperarTut('video.editor.cabecera')
    await dormir(500)
    await tocar(porEtiqueta(tGlobal('video.preview.play', 'Reproducir')))
    await hasta(t0, ${T.voz} - 0.6)
    await tocar(tut('video.editor.anadir'))
    await hasta(t0, ${T.animar} - 0.8)
    // Cierra «Añadir y editar» con su ✕ (Escape, aquí, abre el aviso de salir de la demo).
    ;[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === tGlobal('rutinas.cerrar', 'Cerrar'))?.click()
    await dormir(300)
    await tocar(tut('video.editor.volver'))
    await dormir(400)
    await tocar(await esperarTut('video.tab.animacion3d'))
    await hasta(t0, ${T.publicar} - 1.0)
    await tocar(tut('video.tab.videos'))
    await dormir(400)
    await tocar(await esperarTut('video.lista.anuncio'))
    await esperarTut('video.editor.cabecera')
    await dormir(500)
    await tocar(cabecera().at(-2))
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al mago (miniaturas.mjs). */
export const MINIATURA = { objeto: '🎬' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «se suben cientos de horas»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
