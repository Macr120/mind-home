// Piloto mínimo de Chrome por CDP (WebSocket nativo de Node 24).
// Uso: node cdp.mjs arranca [url] | eval <archivo.js> | shot <salida.png> | metrics <w> <h> <dpr> | mata
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const PORT = 9333
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const PERFIL = resolve(RAIZ, 'perfil-chrome')

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function lista() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return r.json()
}

async function vivo() {
  try {
    await lista()
    return true
  } catch {
    return false
  }
}

async function arranca(url) {
  if (await vivo()) {
    console.log('ya estaba vivo')
  } else {
    mkdirSync(PERFIL, { recursive: true })
    const args = [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PERFIL}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,MediaRouter',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=460,980',
      '--window-position=40,40',
      '--autoplay-policy=no-user-gesture-required',
      ...(process.env.MH_HEADLESS ? ['--headless=new', '--use-angle=gl', '--enable-unsafe-swiftshader'] : []),
      url || 'about:blank',
    ]
    const p = spawn(CHROME, args, { detached: true, stdio: 'ignore' })
    p.unref()
    for (let i = 0; i < 60; i++) {
      if (await vivo()) break
      await dormir(500)
    }
    console.log('arrancado')
  }
  if (url) await conNavegador(async (c) => { await c.enviar('Page.navigate', { url }) })
}

/** Abre el WS del primer target de página que sirva la app (o el único que haya). */
async function conPagina(fn) {
  const t = (await lista()).filter((x) => x.type === 'page')
  const filtro = process.env.MH_TARGET || 'localhost:53378'
  const obj = t.find((x) => x.url.includes(filtro)) || t.find((x) => !x.url.startsWith('devtools')) || t[0]
  if (!obj) throw new Error('sin targets de página')
  return conWs(obj.webSocketDebuggerUrl, fn)
}

async function conNavegador(fn) {
  const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
  return conWs(v.webSocketDebuggerUrl, fn)
}

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
    ws.onerror = (e) => rej(new Error('ws error ' + (e.message || '')))
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

const [, , cmd, ...rest] = process.argv

if (cmd === 'arranca') {
  await arranca(rest[0])
} else if (cmd === 'mata') {
  // Cierra SOLO este Chrome (el del perfil aparte), nunca el del usuario.
  try { await conNavegador((c) => c.enviar('Browser.close')) } catch {}
  console.log('cerrado')
} else if (cmd === 'eval') {
  const cuerpo = readFileSync(resolve(process.cwd(), rest[0]), 'utf8')
  const r = await conPagina(async (c) => {
    await c.enviar('Runtime.enable')
    return c.enviar('Runtime.evaluate', {
      expression: `(async () => {\n${cuerpo}\n})()`,
      awaitPromise: true,
      returnByValue: true,
      allowUnsafeEvalBlocklistBypass: true,
    })
  })
  if (r.exceptionDetails) {
    console.error('EXCEPCION:', JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails, null, 1))
    process.exit(1)
  }
  console.log(JSON.stringify(r.result?.value ?? null, null, 1))
} else if (cmd === 'shot') {
  const salida = resolve(process.cwd(), rest[0])
  mkdirSync(dirname(salida), { recursive: true })
  const r = await conPagina(async (c) => {
    await c.enviar('Page.enable')
    const esc = Number(rest[1] || 1)
    const vm = await c.enviar('Runtime.evaluate', { expression: '[innerWidth, innerHeight]', returnByValue: true })
    const [w, h] = vm.result.value
    return c.enviar('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: w, height: h, scale: esc },
    })
  })
  writeFileSync(salida, Buffer.from(r.data, 'base64'))
  console.log('ok ' + salida)
} else if (cmd === 'metrics') {
  const [w, h, dpr] = rest.map(Number)
  await conPagina(async (c) => {
    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: dpr || 1, mobile: false, screenWidth: w, screenHeight: h,
    })
  })
  console.log(`ok ${w}x${h}@${dpr}`)
} else if (cmd === 'nueva') {
  const r = await conNavegador(async (c) => c.enviar('Target.createTarget', { url: rest[0] || 'about:blank' }))
  console.log(JSON.stringify(r))
} else if (cmd === 'ir') {
  await conPagina(async (c) => {
    await c.enviar('Page.enable')
    await c.enviar('Page.navigate', { url: rest[0] })
  })
  console.log('navegando')
} else {
  console.log('cmd?')
}
