// Lo propio de la guía de Hobbies en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el alien, en el cuarto de Hobbies) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el ALIEN de AMARILLO (el cuerpo prediseñado de la app), con la casa en el tema del
// TREN, solo el cuadrante A1 a la vista y la música de la guía de Matemáticas (pedidos del usuario).
//
// El cuarto de Hobbies está en la PLANTA BAJA de la demo: el piano al noroeste (abre la app),
// su banco delante, un banco de trabajo con su caja de herramientas al norte, una estantería
// al noreste y puertas en los muros norte y este. Sus entradas extra se arman EN VIVO
// (ENTRADAS, idempotente): un tablero de corcho con la pregunta en el tramo recto del muro oeste,
// hacia la esquina noroeste, junto al piano (abre la guía web; regla del usuario: tableros contra
// la pared, nunca frente a una puerta). La esquina suroeste de la casa es CURVA: lo que estaba ahí
// (la mesita con la libreta) se corre hacia dentro del cuarto.
// El narrador abre la app de frente, sin caminar de espaldas a la cámara (pedido del usuario).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Alien» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'alien'
/** De amarillo: sus tres verdes (torso, cadera y cabeza) pasan a tonos de amarillo. */
export const CUERPO_COLORES = { '#7ec86a': '#facc15', '#5fa94f': '#ca8a04', '#8ed67a': '#fde047' }
/** La casa sobre el tren, toda la guía. */
export const TEMA = 'tren'
/** Solo el cuadrante A1 del mapa a la vista (el bloque automático `auto-0-0`). */
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo, más chico para que no tape al alien (pedido del usuario). */
export const TITULO_ESCALA = 0.62
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'
/** La música de la guía de Matemáticas (pedido del usuario). */
export const MUSICA_LISTA = 'matematicas.json'

/** El alien en el piso del cuarto y `window.__hob` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const piano = useDiseño.getState().objetos.find((x) => x.plantillaId === 'hobbies')
  if (!piano) return 'SIN el objeto de Hobbies en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[piano.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(piano.roomId)
  window.__hob = { cuarto: piano.roomId, rx, rz, piano: piano.id }
`

/**
 * Los gestos del alien: su cuerpo de piezas no tiene emotes, pero sus brazos (cajas de
 * 0,2 × 0,6 × 0,26) giran desde el hombro. Un bucle les suma la apertura según
 * `window.__gestoAlien` ('explica', 'senala' o null = quietos); los vuelve a buscar si
 * React remonta el avatar.
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

/**
 * Su sitio: al norte del cuarto, de cara al sur (coordenadas del cuarto). El cuarto da al costado
 * sur del vagón del tren: más al sur, la cámara de tercera persona se salía del vagón y su pared
 * roja lo tapaba; por eso además la cámara va a 2,6 m y no a 3.
 */
const SITIO = { x: -0.4, z: -1.1 }

/** El alien de pie en su sitio, explicando: llega caminando hacia el frente (de cara a la cámara). */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.6)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre el piano: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + piano.x, rz + piano.z]
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
 * El tablero de la guía (coordenadas del cuarto; con celda 6 la cara de los muros queda a
 * ±2,82): en el tramo RECTO del muro oeste (sin puerta), hacia la esquina noroeste, junto al
 * piano, mirando al este. La esquina suroeste de la casa es curva: ahí el tablero quedaba fuera.
 */
const TABLERO = { x: -2.79, z: -0.9, rotY: 90 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de corcho de la guía
 * (la pregunta y fotos de pasatiempos clavadas). Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = piano.roomId
  // La lámpara de pie: en la demo cae fuera, en la curva de la esquina suroeste; va al tramo recto
  // del muro oeste, al sur del tablero.
  const lampara = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:31')
  if (lampara && Math.hypot(lampara.x + 2.45, lampara.z - 0.25) > 0.05) await ds.setObjetoPose(lampara.id, -2.45, 0.25, lampara.rotY ?? 0)
  // La mesita con la libreta y la pluma de la esquina suroeste: la curva de la casa la dejaba
  // medio fuera; se corre hacia dentro del cuarto (las tres piezas juntas).
  for (const [tipo, nombre, x, z] of [['libreta', '', -1.15, 1.55], ['piezas', 'Libreta', -1.15, 1.6], ['piezas', 'Pluma', -0.99, 1.67]]) {
    const o = useDiseño.getState().objetos.find((v) => v.roomId === cuarto && v.tipo === tipo && (nombre ? v.nombre === nombre : true))
    if (o && Math.hypot(o.x - x, o.z - z) > 0.05) await ds.setObjetoPose(o.id, x, z, o.rotY ?? 0)
  }
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/hobbies'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    // Fotos de pasatiempos clavadas: marcos blancos con un color dentro y una chincheta.
    const fotos = [
      [-0.38, Y - 0.14, '#f97316'],
      [-0.05, Y - 0.17, '#22c55e'],
      [0.28, Y - 0.12, '#3b82f6'],
      [-0.22, Y - 0.36, '#a855f7'],
      [0.12, Y - 0.37, '#facc15'],
    ].flatMap(([x, y, c]) => [
      { tipo: 'caja', pos: [x, y, 0.045], tam: [0.24, 0.18, 0.006], color: '#ffffff' },
      { tipo: 'caja', pos: [x, y - 0.01, 0.049], tam: [0.2, 0.12, 0.004], color: c },
      { tipo: 'caja', pos: [x, y + 0.075, 0.053], tam: [0.025, 0.025, 0.01], color: '#ef4444' },
    ])
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      { tipo: 'plano', pos: [0, Y + 0.28, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#4c1d95', texto: ${JSON.stringify(titulo)} },
      ...fotos,
      { tipo: 'plano', pos: [0.36, Y - 0.39, 0.042], tam: [0.3, 0.07], color: '#facc15', tinta: '#1f2937', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, piano: piano.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): espera elementos por su `data-tut` y entra al primer pasatiempo. */
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
  /**
   * Espera a que cargue la app y, si quedó dentro de un pasatiempo, vuelve a la lista con el
   * «Volver» del detalle (nunca con el del cuarto, que cerraría la app).
   */
  const aLaLista = async () => {
    for (let i = 0; i < 60 && !document.querySelector('[data-tut="hobbies.agregar"], [data-tut="hobbies.detalle.stats"]'); i++) await sleep(200)
    for (let i = 0; i < 3 && !document.querySelector('[data-tut="hobbies.agregar"]'); i++) {
      const volver = [...document.querySelectorAll('button')].find((b) => b.title === tGlobal('hobbies.det.volver', 'Volver') && b.closest('main') && !b.closest('[data-tut="room.header"]') && b.dataset.tut !== 'room.volver')
      if (volver) await tocar(volver)
      await sleep(700)
    }
  }
  /** Entra al primer pasatiempo de la lista (el piano en la demo). */
  const abrirPrimero = async () => {
    await esperarTut('hobbies.lista')
    await sleep(500)
    const item = document.querySelector('[data-tut^="hobbies.item."]')
    if (item) await tocar(item)
    await esperarTut('hobbies.detalle.stats', 6000)
    await sleep(700)
  }
  const verTut = async (clave) => {
    const el = await esperarTut(clave, 4000)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(900)
    return el
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

/** El alien en su sitio, de cara a la cámara (pedido del usuario: nunca de espaldas). */
const PREPARAR_FRENTE = `
  ${EN_EL_CUARTO}
  ${SOLTAR_GESTO}
  await teletransportar(rx + ${SITIO.x}, rz + ${SITIO.z} - 0.6)
  await irA(rx + ${SITIO.x}, rz + ${SITIO.z}, 0.12)
  await sleep(300)
  ${gesto('senala')}
  useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.6, pitch: 0.42 })
`
/**
 * El alien, quieto y de frente, abre la app de su cuarto (sin caminar al piano) en el segundo
 * `abre` de la voz; `luego(dur)` = lo que hace en la app mientras sigue la voz.
 */
const abrirApp = (luego, abre = 2) => (dur) => `
  ${VOZ}
  ${girar(-0.3, -0.05, Math.round(abre * 1000) + 400, 2.6, 2.4, 0.42, 0.4)}
  ${EN(abre)}
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(300)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await aLaLista()
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
    // El tablero del muro oeste en la vista iso; el alien se aparta de él hacia la cámara y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 0.5, bz)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.9, y + 1.0, bz + 0.2], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.5, y + 1.3, bz], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      // Del tablero hacia la cámara (al sureste): de frente, nunca de espaldas.
      await irA(bx + 1.15, bz + 0.45, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al tablero: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «llevo los míos: el piano y la astrofotografía»: la lista de pasatiempos.
    nombre: 'lista',
    voz: 'porque.lista',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `await esperarTut('hobbies.lista')`),
  },
  {
    // Parte 2, «cuando quiero probar uno nuevo, aquí lo agrego»: el formulario de un pasatiempo nuevo.
    nombre: 'nuevo',
    voz: 'encontrar.nuevo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      const agregar = await esperarTut('hobbies.agregar')
      await sleep(900)
      if (agregar) await tocar(agregar)
    `),
  },
  {
    // Parte 3, «aquí solo apunto cuánto toqué y una nota»: el piano y sus sesiones.
    nombre: 'sesiones',
    voz: 'sirve.sesiones',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await abrirPrimero()
      ${EN(dur * 0.45)}
      await verTut('hobbies.detalle.sesiones')
    `),
  },
  {
    // Parte 4, «registro la sesión con un toque»: el formulario de la sesión.
    nombre: 'sesion',
    voz: 'tiempo.sesion',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await abrirPrimero()
      await verTut('hobbies.sesion.form')
    `),
  },
  {
    // Parte 5, «cada pasatiempo puede tener sus proyectos»: los proyectos del piano y uno abierto.
    nombre: 'proyectosCasa',
    voz: 'proyectos.proyectosCasa',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await abrirPrimero()
      await verTut('hobbies.detalle.proyectos')
      ${EN(dur * 0.6)}
      const p = document.querySelector('[data-tut^="hobbies.proyecto.item."]')
      if (p) await tocar(p)
    `),
  },
  {
    // Parte 6, «una meta de cuatro días por semana… la fila de la semana»: la meta semanal del piano.
    nombre: 'semanaCasa',
    voz: 'mantener.semanaCasa',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await abrirPrimero()
      await verTut('hobbies.meta.semanal')
    `),
  },
  {
    // Parte 8, «mira tu calendario de cuadritos»: el año del piano.
    nombre: 'ano',
    voz: 'continuar.ano',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await abrirPrimero()
      await verTut('hobbies.detalle.heatmap')
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el alien abre la app de frente y entra al piano. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="hobbies.lista"], [data-tut="hobbies.agregar"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await aLaLista()
    await abrirPrimero()
  }
  // Que se vea el pasatiempo antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde el alien (en (−0,4, −1,1) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: 0.4, dz: 1.1, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él. */
export const PLANOS = [
  { yaw: [-0.2, -0.45], dist: [2.8, 2.5], pitch: [0.44, 0.4] }, // de frente, acercándose
  // «Casi todos tenemos unas cinco horas libres al día»: desde el suroeste; señala.
  { yaw: [-0.8, -1.0], dist: [2.7, 2.4], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y más de la mitad se nos va frente a la tele»: desde arriba, más lejos.
  { yaw: [-0.45, -0.25], dist: [2.9, 2.6], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Qué pasaría si una parte fuera para algo que te encanta?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [-0.3, -0.6], dist: [2.7, 2.4], pitch: [0.42, 0.38] },
]

/**
 * El final de la salida: tercera persona girando por delante del alien (yaw de inicio a fin; nunca a
 * su espalda) y a 2,5 m (el tercer valor): a la distancia de siempre la cámara se salía del vagón del tren.
 */
export const ORBITA_SALIDA = [-0.15, -0.5, 2.5]

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
 * La app 2D en el recuadro del cierre: mientras el alien dice «tus pasatiempos… tus sesiones…
 * tu año», la toma pasa por cada cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['pasatiempos', 'sesiones', 'ano'],
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
  /** La app en la lista de pasatiempos. */
  preparar: `
    await dormir(800)
    if (!(await esperarTut('hobbies.lista', 12000))) return 'no encontré la lista de Hobbies'
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Pasatiempos: la lista;
   * sesiones: el piano con sus sesiones; año: su calendario de cuadritos.
   */
  accion: (T) => `
    await hasta(t0, ${T.sesiones} - 1.4)
    document.querySelector('[data-tut^="hobbies.item."]')?.click()
    await esperarTut('hobbies.detalle.stats')
    await dormir(400)
    tut('hobbies.detalle.sesiones')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await hasta(t0, ${T.ano} - 0.6)
    tut('hobbies.detalle.heatmap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al alien (miniaturas.mjs). */
export const MINIATURA = { objeto: '🎸' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «más de la mitad se nos va frente a la tele»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
