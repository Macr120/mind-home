// Lo propio de la guía de Agenda en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está la princesa en la casa (en el cuarto de Agenda) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de la princesa),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra la PRINCESA con vestido AMARILLO, y la casa va con el tema del avión y solo el
// cuadrante A1 a la vista (pedidos del usuario).
//
// El cuarto de Agenda está en la PLANTA BAJA (columna este): la agenda de escritorio al
// noroeste (abre la app), su silla delante, un estante y una planta al noreste. Sus dos
// entradas extra se arman EN VIVO (ENTRADAS, idempotente): un tablero de corcho con la
// pregunta en la pared oeste, en la esquina suroeste (abre la guía web), y un calendario de pared en el muro norte (abre
// el calendario de la casa, el del reloj del HUD).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Princesa» (CUERPOS_PRESET en src/core/house/cuerpos.ts). */
export const CUERPO = 'princesa'
/** El vestido amarillo (casa.mjs cambia ese color de sus piezas). */
export const CUERPO_COLORES = { '#e35d9e': '#facc15' }
/** El tema de la casa: el avión. */
export const TEMA = 'avion'
/** Solo el cuadrante A1 del mapa a la vista (el bloque automático `auto-0-0`). */
export const CUADRANTE = 'auto-0-0'
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'oficinista'
/** La música de Metas: trap → cyberpunk → medieval (pedido del usuario). */
export const MUSICA_LISTA = 'metas.json'

/** La princesa en el piso del cuarto y `window.__agenda` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const escritorio = useDiseño.getState().objetos.find((x) => x.tipo === 'agenda-escritorio' && x.plantillaId === 'agenda')
  if (!escritorio) return 'SIN agenda de escritorio en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[escritorio.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(escritorio.roomId)
  window.__agenda = { cuarto: escritorio.roomId, rx, rz, escritorio: escritorio.id }
`

/**
 * Los gestos de la princesa: su cuerpo de piezas no tiene emotes, pero sus mangas giran
 * desde el hombro (los pivotes de la marcha). Un bucle les suma la apertura según
 * `window.__gestoPrincesa` ('explica', 'senala' —el brazo izquierdo, a su izquierda—,
 * 'senalaDer' —el derecho, a su derecha— o null = quietos); los vuelve a buscar si React
 * remonta el avatar.
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
          : g === 'senalaDer' ? (izq ? 0.12 : 1.4 + 0.05 * Math.sin(t * 2.6))
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

/** Su sitio: al este de la agenda de escritorio, de cara al sur (el escritorio le queda a la derecha; el calendario, a la izquierda). */
const SITIO = { x: -0.55, z: -1.75 }

/** La princesa de pie junto al escritorio, explicando: llega caminando hacia el frente (de cara a la cámara). */
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
 * El corcho de la guía y el calendario de pared (coordenadas del cuarto; con celda 6 la cara
 * de los muros queda a ±2,82 y las puertas ocupan |x| o |z| < 1,1). Regla del usuario: los
 * tableros NUNCA frente a una puerta: en una esquina, contra la pared. El corcho va en la
 * pared oeste junto a la esquina suroeste (mirando al este) y el calendario en el muro norte,
 * entre la puerta y la estantería.
 */
const CORCHO = { x: -2.79, z: 1.95, rotY: 90 }
const CALENDARIO = { x: 1.45, z: -2.79, rotY: 0 }

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el tablero de corcho de la
 * guía en el muro norte y el calendario de pared. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const cuarto = escritorio.roomId
  // La planta del muro norte deja sitio al calendario (a la pared este, lejos de su puerta), y la
  // lámpara de la esquina suroeste, al corcho (junto al escritorio).
  const planta = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:104')
  if (planta && Math.hypot(planta.x - 2.45, planta.z - 1.5) > 0.05) await ds.setObjetoPose(planta.id, 2.45, 1.5, planta.rotY ?? 0)
  const lampara = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:31')
  if (lampara && Math.hypot(lampara.x + 2.45, lampara.z + 1.45) > 0.05) await ds.setObjetoPose(lampara.id, -2.45, -1.45, lampara.rotY ?? 0)
  // El corcho: marco de madera, la pregunta arriba, notas de colores con chinchetas.
  const CORCHO = ${JSON.stringify(CORCHO)}
  let corcho = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/agenda'))
  if (corcho && (corcho.tipo !== 'piezas' || Math.hypot(corcho.x - CORCHO.x, corcho.z - CORCHO.z) > 0.05 || (corcho.rotY ?? 0) !== CORCHO.rotY || corcho.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(corcho.id)
    corcho = undefined
  }
  if (!corcho) {
    const Y = 1.6
    const notas = [
      [-0.38, Y - 0.12, '#fde047'],
      [-0.06, Y - 0.16, '#86efac'],
      [0.26, Y - 0.1, '#93c5fd'],
      [-0.22, Y - 0.34, '#fca5a5'],
      [0.12, Y - 0.36, '#c4b5fd'],
    ].flatMap(([x, y, c]) => [
      { tipo: 'caja', pos: [x, y, 0.045], tam: [0.22, 0.17, 0.006], color: c },
      { tipo: 'caja', pos: [x, y + 0.07, 0.05], tam: [0.025, 0.025, 0.01], color: '#ef4444' },
    ])
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.2, 0.95, 0.05], color: '#7c4a21' },
      { tipo: 'caja', pos: [0, Y, 0.02], tam: [1.1, 0.85, 0.03], color: '#c8955e' },
      { tipo: 'plano', pos: [0, Y + 0.28, 0.042], tam: [1.02, 0.22], color: '#fdf6e3', tinta: '#4c1d95', texto: ${JSON.stringify(titulo)} },
      ...notas,
      { tipo: 'plano', pos: [0.36, Y - 0.38, 0.042], tam: [0.3, 0.07], color: '#8b5cf6', tinta: '#ffffff', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#c8955e', undefined, { x: CORCHO.x, z: CORCHO.z }, { piezas, rotY: CORCHO.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    corcho = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El calendario de pared (el calendario de la casa se abre al tocarlo, desde la escena).
  const CAL = ${JSON.stringify(CALENDARIO)}
  let calendario = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'calendario-pared')
  if (!calendario) {
    const id = await ds.addObjeto(cuarto, 'calendario-pared', '#dc2626', undefined, { x: CAL.x, z: CAL.z }, { rotY: CAL.rotY })
    calendario = useDiseño.getState().objetos.find((x) => x.id === id)
  } else if (Math.hypot(calendario.x - CAL.x, calendario.z - CAL.z) > 0.05) {
    await ds.setObjetoPose(calendario.id, CAL.x, CAL.z, CAL.rotY)
  }
  window.__entradas = { cuarto, escritorio: escritorio.id, guia: corcho.id, cal: calendario.id }
`

/**
 * La app abierta dentro de la casa (el panel del cuarto) o el calendario: espera elementos
 * por su `data-tut` y toca pestañas y botones.
 */
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
  const pestana = async (clave) => {
    const p = await esperarTut(clave)
    if (p) await tocar(p)
    await sleep(700)
  }
  const ui = (await modulo('/src/core/state/rutinasUiStore.ts')).useRutinasUI
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

/** La princesa en (x, z) del cuarto, llegando un paso desde el norte (queda de cara al sur), con un gesto. */
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

/** La princesa al sureste del escritorio (camino a tocarlo); la cámara desde el sureste. */
const PREPARAR_ESCRITORIO = `
  ${MUNDO}
  ${SOLTAR_GESTO}
  const [ex, ez] = await mundo(window.__entradas.escritorio)
  await teletransportar(ex + 1.5, ez + 1.9)
  useCam.setState({ vista: 'tercera', yaw: 0.5, dist3p: 3.0, pitch: 0.42 })
`
/**
 * La princesa va a la agenda de escritorio, la toca y la app se abre (en Trabajo);
 * `luego` = lo que hace en la app mientras sigue la voz. Con `hablaDespues`, la voz
 * arranca cuando la app ya muestra lo que dice.
 */
const alEscritorio = (luego, hablaDespues = false) => (dur) => `
  ${MUNDO}
  const e = window.__entradas
  const [ex, ez] = await mundo(e.escritorio)
  ${hablaDespues ? '' : VOZ}
  ${girar(0.5, 0.2, 2400, 3.0, 2.6, 0.42, 0.46)}
  await irA(ex + 0.75, ez + 0.95, 0.25)
  await sleep(300)
  useInteractUi.getState().selectMueble(e.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(500)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('agenda.tab.trabajo')
    await sleep(600)
    ${luego}
  }
  ${hablaDespues ? `await sleep(300)
  ${VOZ}` : ''}
  ${hastaFinVoz(dur + 1.5)}
`
/** La princesa al suroeste del calendario de pared (camino a tocarlo); la cámara desde el sureste. */
const PREPARAR_CALENDARIO = `
  ${MUNDO}
  ${SOLTAR_GESTO}
  const [cx, cz] = await mundo(window.__entradas.cal)
  await teletransportar(cx - 1.2, cz + 1.9)
  useCam.setState({ vista: 'tercera', yaw: 0.5, dist3p: 3.0, pitch: 0.42 })
`
/**
 * La princesa va al calendario de pared, lo toca y se abre el calendario de la casa en
 * `vista`; `luego(dur)` = lo que hace en él mientras sigue la voz.
 */
const alCalendario = (vista, luego = () => '', hablaDespues = false) => (dur) => `
  ${MUNDO}
  const e = window.__entradas
  const [cx, cz] = await mundo(e.cal)
  ${hablaDespues ? '' : VOZ}
  ${girar(0.5, 0.2, 2400, 3.0, 2.6, 0.42, 0.46)}
  await irA(cx - 0.4, cz + 0.85, 0.25)
  await sleep(300)
  useInteractUi.getState().selectEnlace(e.cal)
  await sleep(700)
  sinPaneles()
  window.__marcas.toque = performance.now()
  {
    ${EN_LA_APP}
    ui.getState().abrirCalendario('${vista}')
    await esperarTut('cal.vista.semana')
    await sleep(800)
    ${hablaDespues ? `await sleep(300)
    ${VOZ}` : ''}
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
    // El corcho de la esquina suroeste en la vista iso; la princesa camina hasta él y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 2.0, bz - 0.5)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 1.2, y + 1.0, bz - 0.2], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.5, y + 1.3, bz], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx + 0.85, bz - 0.1, 0.25)
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
    // Parte 1, «aquí, en mi agenda de escritorio, empieza mi día»: junto al escritorio, señalándolo; desde el sur.
    nombre: 'escritorio',
    voz: 'tiempo.escritorio',
    preparar: `
      ${PARADO(SITIO.x, SITIO.z, 'senalaDer')}
      useCam.setState({ vista: 'tercera', yaw: -0.35, dist3p: 3.0, pitch: 0.36 })
    `,
    accion: conGiro([-0.35, -0.05], [3.0, 2.6], [0.36, 0.32]),
  },
  {
    // Parte 2, «todo va a la bandeja de pendientes»: toca la agenda y abre Trabajo → Pendientes.
    nombre: 'pendientes',
    voz: 'cabeza.pendientes',
    preparar: PREPARAR_ESCRITORIO,
    accion: alEscritorio(`
      await pestana('agenda.trabajo.pendientes')
    `),
  },
  {
    // Parte 2, «una agenda como las de antes, con las personas que conozco… los cuidados… conmigo y con las
    // personas importantes»: Personas (cumpleaños) y, al nombrarlos, Salud → Tú y Salud → Prójimos.
    nombre: 'personas',
    voz: 'cabeza.personas',
    preparar: PREPARAR_ESCRITORIO,
    accion: (dur) => alEscritorio(`
      await pestana('agenda.tab.personas')
      {
        // La primera carpeta cerrada bajo el buscador (Familia en la demo: ahí está el cumpleaños cercano).
        await sleep(900)
        const buscador = document.querySelector('input[type="search"], input[placeholder]')
        const tope = buscador ? buscador.getBoundingClientRect().bottom : 0
        const carpeta = [...document.querySelectorAll('button[aria-expanded="false"]')].find((b) => b.getBoundingClientRect().top > tope)
        if (carpeta) await tocar(carpeta)
      }
      {
        const en = async (s) => { while (performance.now() < window.__marcas.voz + s * 1000) await sleep(80) }
        await en(${(dur * 0.58).toFixed(2)})
        await pestana('agenda.tab.salud')
        await pestana('agenda.salud.sub.yo')
        await en(${(dur * 0.8).toFixed(2)})
        await pestana('agenda.salud.sub.projimos')
      }
    `)(dur),
  },
  {
    // Parte 3, «cada pendiente tiene su prioridad»: Pendientes abierto ANTES de hablar, y el primero en edición (su prioridad).
    nombre: 'prioridad',
    voz: 'primero.prioridad',
    preparar: PREPARAR_ESCRITORIO.replace('ex + 1.5, ez + 1.9', 'ex + 1.1, ez + 1.4'),
    accion: alEscritorio(`
      await pestana('agenda.trabajo.pendientes')
      await sleep(1800)
      const editar = [...document.querySelectorAll('button')].find((b) => b.title === tGlobal('agenda.editar', 'Editar') || b.getAttribute('aria-label') === tGlobal('agenda.editar', 'Editar'))
      if (editar) await tocar(editar)
    `, true),
  },
  {
    // Parte 4, «mis pendientes también viven en un tablero»: Trabajo → Tablero, y una tarjeta avanza de columna.
    nombre: 'tablero',
    voz: 'una.tablero',
    preparar: PREPARAR_ESCRITORIO,
    accion: alEscritorio(`
      await pestana('agenda.trabajo.tablero')
      await sleep(2600)
      const adelante = document.querySelector('[data-tut="agenda.tablero.porhacer"] [aria-label="' + tGlobal('agenda.tablero.adelante', 'Mover a la siguiente columna') + '"]')
      if (adelante) await tocar(adelante)
    `),
  },
  {
    // Parte 5, «aparece solo en mi calendario… y lo veo por día, semana, mes o año»: el calendario de
    // pared abre el de la casa en Día, y al nombrarlas pasa por Semana, Mes y Año.
    nombre: 'calendario',
    voz: 'hora.calendario',
    preparar: PREPARAR_CALENDARIO,
    accion: alCalendario('dia', (dur) => `
      {
        const pasar = async (v, en) => {
          while (performance.now() < window.__marcas.voz + en * 1000) await sleep(80)
          const b = document.querySelector('[data-tut="cal.vista.' + v + '"]')
          if (b) await tocar(b)
        }
        await pasar('semana', ${(dur * 0.72).toFixed(2)})
        await pasar('mes', ${(dur * 0.82).toFixed(2)})
        await pasar('anio', ${(dur * 0.92).toFixed(2)})
      }
    `),
  },
  {
    // Parte 6, «también le doy hora al descanso»: el calendario en la semana, con sus bloques.
    nombre: 'descansos',
    voz: 'pausas.descansos',
    preparar: PREPARAR_CALENDARIO,
    accion: alCalendario('semana'),
  },
  {
    // Parte 7, «arrastro el bloque a otro hueco o lo estiro»: el calendario en la semana, abierto ANTES de hablar.
    nombre: 'mover',
    voz: 'acumula.mover',
    preparar: PREPARAR_CALENDARIO.replace('cx - 1.2, cz + 1.9', 'cx - 0.8, cz + 1.3'),
    accion: alCalendario('semana', () => '', true),
  },
  {
    // Parte 8, «cada app de mi casa tiene las suyas… en mi calendario las veo juntas, día por día, y las palomeo»:
    // el calendario en Misiones (las de cada app, en tarjetas) y luego la semana con su cuadrícula de misiones.
    nombre: 'misiones',
    voz: 'continuar.misiones',
    preparar: PREPARAR_CALENDARIO,
    accion: alCalendario('objetivos', (dur) => `
      while (performance.now() < window.__marcas.voz + ${(dur * 0.62).toFixed(2)} * 1000) await sleep(80)
      {
        const b = document.querySelector('[data-tut="cal.vista.semana"]')
        if (b) await tocar(b)
        const metas = await esperarTut('cal.metas', 4000)
        await sleep(400)
        metas?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    `),
  },
]

/** La salida: de vuelta en su sitio, explicando (la cámara llega a ella y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: la princesa abre la app por la entrada principal (la agenda de escritorio) y pasa al Tablero. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('agenda.tab.trabajo')
    await sleep(1600)
    await pestana('agenda.trabajo.tablero')
  }
  // Que se vea el tablero antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde la princesa (en (−0,55, −1,75) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: 0.55, dz: 1.5, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Todos tenemos las mismas veinticuatro horas»: desde el oeste, con el escritorio detrás; señala.
  { yaw: [-0.8, -1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senalaDer') },
  // «Y aun así, a casi todos nos faltan»: desde arriba, más lejos.
  { yaw: [0.45, 0.25], dist: [3.2, 2.9], pitch: [0.7, 0.62], antes: gesto('explica') },
  // «¿Por qué a algunas personas sí les alcanza?»: la vista del juego.
  { iso: true },
  // La promesa: de frente, más cerca.
  { yaw: [0.3, -0.1], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando alrededor de la princesa (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

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
 * La app 2D en el recuadro del cierre: mientras la princesa dice «apuntar tus pendientes,
 * moverlos en un tablero… que aparezcan en tu calendario… los cumpleaños», la toma pasa por cada cosa
 * justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['pendientes', 'tablero', 'calendario', 'personas'],
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
    const pestana = async (clave) => {
      const p = await esperarTut(clave)
      if (p) await tocar(p)
      await dormir(500)
    }
  `,
  /** La app en Trabajo → Tablero (para que «Pendientes» se vea cambiar al nombrarlo). */
  preparar: `
    await dormir(800)
    if (!(await esperarTut('agenda.tab.trabajo', 12000))) return 'no encontré la pestaña Trabajo'
    tut('agenda.tab.trabajo').click()
    await dormir(600)
    await pestana('agenda.trabajo.tablero')
    main().scrollTop = 0
  `,
  /**
   * \`T\` = segundo del cierre en que se dice cada ancla, y \`fin\`. Pendientes: la bandeja;
   * tablero: el kanban; calendario: el calendario de la casa en la semana; personas: la pestaña
   * Personas (los cumpleaños).
   */
  accion: (T) => `
    await hasta(t0, ${T.pendientes} - 0.5)
    await pestana('agenda.trabajo.pendientes')
    await hasta(t0, ${T.tablero} - 0.5)
    await pestana('agenda.trabajo.tablero')
    await hasta(t0, ${T.calendario} - 0.8)
    const ui = (await import('/src/core/state/rutinasUiStore.ts')).useRutinasUI
    ui.getState().abrirCalendario('semana')
    await hasta(t0, ${T.personas} - 0.6)
    ui.getState().cerrarCalendario()
    await pestana('agenda.tab.personas')
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto a la princesa (miniaturas.mjs). */
export const MINIATURA = { objeto: '⏰' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «a casi todos nos faltan»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
