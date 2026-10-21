// Lo propio de la guía de Ideas en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el osito, en el cuarto de Ideas) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el OSITO (el cuerpo prediseñado de la app) con el atuendo del tema de la TORTUGA, con la
// casa en el tema de NAVIDAD y el mapa COMPLETO a la vista, sin recortar (pedidos del usuario).
//
// El cuarto de Ideas está en el PISO 1 de la demo (encima del de Noticias): la pizarra de ideas
// al noroeste (abre la app), un escritorio con monitor y su silla al centro, una libreta con su
// pluma al suroeste y una lámpara en la esquina noreste. La cámara iso mira desde el sureste: el
// osito va al oeste del escritorio, de cara al sur, con las cámaras dentro del cuarto, del lado
// sur. El tablero con la pregunta (un corcho con notas adhesivas) se arma EN VIVO (ENTRADAS,
// idempotente) en el muro NORTE, hacia la esquina noreste (regla del usuario: contra la pared,
// en una esquina, nunca frente a una puerta: la del muro norte está en su mitad oeste).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Osito» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'osito'
/** Con el atuendo del tema de la tortuga (ATUENDO_POR_TEMA.tortuga de src/core/house/atuendos.ts): casa.mjs se lo pone al cuerpo. */
export const ROPA = {
  sombrero: { color: '#a3865a' },
  camisa: { color: '#65a30d' },
  pantalon: { color: '#8b6a3e' },
  tenis: { color: '#f5f5dc' },
  mochila: { color: '#4d7c0f' },
}
/** Navidad, toda la guía, con el mapa entero (sin CUADRANTE). */
export const TEMA = 'navidad'
/** El título del primer segundo: grande, pero sin tapar al osito (el primer plano arranca lejos). */
export const TITULO_ESCALA = 0.8
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'

/** El osito en el piso del cuarto y `window.__ide` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const pizarra = useDiseño.getState().objetos.find((x) => x.plantillaId === 'ideas')
  if (!pizarra) return 'SIN el objeto de Ideas en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[pizarra.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(pizarra.roomId)
  window.__ide = { cuarto: pizarra.roomId, rx, rz, pizarra: pizarra.id }
`

/**
 * Los gestos del osito: su cuerpo de piezas no tiene emotes, pero sus brazos (cajas de
 * 0,2 × 0,6 × 0,26, la huella del cuerpo base, como el alien) giran desde el hombro. Un bucle
 * les suma la apertura según `window.__gestoAlien` ('explica', 'senala' o null = quietos); los
 * vuelve a buscar si React remonta el avatar.
 */
const GESTOS = `
  if (!window.__bucleAlien) {
    const hs = await modulo('/src/core/state/houseStore.ts')
    const buscar = () => {
      const r = []
      window.__r3f().scene.traverse((m) => {
        if (!m.isMesh || m.geometry.type !== 'BoxGeometry') return
        const p = m.geometry.parameters
        if (Math.abs(p.width - 0.2) > 0.001 || Math.abs(p.height - 0.6) > 0.001 || Math.abs(p.depth - 0.26) > 0.001) return
        m.updateWorldMatrix(true, false)
        const [x, , z] = m.matrixWorld.elements.slice(12, 15)
        if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 1) r.push(m.parent)
      })
      return r
    }
    let brazos = []
    let visto = 0
    window.__bucleAlien = true
    const paso = () => {
      const ahora = performance.now()
      if (brazos.length < 2 || !brazos[0].parent || ahora - visto > 2000) {
        const b = buscar()
        if (b.length >= 2) brazos = b
        visto = ahora
      }
      const t = ahora / 1000
      const g = window.__gestoAlien
      for (const br of brazos) {
        // +x es su izquierda (la mano derecha del avatar va en −x).
        const izq = br.position.x > 0
        const z = g === 'explica' ? (izq ? 0.3 + 0.18 * Math.sin(t * 1.7 + 1) : 0.35 + 0.22 * Math.sin(t * 2.1))
          : g === 'senala' ? (izq ? 0.12 : 1.4 + 0.05 * Math.sin(t * 2.6))
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
  window.__gestoAlien = '${nombre}'` : 'window.__gestoAlien = null')
const SOLTAR_GESTO = gesto(null)

/** Su sitio: al oeste del escritorio, de cara al sur (coordenadas del cuarto). */
const SITIO = { x: -0.55, z: -0.6 }

/** Llega caminando hacia el sur (de cara a la cámara) hasta su sitio. */
const A_SU_SITIO = `
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.6)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
`

/** El osito de pie en su sitio, explicando. */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  ${A_SU_SITIO}
  await sleep(500)
  // El marcador de entrada que flota sobre la pizarra: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + pizarra.x, rz + pizarra.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - mx, z - mz) < 0.4 && y > piso + 1.2) m.visible = false
    })
  }, 300)
  ${gesto('explica')}
  await sleep(800)
`

/**
 * El tablero de la guía (coordenadas del cuarto; con celda 6 la cara de los muros queda a
 * ±2,82): en el muro NORTE, hacia la esquina noreste, mirando al sur.
 */
const TABLERO = { x: 1.45, z: -2.79, rotY: 0 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de la guía, un corcho con
 * la pregunta y notas adhesivas de colores. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = pizarra.roomId
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/ideas'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    const notas = [['#fde047', -0.38, -0.12, 0.08], ['#f9a8d4', -0.1, -0.2, -0.1], ['#86efac', 0.18, -0.1, 0.06], ['#93c5fd', 0.4, -0.22, -0.08], ['#fdba74', -0.25, -0.34, 0.04], ['#c4b5fd', 0.05, -0.36, -0.05]]
    const piezas = [
      // El marco y el corcho.
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      // La pregunta.
      { tipo: 'plano', pos: [0, Y + 0.24, 0.042], tam: [1.02, 0.26], color: '#fdf6e3', tinta: '#7c2d12', texto: ${JSON.stringify(titulo)} },
      // Las notas adhesivas, un poco giradas.
      ...notas.map(([color, x, y, r]) => ({ tipo: 'caja', pos: [x, Y + y, 0.042], tam: [0.17, 0.17, 0.006], color, rot: [0, 0, r] })),
      // Una bombilla dibujada: el foco amarillo y su rosca.
      { tipo: 'caja', pos: [0.42, Y + 0.02, 0.045], tam: [0.12, 0.12, 0.008], color: '#facc15' },
      { tipo: 'caja', pos: [0.42, Y - 0.06, 0.045], tam: [0.06, 0.05, 0.008], color: '#94a3b8' },
      { tipo: 'plano', pos: [0.36, Y - 0.39, 0.042], tam: [0.3, 0.07], color: '#fbbf24', tinta: '#0f172a', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, pizarra: pizarra.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): pestañas, mapas de la demo por tipo, la lluvia. */
const EN_LA_APP = `
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = document.querySelector('[data-tut="' + clave + '"]')
      if (el) return el
      await sleep(200)
    }
    return null
  }
  const { db } = await modulo('/src/core/data/db.ts')
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  /** Va a una pestaña de Ideas ('diario', 'mapas' o 'diagramas'). */
  const pestana = async (id) => {
    const b = await esperarTut('ideas.tab.' + id)
    if (b && b.getAttribute('aria-selected') !== 'true') await tocar(b)
    await sleep(900)
  }
  /** El contenedor que desliza el contenido de la app. */
  const main = () => [...document.querySelectorAll('main, main *')].find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY))
  /** Desliza el contenido de la app poco a poco (\`px\` en \`ms\`). */
  const deslizar = async (px, ms) => {
    const m = main()
    if (!m) return
    const y0 = m.scrollTop, t0 = performance.now()
    while (performance.now() - t0 < ms) { m.scrollTop = y0 + px * ((performance.now() - t0) / ms); await sleep(30) }
  }
  const ver = async (el) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(900)
    return el
  }
  /** Abre (en su pestaña) el mapa de la demo de ese tipo ('mental', 'flujo', 'eisenhower', 'proscontras', 'matriz'…); \`nombre\` desempata. */
  const abrirMapa = async (familia, tipo, nombre) => {
    await pestana(familia)
    const mapas = (await db.mapasIdeas.toArray()).filter((m) => m.tipo === tipo && !m.ejemplo)
    const m = (nombre && mapas.find(nombre)) ?? mapas[0]
    const el = m && (await esperarTut('ideas.mapas.item.' + m.id, 6000))
    if (el) { await ver(el); await tocar(el) }
    await sleep(1500)
  }
  /** Vuelve de un mapa abierto a la lista (el botón de la flecha de la propia pestaña). */
  const aLaLista = async () => {
    const b = [...document.querySelectorAll('main button')].find((x) => x.querySelector('svg') && /mapas|diagramas|maps|diagrams/i.test((x.title || '') + (x.getAttribute('aria-label') || '')))
    if (b) { await tocar(b); await sleep(900) }
  }
  /** Escribe en un input de React. */
  const escribir = (el, valor) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
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
 * La cámara en tercera persona sin esperar: yaw, distancia e inclinación de inicio a fin.
 * `window.__soltarCam = true` la corta.
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
/** Espera hasta el segundo `s` de la voz. */
const EN = (s) => `while (performance.now() < window.__marcas.voz + ${Math.round(s * 1000)}) await sleep(80)`

/** El osito en su sitio, de cara a la cámara (pedido del usuario: nunca de espaldas). */
const PREPARAR_FRENTE = `
  ${EN_EL_CUARTO}
  ${SOLTAR_GESTO}
  ${A_SU_SITIO}
  await sleep(300)
  ${gesto('senala')}
  useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.8, pitch: 0.42 })
`
/**
 * El osito, quieto y de frente, abre la app de su cuarto (sin caminar a la pizarra) en el segundo
 * `abre` de la voz; `luego(dur)` = lo que hace en la app mientras sigue la voz.
 */
const abrirApp = (luego, abre = 2) => (dur) => `
  ${VOZ}
  ${girar(-0.3, -0.05, Math.round(abre * 1000) + 400, 2.8, 2.5, 0.42, 0.4)}
  ${EN(abre)}
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(300)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('ideas.tab.diario')
    await sleep(600)
    ${luego(dur)}
  }
  ${hastaFinVoz(dur + 1.5)}
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El corcho del muro norte en la vista iso; el osito se aparta de él hacia la cámara y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx, bz + 0.5)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.2, y + 1.0, bz + 0.9], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx, y + 1.3, bz + 0.5], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      // Del corcho hacia la cámara (al sureste): de frente, nunca de espaldas.
      await irA(bx + 0.35, bz + 1.25, 0.25)
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
    // Parte 1, «tengo un diario de ideas: anoto todas, hasta las que parecen tontas».
    nombre: 'diario',
    voz: 'cantidad.diario',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('diario')
      await ver(await esperarTut('ideas.diario.alta'))
      ${EN(dur * 0.45)}
      await deslizar(600, Math.max(2000, (${dur} * 0.5 - 1) * 1000))
    `, 2),
  },
  {
    // Parte 2, «en mi diario se quedan guardadas por fecha y por tema».
    nombre: 'lluvias',
    voz: 'postit.lluvias',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('diario')
      await deslizar(900, Math.max(2500, (${dur} - 3) * 1000))
    `, 1.5),
  },
  {
    // Parte 3, «la paso a un mapa mental, como el de mi vida ideal».
    nombre: 'mapa',
    voz: 'ducha.mapa',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await abrirMapa('mapas', 'mental')
    `, 1.5),
  },
  {
    // Parte 4, «mi rutina de la mañana la tengo en un diagrama de flujo».
    nombre: 'flujo',
    voz: 'caminar.flujo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await abrirMapa('mapas', 'flujo')
    `, 1.5),
  },
  {
    // Parte 5, «mi lluvia de regalos de fin de año… y de ahí pasó a un mapa con un toque».
    nombre: 'regalos',
    voz: 'lluvia.regalos',
    preparar: PREPARAR_FRENTE,
    // La toma dura lo que la voz: todo rápido (abrir la lluvia, poner el tema y volverla mapa).
    accion: abrirApp((dur) => `
      // La lluvia más reciente de la demo (los regalos de fin de año), en el idioma de la demo.
      const conTema = (await db.ideas.toArray()).filter((i) => i.tema).sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')))
      const tema = conTema[0]?.tema
      const caja = document.querySelector('[data-tut="ideas.diario.lluvia"]')
      caja?.scrollIntoView({ block: 'center' })
      const cab = caja?.querySelector('button')
      if (cab) await tocar(cab)
      await sleep(350)
      const input = caja?.querySelector('input')
      if (input && tema) {
        input.focus()
        escribir(input, tema)
        await sleep(300)
        // El botón junto al campo abre la lluvia con ese tema.
        const abrir = input.parentElement?.querySelector('button')
        if (abrir) await tocar(abrir)
      }
      await sleep(300)
      caja?.scrollIntoView({ block: 'center' })
      ${EN(dur * 0.62)}
      // «a un mapa con un toque»: «Volverla un mapa» la convierte en mapa mental y lo abre.
      const aMapa = [...(caja?.querySelectorAll('button') ?? [])].find((b) => b.textContent.includes(tGlobal('ideas.diario.aMapa', 'Volverla un mapa')))
      if (aMapa) await tocar(aMapa)
    `, 1),
  },
  {
    // Parte 6, «mi matriz de Eisenhower me dice qué hacer ya, qué agendar y qué soltar».
    nombre: 'eisenhower',
    voz: 'limites.eisenhower',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await abrirMapa('diagramas', 'eisenhower')
    `, 1.5),
  },
  {
    // Parte 7, «los pros y contras con su peso, y una matriz de decisión para elegir mi cámara».
    nombre: 'proscontras',
    voz: 'decidir.proscontras',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await abrirMapa('diagramas', 'proscontras')
      ${EN(dur * 0.55)}
      await aLaLista()
      await abrirMapa('diagramas', 'matriz')
    `, 1.5),
  },
  {
    // Parte 8, «cada mapa y cada diagrama trae un ejemplo para verlo funcionando».
    nombre: 'ejemplos',
    voz: 'continuar.ejemplos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('mapas')
      await ver(await esperarTut('ideas.mapas.tipos'))
      ${EN(dur * 0.45)}
      const ej = await esperarTut('ideas.mapas.ejemplo', 4000)
      if (ej) await tocar(ej)
      await sleep(1200)
    `, 1.5),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el osito abre la app de frente y va a sus mapas. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="ideas.tab.diario"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('ideas.tab.diario')
    await sleep(600)
    await pestana('mapas')
  }
  // Que se vean sus mapas antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: el cuarto al centro (el osito está al oeste del escritorio). */
export const ISO = { zoom: 84, dx: 0.4, dz: 0.4, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él (desde el sur, dentro del cuarto). */
export const PLANOS = [
  { yaw: [-0.15, 0.1], dist: [3.0, 2.6], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «Los grandes genios no tenían menos ideas malas»: desde el suroeste; señala.
  { yaw: [-0.65, -0.85], dist: [2.7, 2.4], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y las tuyas se escapan si no las anotas»: desde arriba.
  { yaw: [0.3, 0.1], dist: [2.8, 2.6], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si tener buenas ideas fuera un hábito…?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.15, 0.45], dist: [2.7, 2.4], pitch: [0.42, 0.38] },
]

/** El final de la salida: tercera persona girando por delante del osito (yaw de inicio a fin; nunca a su espalda). */
export const ORBITA_SALIDA = [-0.15, 0.35, 2.8]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * y una subida al alejarse.
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
 * La app 2D en el recuadro del cierre: mientras el osito dice «tu diario de ideas… tus mapas…
 * tus diagramas», la toma pasa por cada pestaña justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['diario', 'mapas', 'diagramas'],
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
  `,
  /** La app en su diario. */
  preparar: `
    await dormir(800)
    const pest = await esperarTut('ideas.tab.diario', 12000)
    if (!pest) return 'no encontré la pestaña del Diario de Ideas'
    pest.click()
    await dormir(800)
    main().scrollTop = 0
  `,
  /** \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. */
  accion: (T) => `
    await hasta(t0, ${T.diario} + 0.3)
    main().scrollTo({ top: 400, behavior: 'smooth' })
    await hasta(t0, ${T.mapas} - 0.8)
    main().scrollTo({ top: 0, behavior: 'smooth' })
    tut('ideas.tab.mapas')?.click()
    await hasta(t0, ${T.diagramas} - 0.8)
    tut('ideas.tab.diagramas')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al osito (miniaturas.mjs). */
export const MINIATURA = { objeto: '💡' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «se escapan si no las anotas»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
