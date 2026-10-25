// Lo propio de la guía de Viajes en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el osito, en la sala de Viajes) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el OSITO (el cuerpo prediseñado de la app) vestido de piloto, con la casa en el tema del
// AVIÓN y el mapa recortado al cuadrante A1 (pedidos del usuario).
//
// La sala de Viajes está en la PLANTA BAJA de la demo (casa.mjs la graba con la casa explotada):
// el globo terráqueo en la esquina noroeste (abre la app), la chimenea con su mueble al centro del
// muro norte, el sofá al sur mirando al norte y la escalera de caracol del lado oeste. La cámara iso
// mira desde el sureste: el osito va al este de la chimenea, de cara al sur, con las cámaras dentro
// del cuarto, del lado sur. El tablero con la pregunta (un corcho con un mapa de viajes) se arma EN
// VIVO (ENTRADAS, idempotente) en el muro NORTE, hacia la esquina noreste (regla del usuario: contra
// la pared, en una esquina, nunca frente a una puerta: las del cuarto están al sureste).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Osito» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'osito'
/** Vestido de piloto (los colores de ATUENDO_POR_TEMA.avion, en las prendas que lleva el osito): casa.mjs se lo pone al cuerpo. */
export const ROPA = {
  sombrero: { color: '#1e3a8a' },
  camisa: { color: '#6b4226' },
  pantalon: { color: '#1e293b' },
  tenis: { color: '#111827' },
  mochila: { color: '#6b4226' },
}
/** El avión, toda la guía, recortado al cuadrante A1. */
export const TEMA = 'avion'
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo: grande, pero sin tapar al osito (el primer plano arranca lejos). */
export const TITULO_ESCALA = 0.8
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'

/** El osito en el piso del cuarto y `window.__via` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const globo = useDiseño.getState().objetos.find((x) => x.plantillaId === 'sala')
  if (!globo) return 'SIN el objeto de Viajes en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[globo.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(globo.roomId)
  window.__via = { cuarto: globo.roomId, rx, rz, globo: globo.id }
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
      const cerca = (o) => {
        o.updateWorldMatrix(true, false)
        const [x, , z] = o.matrixWorld.elements.slice(12, 15)
        return Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 1
      }
      window.__r3f().scene.traverse((m) => {
        // Las mangas de la ropa cuelgan de su propio pivote de hombro (PivoteMarcha de Prendas.tsx,
        // «brazoDer»/«brazoIzq»), que la app solo gira en x al caminar: giran con el brazo.
        if (m.isGroup && /^brazo(Der|Izq)$/.test(m.name)) { if (cerca(m)) r.push(m); return }
        if (!m.isMesh || m.geometry.type !== 'BoxGeometry') return
        const p = m.geometry.parameters
        if (Math.abs(p.width - 0.2) > 0.001 || Math.abs(p.height - 0.6) > 0.001 || Math.abs(p.depth - 0.26) > 0.001) return
        if (cerca(m)) r.push(m.parent)
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

/** Su sitio: al este de la chimenea, entre ella y el sofá, de cara al sur (coordenadas del cuarto). */
const SITIO = { x: 1.35, z: -0.6 }

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
  // El marcador de entrada que flota sobre el globo: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + globo.x, rz + globo.z]
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
 * ±2,82): en el muro NORTE, hacia la esquina noreste (al este de la chimenea), mirando al sur.
 */
const TABLERO = { x: 1.95, z: -2.79, rotY: 0 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de la guía, un corcho con
 * la pregunta y un mapa de viajes (mar, continentes y chinchetas). Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = globo.roomId
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/viajes'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    // Las tierras del mapa: [x, y, ancho, alto] sobre el mar.
    const tierras = [[-0.33, -0.08, 0.2, 0.26], [-0.25, -0.3, 0.12, 0.2], [0.02, -0.06, 0.14, 0.14], [0.06, -0.26, 0.13, 0.22], [0.3, -0.1, 0.28, 0.2], [0.38, -0.32, 0.12, 0.08]]
    // Chinchetas rojas (visitados) y ámbar (por conocer), como los pines de la app.
    const pines = [['#ef4444', -0.3, -0.04], ['#ef4444', 0.04, -0.1], ['#f59e0b', 0.36, -0.08], ['#ef4444', 0.08, -0.28], ['#f59e0b', -0.24, -0.32]]
    const piezas = [
      // El marco y el corcho.
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      // La pregunta.
      { tipo: 'plano', pos: [0, Y + 0.27, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#1e3a8a', texto: ${JSON.stringify(titulo)} },
      // El mapa: el mar y las tierras.
      { tipo: 'caja', pos: [0.02, Y - 0.16, 0.04], tam: [0.98, 0.5, 0.006], color: '#7dd3fc' },
      ...tierras.map(([x, y, w, h]) => ({ tipo: 'caja', pos: [x, Y + y, 0.045], tam: [w, h, 0.006], color: '#4ade80' })),
      ...pines.map(([color, x, y]) => ({ tipo: 'esfera', pos: [x, Y + y, 0.06], tam: [0.025], color })),
      // Un avioncito de papel en la esquina y la marca.
      { tipo: 'caja', pos: [-0.43, Y + 0.1, 0.05], tam: [0.12, 0.03, 0.006], color: '#f8fafc', rot: [0, 0, 0.35] },
      { tipo: 'plano', pos: [0.36, Y - 0.39, 0.042], tam: [0.3, 0.07], color: '#fbbf24', tinta: '#0f172a', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, globo: globo.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): pestañas, vistas y botones de Viajes. */
const EN_LA_APP = `
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = document.querySelector('[data-tut="' + clave + '"]')
      if (el) return el
      await sleep(200)
    }
    return null
  }
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  /** Va a una pestaña de Viajes ('mapa', 'porConocer', 'rutas' o 'bitacora'). */
  const pestana = async (id) => {
    const b = await esperarTut('sala.tab.' + id)
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
  /** Un botón de la app por su texto traducido (\`clave\`, \`es\` = respaldo). */
  const boton = (clave, es) => [...document.querySelectorAll('main button, main [role=tab]')].find((b) => b.textContent.includes(tGlobal(clave, es)))
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
 * El osito, quieto y de frente, abre la app de su cuarto (sin caminar al globo) en el segundo
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
    await esperarTut('sala.tab.mapa')
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
    // Parte 1, «en mi mapamundi tengo un pin por cada lugar donde he estado, y de otro color, los que me faltan».
    nombre: 'mapa',
    voz: 'feliz.mapa',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('mapa')
      await ver(await esperarTut('sala.mapa.mundi'))
      ${EN(dur * 0.55)}
      // Y el mismo mapa en el globo 3D.
      const globo = await esperarTut('sala.mapa.vista.globo', 3000)
      if (globo) await tocar(globo)
    `, 1.5),
  },
  {
    // Parte 2, «en mis rutas pongo los lugares en orden, los veo unidos en el mapa…».
    nombre: 'rutas',
    voz: 'historia.rutas',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('rutas')
      await ver(await esperarTut('sala.rutas'))
      ${EN(dur * 0.5)}
      await deslizar(500, Math.max(2000, (${dur} * 0.4) * 1000))
    `, 1.5),
  },
  {
    // Parte 3, «mi viaje a Japón lo tengo en un plan día a día… y cada fecha aparece sola en mi calendario».
    // El viaje grande de la demo (Japón; en japonés, México) ya está visitado: su plan se abre desde la
    // bitácora (la pestaña Itinerario solo lista los pendientes, como Corea).
    nombre: 'itinerario',
    voz: 'espera.itinerario',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('bitacora')
      const { db } = await modulo('/src/core/data/db.ts')
      const cuenta = {}
      for (const d of await db.diasItinerario.toArray()) cuenta[d.lugarId] = (cuenta[d.lugarId] ?? 0) + 1
      const viaje = (await db.lugaresViaje.toArray()).filter((l) => l.visitado && cuenta[l.id]).sort((a, b) => cuenta[b.id] - cuenta[a.id])[0]
      const album = viaje && (await esperarTut('sala.bitacora.album.' + viaje.pais, 5000))
      if (album) { await ver(album); await tocar(album) }
      const tarjeta = viaje && (await esperarTut('sala.bitacora.lugar.' + viaje.id, 4000))
      if (tarjeta) { await ver(tarjeta); await tocar(tarjeta) }
      await sleep(600)
      // El botón del detalle del lugar, no la pestaña «Itinerario» (mismo texto).
      const plan = [...document.querySelectorAll('main button:not([role=tab])')].find((b) => b.textContent.trim() === tGlobal('sala.bit.itinerario', 'Itinerario'))
      if (plan) await tocar(plan)
      await ver(await esperarTut('sala.pc.hoja', 4000))
      await deslizar(500, Math.max(2000, (${dur} * 0.4) * 1000))
    `, 1.5),
  },
  {
    // Parte 4, «cuando me queda bien, lo guardo y lo comparto con quien viaja conmigo».
    nombre: 'guardados',
    voz: 'itinerario.guardados',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('porConocer')
      await ver(await esperarTut('sala.pc.hoja', 6000))
      ${EN(dur * 0.5)}
      const g = boton('sala.pc.vistaGuardados', 'Itinerarios guardados')
      if (g) { main()?.scrollTo({ top: 0, behavior: 'smooth' }); await sleep(500); await tocar(g) }
    `, 1.5),
  },
  {
    // Parte 5, «los lugares por conocer llevan su fecha; y cuando por fin voy, con un toque pasan a visitados».
    nombre: 'porConocer',
    voz: 'duracion.porConocer',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('mapa')
      const stats = await ver(await esperarTut('sala.mapa.stats'))
      // La tercera estadística despliega la lista de lugares por conocer.
      const pend = stats?.querySelectorAll('button')[2]
      if (pend) await tocar(pend)
      await sleep(600)
      await deslizar(600, Math.max(2000, (${dur} - 4) * 1000))
    `, 1.5),
  },
  {
    // Parte 6, «cada día lleva su presupuesto, y el total se vuelve solo una meta de ahorro en mis Finanzas».
    nombre: 'presupuesto',
    voz: 'dinero.presupuestoApp',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('porConocer')
      const hoja = await ver(await esperarTut('sala.pc.hoja', 6000))
      // La tabla del plan se desliza hacia la columna del presupuesto (la última).
      const t0 = performance.now()
      const ancho = [...(hoja?.querySelectorAll('*') ?? [])].find((e) => e.scrollWidth > e.clientWidth + 40)
      while (ancho && performance.now() - t0 < 2500) { ancho.scrollLeft = (ancho.scrollWidth - ancho.clientWidth) * ((performance.now() - t0) / 2500); await sleep(30) }
      ${EN(dur * 0.6)}
      await deslizar(500, 2000)
    `, 1.5),
  },
  {
    // Parte 7, «en mi bitácora cada país es un álbum, y en cada lugar guardo mis fotos con su anécdota».
    nombre: 'bitacora',
    voz: 'fotos.bitacora',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('bitacora')
      const album = await esperarTut('sala.bitacora', 6000)
      const primero = album?.querySelector('[data-tut^="sala.bitacora.album."]')
      if (primero) { await ver(primero); await tocar(primero) }
      ${EN(dur * 0.55)}
      const lugar = document.querySelector('[data-tut^="sala.bitacora.lugar."]')
      if (lugar) { await ver(lugar); await tocar(lugar) }
    `, 1.5),
  },
  {
    // Parte 8, «con los estados encendidos, cada lugar que conozco se pinta de su color».
    nombre: 'estados',
    voz: 'cambio.estados',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('mapa')
      const caja = [...document.querySelectorAll('main input[type=checkbox]')].find((i) => i.closest('label')?.textContent.includes(tGlobal('sala.mapa.estados', 'Estados')))
      await ver(await esperarTut('sala.mapa.mundi'))
      ${EN(dur * 0.35)}
      if (caja && !caja.checked) await tocar(caja)
    `, 1.5),
  },
  {
    // Parte 9, «mira mi viaje a Japón en la app: está completo, del mapa a la bitácora».
    nombre: 'ejemplos',
    voz: 'continuar.ejemplos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('mapa')
      await ver(await esperarTut('sala.mapa.mundi'))
      ${EN(dur * 0.5)}
      await pestana('bitacora')
      // El viaje grande (el de más días de itinerario): el que nombra la voz, no el primer álbum.
      const { db } = await modulo('/src/core/data/db.ts')
      const cuenta = {}
      for (const d of await db.diasItinerario.toArray()) cuenta[d.lugarId] = (cuenta[d.lugarId] ?? 0) + 1
      const viaje = (await db.lugaresViaje.toArray()).filter((l) => l.visitado && cuenta[l.id]).sort((a, b) => cuenta[b.id] - cuenta[a.id])[0]
      const album = viaje && (await esperarTut('sala.bitacora.album.' + viaje.pais, 5000))
      if (album) { await ver(album); await tocar(album) }
    `, 1.5),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el osito abre la app de frente y se queda en su mapamundi. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="sala.tab.mapa"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('sala.tab.mapa')
    await sleep(600)
    await pestana('mapa')
  }
  // Que se vea su mapa antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: el cuarto al centro (el osito está al este de la chimenea). */
export const ISO = { zoom: 80, dx: -0.4, dz: -1.1, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él (desde el sur, dentro del cuarto). */
export const PLANOS = [
  { yaw: [-0.15, 0.1], dist: [3.0, 2.6], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «La parte más feliz de un viaje casi siempre llega antes de salir»: desde el suroeste; señala.
  { yaw: [-0.65, -0.85], dist: [2.7, 2.4], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y al volver, ese gusto se esfuma en días»: desde arriba.
  { yaw: [0.3, 0.1], dist: [2.8, 2.6], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si pudieras estirarlo de principio a fin?»: la vista del juego.
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
 * La app 2D en el recuadro del cierre: mientras el osito dice «el mapamundi… tu itinerario día a
 * día… tu bitácora», la toma pasa por cada pestaña justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['mapa', 'itinerario', 'bitacora'],
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
  /** La app en su mapamundi. */
  preparar: `
    await dormir(800)
    const pest = await esperarTut('sala.tab.mapa', 12000)
    if (!pest) return 'no encontré la pestaña del Mapa de Viajes'
    pest.click()
    await dormir(800)
    main().scrollTop = 0
  `,
  /** \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. */
  accion: (T) => `
    await hasta(t0, ${T.mapa} + 0.3)
    main().scrollTo({ top: 300, behavior: 'smooth' })
    await hasta(t0, ${T.itinerario} - 0.8)
    main().scrollTo({ top: 0, behavior: 'smooth' })
    tut('sala.tab.porConocer')?.click()
    await hasta(t0, ${T.bitacora} - 0.8)
    tut('sala.tab.bitacora')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al osito (miniaturas.mjs). */
export const MINIATURA = { objeto: '✈️' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «ese gusto se esfuma en días»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
