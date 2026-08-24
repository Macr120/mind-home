// Calcula el bounding-box X/Z de TODO lo dibujado a nivel de suelo (casa +
// infraestructura: canchas, huerto, granja, pistas, alberca…), recorriendo la
// escena Three.js directamente en vez de leer los stores (la infra no vive en
// `layoutStore`, así que `mapFocusPos()` se queda corta).
const PORT = 9333
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
    ws.onerror = () => rej(new Error('ws'))
    ws.onopen = async () => {
      const enviar = (met, par = {}) =>
        new Promise((ok, ko) => {
          const n = ++id
          pend.set(n, { ok, ko })
          ws.send(JSON.stringify({ id: n, method: met, params: par }))
        })
      try {
        const r = await fn({ enviar })
        ws.close()
        res(r)
      } catch (e) {
        ws.close()
        rej(e)
      }
    }
  })
}
const lista = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const t = (await lista()).find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Runtime.enable')
  const r = await c.enviar('Runtime.evaluate', {
    expression: `(() => {
      const st = window.__r3f()
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9
      st.scene.traverse((o) => {
        if (o.type !== 'Mesh' || !o.geometry) return
        const m = o.matrixWorld.elements
        const y = m[13]
        // Suelo/objetos bajos: fuera cielo, nubes, sol/luna, avatar en el aire.
        if (y < -3 || y > 6) return
        const g = o.geometry
        if (!g.boundingBox) g.computeBoundingBox()
        const bb = g.boundingBox
        if (!bb || !isFinite(bb.min.x)) return
        const Box3 = bb.constructor
        const w = new Box3().copy(bb).applyMatrix4(o.matrixWorld)
        if (w.min.x < x0) x0 = w.min.x
        if (w.max.x > x1) x1 = w.max.x
        if (w.min.z < z0) z0 = w.min.z
        if (w.max.z > z1) z1 = w.max.z
      })
      return { bbox: [x0, x1, z0, z1], centro: [(x0 + x1) / 2, (z0 + z1) / 2], tam: [x1 - x0, z1 - z0] }
    })()`,
    returnByValue: true,
  })
  console.log(JSON.stringify(r.result?.value ?? r.exceptionDetails, null, 1))
})
