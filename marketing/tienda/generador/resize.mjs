const PORT = 9333
function conWs(url, fn) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url); let id = 0; const pend = new Map()
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { ok, ko } = pend.get(m.id); pend.delete(m.id); m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result) } }
    ws.onerror = () => rej(new Error('ws'))
    ws.onopen = async () => {
      const enviar = (met, par = {}) => new Promise((ok, ko) => { const n = ++id; pend.set(n, { ok, ko }); ws.send(JSON.stringify({ id: n, method: met, params: par })) })
      try { const r = await fn({ enviar }); ws.close(); res(r) } catch (e) { ws.close(); rej(e) }
    }
  })
}
const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
await conWs(v.webSocketDebuggerUrl, async (c) => {
  const t = await c.enviar('Target.getTargets')
  const page = t.targetInfos.find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
  const { windowId } = await c.enviar('Browser.getWindowForTarget', { targetId: page.targetId })
  await c.enviar('Browser.setWindowBounds', { windowId, bounds: { width: 2150, height: 2850, windowState: 'normal' } })
  console.log('resized', windowId)
})
