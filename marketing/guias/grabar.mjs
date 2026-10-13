// Graba una guía narrada tal como se ve en la web, en 1:1 (1080×1080) y CON su
// audio (la voz de Pep@ y los efectos salen de la propia pestaña). Una toma por
// parte, más el cierre:
//   marketing/guias/<tema>/salida/<id>/parte-N.mp4 (N = 1…partes+1; la última es el cierre)
//   marketing/guias/<tema>/salida/<id>/parte-N.json  si la parte salta una línea `enCasa`: dónde (montar.mjs inserta ahí su toma de la casa)
//
//   npm run dev:web                                    (en otra terminal)
//   node marketing/guias/grabar.mjs ejercicio          todas las partes, español
//   node marketing/guias/grabar.mjs ejercicio --partes=4,7
//   GUIAS_URL=http://localhost:53390 node marketing/guias/grabar.mjs ejercicio
//
// El piloto (Chrome headless, captura, recorte) vive en cdp.mjs.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { DESDE, RAIZ, codigoCaptura, conPagina, dormir, esperarDescarga, evaluar, fijarViewport, recortar } from './cdp.mjs'

const BASE = (process.env.GUIAS_URL || 'http://localhost:5174').replace(/\/$/, '')
const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
const guion = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${idioma}.json`), 'utf8'))
const TOTAL = guion.partes.length + 1
const partes = args.find((a) => a.startsWith('--partes='))?.slice(9).split(',').map(Number) ?? Array.from({ length: TOTAL }, (_, i) => i + 1)
const CRUDO = path.join(RAIZ, tema, 'grabaciones', idioma)
const SALIDA = path.join(RAIZ, tema, 'salida', idioma)
mkdirSync(SALIDA, { recursive: true })

/** La página arranca la narración de la parte y se espera a que calle su última línea. */
const NARRAR = `
  window.__cortes = []
  window.__lineas = []
  window.__t0 = performance.now()
  window.__guiaEmpezar()
  for (let i = 0; i < 40 && !window.__guia?.sonando; i++) await dormir(250)
  while (window.__guia?.sonando) await dormir(250)
`

await conPagina(CRUDO, async (c) => {
  for (const n of partes) {
    const nombre = `toma-${n}-${Date.now()}`
    await c.enviar('Page.navigate', { url: `${BASE}/guias/${tema}?grabar=cdp&lang=${idioma}&n=${nombre}#parte-${n}` })
    await fijarViewport(c)
    for (let i = 0; i < 60 && !(await evaluar(c, `!!window.__guiaEmpezar && !!document.querySelector('.g-lienzo canvas')`)); i++) await dormir(500)
    await dormir(3500) // que cargue Pep@ y el audio de la primera línea
    const previo = new Set(readdirSync(CRUDO))
    const t0 = Date.now()
    const r = await evaluar(c, codigoCaptura(nombre, NARRAR), { userGesture: true, timeout: 20 * 60 * 1000 })
    const crudo = await esperarDescarga(CRUDO, nombre, previo)
    const destino = path.join(SALIDA, `parte-${n}.mp4`)
    const vp = await recortar(crudo, destino)
    unlinkSync(crudo)
    // La acción arranca 1,5 s después de empezar a grabar y el recorte quita los primeros DESDE s.
    const m = await evaluar(c, '({ t0: window.__t0, cortes: window.__cortes, lineas: window.__lineas ?? [] })')
    const en = (t) => Math.round(((t - m.t0) / 1000 + 1.5 - DESDE) * 1000) / 1000
    // Dónde se saltó cada línea `enCasa` (montar.mjs mete ahí su toma de la casa) y dónde
    // empieza cada línea (la destacada de la parte abre su video suelto).
    writeFileSync(path.join(SALIDA, `parte-${n}.json`), JSON.stringify({ cortes: m.cortes.map((x) => ({ clave: x.clave, en: en(x.t) })), lineas: m.lineas.map((x) => ({ clave: x.clave, en: en(x.t) })) }, null, 1) + '\n')
    console.log(`✓ parte ${n}/${TOTAL}: ${Math.round((Date.now() - t0) / 1000)} s · viewport ${vp.w}×${vp.h} · audio ${r?.audio ? 'sí' : 'NO'} → ${path.relative(process.cwd(), destino)}`)
  }
})
