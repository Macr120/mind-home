// Lo propio de la guía de Música en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está el narrador en la casa (el mago, en el Studio de audio) y los planos de cada frase
//   · montar.mjs los efectos de esa toma y el Himno que suena bajo la voz (`musica` de cada toma)
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// La narra el mago (como Idiomas), aquí de VERDE (FORMA_COLOR), sin tema en la casa.
// El Studio de audio está en la planta baja del ala del Studio (src/demo/mapa/casa.ts,
// `ALA_STUDIO`): el teclado MIDI al norte (abre la app), el banco de trabajo al este y
// el sofá al sur. Sus dos entradas extra se arman EN VIVO (ENTRADAS, idempotente): un
// cartel con la pregunta y un pentagrama en el muro norte (abre la guía web) y una
// consola de mezcla sobre el banco (abre las Canciones de la app).
// Los ejemplos del Himno que suenan en las tomas salen de musica/sonidos.mjs.
import path from 'node:path'

/** El narrador: el avatar con la forma integrada del mago (casa.mjs le quita la ropa), de verde. */
export const FORMA = 'mago'
export const FORMA_COLOR = '#2f8f4e'
/** La música de fondo: la misma del mago en Idiomas (musica/idiomas.json); montar.mjs la baja aún más donde suenan los ejemplos. */
export const MUSICA_LISTA = 'idiomas.json'
/** Herramientas de la página que suenan: mientras su línea se narra, la música de fondo se agacha más (montar.mjs). */
export const HERRAMIENTAS_QUE_SUENAN = ['onda', 'dosCanciones', 'pulso', 'cajaRitmos', 'sincopa', 'teclado', 'acorde', 'mayorMenor', 'progresion', 'mezclador', 'mezcladorBalance', 'dj']
/** Sin uso con FORMA (casa.mjs lo pide si no la hay). */
export const ATUENDO = 'academico'

/** El narrador en su piso y `window.__musica` con el origen del cuarto en el mundo. */
const EN_EL_CUARTO = `
  const teclado = useDiseño.getState().objetos.find((x) => x.tipo === 'teclado-midi' && x.plantillaId === 'audio')
  if (!teclado) return 'SIN teclado MIDI en el Studio de audio de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[teclado.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(teclado.roomId)
  window.__musica = { cuarto: teclado.roomId, rx, rz, teclado: teclado.id }
`

/**
 * Los gestos del mago: el de la app no tiene emotes, solo el brazo del orbe
 * articulado. Un bucle mueve ese brazo según `window.__gestoMago` ('explica',
 * 'senala', 'toca' o null = quieto); lo vuelve a buscar si React remonta el avatar.
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
        // 'toca': el brazo al frente, golpeando al pulso del Himno (112 por minuto).
        const [z, x] =
          g === 'explica' ? [0.4 + 0.25 * Math.sin(t * 2.1), -0.5 + 0.25 * Math.sin(t * 1.3)]
          : g === 'senala' ? [1.4 + 0.05 * Math.sin(t * 2.6), -0.45]
          : g === 'toca' ? [0.25, -1.05 + 0.18 * Math.abs(Math.sin(t * Math.PI * 112 / 60))]
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

/** Su sitio: al este del teclado, de cara al sur (a la cámara). Coordenadas del cuarto. */
const SITIO = { x: 0.15, z: -1.0 }

/** En su sitio junto al teclado: llega caminando hacia el sur (de cara a la cámara), explicando. */
export const PEP_EN_SU_SITIO = `
  ${EN_EL_CUARTO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + ${SITIO.x}, z: rz + ${SITIO.z} }
  await teletransportar(SITIO.x, SITIO.z - 0.8)
  await irA(SITIO.x, SITIO.z, 0.12)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre el teclado: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + teclado.x, rz + teclado.z]
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
  await sleep(600)
`

/**
 * Las entradas del cuarto, armadas en vivo (idempotente): el cartel de la guía en
 * el muro norte y la consola de mezcla sobre el banco de trabajo. Sus ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${EN_EL_CUARTO}
  const ds = useDiseño.getState()
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const cuarto = teclado.roomId
  // El cartel: marco oscuro, papel, la pregunta arriba y un pentagrama con notas del Himno.
  const CARTEL = { x: 0.75, z: -2.9 }
  let cartel = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/musica'))
  if (cartel && (cartel.tipo !== 'piezas' || Math.hypot(cartel.x - CARTEL.x, cartel.z - CARTEL.z) > 0.05 || cartel.nombre !== ${JSON.stringify(titulo)})) {
    await ds.removeObjeto(cartel.id)
    cartel = undefined
  }
  if (!cartel) {
    const Y = 1.6
    const lineas = [0, 1, 2, 3, 4].map((i) => ({ tipo: 'caja', pos: [0, Y - 0.12 - i * 0.05, 0.043], tam: [1.1, 0.008, 0.004], color: '#1f2937' }))
    // Mi, mi, fa, sol, sol, fa, mi, re: las primeras notas del Himno sobre el pentagrama.
    const notas = [0, 0, 1, 2, 2, 1, 0, -1].map((h, i) => ({ tipo: 'caja', pos: [-0.42 + i * 0.12, Y - 0.27 + h * 0.025, 0.046], tam: [0.05, 0.035, 0.006], color: '#2f8f4e' }))
    const piezas = [
      { tipo: 'caja', pos: [0, Y, 0], tam: [1.36, 0.96, 0.06], color: '#1f2937' },
      { tipo: 'caja', pos: [0, Y, 0.025], tam: [1.24, 0.84, 0.03], color: '#fdf6e3' },
      { tipo: 'plano', pos: [0, Y + 0.25, 0.042], tam: [1.16, 0.26], color: '#fdf6e3', tinta: '#14532d', texto: ${JSON.stringify(titulo)} },
      ...lineas,
      ...notas,
      { tipo: 'plano', pos: [0.4, Y - 0.36, 0.042], tam: [0.4, 0.09], color: '#2f8f4e', tinta: '#ffffff', texto: 'MindHaOS' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#fdf6e3', undefined, CARTEL, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    cartel = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // La consola: cuatro canales con sus faders de colores (batería, bajo, acordes, melodía) sobre el banco.
  const CONSOLA = { x: 1.3, z: -0.35 }
  let consola = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceApp?.plantillaId === 'audio')
  if (consola && Math.hypot(consola.x - CONSOLA.x, consola.z - CONSOLA.z) > 0.05) {
    await ds.removeObjeto(consola.id)
    consola = undefined
  }
  if (!consola) {
    const Y = 0.66
    const colores = ['#f97316', '#a855f7', '#22c55e', '#3b82f6']
    const canales = colores.flatMap((c, i) => {
      const z = -0.15 + i * 0.1
      return [
        { tipo: 'caja', pos: [0.02, Y + 0.065, z], tam: [0.3, 0.004, 0.012], color: '#0b0f19' },
        { tipo: 'caja', pos: [-0.06 + i * 0.04, Y + 0.075, z], tam: [0.04, 0.02, 0.05], color: c },
        { tipo: 'caja', pos: [0.14, Y + 0.075, z], tam: [0.03, 0.025, 0.03], color: '#e5e7eb' },
      ]
    })
    const piezas = [
      { tipo: 'caja', pos: [0, Y + 0.03, 0], tam: [0.42, 0.06, 0.5], color: '#111827' },
      { tipo: 'caja', pos: [0, Y + 0.062, 0], tam: [0.38, 0.004, 0.46], color: '#374151' },
      ...canales,
      // La pantallita del fondo.
      { tipo: 'caja', pos: [0.17, Y + 0.12, 0], tam: [0.03, 0.1, 0.3], color: '#0ea5e9' },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', '#111827', undefined, CONSOLA, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlaceApp(id, { plantillaId: 'audio', seccion: 'canciones', titulo: tGlobal('audio.tab.canciones', 'Canciones') })
    consola = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  window.__entradas = { cuarto, teclado: teclado.id, guia: cartel.id, app: consola.id }
`

/**
 * La app abierta dentro de la casa (el panel del cuarto): ayudas para tocar sus
 * botones por su texto o etiqueta en el idioma de la demo.
 */
const EN_LA_APP = `
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  const botones = () => [...document.querySelectorAll('main button')]
  const porEtiqueta = (clave, es, n = 0) => botones().filter((b) => b.getAttribute('aria-label') === tGlobal(clave, es))[n]
  const carpeta = (clave, es) => botones().find((b) => b.innerText.trim().startsWith(tGlobal(clave, es)))
`
/** Abre «Festivo» en el editor, la toca y baja a sus pistas (volumen, paneo y efectos de cada una). */
const FESTIVO_EN_EL_EDITOR = `{
  ${EN_LA_APP}
  await sleep(1000)
  document.querySelector('[data-tut="audio.tab.canciones"]')?.click()
  await sleep(500)
  carpeta('audio.lista.carpetaAmbiente', 'Música ambiental')?.click()
  await sleep(800)
  const editar = porEtiqueta('audio.lista.abrirEditor', 'Abrir en el editor', 1)
  if (editar) await tocar(editar)
  await sleep(1000)
  const play = porEtiqueta('audio.transporte.play', 'Reproducir')
  if (play) await tocar(play)
  await sleep(600)
  const caja = [...document.querySelectorAll('main .overflow-y-auto')].find((x) => x.scrollHeight > x.clientHeight + 40)
  caja?.scrollTo({ top: caja.scrollHeight, behavior: 'smooth' })
}`

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

/** El mago en su sitio junto al teclado, de cara al sur, con un gesto. */
const EN_SU_SITIO = (g) => `
  ${EN_EL_CUARTO}
  await teletransportar(rx + ${SITIO.x}, rz + ${SITIO.z} - 0.5)
  await irA(rx + ${SITIO.x}, rz + ${SITIO.z}, 0.12)
  await sleep(300)
  ${gesto(g)}
`
/** Una toma que se narra con el mago quieto y la cámara girando a su alrededor. */
const conGiro = (yaw, dist, pitch) => (dur) => `
  ${VOZ}
  ${girar(yaw[0], yaw[1], `${Math.round(dur * 1000) + 600}`, dist[0], dist[1], pitch[0], pitch[1])}
  ${hastaFinVoz(dur)}
`

/**
 * Las tomas intermedias (casa.mjs). Sin `voz`, puente entre la casa y la página;
 * con `voz`, la línea `enCasa` del guion que se narra encima (en medio de su parte).
 * `musica`: el ejemplo del Himno que suena bajo la voz (montar.mjs).
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // El cartel del muro norte en la vista iso; el mago camina hasta él y lo toca.
    preparar: `
      ${MUNDO}
      ${gesto(null)}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx - 0.6, bz + 1.9)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx - 0.2, y + 1.0, bz + 1.2], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [bx, bz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      void moverCam(camAhora(), { focus: [bx, y + 1.3, bz + 0.5], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(bx - 0.1, bz + 0.85, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(400)
      sinPaneles()
      await sleep(800)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al cartel: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [bx, y + 1.6, bz], zoom: 320 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    // Parte 1, «el Himno suena en tres capas»: tocando el teclado; la cámara lo rodea desde el sureste.
    nombre: 'capas',
    voz: 'musica.teclado',
    musica: { archivo: 'sonidos/capas.mp3', volumen: 0.32 },
    preparar: `
      ${EN_SU_SITIO('toca')}
      useCam.setState({ vista: 'tercera', yaw: 0.45, dist3p: 3.0, pitch: 0.4 })
    `,
    accion: conGiro([0.45, 0.1], [3.0, 2.6], [0.4, 0.36]),
  },
  {
    // Parte 2, el MIDI: «un teclado y una computadora son un estudio completo»; desde el oeste, el teclado delante.
    nombre: 'midi',
    voz: 'historia.midi',
    musica: { archivo: 'sonidos/manos.mp3', volumen: 0.2 },
    preparar: `
      ${EN_SU_SITIO('senala')}
      useCam.setState({ vista: 'tercera', yaw: -0.85, dist3p: 3.0, pitch: 0.44 })
    `,
    accion: conGiro([-0.85, -1.2], [3.0, 2.6], [0.44, 0.4]),
  },
  {
    // Parte 3, «así armo yo la base del Himno, golpe por golpe»: junto al banco de la consola, solo la batería.
    nombre: 'ritmo',
    voz: 'ritmo.palmas',
    musica: { archivo: 'sonidos/ritmo.mp3', volumen: 0.34 },
    preparar: `
      ${MUNDO}
      const [cx, cz] = await mundo(window.__entradas.app)
      // Al oeste de la consola, de cara al sur (avanza un paso para girarse): la consola, a su izquierda.
      await teletransportar(cx - 0.75, cz - 0.3)
      await irA(cx - 0.75, cz + 0.35, 0.12)
      await sleep(300)
      useCam.setState({ vista: 'tercera', yaw: -0.35, dist3p: 3.0, pitch: 0.42 })
      ${gesto('toca')}
    `,
    accion: conGiro([-0.35, 0.1], [3.0, 2.6], [0.42, 0.38]),
  },
  {
    // Parte 4, «así toco yo el Himno con un dedo»: el teclado desde arriba, solo la melodía.
    nombre: 'melodia',
    voz: 'melodia.tararea',
    musica: { archivo: 'sonidos/melodia.mp3', volumen: 0.34 },
    preparar: `
      ${EN_SU_SITIO('toca')}
      useCam.setState({ vista: 'tercera', yaw: -0.45, dist3p: 2.6, pitch: 0.7 })
    `,
    accion: conGiro([-0.45, -0.2], [2.6, 2.3], [0.7, 0.62]),
  },
  {
    // Parte 5, «la derecha, la melodía; la izquierda, los acordes»: desde el este, melodía y acordes.
    nombre: 'manos',
    voz: 'armonia.manos',
    musica: { archivo: 'sonidos/manos.mp3', volumen: 0.32 },
    preparar: `
      ${EN_SU_SITIO('toca')}
      useCam.setState({ vista: 'tercera', yaw: 0.85, dist3p: 2.8, pitch: 0.4 })
    `,
    accion: conGiro([0.85, 1.15], [2.8, 2.5], [0.4, 0.36]),
  },
  {
    // Parte 6, la mención: va a la consola del banco y la abre (las Canciones de la app); suena la mezcla.
    nombre: 'mezcla',
    voz: 'mezcla.mencion-mezcla',
    musica: { archivo: 'sonidos/completo.mp3', volumen: 0.22 },
    preparar: `
      ${MUNDO}
      ${gesto(null)}
      const [cx, cz] = await mundo(window.__entradas.app)
      await teletransportar(cx - 1.5, cz + 0.6)
      // Desde el suroeste: se le ve de lado camino a la consola.
      useCam.setState({ vista: 'tercera', yaw: -0.6, dist3p: 3.0, pitch: 0.44 })
    `,
    accion: (dur) => `
      ${MUNDO}
      const e = window.__entradas
      const [cx, cz] = await mundo(e.app)
      ${VOZ}
      ${girar(-0.6, -0.2, 2400, 3.0, 2.5, 0.44, 0.5)}
      await irA(cx - 0.55, cz + 0.1, 0.25)
      await sleep(300)
      useInteractUi.getState().selectEnlace(e.app)
      await sleep(400)
      sinPaneles()
      await sleep(500)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // «cada pista tiene su canal…, con su volumen, su paneo y sus efectos»: se ve en el editor.
      ${FESTIVO_EN_EL_EDITOR}
      ${hastaFinVoz(dur + 1.5)}
    `,
  },
  {
    // Parte 7, «así queda el Himno con sus cuatro pistas mezcladas»: en medio del cuarto, la cámara lo rodea.
    nombre: 'graba',
    voz: 'plan.graba',
    musica: { archivo: 'sonidos/completo.mp3', volumen: 0.36 },
    preparar: `
      ${EN_EL_CUARTO}
      await teletransportar(rx + 0.2, rz - 0.1)
      await irA(rx + 0.2, rz + 0.5, 0.12)
      await sleep(300)
      useCam.setState({ vista: 'tercera', yaw: -0.4, dist3p: 3.2, pitch: 0.38 })
      ${gesto('explica')}
    `,
    accion: conGiro([-0.4, 0.4], [3.2, 2.7], [0.38, 0.34]),
  },
]

/** La salida: de vuelta en su sitio, explicando (la cámara llega a él y gira). */
export const PREPARAR_SALIDA = `
  ${gesto('explica')}
  await sleep(600)
`

/** El final de la salida: el mago abre la app por la entrada principal (el teclado) y pasa a Mezclar, con los dos platos sonando. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(400)
  sinPaneles()
  await sleep(600)
  await tocar(burbuja())
  {
  ${EN_LA_APP}
  // La app tarda en cargar la primera vez («Cargando…»): espera a su pestaña de Mezclar.
  let mezclar = null
  for (let i = 0; i < 60 && !mezclar; i++) {
    await sleep(200)
    mezclar = document.querySelector('[data-tut="audio.tab.mezclar"]')
  }
  await sleep(800)
  if (mezclar) await tocar(mezclar)
  await sleep(900)
  const a = porEtiqueta('audio.mezclar.play', 'Reproducir')
  if (a) await tocar(a)
  await sleep(900)
  const b = porEtiqueta('audio.mezclar.play', 'Reproducir')
  if (b) await tocar(b)
  }
  // Que se vea el DJ andando antes de terminar.
  await sleep(3200)
`

/** El plano iso del gancho: corrido desde el mago (en (0,15, −1) del cuarto) para que el cuarto quede al centro. */
export const ISO = { zoom: 84, dx: -0.15, dz: 1.0, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Hoy una IA compone una canción en segundos»: desde el este, con el teclado detrás; señala.
  { yaw: [0.8, 1.05], dist: [3.0, 2.6], pitch: [0.4, 0.36], antes: gesto('senala') },
  // «Y aun así, millones siguen aprendiendo a tocar»: desde arriba, tocando el teclado.
  { yaw: [-0.45, -0.25], dist: [2.6, 2.3], pitch: [0.72, 0.64], antes: gesto('toca') },
  // «¿Para qué, si una máquina ya lo hace?»: la vista del juego.
  { iso: true, antes: gesto('explica') },
  // La promesa: de frente, más cerca.
  { yaw: [0.3, -0.1], dist: [3.0, 2.6], pitch: [0.4, 0.36] },
]

/** El final de la salida: tercera persona girando alrededor del mago (yaw de inicio a fin). */
export const ORBITA_SALIDA = [0.6, 1.1]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un «blip» tras cada pregunta del gancho (frases 1 y 4), un destello
 * de magia al señalar el teclado y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'magia.mp3'), en: cortes[0] + 0.2, volumen: 0.28 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras el mago dice «un piano roll…, un
 * mezclador… y una canción con IA», la toma pasa por cada cosa justo al nombrarla.
 * `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['practicar', 'crear', 'producidas', 'dj'],
  textos: '{}',
  ayudas: `
    /** Un botón por su etiqueta accesible (los de icono no tienen texto). */
    const porEtiqueta = (texto, n = 0) => [...document.querySelectorAll('main button')].filter((b) => b.getAttribute('aria-label') === texto)[n]
    /** Una carpeta de Canciones por su nombre (el botón empieza con él). */
    const carpeta = (clave, es) => [...document.querySelectorAll('main button')].find((b) => b.innerText.trim().startsWith(tGlobal(clave, es)))
    /** El botón de volver de una carpeta abierta (su texto es el nombre de la carpeta). */
    const salirDe = (clave, es) => [...document.querySelectorAll('main button')].find((b) => b.innerText.trim() === tGlobal(clave, es))?.click()
  `,
  /** La app en Canciones, arriba del todo (las dos carpetas a la vista). */
  preparar: `
    await dormir(800)
    tut('audio.tab.canciones')?.click()
    await dormir(600)
    salirDe('audio.lista.carpetaAmbiente', 'Música ambiental')
    salirDe('audio.lista.carpetaAprender', 'Canciones por aprender')
    await dormir(600)
    if (!carpeta('audio.lista.carpetaAprender', 'Canciones por aprender')) return 'no encontré la carpeta de Canciones por aprender'
    main().scrollTop = 0
  `,
  /**
   * `T` = segundo del cierre en que se dice cada ancla, y `fin`. Practicar: «Canciones por
   * aprender»; crear: «Festivo» en el editor (batería, bajo, acordes, melodía y colchón),
   * sonando; ya producidas: la ventana de Canción con IA; DJ: la pestaña Mezclar con el Himno y
   * La Cucaracha en los platos y el crossfader de A a B.
   */
  accion: (T) => `
    await hasta(t0, ${T.practicar} - 0.4)
    await tocar(carpeta('audio.lista.carpetaAprender', 'Canciones por aprender'))
    await hasta(t0, ${T.crear} - 1.0)
    salirDe('audio.lista.carpetaAprender', 'Canciones por aprender')
    await dormir(300)
    carpeta('audio.lista.carpetaAmbiente', 'Música ambiental')?.click()
    await dormir(400)
    await tocar(porEtiqueta(tGlobal('audio.lista.abrirEditor', 'Abrir en el editor'), 1))
    await dormir(700)
    await tocar(porEtiqueta(tGlobal('audio.transporte.play', 'Reproducir')))
    // «o ya producidas para escucharlas»: la ventana de Canción con IA (con su audio producido).
    await hasta(t0, ${T.producidas} - 0.9)
    await tocar(document.querySelector('[data-tut="audio.editor.volver"]'))
    await dormir(300)
    salirDe('audio.lista.carpetaAmbiente', 'Música ambiental')
    await dormir(300)
    await tocar(boton(tGlobal('audio.cancionIA.boton', 'Canción con IA')))
    await hasta(t0, ${T.dj} - 0.6)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await dormir(300)
    await tocar(tut('audio.tab.mezclar'))
    await dormir(800)
    // Los dos platos sonando: el A y, un compás después, el B.
    await tocar(porEtiqueta(tGlobal('audio.mezclar.play', 'Reproducir'), 0))
    await dormir(1200)
    const b = porEtiqueta(tGlobal('audio.mezclar.play', 'Reproducir'), 0)
    if (b) {
      b.scrollIntoView({ block: 'center', behavior: 'smooth' })
      await dormir(500)
      await tocar(b)
    }
    // El crossfader a la vista, y de A (el Himno) a B (La Cucaracha) poco a poco, con las flechas del teclado.
    const cruce = document.querySelector('main [role="slider"][aria-label="' + tGlobal('audio.mezclar.crossfader', 'Crossfader') + '"]')
    if (cruce) {
      cruce.scrollIntoView({ block: 'center', behavior: 'smooth' })
      await dormir(1200)
      for (let i = 0; i < 5; i++) {
        cruce.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
        await dormir(60)
      }
      const paso = Math.max(300, ((${T.fin} - 1.5) * 1000 - (performance.now() - t0)) / 10)
      for (let i = 0; i < 10; i++) {
        cruce.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        await dormir(paso)
      }
    }
    await hasta(t0, ${T.fin + 0.6})
  `,
}

/** La miniatura: el objeto del tema en primer plano, junto al mago (miniaturas.mjs). */
export const MINIATURA = { objeto: '🎹' }

/** El «fah» del gancho, tras la frase que incomoda (la tercera: «millones siguen aprendiendo»): antes de la cuarta. */
export const PAUSA_ANTES_DE = 3
