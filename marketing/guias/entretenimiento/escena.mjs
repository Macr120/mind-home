// Lo propio de la guía de Entretenimiento en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el alien, en el cuarto de Entretenimiento) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el ALIEN de AZUL (el cuerpo prediseñado de la app), con la casa en el tema del
// APOCALIPSIS, solo el cuadrante A1 a la vista y la música de la guía de Matemáticas (pedidos del usuario).
//
// El cuarto de Entretenimiento está en la PLANTA BAJA de la demo, contra el muro exterior norte
// de la casa: la repisa de juegos al noroeste (abre la app) y una mesa de billar al centro.
// Sus entradas extra se arman EN VIVO (ENTRADAS, idempotente): la mesa de billar se corre al
// sureste (al centro tapaba al alien en los planos desde el sur) y un tablero de corcho con la
// pregunta va en el muro oeste, hacia la esquina noroeste, junto a la repisa (regla del usuario:
// tableros contra la pared, en una esquina, nunca frente a una puerta). En la esquina noreste lo
// tapaba en la vista iso el muro del cuarto vecino. El narrador abre la app de frente.
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Alien» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'alien'
/** De azul: sus tres verdes (torso, cadera y cabeza) pasan a tonos de azul. */
export const CUERPO_COLORES = { '#7ec86a': '#60a5fa', '#5fa94f': '#2563eb', '#8ed67a': '#93c5fd' }
/** La casa en pleno apocalipsis, toda la guía. */
export const TEMA = 'apocalipsis'
/** Solo el cuadrante A1 del mapa a la vista (el bloque automático `auto-0-0`). */
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo: grande, pero sin tapar al alien (pedidos del usuario; el primer plano arranca más lejos). */
export const TITULO_ESCALA = 0.8
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'
/** La música de la guía de Matemáticas (pedido del usuario). */
export const MUSICA_LISTA = 'matematicas.json'

/** El alien en el piso del cuarto y `window.__hob` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const piano = useDiseño.getState().objetos.find((x) => x.plantillaId === 'entretenimiento')
  if (!piano) return 'SIN el objeto de Entretenimiento en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[piano.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(piano.roomId)
  window.__ent = { cuarto: piano.roomId, rx, rz, repisa: piano.id }
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

/** Su sitio: al norte del cuarto, de cara al sur (coordenadas del cuarto), con la mesa de billar ya corrida al sureste. */
const SITIO = { x: -0.4, z: -0.9 }

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
  // El marcador de entrada que flota sobre la repisa: fuera en esta toma (React lo remonta: se repasa toda la toma).
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
 * ±2,82): en el muro OESTE, hacia la esquina noroeste, junto a la repisa, mirando al este.
 */
const TABLERO = { x: -2.79, z: -0.95, rotY: 90 }
/** La mesa de billar y sus tres bolas: al sureste del cuarto (al centro tapaba al alien). */
const BILLAR = { x: 0.9, z: 1.6 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): la mesa de billar en su sitio nuevo,
 * el tablero de corcho de la guía (la pregunta y carteles de películas clavados) y el resumen
 * sin spoilers de la película pendiente de la demo (`guion.resumenDemo`, en el idioma del
 * video: la demo no trae resúmenes y sin IA activa la tarjeta no ofrece pedirlo).
 * Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo, guion }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = piano.roomId
  const BILLAR = ${JSON.stringify(BILLAR)}
  const mesa = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:57')
  if (mesa && Math.hypot(mesa.x - BILLAR.x, mesa.z - BILLAR.z) > 0.05) {
    // Las bolas (piezas sobre la mesa) se mueven con ella.
    const bolas = useDiseño.getState().objetos.filter((x) => x.roomId === cuarto && x.tipo === 'piezas' && (x.y ?? 0) > 0.7 && Math.hypot(x.x - mesa.x, x.z - mesa.z) < 1.2)
    const [dx, dz] = [BILLAR.x - mesa.x, BILLAR.z - mesa.z]
    await ds.setObjetoPose(mesa.id, BILLAR.x, BILLAR.z, mesa.rotY ?? 0)
    for (const b of bolas) await ds.setObjetoPose(b.id, b.x + dx, b.z + dz, b.rotY ?? 0)
  }
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/entretenimiento'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    // Carteles de películas clavados: marcos negros, un color dentro y una chincheta.
    const carteles = [
      [-0.38, Y - 0.17, '#ef4444'],
      [-0.12, Y - 0.17, '#22d3ee'],
      [0.14, Y - 0.17, '#a855f7'],
      [0.4, Y - 0.17, '#facc15'],
    ].flatMap(([x, y, c]) => [
      { tipo: 'caja', pos: [x, y, 0.045], tam: [0.2, 0.3, 0.006], color: '#111827' },
      { tipo: 'caja', pos: [x, y - 0.01, 0.049], tam: [0.16, 0.24, 0.004], color: c },
      { tipo: 'caja', pos: [x, y + 0.13, 0.053], tam: [0.025, 0.025, 0.01], color: '#ef4444' },
    ])
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      { tipo: 'plano', pos: [0, Y + 0.28, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#1e3a8a', texto: ${JSON.stringify(titulo)} },
      ...carteles,
      { tipo: 'plano', pos: [0.36, Y - 0.39, 0.042], tam: [0.3, 0.07], color: '#60a5fa', tinta: '#0f172a', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El resumen sin spoilers de la película pendiente (Solaris en la demo).
  {
    const { db } = await modulo('/src/core/data/db.ts')
    const peli = (await db.mediaArchivo.toArray()).find((x) => x.tipo === 'pelicula' && x.estado === 'pendiente')
    const resumen = ${JSON.stringify({ ...(guion?.resumenDemo ?? {}), sinSpoilers: true })}
    if (peli && resumen.sinopsis && peli.resumen?.sinopsis !== resumen.sinopsis) {
      const { mediaArchivoRepo } = await modulo('/src/core/data/repository.ts')
      await mediaArchivoRepo.update(peli.id, { resumen })
    }
  }
  window.__entradas = { cuarto, repisa: piano.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): espera elementos por su `data-tut`, cambia de pestaña y voltea tarjetas. */
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
  const { db } = await modulo('/src/core/data/db.ts')
  /** Va a una pestaña de la app ('mesa' o 'archivo'). */
  const pestana = async (id) => {
    const b = await esperarTut('entretenimiento.tab.' + id)
    if (b && b.getAttribute('aria-selected') !== 'true') await tocar(b)
    await sleep(800)
  }
  /** Agrupa el archivo (0 género, 1 categoría, 2 autor, 3 fecha). */
  const agrupar = async (n) => {
    const b = (await esperarTut('entretenimiento.archivo.agrupar'))?.querySelectorAll('button')[n]
    if (b) await tocar(b)
    await sleep(700)
  }
  /** Abre la carpeta del archivo con ese título (si está cerrada; el botón empieza con un icono). */
  const abrirCarpeta = async (titulo) => {
    const b = [...document.querySelectorAll('main button[aria-expanded]')].find((x) => [...x.querySelectorAll('span')].some((e) => e.textContent.trim().toLowerCase() === titulo.trim().toLowerCase()))
    if (b && b.getAttribute('aria-expanded') !== 'true') { await tocar(b); await sleep(600) }
  }
  /** La primera obra del archivo que cumple \`f\`. */
  const obra = async (f) => (await db.mediaArchivo.toArray()).find(f)
  /** La tarjeta de una obra: abre su carpeta de género si hace falta y la centra. */
  const tarjeta = async (o) => {
    if (!o) return null
    let el = document.querySelector('[data-tut="entretenimiento.archivo.item.' + o.id + '"]')
    if (!el) { await abrirCarpeta(o.genero || tGlobal('entre.arch.sinGenero', 'Sin género')); el = await esperarTut('entretenimiento.archivo.item.' + o.id, 3000) }
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(1000)
    return el
  }
  /** Voltea una tarjeta (tocándola fuera de sus botones). */
  const voltear = async (el) => {
    const r = el?.querySelector('[role="button"]')
    if (r) await tocar(r)
    await sleep(900)
  }
  const verTut = async (clave) => {
    const el = await esperarTut(clave, 4000)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(900)
    return el
  }
  /** Desliza el contenido de la app poco a poco (\`px\` en \`ms\`). */
  const deslizar = async (px, ms) => {
    const m = [...document.querySelectorAll('main, main *')].find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY))
    if (!m) return
    const y0 = m.scrollTop, t0 = performance.now()
    while (performance.now() - t0 < ms) { m.scrollTop = y0 + px * ((performance.now() - t0) / ms); await sleep(30) }
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
  useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.8, pitch: 0.42 })
`
/**
 * El alien, quieto y de frente, abre la app de su cuarto (sin caminar a la repisa) en el segundo
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
    await esperarTut('entretenimiento.tab.mesa')
    await sleep(500)
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
    // Parte 1, «llevo mi archivo… ordenado por género»: el archivo y sus carpetas.
    nombre: 'archivo',
    voz: 'elegir.archivo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('archivo')
      await esperarTut('entretenimiento.archivo.lista')
      await sleep(600)
      await deslizar(500, Math.max(2000, (${dur} - 4) * 1000))
    `),
  },
  {
    // Parte 3, «Pluto la tengo pendiente»: su tarjeta, volteada (la demo no trae series en curso).
    nombre: 'curso',
    voz: 'maraton.curso',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('archivo')
      const el = await tarjeta(await obra((x) => x.tipo === 'serie' && x.estado === 'pendiente'))
      ${EN(dur * 0.5)}
      await voltear(el)
    `),
  },
  {
    // Parte 4, «pido un resumen… sin spoilers»: la película pendiente, volteada, con su resumen.
    nombre: 'resumen',
    voz: 'pausas.resumen',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('archivo')
      const el = await tarjeta(await obra((x) => x.tipo === 'pelicula' && x.estado === 'pendiente'))
      ${EN(dur * 0.4)}
      await voltear(el)
    `),
  },
  {
    // Parte 5, «veintitrés juegos… cada uno con su dificultad»: los juegos de mesa y uno abierto.
    nombre: 'juegos',
    voz: 'videojuegos.juegos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('mesa')
      await deslizar(700, Math.max(2000, ${dur} * 500))
      const j = document.querySelector('[data-tut="entretenimiento.juegos.item.tetris"]')
      j?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await sleep(800)
      if (j) await tocar(j)
    `),
  },
  {
    // Parte 6, «juegos para el grupo… y mesas en línea»: la sección de 3+ jugadores.
    nombre: 'grupo',
    voz: 'otros.grupo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await pestana('mesa')
      const b = (await esperarTut('entretenimiento.juegos.secciones'))?.querySelectorAll('button')[1]
      if (b) await tocar(b)
      await sleep(900)
      await verTut('entretenimiento.juegos.familia.grupo')
    `),
  },
  {
    // Parte 7, «Anathem en curso, Cosmos con cinco estrellas»: el archivo por categoría, en los libros.
    nombre: 'libros',
    voz: 'leer.libros',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('archivo')
      await agrupar(1)
      await abrirCarpeta(tGlobal('entre.tipo.libro', 'Libro'))
      await tarjeta(await obra((x) => x.tipo === 'libro' && x.estado === 'en_curso'))
      ${EN(dur * 0.6)}
      await tarjeta(await obra((x) => x.tipo === 'libro' && x.estado === 'completado' && x.calificacion === 5))
    `),
  },
  {
    // Parte 8, «por delante, la portada; al tocarla, se voltea»: una tarjeta de cinco estrellas.
    nombre: 'tarjeta',
    voz: 'durar.tarjeta',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('archivo')
      await agrupar(0)
      const el = await tarjeta(await obra((x) => x.tipo === 'pelicula' && x.estado === 'completado' && x.calificacion === 5))
      ${EN(dur * 0.5)}
      await voltear(el)
    `),
  },
  {
    // Parte 9, «mis pendientes los llevo como una meta»: las Misiones de la app con sus metas.
    nombre: 'metas',
    voz: 'continuar.metas',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      const b = (await esperarTut('room.meta'))?.querySelector('button')
      if (b) await tocar(b)
      await sleep(1200)
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el alien abre la app de frente y va a su archivo. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="entretenimiento.tab.mesa"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('entretenimiento.tab.mesa')
    await sleep(600)
    await pestana('archivo')
  }
  // Que se vea el archivo antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde el alien (en (−0,4, −0,9) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: 0.4, dz: 0.9, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él. */
export const PLANOS = [
  { yaw: [-0.2, -0.45], dist: [3.8, 2.8], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «Pasamos más de diez minutos solo eligiendo qué ver»: desde el suroeste; señala.
  { yaw: [-0.8, -1.0], dist: [2.8, 2.5], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y a veces… nos rendimos y no vemos nada»: desde arriba, más lejos.
  { yaw: [-0.45, -0.25], dist: [3.1, 2.8], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si el problema no fuera cuánto…?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [-0.3, -0.6], dist: [2.8, 2.5], pitch: [0.42, 0.38] },
]

/** El final de la salida: tercera persona girando por delante del alien (yaw de inicio a fin; nunca a su espalda). */
export const ORBITA_SALIDA = [-0.15, -0.5, 2.8]

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
 * La app 2D en el recuadro del cierre: mientras el alien dice «tu archivo… tus reseñas…
 * juegos de mesa», la toma pasa por cada cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['archivo', 'resenas', 'juegos'],
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
  /** La app en el archivo. */
  preparar: `
    await dormir(800)
    const pest = await esperarTut('entretenimiento.tab.archivo', 12000)
    if (!pest) return 'no encontré la pestaña del Archivo de Entretenimiento'
    pest.click()
    if (!(await esperarTut('entretenimiento.archivo.lista'))) return 'no encontré el archivo de Entretenimiento'
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Archivo: sus carpetas;
   * reseñas: la primera tarjeta, volteada; juegos de mesa: la otra pestaña.
   */
  accion: (T) => `
    await hasta(t0, ${T.resenas} - 1.2)
    const tarjeta = document.querySelector('[data-tut^="entretenimiento.archivo.item."]')
    tarjeta?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await dormir(500)
    tarjeta?.querySelector('[role="button"]')?.click()
    await hasta(t0, ${T.juegos} - 0.8)
    tut('entretenimiento.tab.mesa')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al alien (miniaturas.mjs). */
export const MINIATURA = { objeto: '🎮' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «nos rendimos y no vemos nada»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
