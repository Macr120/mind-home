/**
 * Guion del video: el puente sacar → (Claude traduce EN SESIÓN, sin API) → meter,
 * calcado de `scripts/traducir-a-mano.mjs`. Trabaja sobre `marketing/video/<slug>/`.
 *
 *   node scripts/video/guion.mjs sacar lanzamiento
 *     es.srt + meta.es.json → guion.pendientes.json (con el presupuesto en
 *     segundos de cada frase) y meta.pendientes.json.
 *
 *   node scripts/video/guion.mjs meter lanzamiento de   (o `todos`)
 *     guion.<id>.json ([{ n, texto }]) → <id>.srt con los MISMOS tiempos del
 *     español. Valida números, vacíos y meta.<id>.json.
 *
 * Reglas para quien traduce (además del glosario `scripts/traducir/glosario.mjs`):
 * cada frase debe poder DECIRSE en su presupuesto de `segundos` (longitud ≈
 * español ±15 %) y caber como subtítulo (≤ 2 líneas × 42 caracteres).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsearSrt, serializarSrt, presupuesto } from './srt.mjs'
import { IDIOMAS_DESTINO } from './voces.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const [orden, slug, idioma] = process.argv.slice(2)

if (!orden || !slug) {
  console.error('uso: guion.mjs sacar <slug> | meter <slug> <idioma|todos>')
  process.exit(1)
}

const DIR = path.join(RAIZ, 'marketing', 'video', slug)
const leerJson = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'))
const escribirJson = (ruta, dato) => writeFileSync(ruta, JSON.stringify(dato, null, 2) + '\n', 'utf8')

const META_PLANTILLA = {
  titulo: '',
  descripcion: '',
  hashtags: [],
  porPlataforma: {
    youtube: { titulo: '', descripcion: '' },
    instagram: { caption: '' },
    tiktok: { caption: '' },
    facebook: { texto: '' },
  },
}

/** Rutas de todas las hojas de un objeto anidado (para validar meta traducida). */
function hojas(objeto, ruta = []) {
  if (typeof objeto !== 'object' || objeto === null || Array.isArray(objeto)) return [ruta.join('.')]
  return Object.entries(objeto).flatMap(([k, v]) => hojas(v, [...ruta, k]))
}

if (orden === 'sacar') {
  mkdirSync(DIR, { recursive: true })
  const rutaSrt = path.join(DIR, 'es.srt')
  if (!existsSync(rutaSrt)) {
    console.error(`Falta ${rutaSrt} (transcribe con whisper-ctranslate2 y corrígelo a mano).`)
    process.exit(1)
  }
  const segmentos = parsearSrt(readFileSync(rutaSrt, 'utf8'))
  const pendientes = segmentos.map((s, i) => ({
    n: s.n,
    inicio: s.inicio,
    fin: s.fin,
    segundos: Math.round(presupuesto(segmentos, i) * 10) / 10,
    es: s.texto,
  }))
  escribirJson(path.join(DIR, 'guion.pendientes.json'), pendientes)

  const rutaMeta = path.join(DIR, 'meta.es.json')
  if (!existsSync(rutaMeta)) {
    escribirJson(rutaMeta, META_PLANTILLA)
    console.log('meta.es.json no existía: escrita la plantilla, RELLÉNALA antes de traducir.')
  }
  escribirJson(path.join(DIR, 'meta.pendientes.json'), leerJson(rutaMeta))
  console.log(`Listo: ${pendientes.length} frases en guion.pendientes.json + meta.pendientes.json.`)
  console.log(`Traducir en sesión a guion.<id>.json ([{n, texto}]) y meta.<id>.json para: ${IDIOMAS_DESTINO.join(' ')}`)
  process.exit(0)
}

if (orden === 'meter') {
  if (!idioma) {
    console.error('uso: guion.mjs meter <slug> <idioma|todos>')
    process.exit(1)
  }
  const segmentos = parsearSrt(readFileSync(path.join(DIR, 'es.srt'), 'utf8'))
  const metaEs = existsSync(path.join(DIR, 'meta.es.json')) ? leerJson(path.join(DIR, 'meta.es.json')) : null
  const ids = idioma === 'todos' ? IDIOMAS_DESTINO : [idioma]
  let fallos = 0

  for (const id of ids) {
    const rutaGuion = path.join(DIR, `guion.${id}.json`)
    if (!existsSync(rutaGuion)) {
      console.error(`✗ ${id}: falta guion.${id}.json`)
      fallos++
      continue
    }
    const traducciones = new Map(leerJson(rutaGuion).map((t) => [t.n, t.texto]))
    const problemas = segmentos.filter((s) => !traducciones.get(s.n)?.trim())
    if (problemas.length) {
      console.error(`✗ ${id}: sin traducción los segmentos ${problemas.map((s) => s.n).join(', ')}`)
      fallos++
      continue
    }
    for (const s of segmentos) {
      const texto = traducciones.get(s.n)
      if (texto.length > s.texto.length * 1.6) console.warn(`  aviso ${id} #${s.n}: traducción muy larga (${texto.length} vs ${s.texto.length} chars)`)
    }
    writeFileSync(
      path.join(DIR, `${id}.srt`),
      serializarSrt(segmentos.map((s) => ({ ...s, texto: traducciones.get(s.n) }))),
      'utf8',
    )
    if (metaEs) {
      const rutaMeta = path.join(DIR, `meta.${id}.json`)
      if (!existsSync(rutaMeta)) console.warn(`  aviso ${id}: falta meta.${id}.json`)
      else {
        const faltan = hojas(metaEs).filter((r) => !hojas(leerJson(rutaMeta)).includes(r))
        if (faltan.length) console.warn(`  aviso ${id}: meta.${id}.json sin ${faltan.join(', ')}`)
      }
    }
    console.log(`✓ ${id}.srt (${segmentos.length} segmentos)`)
  }
  process.exit(fallos ? 1 : 0)
}

console.error(`Orden desconocida: ${orden}`)
process.exit(1)
