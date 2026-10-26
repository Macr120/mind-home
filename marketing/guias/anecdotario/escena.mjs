// Lo propio de la guía del Anecdotario en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el osito, en el cuarto del Anecdotario) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el OSITO (el cuerpo prediseñado de la app) vestido de marinero, con la casa en el tema del
// BARCO PIRATA y el mapa recortado al cuadrante A1 (pedidos del usuario).
//
// El cuarto del Anecdotario está en el PISO DE ARRIBA de la demo (casa.mjs lo graba con la casa
// apilada): el escritorio con su silla en la esquina noroeste (la hoja sobre él abre la app), una
// cómoda y una maceta al noreste, la estantería al sureste y una lámpara al suroeste. El norte es la
// barandilla del barco (sin muro: se ve el mar); los muros oeste, sur y este tienen puerta al centro.
// La cámara iso mira desde el sureste: el osito va al centro del cuarto, de cara al sur, con las
// cámaras dentro del cuarto, del lado sur. El tablero con la pregunta (un corcho con fotos y una
// libreta) se arma EN VIVO (ENTRADAS, idempotente) en el muro OESTE, en la esquina noroeste, sobre el
// escritorio (regla del usuario: contra la pared, en una esquina, nunca frente a una puerta).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Osito» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'osito'
/** Vestido de marinero pirata (los colores de ATUENDO_POR_TEMA.pirata, en las prendas que lleva el osito): casa.mjs se lo pone al cuerpo. */
export const ROPA = {
  sombrero: { color: '#111111' },
  camisa: { color: '#7f1d1d' },
  pantalon: { color: '#3f2a1a' },
  tenis: { color: '#1c1917' },
}
/** El barco pirata, toda la guía, recortado al cuadrante A1. */
export const TEMA = 'pirata'
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo: grande, pero sin tapar al osito (el primer plano arranca lejos). */
export const TITULO_ESCALA = 0.8
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'

/** El osito en el piso del cuarto y `window.__anc` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const hoja = useDiseño.getState().objetos.find((x) => x.plantillaId === 'anecdotario')
  if (!hoja) return 'SIN el objeto del Anecdotario en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[hoja.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(hoja.roomId)
  window.__anc = { cuarto: hoja.roomId, rx, rz, hoja: hoja.id }
  await (await modulo('/src/demo/construir.ts')).construirAppDemo('anecdotario')
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
        // Las mangas de la ropa cuelgan de su propio pivote de hombro (PivoteMarcha de Prendas.tsx): giran con el brazo.
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

/** Su sitio: al centro del cuarto, delante del escritorio, de cara al sur (coordenadas del cuarto). */
const SITIO = { x: -0.4, z: -0.4 }

/** Llega caminando hacia el sur (de cara a la cámara) hasta su sitio. */
const A_SU_SITIO = `
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.5)
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
  // El marcador de entrada que flota sobre el escritorio: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + hoja.x, rz + hoja.z]
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
 * ±2,82): en el muro OESTE, en la esquina noroeste (sobre el escritorio), mirando al este.
 */
const TABLERO = { x: -2.79, z: -1.95, rotY: 90 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de la guía, un corcho con
 * la pregunta, fotos clavadas y una libreta. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = hoja.roomId
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/anecdotario'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.65
    // Fotos clavadas (marco blanco y la imagen de color) y sus chinchetas.
    const fotos = [[-0.36, -0.12, '#38bdf8', 0.12], [-0.12, -0.16, '#f59e0b', -0.08], [0.12, -0.11, '#22c55e', 0.1]]
    const piezas = [
      // El marco de madera y el corcho.
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#5b3a1e' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      // La pregunta.
      { tipo: 'plano', pos: [0, Y + 0.27, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#7f1d1d', texto: ${JSON.stringify(titulo)} },
      ...fotos.flatMap(([x, y, color, giro]) => [
        { tipo: 'caja', pos: [x, Y + y, 0.04], tam: [0.2, 0.22, 0.006], color: '#f8fafc', rot: [0, 0, giro] },
        { tipo: 'caja', pos: [x, Y + y + 0.02, 0.045], tam: [0.16, 0.14, 0.006], color, rot: [0, 0, giro] },
        { tipo: 'esfera', pos: [x, Y + y + 0.1, 0.055], tam: [0.02], color: '#ef4444' },
      ]),
      // La libreta abierta a la derecha y la marca.
      { tipo: 'caja', pos: [0.38, Y - 0.12, 0.04], tam: [0.24, 0.3, 0.008], color: '#fef3c7' },
      { tipo: 'caja', pos: [0.38, Y - 0.07, 0.046], tam: [0.17, 0.012, 0.004], color: '#94a3b8' },
      { tipo: 'caja', pos: [0.38, Y - 0.12, 0.046], tam: [0.17, 0.012, 0.004], color: '#94a3b8' },
      { tipo: 'caja', pos: [0.38, Y - 0.17, 0.046], tam: [0.17, 0.012, 0.004], color: '#94a3b8' },
      { tipo: 'plano', pos: [-0.3, Y - 0.37, 0.042], tam: [0.3, 0.07], color: '#fbbf24', tinta: '#0f172a', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, hoja: hoja.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): formulario, calendario de ánimo, día y lista del Anecdotario. */
const EN_LA_APP = `
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = [...document.querySelectorAll('[data-tut="' + clave + '"]')].find((e) => e.offsetParent !== null)
      if (el) return el
      await sleep(200)
    }
    return null
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
  const ver = async (el, block = 'center') => {
    el?.scrollIntoView({ behavior: 'smooth', block })
    await sleep(800)
    return el
  }
  /** Las caritas de ánimo del formulario (los primeros botones del formulario). */
  const caritas = () => [...(document.querySelector('[data-tut="anecdotario.form"]')?.querySelectorAll('button[type=button]') ?? [])].filter((b) => b.textContent.trim().length <= 3)
  /** Las celdas del calendario con recuerdo (botones activos con su día). */
  const diasConRecuerdo = () => [...(document.querySelector('[data-tut="anecdotario.calendario"]')?.querySelectorAll('button.aspect-square:not([disabled])') ?? [])]
  /** Las flechas del mes (los dos primeros botones del calendario). */
  const mesAnterior = () => [...(document.querySelector('[data-tut="anecdotario.calendario"]')?.querySelectorAll('button:not(.aspect-square)') ?? [])][0]
  /** La primera foto de la lista de recuerdos. */
  const primeraFoto = () => document.querySelector('[data-tut="anecdotario.lista"] img')
  /** Abre carpetas cerradas del historial (semana a semana) hasta que aparezca una foto. */
  const abrirHastaFoto = async () => {
    for (let i = 0; i < 10 && !primeraFoto(); i++) {
      const cerrada = document.querySelector('[data-tut="anecdotario.lista"] button[aria-expanded="false"]')
      if (!cerrada) break
      cerrada.click()
      await sleep(250)
    }
    return primeraFoto()
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
  useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.6, pitch: 0.42 })
`
/**
 * El osito, quieto y de frente, abre la app de su cuarto (sin caminar al escritorio) en el
 * segundo `abre` de la voz; `luego(dur)` = lo que hace en la app mientras sigue la voz.
 */
const abrirApp = (luego, abre = 1.5) => (dur) => `
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
    await esperarTut('anecdotario.app')
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
    // El corcho del muro oeste en la vista iso; el osito se aparta de él hacia la cámara y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 0.7, bz + 1.3)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.9, y + 1.0, bz + 0.9], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.6, y + 1.3, bz + 0.5], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      // Del corcho hacia la cámara (al sureste, lejos de la silla del escritorio): de frente, nunca de espaldas.
      await irA(bx + 1.6, bz + 1.6, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al corcho: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.65, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «cada noche escribo en mi anecdotario: un título para el día, lo que pasó y una carita con cómo me sentí».
    nombre: 'escribo',
    voz: 'olvido.escribo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.form'), 'start')
      ${EN(dur * 0.6)}
      const c = caritas()
      if (c[0]) await tocar(c[0])
    `),
  },
  {
    // Parte 2, «en mi calendario, cada día con recuerdo se pinta del color de mi ánimo».
    nombre: 'calendario',
    voz: 'historia.calendario',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.calendario'))
      ${EN(dur * 0.6)}
      const atras = mesAnterior()
      if (atras) await tocar(atras)
    `),
  },
  {
    // Parte 3, «cuando quiero volver a un día, lo toco en el calendario y ahí está, tal como lo escribí».
    nombre: 'dia',
    voz: 'fieles.dia',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.calendario'))
      const dias = diasConRecuerdo()
      const d = dias[Math.max(0, dias.length - 3)]
      if (d) await tocar(d)
      await ver(await esperarTut('anecdotario.dia', 3000), 'start')
    `),
  },
  {
    // Parte 4, «en cada recuerdo guardo sus fotos; con un toque las veo en grande».
    nombre: 'fotosApp',
    voz: 'quedan.fotosApp',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await esperarTut('anecdotario.lista')
      await sleep(600)
      await ver(await abrirHastaFoto())
      ${EN(dur * 0.5)}
      const f = primeraFoto()
      if (f) await tocar(f)
    `),
  },
  {
    // Parte 5, «a cada recuerdo le pongo cómo me sentí con una carita: feliz, tranquilo, cansado…».
    nombre: 'animo',
    voz: 'despertar.animo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.form'), 'start')
      const c = caritas()
      for (const i of [0, 2, 4, 1]) {
        if (c[i]) await tocar(c[i])
        await sleep(Math.max(700, (${dur} * 1000 - 3000) / 4))
      }
    `),
  },
  {
    // Parte 6, «cuando tengo un mal día, abro mi anecdotario y bajo por mis recuerdos hasta encontrar uno bueno».
    nombre: 'lista',
    voz: 'feliz.lista',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.lista'), 'start')
      await deslizar(900, Math.max(2500, (${dur} - 3.5) * 1000))
    `),
  },
  {
    // Parte 7, «al pasar los meses en mi calendario veo cuántos días tienen recuerdo, y mi año se va llenando».
    nombre: 'anio',
    voz: 'contar.anio',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.calendario'))
      for (let i = 0; i < 3; i++) {
        await sleep(Math.max(900, (${dur} * 1000 - 3500) / 3))
        const atras = mesAnterior()
        if (atras) await tocar(atras)
      }
    `),
  },
  {
    // Parte 8, «mira mi anecdotario en la app: tiene un año entero de recuerdos».
    nombre: 'ejemplos',
    voz: 'continuar.ejemplos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await ver(await esperarTut('anecdotario.calendario'))
      ${EN(dur * 0.4)}
      await ver(await esperarTut('anecdotario.lista'), 'start')
      await deslizar(600, 2500)
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el osito abre la app de frente y se queda en su calendario. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="anecdotario.app"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('anecdotario.app')
    await sleep(600)
    await ver(await esperarTut('anecdotario.calendario'))
  }
  // Que se vea su calendario antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: el cuarto al centro (el osito está un poco al noroeste del centro). */
export const ISO = { zoom: 80, dx: 0.4, dz: 0.4, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él (desde el sur, dentro del cuarto). */
export const PLANOS = [
  { yaw: [-0.15, 0.1], dist: [2.9, 2.5], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «De lo que vives esta semana, en unos años olvidarás casi todo»: desde el suroeste; señala.
  { yaw: [-0.65, -0.85], dist: [2.6, 2.3], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y lo que sí recuerdes, tu mente lo irá cambiando»: desde arriba, con el mar detrás.
  { yaw: [0.3, 0.1], dist: [2.7, 2.5], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si pudieras guardarlo tal como fue?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.15, 0.4], dist: [2.6, 2.3], pitch: [0.42, 0.38] },
]

/** El final de la salida: tercera persona girando por delante del osito (yaw de inicio a fin; nunca a su espalda). */
export const ORBITA_SALIDA = [-0.15, 0.35, 2.6]

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
 * La app 2D en el recuadro del cierre: mientras el osito dice «un recuerdo cada día… el
 * calendario… tus fotos», la toma pasa por cada parte justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['recuerdo', 'calendario', 'fotos'],
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
    /** Abre carpetas cerradas del historial hasta que aparezca una foto. */
    const abrirHastaFoto = async () => {
      const foto = () => document.querySelector('[data-tut="anecdotario.lista"] img')
      for (let i = 0; i < 10 && !foto(); i++) {
        const cerrada = document.querySelector('[data-tut="anecdotario.lista"] button[aria-expanded="false"]')
        if (!cerrada) break
        cerrada.click()
        await dormir(250)
      }
      return foto()
    }
    /** Desliza el contenido hasta un elemento. */
    const irA = (el, bloque = 'start') => el?.scrollIntoView({ behavior: 'smooth', block: bloque })
  `,
  /** La app en su formulario. */
  preparar: `
    await dormir(800)
    const app = await esperarTut('anecdotario.app', 20000)
    if (!app) return 'no encontré la app del Anecdotario'
    // Las fotos del historial, ya a la vista en su carpeta (se abre antes, fuera de cuadro).
    await abrirHastaFoto()
    main().scrollTop = 0
  `,
  /** \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. */
  accion: (T) => `
    await hasta(t0, ${T.recuerdo} - 0.6)
    irA(tut('anecdotario.form'))
    await hasta(t0, ${T.calendario} - 0.8)
    irA(tut('anecdotario.calendario'))
    await hasta(t0, ${T.fotos} - 0.8)
    irA(document.querySelector('[data-tut="anecdotario.lista"] img'), 'center')
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al osito (miniaturas.mjs). */
export const MINIATURA = { objeto: '📔' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «tu mente lo irá cambiando»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
