// Lo propio de la guía de Ejercicio en el video (lo demás es común a todas las guías):
//   · casa.mjs   dónde está Pep@ en la casa (en la caminadora) y los planos de cámara de cada frase
//   · montar.mjs los efectos de esa toma (pasos, motor de la caminadora…)
//   · app2d.mjs  el recorrido de la app 2D del cierre, al ritmo de las anclas del guion
//
// Los fragmentos de código corren DENTRO de la página de la app (demo de Pep@),
// con las ayudas de la promo (useHouse, useDiseño, sleep, modulo…).
import path from 'node:path'

/** Atuendo de Pep@ en la casa (ATUENDOS_PRESET). */
export const ATUENDO = 'deportista'

/**
 * Pep@ en la caminadora del cuarto de Ejercicio. Llega caminando y la usa como
 * el botón contextual del HUD. Devuelve un texto si algo falla.
 */
export const PEP_EN_SU_SITIO = `
  const acc = await modulo('/src/core/state/accionCuartoStore.ts')
  // Siempre desde cero: el «usando» de una corrida anterior puede quedar con Pep@ en otro sitio.
  acc.useAccionCuarto.getState().salirForzado()
  await sleep(600)
  const o = useDiseño.getState().objetos.find((x) => x.tipo === 'caminadora' && x.plantillaId === 'ejercicio')
  if (!o) return 'SIN caminadora en la demo'
  const [rx, , rz] = (await modulo('/src/core/state/layoutStore.ts')).roomWorldPos(o.roomId)
  const hs = await modulo('/src/core/state/houseStore.ts')
  // Al subirse mira hacia donde venía caminando (usarAccion): tiene que llegar justo por detrás,
  // en el eje de la caminadora (+z local), o queda de lado o al revés sobre la banda.
  const rot = ((o.rotY ?? 0) * Math.PI) / 180
  const atras = { x: rx + o.x + Math.sin(rot) * 1.2, z: rz + o.z + Math.cos(rot) * 1.2 }
  useHouse.getState().setTarget(atras.x, atras.z)
  for (let i = 0; i < 80 && Math.hypot(hs.playerPos.x - atras.x, hs.playerPos.z - atras.z) > 0.15; i++) await sleep(250)
  await sleep(300)
  acc.useAccionCuarto.getState().usar(o.id, rx + o.x, rz + o.z, rot, 'caminadora')
  for (let i = 0; i < 20 && !acc.accionCuartoFrame.usando; i++) await sleep(250)
  // Llega caminando hasta el aparato: hasta que esté encima no se graba.
  for (let i = 0; i < 40 && Math.hypot(hs.playerPos.x - rx - o.x, hs.playerPos.z - rz - o.z) > 0.35; i++) await sleep(250)
  await sleep(1200)
  if (!acc.accionCuartoFrame.usando) return 'no se subió a la caminadora'
`

/** Los planos de las frases del gancho, por turnos: tercera persona (giro, distancia e inclinación de inicio a fin) o la vista iso del juego. */
export const PLANOS = [
  { yaw: [4.3, 4.6], dist: [3.0, 2.5], pitch: [0.4, 0.36] }, // de frente, acercándose
  { yaw: [5.25, 5.05], dist: [2.2, 2.4], pitch: [0.18, 0.22] }, // de lado y bajo, muy cerca
  { iso: true }, // la vista del juego, junto a Pep@
  { yaw: [4.5, 5.1], dist: [5.2, 4.2], pitch: [0.75, 0.6] }, // desde arriba, girando
  { yaw: [5.0, 4.4], dist: [2.7, 3.4], pitch: [0.3, 0.45] }, // girando al revés y alejándose
]

/** El final de la salida: tercera persona girando alrededor de Pep@ (yaw de inicio a fin). */
export const ORBITA_SALIDA = [4.6, 5.3]

/**
 * Efectos sutiles de la entrada, colgados de los cortes de plano que midió
 * casa.mjs (uno por frase y el último al alejarse): pasos y motor de la
 * caminadora mientras se ve a Pep@ de cerca, un «blip» tras cada pregunta del
 * gancho (frases 1 y 4) y una subida que lleva al alejarse hasta la casa.
 */
export function ambiente(cortes, EFECTOS) {
  if (cortes.length < 5) return []
  const alejarse = cortes[cortes.length - 1]
  return [
    { archivo: path.join(EFECTOS, 'pasos-caminadora.mp3'), en: 0, volumen: 0.2, hasta: alejarse + 1.5, fuera: 1.5 },
    { archivo: path.join(EFECTOS, 'motor.mp3'), en: 0, volumen: 0.22, hasta: alejarse + 1.5, fuera: 1.5 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[0] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'pregunta.mp3'), en: cortes[3] - 0.25, volumen: 0.3 },
    { archivo: path.join(EFECTOS, 'subida.mp3'), en: alejarse - 0.5, volumen: 0.28 },
  ]
}

/**
 * La app 2D en el recuadro del cierre: mientras Pep@ dice «el temporizador,
 * tus rachas y más de ciento sesenta ejercicios animados», la toma pasa por
 * cada cosa justo al nombrarla. `anclas` = las de `cierre.anclas` del guion.
 */
export const APP2D = {
  anclas: ['temporizador', 'rachas'],
  /** Textos de la app en el idioma activo (las mismas claves que usan sus botones). */
  textos: `{
    iniciar: tGlobal('ejercicio.rutina.iniciar', 'Iniciar'),
    animacion: tGlobal('ejercicio.anim.pestana', 'Animación'),
    fullbody: tGlobal('ejercicio.split.fullbody', 'Full body'),
    disponibles: tGlobal('ejercicio.sugeridos', 'Ejercicios disponibles · toca para añadir').split(' · ')[0],
  }`,
  /** Ayudas propias de esta app. */
  ayudas: `
    const disponibles = () => [...main().querySelectorAll('p,h3,h4,div')].find((e) => e.childElementCount === 0 && e.textContent.includes(L.disponibles))
  `,
  /** Fuerza → Rutinas, arriba del todo, con el catálogo ya en modo animación. */
  preparar: `
    tut('ejercicio.tab.fuerza')?.click()
    await dormir(800)
    tut('ejercicio.sub.catalogo')?.click()
    await dormir(800)
    boton(L.animacion)?.click()
    await dormir(800)
    if (!disponibles()) boton(L.fullbody)?.click()
    await dormir(1500)
    if (!disponibles()) return 'el catálogo no muestra la lista de ejercicios'
    tut('ejercicio.sub.rutinas')?.click()
    await dormir(1200)
    main().scrollTop = 0
  `,
  /** `T` = segundo del cierre en que se dice cada ancla, y `fin`. */
  accion: (T) => `
    // Pep@ nombra las tres cosas en ~3 s: el temporizador entra un poco antes y la racha se queda casi 2 s.
    await hasta(t0, ${T.temporizador} - 1.2)
    await tocar(boton(L.iniciar))
    await hasta(t0, ${T.rachas} - 0.4)
    document.querySelector('.fixed.inset-0.z-50')?.click()
    await dormir(150)
    await tocar(tut('ejercicio.tab.metas'))
    await dormir(500)
    main().scrollTop = 0
    await hasta(t0, ${T.rachas} + 1.5)
    await tocar(tut('ejercicio.tab.fuerza'))
    await dormir(450)
    await tocar(tut('ejercicio.sub.catalogo'))
    await dormir(450)
    // La lista aparece al elegir un enfoque (se pierde al cambiar de pestaña).
    if (!disponibles()) await tocar(boton(L.fullbody))
    for (let i = 0; i < 30 && !disponibles(); i++) await dormir(100)
    const m = main()
    const lista = disponibles()
    const desde = lista.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - 20
    m.scrollTo({ top: desde, behavior: 'smooth' })
    await dormir(900)
    // Bajando despacio por los ejercicios animados hasta que calla.
    await bajarHasta(m, desde, t0 + ${T.fin + 0.6} * 1000)
  `,
}
