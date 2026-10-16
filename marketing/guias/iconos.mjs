// El icono de la app de cada guía, como en la vista «apps» del panel de cuartos: el glifo
// de la plantilla (IconoMarca, estilo «Coloridos») sobre el mosaico redondeado del color
// de su cuarto. Lo saca de la app misma (demo en el Chrome del grabador) y lo deja en
//   marketing/guias/<tema>/icono-app.svg
// que miniaturas.mjs pone en primer plano junto al narrador (en lugar del emoji de antes).
//
//   APP_URL=http://localhost:53378 node marketing/guias/iconos.mjs ejercicio cocina …
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { RAIZ, conPagina, evaluar } from './cdp.mjs'
import { abrirDemo, enDemo } from './demo.mjs'

const temas = process.argv.slice(2)
if (!temas.length) throw new Error('uso: node marketing/guias/iconos.mjs <tema> [<tema>…]')

/** Mezcla `color` al `p` (0-1) con `base`, en hexadecimal. */
function mezcla(color, p, base = '#f4f4f5') {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [a, b] = [rgb(color), rgb(base)]
  return '#' + a.map((v, i) => Math.round(v * p + b[i] * (1 - p)).toString(16).padStart(2, '0')).join('')
}

await conPagina(process.env.TEMP ?? RAIZ, async (c) => {
  if (!(await enDemo(c, 'es'))) await abrirDemo(c, 'es')
  for (const tema of temas) {
    const { plantillaId } = JSON.parse(readFileSync(path.join(RAIZ, tema, 'guion.es.json'), 'utf8'))
    const r = JSON.parse(await evaluar(c, `(async () => {
      const url = (m) => performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes(m)) ?? m
      const { plantillas } = await import(url('/src/core/registry.ts'))
      const { IconoMarca } = await import(url('/src/core/ui/iconos/glifosApps.tsx'))
      // Las dependencias que Vite empaqueta llegan como CommonJS: lo útil va en \`default\`.
      const mR = await import(url('/node_modules/.vite/deps/react.js'))
      const React = mR.createElement ? mR : mR.default
      const mD = await import(url('/node_modules/.vite/deps/react-dom_client.js'))
      const createRoot = mD.createRoot ?? mD.default.createRoot
      const p = plantillas.find((x) => x.id === ${JSON.stringify(plantillaId)})
      if (!p) return JSON.stringify({ error: 'sin plantilla ${plantillaId}' })
      const div = document.createElement('div')
      div.style.cssText = 'position:fixed;left:-9999px;top:0'
      document.body.appendChild(div)
      const raiz = createRoot(div)
      raiz.render(React.createElement(IconoMarca, { emoji: p.icon, size: 48, estilo: 'emoji' }))
      for (let i = 0; i < 50 && !div.querySelector('svg'); i++) await new Promise((r) => setTimeout(r, 50))
      const svg = div.querySelector('svg')
      const res = { icon: p.icon, color: p.color, svg: svg?.outerHTML ?? null, estilo: svg?.getAttribute('style') ?? '' }
      raiz.unmount()
      div.remove()
      return JSON.stringify(res)
    })()`))
    if (r.error || !r.svg) throw new Error(`${tema}: ${r.error ?? 'sin glifo para ' + r.icon}`)
    // Las variables de color (--glifo-*) a valores fijos: el SVG se usa como imagen suelta.
    const vars = Object.fromEntries([...r.estilo.matchAll(/(--glifo-[\w-]+):\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]))
    const dentro = r.svg
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
      .replace(/var\((--glifo-[\w-]+)(?:,[^)]*)?\)/g, (_, v) => vars[v] ?? 'none')
    const fondo = mezcla(r.color, 0.32)
    const icono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".35"/></filter></defs>
  <rect x="14" y="10" width="192" height="192" rx="54" fill="${fondo}" stroke="${mezcla(r.color, 0.5, '#000000')}" stroke-opacity=".18" stroke-width="2" filter="url(#s)"/>
  <svg x="50" y="46" width="120" height="120" viewBox="0 0 48 48">${dentro}</svg>
</svg>
`
    writeFileSync(path.join(RAIZ, tema, 'icono-app.svg'), icono)
    console.log('✓', tema, r.icon, r.color)
  }
})
