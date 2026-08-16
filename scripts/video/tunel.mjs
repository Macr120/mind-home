/**
 * Túnel HTTPS para probar la máscara en el iPhone: arranca cloudflared contra el
 * dev server de la máscara (puerto 5175) y, cuando el túnel anuncia su URL
 * pública, la imprime con un QR para escanearla con la cámara del teléfono.
 *
 * Uso: en una terminal `npm run dev:mascara` y en otra `npm run mascara:tunel`.
 */
import { spawn } from 'node:child_process'
import qrcode from 'qrcode-terminal'

const PUERTO = process.argv[2] ?? '5175'

const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PUERTO}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

proc.on('error', (e) => {
  console.error(`No se pudo arrancar cloudflared (${e.message}). ¿Está instalado? winget install Cloudflare.cloudflared`)
  process.exit(1)
})

let anunciado = false
const buscarUrl = (trozo) => {
  if (anunciado) return
  const m = String(trozo).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  if (!m) return
  anunciado = true
  console.log(`\nTúnel listo: ${m[0]}\nEscanea el QR con el iPhone (Safari):\n`)
  qrcode.generate(m[0], { small: true })
}

proc.stdout.on('data', buscarUrl)
proc.stderr.on('data', buscarUrl) // cloudflared anuncia la URL por stderr

process.on('SIGINT', () => {
  proc.kill()
  process.exit(0)
})
