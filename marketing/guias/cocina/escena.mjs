// Lo propio de la guía de Cocina en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está Pep@ en la casa (de chef, removiendo la olla) y los planos de cada frase
//   · montar.mjs los efectos de esa toma
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
import path from 'node:path'

/** Atuendo de Pep@ en la casa (ATUENDOS_PRESET). */
export const ATUENDO = 'chef'

/**
 * Pep@ de pie tras la olla del cuarto de Cocina, explicando: quieto, solo mueve
 * los brazos (el gesto «habla» de la página). La cocina no tiene una acción de
 * «usar» como la caminadora: llega caminando hacia la olla (así queda de frente
 * a la cámara) y el gesto va en el rig de los emotes (se presta el hueco de un
 * baile solo en esta sesión de la demo; la app no cambia).
 */
export const PEP_EN_SU_SITIO = `
  const acc = await modulo('/src/core/state/accionCuartoStore.ts')
  acc.useAccionCuarto.getState().salirForzado()
  // Sin el gesto de una toma anterior: con él puesto no camina.
  ;(await modulo('/src/core/state/herramientaStore.ts')).useHerramienta.getState().setEmote(null)
  await sleep(600)
  const o = useDiseño.getState().objetos.find((x) => x.tipo === 'olla-plantilla' && x.plantillaId === 'cocina')
  if (!o) return 'SIN olla en la cocina de la demo'
  const [rx, , rz] = (await modulo('/src/core/state/layoutStore.ts')).roomWorldPos(o.roomId)
  const hs = await modulo('/src/core/state/houseStore.ts')
  const ox = rx + o.x
  const oz = rz + o.z
  // Desde lejos no llega caminando (se atora con los objetos): aparece junto a la cocina.
  if (Math.hypot(hs.playerPos.x - ox, hs.playerPos.z - oz) > 4) await teletransportar(ox, oz + 2.4)
  // Primero a un paso más atrás y luego al frente de la olla: llega mirándola.
  // Un poco a la derecha de la olla (no detrás): así el vapor no le tapa la cara de frente.
  for (const p of [{ x: ox + 0.42, z: oz + 1.8 }, { x: ox + 0.42, z: oz + DIST_OLLA }]) {
    useHouse.getState().setTarget(p.x, p.z)
    for (let i = 0; i < 40 && Math.hypot(hs.playerPos.x - p.x, hs.playerPos.z - p.z) > 0.12; i++) await sleep(250)
    // Si algo le estorba en la línea recta, se le pone en el punto.
    if (Math.hypot(hs.playerPos.x - p.x, hs.playerPos.z - p.z) > 0.3) await teletransportar(p.x, p.z)
  }
  await sleep(500)
  // El marcador de entrada que flota sobre la olla le taparía la cara a Pep@ de frente: fuera en esta toma.
  // (React lo vuelve a montar cuando cambian los pendientes: se repasa toda la toma.)
  clearInterval(window.__sinMarcador)
  window.__sinMarcador = setInterval(() => {
    window.__r3f().scene.traverse((m) => {
      // El vapor (transparente) también sube por encima: ese se queda.
      if (!m.isMesh || m.geometry.type !== 'SphereGeometry' || m.material?.transparent) return
      m.updateWorldMatrix(true, false)
      const [x, y, z] = m.matrixWorld.elements.slice(12, 15)
      if (Math.hypot(x - ox, z - oz) < 0.3 && y > 2) m.visible = false
    })
  }, 300)
  const { ciclo } = await modulo('/src/rooms/ejercicio/anim/pose.ts')
  const { useHerramienta } = await modulo('/src/core/state/herramientaStore.ts')
  // El módulo de los bailes lo carga la app con el primer emote (perezoso) y con su
  // propia URL (?t= de HMR): primero se le hace cargar, luego se cambia el patrón en
  // TODAS las instancias que haya y solo entonces se pone el gesto. Si se cambia antes,
  // se cambia una copia que la app no usa y Pep@ baila el Electro Shuffle de verdad.
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
`.replace('DIST_OLLA', '0.75')

/**
 * Las tres entradas del cuarto que se ven en el video: la principal (la olla,
 * abre la app), un libro de cocina en la encimera con la guía (abre la página
 * interactiva) y el refrigerador, que lleva al plan de comidas de la app. Se
 * arman en vivo en la demo con las acciones del editor (idempotente) y dejan
 * sus ids en `window.__entradas`.
 */
export const ENTRADAS = ({ url, titulo }) => `
  const ds = useDiseño.getState()
  const olla = ds.objetos.find((x) => x.tipo === 'olla-plantilla' && x.plantillaId === 'cocina')
  if (!olla) return 'SIN olla en la cocina de la demo'
  const cuarto = olla.roomId
  const { tGlobal } = await modulo('/src/core/i18n/useT.ts')
  // La guía es un libro de cocina de pie sobre la encimera del fondo, con la tapa hacia
  // el cuarto: su portada dice la pregunta. Hecho de piezas (caja + plano con texto),
  // como los objetos de entrada de la app; reemplaza a cualquier entrada vieja a la guía.
  const SITIO = { x: -0.4, z: -2.05 }
  let libro = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.enlaceUrl?.includes('/guias/cocina'))
  if (libro && (libro.tipo !== 'piezas' || Math.hypot(libro.x - SITIO.x, libro.z - SITIO.z) > 0.05)) {
    await ds.removeObjeto(libro.id)
    libro = undefined
  }
  if (!libro) {
    const ENCIMERA = 0.95
    const [W, H, D] = [0.42, 0.54, 0.08]
    // Recargado hacia atrás contra el azulejo.
    const a = 0.16
    const centro = [0, ENCIMERA + (H / 2) * Math.cos(a), -(H / 2) * Math.sin(a)]
    const rot = [-a, 0, 0]
    const enFrente = (arriba, sobre) => [0, centro[1] + arriba * Math.cos(a) + sobre * Math.sin(a), centro[2] - arriba * Math.sin(a) + sobre * Math.cos(a)]
    const TAPA = '#b91c1c'
    const piezas = [
      { tipo: 'caja', pos: centro, tam: [W, H, D], color: TAPA, rot },
      // Las hojas asoman por el canto derecho.
      { tipo: 'caja', pos: [0.012, centro[1], centro[2]], tam: [W - 0.01, H - 0.025, D - 0.014], color: '#f5f0e1', rot },
      { tipo: 'plano', pos: enFrente(0.05, D / 2 + 0.002), tam: [W * 0.84, H * 0.42], color: TAPA, tinta: '#ffffff', texto: ${JSON.stringify(titulo)}, rot },
      { tipo: 'plano', pos: enFrente(-0.15, D / 2 + 0.002), tam: [W * 0.7, 0.05], color: '#fbbf24', tinta: '#1c2333', texto: 'MindHaOS', rot },
    ]
    const id = await ds.addObjeto(cuarto, 'piezas', TAPA, undefined, SITIO, { piezas, rotY: 0 })
    await useDiseño.getState().setObjetoEnlace(id, ${JSON.stringify(url)}, ${JSON.stringify(titulo)})
    libro = useDiseño.getState().objetos.find((x) => x.id === id)
  }
  // El refrigerador lleva al plan de comidas (lo que se pega en la puerta del refri).
  const refri = useDiseño.getState().objetos.find((x) => x.roomId === cuarto && x.tipo === 'recurso:3')
  if (!refri) return 'SIN refrigerador en la cocina de la demo'
  if (refri.enlaceApp?.seccion !== 'planComidas') {
    await useDiseño.getState().setObjetoEnlaceApp(refri.id, { plantillaId: 'cocina', seccion: 'planComidas', titulo: tGlobal('cocina.tab.planComidas', 'Plan de comidas') })
  }
  window.__entradas = { cuarto, olla: olla.id, guia: libro.id, app: refri.id }
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
 * distancia e inclinación de inicio a fin. `window.__soltarCam = true` la corta
 * (para pasar a otro plano antes de que acabe).
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
 *   guia → entre la casa y la página: va al libro de cocina de la encimera y toca «Visitar» (el video corta a la guía).
 *   plan → la mención de la parte 5 («armo el plan de la semana…»): va al refri y lo abre en el plan de comidas.
 * `accion(dur)` recibe lo que dura la voz; apunta `__marcas.voz` (cuándo empieza a sonar) y `__marcas.toque`.
 */
export const TOMAS_EXTRA = [
  {
    nombre: 'guia',
    // Plano nuevo tras el corte: Pep@ ya pasó la isla y va hacia el libro del fondo.
    preparar: `
      ${MUNDO}
      ${SOLTAR_GESTO}
      const [ox, oz] = await mundo(window.__entradas.olla)
      await teletransportar(ox + 1.42, oz - 1.05)
      useCam.setState({ vista: 'tercera', yaw: 0.5, dist3p: 2.9, pitch: 0.44 })
    `,
    accion: () => `
      ${MUNDO}
      const e = window.__entradas
      const [px, pz] = await mundo(e.guia)
      await sleep(400)
      // Unos pasos hasta el libro, con la cámara a su espalda.
      ${girar(0.5, 0.0, 1800, 2.9, 2.6, 0.44, 0.42)}
      // A la izquierda del libro: el plano iso mira desde la derecha y así no lo tapa.
      await irA(px - 0.75, pz + 0.75, 0.4)
      await sleep(300)
      // Corte a un primer plano del libro (y Pep@ a su lado) para que se lean la portada y la burbuja.
      window.__soltarCam = true
      await sleep(50)
      useCam.setState({ vista: 'iso' })
      await cortarCam({ focus: [px - 0.3, 0.9, pz + 0.3], zoom: 210, az: ISO_AZ, el: ISO_EL })
      await sleep(600)
      useInteractUi.getState().selectEnlace(e.guia)
      await sleep(1300)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // Y se acerca al libro: el video corta a la página.
      await moverCam(camAhora(), { ...camAhora(), focus: [px, 1.0, pz], zoom: 300 }, 1100, ease)
      await sleep(300)
    `,
  },
  {
    nombre: 'plan',
    voz: 'plato.mencion-plan',
    preparar: `useCam.setState({ vista: 'tercera', yaw: 0.35, dist3p: 3.0, pitch: 0.42 })`,
    accion: (dur) => `
      ${MUNDO}
      const e = window.__entradas
      const [fx, fz] = await mundo(e.app)
      window.__marcas.voz = performance.now() + 300
      ${SOLTAR_GESTO}
      ${girar(0.35, 0.6, 2400, 3.0, 2.8, 0.42, 0.38)}
      // Al refri (su frente da al cuarto) y a abrirlo.
      await irA(fx + 0.6, fz + 2.0, 0.5)
      await irA(fx, fz + 1.0, 0.4)
      await sleep(300)
      useInteractUi.getState().selectEnlace(e.app)
      await sleep(900)
      window.__marcas.toque = performance.now()
      await tocar(burbuja())
      // La app abierta en el plan de comidas; si la semana está vacía, «Generar» la llena.
      await sleep(1200)
      const generar = document.querySelector('[data-tut="cocina.plan.semana"] button')
      if (generar && /\\d/.test(generar.textContent)) await tocar(generar)
      const fin = window.__marcas.voz + ${Math.round((dur + 0.6) * 1000)}
      while (performance.now() < fin) await sleep(100)
    `,
  },
]

/** El final de la salida: Pep@ entra al cuarto por la entrada principal (la olla) y se abre la app. */
export const FIN_SALIDA = `
  // Entra por el Recetario (la app abre en el último menú que se usó).
  localStorage.setItem((await modulo('/src/core/edicion.ts')).claveLS('mh.cocina.enfoque'), 'recetario')
  useInteractUi.getState().selectMueble(window.__entradas.cuarto)
  await sleep(1000)
  await tocar(burbuja())
  // Que se vea la app ya cargada antes de terminar.
  await sleep(4200)
`

/** El plano iso del gancho: corrido desde Pep@ (x, z del mundo; dy = altura del foco) para que la cocina quede al centro. */
// Pep@ está en (0,4, 1,25) del cuarto y el centro de la cocina (isla, encimera, refri) en (−0,85, −0,9).
export const ISO = { zoom: 76, dx: -1.5, dz: -2.5, dy: 0 }

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [3.3, 3.0], dist: [3.2, 2.8], pitch: [0.42, 0.38] }, // de frente, acercándose
  { yaw: [3.75, 3.5], dist: [2.3, 2.5], pitch: [0.28, 0.32] }, // de lado y cerca, la olla en primer plano
  { iso: true }, // la vista del juego, junto a Pep@
  { yaw: [2.9, 3.4], dist: [5.0, 4.2], pitch: [0.8, 0.65] }, // desde arriba, girando
  { yaw: [3.6, 3.0], dist: [2.9, 3.5], pitch: [0.36, 0.46] }, // girando al revés y alejándose
]

/** El final de la salida: tercera persona girando alrededor de Pep@ (yaw de inicio a fin). */
export const ORBITA_SALIDA = [2.95, 3.55]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs: el hervor de la olla mientras se ve a Pep@ de cerca, un «blip»
 * tras cada pregunta del gancho (frases 1 y 4) y una subida al alejarse.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'hervor.mp3'), en: 0, volumen: 0.22, hasta: alejarse + 1.5, fuera: 1.5 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «tu recetario, tu
 * plan de comidas de la semana y la lista de compras», la toma pasa por cada
 * cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['recetario', 'plan', 'compras'],
  textos: '{}',
  ayudas: `
    /** El plan de la semana (rejilla de 7 días) a la vista. */
    const alPlan = async () => {
      await tocar(tut('cocina.enfoque.peso'))
      await dormir(300)
      await tocar(tut('cocina.tab.planComidas'))
      await dormir(400)
      tut('cocina.plan.semana')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      // La primera vez, «Generar» llena los huecos de la semana con recetas (la demo no trae plan).
      if (!window.__planHecho) {
        window.__planHecho = true
        await dormir(500)
        await tocar(tut('cocina.plan.semana').querySelector('button'))
      }
    }
  `,
  /** El recetario abierto en sus recetas, arriba del todo. */
  preparar: `
    tut('cocina.enfoque.recetario')?.click()
    await dormir(800)
    tut('cocina.tab.recetas')?.click()
    await dormir(1200)
    main().scrollTop = 0
  `,
  /**
   * `T` = segundo del cierre en que se dice cada ancla, y `fin`. Las tres llegan
   * en ~3 s: recetas → plan de la semana (se llena solo) → una lista guardada;
   * luego vuelve al plan y baja despacio por la semana hasta que Pep@ calla.
   */
  accion: (T) => `
    await hasta(t0, ${T.recetario} - 0.3)
    main().scrollTo({ top: 180, behavior: 'smooth' })
    await hasta(t0, ${T.plan} - 0.6)
    await alPlan()
    await hasta(t0, ${T.compras} - 0.4)
    await tocar(tut('cocina.enfoque.recetario'))
    await dormir(250)
    await tocar(tut('cocina.tab.compras'))
    await dormir(300)
    await tocar(tut('cocina.compras.sub.listas'))
    await dormir(400)
    await tocar(document.querySelector('[data-tut="cocina.compras.listas"] li button'))
    await hasta(t0, ${T.compras} + 4.5)
    await alPlan()
    await dormir(900)
    await bajarHasta(main(), main().scrollTop, t0 + ${T.fin + 0.6} * 1000)
  `,
}
