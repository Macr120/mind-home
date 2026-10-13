// Lo propio de la guía de Finanzas en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está Pep@ en la casa (de oficinista, en el despacho) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// El despacho está en la planta baja (casa explotada). Sus tres entradas vienen
// FIJAS en la casa de la demo (public/demo/casa.json, DEMO_VERSION 45): la caja
// fuerte (abre la app), el pizarrón con la pregunta (abre la guía web) y la
// alcancía del escritorio (abre el ahorro). Además hay cinco tomas a mitad de
// las partes (TOMAS_EXTRA con `voz`), para que el video vuelva a la casa seguido.
import path from 'node:path'

/** Atuendo de Pep@ en la casa (ATUENDOS_PRESET). */
export const ATUENDO = 'oficinista'

/** Pep@ en la planta baja y `window.__despacho` con el origen del cuarto en el mundo. */
const EN_EL_DESPACHO = `
  const caja = useDiseño.getState().objetos.find((x) => x.tipo === 'caja-fuerte' && x.plantillaId === 'despacho')
  if (!caja) return 'SIN caja fuerte en el despacho de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[caja.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(caja.roomId)
  window.__despacho = { cuarto: caja.roomId, rx, rz, caja: caja.id }
`

/**
 * El estado de «usar un objeto» que usa la app de verdad: `modulo()` cae a veces en
 * otra copia del módulo; se toma la URL exacta del registro de recursos (como en Descanso).
 */
const MODULO_ACCION = `(await import(performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes('/src/core/state/accionCuartoStore.ts'))))`
const ACCION = `${MODULO_ACCION}.useAccionCuarto`
const HERRAMIENTA = `(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta`

/** Suelta el gesto prestado (para caminar o sentarse). */
const SOLTAR_GESTO = `;${HERRAMIENTA}.getState().setEmote(null)`

/** Si está sentado, se levanta (salida ordenada: forzarla desde fuera deja la pose). */
const DE_PIE = `
  {
    const ac = ${ACCION}
    ac.getState().pedirSalir()
    for (let i = 0; i < 40 && ac.getState().instanciaId != null; i++) {
      window.__r3f().invalidate()
      await sleep(25)
    }
  }
`

/**
 * Pep@ se sienta a la laptop a escribir (la acción de la app). Sin esperar: corre
 * junto con la cámara. Con el gesto prestado puesto no se sienta, y desde lejos
 * no llega (camina en línea recta y se atora): se suelta el gesto y, en el corte,
 * se le pone junto a la silla.
 */
const SENTARSE = `
  void (async () => {
    ${SOLTAR_GESTO}
    const o = useDiseño.getState().objetos.find((x) => x.id === window.__entradas.laptop)
    const d = window.__despacho
    await teletransportar(d.rx + o.x + 0.55, d.rz + o.z + 1.05)
    // La silla se anuncia «cerca» desde el bucle de cuadros (así la laptop toma su altura y no se hunde en ella).
    const m = ${MODULO_ACCION}
    for (let i = 0; i < 40 && m.useAccionCuarto.getState().cercaGrupo !== 'asiento'; i++) {
      window.__r3f().invalidate()
      await sleep(50)
    }
    ;${ACCION}.getState().usar(o.id, d.rx + o.x, d.rz + o.z, ((o.rotY ?? 0) * Math.PI) / 180, 'laptop')
  })()
`

/** De pie otra vez en su sitio, explicando (el patrón prestado ya está puesto). */
const LEVANTARSE = `
  void (async () => {
    ${DE_PIE}
    const d = window.__despacho
    // Aparece un paso atrás y avanza hacia el frente: así queda de cara a la cámara (no de espaldas).
    await teletransportar(d.rx + 1.4, d.rz - 0.6)
    useHouse.getState().setTarget(d.rx + 1.4, d.rz + 0.0)
    await sleep(700)
    ;${HERRAMIENTA}.getState().setEmote('electroShuffle')
  })()
`

/** Los dos gestos que Pep@ hace en la casa con el hueco de un baile: explicar y señalar (a su izquierda). */
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
 * Pep@ de pie frente al escritorio, explicando: quieto, solo mueve los brazos.
 * Llega caminando hacia el frente del cuarto (así queda de cara a la cámara).
 */
export const PEP_EN_SU_SITIO = `
  ${DE_PIE}
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_DESPACHO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  // Con holgura de la silla (a 1 m chocaba con ella en el primer plano).
  const SITIO = { x: rx + 1.4, z: rz + 0.0 }
  await teletransportar(SITIO.x, SITIO.z - 0.9)
  useHouse.getState().setTarget(SITIO.x, SITIO.z)
  for (let i = 0; i < 40 && Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.12; i++) await sleep(250)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre la caja fuerte: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + caja.x, rz + caja.z]
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
  ${GESTOS}
  const { useHerramienta } = await modulo('/src/core/state/herramientaStore.ts')
  // El módulo de los bailes es perezoso y lo carga la app con SU URL: primero se le
  // hace cargar, luego se cambia el patrón en TODAS las instancias y se pone el gesto.
  useHerramienta.getState().setEmote('electroShuffle')
  await sleep(1200)
  useHerramienta.getState().setEmote(null)
  const urls = [...new Set(performance.getEntriesByType('resource').map((x) => x.name).filter((n) => n.includes('/src/core/house/emotesPatrones.ts')))]
  if (!urls.length) return 'no encontré el módulo de los emotes que carga la app'
  for (const url of urls) (await import(url)).PATRONES_EMOTE.electroShuffle = window.__gestos.explica
  await sleep(300)
  useHerramienta.getState().setEmote('electroShuffle')
  await sleep(800)
`

/** Las entradas fijas del despacho (vienen en la casa de la demo): sus ids en `window.__entradas`. */
export const ENTRADAS = () => `
  ${EN_EL_DESPACHO}
  const objs = useDiseño.getState().objetos.filter((x) => x.roomId === caja.roomId)
  const guia = objs.find((x) => x.enlaceUrl?.includes('/guias/finanzas'))
  const app = objs.find((x) => x.enlaceApp?.plantillaId === 'despacho')
  const laptop = objs.find((x) => x.tipo === 'laptop')
  if (!guia || !app || !laptop) return 'faltan las entradas fijas del despacho: ¿la demo es anterior a DEMO_VERSION 45? (abrirDemo con rehacer)'
  window.__entradas = { cuarto: caja.roomId, caja: caja.id, guia: guia.id, app: app.id, laptop: laptop.id }
  // El monitor del escritorio con un tablero de finanzas (sin textos: vale en todos los idiomas).
  const monitor = objs.find((x) => x.parte === 'laptop#monitor')
  if (monitor && !window.__monitorListo) {
    const cv = document.createElement('canvas')
    cv.width = 1280
    cv.height = 720
    const g = cv.getContext('2d')
    g.fillStyle = '#0f172a'
    g.fillRect(0, 0, 1280, 720)
    const panel = (x, y, w, h) => { g.fillStyle = '#1e293b'; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill() }
    // Patrimonio que crece (curva verde con su área).
    panel(40, 40, 760, 400)
    const pts = Array.from({ length: 13 }, (_, i) => [80 + i * 56, 380 - (i * i * 1.55 + i * 6 + Math.sin(i * 1.7) * 14)])
    g.beginPath(); g.moveTo(pts[0][0], 400); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(pts[12][0], 400); g.closePath()
    g.fillStyle = 'rgba(34,197,94,0.22)'; g.fill()
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.strokeStyle = '#22c55e'; g.lineWidth = 9; g.lineJoin = 'round'; g.stroke()
    // Ingresos y gastos por mes (barras verdes y rojas).
    panel(840, 40, 400, 400)
    for (let i = 0; i < 5; i++) {
      const ing = 230 + (i % 2) * 20 + i * 8, gas = 160 + ((i * 37) % 60)
      g.fillStyle = '#22c55e'; g.fillRect(880 + i * 72, 400 - ing, 26, ing)
      g.fillStyle = '#ef4444'; g.fillRect(908 + i * 72, 400 - gas, 26, gas)
    }
    // El reparto 50/30/20 (dona) y tres metas con su barra de avance.
    panel(40, 470, 400, 210)
    const dona = [[0.5, '#60a5fa'], [0.3, '#f59e0b'], [0.2, '#22c55e']]
    let a0 = -Math.PI / 2
    for (const [f, c] of dona) { g.beginPath(); g.arc(240, 575, 80, a0, a0 + f * 2 * Math.PI); g.strokeStyle = c; g.lineWidth = 34; g.stroke(); a0 += f * 2 * Math.PI }
    panel(470, 470, 770, 210)
    ;[[0.72, '#22c55e'], [0.45, '#60a5fa'], [0.88, '#c07dfe']].forEach(([f, c], i) => {
      g.fillStyle = '#334155'; g.beginPath(); g.roundRect(510, 510 + i * 55, 690, 26, 13); g.fill()
      g.fillStyle = c; g.beginPath(); g.roundRect(510, 510 + i * 55, 690 * f, 26, 13); g.fill()
    })
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'))
    await useDiseño.getState().setObjetoFoto(monitor.id, blob)
    window.__monitorListo = true
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

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 * `accion(dur)` recibe lo que dura la voz; apunta `__marcas.voz` y `__marcas.toque`.
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // Plano nuevo tras el corte: el pizarrón (muro oeste) en la vista iso; Pep@ entra
    // caminando en línea recta desde el centro del cuarto hasta su lado norte.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 2.4, bz - 1.05)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 1.0, y + 1.0, bz - 0.4], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    // Toda en la vista iso, sin cortes (un corte de tercera persona a iso se ve como un barrido).
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      // A un lado del pizarrón, el del norte (no lo tapa), mientras la cámara se acomoda.
      void moverCam(camAhora(), { focus: [bx + 0.4, y + 1.3, bz - 0.4], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx + 0.75, bz - 1.05, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al pizarrón: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «ganar más no basta»: junto a la caja fuerte, explicando; la cámara la rodea.
    nombre: 'ganar',
    voz: 'dinero.ganar',
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [cx, cz] = await mundo(window.__entradas.caja)
      // Delante de la silla (detrás, la silla lo tapaba), con la caja fuerte a su lado; aparece
      // un paso atrás y avanza hacia el frente para quedar de cara a la cámara.
      await teletransportar(cx + 1.2, cz + 1.6)
      await irA(cx + 1.25, cz + 2.4, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: 0.75, dist3p: 3.4, pitch: 0.4 })
      ${gesto('explica')}
    `,
    accion: (dur) => `
      ${VOZ}
      ${girar(0.75, 0.15, Math.round(dur * 1000) + 600, 3.4, 2.9, 0.4, 0.36)}
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 3, «apunta todo lo que gastas»: sentado a la laptop, escribiendo; por encima del hombro.
    nombre: 'registra',
    voz: 'presupuesto.registra',
    preparar: `
      ${MUNDO}
      const [lx, lz] = await mundo(window.__entradas.laptop)
      await teletransportar(lx + 0.6, lz + 1.3)
      ${SENTARSE}
      await sleep(2500)
      useCam.setState({ vista: 'tercera', yaw: 0.95, dist3p: 2.6, pitch: 0.48 })
    `,
    accion: (dur) => `
      ${VOZ}
      ${girar(0.95, 0.35, Math.round(dur * 1000) + 600, 2.6, 2.1, 0.48, 0.42)}
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 4, la mención: va a la alcancía del escritorio y la abre (la app, en el ahorro).
    nombre: 'plan',
    voz: 'deudas.mencion-plan',
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [ax, az] = await mundo(window.__entradas.app)
      await teletransportar(ax - 0.4, az + 2.2)
      useCam.setState({ vista: 'tercera', yaw: -0.35, dist3p: 3.0, pitch: 0.42 })
    `,
    accion: (dur) => `
      ${MUNDO}
      const e = window.__entradas
      const [ax, az] = await mundo(e.app)
      ${VOZ}
      ${girar(-0.35, -0.75, 2400, 3.0, 2.4, 0.42, 0.5)}
      // Hasta el lado izquierdo del escritorio (la silla está al centro).
      await irA(ax - 0.45, az + 0.75, 0.25)
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
    // Parte 5, la regla del 72: junto al pizarrón, señalándolo.
    nombre: 'regla72',
    voz: 'invertir.regla72',
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      // Al sur del pizarrón, de cara al este (avanza un paso para girarse): el pizarrón le queda
      // a la izquierda, que es donde señala, y la cámara lo ve desde el este.
      await teletransportar(bx + 0.05, bz + 1.15)
      await irA(bx + 0.55, bz + 1.15, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: 1.05, dist3p: 3.2, pitch: 0.3 })
      ${gesto('senala')}
    `,
    accion: (dur) => `
      ${VOZ}
      ${girar(1.05, 1.35, Math.round(dur * 1000) + 600, 3.2, 2.8, 0.3, 0.26)}
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 6, «revisa una vez al mes»: junto a la caja fuerte, de cara a la cámara, la abre
    // y se ve el balance del mes en la app (caminando hacia ella quedaba de espaldas).
    nombre: 'revisa',
    voz: 'plan.revisa',
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [cx, cz] = await mundo(window.__entradas.caja)
      await teletransportar(cx + 1.2, cz + 0.6)
      // Con irA (pide cuadros mientras camina): sin nada moviéndose, setTarget solo no lo hace andar.
      await irA(cx + 1.2, cz + 1.4, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: 0.35, dist3p: 3.0, pitch: 0.4 })
      ${gesto('explica')}
    `,
    accion: (dur) => `
      const e = window.__entradas
      ${VOZ}
      ${girar(0.35, 0.05, 2200, 3.0, 2.7, 0.4, 0.38)}
      await sleep(2200)
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

/** La salida empieza con Pep@ sentado a la laptop: la cámara llega a él, gira y él abre la app con la caja fuerte. */
export const PREPARAR_SALIDA = `
  ${SENTARSE}
  await sleep(3500)
`

/** El final de la salida: Pep@ abre la app por la entrada principal (la caja fuerte). */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  // Que se vea la app ya cargada antes de terminar.
  await sleep(4200)
`

/** El plano iso del gancho: corrido desde Pep@ (x, z del mundo; dy = altura del foco) para que el despacho quede al centro. */
// Pep@ está en (1,4, 0) del cuarto; el centro de lo que se ve (escritorio y caja), en (0,6, −1,1).
export const ISO = { zoom: 84, dx: -0.8, dz: -1.1, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Todos usamos dinero todos los días»: se sienta a la laptop; por encima del hombro.
  { yaw: [0.95, 0.7], dist: [2.6, 2.3], pitch: [0.48, 0.44], antes: SENTARSE },
  { yaw: [-0.75, -0.45], dist: [2.5, 2.2], pitch: [0.72, 0.64] }, // sentado, desde arriba
  // «¿Realmente cómo funciona el dinero?»: la vista del juego (corrida lo que hay de su sitio a la silla).
  { iso: true, dx: 1.0, dz: 0.4 },
  // La promesa: se levanta y vuelve a explicar.
  { yaw: [-0.35, 0.2], dist: [3.4, 3.0], pitch: [0.42, 0.4], antes: LEVANTARSE },
]

/** El final de la salida: tercera persona girando alrededor de Pep@ (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), unas monedas
 * al sentarse a la laptop y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'monedas.mp3'), en: cortes[0] + 0.2, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «tu flujo de dinero…,
 * tus metas de ahorro… y tu patrimonio», la toma pasa por cada cosa justo al
 * nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['flujo', 'metas', 'patrimonio'],
  textos: '{}',
  ayudas: `
    /** Toca un botón de pestaña de la app por su texto en el idioma activo. */
    const pestana = async (clave, es) => {
      const b = boton(tGlobal(clave, es))
      if (b) await tocar(b)
    }
  `,
  /** La app en Flujo → Balance, arriba del todo. */
  preparar: `
    await dormir(800)
    await pestana('despacho.tab.balance', 'Flujo')
    await dormir(400)
    await pestana('despacho.sub.balance', 'Balance')
    await dormir(600)
    main().scrollTop = 0
  `,
  /** `T` = segundo del cierre en que se dice cada ancla, y `fin`. */
  accion: (T) => `
    await hasta(t0, ${T.flujo} - 0.4)
    await pestana('despacho.tab.gastos', 'Gastos')
    await hasta(t0, ${T.flujo} + 1.6)
    await pestana('despacho.sub.balance', 'Balance')
    await hasta(t0, ${T.metas} - 0.4)
    await pestana('despacho.tab.metas', 'Metas')
    await hasta(t0, ${T.metas} + 1.8)
    await pestana('despacho.tab.financieras', 'Financieras')
    await hasta(t0, ${T.patrimonio} - 0.4)
    await pestana('despacho.tab.patrimonio', 'Patrimonio')
    await hasta(t0, ${T.patrimonio} + 2)
    await bajarHasta(main(), main().scrollTop, t0 + ${T.fin + 0.6} * 1000)
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a Pep@ (miniaturas.mjs). */
export const MINIATURA = { objeto: '💰' }

/** El «fah» del gancho, tras la frase que incomoda (la del interés compuesto, la tercera): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
