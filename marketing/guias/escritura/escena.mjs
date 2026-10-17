// Lo propio de la guía de Escritura en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el mago, en el cuarto de Escritura) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el MAGO de AMARILLO, con la música del mago (la de Idiomas) y solo el cuadrante A1
// a la vista. La casa cambia de tema con las partes (pedido del usuario): terror en las
// partes 1-3 (el miedo a escribir), pirata en las 4-6 (bitácoras e historias) y espacio
// en las 7-8 y la salida (escribir para el futuro).
//
// El cuarto de Escritura está ARRIBA del Studio de audio (nivel 1, ala este de la demo): el
// escritorio de escritura al noroeste (abre la app), su silla delante, una estantería
// metálica en la esquina noreste (la pared curva) y una planta al suroeste. Sus entradas
// extra se arman EN VIVO (ENTRADAS, idempotente): un tablero con la pregunta en el muro
// norte, en la esquina noroeste (abre la guía web; regla del usuario: los tableros en una
// esquina, contra la pared, nunca frente a una puerta), y el libro de ejemplo de la app
// («El invierno del faro»), que la demo no trae.
import path from 'node:path'

/** El narrador: el avatar con la forma integrada del mago (casa.mjs le quita la ropa), de amarillo. */
export const FORMA = 'mago'
export const FORMA_COLOR = '#eab308'
/** La música del mago (musica/idiomas.json), pedida por el usuario. */
export const MUSICA_LISTA = 'idiomas.json'
/** La casa de la entrada: terror; la de la salida, el espacio. Cada toma de en medio lleva el suyo. */
export const TEMA = 'terror'
export const TEMA_SALIDA = 'espacio'
/** Solo el cuadrante A1 del mapa a la vista (el bloque automático `auto-0-0`). */
export const CUADRANTE = 'auto-0-0'
/** Sin uso con FORMA (casa.mjs lo pide si no la hay). */
export const ATUENDO = 'academico'

/** El mago en el piso del cuarto y `window.__escritura` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const escritorio = useDiseño.getState().objetos.find((x) => x.tipo === 'escritorio-escritura' && x.plantillaId === 'escritura')
  if (!escritorio) return 'SIN escritorio de escritura en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[escritorio.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(escritorio.roomId)
  window.__escritura = { cuarto: escritorio.roomId, rx, rz, escritorio: escritorio.id }
`

/**
 * Los gestos del mago: el de la app no tiene emotes, solo el brazo del orbe
 * articulado. Un bucle mueve ese brazo según `window.__gestoMago` ('explica',
 * 'senala' o null = quieto); lo vuelve a buscar si React remonta el avatar.
 */
const GESTOS_MAGO = `
  if (!window.__bucleMago) {
    const hs = await modulo('/src/core/state/houseStore.ts')
    const buscar = () => {
      let b = null
      window.__r3f().scene.traverse((m) => {
        if (b || !m.isMesh || m.geometry.type !== 'BoxGeometry') return
        const p = m.geometry.parameters
        if (Math.abs(p.width - 0.14) > 0.001 || Math.abs(p.height - 0.44) > 0.001 || Math.abs(m.parent.position.x - 0.32) > 0.01) return
        m.updateWorldMatrix(true, false)
        const [x, , z] = m.matrixWorld.elements.slice(12, 15)
        if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 1) b = m.parent
      })
      return b
    }
    let brazo = null
    let visto = 0
    window.__bucleMago = true
    const paso = () => {
      const ahora = performance.now()
      if (!brazo?.parent || ahora - visto > 2000) {
        brazo = buscar() ?? brazo
        visto = ahora
      }
      const t = ahora / 1000
      const g = window.__gestoMago
      if (brazo) {
        const [z, x] =
          g === 'explica' ? [0.4 + 0.25 * Math.sin(t * 2.1), -0.5 + 0.25 * Math.sin(t * 1.3)]
          : g === 'senala' ? [1.4 + 0.05 * Math.sin(t * 2.6), -0.45]
          : [0, 0]
        brazo.rotation.z += (z - brazo.rotation.z) * 0.15
        brazo.rotation.x += (x - brazo.rotation.x) * 0.15
      }
      window.__r3f().invalidate()
      requestAnimationFrame(paso)
    }
    paso()
  }
`
/** Pone un gesto (o ninguno); instala el bucle si la página es nueva (casa.mjs reabre la demo entre tomas). */
const gesto = (nombre) => (nombre ? `${GESTOS_MAGO}
  window.__gestoMago = '${nombre}'` : 'window.__gestoMago = null')
const SOLTAR_GESTO = gesto(null)

/**
 * Su sitio: en medio del cuarto, al sureste del escritorio, de cara al sur (coordenadas del cuarto).
 * Lejos de la esquina noreste: es curva, y con el tema de terror la torre de la casa se pinta
 * entera ahí y tapaba al mago; por eso las cámaras van del lado suroeste.
 */
const SITIO = { x: -0.15, z: 0.15 }

/** El mago en su sitio junto al escritorio, explicando: llega caminando hacia el frente. */
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
  // El marcador de entrada que flota sobre el escritorio: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + escritorio.x, rz + escritorio.z]
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
 * ±2,82 y las puertas ocupan |x| o |z| < 1,1): en el muro norte, en la esquina noroeste,
 * junto al escritorio y de frente a la cámara iso (en la esquina suroeste lo tapaba la torre
 * del tema de terror). La planta de la esquina suroeste se corre al muro sur.
 */
const TABLERO = { x: -2.2, z: -2.79, rotY: 0 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de la guía (un
 * pergamino con la pregunta y una pluma) y el libro de ejemplo de la app. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = escritorio.roomId
  const planta = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:104')
  if (planta && Math.hypot(planta.x + 1.6, planta.z - 2.45) > 0.05) await ds.setObjetoPose(planta.id, -1.6, 2.45, planta.rotY ?? 0)
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/escritura'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    const renglones = [0, 1, 2, 3].map((i) => ({ tipo: 'caja', pos: [-0.12 + (i % 2) * 0.06, Y - 0.08 - i * 0.09, 0.044], tam: [0.78 - (i % 2) * 0.2, 0.012, 0.004], color: '#a8906b' }))
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.22, 0.96, 0.05], color: '#4a2f1a' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.12, 0.86, 0.03], color: '#f3e3c3' },
      { tipo: 'plano', pos: [0, Y + 0.27, 0.042], tam: [1.02, 0.24], color: '#f3e3c3', tinta: '#3b2412', texto: ${JSON.stringify(titulo)} },
      ...renglones,
      // La pluma, cruzada en la esquina derecha, y el tintero.
      { tipo: 'caja', pos: [0.4, Y - 0.2, 0.06], tam: [0.035, 0.42, 0.01], color: '#fafafa', rot: [0, 0, -0.6] },
      { tipo: 'caja', pos: [0.48, Y - 0.33, 0.06], tam: [0.012, 0.16, 0.012], color: '#1f2937', rot: [0, 0, -0.6] },
      { tipo: 'plano', pos: [-0.33, Y - 0.38, 0.042], tam: [0.3, 0.07], color: '#eab308', tinta: '#1f2937', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#4a2f1a', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El libro de ejemplo («El invierno del faro», en el idioma de la demo) si la estantería está vacía.
  const { db } = await modulo('/src/core/data/db.ts')
  // Si una toma anterior escribió en los capítulos (o les puso títulos), vuelven a su texto.
  const guardado = localStorage.getItem('__escrituraRestaurar')
  if (guardado) {
    for (const [id, contenido] of JSON.parse(guardado)) await db.documentos.update(id, { contenido })
    localStorage.removeItem('__escrituraRestaurar')
  }
  // Los documentos vacíos y sin título que dejaron pruebas anteriores: abrir el libro entraría en ellos.
  for (const d of await db.documentos.toArray()) {
    if (!d.titulo?.trim() && !String(d.contenido ?? '').replace(/<[^>]+>/g, '').trim()) await db.documentos.delete(d.id)
  }
  if ((await db.historias.count()) === 0) {
    const { ejemploEscritura } = await modulo('/src/rooms/escritura/ejemplos.ts')
    await ejemploEscritura.materializar(true)
  }
  window.__pregunta = ${JSON.stringify(titulo)}
  window.__entradas = { cuarto, escritorio: escritorio.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): espera elementos por su `data-tut` y abre el libro. */
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
  /** Si la app quedó dentro de un libro, vuelve a la estantería. */
  const aLaEstanteria = async () => {
    for (let i = 0; i < 3 && !document.querySelector('[data-tut="escritura.libros"]'); i++) {
      const volver = document.querySelector('[data-tut="escritura.volver"]')
      if (volver) await tocar(volver)
      await sleep(700)
    }
  }
  const abrirLibro = async () => {
    await esperarTut('escritura.libros')
    await sleep(500)
    const libro = document.querySelector('[data-tut^="escritura.libro."]')
    if (libro) await tocar(libro)
    await esperarTut('escritura.barra', 6000)
    await sleep(700)
  }
  /** En el panel angosto de la casa las carpetas del libro empiezan cerradas: se abren con su botón. */
  const verCarpetas = async () => {
    if (!document.querySelector('[data-tut="escritura.carpetas"]')) {
      const b = document.querySelector('[data-tut="escritura.btn.carpetas"]')
      if (b) await tocar(b)
      await sleep(700)
    }
  }
  /** Las cabeceras de las carpetas del libro: Capítulos, Personajes, Lugares, Actos y Relaciones. */
  const carpetas = () => [...(document.querySelector('[data-tut="escritura.carpetas"]')?.querySelectorAll('button[aria-expanded]') ?? [])].filter((b) => b.textContent.trim())
  const abrirCarpeta = async (i) => {
    const c = carpetas()[i]
    if (c && c.getAttribute('aria-expanded') !== 'true') await tocar(c)
    await sleep(700)
  }
  const porTexto = (texto) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().endsWith(texto) || b.getAttribute('aria-label') === texto)
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
 * La cámara en tercera persona sin esperar (corre mientras el mago camina): yaw,
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
/** Espera hasta el segundo `s` de la voz. */
const EN = (s) => `while (performance.now() < window.__marcas.voz + ${Math.round(s * 1000)}) await sleep(80)`

/** La casa entera con su tema, en la vista iso (la del cuadrante), un poco girada. */
const DESDE_LEJOS = `
  useCam.setState({ vista: 'iso' })
  {
    const V = window.__casaVista
    if (V) await cortarCam({ ...V, az: V.az + Math.PI / 7 })
  }
`
/**
 * El mago en su sitio, de cara a la cámara (pedido del usuario: nunca de espaldas). Con
 * `lejos`, la toma abre con la casa entera (la línea empieza diciendo en qué tema está).
 */
const PREPARAR_FRENTE = (lejos = false) => `
  ${EN_EL_CUARTO}
  ${SOLTAR_GESTO}
  await teletransportar(rx + ${SITIO.x}, rz + ${SITIO.z} - 0.6)
  await irA(rx + ${SITIO.x}, rz + ${SITIO.z}, 0.12)
  await sleep(300)
  ${gesto('senala')}
  ${lejos ? DESDE_LEJOS : "useCam.setState({ vista: 'tercera', yaw: -0.3, dist3p: 3.0, pitch: 0.4 })"}
`
/**
 * El mago, quieto y de frente, abre la app de su cuarto (sin caminar al escritorio) en el
 * segundo `abre` de la voz; `luego(dur)` = lo que hace en la app mientras sigue la voz. Con
 * `lejos`, la cámara baja primero desde la casa entera hasta él.
 */
const abrirApp = (luego, { lejos = false, abre = 2 } = {}) => (dur) => `
  ${VOZ}
  ${lejos
    ? `await sleep(300)
  await moverCam(camAhora(), await camJugador(80, -1.2), 4200, ease)
  ${girar(-0.35, -0.1, Math.max(1000, Math.round(abre * 1000) - 4200), 3.0, 2.7, 0.4, 0.37)}`
    : girar(-0.3, -0.05, Math.round(abre * 1000) + 400, 3.0, 2.7, 0.4, 0.37)}
  ${EN(abre)}
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(300)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await aLaEstanteria()
    ${luego(dur)}
  }
  ${hastaFinVoz(dur + 1.5)}
`

/**
 * Escribe al final del capítulo abierto, letra a letra, la pregunta de la guía (ya en su idioma).
 * El texto de antes queda guardado y ENTRADAS lo repone en la toma siguiente (la demo sirve para los 16 idiomas).
 */
const ESCRIBIR = (ms) => `
  {
    const ed = document.querySelector('.ProseMirror')
    if (ed) {
      const { db } = await modulo('/src/core/data/db.ts')
      if (!localStorage.getItem('__escrituraRestaurar')) localStorage.setItem('__escrituraRestaurar', JSON.stringify((await db.documentos.toArray()).map((d) => [d.id, d.contenido])))
      ed.focus()
      const sel = window.getSelection()
      sel.selectAllChildren(ed)
      sel.collapseToEnd()
      document.execCommand('insertParagraph')
      const letras = [...(window.__pregunta ?? '')]
      const paso = Math.max(25, Math.round(${ms} / letras.length))
      void (async () => {
        for (const l of letras) {
          document.execCommand('insertText', false, l)
          await sleep(paso)
        }
      })()
    }
  }
`

/**
 * El capítulo de ejemplo no lleva títulos y el índice saldría vacío: antes de abrir el libro, el
 * capítulo que se abre recibe dos (el suyo y, a media hoja, la pregunta de la guía). Se reponen igual que ESCRIBIR.
 */
const TITULOS = `
  {
    const { db } = await modulo('/src/core/data/db.ts')
    const docs = await db.documentos.toArray()
    if (!localStorage.getItem('__escrituraRestaurar')) localStorage.setItem('__escrituraRestaurar', JSON.stringify(docs.map((d) => [d.id, d.contenido])))
    const d = docs.filter((x) => x.seccion === 'capitulo').sort((a, b) => String(b.actualizadoEn).localeCompare(String(a.actualizadoEn)))[0]
    if (d && !d.contenido.includes('<h2')) {
      const [primero, ...resto] = d.contenido.split('</p>')
      await db.documentos.update(d.id, { contenido: '<h1>' + d.titulo + '</h1>' + primero + '</p><h2>' + (window.__pregunta ?? '') + '</h2>' + resto.join('</p>') })
    }
  }
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El tablero de la esquina noroeste en la vista iso; el mago se aparta de él hacia la cámara y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx, bz + 0.5)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.2, y + 1.0, bz + 1.4], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx, y + 1.3, bz + 0.5], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      // Del tablero hacia la cámara (al sureste): de frente, nunca de espaldas.
      await irA(bx + 0.45, bz + 1.2, 0.25)
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
    // Parte 1 (terror), «mira la casa: sigue siendo de terror… escribo lo que me asusta»: la casa entera, el mago y el libro.
    nombre: 'escritorio',
    voz: 'miedo.escritorio',
    tema: 'terror',
    preparar: PREPARAR_FRENTE(true),
    accion: abrirApp(() => 'await abrirLibro()', { lejos: true, abre: 6 }),
  },
  {
    // Parte 2 (terror), «abro un libro y escribo sin miedo: la hoja se guarda sola»: abre el libro y escribe una línea.
    nombre: 'hoja',
    voz: 'blanco.hoja',
    tema: 'terror',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp((dur) => `
      await abrirLibro()
      ${EN(dur * 0.35)}
      ${ESCRIBIR(2600)}
    `),
  },
  {
    // Parte 3 (terror), «cada título que escribo arma solo el índice»: el libro y su índice.
    nombre: 'indice',
    voz: 'orden.indice',
    tema: 'terror',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp((dur) => `
      ${TITULOS}
      await abrirLibro()
      ${EN(dur * 0.4)}
      const indice = porTexto(tGlobal('escritura.indice.boton', 'Índice del documento'))
      if (indice) await tocar(indice)
    `),
  },
  {
    // Parte 4 (pirata), «la casa ahora es un barco pirata… mi estantería»: la casa entera, el mago y la estantería.
    nombre: 'estante',
    voz: 'bitacora.estante',
    tema: 'pirata',
    preparar: PREPARAR_FRENTE(true),
    accion: abrirApp(() => `await esperarTut('escritura.libros')`, { lejos: true, abre: 5.5 }),
  },
  {
    // Parte 5 (pirata), «guardo los personajes, los lugares y los actos»: el libro, sus carpetas y una ficha de personaje.
    nombre: 'personajes',
    voz: 'historias.personajes',
    tema: 'pirata',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp((dur) => `
      await abrirLibro()
      await verCarpetas()
      await abrirCarpeta(1)
      ${EN(dur * 0.45)}
      await abrirCarpeta(2)
      await abrirCarpeta(3)
      ${EN(dur * 0.7)}
      {
        // La primera ficha de personaje: el botón con nombre que sigue a la cabecera de Personajes.
        const bs = [...(document.querySelector('[data-tut="escritura.carpetas"]')?.querySelectorAll('button') ?? [])]
        const i = bs.indexOf(carpetas()[1])
        const ficha = bs.slice(i + 1).find((b) => !b.hasAttribute('aria-expanded') && b.textContent.trim())
        if (ficha) await tocar(ficha)
      }
    `),
  },
  {
    // Parte 6 (pirata), «en Relaciones dibujo cómo se unen mis personajes»: el diagrama en grande.
    nombre: 'relaciones',
    voz: 'trama.relaciones',
    tema: 'pirata',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp((dur) => `
      await abrirLibro()
      await verCarpetas()
      await abrirCarpeta(4)
      ${EN(dur * 0.55)}
      const grande = porTexto(tGlobal('escritura.ref.enGrande', 'Ver en grande'))
      if (grande) await tocar(grande)
    `),
  },
  {
    // Parte 7 (espacio), «la casa ya viaja por el espacio… la inteligencia artificial»: la casa entera, el mago y el menú de la IA.
    nombre: 'ia',
    voz: 'diario.ia',
    tema: 'espacio',
    preparar: PREPARAR_FRENTE(true),
    accion: abrirApp((dur) => `
      await abrirLibro()
      ${EN(Math.max(9.5, dur * 0.55))}
      const ia = document.querySelector('[data-tut="escritura.ia"]')
      if (ia) await tocar(ia)
    `, { lejos: true, abre: 5.5 }),
  },
  {
    // Parte 8 (espacio), «lo descargo, lo imprimo o lo comparto»: el libro, con su barra de exportar a la vista.
    nombre: 'exportar',
    voz: 'continuar.exportar',
    tema: 'espacio',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp(() => `
      await abrirLibro()
      document.querySelector('[data-tut="escritura.exportar"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
    `),
  },
]

/** La salida (en el espacio): de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el mago abre la app por la entrada principal (el escritorio) y entra al libro. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await aLaEstanteria()
    await abrirLibro()
  }
  // Que se vea el libro antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde el mago (en (−0,15, 0,15) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: 0.15, dz: -0.15, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [-0.2, -0.45], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Casi todos escribimos todos los días»: desde el oeste, con el escritorio detrás; señala.
  { yaw: [-0.8, -1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «Pero casi nadie escribe para sí mismo»: desde arriba, más lejos.
  { yaw: [-0.45, -0.25], dist: [3.2, 2.9], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Qué pasa en tu cabeza cuando escribes?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [-0.3, -0.6], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando por delante del mago (yaw de inicio a fin; nunca a su espalda). */
export const ORBITA_SALIDA = [-0.15, -0.5]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * al señalar el escritorio y una subida al alejarse.
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
 * La app 2D en el recuadro del cierre: mientras el mago dice «escribir tus libros, guardar
 * sus personajes… con ayuda de la inteligencia artificial», la toma pasa por cada cosa
 * justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['libros', 'personajes', 'ia'],
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
    const carpetas = () => [...(tut('escritura.carpetas')?.querySelectorAll('button[aria-expanded]') ?? [])].filter((b) => b.textContent.trim())
  `,
  /** La app en la estantería, con el libro de ejemplo (la demo de la app 2D tampoco lo trae). */
  preparar: `
    await dormir(800)
    const { db } = await import('/src/core/data/db.ts')
    if ((await db.historias.count()) === 0) {
      const { ejemploEscritura } = await import('/src/rooms/escritura/ejemplos.ts')
      await ejemploEscritura.materializar(true)
    }
    if (!(await esperarTut('escritura.libros', 12000))) {
      const volver = tut('escritura.volver')
      if (volver) volver.click()
      if (!(await esperarTut('escritura.libros', 6000))) return 'no encontré la estantería de Escritura'
    }
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Libros: la estantería;
   * personajes: el libro abierto con la carpeta de Personajes; ia: el menú de la IA.
   */
  accion: (T) => `
    await hasta(t0, ${T.libros} - 0.3)
    await hasta(t0, ${T.personajes} - 1.4)
    document.querySelector('[data-tut^="escritura.libro."]')?.click()
    await esperarTut('escritura.carpetas')
    await dormir(500)
    const p = carpetas()[1]
    if (p && p.getAttribute('aria-expanded') !== 'true') p.click()
    await hasta(t0, ${T.ia} - 0.6)
    tut('escritura.ia')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al mago (miniaturas.mjs). */
export const MINIATURA = { objeto: '✍️' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «casi nadie escribe para sí mismo»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
