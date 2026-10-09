// Comprueba que la traducción de una guía tiene la misma forma que el español:
//   node marketing/guias/validar.mjs ejercicio en [fr …]
//
// guion.<id>.json: mismas partes y líneas, mismos ids y campos que no se
// traducen (escena, visual, plano, lámina, meme, mención, enCasa), el gancho con
// sus cinco frases (pregunta, afirmación, afirmación, pregunta, afirmación) y las
// anclas del cierre presentes en su texto. web/i18n/guias/<id>.json: las mismas
// claves que el español, ninguna vacía.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const [tema = 'ejercicio', ...ids] = process.argv.slice(2)
const leer = (r) => JSON.parse(readFileSync(r, 'utf8'))
const es = leer(path.join(RAIZ, tema, 'guion.es.json'))
const uiEs = leer(path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias', 'es.json'))
const FIJOS = ['id', 'escena', 'visual', 'plano', 'lamina', 'meme', 'mencion', 'enCasa']

/** Frases del texto por su puntuación final, con el signo con que acaban. */
function frases(texto) {
  const r = []
  let ini = 0
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    const fin = '.?!'.includes(c) ? i === texto.length - 1 || /\s/.test(texto[i + 1]) : '。？！؟।'.includes(c)
    if (fin) {
      r.push({ texto: texto.slice(ini, i + 1).trim(), pregunta: '?？؟'.includes(c) })
      ini = i + 1
    }
  }
  if (texto.slice(ini).trim()) r.push({ texto: texto.slice(ini).trim(), pregunta: false })
  return r
}

function clavesUi(o, pre = '') {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? clavesUi(v, `${pre}${k}.`) : [`${pre}${k}`]))
}
const valorUi = (o, clave) => clave.split('.').reduce((n, k) => n?.[k], o)

let fallos = 0
for (const id of ids) {
  const errores = []
  const ruta = path.join(RAIZ, tema, `guion.${id}.json`)
  if (!existsSync(ruta)) {
    console.log(`✗ ${id}: falta ${path.relative(RAIZ, ruta)}`)
    fallos++
    continue
  }
  const g = leer(ruta)
  if (g.idioma !== id) errores.push(`idioma = ${g.idioma}`)
  for (const k of ['tema', 'plantillaId']) if (g[k] !== es[k]) errores.push(`${k} cambió`)
  for (const k of ['pregunta', 'subtitulo', 'aviso']) if (!g[k]?.trim()) errores.push(`${k} vacío`)
  if (g.partes?.length !== es.partes.length) errores.push(`partes: ${g.partes?.length} (es: ${es.partes.length})`)
  es.partes.forEach((pe, i) => {
    const p = g.partes?.[i]
    if (!p) return
    if (p.id !== pe.id) errores.push(`parte ${i + 1}: id ${p.id}`)
    if (!p.titulo?.trim()) errores.push(`parte ${pe.id}: título vacío`)
    if (p.lineas?.length !== pe.lineas.length) errores.push(`parte ${pe.id}: ${p.lineas?.length} líneas (es: ${pe.lineas.length})`)
    pe.lineas.forEach((le, j) => {
      const l = p.lineas?.[j]
      if (!l) return
      for (const f of FIJOS) if (JSON.stringify(l[f]) !== JSON.stringify(le[f])) errores.push(`${pe.id}.${le.id}: «${f}» cambió`)
      if (!l.texto?.trim()) errores.push(`${pe.id}.${le.id}: texto vacío`)
      if (l.texto === le.texto) errores.push(`${pe.id}.${le.id}: sin traducir`)
    })
  })
  const gancho = g.partes?.[0]?.lineas?.find((l) => l.id === 'gancho')
  if (gancho) {
    const fr = frases(gancho.texto)
    const forma = fr.map((f) => (f.pregunta ? '?' : '.')).join('')
    if (forma !== '?..?.') errores.push(`gancho: frases «${forma}» (debe ser «?..?.»: pregunta, afirmación, afirmación, pregunta, afirmación)`)
  }
  for (const k of ['texto', 'boton']) if (!g.cierre?.[k]?.trim()) errores.push(`cierre.${k} vacío`)
  for (const [k, v] of Object.entries(es.cierre.anclas ?? {})) {
    const a = g.cierre?.anclas?.[k]
    if (!a) errores.push(`cierre.anclas.${k} falta`)
    else if (!g.cierre.texto.toLowerCase().includes(a.toLowerCase())) errores.push(`cierre.anclas.${k} «${a}» no está en el texto del cierre`)
    void v
  }
  if (g.cierre?.lamina !== es.cierre.lamina) errores.push('cierre.lamina cambió')
  if (g.fuentes?.length !== es.fuentes.length) errores.push('fuentes: otra cantidad')
  else g.fuentes.forEach((f, i) => f.url !== es.fuentes[i].url && errores.push(`fuente ${f.id}: url cambió`))

  const rutaUi = path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias', `${id}.json`)
  if (!existsSync(rutaUi)) errores.push(`falta web/i18n/guias/${id}.json`)
  else {
    const ui = leer(rutaUi)
    // Vacía solo donde el español también lo está (p. ej. el texto de abajo de un meme de un panel).
    const faltan = clavesUi(uiEs).filter((k) => typeof valorUi(ui, k) !== 'string' || (!valorUi(ui, k).trim() && valorUi(uiEs, k).trim()))
    const sobran = clavesUi(ui).filter((k) => valorUi(uiEs, k) === undefined)
    if (faltan.length) errores.push(`UI sin: ${faltan.join(', ')}`)
    if (sobran.length) errores.push(`UI de más: ${sobran.join(', ')}`)
  }

  if (errores.length) {
    fallos++
    console.log(`✗ ${id}:\n  ${errores.join('\n  ')}`)
  } else console.log(`✓ ${id}`)
}
process.exit(fallos ? 1 : 0)
