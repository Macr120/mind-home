// Lo propio de la guía de Matemáticas («¿Cuál es el lenguaje del universo?») en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el alien en la casa (en la sala de cómputo) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// Narra el ALIEN VERDE (el cuerpo prediseñado de la app): la casa demo entera mientras va sin tema y
// solo el cuadrante A1 con la nave.
// La casa va SIN tema en la primera mitad y con el de la NAVE ESPACIAL desde la mitad (pedido
// del usuario): la toma de sistemas, justo tras el «like», abre con la casa entera ya convertida
// en nave y la línea lo dice («Mira: mi casa ahora es una nave espacial…»); de ahí al final, nave.
//
// La sala de cómputo de la demo está en la PLANTA BAJA (casa explotada), un cuarto de una celda:
// la estación de cómputo al noroeste (abre la app), su silla delante, la escalera de caracol al
// noreste y puertas al oeste (en medio), al este y al sur. Sus entradas extra se arman EN VIVO
// (ENTRADAS, idempotente): un pizarrón verde con la pregunta en el muro oeste, en la esquina
// suroeste (abre la guía web; regla del usuario: tableros en una esquina, contra la pared,
// nunca frente a una puerta; la lámpara de pie de la demo se corre a la esquina sureste), y una
// calculadora gigante junto al muro este (abre la app en la gráfica).
import path from 'node:path'

/** El narrador: el cuerpo prediseñado «Alien» (CUERPOS_PRESET en src/core/house/cuerpos.ts), verde de fábrica. */
export const CUERPO = 'alien'
/** Sin tema en la entrada; la nave espacial desde la mitad y en la salida. */
export const TEMA = null
export const TEMA_SALIDA = 'nave'
/** La casa demo ENTERA sin tema (pedido del usuario: «no va cortada»); con la nave, solo el cuadrante A1 (`auto-0-0`). */
export const CUADRANTE = (tema) => (tema ? 'auto-0-0' : null)
/** El título del primer segundo, un poco más chico para que no tape al alien. */
export const TITULO_ESCALA = 0.75
/** Sin uso con CUERPO (casa.mjs lo pide si no lo hay). */
export const ATUENDO = 'explorador'
/** La música de fondo: house → techno de los 80 con saxofón y flauta → lofi renacentista (del usuario, en ese orden). */
export const MUSICA_LISTA = 'matematicas.json'

/** El alien en el piso de la sala y `window.__comp` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const estacion = useDiseño.getState().objetos.find((x) => x.tipo === 'estacion-computo' && x.plantillaId === 'computo')
  if (!estacion) return 'SIN estación de cómputo en la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[estacion.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(estacion.roomId)
  window.__comp = { cuarto: estacion.roomId, rx, rz, estacion: estacion.id }
`

/**
 * Los gestos del alien: su cuerpo de piezas no tiene emotes, pero sus brazos (cajas de
 * 0,2 × 0,6 × 0,26) giran desde el hombro (los pivotes de la marcha). Un bucle les suma la
 * apertura según `window.__gestoAlien` ('explica', 'senala' —el brazo DERECHO, hacia el
 * oeste de la sala, donde están la estación y el pizarrón— o null = quietos); los vuelve a
 * buscar si React remonta el avatar.
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
/** Para caminar: brazos quietos. */
const SOLTAR_GESTO = gesto(null)

/**
 * Su sitio: en medio de la sala, un poco al NORTE, de cara al sur (la estación le queda detrás, a su
 * derecha). Así la cámara de tercera persona (a ~3 m al sur) queda dentro de la sala y el muro sur no lo tapa.
 */
const SITIO = { x: -0.1, z: -0.4 }

/** El alien de pie en su sitio, explicando: llega caminando hacia el frente (de cara a la cámara). */
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
  // El marcador de entrada que flota sobre la estación: fuera en esta toma (React lo remonta: se repasa toda la toma).
  // Solo esferas grandes y lejos del alien: su cabeza y sus ojos también son esferas.
  const [mx, mz] = [rx + estacion.x, rz + estacion.z]
  const piso = hs.playerPos.y
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      if ((m.geometry.parameters.radius ?? 0) < 0.08) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - hs.playerPos.x, z - hs.playerPos.z) < 0.6) return
      if (Math.hypot(x - mx, z - mz) < 0.8 && y > piso + 1.2) m.visible = false
    })
  }, 300)
  ${gesto('explica')}
  await sleep(800)
`

/**
 * Las entradas de la sala, armadas en vivo (idempotente): el pizarrón de la guía en el muro
 * oeste (esquina suroeste) y la calculadora gigante junto al muro este. La lámpara de pie de
 * la demo se corre a la esquina sureste para dejarle sitio al pizarrón. Ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const cuarto = estacion.roomId
  // La lámpara de pie, a la esquina sureste.
  const lampara = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:31')
  if (lampara && Math.hypot(lampara.x - 2.4, lampara.z - 2.4) > 0.05) await ds.parcharObjeto(lampara.id, { x: 2.4, z: 2.4 })
  // El pizarrón: marco de madera, tablero verde con la pregunta en «gis», unas fórmulas y su repisa; de cara al este.
  const PIZARRON = { x: -2.78, z: 1.75 }
  let pizarron = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/matematicas'))
  if (pizarron && (pizarron.tipo !== 'piezas' || Math.hypot(pizarron.x - PIZARRON.x, pizarron.z - PIZARRON.z) > 0.05 || pizarron.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(pizarron.id)
    pizarron = undefined
  }
  if (!pizarron) {
    const Y = 1.45
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.5, 1.0, 0.05], color: '#6b4423' },
      { tipo: 'caja', pos: [0, Y, 0.03], tam: [1.4, 0.9, 0.02], color: '#1f4d3a' },
      { tipo: 'plano', pos: [0, Y + 0.16, 0.045], tam: [1.3, 0.36], color: '#1f4d3a', tinta: '#f8fafc', texto: ${JSON.stringify(titulo)} },
      { tipo: 'plano', pos: [-0.42, Y - 0.2, 0.045], tam: [0.48, 0.14], color: '#1f4d3a', tinta: '#bbf7d0', texto: 'E = mc²' },
      { tipo: 'plano', pos: [0.1, Y - 0.2, 0.045], tam: [0.5, 0.14], color: '#1f4d3a', tinta: '#fde68a', texto: 'a² + b² = c²' },
      { tipo: 'plano', pos: [0.5, Y - 0.32, 0.045], tam: [0.34, 0.12], color: '#38bdf8', tinta: '#ffffff', texto: 'MindHaOS' },
      { tipo: 'caja', pos: [0, Y - 0.49, 0.07], tam: [1.4, 0.04, 0.1], color: '#6b4423' },
      { tipo: 'caja', pos: [-0.3, Y - 0.46, 0.07], tam: [0.1, 0.025, 0.025], color: '#f8fafc' },
      { tipo: 'caja', pos: [-0.12, Y - 0.46, 0.07], tam: [0.08, 0.025, 0.025], color: '#fde68a' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#6b4423', undefined, PIZARRON, { piezas, rotY: 90 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    pizarron = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // La calculadora gigante: un pedestal con una calculadora inclinada de pantalla azul; de cara al oeste (al centro de la sala).
  const CALC = { x: 2.35, z: 1.0 }
  let calc = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'piezas' && x.enlaceApp?.plantillaId === 'computo')
  if (calc && Math.hypot(calc.x - CALC.x, calc.z - CALC.z) > 0.05) {
    await ds.removeObjeto(calc.id)
    calc = undefined
  }
  if (!calc) {
    const a = 0.45
    const Y = 1.0
    const rot = [-a, 0, 0]
    const en = (x, arriba, sobre) => [x, Y + arriba * Math.cos(a) + sobre * Math.sin(a), -arriba * Math.sin(a) + sobre * Math.cos(a)]
    const piezas = [
      { tipo: 'caja', pos: [0, 0.03, 0], tam: [0.5, 0.06, 0.4], color: '#334155' },
      { tipo: 'caja', pos: [0, 0.47, -0.05], tam: [0.1, 0.85, 0.1], color: '#475569' },
      { tipo: 'caja', pos: en(0, 0, 0), tam: [0.5, 0.72, 0.08], color: '#1e293b', rot },
      { tipo: 'caja', pos: en(0, 0.22, 0.045), tam: [0.4, 0.16, 0.02], color: '#38bdf8', rot },
    ]
    // Las teclas: 4 × 4.
    const COLORES = ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#f59e0b']
    for (let f = 0; f < 4; f++) for (let c = 0; c < 4; c++) {
      piezas.push({ tipo: 'caja', pos: en(-0.15 + c * 0.1, 0.06 - f * 0.085, 0.05), tam: [0.07, 0.06, 0.025], color: COLORES[c], rot })
    }
    const id = await ds.addObjeto(cuarto, 'piezas', '#1e293b', undefined, CALC, { piezas, rotY: 270 })
    await useDiseño.getState().setObjetoEnlaceApp(id, { plantillaId: 'computo', seccion: 'grafica', titulo: tGlobal('computo.modo.grafica', 'Gráfica') })
    calc = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, estacion: estacion.id, guia: pizarron.id, app: calc.id }
`

/**
 * La app abierta dentro de la casa (el panel del cuarto): espera elementos por su
 * `data-tut` y toca pestañas, modos y botones (sirve en todos los idiomas).
 */
const EN_LA_APP = `
  const esperarTut = async (clave, ms = 12000) => {
    for (let i = 0; i < ms / 200; i++) {
      const el = document.querySelector('[data-tut="' + clave + '"]')
      if (el) return el
      await sleep(200)
    }
    return null
  }
  const pestana = async (id) => {
    const p = await esperarTut('computo.tab.' + id)
    if (p) await tocar(p)
    await sleep(800)
  }
  /** Un modo de la calculadora: abre el menú de modos y toca el suyo. */
  const modo = async (id) => {
    await pestana('calculadora')
    const menu = await esperarTut('computo.calc.modos', 4000)
    if (menu) await tocar(menu)
    await sleep(500)
    const m = await esperarTut('computo.modo.' + id, 3000)
    if (m) m.click()
    await sleep(900)
  }
  /** Escribe en un campo de texto como lo haría el teclado (React escucha el evento input). */
  const teclear = async (campo, texto, ms = 70) => {
    if (!campo) return
    campo.focus()
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    for (let i = 1; i <= texto.length; i++) {
      set.call(campo, texto.slice(0, i))
      campo.dispatchEvent(new Event('input', { bubbles: true }))
      await sleep(ms)
    }
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
 * La cámara en tercera persona sin esperar (corre mientras el alien camina): yaw,
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
 * El alien en su sitio, de cara a la cámara (regla del usuario: el narrador nunca de espaldas).
 * Con `lejos`, la toma abre con la casa entera (la línea empieza diciendo que ahora es una nave).
 */
const PREPARAR_FRENTE = (lejos = false) => `
  ${EN_EL_CUARTO}
  ${SOLTAR_GESTO}
  await teletransportar(rx + ${SITIO.x}, rz + ${SITIO.z} - 0.6)
  await irA(rx + ${SITIO.x}, rz + ${SITIO.z}, 0.12)
  await sleep(300)
  ${gesto('senala')}
  ${lejos ? DESDE_LEJOS : "useCam.setState({ vista: 'tercera', yaw: -0.35, dist3p: 3.0, pitch: 0.4 })"}
`
/**
 * El alien, quieto y de frente, abre la app de su cuarto (sin caminar a la estación) en el
 * segundo `abre` de la voz; `luego(dur)` = lo que hace en la app mientras sigue la voz. Con
 * `lejos`, la cámara baja primero desde la casa entera hasta él.
 */
const abrirApp = (luego, { lejos = false, abre = 2 } = {}) => (dur) => `
  ${VOZ}
  ${lejos
    ? `await sleep(300)
  await moverCam(camAhora(), await camJugador(80, -1.2), 4200, ease)
  ${girar(-0.35, -0.1, Math.max(1000, Math.round(abre * 1000) - 4200), 3.0, 2.7, 0.4, 0.37)}`
    : girar(-0.35, -0.05, Math.round(abre * 1000) + 400, 3.0, 2.7, 0.4, 0.37)}
  ${EN(abre)}
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(300)
  window.__marcas.toque = performance.now()
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('computo.tab.calculadora')
    await sleep(500)
    ${luego(dur)}
  }
  ${hastaFinVoz(dur + 1.5)}
`

/**
 * La explicación paso a paso de la IA, sin llamar a la IA (en la demo no hay cuenta): pone
 * «Pensando…» y luego el desarrollo en el estado de ModoNormal, buscándolo por la fibra de
 * React del campo (sus hooks van [pasos, pensando, errorIA] = [null, false, '']). El
 * desarrollo son solo símbolos: vale para los 16 idiomas.
 */
const PASOS_IA = `
  {
    const PASOS = 'x² − 5x + 6 = 0\\n(x − 2)(x − 3) = 0\\nx − 2 = 0  →  x = 2\\nx − 3 = 0  →  x = 3'
    const campo = document.querySelector('[data-tut="computo.calc.entrada"]')
    const clave = campo && Object.keys(campo).find((k) => k.startsWith('__reactFiber'))
    let f = clave ? campo[clave] : null
    while (f && f.type?.name !== 'ModoNormal') f = f.return
    const hooks = []
    for (let h = f?.memoizedState; h; h = h.next) hooks.push(h)
    const i = hooks.findIndex((h, j) => h.queue && h.memoizedState === null && hooks[j + 1]?.memoizedState === false && hooks[j + 2]?.memoizedState === '')
    if (i >= 0) {
      hooks[i + 1].queue.dispatch(true)
      await sleep(1800)
      hooks[i + 1].queue.dispatch(false)
      hooks[i].queue.dispatch({ de: 'x^2 - 5x + 6 = 0', texto: PASOS })
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
    // El pizarrón del muro oeste en una vista iso desde el SUR (la de siempre, desde el sureste, la tapa el muro
    // del cuarto vecino); el alien se aparta de él hacia la cámara (de frente) y lo toca.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 0.6, bz - 0.3)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 0.9, y + 1.0, bz + 0.5], zoom: 150, az: 0, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx + 0.5, y + 1.2, bz + 0.3], zoom: 190, az: 0, el: ISO_EL }, 2600, ease)
      // Del pizarrón hacia la cámara (al sureste): de frente, nunca de espaldas.
      await irA(bx + 1.0, bz + 0.6, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al pizarrón: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.5, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «tengo un formulario con carpetas de matemáticas, física y química»: el menú del formulario abierto.
    nombre: 'formulario',
    voz: 'universo.formulario',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp(
      (dur) => `
      const menu = await esperarTut('computo.menu.formulario', 4000)
      if (menu && menu.getAttribute('aria-expanded') !== 'true') await tocar(menu)
      const arbol = await esperarTut('computo.form.arbol', 4000)
      // Las carpetas de fábrica (Matemáticas 📐, Física ⚛️, Química 🧪) van después de las de la demo.
      const botones = () => [...(arbol?.querySelectorAll('button') ?? [])]
      const mates = botones().find((b) => b.textContent.includes('📐'))
      mates?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      await sleep(900)
      // Si la carpeta está plegada, se abre (sus fórmulas, con un «=», aparecen justo debajo).
      const formulaDe = () => { const bs = botones(); const i = bs.indexOf(botones().find((b) => b.textContent.includes('📐'))); return bs.slice(i + 1).find((b) => b.textContent.includes('=')) }
      if (mates && !formulaDe()) await tocar(mates)
      ${EN(dur * 0.7)}
      // Una fórmula de Matemáticas: su ficha, lista para calcular.
      const ficha = formulaDe()
      if (ficha) await tocar(ficha)
    `,
      { abre: 1.2 },
    ),
  },
  {
    // Parte 2, «puedo cambiar de base: decimal, binario, hexadecimal»: el modo Bases con un número escrito.
    nombre: 'bases',
    voz: 'origen.bases',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp(
      () => `
      await modo('bases')
      const caja = await esperarTut('computo.calc.bases', 4000)
      await teclear(caja?.querySelector('input'), '2026', 160)
    `,
      { abre: 1 },
    ),
  },
  {
    // Parte 3 (mención), «le pido a la IA que me lo explique paso a paso»: la ecuación escrita y su desarrollo.
    nombre: 'explica',
    voz: 'miedo.explica',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp(
      (dur) => `
      await modo('normal')
      const campo = await esperarTut('computo.calc.entrada', 4000)
      await teclear(campo?.querySelector('input') ?? campo, 'x^2 - 5x + 6 = 0', 60)
      ${EN(dur * 0.45)}
      // Abajo: el botón «Explicar paso a paso» y, enseguida, el desarrollo.
      const main = document.querySelector('main')
      main?.scrollTo({ top: main.scrollHeight, behavior: 'smooth' })
      await sleep(700)
      ${PASOS_IA}
      await sleep(300)
      main?.scrollTo({ top: main.scrollHeight, behavior: 'smooth' })
    `,
      { abre: 1.2 },
    ),
  },
  {
    // Parte 4 (ya nave), «Mira: mi casa ahora es una nave espacial… sistemas, matrices o una regla de tres».
    nombre: 'sistemas',
    voz: 'resolver.sistemas',
    tema: 'nave',
    preparar: PREPARAR_FRENTE(true),
    accion: abrirApp(
      (dur) => `
      await modo('sistemas')
      ${EN(dur * 0.78)}
      await modo('matrices')
      ${EN(dur * 0.9)}
      await modo('regla3')
    `,
      { lejos: true, abre: 5.5 },
    ),
  },
  {
    // Parte 5 (nave), «la veo en el plano, en polares o como una superficie en 3D»: el modo Gráfica y sus tres tipos.
    nombre: 'graficas',
    voz: 'ver.graficas',
    tema: 'nave',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp(
      (dur) => `
      await modo('grafica')
      const tipo = async (id) => {
        const b = await esperarTut('computo.graf.tipo.' + id, 3000)
        if (b) await tocar(b)
      }
      await tipo('2d')
      ${EN(dur * 0.55)}
      await tipo('polar')
      ${EN(dur * 0.78)}
      await tipo('3d')
    `,
      { abre: 1 },
    ),
  },
  {
    // Parte 6 (nave, mención), «mis hojas de cálculo… una gráfica… a Excel o a PDF»: las Hojas, su gráfica y Exportar.
    nombre: 'hojas',
    voz: 'vida.hojas',
    tema: 'nave',
    preparar: PREPARAR_FRENTE(),
    accion: abrirApp(
      (dur) => `
      await pestana('hojas')
      const lista = await esperarTut('computo.hojas.lista', 4000)
      // La primera hoja de la lista (sus filas llevan \`flex-1\`; «Hoja nueva» y «Armarla con IA», no).
      const hoja = [...(lista?.querySelectorAll('button.flex-1') ?? [])].find((b) => b.textContent.trim())
      if (hoja) await tocar(hoja)
      ${EN(dur * 0.6)}
      ;(await esperarTut('computo.hojas.graficas', 3000))?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      ${EN(dur * 0.82)}
      ;(await esperarTut('computo.hojas.exportar', 3000))?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    `,
      { abre: 1.5 },
    ),
  },
]

/** La salida (ya en la nave): de vuelta en su sitio, explicando. */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el alien abre la app por la entrada principal (la estación) y gira una superficie en 3D. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
    ${EN_LA_APP}
    await esperarTut('computo.tab.calculadora')
    await sleep(800)
    await modo('grafica')
    const b = await esperarTut('computo.graf.tipo.3d', 3000)
    if (b) await tocar(b)
  }
  // Que se vea la app antes de terminar.
  await sleep(3000)
`

/** El plano iso del gancho: corrido desde el alien (en (−0,1, −0,4) del cuarto) para que la sala quede al centro. */
export const ISO = { zoom: 84, dx: 0.1, dz: 0.4, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [-0.2, 0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «En 1846, un astrónomo encontró un planeta nuevo…»: desde el oeste, con la estación detrás; señala.
  { yaw: [-0.8, -1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «Hoy vas a ver cómo lo hizo…»: la vista del juego.
  { iso: true },
  // Si el gancho se parte en más frases: desde arriba y de frente.
  { yaw: [-0.45, -0.25], dist: [3.2, 2.9], pitch: [0.7, 0.62], antes: gesto('explica') },
  { yaw: [-0.3, -0.6], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando por delante del alien (yaw de inicio a fin; nunca a su espalda). */
export const ORBITA_SALIDA = [-0.15, -0.5]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras la pregunta del gancho, un destello al señalar y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 2) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'magia.mp3'), en: cortes[0] + 0.2, volumen: 0.24 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras el alien dice «calcular con un formulario…,
 * graficar tus ecuaciones… y armar hojas de cálculo», la toma pasa por cada cosa justo al
 * nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['formulario', 'graficar', 'hojas'],
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
    const modo = async (id) => {
      tut('computo.tab.calculadora')?.click()
      await dormir(400)
      ;(await esperarTut('computo.calc.modos', 3000))?.click()
      await dormir(300)
      ;(await esperarTut('computo.modo.' + id, 3000))?.click()
      await dormir(500)
    }
  `,
  /** La app en la calculadora normal, arriba del todo (así «formulario» abre su menú al decirlo). */
  preparar: `
    await dormir(800)
    if (!(await esperarTut('computo.tab.calculadora', 12000))) return 'no encontré la pestaña Calculadora'
    tut('computo.tab.calculadora').click()
    await dormir(600)
    main().scrollTop = 0
  `,
  /** `T` = segundo del cierre en que se dice cada ancla, y `fin`. */
  accion: (T) => `
    await hasta(t0, ${T.formulario} - 0.6)
    {
      const m = tut('computo.menu.formulario')
      if (m && m.getAttribute('aria-expanded') !== 'true') m.click()
    }
    await hasta(t0, ${T.graficar} - 0.6)
    await modo('grafica')
    await hasta(t0, ${T.hojas} - 0.6)
    tut('computo.tab.hojas')?.click()
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: si no hay icono de la app (iconos.mjs), este emoji en primer plano. */
export const MINIATURA = { objeto: '🧮' }

/** El «fah» del gancho, tras la frase que incomoda (la segunda: «…sin mirar al cielo: solo con lápiz y papel»): antes de la tercera. */
export const PAUSA_ANTES_DE = 2
