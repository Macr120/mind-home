// Lo propio de la guía de Noticias en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (Pep@, en el cuarto de Noticias) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra PEP@ de VAQUERO (el atuendo del tema: casa.mjs no le pone ropa cuando hay tema), con la
// casa en el tema del VIEJO OESTE y solo el cuadrante A1 a la vista (pedidos del usuario).
//
// El cuarto de Noticias (plantilla `diario`) está en la PLANTA BAJA de la demo: el sillón de
// lectura al noroeste (abre la app), la mesa de centro al norte del centro, el mueble de la TV
// al sur y una lámpara en la esquina noreste. La cámara iso mira desde el sureste: Pep@ va al
// este de la mesa de centro, de cara al sur, con las cámaras dentro del cuarto, del lado sur.
// El tablero con la pregunta (una plana de periódico) se arma EN VIVO (ENTRADAS, idempotente)
// en el muro NORTE, hacia la esquina noreste (regla del usuario: contra la pared, en una
// esquina, nunca frente a una puerta: la del muro norte está en su mitad oeste).
import path from 'node:path'

/** Sin CUERPO ni FORMA: narra Pep@ con la ropa del tema (vaquero). */
export const ATUENDO = 'vaquero'
/** El Viejo Oeste, toda la guía. */
export const TEMA = 'vaquero'
/** Solo el cuadrante A1 del mapa a la vista (el bloque automático `auto-0-0`). */
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo: grande, pero sin tapar a Pep@ (el primer plano arranca lejos). */
export const TITULO_ESCALA = 0.8

/** Pep@ en el piso del cuarto y `window.__not` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const sillon = useDiseño.getState().objetos.find((x) => x.plantillaId === 'diario')
  if (!sillon) return 'SIN el objeto de Noticias en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[sillon.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(sillon.roomId)
  window.__not = { cuarto: sillon.roomId, rx, rz, sillon: sillon.id }
`

const HERRAMIENTA = `(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta`

/** Suelta el gesto prestado (para caminar). */
const SOLTAR_GESTO = `;${HERRAMIENTA}.getState().setEmote(null)`

/** Los gestos que Pep@ hace en la casa con el hueco de un baile: explicar y señalar (a su izquierda). */
const GESTOS = `
  const { ciclo } = await modulo('/src/rooms/ejercicio/anim/pose.ts')
  window.__gestos = {
    explica: ciclo(3.2, [
      { t: 0, pose: { hombroD: [18, 12, 0], codoD: 55, hombroI: [12, 8, 0], codoI: 35 } },
      { t: 0.35, pose: { hombroD: [38, 18, 10], codoD: 85, hombroI: [16, 10, 0], codoI: 40, cuello: [4, 6, 0] } },
      { t: 0.7, pose: { hombroD: [24, 10, 0], codoD: 65, hombroI: [30, 16, 10], codoI: 75, cuello: [2, -5, 0] } },
    ]),
    senala: ciclo(2.4, [
      { t: 0, pose: { hombroI: [80, 55, 0], codoI: 8, cuello: [0, 18, 0], tronco: [0, 8, 0] } },
      { t: 0.5, pose: { hombroI: [86, 58, 0], codoI: 4, cuello: [0, 20, 0], tronco: [0, 10, 0] } },
    ]),
  }
`
/** Pone el gesto `nombre` en el hueco prestado (en TODAS las copias del módulo de los bailes). */
const gesto = (nombre) => `
  {
    if (!window.__gestos) { ${GESTOS} }
    const urls = [...new Set(performance.getEntriesByType('resource').map((x) => x.name).filter((n) => n.includes('/src/core/house/emotesPatrones.ts')))]
    for (const url of urls) (await import(url)).PATRONES_EMOTE.electroShuffle = window.__gestos.${nombre}
    ;${HERRAMIENTA}.getState().setEmote(null)
    await sleep(120)
    ;${HERRAMIENTA}.getState().setEmote('electroShuffle')
  }
`

/** Su sitio: al este de la mesa de centro, de cara al sur (coordenadas del cuarto). */
const SITIO = { x: 0.75, z: -0.75 }

/** Llega caminando hacia el sur (de cara a la cámara) hasta su sitio. */
const A_SU_SITIO = `
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.7)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
`

/** Pep@ de pie junto a la mesa de centro, explicando. */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  ${A_SU_SITIO}
  await sleep(500)
  // El marcador de entrada que flota sobre el sillón: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + sillon.x, rz + sillon.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - mx, z - mz) < 0.4 && y > piso + 1.9) m.visible = false
    })
  }, 300)
  ${GESTOS}
  const { useHerramienta } = await modulo('/src/core/state/herramientaStore.ts')
  // El módulo de los bailes es perezoso y lo carga la app con SU URL: primero se le
  // hace cargar, luego se cambia el patrón en TODAS las instancias y se pone el gesto.
  useHerramienta.getState().setEmote('electroShuffle')
  const cargados = () => [...new Set(performance.getEntriesByType('resource').map((x) => x.name).filter((n) => n.includes('/src/core/house/emotesPatrones.ts')))]
  for (let i = 0; i < 50 && !cargados().length; i++) await sleep(300)
  await sleep(300)
  useHerramienta.getState().setEmote(null)
  const urls = cargados()
  if (!urls.length) return 'no encontré el módulo de los emotes que carga la app'
  for (const url of urls) (await import(url)).PATRONES_EMOTE.electroShuffle = window.__gestos.explica
  await sleep(300)
  useHerramienta.getState().setEmote('electroShuffle')
  await sleep(800)
`

/**
 * El tablero de la guía (coordenadas del cuarto; con celda 6 la cara de los muros queda a
 * ±2,82): en el muro NORTE, hacia la esquina noreste, mirando al sur.
 */
const TABLERO = { x: 1.45, z: -2.79, rotY: 0 }

/**
 * La edición de hoy del diario con los titulares de la demo (`guion.titularesDemo`, traducibles):
 * los de verdad llegan por RSS y cambian cada día y en cada idioma (tragedias, política…), así
 * que en el video salen las noticias inventadas del pueblo del Viejo Oeste, con medios inventados.
 * Las efemérides sí son las del día. `cargar`: 'modulo' en la casa, 'import' en la app 2D.
 */
const EDICION_DEMO = (guion, cargar) => {
  const ahora = Date.now()
  const titulares = (guion.titularesDemo ?? []).map((x, i) => ({
    categoria: x.categoria,
    titulo: x.titulo,
    resumen: x.resumen,
    fuente: x.medio,
    url: 'https://mindhaos.com/guias/noticias#' + x.categoria,
    imagen: 'https://images.pexels.com/videos/' + x.imagen + '/pexels-photo-' + x.imagen + '.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450',
    publicado: new Date(ahora - (i + 1) * 47 * 60000).toISOString(),
  }))
  const imp = (ruta) => (cargar === 'modulo' ? `await modulo('${ruta}')` : `await import('${ruta}')`)
  return `
  {
    const ed = ${imp('/src/rooms/diario/edicion.ts')}
    const { edicionesDiarioRepo } = ${imp('/src/core/data/repository.ts')}
    const { fechaLocalISO } = ${imp('/src/core/fechaLocal.ts')}
    await ed.obtenerEdicion().catch(() => null)
    const titulares = ${JSON.stringify(titulares)}
    const fila = (await edicionesDiarioRepo.list()).find((f) => f.fecha === fechaLocalISO())
    if (fila?.id != null) await edicionesDiarioRepo.update(fila.id, { titulares })
  }
`
}

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de la guía, una plana de
 * periódico con la pregunta, columnas de texto y una foto. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo, guion }) => `
  ${EN_EL_CUARTO}
  ${EDICION_DEMO(guion, 'modulo')}
  const ds = useDiseño.getState()
  const cuarto = sillon.roomId
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/noticias'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    const piezas = [
      // El marco de madera y la plana de papel.
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#5b3a1e' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#f1e7d0' },
      // La cabecera del periódico y el titular con la pregunta.
      { tipo: 'plano', pos: [0, Y + 0.34, 0.042], tam: [1.02, 0.1], color: '#f1e7d0', tinta: '#1c1917', texto: 'MindHaOS' },
      { tipo: 'caja', pos: [0, Y + 0.28, 0.04], tam: [1.02, 0.008, 0.004], color: '#1c1917' },
      { tipo: 'plano', pos: [0, Y + 0.17, 0.042], tam: [1.02, 0.2], color: '#f1e7d0', tinta: '#1c1917', texto: ${JSON.stringify(titulo)} },
      // La foto y las columnas de texto.
      { tipo: 'caja', pos: [-0.27, Y - 0.15, 0.04], tam: [0.44, 0.34, 0.006], color: '#57534e' },
      { tipo: 'caja', pos: [-0.27, Y - 0.15, 0.044], tam: [0.36, 0.26, 0.004], color: '#a8a29e' },
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ tipo: 'caja', pos: [0.26, Y - 0.02 - i * 0.055, 0.04], tam: [0.44, 0.018, 0.004], color: '#78716c' })),
      // Una chincheta roja.
      { tipo: 'caja', pos: [0, Y + 0.43, 0.06], tam: [0.03, 0.03, 0.012], color: '#dc2626' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#f1e7d0', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, sillon: sillon.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): espera elementos por su `data-tut`, cambia de pestaña y desliza. */
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
  const { CATEGORIAS, TIPOS_EFEMERIDE } = await modulo('/src/rooms/diario/constantes.ts')
  /** Va a una pestaña del diario ('titulares' o 'efemerides') y espera su lista. */
  const pestana = async (id) => {
    const b = await esperarTut('diario.tab.' + id)
    if (b && b.getAttribute('aria-selected') !== 'true') await tocar(b)
    await esperarTut('diario.' + id + '.lista', 20000)
    await sleep(800)
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
  /** Lleva a la vista (centrado) un elemento. */
  const ver = async (el) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(900)
    return el
  }
  /** La tarjeta de efemérides de un tipo ('historia', 'arte', 'libro', 'especie', 'palabra'…), por su etiqueta. */
  const efemeride = (tipo) => {
    const x = TIPOS_EFEMERIDE.find((e) => e.id === tipo)
    const txt = x && tGlobal('diario.ef.' + tipo, x.label)
    return [...document.querySelectorAll('[data-tut="diario.efemerides.lista"] article')].find((e) => txt && e.textContent.includes(txt))
  }
  /** Un chip de categoría de los titulares por su color (igual en todos los idiomas). */
  const chipColor = (id) => {
    const c = CATEGORIAS.find((x) => x.id === id)
    if (!c) return null
    const rgb = c.color.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(', ')
    return [...document.querySelectorAll('[data-tut="diario.titulares.lista"] button')].find((b) => { const st = b.getAttribute('style') ?? ''; return st.includes(c.color) || st.includes(rgb) }) ?? null
  }
  /** Un chip de categoría de los titulares por su texto. */
  const chip = (id) => {
    const c = CATEGORIAS.find((x) => x.id === id)
    return c && [...document.querySelectorAll('[data-tut="diario.titulares.lista"] button')].find((b) => b.textContent.trim().endsWith(tGlobal('diario.cat.' + id, c.label)))
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

/** Pep@ en su sitio, de cara a la cámara (pedido del usuario: nunca de espaldas). */
const PREPARAR_FRENTE = `
  ${EN_EL_CUARTO}
  ${SOLTAR_GESTO}
  ${A_SU_SITIO}
  await sleep(300)
  ${gesto('senala')}
  useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 2.8, pitch: 0.42 })
`
/**
 * Pep@, quieto y de frente, abre la app de su cuarto (sin caminar al sillón) en el segundo
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
    await esperarTut('diario.tab.titulares')
    await esperarTut('diario.titulares.lista', 20000)
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
    // El periódico del muro norte en la vista iso; Pep@ se aparta de él hacia la cámara y lo toca.
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
      // Del periódico hacia la cámara (al sureste): de frente, nunca de espaldas.
      await irA(bx + 0.35, bz + 1.25, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al periódico: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «mi diario de hoy me trae titulares de varios medios distintos, por categoría».
    nombre: 'medios',
    voz: 'agenda.medios',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('titulares')
      ${EN(dur * 0.45)}
      await deslizar(700, Math.max(2000, (${dur} * 0.5 - 1) * 1000))
    `, 2.5),
  },
  {
    // Parte 2, «las efemérides de mi diario: cada día me cuentan algo que pasó un día como hoy».
    nombre: 'efemerides',
    voz: 'bly.efemerides',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('efemerides')
      ${EN(dur * 0.55)}
      const mas = [...document.querySelectorAll('[data-tut="diario.efemerides.lista"] button')].find((b) => b.textContent.includes(tGlobal('diario.ef.leerMas', 'Leer más ▾').replace(/\\s*▾/, '')))
      if (mas) await tocar(mas)
      await deslizar(250, 1500)
    `, 2),
  },
  {
    // Parte 3, «elijo la categoría con un toque, y… la especie del día».
    nombre: 'categorias',
    voz: 'negatividad.categorias',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('titulares')
      const c = chipColor('deportes') ?? chipColor('entretenimiento')
      if (c) await tocar(c)
      ${EN(dur * 0.55)}
      await pestana('efemerides')
      await ver(efemeride('especie'))
    `, 1.5),
  },
  {
    // Parte 4, «cada titular me lleva a la nota completa… puedo profundizar en la biblioteca».
    nombre: 'nota',
    voz: 'mentira.nota',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('titulares')
      await deslizar(300, 1200)
      ${EN(dur * 0.5)}
      await pestana('efemerides')
      const mas = [...document.querySelectorAll('[data-tut="diario.efemerides.lista"] button')].find((b) => b.textContent.includes(tGlobal('diario.ef.leerMas', 'Leer más ▾').replace(/\\s*▾/, '')))
      if (mas) await tocar(mas)
      await sleep(600)
      await ver([...document.querySelectorAll('[data-tut="diario.efemerides.lista"] button')].find((b) => b.textContent.includes(tGlobal('diario.ef.profundizar', 'Profundizar en la biblioteca'))))
    `, 1.5),
  },
  {
    // Parte 5, «cada titular dice qué medio lo publicó y cuándo».
    nombre: 'fuente',
    voz: 'verificar.fuente',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('titulares')
      await deslizar(500, Math.max(2000, (${dur} - 3) * 1000))
    `, 1.5),
  },
  {
    // Parte 6, «la obra de arte del día, el libro del día y la palabra del día».
    nombre: 'arte',
    voz: 'belleza.arte',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('efemerides')
      await ver(efemeride('arte'))
      ${EN(dur * 0.5)}
      await ver(efemeride('libro'))
      ${EN(dur * 0.75)}
      await ver(efemeride('palabra'))
    `, 1.5),
  },
  {
    // Parte 7, «programé el reparto: el mago… y Laika…».
    nombre: 'reparto',
    voz: 'dieta.reparto',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      const b = await esperarTut('diario.reparto')
      if (b) await tocar(b)
      const lista = await esperarTut('diario.reparto.lista', 5000)
      await ver(lista)
      ${EN(dur * 0.6)}
      const caja = lista?.closest('[class*="overflow-y"]') ?? lista?.parentElement
      if (caja) caja.scrollBy({ top: 420, behavior: 'smooth' })
    `, 1.5),
  },
  {
    // Parte 8, «en mis misiones, leer el diario de hoy cuenta para mi racha».
    nombre: 'racha',
    voz: 'continuar.racha',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      const m = (await esperarTut('room.meta'))?.querySelector('button')
      if (m) await tocar(m)
      await sleep(1200)
    `, 1.5),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: Pep@ abre la app de frente y va a las efemérides. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="diario.tab.titulares"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('diario.tab.titulares')
    await sleep(600)
    await pestana('efemerides')
  }
  // Que se vean sus efemérides antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: el cuarto al centro (Pep@ está al este de la mesa de centro). */
export const ISO = { zoom: 84, dx: -0.6, dz: 0.4, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él (desde el sur, dentro del cuarto). */
export const PLANOS = [
  { yaw: [-0.15, 0.1], dist: [3.0, 2.6], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «Cuatro de cada diez personas ya evitan las noticias»: desde el suroeste; señala.
  { yaw: [-0.65, -0.85], dist: [2.7, 2.4], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Pero aunque no las veas, ellas deciden…»: desde arriba.
  { yaw: [0.3, 0.1], dist: [2.8, 2.6], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si aprendieras a leer el mundo…?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.15, 0.45], dist: [2.7, 2.4], pitch: [0.42, 0.38] },
]

/** El final de la salida: tercera persona girando por delante de Pep@ (yaw de inicio a fin; nunca a su espalda). */
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
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «tus titulares… las efemérides…
 * el reparto», la toma pasa por cada cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['titulares', 'efemerides', 'reparto'],
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
  /** La app en sus titulares (los del pueblo de la demo). */
  preparar: (guion) => `
    ${EDICION_DEMO(guion, 'import')}
    await dormir(800)
    const pest = await esperarTut('diario.tab.titulares', 12000)
    if (!pest) return 'no encontré la pestaña de Titulares de Noticias'
    pest.click()
    if (!(await esperarTut('diario.titulares.lista', 25000))) return 'no cargaron los titulares de Noticias'
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Titulares: la lista;
   * efemérides: su pestaña; reparto: el panel del reparto por asistentes.
   */
  accion: (T) => `
    await hasta(t0, ${T.titulares} + 0.3)
    main().scrollTo({ top: 500, behavior: 'smooth' })
    await hasta(t0, ${T.efemerides} - 0.8)
    main().scrollTo({ top: 0, behavior: 'smooth' })
    tut('diario.tab.efemerides')?.click()
    await hasta(t0, ${T.reparto} - 0.8)
    tut('diario.reparto')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a Pep@ (miniaturas.mjs). */
export const MINIATURA = { objeto: '📰' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «ellas deciden de qué se habla en tu mesa»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
