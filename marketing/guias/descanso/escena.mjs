// Lo propio de la guía de Descanso en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está Pep@ en la casa (en pijama, junto a la cama) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
//
// La recámara de la demo está en el PRIMER PISO (encima de la cocina): antes de
// poner a Pep@ ahí hay que subirlo de nivel (`playerLevel`); si no, aparece en
// el mismo punto de la planta baja.
import path from 'node:path'

/** Atuendo de Pep@ en la casa (ATUENDOS_PRESET). */
export const ATUENDO = 'pijama'

/** Sube a Pep@ al piso del cuarto de Descanso y deja en `window.__recamara` el origen del cuarto en el mundo. */
const AL_PISO = `
  const reloj = useDiseño.getState().objetos.find((x) => x.tipo === 'despertador-plantilla' && x.plantillaId === 'descanso')
  if (!reloj) return 'SIN despertador en la recámara de la demo'
  const lay = await modulo('/src/core/state/layoutStore.ts')
  const nivel = lay.useLayout.getState().niveles[reloj.roomId] ?? 0
  if (useHouse.getState().playerLevel !== nivel) useHouse.setState({ playerLevel: nivel })
  const [rx, , rz] = lay.roomWorldPos(reloj.roomId)
  window.__recamara = { cuarto: reloj.roomId, rx, rz, reloj: reloj.id }
`

/**
 * El estado de «usar un objeto» que usa la app de verdad: `modulo()` cae a veces en
 * otra copia del módulo (cargado con otra URL) y entonces ni ve la cama cerca ni la
 * acción llega al personaje. Se toma la URL exacta del registro de recursos.
 */
const MODULO_ACCION = `(await import(performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes('/src/core/state/accionCuartoStore.ts'))))`
const ACCION = `${MODULO_ACCION}.useAccionCuarto`

/** Pep@ se acuesta en la cama (la acción «Acostarte» de la app). Sin esperar: corre junto con la cámara. */
const ACOSTARSE = `
  void (async () => {
    const m = ${MODULO_ACCION}
    const ac = m.useAccionCuarto
    // Si ya se levantó de esta cama, la app no se la vuelve a ofrecer hasta que se aleje.
    m.accionCuartoFrame.recienId = null
    ;(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta.getState().setEmote(null)
    // La cama se anuncia «cerca» desde el bucle de cuadros: que se dibujen mientras.
    for (let i = 0; i < 40 && ac.getState().cercaGrupo !== 'acostarse'; i++) {
      window.__r3f().invalidate()
      await sleep(50)
    }
    ac.getState().activarCercano()
  })()
`

/**
 * De vuelta de pie en su sitio, explicando (el patrón prestado ya está puesto). Va
 * en un corte de plano: se levanta y se le pone donde estaba (la app lo deja en un
 * punto libre junto a la cama que puede quedar tapado por el muro).
 */
const LEVANTARSE = `
  void (async () => {
    // La salida «ordenada» (la hace el personaje en su cuadro: le quita también el giro de acostado).
    const ac = ${ACCION}
    ac.getState().pedirSalir()
    for (let i = 0; i < 40 && ac.getState().instanciaId != null; i++) {
      window.__r3f().invalidate()
      await sleep(25)
    }
    const r = window.__recamara
    await teletransportar(r.rx + 1.35, r.rz + 1.0)
    ;(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta.getState().setEmote('electroShuffle')
  })()
`

/**
 * Pep@ de pie al pie de la cama, del lado del despertador, explicando: quieto,
 * solo mueve los brazos (el gesto «habla» de la página). Llega caminando hacia
 * el frente del cuarto (así queda de cara a la cámara) y el gesto va en el rig
 * de los emotes (se presta el hueco de un baile solo en esta sesión de la demo).
 */
export const PEP_EN_SU_SITIO = `
  // Si la toma anterior lo dejó acostado, se levanta (con la copia real del estado y la
  // salida ordenada: forzarla desde fuera le dejaría el giro de acostado).
  {
    const ac = ${ACCION}
    ac.getState().pedirSalir()
    for (let i = 0; i < 40 && ac.getState().instanciaId != null; i++) {
      window.__r3f().invalidate()
      await sleep(25)
    }
  }
  ;(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta.getState().setEmote(null)
  await sleep(600)
  ${AL_PISO}
  const hs = await modulo('/src/core/state/houseStore.ts')
  const SITIO = { x: rx + 1.35, z: rz + 1.0 }
  // Aparece junto a la cama (desde otro cuarto no llega caminando) y da dos pasos hacia el frente.
  await teletransportar(SITIO.x, SITIO.z - 0.9)
  useHouse.getState().setTarget(SITIO.x, SITIO.z)
  for (let i = 0; i < 40 && Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.12; i++) await sleep(250)
  if (Math.hypot(hs.playerPos.x - SITIO.x, hs.playerPos.z - SITIO.z) > 0.3) await teletransportar(SITIO.x, SITIO.z)
  await sleep(500)
  // El marcador de entrada que flota sobre el despertador: fuera en esta toma (React lo remonta: se repasa toda la toma).
  const [mx, mz] = [rx + reloj.x, rz + reloj.z]
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
  const { ciclo } = await modulo('/src/rooms/ejercicio/anim/pose.ts')
  const { useHerramienta } = await modulo('/src/core/state/herramientaStore.ts')
  // El módulo de los bailes es perezoso y lo carga la app con SU URL: primero se le
  // hace cargar, luego se cambia el patrón en TODAS las instancias y se pone el gesto.
  useHerramienta.getState().setEmote('electroShuffle')
  await sleep(1200)
  useHerramienta.getState().setEmote(null)
  const urls = [...new Set(performance.getEntriesByType('resource').map((x) => x.name).filter((n) => n.includes('/src/core/house/emotesPatrones.ts')))]
  if (!urls.length) return 'no encontré el módulo de los emotes que carga la app'
  // Explicando: los dos brazos acompañan lo que dice, el cuello asiente un poco. Nada de piernas ni cadera.
  const explica = ciclo(3.2, [
    { t: 0, pose: { hombroD: [18, 12, 0], codoD: 55, hombroI: [12, 8, 0], codoI: 35 } },
    { t: 0.35, pose: { hombroD: [38, 18, 10], codoD: 85, hombroI: [16, 10, 0], codoI: 40, cuello: [4, 6, 0] } },
    { t: 0.7, pose: { hombroD: [24, 10, 0], codoD: 65, hombroI: [30, 16, 10], codoI: 75, cuello: [2, -5, 0] } },
  ])
  for (const url of urls) (await import(url)).PATRONES_EMOTE.electroShuffle = explica
  await sleep(300)
  useHerramienta.getState().setEmote('electroShuffle')
  await sleep(800)
`

/**
 * Las tres entradas del cuarto que se ven en el video: la principal (el
 * despertador, abre la app), un libro de pie sobre la cómoda con la guía (abre
 * la página interactiva) y una lámpara en el buró, que lleva a la respiración
 * guiada del Jardín. Se arman en vivo en la demo con las acciones del editor
 * (idempotente) y dejan sus ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  ${AL_PISO}
  const ds = useDiseño.getState()
  const cuarto = reloj.roomId
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  // La cómoda, pegada a la esquina del fondo (a media pared estorbaba el paso), de frente
  // al cuarto: es la esquina que la vista iso ve sin que un muro la tape.
  const ESQUINA = { x: -2.55, z: -2.45, rotY: 90 }
  // Los otros muebles de piezas del cuarto son los dos burós, a los lados de la cama.
  const esBuro = (o) => Math.abs(Math.abs(o.x) - 1.7) < 0.05 && Math.abs(o.z + 1.4) < 0.05
  const comoda = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'piezas' && !x.enlaceUrl && !esBuro(x))
  if (comoda && (Math.hypot(comoda.x - ESQUINA.x, comoda.z - ESQUINA.z) > 0.05 || comoda.rotY !== ESQUINA.rotY)) await ds.setObjetoPose(comoda.id, ESQUINA.x, ESQUINA.z, ESQUINA.rotY)
  // La guía: un libro de pie sobre la cómoda, con la portada hacia el cuarto (dice la pregunta).
  const SITIO = { x: ESQUINA.x + 0.02, z: ESQUINA.z }
  let libro = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/descanso'))
  if (libro && (libro.tipo !== 'piezas' || Math.hypot(libro.x - SITIO.x, libro.z - SITIO.z) > 0.05 || libro.rotY !== ESQUINA.rotY)) {
    await ds.removeObjeto(libro.id)
    libro = undefined
  }
  if (!libro) {
    const COMODA = 1.0
    const [W, H, D] = [0.4, 0.52, 0.08]
    // Recargado hacia atrás.
    const a = 0.14
    const centro = [0, COMODA + (H / 2) * Math.cos(a), -(H / 2) * Math.sin(a)]
    const rot = [-a, 0, 0]
    const enFrente = (arriba, sobre) => [0, centro[1] + arriba * Math.cos(a) + sobre * Math.sin(a), centro[2] - arriba * Math.sin(a) + sobre * Math.cos(a)]
    const TAPA = '#312e81'
    const piezas = [
      { tipo: 'caja', pos: centro, tam: [W, H, D], color: TAPA, rot },
      { tipo: 'caja', pos: [0.012, centro[1], centro[2]], tam: [W - 0.01, H - 0.025, D - 0.014], color: '#f5f0e1', rot },
      { tipo: 'plano', pos: enFrente(0.05, D / 2 + 0.002), tam: [W * 0.84, H * 0.42], color: TAPA, tinta: '#ffffff', texto: ${JSON.stringify(titulo)}, rot },
      { tipo: 'plano', pos: enFrente(-0.15, D / 2 + 0.002), tam: [W * 0.7, 0.05], color: '#fbbf24', tinta: '#1c2333', texto: 'MindHaOS', rot },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', TAPA, undefined, SITIO, { piezas, rotY: ESQUINA.rotY })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    libro = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // La lámpara del buró (el de la izquierda, sin el despertador) lleva a la respiración guiada del Jardín.
  const BURO = { x: -1.7, z: -1.4 }
  let lampara = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:40')
  if (!lampara) {
    const id = await ds.addObjeto(cuarto, 'recurso:40', '#334155', undefined, BURO)
    lampara = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  if (lampara.enlaceApp?.seccion !== 'respiracion') {
    await useDiseño.getState().setObjetoEnlaceApp(lampara.id, { plantillaId: 'jardin', seccion: 'respiracion', titulo: tGlobal('jardin.tab.respiracion', 'Respiración') })
  }
  window.__entradas = { cuarto, reloj: reloj.id, guia: libro.id, app: lampara.id }
`

/** Suelta el gesto prestado para caminar. */
const SOLTAR_GESTO = `;(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta.getState().setEmote(null)`
/** Posición en el mundo de un objeto del cuarto: [x, z]. */
const MUNDO = `
  const mundo = async (id) => {
    const o = useDiseño.getState().objetos.find((x) => x.id === id)
    const [rx, , rz] = (await modulo('/src/core/state/layoutStore.ts')).roomWorldPos(o.roomId)
    return [rx + o.x, rz + o.z]
  }
`
/**
 * La cámara en tercera persona sin esperar (corre mientras Pep@ camina): yaw,
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

/**
 * Las tomas intermedias (casa.mjs): Pep@ abre las otras dos entradas del cuarto.
 *   guia → entre la casa y la página: va al libro de la cómoda y toca «Visitar» (el video corta a la guía).
 *   plan → la mención de la parte 5 («…desde la lámpara del buró abro una respiración guiada»): va a la lámpara y la abre.
 * `accion(dur)` recibe lo que dura la voz; apunta `__marcas.voz` (cuándo empieza a sonar) y `__marcas.toque`.
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // Plano nuevo tras el corte: la esquina de la cómoda en la vista iso; Pep@ entra caminando por el pasillo detrás de la cama.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [bx, bz] = await mundo(window.__entradas.guia)
      await teletransportar(bx + 3.1, bz + 0.1)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await cortarCam({ focus: [bx + 1.1, y + 0.8, bz + 0.3], zoom: 150, az: ISO_AZ, el: ISO_EL })
    `,
    // Toda en la vista iso, sin cortes: el rig de la cámara suaviza el zoom y un corte de
    // tercera persona a un primer plano iso se ve como un barrido.
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [px, pz] = await mundo(e.guia)
      const y = (await modulo('/src/core/state/houseStore.ts')).playerPos.y
      await sleep(300)
      // Hasta el lado de la cómoda (no enfrente: no tapa el libro), mientras la cámara se acomoda.
      void moverCam(camAhora(), { focus: [px + 0.4, y + 0.9, pz + 0.1], zoom: 200, az: ISO_AZ, el: ISO_EL }, 2600, ease)
      await irA(px + 0.85, pz - 0.1, 0.25)
      await sleep(700)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(1200)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al libro: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [px, y + 1.2, pz], zoom: 300 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    nombre: 'plan',
    voz: 'noche.mencion-plan',
    // Plano nuevo tras el corte: Pep@ ya está al pie de la cama, del lado de la lámpara.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [lx, lz] = await mundo(window.__entradas.app)
      await teletransportar(lx + 0.6, lz + 3.1)
      useCam.setState({ vista: 'tercera', yaw: 0.35, dist3p: 3.0, pitch: 0.42 })
    `,
    accion: (dur) => `
      ${MUNDO}
      const e = window.__entradas
      const [lx, lz] = await mundo(e.app)
      window.__marcas.voz = performance.now() + 300
      ${SOLTAR_GESTO}
      ${girar(0.35, 0.7, 2400, 3.0, 2.8, 0.42, 0.38)}
      // Del pie de la cama al buró de la izquierda, por el pasillo junto a la pared (en diagonal se atora con la cama).
      const hs = await modulo('/src/core/state/houseStore.ts')
      for (const [x, z] of [[lx + 0.05, lz + 3.0], [lx + 0.05, lz + 0.8]]) {
        await irA(x, z, 0.3)
        if (Math.hypot(hs.playerPos.x - x, hs.playerPos.z - z) > 0.5) await teletransportar(x, z)
      }
      await sleep(300)
      useInteractUi.getState().selectEnlace(e.app)
      await sleep(900)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // El Jardín abierto en la respiración: que empiece la guiada.
      // «Comenzar respiración» es el último botón de la sección del patrón (vale en todos los idiomas); la app puede tardar en cargar.
      let empezar
      for (let i = 0; i < 40 && !empezar; i++) {
        await sleep(150)
        empezar = [...(document.querySelector('[data-tut="jardin.resp.patron"]')?.querySelectorAll(':scope > button') ?? [])].pop()
      }
      await sleep(250)
      if (empezar) {
        await tocar(empezar)
        // «¿Cómo llegas?»: elige una cara y arranca la respiración guiada.
        await sleep(600)
        const caras = document.querySelectorAll('button.text-3xl')
        if (caras.length) await tocar(caras[Math.min(3, caras.length - 1)])
      }
      const fin = window.__marcas.voz + ${Math.round((dur + 0.6) * 1000)}
      while (performance.now() < fin) await sleep(100)
    `,
  },
]

/** La salida empieza con Pep@ ya acostado: la cámara llega a él en la cama, gira y él abre la app con el despertador. */
export const PREPARAR_SALIDA = `
  ${ACOSTARSE}
  await sleep(3500)
`

/** El final de la salida: Pep@ entra al cuarto por la entrada principal (el despertador) y se abre la app. */
export const FIN_SALIDA = `
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(1000)
  await tocar(burbuja())
  // Que se vea la app ya cargada antes de terminar.
  await sleep(4200)
`

/** El plano iso del gancho: corrido desde Pep@ (x, z del mundo; dy = altura del foco) para que la recámara quede al centro. */
// Pep@ está en (1,35, 1,0) del cuarto y el centro de la recámara (la cama) en (0, −0,3).
export const ISO = { zoom: 76, dx: -1.9, dz: -2.2, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [0.2, -0.05], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  // «Pasamos casi un tercio de la vida durmiendo»: se acuesta en la cama.
  { yaw: [-0.75, -0.5], dist: [3.2, 2.8], pitch: [0.62, 0.56], antes: ACOSTARSE },
  { yaw: [0.55, 0.85], dist: [2.7, 2.4], pitch: [0.72, 0.64] }, // acostado, desde arriba
  // «¿Realmente qué pasa mientras duermes?»: la vista del juego, con Pep@ en la cama (corrida lo que hay de su sitio a la cama).
  { iso: true, dx: 1.35, dz: 1.3 },
  // La promesa: se levanta y vuelve a explicar.
  { yaw: [-0.35, 0.2], dist: [3.4, 3.0], pitch: [0.42, 0.4], antes: LEVANTARSE },
]

/** El final de la salida: tercera persona girando alrededor de Pep@ (yaw de inicio a fin). */
export const ORBITA_SALIDA = [-0.3, 0.3]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: un ambiente nocturno tenue mientras se ve a Pep@ de cerca, un
 * «blip» tras cada pregunta del gancho (frases 1 y 4) y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'noche.mp3'), en: 0, volumen: 0.2, hasta: alejarse + 1.5, fuera: 1.5 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «tu horario de sueño…,
 * la puntuación de cada noche y el registro de tus noches», la toma pasa por
 * cada cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['horario', 'puntuacion', 'registro'],
  textos: '{}',
  ayudas: `
    /** Lleva una sección de la app al borde de arriba, deslizando. */
    const a = (clave) => tut(clave)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  `,
  /** La app arriba del todo (la puntuación de la última noche). */
  preparar: `
    await dormir(800)
    main().scrollTop = 0
  `,
  /**
   * `T` = segundo del cierre en que se dice cada ancla, y `fin`: horario (la luna y
   * el sol) → puntuación → las últimas noches y el historial; luego baja despacio
   * hasta que Pep@ calla.
   */
  accion: (T) => `
    await hasta(t0, ${T.horario} - 0.4)
    a('descanso.horario')
    await hasta(t0, ${T.puntuacion} - 0.4)
    a('descanso.puntuacion')
    await hasta(t0, ${T.registro} - 0.4)
    a('descanso.ultimas')
    await hasta(t0, ${T.registro} + 3)
    await bajarHasta(main(), main().scrollTop, t0 + ${T.fin + 0.6} * 1000)
  `,
}
