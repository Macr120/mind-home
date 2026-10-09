// Produce los videos de una guía en varios idiomas, uno tras otro:
//   validar → voz → app 2D → tomas de la página → tomas de la casa → montaje → paquete
//
//   GUIAS_URL=http://localhost:53390 APP_URL=http://localhost:53378 node marketing/guias/producir.mjs ejercicio en fr …
//   … --pasos=casa,montaje,paquete     solo esos pasos
//   GRABAR_PUERTO=9338 …               otro Chrome (con su perfil): varias tandas en paralelo
//
// Cada paso es el script de siempre con `--lang=<id>`; un idioma que falla se
// anota y se sigue con el siguiente. No editar web/src/guias mientras corre
// (el HMR rompe las tomas).
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(RAIZ, '..', '..')
const args = process.argv.slice(2)
const [tema = 'ejercicio', ...ids] = args.filter((a) => !a.startsWith('--'))
const soloPasos = args.find((a) => a.startsWith('--pasos='))?.slice(8).split(',')

const correr = (script, args) =>
  new Promise((ok, mal) => {
    const p = spawn(process.execPath, [script, ...args], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] })
    let salida = ''
    p.stdout.on('data', (d) => (salida += d))
    p.stderr.on('data', (d) => (salida += d))
    p.on('close', (codigo) => {
      const lineas = salida.trim().split(/\r?\n/)
      // El error de verdad (no solo la pila): las líneas con «Error» más las últimas.
      if (codigo) mal(new Error([...lineas.filter((l) => /Error|✗/.test(l)).slice(0, 4), ...lineas.slice(-3)].join('\n')))
      else ok(lineas.slice(-2).join(' · '))
    })
  })

const PASOS = [
  ['validar', (id) => [path.join(RAIZ, 'validar.mjs'), [tema, id]]],
  ['voz', (id) => [path.join(REPO, 'scripts', 'guias', 'voz.mjs'), [tema, id]]],
  ['app 2D', (id) => [path.join(RAIZ, 'app2d.mjs'), [tema, `--lang=${id}`]]],
  ['página', (id) => [path.join(RAIZ, 'grabar.mjs'), [tema, `--lang=${id}`]]],
  ['casa', (id) => [path.join(RAIZ, 'casa.mjs'), [tema, `--lang=${id}`]]],
  ['montaje', (id) => [path.join(RAIZ, 'montar.mjs'), [tema, `--lang=${id}`]]],
  ['paquete', (id) => [path.join(RAIZ, 'paquetes.mjs'), [tema, `--lang=${id}`]]],
]

const fallos = []
for (const id of ids) {
  const t0 = Date.now()
  try {
    for (const [nombre, args] of PASOS.filter(([n]) => !soloPasos || soloPasos.includes(n))) {
      const r = await correr(...args(id))
      console.log(`  ${id} · ${nombre}: ${r}`)
    }
    console.log(`✓ ${id} en ${Math.round((Date.now() - t0) / 60000)} min`)
  } catch (e) {
    fallos.push(id)
    console.log(`✗ ${id}: ${e.message}`)
  }
}
console.log(fallos.length ? `Fallaron: ${fallos.join(', ')}` : '✓ todos')
