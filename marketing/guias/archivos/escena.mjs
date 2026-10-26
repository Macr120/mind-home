// Lo propio de la guía de Archivo en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el astronauta, en el cuarto de Archivo) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el ASTRONAUTA (el cuerpo prediseñado de la app), con la casa en el tema de la NAVE
// ESPACIAL y el mapa recortado al cuadrante A1 (pedidos del usuario).
//
// El cuarto de Archivo está en la PLANTA BAJA de la demo, en el ala del Studio (casa.mjs lo graba
// con la casa explotada): dos estanterías contra el muro norte (la del oeste abre la app), cajas
// en las esquinas oeste, el escritorio con su monitor y su silla al este y una maceta en la esquina
// noreste. Las CUATRO paredes tienen puerta al centro. La cámara iso mira desde el sureste: el
// astronauta va delante de las estanterías, de cara al sur, con las cámaras dentro del cuarto, del
// lado sur. El tablero con la pregunta (un panel con carpetas de colores) se arma EN VIVO
// (ENTRADAS, idempotente) en el muro OESTE, en la esquina suroeste, sobre las cajas (regla del
// usuario: contra la pared, en una esquina, nunca frente a una puerta). En la esquina noreste lo
// tapaba el muro exterior del este en la vista iso.
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Astronauta» (CUERPOS_PRESET en src/core/house/cuerpos.ts); el traje es su ropa. */
export const CUERPO = 'astronauta'
/** La nave espacial, toda la guía, recortada al cuadrante A1. */
export const TEMA = 'nave'
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo: grande, pero sin tapar al astronauta (el primer plano arranca lejos). */
export const TITULO_ESCALA = 0.8
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'

/** El astronauta en el piso del cuarto, `window.__arc` con el origen del cuarto y la app de Archivo ya sembrada en la demo. */
const EN_EL_CUARTO = `
  const estante = useDiseño.getState().objetos.find((x) => x.plantillaId === 'archivos')
  if (!estante) return 'SIN el objeto de Archivo en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[estante.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(estante.roomId)
  window.__arc = { cuarto: estante.roomId, rx, rz, estante: estante.id }
  // Los archivos de ejemplo se siembran la primera vez que se abre el cuarto (unos 7 s): aquí, fuera de cámara.
  await (await modulo('/src/demo/construir.ts')).construirAppDemo('archivos')
`

/**
 * Los gestos del astronauta: su cuerpo de piezas no tiene emotes, pero sus brazos (cajas de
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

/** Su sitio: delante de las estanterías, al oeste del escritorio, de cara al sur (coordenadas del cuarto). */
const SITIO = { x: -0.6, z: -0.3 }

/** Llega caminando hacia el sur (de cara a la cámara) hasta su sitio. */
const A_SU_SITIO = `
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.5)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
`

/** El astronauta de pie en su sitio, explicando. */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  ${A_SU_SITIO}
  await sleep(500)
  // El marcador de entrada que flota sobre la estantería: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + estante.x, rz + estante.z]
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
 * ±2,82): en el muro OESTE, en la esquina suroeste (sobre las cajas), mirando al este.
 */
const TABLERO = { x: -2.79, z: 1.95, rotY: 90 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de la guía, un panel con
 * la pregunta y cinco carpetas de colores. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = estante.roomId
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/archivos'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    // Cinco carpetas (como las de la guía): el cuerpo y su pestaña, en fila.
    const carpetas = ['#38bdf8', '#f59e0b', '#22c55e', '#a855f7', '#ef4444']
    const piezas = [
      // El marco metálico y el panel azul noche.
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#94a3b8' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#0f2a44' },
      // La pregunta.
      { tipo: 'plano', pos: [0, Y + 0.27, 0.042], tam: [1.02, 0.22], color: '#e0f2fe', tinta: '#0c4a6e', texto: ${JSON.stringify(titulo)} },
      ...carpetas.flatMap((color, i) => {
        const x = -0.4 + i * 0.2
        return [
          { tipo: 'caja', pos: [x, Y - 0.12, 0.045], tam: [0.16, 0.12, 0.008], color },
          { tipo: 'caja', pos: [x - 0.035, Y - 0.05, 0.045], tam: [0.07, 0.03, 0.008], color },
        ]
      }),
      // Una línea de «archivos» bajo las carpetas y la marca.
      { tipo: 'caja', pos: [-0.12, Y - 0.27, 0.045], tam: [0.62, 0.025, 0.006], color: '#7dd3fc' },
      { tipo: 'plano', pos: [0.36, Y - 0.37, 0.042], tam: [0.3, 0.07], color: '#fbbf24', tinta: '#0f172a', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#0f2a44', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, estante: estante.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): menú, carpetas, archivos y visor de Archivo. */
const EN_LA_APP = `
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = [...document.querySelectorAll('[data-tut="' + clave + '"]')].find((e) => e.offsetParent !== null)
      if (el) return el
      await sleep(200)
    }
    return null
  }
  /** Una sección del menú (la del lateral o, si el panel es angosto, su chip). */
  const menu = async (clave) => {
    const b = (await esperarTut('archivos.menu.' + clave, 2500)) ?? (await esperarTut('archivos.chip.' + clave, 2500))
    if (b) await tocar(b)
    await sleep(900)
  }
  /** Abre una carpeta o un archivo de la vista (doble clic, como en el escritorio). */
  const abrir = async (tut) => {
    const el = await esperarTut('archivos.item.' + tut, 6000)
    if (!el) return
    await ver(el)
    await tocar(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await sleep(1000)
  }
  const cerrarVisor = async () => {
    const x = await esperarTut('archivos.visor.cerrar', 2000)
    if (x) await tocar(x)
    await sleep(700)
  }
  /** Escribe en un input letra por letra (React escucha el evento input). */
  const escribir = async (input, texto) => {
    const fijar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    for (let i = 1; i <= texto.length; i++) {
      fijar.call(input, texto.slice(0, i))
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await sleep(140)
    }
  }
  const ver = async (el) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(700)
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

/** El astronauta en su sitio, de cara a la cámara (pedido del usuario: nunca de espaldas). */
const PREPARAR_FRENTE = `
  ${EN_EL_CUARTO}
  ${SOLTAR_GESTO}
  ${A_SU_SITIO}
  await sleep(300)
  ${gesto('senala')}
  useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.6, pitch: 0.42 })
`
/**
 * El astronauta, quieto y de frente, abre la app de su cuarto (sin caminar a la estantería) en el
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
    await esperarTut('archivos.explorador')
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
    // El panel del muro oeste en la vista iso; el astronauta se aparta de él hacia la cámara y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 0.6, bz - 0.9)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.9, y + 1.0, bz - 0.4], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.6, y + 1.3, bz - 0.3], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      // Del panel hacia el este, lejos del muro sur (que lo taparía en la vista iso) y sin chocar con las cajas: de lado a la cámara, nunca de espaldas.
      await irA(bx + 1.6, bz - 0.9, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al panel: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «en mi Archivo vive todo lo que no cabe en mi cabeza… cada cosa en su carpeta».
    nombre: 'miArchivo',
    voz: 'cabeza.miArchivo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('mia')
      ${EN(dur * 0.55)}
      await abrir('casa')
    `),
  },
  {
    // Parte 2, «cada cuarto tiene su carpeta: ahí aparece solo lo que su app ya guarda, como las fotos de mis viajes o mis dibujos».
    nombre: 'cuartos',
    voz: 'historia.cuartos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('cuartos')
      ${EN(dur * 0.45)}
      await abrir('cuarto.sala')
    `),
  },
  {
    // Parte 3, «cualquier archivo lo abro aquí mismo: una foto, un PDF o una nota».
    nombre: 'visor',
    voz: 'olvido.visor',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('mia')
      await abrir('fotos')
      await abrir('laika')
      ${EN(dur * 0.6)}
      await cerrarVisor()
      const raiz = await esperarTut('archivos.miga.0', 2000)
      if (raiz) { await tocar(raiz); await sleep(800) }
      await abrir('pendientes')
    `),
  },
  {
    // Parte 4, «mis carpetas son pocas: Trabajo, Casa y trámites, Salud, Proyectos y Fotos. Y casi nada pasa de dos niveles».
    nombre: 'carpetasApp',
    voz: 'carpetas.carpetasApp',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('mia')
      ${EN(dur * 0.6)}
      await abrir('casa')
      await abrir('recibos')
    `),
  },
  {
    // Parte 5, «lo que uso cada semana lo marco con una estrella y queda a la mano en Destacados».
    nombre: 'destacados',
    voz: 'desorden.destacados',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('mia')
      const op = await esperarTut('archivos.item.metas.opciones', 4000)
      if (op) {
        await ver(op)
        await tocar(op)
        await sleep(700)
        const estrella = await esperarTut('archivos.opcion.estrella', 2000)
        if (estrella) await tocar(estrella)
      }
      ${EN(dur * 0.5)}
      await menu('destacados')
    `),
  },
  {
    // Parte 6, «si algo se me pierde, lo escribo en el buscador o lo ordeno por fecha».
    nombre: 'buscador',
    voz: 'buscar.buscador',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('mia')
      const buscar = await esperarTut('archivos.buscar', 4000)
      if (buscar) {
        await tocar(buscar)
        // La primera palabra del recibo de luz en el idioma de la demo (encuentra los recibos, con su ruta).
        const { TEXTOS_ARCHIVO_DEMO } = await modulo('/src/rooms/archivos/demo.data.ts')
        const { useAjustes } = await modulo('/src/core/state/ajustesStore.ts')
        const luz = (TEXTOS_ARCHIVO_DEMO[useAjustes.getState().idioma] ?? TEXTOS_ARCHIVO_DEMO.es).nombres.luz
        await escribir(buscar, luz.split(' ')[0])
      }
      ${EN(dur * 0.65)}
      const orden = await esperarTut('archivos.ordenar', 2000)
      if (orden) await tocar(orden)
    `),
  },
  {
    // Parte 7, «lo que suelto va a la Papelera: si me arrepiento, lo saco; y a los treinta días se borra solo».
    nombre: 'papelera',
    voz: 'soltar.papelera',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('papelera')
      ${EN(dur * 0.4)}
      const op = await esperarTut('archivos.item.borrosa.opciones', 3000)
      if (op) {
        await tocar(op)
        await sleep(700)
        const r = await esperarTut('archivos.opcion.restaurar', 2000)
        if (r) await tocar(r)
      }
    `),
  },
  {
    // Parte 8, «mira mi Archivo en la app: está ordenado, de mis carpetas a la Papelera».
    nombre: 'ejemplos',
    voz: 'continuar.ejemplos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await menu('mia')
      ${EN(dur * 0.35)}
      await abrir('fotos')
      ${EN(dur * 0.65)}
      await menu('papelera')
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el astronauta abre la app de frente y se queda en sus carpetas. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="archivos.explorador"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('archivos.explorador')
    await sleep(600)
    await menu('mia')
  }
  // Que se vean sus carpetas antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: el cuarto al centro (el astronauta está al oeste del centro). */
export const ISO = { zoom: 80, dx: 0.5, dz: 0.2, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él (desde el sur, dentro del cuarto). */
export const PLANOS = [
  { yaw: [-0.15, 0.1], dist: [2.9, 2.5], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «Tu cabeza solo puede sostener unas cuatro cosas a la vez»: desde el suroeste; señala.
  { yaw: [-0.65, -0.85], dist: [2.6, 2.3], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y aun así le pedimos que recuerde todo»: desde arriba, con las estanterías detrás.
  { yaw: [0.3, 0.1], dist: [2.7, 2.5], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si dejaras de usarla como bodega?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.15, 0.4], dist: [2.6, 2.3], pitch: [0.42, 0.38] },
]

/** El final de la salida: tercera persona girando por delante del astronauta (yaw de inicio a fin; nunca a su espalda). */
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
 * La app 2D en el recuadro del cierre: mientras el astronauta dice «tus carpetas… cada cuarto de
 * tu casa… la papelera», la toma pasa por cada sección justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['carpetas', 'cuartos', 'papelera'],
  textos: '{}',
  ayudas: `
    /** Espera un elemento visible por su data-tut. */
    const esperarTut = async (clave, ms = 6000) => {
      for (let i = 0; i < ms / 150; i++) {
        const el = [...document.querySelectorAll('[data-tut="' + clave + '"]')].find((e) => e.offsetParent !== null)
        if (el) return el
        await dormir(150)
      }
      return null
    }
    /** Una sección del menú (la del lateral o su chip). */
    const seccion = (clave) => [...document.querySelectorAll('[data-tut="archivos.menu.' + clave + '"], [data-tut="archivos.chip.' + clave + '"]')].find((e) => e.offsetParent !== null)
  `,
  /** La app en Mi Archivo (la primera vez siembra los ejemplos: se espera al explorador). */
  preparar: `
    await dormir(800)
    const ex = await esperarTut('archivos.explorador', 30000)
    if (!ex) return 'no encontré el explorador de Archivo'
    seccion('mia')?.click()
    await dormir(800)
  `,
  /** \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. */
  accion: (T) => `
    await hasta(t0, ${T.carpetas} - 0.6)
    seccion('mia')?.click()
    await hasta(t0, ${T.cuartos} - 0.6)
    seccion('cuartos')?.click()
    await hasta(t0, ${T.papelera} - 0.6)
    seccion('papelera')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al astronauta (miniaturas.mjs). */
export const MINIATURA = { objeto: '🗂️' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «aun así le pedimos que recuerde todo»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
