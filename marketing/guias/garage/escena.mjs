// Lo propio de la guía de Garage en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (Pep@, en el Garage) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra PEP@ con BARBA y el atuendo de MECÁNICO (aunque haya tema: `ROPA`), con la casa en el
// tema del APOCALIPSIS, solo el cuadrante A1 a la vista y la música de Matemáticas, como la
// guía de Entretenimiento (pedidos del usuario).
//
// El Garage está en la PLANTA BAJA de la demo, contra el muro exterior SUR de la casa (el de
// púas en el apocalipsis), con un PORTÓN en ese muro que sube solo si el avatar está a menos de
// 3 m (Room3D): el gabinete de herramientas al noroeste (abre la app), una repisa de piezas al
// noreste y un banco de trabajo al centro. Por eso Pep@ va al NORTE del banco, de cara al sur
// (lejos del portón, que se queda cerrado; pedido del usuario), con las cámaras dentro del
// cuarto, del lado sur. El tablero de corcho con la pregunta se arma EN VIVO (ENTRADAS, idempotente) en
// el muro oeste, hacia la esquina noroeste, junto al gabinete (regla del usuario: tableros contra
// la pared, en una esquina, nunca frente a una puerta: la del muro oeste está en su mitad sur).
import path from 'node:path'

/** Sin CUERPO ni FORMA: narra Pep@. Su atuendo, el de mecánico… */
export const ATUENDO = 'mecanico'
/** …con barba, también con el tema puesto (casa.mjs la aplica tras el tema; en la página, `ropaDeGuia` de pep.ts). */
export const ROPA = {
  camisa: { color: '#3b5998' },
  pantalon: { color: '#334155' },
  gorra: { color: '#1f2937' },
  guantes: { color: '#78350f' },
  botas: { color: '#111827' },
  barba: { color: '#3a2a1a' },
}
/** La casa en pleno apocalipsis, toda la guía. */
export const TEMA = 'apocalipsis'
/** Solo el cuadrante A1 del mapa a la vista (el bloque automático `auto-0-0`). */
export const CUADRANTE = 'auto-0-0'
/** El título del primer segundo: grande, pero sin tapar a Pep@ (el primer plano arranca lejos). */
export const TITULO_ESCALA = 0.8
/** La música de la guía de Matemáticas, como Entretenimiento. */
export const MUSICA_LISTA = 'matematicas.json'

/** Pep@ en el piso del cuarto y `window.__gar` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const gabinete = useDiseño.getState().objetos.find((x) => x.plantillaId === 'garage')
  if (!gabinete) return 'SIN el objeto del Garage en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[gabinete.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(gabinete.roomId)
  window.__gar = { cuarto: gabinete.roomId, rx, rz, gabinete: gabinete.id }
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

/** Su sitio: al norte del banco de trabajo, de cara al sur (coordenadas del cuarto; a 3,4 m del portón). */
const SITIO = { x: 0, z: -0.6 }

/** Llega caminando hacia el sur (de cara a la cámara) hasta su sitio. */
const A_SU_SITIO = `
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.7)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
`

/** Pep@ de pie tras el banco, explicando. */
export const PEP_EN_SU_SITIO = `
  ${SOLTAR_GESTO}
  await sleep(600)
  ${EN_EL_CUARTO}
  ${A_SU_SITIO}
  await sleep(500)
  // El marcador de entrada que flota sobre el gabinete: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + gabinete.x, rz + gabinete.z]
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
 * ±2,82): en el muro OESTE, hacia la esquina noroeste, junto al gabinete, mirando al este.
 */
const TABLERO = { x: -2.79, z: -1.45, rotY: 90 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de corcho de la guía, con
 * la pregunta, una llave inglesa, un desarmador y una llanta pintados encima. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = gabinete.roomId
  const TABLERO = ${JSON.stringify(TABLERO)}
  let tablero = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/garage'))
  if (tablero && (tablero.tipo !== 'piezas' || Math.hypot(tablero.x - TABLERO.x, tablero.z - TABLERO.z) > 0.05 || (tablero.rotY ?? 0) !== TABLERO.rotY || tablero.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(tablero.id)
    tablero = undefined
  }
  if (!tablero) {
    const Y = 1.6
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      { tipo: 'plano', pos: [0, Y + 0.28, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#7c2d12', texto: ${JSON.stringify(titulo)} },
      // Una llanta: el neumático negro y el rin gris.
      { tipo: 'caja', pos: [-0.3, Y - 0.15, 0.045], tam: [0.3, 0.3, 0.02], color: '#111827' },
      { tipo: 'caja', pos: [-0.3, Y - 0.15, 0.058], tam: [0.13, 0.13, 0.01], color: '#9ca3af' },
      // Una llave inglesa (el mango y la boca) y un desarmador (el mango rojo y la punta).
      { tipo: 'caja', pos: [0.08, Y - 0.15, 0.045], tam: [0.05, 0.3, 0.012], color: '#94a3b8' },
      { tipo: 'caja', pos: [0.08, Y + 0.01, 0.045], tam: [0.12, 0.06, 0.012], color: '#94a3b8' },
      { tipo: 'caja', pos: [0.3, Y - 0.08, 0.045], tam: [0.05, 0.14, 0.014], color: '#dc2626' },
      { tipo: 'caja', pos: [0.3, Y - 0.22, 0.045], tam: [0.015, 0.14, 0.01], color: '#cbd5e1' },
      // Las chinchetas.
      { tipo: 'caja', pos: [-0.3, Y + 0.02, 0.06], tam: [0.025, 0.025, 0.01], color: '#ef4444' },
      { tipo: 'caja', pos: [0.08, Y + 0.06, 0.06], tam: [0.025, 0.025, 0.01], color: '#22c55e' },
      { tipo: 'plano', pos: [0.36, Y - 0.39, 0.042], tam: [0.3, 0.07], color: '#fbbf24', tinta: '#0f172a', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: TABLERO.x, z: TABLERO.z }, { piezas, rotY: TABLERO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    tablero = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, gabinete: gabinete.id, guia: tablero.id }
`

/** La app abierta dentro de la casa (el panel del cuarto): espera elementos por su `data-tut`, cambia de pestaña y abre vehículos. */
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
  /** Va a una pestaña del garage ('resumen' o 'vehiculos'). */
  const pestana = async (id) => {
    const b = await esperarTut('garage.tab.' + id)
    if (b && b.getAttribute('aria-selected') !== 'true') await tocar(b)
    await sleep(800)
  }
  const verTut = async (clave) => {
    const el = await esperarTut(clave, 4000)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await sleep(900)
    return el
  }
  /** Abre la ficha del vehículo de ese tipo ('auto' o 'bicicleta') desde la pestaña Vehículos. */
  const vehiculo = async (tipo) => {
    await pestana('vehiculos')
    const v = (await db.vehiculos.toArray()).find((x) => x.tipo === tipo)
    const el = v && (await verTut('garage.veh.item.' + v.id))
    if (el) await tocar(el)
    await esperarTut('garage.detalle.portada', 5000)
    await sleep(700)
  }
  /** Una pestaña de la ficha ('tramites', 'documentos' o 'contactos'). */
  const ficha = async (id) => {
    const b = await esperarTut('garage.detalle.tab.' + id, 4000)
    if (b) await tocar(b)
    await sleep(800)
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
 * Pep@, quieto y de frente, abre la app de su cuarto (sin caminar al gabinete) en el segundo
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
    await esperarTut('garage.tab.resumen')
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
    // El tablero del muro oeste en la vista iso; Pep@ se aparta de él hacia la cámara y lo toca.
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
    // Parte 1, «el resumen de mi garage me dice qué está vencido y qué viene en camino».
    nombre: 'resumen',
    voz: 'prevenir.resumen',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('resumen')
      await verTut('garage.resumen.semaforo')
      ${EN(dur * 0.55)}
      await deslizar(450, 2500)
    `, 3),
  },
  {
    // Parte 2, «cada vehículo tiene su ficha: el Mastodonte… y la Grulla».
    nombre: 'ficha',
    voz: 'bertha.ficha',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('vehiculos')
      await verTut('garage.veh.lista')
      ${EN(dur * 0.55)}
      await vehiculo('auto')
    `),
  },
  {
    // Parte 3, «en el historial de cada vehículo anoto cada servicio, con su fecha y lo que me costó».
    nombre: 'historial',
    voz: 'llantas.historial',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await vehiculo('auto')
      await verTut('garage.detalle.historial')
      await deslizar(700, Math.max(2000, (${dur} - 4) * 1000))
    `, 1.5),
  },
  {
    // Parte 4, «cuando registro un cambio de aceite, apunto el odómetro, y la app me dice cuándo toca el próximo».
    nombre: 'proximo',
    voz: 'aceite.proximo',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await vehiculo('auto')
      const hist = await verTut('garage.detalle.historial')
      const nuevo = hist && [...hist.querySelectorAll('button')].find((b) => b.textContent.includes(tGlobal('garage.detalle.registrar', 'Registrar mantenimiento')))
      if (nuevo) await tocar(nuevo)
      await sleep(900)
      const aceite = [...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === tGlobal('garage.servicio.aceite', 'Cambio de aceite'))
      aceite?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ${EN(dur * 0.35)}
      if (aceite) await tocar(aceite)
      await sleep(900)
      const prox = [...document.querySelectorAll('main *')].find((e) => e.childElementCount <= 1 && e.textContent.trim().startsWith(tGlobal('garage.mant.proximo', 'Próximo servicio (opcional)').slice(0, 12)))
      prox?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    `, 1.5),
  },
  {
    // Parte 5, «al final del año veo cuánto gasté en cada vehículo».
    nombre: 'gasto',
    voz: 'manejo.gasto',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await pestana('resumen')
      await verTut('garage.resumen.stats')
      ${EN(dur * 0.6)}
      await pestana('vehiculos')
    `, 1.5),
  },
  {
    // Parte 6, «la Grulla también tiene su historial: la cadena, las zapatas, cada ponchadura».
    nombre: 'grulla',
    voz: 'bici.grulla',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await vehiculo('bicicleta')
      await verTut('garage.detalle.historial')
      await deslizar(600, Math.max(2000, (${dur} - 4) * 1000))
    `, 1.5),
  },
  {
    // Parte 7, «mis trámites, como la verificación o la renovación de la póliza, se agendan solos».
    nombre: 'tramites',
    voz: 'olvido.tramites',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp(() => `
      await vehiculo('auto')
      await ficha('tramites')
      await verTut('garage.tramites')
    `, 1.5),
  },
  {
    // Parte 8, «en la ficha de cada vehículo guardo sus documentos y los contactos de mis talleres».
    nombre: 'contactos',
    voz: 'continuar.contactos',
    preparar: PREPARAR_FRENTE,
    accion: abrirApp((dur) => `
      await vehiculo('auto')
      await ficha('documentos')
      await verTut('garage.documentos')
      ${EN(dur * 0.6)}
      await ficha('contactos')
      await verTut('garage.talleres')
    `, 1.5),
  },
]

/** La salida: de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: Pep@ abre la app de frente y va a sus vehículos. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  await sleep(1500)
  // Si la burbuja no abrió la app (en la salida puede quedar otra barra encima), se abre el cuarto directo.
  if (!document.querySelector('[data-tut="garage.tab.resumen"]')) useHouse.getState().openRoom(window.__entradas.cuarto)
  {
    ${EN_LA_APP}
    await esperarTut('garage.tab.resumen')
    await sleep(600)
    await pestana('vehiculos')
  }
  // Que se vean sus vehículos antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: el cuarto al centro (Pep@ está al norte del banco). */
export const ISO = { zoom: 84, dx: 0, dz: 0.6, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. Siempre por delante de él (desde el sur, dentro del cuarto). */
export const PLANOS = [
  { yaw: [-0.15, 0.1], dist: [3.0, 2.6], pitch: [0.44, 0.4] }, // de frente, acercándose (lejos al principio: el título no le tapa la cabeza)
  // «Uno de cada cuatro coches… una llanta muy baja»: desde el suroeste; señala.
  { yaw: [-0.65, -0.85], dist: [2.7, 2.4], pitch: [0.42, 0.38], antes: gesto('senala') },
  // «Y casi nadie se da cuenta hasta que algo truena»: desde arriba.
  { yaw: [0.3, 0.1], dist: [2.8, 2.6], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Y si cuidar tu coche o tu bici…?»: la vista del juego.
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
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «tus vehículos… sus servicios…
 * tus trámites», la toma pasa por cada cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['vehiculos', 'servicios', 'tramites'],
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
  /** La app en sus vehículos. */
  preparar: `
    await dormir(800)
    const pest = await esperarTut('garage.tab.vehiculos', 12000)
    if (!pest) return 'no encontré la pestaña de Vehículos del Garage'
    pest.click()
    if (!(await esperarTut('garage.veh.lista'))) return 'no encontré la lista de vehículos del Garage'
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Vehículos: la lista;
   * servicios: la ficha del primero, en su historial; trámites: su pestaña de trámites.
   */
  accion: (T) => `
    await hasta(t0, ${T.servicios} - 1.2)
    document.querySelector('[data-tut^="garage.veh.item."]')?.click()
    await dormir(900)
    tut('garage.detalle.historial')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    await hasta(t0, ${T.tramites} - 0.8)
    main().scrollTo({ top: 0, behavior: 'smooth' })
    tut('garage.detalle.tab.tramites')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a Pep@ (miniaturas.mjs). */
export const MINIATURA = { objeto: '🔧' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «hasta que algo truena»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
