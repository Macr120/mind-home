// Captura las 4 escenas de la app en cada idioma, desde el Chrome del piloto CDP.
// Uso: node capturar.mjs [es en pt ...]   (sin argumentos: los 16)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SHOTS = resolve(RAIZ, '..', 'shots')
const APP = 'http://localhost:53378/'

const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']
const COPIA = JSON.parse(readFileSync(resolve(RAIZ, 'copia.json'), 'utf8'))

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
    ws.onopen = async () => {
      const enviar = (metodo, params = {}) =>
        new Promise((ok, ko) => {
          const n = ++id
          pend.set(n, { ok, ko })
          ws.send(JSON.stringify({ id: n, method: metodo, params }))
        })
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

/** Ayudas que se inyectan al principio de CADA evaluación (se pierden al recargar). */
const AYUDAS = `
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const prep = () => {
  const st = window.__r3f()
  st.gl.setPixelRatio(3)
  st.gl.setSize(st.size.width, st.size.height, true)
  st.invalidate()
  // El chip "salir de la demo" se localiza por clases, no por su texto (cambia de idioma).
  document.querySelectorAll('div').forEach((e) => {
    const c = e.className
    if (typeof c === 'string' && c.includes('z-[45]') && c.includes('top-20') && c.includes('fixed')) {
      e.style.display = 'none'
    }
  })
}
`

/** Escenas, en el orden en que se encadenan sin recargar. */
const ESCENAS = (L) => [
  {
    archivo: '01-casa.png',
    js: `
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      await sleep(500)
      useCiclo.setState({ minutos: 12 * 60, modo: 'manual' })
      useCam.setState({ focus: [-49, 1, -25], zoom: 15, az: Math.PI / 4, el: 0.6154797086703873, vista: 'iso' })
      prep()
      await sleep(1600)
      return 'ok'
    `,
  },
  {
    archivo: '02-cal.png',
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
    archivo: '03-mosaico.png',
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
    archivo: '04-cama.png',
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
      // Altura REAL del colchón: sin ella el avatar queda enterrado dentro del mueble.
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
        // Caja en coordenadas de MUNDO (la altura local no vale: hay rotaciones y escalas).
        const Box3 = bb.constructor
        const top = new Box3().copy(bb).applyMatrix4(o.matrixWorld).max.y
        if (top > sup && top < base + 1.5) sup = top
      })
      acc.useAccionCuarto.getState().usar(cama.id, wx, wz, ((cama.rotY ?? 0) * Math.PI) / 180, 'acostarse-generico', sup)
      await sleep(2700)
      const asis = useMascota.getState().mascota
      await rep.limpiarConversacion(asis)
      await rep.mensajesChatRepo.add({ asistenteId: asis, rol: 'usuario', texto: ${JSON.stringify(L.chatQ)}, creado: new Date(Date.now() - 60000).toISOString() })
      await rep.mensajesChatRepo.add({ asistenteId: asis, rol: 'asistente', texto: ${JSON.stringify(L.chatA)}, creado: new Date(Date.now() - 30000).toISOString() })
      useMascota.getState().abrirConversacion(asis)
      useMascota.getState().setHiloOculto(false)
      useCam.setState({ focus: [hs.playerPos.x, hs.playerPos.y - 2.8, hs.playerPos.z], zoom: 88, az: Math.PI / 4, el: 0.6154797086703873, vista: 'iso' })
      prep()
      await sleep(1800)
      return 'ok · sup=' + sup.toFixed(2)
    `,
  },
]

const pedidos = process.argv.slice(2).filter((a) => IDIOMAS.includes(a))
const objetivo = pedidos.length ? pedidos : IDIOMAS

const t = (await lista()).find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
if (!t) throw new Error('no hay pestaña con la app abierta; abre ' + APP)

await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Runtime.enable')
  // Sin esto, con la ventana tapada la pestaña queda 'hidden': R3F pausa el rAF,
  // el canvas se queda en 300x150 y __r3f nunca aparece.
  await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: false, screenWidth: 390, screenHeight: 844,
  })

  const evaluar = async (cuerpo) => {
    const r = await c.enviar('Runtime.evaluate', {
      expression: `(async () => {\n${AYUDAS}\n${cuerpo}\n})()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'excepción')
    return r.result?.value
  }

  for (const id of objetivo) {
    const L = COPIA[id]
    console.log('=== ' + id + ' ===')
    // Idioma + demo, y a esperar que el DemoGate reconstruya la casa. El `catch`
    // es obligatorio: el reload deja la llamada colgada ("Inspected target navigated").
    try {
    await c.enviar('Runtime.evaluate', {
      expression: `(() => {
        localStorage.setItem('mh.demo', '1')
        localStorage.removeItem('mh.probar')
        localStorage.setItem('mh.idioma', ${JSON.stringify(id)})
        Object.keys(localStorage).filter((k) => k.includes('sandbox.sucio')).forEach((k) => localStorage.removeItem(k))
        location.reload()
      })()`,
    })
    } catch {}
    let listo = false
    for (let i = 0; i < 90; i++) {
      await dormir(2000)
      try {
        const r = await c.enviar('Runtime.evaluate', {
          expression: `(() => {
            const v = localStorage.getItem('mh.demo.version') || ''
            const n = window.useCuartos ? useCuartos.getState().cuartos.length : 0
            return v.endsWith(':' + ${JSON.stringify(id)}) && n >= 17 && !!window.__r3f && !!document.querySelector('canvas')
          })()`,
          returnByValue: true,
        })
        if (r.result?.value) { listo = true; break }
      } catch {}
    }
    if (!listo) { console.log('  ¡sin reconstruir! se salta'); continue }
    await dormir(4000) // que asienten texturas y el primer render

    const dir = resolve(SHOTS, id)
    mkdirSync(dir, { recursive: true })
    for (const esc of ESCENAS(L)) {
      const r = await evaluar(esc.js)
      const shot = await c.enviar('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: 390, height: 844, scale: 3 },
      })
      writeFileSync(resolve(dir, esc.archivo), Buffer.from(shot.data, 'base64'))
      console.log('  ' + esc.archivo + '  ' + r)
    }
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
console.log('capturas listas')
