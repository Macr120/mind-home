// Lo propio de la guía de Mindfulness en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está la princesa en la casa (en el jardín) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de la princesa),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra la PRINCESA con vestido VERDE (pedido del usuario): el cuerpo prediseñado
// «Princesa» con el color del vestido cambiado (CUERPO_COLORES). Sin tema, pero con el
// fondo «Playa tropical» (FONDO). Sus brazos se mueven desde la escena, como en Metas.
//
// El jardín de la demo está en la PLANTA BAJA (casa explotada), sin muros: pasto, dos
// árboles al norte, dos arbustos al sur y el tapete de yoga (abre la app). Sus dos entradas
// extra se arman EN VIVO (ENTRADAS, idempotente): un letrero de madera con la pregunta
// entre los árboles (abre la guía web) y un cuenco tibetano sobre una piedra (abre la
// Respiración del Jardín).
import path from 'node:path'

/** El título del primer segundo, más chico (la pregunta es larga y tapaba a la princesa, pedido del usuario). */
export const TITULO_ESCALA = 0.62
/** El narrador: el cuerpo prediseñado «Princesa» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'princesa'
/** El vestido de verde menta (el de fábrica es rosa; el verde oscuro se perdía en el pasto). Igual que `VESTIDO_GUIA` de la página. */
export const CUERPO_COLORES = { '#e35d9e': '#34d399' }
/** Sin tema (casa.mjs quita el que haya), con el fondo de la playa tropical (pedido del usuario). */
export const FONDO = 'playa_tropical'
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'
/** La música de fondo: la lista de Metas (trap → cyberpunk → medieval, del usuario). */
export const MUSICA_LISTA = 'metas.json'

/** La princesa en el piso del jardín y `window.__jardin` con el origen del cuarto en el mundo. */
const EN_EL_JARDIN = `
  const tapete = useDiseño.getState().objetos.find((x) => x.tipo === 'tapete-yoga' && x.plantillaId === 'jardin')
  if (!tapete) return 'SIN tapete de yoga en el jardín de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[tapete.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(tapete.roomId)
  window.__jardin = { cuarto: tapete.roomId, rx, rz, tapete: tapete.id }
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

/** Su sitio: al este del tapete, de cara al sur (el tapete le queda a la derecha). */
const SITIO = { x: 0.95, z: 0.9 }

/** La princesa de pie junto al tapete, explicando: llega caminando hacia el frente (de cara a la cámara). */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_JARDIN}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.8)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre el tapete: fuera en esta toma (React lo remonta: se repasa toda la toma).
  // Solo esferas grandes y lejos de la princesa: los ojos de su cara también son esferas.
  const [mx, mz] = [rx + tapete.x, rz + tapete.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      if ((m.geometry.parameters.radius ?? 0) < 0.08) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 0.5) return
      if (Math.hypot(x - mx, z - mz) < 0.6 && y > piso + 0.3) m.visible = false
    })
  }, 300)
  ${gesto('explica')}
  await sleep(800)
`

/**
 * Las entradas del jardín, armadas en vivo (idempotente): el letrero de la guía entre los
 * árboles y el cuenco tibetano (la Respiración de la app). Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_JARDIN}
  const ds = useDiseño.getState()
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const cuarto = tapete.roomId
  // El letrero: dos postes, una tabla de madera con la pregunta y el sello, de cara al sur.
  const LETRERO = { x: 0, z: -2.3 }
  let letrero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/mindfulness'))
  if (letrero && (letrero.tipo !== 'piezas' || Math.hypot(letrero.x - LETRERO.x, letrero.z - LETRERO.z) > 0.05 || letrero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(letrero.id)
    letrero = undefined
  }
  if (!letrero) {
    const Y = 1.15
    const piezas = [
      { tipo: 'caja', pos: [-0.62, 0.65, 0], tam: [0.08, 1.3, 0.08], color: '#6b4423' },
      { tipo: 'caja', pos: [0.62, 0.65, 0], tam: [0.08, 1.3, 0.08], color: '#6b4423' },
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.45, 0.72, 0.06], color: '#8b5a2b' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.35, 0.62, 0.04], color: '#d9b382' },
      { tipo: 'plano', pos: [0, Y + 0.06, 0.042], tam: [1.25, 0.42], color: '#f5ead6', tinta: '#14532d', texto: ${JSON.stringify(titulo)} },
      { tipo: 'plano', pos: [0.4, Y - 0.22, 0.042], tam: [0.36, 0.08], color: '#34d399', tinta: '#052e16', texto: 'MindHaOS' },
      // Una hoja en la esquina.
      { tipo: 'esfera', pos: [-0.55, Y - 0.22, 0.05], tam: [0.06], color: '#22c55e' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#8b5a2b', undefined, LETRERO, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    letrero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El cuenco tibetano: una piedra plana con un cojín y el cuenco dorado con su mazo, al oeste del tapete.
  const CUENCO = { x: -1.15, z: 0.5 }
  let cuenco = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceApp?.plantillaId === 'jardin' && x.tipo === 'piezas')
  if (cuenco && Math.hypot(cuenco.x - CUENCO.x, cuenco.z - CUENCO.z) > 0.05) {
    await ds.removeObjeto(cuenco.id)
    cuenco = undefined
  }
  if (!cuenco) {
    const piezas = [
      { tipo: 'cilindro', pos: [0, 0.09, 0], tam: [0.38, 0.42, 0.18], color: '#9ca3af' },
      { tipo: 'cilindro', pos: [0, 0.22, 0], tam: [0.24, 0.26, 0.08], color: '#7c2d12' },
      { tipo: 'cilindro', pos: [0, 0.34, 0], tam: [0.2, 0.12, 0.16], color: '#d4a017' },
      { tipo: 'cilindro', pos: [0, 0.415, 0], tam: [0.17, 0.17, 0.01], color: '#78350f' },
      { tipo: 'cilindro', pos: [0.3, 0.27, 0.05], tam: [0.025, 0.025, 0.3], color: '#a16207', rot: [0, 0, 1.3] },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#d4a017', undefined, CUENCO, { piezas, rotY: 0 })
    cuenco = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  if (cuenco.enlaceApp?.seccion !== 'respiracion') {
    await useDiseño.getState().setObjetoEnlaceApp(cuenco.id, { plantillaId: 'jardin', seccion: 'respiracion', titulo: tGlobal('jardin.tab.respiracion', 'Respiración') })
  }
  window.__entradas = { cuarto, tapete: tapete.id, guia: letrero.id, app: cuenco.id }
`

/**
 * La app abierta dentro de la casa (el panel del cuarto): espera elementos por su
 * `data-tut` y toca pestañas y botones (sirve en todos los idiomas).
 */
const EN_LA_APP = `
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = document.querySelector('[data-tut="' + clave + '"]')
      if (el) return el
      await sleep(200)
    }
    return null
  }
  const pestana = async (id) => {
    const p = await esperarTut('jardin.tab.' + id)
    if (p) await tocar(p)
    await sleep(700)
  }
  /** «¿Cómo llegas?»: una cara (la cuarta) y arranca la sesión. */
  const unaCara = async () => {
    await sleep(600)
    const caras = document.querySelectorAll('button.text-3xl')
    if (caras.length) await tocar(caras[Math.min(3, caras.length - 1)])
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

/** La princesa en (x, z) del jardín, llegando un paso desde el norte (queda de cara al sur), con un gesto. */
const PARADO = (x, z, g) => `
  ${SOLTAR_GESTO}
  ${EN_EL_JARDIN}
  await teletransportar(rx + ${x}, rz + ${z} - 0.6)
  await irA(rx + ${x}, rz + ${z}, 0.12)
  await sleep(300)
  ${gesto(g)}
`
/** Una toma que se narra con la princesa quieta y la cámara girando a su alrededor. */
const conGiro = (yaw, dist, pitch) => (dur) => `
  ${VOZ}
  ${girar(yaw[0], yaw[1], `${Math.round(dur * 1000) + 600}`, dist[0], dist[1], pitch[0], pitch[1])}
  ${hastaFinVoz(dur)}
`
/**
 * La princesa va a una entrada (`cual`: 'tapete' o 'app', el cuenco), la toca y la app se
 * abre; `luego` = lo que hace en la app mientras sigue la voz. `llegada` = [dx, dz] desde
 * el objeto donde se para a tocarlo. Con `hablaDespues`, la voz arranca cuando la app ya
 * muestra lo que dice.
 */
const aLaEntrada = (cual, llegada, luego, hablaDespues = false) => (dur) => `
  ${MUNDO}
  const e = window.__entradas
  const id = e.${cual}
  const [ox, oz] = await mundo(id)
  ${hablaDespues ? '' : VOZ}
  ${SOLTAR_GESTO}
  ${girar(0.35, 0.1, 2400, 3.0, 2.6, 0.42, 0.46)}
  await irA(ox + ${llegada[0]}, oz + ${llegada[1]}, 0.25)
  await sleep(300)
  ${cual === 'tapete' ? 'useInteractUi.getState().selectMueble(e.cuarto)' : 'useInteractUi.getState().selectEnlace(id)'}
  await sleep(400)
  sinPaneles()
  await sleep(500)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('jardin.calma')
    await sleep(600)
    ${luego}
  }
  ${hablaDespues ? `await sleep(300)
  ${VOZ}` : ''}
  ${hastaFinVoz(dur + 1.5)}
`
/** La princesa a un par de pasos al sureste de una entrada, de espaldas a ella (camino a tocarla); la cámara desde el sureste. */
const preparar = (cual, dx = 0.9, dz = 1.6) => `
  ${MUNDO}
  ${SOLTAR_GESTO}
  const [ox, oz] = await mundo(window.__entradas.${cual})
  await teletransportar(ox + ${dx}, oz + ${dz})
  useCam.setState({ vista: 'tercera', yaw: 0.35, dist3p: 3.0, pitch: 0.42 })
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El letrero entre los árboles en la vista iso; la princesa camina hasta él y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 0.7, bz + 2.2)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.2, y + 0.9, bz + 1.3], zoom: 140, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx, y + 1.1, bz + 0.5], zoom: 190, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx + 0.1, bz + 0.85, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al letrero: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.2, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «este jardín no tiene muros ni prisa»: en medio del pasto, explicando; la cámara se abre despacio.
    nombre: 'jardin',
    voz: 'mente.jardin',
    preparar: `
      ${PARADO(0.2, -0.6, 'explica')}
      useCam.setState({ vista: 'tercera', yaw: 0.2, dist3p: 3.0, pitch: 0.36 })
    `,
    accion: conGiro([0.2, -0.3], [3.0, 4.2], [0.36, 0.46]),
  },
  {
    // Parte 2, «yo me siento aquí, digo cómo llego, medito unos minutos»: toca el tapete, la app
    // se abre en Meditación, «Comenzar meditación» y una cara de «¿Cómo llegas?».
    nombre: 'sesion',
    voz: 'que.sesion',
    preparar: preparar('tapete', 1.0, 1.2),
    accion: aLaEntrada('tapete', [0.75, 0.1], `
      await pestana('meditacion')
      const empezar = [...(document.querySelector('[data-tut="jardin.med.pistas"]')?.querySelectorAll(':scope > button') ?? [])].pop()
      if (empezar) {
        await tocar(empezar)
        await unaCara()
      }
    `),
  },
  {
    // Parte 3, «elijo el patrón y sigo un círculo»: toca el cuenco, la app se abre en
    // Respiración y empieza la guiada (el círculo que crece y se encoge).
    nombre: 'respira',
    voz: 'respirar.lampara',
    preparar: preparar('app', 1.0, 1.4),
    accion: aLaEntrada('app', [0.55, 0.45], `
      await pestana('respiracion')
      // «Comenzar respiración» es el último botón de la sección del patrón (vale en todos los idiomas).
      let empezar
      for (let i = 0; i < 40 && !empezar; i++) {
        await sleep(150)
        empezar = [...(document.querySelector('[data-tut="jardin.resp.patron"]')?.querySelectorAll(':scope > button') ?? [])].pop()
      }
      if (empezar) {
        await tocar(empezar)
        await unaCara()
      }
    `),
  },
  {
    // Parte 4, «primero vengo aquí: una campana…»: junto al cuenco, señalándolo; desde el sur.
    nombre: 'campana',
    voz: 'rapido.campana',
    preparar: `
      ${PARADO(-0.45, 0.55, 'senala')}
      useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.8, pitch: 0.34 })
    `,
    accion: conGiro([-0.3, 0.15], [2.8, 2.5], [0.34, 0.3]),
  },
  {
    // Parte 5, «aquí también anoto qué agradezco hoy»: toca el tapete y pasa a Agradecimientos,
    // abierta ANTES de hablar.
    nombre: 'agradezco',
    voz: 'ciencia.agradezco',
    preparar: preparar('tapete', 1.0, 1.2),
    accion: aLaEntrada('tapete', [0.75, 0.1], `
      await pestana('gratitud')
    `, true),
  },
  {
    // Parte 6, «elijo el sonido… y medito hasta que suena la campana»: toca el tapete y en
    // Meditación va tocando los sonidos (bosque, mar, lluvia).
    nombre: 'sonidos',
    voz: 'meditar.sonidos',
    preparar: preparar('tapete', 1.0, 1.2),
    accion: aLaEntrada('tapete', [0.75, 0.1], `
      await pestana('meditacion')
      const pistas = [...(document.querySelector('[data-tut="jardin.med.pistas"]')?.querySelectorAll('.grid > button') ?? [])]
      for (const p of pistas.slice(0, 3)) {
        await tocar(p)
        await sleep(1300)
      }
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando (la cámara llega a ella y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: la princesa abre la app por la entrada principal (el tapete): la calma acumulada arriba. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('jardin.calma')
    await sleep(1600)
    await pestana('respiracion')
  }
  // Que se vea la app antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde la princesa (en (0,95, 0,9) del jardín) para que el jardín quede al centro. */
export const ISO = { zoom: 80, dx: -0.95, dz: -0.9, dy: 0 }

/**
 * La casa entera de la mención y de la salida: el jardín abajo al centro y la casa completa
 * arriba, con el piso de arriba que flota (casa explotada). Sin giro: la cámara solo se abre
 * desde el jardín hasta la casa (pedido del usuario).
 */
export const VISTA_CASA = { focus: [-31, 4, -14.6], zoom: 10.5, az: Math.PI / 4, el: 0.6154797086703873 }
export const GIRO_CASA = 0

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «A muchas personas las dejaron solas quince minutos…»: desde el este, con los árboles detrás; señala.
  { yaw: [0.8, 1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «…prefirieron darse descargas eléctricas»: desde arriba, más lejos.
  { yaw: [-0.45, -0.25], dist: [3.2, 2.9], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «Hoy vas a ver qué dice la ciencia de frenar»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.3, -0.1], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando alrededor de la princesa (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras la pregunta del gancho, un destello al señalar y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 2) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'magia.mp3'), en: cortes[0] + 0.2, volumen: 0.24 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras la princesa dice «meditar…, respirar con un
 * círculo…, anotar lo que agradeces… y ver crecer tu calma», la toma pasa por cada pestaña
 * justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['meditar', 'respirar', 'agradecer', 'calma'],
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
    const pestana = async (id) => {
      const p = await esperarTut('jardin.tab.' + id)
      if (p) await tocar(p)
      await dormir(500)
    }
  `,
  /** La app en Meditación, arriba del todo. */
  preparar: `
    await dormir(800)
    if (!(await esperarTut('jardin.tab.meditacion', 12000))) return 'no encontré la pestaña Meditación'
    tut('jardin.tab.meditacion').click()
    await dormir(600)
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Meditar: los sonidos;
   * respirar: la pestaña Respiración; agradecer: Agradecimientos; calma: arriba, la calma acumulada.
   */
  accion: (T) => `
    await hasta(t0, ${T.meditar} - 0.5)
    const pistas = [...(tut('jardin.med.pistas')?.querySelectorAll('.grid > button') ?? [])]
    if (pistas[1]) await tocar(pistas[1])
    await hasta(t0, ${T.respirar} - 0.7)
    await pestana('respiracion')
    await hasta(t0, ${T.agradecer} - 0.7)
    await pestana('gratitud')
    await hasta(t0, ${T.calma} - 0.6)
    main().scrollTo({ top: 0, behavior: 'smooth' })
    const calma = tut('jardin.calma')
    if (calma) await tocar(calma)
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a la princesa (miniaturas.mjs). */
export const MINIATURA = { objeto: '🧘' }

/** El «fah» del gancho, tras la frase que incomoda (la segunda: «…prefirieron darse descargas eléctricas»): antes de la tercera. */
export const PAUSA_ANTES_DE = 2
