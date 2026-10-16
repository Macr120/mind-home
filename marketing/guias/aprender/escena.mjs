// Lo propio de la guía de Aprender («¿Cómo aprender más rápido?») en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está la princesa en la casa (en la biblioteca) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de la princesa),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra la PRINCESA con vestido AZUL, con el tema de la tortuga y solo el cuadrante A1
// a la vista (pedidos del usuario).
//
// La biblioteca de la demo está en el PISO 1 (casa apilada), un cuarto de una celda: el
// librero al noroeste (abre la app), la lámpara de pie al oeste y el sillón de lectura al
// sureste. Sus dos entradas extra se arman EN VIVO (ENTRADAS, idempotente): un atril con
// un libro abierto que dice la pregunta, al noreste (abre la guía web), y la lámpara de pie
// (abre el Estudio de la app: «una luz para estudiar»).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Princesa» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'princesa'
/** El vestido azul (el de fábrica es rosa). Igual que `VESTIDO_GUIA` de la página. */
export const CUERPO_COLORES = { '#e35d9e': '#60a5fa' }
/** El tema de la tortuga (la casa viaja sobre su caparazón) y solo el cuadrante A1 (pedido del usuario). */
export const TEMA = 'tortuga'
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo, un poco más chico para que no tape a la princesa. */
export const TITULO_ESCALA = 0.75
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'
/** La música de fondo: la lista de Idiomas (hard techno → trap → lofi celta, del usuario). */
export const MUSICA_LISTA = 'idiomas.json'

/** La princesa en el piso de la biblioteca y `window.__bib` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const librero = useDiseño.getState().objetos.find((x) => x.tipo === 'librero-libro' && x.plantillaId === 'biblioteca')
  if (!librero) return 'SIN librero en la biblioteca de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[librero.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(librero.roomId)
  window.__bib = { cuarto: librero.roomId, rx, rz, librero: librero.id }
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

/** Su sitio: en medio del cuarto, entre el librero y el atril, de cara al sur (el sillón le queda a su izquierda). */
const SITIO = { x: 0.2, z: -0.7 }

/** La princesa de pie en su sitio, explicando: llega caminando hacia el frente (de cara a la cámara). */
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
  // El marcador de entrada que flota sobre el librero: fuera en esta toma (React lo remonta: se repasa toda la toma).
  // Solo esferas grandes y lejos de la princesa: los ojos de su cara también son esferas.
  const [mx, mz] = [rx + librero.x, rz + librero.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      if ((m.geometry.parameters.radius ?? 0) < 0.08) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 0.5) return
      if (Math.hypot(x - mx, z - mz) < 0.6 && y > piso + 1.2) m.visible = false
    })
  }, 300)
  ${gesto('explica')}
  await sleep(800)
`

/**
 * Las entradas de la biblioteca, armadas en vivo (idempotente): el atril de la guía al
 * noreste y la lámpara de pie (el Estudio de la app). Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const cuarto = librero.roomId
  // El atril: pie de madera, un tablero inclinado y un libro abierto con la pregunta, de cara al sur.
  const ATRIL = { x: 1.55, z: -1.9 }
  let atril = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/aprender'))
  if (atril && (atril.tipo !== 'piezas' || Math.hypot(atril.x - ATRIL.x, atril.z - ATRIL.z) > 0.05 || atril.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(atril.id)
    atril = undefined
  }
  if (!atril) {
    const a = 0.5
    const Y = 1.05
    const rot = [-a, 0, 0]
    // Un punto sobre el tablero inclinado: «arriba» a lo largo del tablero, «sobre» hacia fuera de su cara.
    const en = (x, arriba, sobre) => [x, Y + arriba * Math.cos(a) + sobre * Math.sin(a), -arriba * Math.sin(a) + sobre * Math.cos(a)]
    const piezas = [
      { tipo: 'caja', pos: [0, 0.03, 0], tam: [0.5, 0.06, 0.4], color: '#5b3a1e' },
      { tipo: 'caja', pos: [0, 0.52, -0.05], tam: [0.08, 0.95, 0.08], color: '#6b4423' },
      { tipo: 'caja', pos: en(0, 0, 0), tam: [0.78, 0.56, 0.04], color: '#7c4a21', rot },
      // El libro abierto: dos hojas y el lomo.
      { tipo: 'caja', pos: en(-0.18, 0.02, 0.035), tam: [0.34, 0.46, 0.025], color: '#fdf6e3', rot },
      { tipo: 'caja', pos: en(0.18, 0.02, 0.035), tam: [0.34, 0.46, 0.025], color: '#fdf6e3', rot },
      { tipo: 'caja', pos: en(0, 0.02, 0.03), tam: [0.02, 0.48, 0.03], color: '#1e3a8a', rot },
      { tipo: 'plano', pos: en(0, 0.07, 0.05), tam: [0.66, 0.26], color: '#fdf6e3', tinta: '#1e3a8a', texto: ${JSON.stringify(titulo)}, rot },
      { tipo: 'plano', pos: en(0.17, -0.15, 0.05), tam: [0.26, 0.06], color: '#60a5fa', tinta: '#ffffff', texto: 'MindHaOS', rot },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#7c4a21', undefined, ATRIL, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    atril = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // La lámpara de pie: abre el Estudio de la app.
  const lampara = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:31')
  if (!lampara) return 'SIN lámpara de pie en la biblioteca de la demo'
  if (lampara.enlaceApp?.seccion !== 'estudio') {
    await useDiseño.getState().setObjetoEnlaceApp(lampara.id, { plantillaId: 'biblioteca', seccion: 'estudio', titulo: tGlobal('biblioteca.tab.estudio', 'Estudio') })
  }
  window.__entradas = { cuarto, librero: librero.id, guia: atril.id, app: lampara.id }
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
    const p = await esperarTut('biblioteca.tab.' + id)
    if (p) await tocar(p)
    await sleep(800)
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

/** La princesa en (x, z) de la biblioteca, llegando un paso desde el norte (queda de cara al sur), con un gesto. */
const PARADO = (x, z, g) => `
  ${SOLTAR_GESTO}
  ${EN_EL_CUARTO}
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
 * La princesa va a una entrada (`cual`: 'librero' o 'app', la lámpara), la toca y la app se
 * abre; `luego` = lo que hace en la app mientras sigue la voz. `llegada` = [dx, dz] desde
 * el objeto donde se para a tocarlo. Con `hablaDespues`, la voz arranca cuando la app ya
 * muestra lo que dice. `luego` también puede ser una función de la duración de la voz: con
 * `aMedia(q)` espera a esa fracción de la frase (para pasar a otro menú justo al nombrarlo).
 */
const aLaEntrada = (cual, llegada, luego, hablaDespues = false) => (dur) => `
  ${MUNDO}
  const e = window.__entradas
  const id = e.${cual}
  const [ox, oz] = await mundo(id)
  ${hablaDespues ? '' : VOZ}
  ${SOLTAR_GESTO}
  ${cual === 'librero' ? girar(0.35, 0.1, 2400, 3.0, 2.6, 0.42, 0.46) : girar(1.45, 1.2, 2400, 3.0, 2.6, 0.62, 0.58)}
  await irA(ox + ${llegada[0]}, oz + ${llegada[1]}, 0.25)
  await sleep(300)
  ${cual === 'librero' ? 'useInteractUi.getState().selectMueble(e.cuarto)' : 'useInteractUi.getState().selectEnlace(id)'}
  await sleep(400)
  sinPaneles()
  await sleep(500)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('biblioteca.tab.charlas')
    await sleep(600)
    const aMedia = async (q) => {
      const fin = window.__marcas.voz + q * ${Math.round(dur * 1000)}
      while (performance.now() < fin) await sleep(80)
    }
    ${typeof luego === 'function' ? luego(dur) : luego}
  }
  ${hablaDespues ? `await sleep(300)
  ${VOZ}` : ''}
  ${hastaFinVoz(dur + 1.5)}
`
/** La princesa un par de pasos de una entrada, de espaldas a ella (camino a tocarla); la cámara como la de \`aLaEntrada\`. */
const preparar = (cual, dx = 1.0, dz = 1.5) => `
  ${MUNDO}
  ${SOLTAR_GESTO}
  const [ox, oz] = await mundo(window.__entradas.${cual})
  await teletransportar(ox + ${dx}, oz + ${dz})
  useCam.setState(${cual === 'librero' ? "{ vista: 'tercera', yaw: 0.35, dist3p: 3.0, pitch: 0.42 }" : "{ vista: 'tercera', yaw: 1.45, dist3p: 3.0, pitch: 0.62 }"})
`

/**
 * Sin sesión de estudio corriendo (una toma anterior pudo dejar el temporizador en marcha: se
 * guarda en el navegador). Se borra a mano, sin «cancelar», para no acreditarle minutos a la demo.
 */
const SIN_TEMPORIZADOR = `
  for (const k of Object.keys(localStorage)) if (k.includes('mh.estudioBiblio')) localStorage.removeItem(k)
  {
    const url = performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes('/src/rooms/biblioteca/estudioStore.ts'))
    if (url) (await import(url)).useEstudio.setState({ activa: null })
  }
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El atril en la vista iso; la princesa camina hasta él y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx - 0.9, bz + 1.8)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx - 0.3, y + 0.9, bz + 1.1], zoom: 140, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx, y + 1.0, bz + 0.4], zoom: 190, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx - 0.1, bz + 0.85, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al libro: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.1, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «en mi biblioteca no solo guardo lo que leo»: junto al librero, señalándolo; desde el sureste.
    nombre: 'estantes',
    voz: 'olvido.estantes',
    preparar: `
      ${PARADO(-1.1, -1.5, 'senala')}
      useCam.setState({ vista: 'tercera', yaw: 0.5, dist3p: 2.9, pitch: 0.36 })
    `,
    accion: conGiro([0.5, 0.2], [2.9, 2.5], [0.36, 0.32]),
  },
  {
    // Parte 2, «le pido al sabio de mi biblioteca que me haga preguntas»: toca el librero y la app
    // se abre en Charlas, con las conversaciones con el sabio.
    nombre: 'sabio',
    voz: 'tecnicas.sabio',
    preparar: preparar('librero', 1.4, 1.6),
    // Dos menús en la misma toma (pedido del usuario): Charlas y, a los dos tercios de la frase
    // («…lo que aprendo se guarda en mi enciclopedia»), la Enciclopedia con su árbol.
    accion: aLaEntrada('librero', [0.8, 0.7], () => `
      await pestana('charlas')
      await aMedia(0.66)
      await pestana('enciclopedia')
      const arbol = await esperarTut('biblioteca.enc.arbol', 4000)
      arbol?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    `),
  },
  {
    // Parte 3, «leo, cierro el libro y le cuento al sabio lo que entendí»: toca el librero y abre
    // una charla con el sabio (sus mensajes a la vista) ANTES de hablar.
    nombre: 'recordar',
    voz: 'prueba.recordar',
    preparar: preparar('librero', 1.4, 1.6),
    accion: aLaEntrada('librero', [0.8, 0.7], `
      await pestana('charlas')
      // La primera charla de la lista: cada una es un botón \`text-start\` (el de «nueva charla» no lo es).
      const charlas = [...document.querySelectorAll('button.text-start.rounded-xl')]
      if (charlas[0]) await tocar(charlas[0])
      await sleep(900)
    `, true),
  },
  {
    // Parte 4, la mención del plan de estudio: toca la lámpara y la app se abre en Estudio,
    // con «Tu rato de estudio» que se agenda en el calendario.
    nombre: 'plan',
    voz: 'repasar.plan',
    preparar: SIN_TEMPORIZADOR + preparar('app', 1.9, 0.1),
    // Dos menús en la misma toma (pedido del usuario): Estudio y, a los dos tercios de la frase
    // («…y mis repasos aparecen en el calendario»), el Resumen con el mapa de estudio.
    accion: aLaEntrada('app', [0.6, 0.55], () => `
      await pestana('estudio')
      const timer = await esperarTut('biblioteca.estudio.timer', 4000)
      timer?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      await aMedia(0.62)
      await pestana('resumen')
    `),
  },
  {
    // Parte 5, «mi enciclopedia es un árbol»: toca el librero y pasa a Enciclopedia, con el árbol
    // del conocimiento a la vista ANTES de hablar.
    nombre: 'arbol',
    voz: 'entender.arbol',
    preparar: preparar('librero', 1.4, 1.6),
    accion: aLaEntrada('librero', [0.8, 0.7], `
      await pestana('enciclopedia')
      const arbol = await esperarTut('biblioteca.enc.arbol', 4000)
      arbol?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    `, true),
  },
  {
    // Parte 6, «pongo mi temporizador de estudio»: toca la lámpara, en Estudio elige 25 minutos e inicia.
    nombre: 'estudio',
    voz: 'dormir.estudio',
    preparar: SIN_TEMPORIZADOR + preparar('app', 1.9, 0.1),
    accion: aLaEntrada('app', [0.6, 0.55], `
      await pestana('estudio')
      const timer = await esperarTut('biblioteca.estudio.timer', 4000)
      timer?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      await sleep(600)
      // La duración de 25 min (segunda de las duraciones) y «Iniciar», el último botón de la tarjeta.
      const duraciones = [...(timer?.querySelectorAll('[role="tablist"]')[1]?.querySelectorAll('[role="tab"]') ?? [])]
      if (duraciones[1]) await tocar(duraciones[1])
      await sleep(700)
      const iniciar = [...(timer?.querySelectorAll(':scope > button') ?? [])].pop()
      if (iniciar) await tocar(iniciar)
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando (la cámara llega a ella y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: la princesa abre la app por la entrada principal (el librero) y pasa a Enciclopedia. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('biblioteca.tab.charlas')
    await sleep(1600)
    await pestana('enciclopedia')
  }
  // Que se vea la app antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde la princesa (en (0,2, −0,7) del cuarto) para que la biblioteca quede al centro. */
export const ISO = { zoom: 90, dx: -0.2, dz: 0.7, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «La mayoría estudia releyendo y subrayando…»: desde el este, con el librero detrás; señala.
  { yaw: [0.8, 1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «Hoy vas a ver las que sí funcionan…»: la vista del juego.
  { iso: true },
  // Si el gancho se parte en más frases: desde arriba y de frente.
  { yaw: [-0.45, -0.25], dist: [3.2, 2.9], pitch: [0.7, 0.62], antes: gesto('explica') },
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
 * La app 2D en el recuadro del cierre: mientras la princesa dice «conversar con un sabio…, en
 * tu enciclopedia… y estudiar con un temporizador», la toma pasa por cada pestaña justo al
 * nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['conversar', 'enciclopedia', 'estudiar'],
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
      const p = await esperarTut('biblioteca.tab.' + id)
      if (p) await tocar(p)
      await dormir(500)
    }
  `,
  /** La app en Resumen, arriba del todo (así «conversar» cambia de pestaña al decirlo). */
  preparar: `
    await dormir(800)
    if (!(await esperarTut('biblioteca.tab.resumen', 12000))) return 'no encontré la pestaña Resumen'
    tut('biblioteca.tab.resumen').click()
    await dormir(600)
    main().scrollTop = 0
  `,
  /** `T` = segundo del cierre en que se dice cada ancla, y `fin`. */
  accion: (T) => `
    await hasta(t0, ${T.conversar} - 0.6)
    await pestana('charlas')
    await hasta(t0, ${T.enciclopedia} - 0.6)
    await pestana('enciclopedia')
    await hasta(t0, ${T.estudiar} - 0.6)
    await pestana('estudio')
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: si no hay icono de la app (iconos.mjs), este emoji en primer plano. */
export const MINIATURA = { objeto: '📚' }

/** El «fah» del gancho, tras la frase que incomoda (la segunda: «…de las técnicas que menos sirven»): antes de la tercera. */
export const PAUSA_ANTES_DE = 2
