// Lo propio de la guía de Metas en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está la princesa en la casa (en el cuarto de Metas) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de la princesa),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra la PRINCESA (pedido del usuario): el cuerpo prediseñado «Princesa» de la app
// (CUERPO), sin emotes: sus brazos se mueven desde la escena (bucle sobre los pivotes de
// sus mangas). La casa va con celda de 9 m (CELDA, pedido del usuario: se ve más claro);
// los muebles del cuarto se recolocan junto a sus paredes (ENTRADAS).
//
// El cuarto de Metas está en el PISO 1 (casa apilada): la diana de metas al norte (abre
// la app), el calendario de pared a su derecha, una mesita con libreta al oeste. Sus dos
// entradas extra se arman EN VIVO (ENTRADAS, idempotente): un tablero de corcho con la
// pregunta en el muro norte, entre la diana y el calendario (abre la guía web), y el
// calendario de pared (abre el Cronograma de la app).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Princesa» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'princesa'
/** El tema de la casa en todas las tomas: Princesas (id «barbie» por compatibilidad), pedido del usuario. */
export const TEMA = 'barbie'
/** Lado de la celda del mapa en metros (casa.mjs lo aplica; las demás guías vuelven a 6). */
export const CELDA = 9
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'

/** La princesa en el piso del cuarto y `window.__metas` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const diana = useDiseño.getState().objetos.find((x) => x.tipo === 'diana-metas' && x.plantillaId === 'metas')
  if (!diana) return 'SIN diana de metas en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[diana.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(diana.roomId)
  window.__metas = { cuarto: diana.roomId, rx, rz, diana: diana.id }
`

/**
 * Los gestos de la princesa: su cuerpo de piezas no tiene emotes, pero sus mangas giran
 * desde el hombro (los pivotes de la marcha). Un bucle les suma la apertura según
 * `window.__gestoPrincesa` ('explica', 'senala' —el brazo izquierdo, a su izquierda— o
 * null = quietos); los vuelve a buscar si React remonta el avatar.
 */
const GESTOS = `
  if (!window.__buclePrincesa) {
    const hs = await modulo('/src/core/state/houseStore.ts')
    const buscar = () => {
      const r = []
      window.__r3f().scene.traverse((m) => {
        if (!m.isMesh || m.geometry.type !== 'BoxGeometry') return
        const p = m.geometry.parameters
        if (Math.abs(p.width - 0.16) > 0.001 || Math.abs(p.height - 0.5) > 0.001 || Math.abs(p.depth - 0.22) > 0.001) return
        m.updateWorldMatrix(true, false)
        const [x, , z] = m.matrixWorld.elements.slice(12, 15)
        if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 1) r.push(m.parent)
      })
      return r
    }
    let brazos = []
    let visto = 0
    window.__buclePrincesa = true
    const paso = () => {
      const ahora = performance.now()
      if (brazos.length < 2 || !brazos[0].parent || ahora - visto > 2000) {
        const b = buscar()
        if (b.length >= 2) brazos = b
        visto = ahora
      }
      const t = ahora / 1000
      const g = window.__gestoPrincesa
      for (const br of brazos) {
        // +x es su izquierda (la mano derecha del avatar va en −x).
        const izq = br.position.x > 0
        const z = g === 'explica' ? (izq ? 0.35 + 0.22 * Math.sin(t * 2.1) : 0.3 + 0.18 * Math.sin(t * 1.7 + 1))
          : g === 'senala' ? (izq ? 1.4 + 0.05 * Math.sin(t * 2.6) : 0.12)
          : 0
        const destino = izq ? z : -z
        br.rotation.z += (destino - br.rotation.z) * 0.15
      }
      window.__r3f().invalidate()
      requestAnimationFrame(paso)
    }
    paso()
  }
`
/** Pone un gesto (o ninguno); instala el bucle si la página es nueva (casa.mjs reabre la demo entre tomas). */
const gesto = (nombre) => (nombre ? `${GESTOS}
  window.__gestoPrincesa = '${nombre}'` : 'window.__gestoPrincesa = null')
/** Para caminar: brazos quietos. */
const SOLTAR_GESTO = gesto(null)

/** Su sitio: al oeste de la diana, de cara al sur (la diana le queda a la izquierda, donde señala). Con celda de 9 m. */
const SITIO = { x: -0.95, z: -2.75 }

/** La princesa de pie junto a la diana, explicando: llega caminando hacia el frente (de cara a la cámara). */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.8)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre la diana: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + diana.x, rz + diana.z]
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
  await sleep(800)
`

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de corcho de la
 * guía en el muro norte y el calendario de pared (el Cronograma de la app). Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const cuarto = diana.roomId
  // Celda de 9 m: los muebles conservan su distancia a la pared (se corren 1,5 m hacia ella).
  if (lay.useLayout.getState().tamCelda >= 9 && diana.z > -3) {
    const corre = (v) => (Math.abs(v) >= 1.2 ? v + Math.sign(v) * 1.5 : v * 1.5)
    const libreta0 = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'libreta')
    for (const o of useDiseño.getState().objetos.filter((x) => x.roomId === cuarto)) {
      // Lo que va sobre la mesita (las piezas de la libreta) se mueve con ella.
      const sobre = o.tipo === 'piezas' && libreta0 && Math.hypot(o.x - libreta0.x, o.z - libreta0.z) < 0.4
      const [nx, nz] = sobre ? [o.x + (corre(libreta0.x) - libreta0.x), o.z + (corre(libreta0.z) - libreta0.z)] : [corre(o.x), corre(o.z)]
      if (o.enlaceUrl?.includes('/guias/metas')) continue
      await ds.setObjetoPose(o.id, nx, nz, o.rotY ?? 0)
    }
  }
  // En el plano del calendario de pared (el que se ve colgado del muro norte).
  const muro = -(useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'calendario-pared')?.z ?? -2.4)
  // El corcho: marco de madera, la pregunta arriba, notas de colores con chinchetas y una meta palomeada.
  const CORCHO = { x: 1.8, z: -muro }
  let corcho = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/metas'))
  if (corcho && (corcho.tipo !== 'piezas' || Math.hypot(corcho.x - CORCHO.x, corcho.z - CORCHO.z) > 0.05 || corcho.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(corcho.id)
    corcho = undefined
  }
  if (!corcho) {
    const Y = 1.6
    const notas = [
      [-0.38, Y - 0.12, '#fde047'],
      [-0.06, Y - 0.16, '#86efac'],
      [0.26, Y - 0.1, '#93c5fd'],
      [-0.22, Y - 0.34, '#fca5a5'],
      [0.12, Y - 0.36, '#fdba74'],
    ].flatMap(([x, y, c]) => [
      { tipo: 'caja', pos: [x, y, 0.045], tam: [0.22, 0.17, 0.006], color: c },
      { tipo: 'caja', pos: [x, y + 0.07, 0.05], tam: [0.025, 0.025, 0.01], color: '#ef4444' },
    ])
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      { tipo: 'plano', pos: [0, Y + 0.28, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#7f1d1d', texto: ${JSON.stringify(titulo)} },
      ...notas,
      { tipo: 'plano', pos: [0.36, Y - 0.38, 0.042], tam: [0.3, 0.07], color: '#ef4444', tinta: '#ffffff', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, CORCHO, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    corcho = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El calendario de pared: abre el Cronograma de la app.
  const calendario = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'calendario-pared')
  if (!calendario) return 'SIN calendario de pared en el cuarto de Metas de la demo'
  if (calendario.enlaceApp?.plantillaId !== 'metas') {
    await useDiseño.getState().setObjetoEnlaceApp(calendario.id, { plantillaId: 'metas', seccion: 'cronograma', titulo: tGlobal('cal.cron.modo.cronograma', 'Cronograma') })
  }
  const libreta = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'libreta')
  window.__entradas = { cuarto, diana: diana.id, guia: corcho.id, app: calendario.id, libreta: libreta?.id }
`

/**
 * La app abierta dentro de la casa (el panel del cuarto): espera elementos por su
 * `data-tut` y toca pestañas y botones por su texto en el idioma de la demo.
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
  const pestana = async (modo) => {
    const p = await esperarTut('cal.cron.modo.' + modo)
    if (p) await tocar(p)
    await sleep(700)
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
 * La cámara en tercera persona sin esperar (corre mientras la princesa camina): yaw,
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

/** La princesa en (x, z) del cuarto, llegando un paso desde el norte (queda de cara al sur), con un gesto. */
const PARADO = (x, z, g) => `
  ${SOLTAR_GESTO}
  ${EN_EL_CUARTO}
  await teletransportar(rx + ${x}, rz + ${z} - 0.6)
  await irA(rx + ${x}, rz + ${z}, 0.12)
  await sleep(300)
  ${gesto(g)}
`
/** Una toma que se narra con la princesa quieto y la cámara girando a su alrededor. */
const conGiro = (yaw, dist, pitch) => (dur) => `
  ${VOZ}
  ${girar(yaw[0], yaw[1], `${Math.round(dur * 1000) + 600}`, dist[0], dist[1], pitch[0], pitch[1])}
  ${hastaFinVoz(dur)}
`
/**
 * la princesa va al calendario de pared, lo toca y la app se abre (en el Cronograma);
 * `luego` = lo que hace en la app mientras sigue la voz. Con `hablaDespues`, la voz
 * arranca cuando la app ya muestra lo que dice.
 */
const alCalendario = (luego, hablaDespues = false) => (dur) => `
  ${MUNDO}
  const e = window.__entradas
  const [cx, cz] = await mundo(e.app)
  ${hablaDespues ? '' : VOZ}
  ${girar(0.5, 0.2, 2400, 3.0, 2.6, 0.42, 0.46)}
  await irA(cx - 0.55, cz + 0.85, 0.25)
  await sleep(300)
  useInteractUi.getState().selectEnlace(e.app)
  await sleep(400)
  sinPaneles()
  await sleep(500)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('cal.cron.modo.metas')
    await sleep(600)
    ${luego}
  }
  ${hablaDespues ? `await sleep(300)
  ${VOZ}` : ''}
  ${hastaFinVoz(dur + 1.5)}
`
/** La princesa al suroeste del calendario, de espaldas a él (camino a tocarlo); la cámara desde el sureste. */
const PREPARAR_CALENDARIO = `
  ${MUNDO}
  ${SOLTAR_GESTO}
  const [cx, cz] = await mundo(window.__entradas.app)
  await teletransportar(cx - 1.4, cz + 1.9)
  useCam.setState({ vista: 'tercera', yaw: 0.5, dist3p: 3.0, pitch: 0.42 })
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El corcho del muro norte en la vista iso; la princesa camina hasta él y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
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
      // Y se acerca al corcho: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «en mi diana de metas, cada una tiene su lugar»: junto a la diana, señalándola; desde el sureste.
    nombre: 'diana',
    voz: 'querer.diana',
    preparar: `
      ${PARADO(SITIO.x, SITIO.z, 'senala')}
      useCam.setState({ vista: 'tercera', yaw: 0.45, dist3p: 3.0, pitch: 0.36 })
    `,
    accion: conGiro([0.45, 0.15], [3.0, 2.6], [0.36, 0.32]),
  },
  {
    // Parte 2, «así escribo yo cada meta»: junto al corcho de las notas, señalándolo; desde el sureste.
    nombre: 'escribe',
    voz: 'buena.escribe',
    preparar: `
      ${PARADO(0.95, -2.85, 'senala')}
      useCam.setState({ vista: 'tercera', yaw: 0.45, dist3p: 2.9, pitch: 0.36 })
    `,
    accion: conGiro([0.45, 0.15], [2.9, 2.5], [0.36, 0.32]),
  },
  {
    // Parte 3, la mención del plan con IA: toca el calendario, abre una meta y su «Planear con IA»
    // (horas por semana, días…) y luego el Cronograma con las fases.
    nombre: 'plan',
    voz: 'pasos.mencion-plan',
    preparar: PREPARAR_CALENDARIO,
    accion: alCalendario(`
      await pestana('metas')
      const fila = document.querySelector('[data-tut="cal.metas.fila.aceptado"] button, [data-tut="cal.metas.fila"] button')
      if (fila) await tocar(fila)
      await sleep(900)
      const ia = [...document.querySelectorAll('button')].find((b) => b.title === tGlobal('cal.plan.ia', 'Planear con IA'))
      if (ia) await tocar(ia)
      await sleep(4200)
      const volver = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(tGlobal('cal.meta.volverMetas', 'Volver a las metas')))
      if (volver) await tocar(volver)
      await sleep(500)
      await pestana('cronograma')
    `),
  },
  {
    // Parte 4, «mi calendario está a la vista»: junto al calendario, señalándolo; desde el sur.
    nombre: 'calendario',
    voz: 'ganas.racha',
    preparar: `
      ${PARADO(2.85, -2.85, 'senala')}
      useCam.setState({ vista: 'tercera', yaw: -0.2, dist3p: 3.0, pitch: 0.36 })
    `,
    accion: conGiro([-0.2, 0.2], [3.0, 2.6], [0.36, 0.32]),
  },
  {
    // Parte 5, «MindHaOS es una casa: cada cuarto es un área de tu vida»: la casa entera desde
    // arriba y, al decir «desde aquí veo las metas de todos los cuartos», abre la app en Metas.
    nombre: 'casaMental',
    voz: 'casa.mencion-casa',
    // La casa de la demo tal cual, sin el tema de princesa (pedido del usuario).
    tema: null,
    preparar: `
      ${PARADO(SITIO.x, SITIO.z, 'explica')}
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      const m = window.__metas
      useCam.setState({ vista: 'iso' })
      await cortarCam({ focus: [m.rx, y + 0.5, m.rz], zoom: 120, az: ISO_AZ, el: ISO_EL })
    `,
    accion: (dur) => `
      ${VOZ}
      const m = window.__metas
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      // Se aleja hasta ver la casa entera: cada cuarto, un área de la vida.
      await moverCam(camAhora(), { focus: [m.rx + 6, y - 1.5, m.rz + 8], zoom: 38, az: ISO_AZ, el: ISO_EL }, Math.round(${dur} * 450), ease)
      await sleep(300)
      useInteractUi.getState().selectMueble(window.__entradas.cuarto)
      await sleep(400)
      sinPaneles()
      await sleep(400)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      {
        ${EN_LA_APP}
        await pestana('metas')
      }
      ${hastaFinVoz(dur + 1.2)}
    `,
  },
  {
    // Parte 6, «cada plan tiene sus fases…, al palomearlas veo cómo avanza»: Planes → un plan en marcha,
    // con sus fases palomeadas y su barra de avance.
    nombre: 'misiones',
    voz: 'medir.misiones',
    preparar: PREPARAR_CALENDARIO,
    accion: alCalendario(`
      await pestana('planes')
      const plan = await esperarTut('cal.plan.tarjeta.aceptado', 4000)
      if (plan) await tocar(plan)
    `),
  },
  {
    // Parte 7, «aquí ajusto el plan, no la meta: muevo las fechas en el cronograma»: el Cronograma
    // abierto ANTES de hablar, con «Ajustar» para que se acomoden las barras.
    nombre: 'ajustar',
    voz: 'fallar.ajustar',
    preparar: PREPARAR_CALENDARIO.replace('cx - 1.4, cz + 1.9', 'cx - 0.95, cz + 1.3'),
    accion: alCalendario(`
      await pestana('cronograma')
      const ajustar = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === tGlobal('cal.cron.ajustar', 'Ajustar'))
      if (ajustar) await tocar(ajustar)
    `, true),
  },
]

/** La salida: de vuelta en su sitio, explicando (la cámara llega a él y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: la princesa abre la app por la entrada principal (la diana) y pasa al Cronograma. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('cal.cron.modo.metas')
    await sleep(1600)
    await pestana('cronograma')
  }
  // Que se vea el cronograma antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde la princesa (en (−0,95, −2,75) del cuarto, celda de 9 m) para que el cuarto quede al centro. */
export const ISO = { zoom: 62, dx: 0.95, dz: 2.4, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Cada enero, millones se proponen cambiar algo»: desde el este, con la diana detrás; señala.
  { yaw: [0.8, 1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «Y a los seis meses, más de la mitad ya lo dejó»: desde arriba, más lejos.
  { yaw: [-0.45, -0.25], dist: [3.2, 2.9], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Qué hacen distinto las que sí lo logran?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.3, -0.1], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando alrededor de la princesa (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * al señalar la diana y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'magia.mp3'), en: cortes[0] + 0.2, volumen: 0.24 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras la princesa dice «escribir tus metas…, pedir un
 * plan… y verlo en un cronograma», la toma pasa por cada cosa justo al nombrarla.
 * `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['escribir', 'plan', 'cronograma'],
  textos: '{}',
  ayudas: `
    /** Espera un elemento por su data-tut. */
    const esperarTut = async (clave, ms = 6000) => {
      for (let i = 0; i < ms / 150; i++) {
        const el = tut(clave)
        if (el) return el
        await dormir(150)
      }
      return null
    }
    const pestana = async (modo) => {
      const p = await esperarTut('cal.cron.modo.' + modo)
      if (p) await tocar(p)
      await dormir(500)
    }
  `,
  /** La app en Metas, arriba del todo (la lista de metas por app a la vista). */
  preparar: `
    await dormir(800)
    const volver = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(tGlobal('cal.meta.volverMetas', 'Volver a las metas')))
    volver?.click()
    await dormir(400)
    if (!(await esperarTut('cal.cron.modo.metas', 12000))) return 'no encontré la pestaña Metas'
    tut('cal.cron.modo.metas').click()
    await dormir(600)
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Escribir: la caja de
   * «+ meta» abierta; plan: una meta con su «Planear con IA» (horas, días, punto de
   * partida); cronograma: la pestaña Cronograma con las barras de las metas.
   */
  accion: (T) => `
    await hasta(t0, ${T.escribir} - 0.5)
    const mas = [...document.querySelectorAll('main button')].find((b) => b.innerText.includes(tGlobal('cal.meta.etiquetaMeta', 'meta')))
    if (mas) await tocar(mas)
    await hasta(t0, ${T.plan} - 1.0)
    const fila = document.querySelector('[data-tut="cal.metas.fila.aceptado"] button, [data-tut="cal.metas.fila"] button')
    if (fila) await tocar(fila)
    await dormir(700)
    const ia = [...document.querySelectorAll('button')].find((b) => b.title === tGlobal('cal.plan.ia', 'Planear con IA'))
    if (ia) await tocar(ia)
    await hasta(t0, ${T.cronograma} - 0.9)
    const volver = [...document.querySelectorAll('button')].find((b) => b.innerText.includes(tGlobal('cal.meta.volverMetas', 'Volver a las metas')))
    if (volver) await tocar(volver)
    await dormir(400)
    await pestana('cronograma')
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a la princesa (miniaturas.mjs). */
export const MINIATURA = { objeto: '🎯' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «más de la mitad ya lo dejó»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
