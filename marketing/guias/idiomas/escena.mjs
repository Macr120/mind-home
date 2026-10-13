// Lo propio de la guía de Idiomas en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el mago, en el cuarto de Idiomas) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Esta guía no la narra Pep@: el avatar toma la forma del mago (FORMA), el
// asistente de fábrica de la app. El cuarto de Idiomas está en el PISO 1 (casa
// apilada). Sus entradas vienen FIJAS en la casa de la demo (public/demo/casa.json,
// DEMO_VERSION 49): la planta (abre la app), la pizarra blanca del muro oeste con
// la pregunta y los saludos (abre la guía web) y la caja de tarjetas de la mesa
// de centro (abre el Repaso). Además hay cinco tomas a mitad de las partes.
import path from 'node:path'

/** El narrador: el avatar con la forma integrada del mago (casa.mjs le quita la ropa). */
export const FORMA = 'mago'
/** Sin uso con FORMA (casa.mjs lo pide si no la hay). */
export const ATUENDO = 'academico'

/** El narrador en su piso y `window.__idiomas` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const planta = useDiseño.getState().objetos.find((x) => x.tipo === 'planta-regar' && x.plantillaId === 'idiomas')
  if (!planta) return 'SIN planta en el cuarto de Idiomas de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[planta.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(planta.roomId)
  window.__idiomas = { cuarto: planta.roomId, rx, rz, planta: planta.id }
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
        const [z, x] = g === 'explica' ? [0.4 + 0.25 * Math.sin(t * 2.1), -0.5 + 0.25 * Math.sin(t * 1.3)] : g === 'senala' ? [1.4 + 0.05 * Math.sin(t * 2.6), -0.45] : [0, 0]
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

/** En su sitio, al centro-oeste del cuarto: llega caminando hacia el sur (de cara a la cámara), explicando. */
export const PEP_EN_SU_SITIO = `
  ${EN_EL_CUARTO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx - 1.35, z: rz + 0.6 }
  await teletransportar(SITIO.x, SITIO.z - 0.9)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre la planta: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + planta.x, rz + planta.z]
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

/** Las entradas fijas del cuarto (vienen en la casa de la demo): sus ids en `window.__entradas`. */
export const ENTRADAS = () => `
  ${EN_EL_CUARTO}
  const objs = useDiseño.getState().objetos.filter((x) => x.roomId === planta.roomId)
  const guia = objs.find((x) => x.enlaceUrl?.includes('/guias/idiomas'))
  const app = objs.find((x) => x.enlaceApp?.plantillaId === 'idiomas')
  const globo = objs.find((x) => x.tipo === 'globo-terraqueo')
  if (!guia || !app || !globo) return 'faltan las entradas fijas del cuarto de Idiomas: ¿la demo es anterior a DEMO_VERSION 49? (abrirDemo con rehacer)'
  window.__entradas = { cuarto: planta.roomId, planta: planta.id, guia: guia.id, app: app.id, globo: globo.id }
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

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 * `accion(dur)` recibe lo que dura la voz; apunta `__marcas.voz` y `__marcas.toque`.
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // Plano nuevo tras el corte: la pizarra (parte norte del muro oeste) en la vista iso; el
    // mago entra caminando desde el centro del cuarto hasta su lado sur (al norte está la esquina).
    preparar: `
      ${MUNDO}
      ${gesto(null)}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 2.4, bz + 1.05)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 1.0, y + 1.0, bz + 0.4], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.4, y + 1.3, bz + 0.4], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx + 0.75, bz + 1.05, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca a la pizarra: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «lo lejos que está del tuyo»: junto al globo terráqueo, explicando; la cámara los rodea.
    nombre: 'distancia',
    voz: 'saber.distancia',
    preparar: `
      ${MUNDO}
      const [gx, gz] = await mundo(window.__entradas.globo)
      // Al suroeste de la mesa del globo, de cara al oeste (avanza un paso para girarse): la cámara,
      // desde el oeste, queda dentro del cuarto (desde el sur la tapaba el muro) y el globo a su lado.
      await teletransportar(gx - 0.55, gz + 0.75)
      await irA(gx - 1.05, gz + 0.75, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: -1.15, dist3p: 3.2, pitch: 0.36 })
      ${gesto('explica')}
    `,
    accion: (dur) => `
      ${VOZ}
      ${girar(-1.15, -1.6, Math.round(dur * 1000) + 600, 3.2, 2.8, 0.36, 0.32)}
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 3, «tratar de recordar es lo que fija»: junto a la caja de tarjetas, señalándola; desde arriba.
    nombre: 'recuperar',
    voz: 'cerebro.recuperar',
    preparar: `
      ${MUNDO}
      const [ax, az] = await mundo(window.__entradas.app)
      // Al sur de la caja, de cara al oeste; la cámara desde el oeste y alta (la caja y el globo, delante).
      await teletransportar(ax - 0.25, az + 0.65)
      await irA(ax - 0.75, az + 0.65, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: -0.95, dist3p: 2.6, pitch: 0.62 })
      ${gesto('senala')}
    `,
    accion: (dur) => `
      ${VOZ}
      ${girar(-0.95, -1.4, Math.round(dur * 1000) + 600, 2.6, 2.3, 0.62, 0.5)}
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 4, la mención: va a la caja de tarjetas de la mesa y la abre (la app, en el Repaso).
    nombre: 'plan',
    voz: 'palabras.mencion-plan',
    preparar: `
      ${MUNDO}
      ${gesto(null)}
      const [ax, az] = await mundo(window.__entradas.app)
      await teletransportar(ax - 1.6, az + 0.7)
      // Desde el noroeste (desde el sur la tapaba el muro): se le ve de lado camino a la caja.
      useCam.setState({ vista: 'tercera', yaw: -2.0, dist3p: 2.9, pitch: 0.44 })
    `,
    accion: (dur) => `
      ${MUNDO}
      const e = window.__entradas
      const [ax, az] = await mundo(e.app)
      ${VOZ}
      ${girar(-2.0, -1.6, 2400, 2.9, 2.4, 0.44, 0.5)}
      await irA(ax - 0.55, az + 0.6, 0.25)
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
    // Parte 5, «abre la boca todos los días»: al sur de la pizarra de los saludos, señalándola.
    nombre: 'diario',
    voz: 'hablar.diario',
    preparar: `
      ${MUNDO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      // De cara al este (avanza un paso para girarse): la pizarra le queda detrás y a un lado; la cámara, desde el este.
      await teletransportar(bx + 0.05, bz + 1.15)
      await irA(bx + 0.55, bz + 1.15, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: 1.05, dist3p: 3.2, pitch: 0.3 })
      ${gesto('senala')}
    `,
    accion: (dur) => `
      ${VOZ}
      ${girar(1.05, 1.4, Math.round(dur * 1000) + 600, 3.2, 2.8, 0.3, 0.26)}
      ${hastaFinVoz(dur)}
    `,
  },
  {
    // Parte 6, «piénsalo como esta planta»: junto a la planta, de cara a la cámara; luego la abre (la app).
    nombre: 'riega',
    voz: 'plan.riega',
    preparar: `
      ${MUNDO}
      const [px, pz] = await mundo(window.__entradas.planta)
      await teletransportar(px + 0.75, pz - 0.1)
      await irA(px + 0.75, pz + 0.6, 0.15)
      await sleep(400)
      useCam.setState({ vista: 'tercera', yaw: -0.4, dist3p: 3.0, pitch: 0.4 })
      ${gesto('explica')}
    `,
    accion: (dur) => `
      const e = window.__entradas
      ${VOZ}
      ${girar(-0.4, 0.05, Math.round(dur * 1000) + 600, 3.0, 2.6, 0.4, 0.36)}
      await sleep(${Math.max(1500, Math.round(dur * 1000) - 3200)})
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

/** La salida: de vuelta en su sitio, explicando (la cámara llega a él y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el mago abre la app por la entrada principal (la planta). */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  // Que se vea la app ya cargada antes de terminar.
  await sleep(4200)
`

/** El plano iso del gancho: corrido desde el mago (en (−1,35, 0,6) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: 1.35, dz: -0.6, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Casi todos estudiamos uno en la escuela»: desde el este, con la pizarra de los saludos detrás; señala.
  { yaw: [0.7, 0.95], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  { yaw: [-0.45, -0.25], dist: [2.6, 2.3], pitch: [0.72, 0.64], antes: gesto('explica') }, // desde arriba
  // «¿Realmente cómo se aprende un idioma?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.3, -0.1], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando alrededor del mago (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * de magia al señalar la pizarra y una subida al alejarse.
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
 * La app 2D en el recuadro del cierre: mientras el mago dice «charlas con un
 * tutor…, un temario por niveles… y un repaso espaciado», la toma pasa por cada
 * pestaña justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['charlas', 'temario', 'repaso'],
  textos: '{}',
  ayudas: `
    /** Toca un botón de pestaña de la app por su texto en el idioma activo. */
    const pestana = async (clave, es) => {
      const b = boton(tGlobal(clave, es))
      if (b) await tocar(b)
    }
  `,
  /** La app en Charlas, arriba del todo. */
  preparar: `
    await dormir(800)
    await pestana('idiomas.tab.charlas', 'Charlas')
    await dormir(600)
    main().scrollTop = 0
  `,
  /** `T` = segundo del cierre en que se dice cada ancla, y `fin`. */
  accion: (T) => `
    await hasta(t0, ${T.charlas} - 0.4)
    await pestana('idiomas.tab.charlas', 'Charlas')
    await hasta(t0, ${T.temario} - 0.4)
    await pestana('idiomas.tab.temario', 'Temario')
    await hasta(t0, ${T.repaso} - 0.4)
    await pestana('idiomas.tab.repaso', 'Repaso')
    await hasta(t0, ${T.repaso} + 2)
    await bajarHasta(main(), main().scrollTop, t0 + ${T.fin + 0.6} * 1000)
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al mago (miniaturas.mjs). */
export const MINIATURA = { objeto: '🌍' }

/** El «fah» del gancho, tras la frase que incomoda (la de la Unión Europea, la tercera): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
