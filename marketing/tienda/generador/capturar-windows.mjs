// Capturas de ESCRITORIO para Microsoft Store: 1920×1080 apaisado, los 16 idiomas.
// Necesita el Chrome del piloto con la app abierta (node cdp.mjs arranca).
// Uso: node capturar-windows.mjs [es en ...]   (sin argumentos: los 16)
//
// Por qué no se reciclan las láminas de Play/App Store: la Store PROHÍBE
// «additional logos, icons, or marketing messages» en las capturas, así que las
// láminas compuestas —con su copy y su marco de teléfono— serían rechazadas.
// Aquí se captura la app cruda, tal cual se ve en Windows, y por eso tampoco hay
// paso de composición: estos PNG van directos a la ficha.
//
// El HUD se deja A LA VISTA a propósito (al revés que en la lámina del iPad, que
// buscaba una imagen limpia de portada): la Store enseña cómo es la app de
// verdad, y el reloj, la rueda y el chat son parte de ella. Lo único que se
// oculta es el chip de «salir de la demo», que no existe en el producto.
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { IDIOMAS } from './componer.mjs'

const PORT = 9333
const APP = 'http://localhost:53378/'
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
// Sin paso intermedio: al no haber composición, se escribe donde se sube.
const SALIDA = resolve(RAIZ, '..', 'msstore', 'capturas')

/**
 * 1366×768, el mínimo que pide la Store para escritorio. Las capturas de es/en
 * que hay subidas son de 1920×1080, que también vale y se ve mejor: si el
 * entorno acompaña, súbelo.
 *
 * **Si la app no monta —el `<div id="root">` vacío, sin React ni lienzo, sin
 * error ninguno— NO es este número.** Se probó a 1366, 1600 y 1920 y al final
 * no montaba ni con el sitio recién borrado, en ningún idioma, mientras que al
 * principio de esa misma sesión lo hacía en 25 s. Es el entorno el que se
 * degrada: un servidor de Vite que lleva horas encendido y con ediciones
 * encima. **Reinicia el dev server y el piloto antes de tocar nada de aquí.**
 */
const W = 1366
const H = 768

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const lista = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()

function conWs(url, fn) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url)
    let id = 0
    const pend = new Map()
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && pend.has(m.id)) {
        const { ok, ko } = pend.get(m.id)
        pend.delete(m.id)
        m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result)
      }
    }
    ws.onerror = () => rej(new Error('ws error'))
    // Si el socket muere a medias (el reload puede llevárselo), rechazar en vez
    // de dejar la promesa colgada para siempre.
    ws.onclose = () => rej(new Error('ws cerrado'))
    ws.onopen = async () => {
      const enviar = (metodo, params = {}) => {
        const p = new Promise((ok, ko) => {
          const n = ++id
          pend.set(n, { ok, ko })
          ws.send(JSON.stringify({ id: n, method: metodo, params }))
        })
        // Marca el rechazo como atendido SIN robárselo a quien la espere
        // (adjuntar un handler crea otra promesa; ésta sigue rechazando para su
        // `await`). Sin esto, una llamada que el `location.reload()` deja
        // colgada rechaza más tarde sin dueño y Node tumba el proceso entero.
        p.catch(() => {})
        return p
      }
      try {
        const r = await fn({ enviar })
        ws.close()
        res(r)
      } catch (err) {
        ws.close()
        rej(err)
      }
    }
  })
}

/** Ayudas que se reinyectan en CADA evaluación (el reload se las lleva). */
const AYUDAS = `
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const prep = () => {
  const st = window.__r3f()
  // pixelRatio 1: aquí el viewport YA es de 1920×1080, así que el lienzo sale a
  // resolución nativa. El x3 de las capturas de teléfono reventaría la pestaña.
  st.gl.setPixelRatio(1)
  st.gl.setSize(st.size.width, st.size.height, true)
  st.invalidate()
  // El chip "salir de la demo" se localiza por clases, no por su texto (cambia
  // de idioma). No es parte del producto: fuera.
  document.querySelectorAll('div').forEach((e) => {
    const c = e.className
    if (typeof c === 'string' && c.includes('z-[45]') && c.includes('fixed') && c.includes('top-')) {
      e.style.display = 'none'
    }
  })
}
`

/** Escenas, encadenadas sin recargar: cada una parte del estado de la anterior. */
const ESCENAS = [
  {
    archivo: '01-casa.png',
    js: `
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      await sleep(500)
      useCiclo.setState({ minutos: 12 * 60, modo: 'manual' })
      useCam.setState({ az: Math.PI / 4, el: 0.6154797086703873, vista: 'iso' })
      // enfocarZona y no un zoom fijo: el encuadre de las capturas de teléfono
      // está calibrado para 390×844 y en apaisado dejaría la casa descentrada.
      useCam.getState().enfocarZona([-52, 1, -28], 30, 30)
      prep()
      await sleep(1800)
      return 'zoom=' + useCam.getState().zoom.toFixed(1)
    `,
  },
  {
    archivo: '02-calendario.png',
    js: `
      const m = await import('/src/core/state/rutinasUiStore.ts')
      m.useRutinasUI.getState().abrirCalendario('semana')
      await sleep(2600)
      prep()
      await sleep(400)
      return 'ok'
    `,
  },
  {
    archivo: '03-cuartos.png',
    js: `
      const m = await import('/src/core/state/rutinasUiStore.ts')
      m.useRutinasUI.getState().cerrarCalendario()
      await sleep(700)
      const h = await import('/src/core/state/hudStore.ts')
      h.useHud.getState().desplegarTodo()
      await sleep(1000)
      const b = document.querySelector('[data-tut="menu.rapido"]')
      if (!b) return 'SIN BOTON menu.rapido'
      b.click()
      await sleep(2200)
      prep()
      await sleep(400)
      return 'ok'
    `,
  },
  {
    archivo: '04-chat.png',
    js: `
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await sleep(900)
      const cat = await import('/src/core/house/catalogo.tsx')
      const lay = await import('/src/core/state/layoutStore.ts')
      const walls = await import('/src/core/house/walls.ts')
      const acc = await import('/src/core/state/accionCuartoStore.ts')
      const hs = await import('/src/core/state/houseStore.ts')
      const rep = await import('/src/core/data/repository.ts')
      const L = useLayout.getState()
      const cama = useDiseño.getState().objetos.find(
        (o) => o.roomId !== '__libreria__' && cat.grupoAccionDe(o.tipo, o.grupoAccion) === 'acostarse',
      )
      if (!cama) return 'SIN CAMA'
      const nivel = L.niveles[cama.roomId] ?? 0
      const [rx, , rz] = lay.roomWorldPos(cama.roomId)
      const wx = rx + (cama.x ?? 0)
      const wz = rz + (cama.z ?? 0)
      useHouse.setState({ playerLevel: nivel })
      await sleep(600)
      // Altura REAL del colchón: sin ella el avatar queda enterrado en el mueble.
      const base = walls.nivelBaseY(nivel, !useHouse.getState().explotado)
      let sup = base + 0.945
      const st3 = window.__r3f()
      st3.scene.traverse((o) => {
        if (o.type !== 'Mesh' || !o.geometry) return
        const m = o.matrixWorld.elements
        const x = m[12], y = m[13], z = m[14]
        if (Math.hypot(x - wx, z - wz) > 0.7 || y < base || y > base + 2) return
        o.geometry.computeBoundingBox()
        const bb = o.geometry.boundingBox
        if (!bb) return
        const Box3 = bb.constructor
        const top = new Box3().copy(bb).applyMatrix4(o.matrixWorld).max.y
        if (top > sup && top < base + 1.5) sup = top
      })
      acc.useAccionCuarto.getState().usar(cama.id, wx, wz, ((cama.rotY ?? 0) * Math.PI) / 180, 'acostarse-generico', sup)
      await sleep(2700)
      const asis = useMascota.getState().mascota
      await rep.limpiarConversacion(asis)
      await rep.mensajesChatRepo.add({ asistenteId: asis, rol: 'usuario', texto: COPIA_Q, creado: new Date(Date.now() - 60000).toISOString() })
      await rep.mensajesChatRepo.add({ asistenteId: asis, rol: 'asistente', texto: COPIA_A, creado: new Date(Date.now() - 30000).toISOString() })
      useMascota.getState().abrirConversacion(asis)
      useMascota.getState().setHiloOculto(false)
      useCam.setState({ focus: [hs.playerPos.x, hs.playerPos.y - 2.8, hs.playerPos.z], zoom: 70, az: Math.PI / 4, el: 0.6154797086703873, vista: 'iso' })
      prep()
      await sleep(1800)
      return 'sup=' + sup.toFixed(2)
    `,
  },
]

const pedidos = process.argv.slice(2).filter((a) => IDIOMAS.includes(a))
const objetivo = pedidos.length ? pedidos : IDIOMAS

const COPIA = JSON.parse(
  await import('node:fs/promises').then((fs) => fs.readFile(resolve(RAIZ, 'copia.json'), 'utf8')),
)

/** La pestaña con la app, buscada de nuevo cada vez (el reload la renueva). */
async function pestana() {
  const t = (await lista()).find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
  if (!t) throw new Error('no hay pestaña con la app abierta; arranca el piloto (node cdp.mjs arranca) y abre http://localhost:53378/')
  return t
}

// `fromSurface` captura de la superficie del compositor, que NO puede ser mayor
// que la ventana real: sin agrandarla, el viewport sale cortado. Pero la ventana
// tampoco puede pasarse de la pantalla física, o la app deja de arrancar (ver el
// comentario de W/H). De ahí el tamaño justo y la esquina en 0,0.
// Va una sola vez: el tamaño de ventana sobrevive a las navegaciones.
{
  const t = await pestana()
  const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
  await conWs(ver.webSocketDebuggerUrl, async (b) => {
    const { windowId } = await b.enviar('Browser.getWindowForTarget', { targetId: t.id })
    await b.enviar('Browser.setWindowBounds', {
      windowId,
      bounds: { left: 0, top: 0, width: W + 40, height: H + 120, windowState: 'normal' },
    })
  })
}

/**
 * Una sesión CDP POR IDIOMA, y no una para toda la corrida: el `location.reload()`
 * del cambio de idioma deja llamadas a medias, y una sola de ellas rechazando
 * fuera de tiempo tumbaba el proceso entero — la corrida murió en `pt` con los
 * trece idiomas siguientes sin hacer. Así cada idioma estrena socket y el que
 * falle se salta solo.
 */
async function conSesion(fn) {
  const t = await pestana()
  return conWs(t.webSocketDebuggerUrl, async (c) => {
    await c.enviar('Page.enable')
    await c.enviar('Runtime.enable')
    // Con la ventana tapada la pestaña queda 'hidden': R3F pausa el rAF, el
    // lienzo se queda en 300×150 y __r3f nunca aparece.
    await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: W, height: H, deviceScaleFactor: 1, mobile: false, screenWidth: W, screenHeight: H,
    })
    return fn(c)
  })
}

async function capturarIdioma(id, c) {
  const L = COPIA[id]
  const evaluar = async (cuerpo, L) => {
    const cabecera = `const COPIA_Q = ${JSON.stringify(L.chatQ)}; const COPIA_A = ${JSON.stringify(L.chatA)};`
    const r = await c.enviar('Runtime.evaluate', {
      expression: `(async () => {\n${AYUDAS}\n${cabecera}\n${cuerpo}\n})()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'excepción')
    return r.result?.value
  }

  // SIN awaitPromise: `location.reload()` destruye el contexto a mitad de
  // camino y esa promesa no se resolvería nunca.
  //
  // `__viejo` marca ESTE contexto antes de recargar. Como no sobrevive a la
  // recarga, su ausencia es la prueba de que ya estamos en la página nueva. Sin
  // esa prueba el sondeo daba por bueno el contexto VIEJO —que todavía tiene
  // los globales y el `mh.demo.version` correcto de una corrida anterior—,
  // seguía adelante y la recarga llegaba después, en plena escena: de ahí el
  // «useHouse is not defined». Es una carrera, no un problema de esperar más.
  // A diferencia de `capturar.mjs`, aquí NO se borran las marcas
  // `sandbox.sucio`: hacerlo fuerza a resembrar el demo entero y esa siembra no
  // termina nunca en este entorno (probado con esperas de 180 y de 300 s, con
  // la app sin montar siquiera React). Cambiar `mh.idioma` ya basta para que el
  // DemoGate reconstruya en el idioma nuevo, que es lo único que hace falta.
  //
  // Los ajustes van en una evaluación y la recarga en `Page.navigate`, APARTE.
  // Con `location.reload()` la app no volvía a montar: se quedaba con el <div
  // id="root"> vacío, sin globales ni lienzo, indefinidamente (medido: >70 s,
  // mientras que con navigate monta en ~25 s). Es el mismo destino, pero
  // navigate estrena documento en vez de revalidar el actual.
  try {
    await c.enviar('Runtime.evaluate', {
      expression: `(() => {
        window.__viejo = 1
        localStorage.setItem('mh.demo', '1')
        localStorage.removeItem('mh.probar')
        localStorage.setItem('mh.idioma', ${JSON.stringify(id)})
      })()`,
      returnByValue: true,
    })
  } catch {}
  try {
    await c.enviar('Page.navigate', { url: APP })
  } catch {}
  // La condición pide TODOS los globales que usan las escenas, no solo
  // `useCuartos`: al reconstruir el demo la app puede recargar otra vez, y una
  // espera más laxa daba por listo un contexto que se evaporaba — las escenas
  // reventaban con «useHouse is not defined».
  const CONDICION = `(() => {
    if (window.__viejo) return false
    const v = localStorage.getItem('mh.demo.version') || ''
    if (!v.endsWith(':' + ${JSON.stringify(id)})) return false
    const g = ['useHouse', 'useCam', 'useCiclo', 'useDiseño', 'useLayout', 'useMascota', 'useCuartos']
    if (!g.every((k) => !!window[k])) return false
    return useCuartos.getState().cuartos.length >= 17 && !!window.__r3f && !!document.querySelector('canvas')
  })()`
  const esperar = async (vueltas) => {
    for (let i = 0; i < vueltas; i++) {
      await dormir(2000)
      try {
        const r = await c.enviar('Runtime.evaluate', { expression: CONDICION, returnByValue: true })
        if (r.result?.value) return true
      } catch {}
    }
    return false
  }
  // 300 s, no 180: sembrar el demo de un idioma nuevo ronda los tres minutos
  // —y mientras dura, la app ni siquiera monta React—, así que un tope de 180
  // caía JUSTO en el filo y fallaba una vez sí y otra también.
  if (!(await esperar(150))) return 'sin reconstruir: se salta'
  await dormir(4000) // que asienten texturas y el primer render
  // Segunda comprobación tras el reposo: si en esos 4 s se coló una recarga,
  // los globales ya no están y hay que volver a esperarlos.
  if (!(await esperar(30))) return 'el contexto se recargó y no volvió: se salta'

  // Sello para CAZAR RECARGAS. `mh.demo.version` vive en localStorage y
  // sobrevive al reload, así que una corrida anterior interrumpida a mitad de
  // este idioma la deja ya marcada: la condición daba por buena una página que
  // seguía reconstruyéndose y que recargaba acto seguido, y la escena moría con
  // «useHouse is not defined». Esta marca vive en `window` y se la lleva
  // cualquier recarga, así que delata exactamente eso.
  const intacto = async () => {
    try {
      const r = await c.enviar('Runtime.evaluate', {
        expression: '(() => window.__captura === 1 && !!window.useHouse)()',
        returnByValue: true,
      })
      return !!r.result?.value
    } catch {
      return false
    }
  }

  // La app recarga UNA VEZ MÁS al terminar de sembrar el demo, y lo hace
  // después de que ya haya 17 cuartos y lienzo — o sea, justo después de que la
  // condición de arriba se dé por buena. Por eso no basta con esperar a que
  // esté lista: hay que comprobar que SIGUE siendo la misma página unos
  // segundos más tarde. Si la marca desapareció, se vuelve a esperar.
  let estable = false
  for (let i = 0; i < 6 && !estable; i++) {
    await c.enviar('Runtime.evaluate', { expression: 'window.__captura = 1' })
    await dormir(12000)
    estable = await intacto()
    if (!estable) await esperar(60)
  }
  if (!estable) return 'la página no deja de recargarse: se salta'

  const dir = resolve(SALIDA, id)
  mkdirSync(dir, { recursive: true })
  for (const esc of ESCENAS) {
    // Las escenas se encadenan sin recargar: si la página se fue a mitad, el
    // estado acumulado ya no vale y hay que rehacer el idioma entero.
    if (!(await intacto())) return 'RECARGA'
    const r = await evaluar(esc.js, L)
    const shot = await c.enviar('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
    })
    writeFileSync(resolve(dir, esc.archivo), Buffer.from(shot.data, 'base64'))
    console.log('  ' + esc.archivo + '  ' + r)
  }
  return 'ok'
}

const fallidos = []
for (const id of objetivo) {
  console.log('=== ' + id + ' ===')
  // Hasta tres pasadas: la reconstrucción del demo recarga sola alguna vez y la
  // única salida es rehacer el idioma desde el principio.
  let hecho = false
  for (let intento = 1; intento <= 3 && !hecho; intento++) {
    try {
      const r = await conSesion((c) => capturarIdioma(id, c))
      if (r === 'ok') hecho = true
      else console.log(`  intento ${intento}: ${r}`)
    } catch (e) {
      console.log(`  intento ${intento}: ${e.message}`)
    }
  }
  if (!hecho) fallidos.push(id)
  console.log('  ' + (hecho ? 'ok' : 'SIN TERMINAR'))
}
console.log(`\ncapturas en ${SALIDA}`)
if (fallidos.length) console.log(`sin terminar: ${fallidos.join(' ')} (relánzalos: node capturar-windows.mjs ${fallidos.join(' ')})`)
