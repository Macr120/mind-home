// Paquete de publicación por red social para cada video de una guía:
//   salida/<id>/final/paquete.json   título, descripción con enlaces, capítulos, hashtags
//
//   node marketing/guias/paquetes.mjs ejercicio [--lang=es]
//
// Los enlaces llevan utm por red para ver en la analítica qué canal trae a quién.
// TikTok e Instagram no hacen clicables los enlaces del texto: allí el enlace va
// en la bio y el texto lo dice.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
const guion = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${idioma}.json`), 'utf8'))
const medios = JSON.parse(readFileSync(path.join(RAIZ, tema, 'medios.json'), 'utf8'))
const FINAL = path.join(RAIZ, tema, 'salida', idioma, 'final')
const capitulos = existsSync(path.join(FINAL, 'capitulos.txt')) ? readFileSync(path.join(FINAL, 'capitulos.txt'), 'utf8').trim() : ''

const prefijo = idioma === 'es' ? '' : `/${idioma}`
const pagina = (red, parte) => `https://mindhaos.com${prefijo}/guias/${tema}?utm_source=${red}&utm_medium=video&utm_campaign=guia-${tema}${parte ? `#parte-${parte}` : ''}`
const app = (red) => `https://app.mindhaos.com/?app=${guion.plantillaId}&utm_source=${red}&utm_medium=video&utm_campaign=guia-${tema}-${idioma}`

/** Textos fijos del paquete (el resto sale del guion): `paquete` de web/i18n/guias/<id>.json, con el español de respaldo. */
const textos = (id) => {
  const ruta = path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias', `${id}.json`)
  return existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')).paquete ?? {} : {}
}
const t = { ...textos('es'), ...textos(idioma) }
t.hashtags = t.hashtags.split(/\s+/)


const fuentes = guion.fuentes.map((f) => `• ${f.texto} ${f.url}`).join('\n')
// Todos de Pexels (no exige atribución): los autores en una línea, sin repetir.
const laminas = Object.values(medios.laminas ?? {})
const esWiki = (f) => f.fuente.includes('wikimedia.org')
const fotos = [...new Set([...Object.values(medios.fotos), ...laminas.filter((f) => f.fuente.includes('pexels.com'))].map((f) => f.autor))].join(', ')
// La música pide su crédito tal cual.
const musica = JSON.parse(readFileSync(path.join(RAIZ, 'musica', 'musica.json'), 'utf8')).canciones.map((c) => c.credito.join('\n')).join('\n\n')
// Las CC BY/BY-SA piden autor, licencia y enlace.
const wiki = laminas.filter(esWiki).map((f) => `• ${f.autor} · ${f.licencia} · ${f.fuente}`).join('\n')

function descripcionLarga(red, parte) {
  return [
    guion.subtitulo,
    '',
    `▶ ${t.guia}: ${pagina(red, parte)}`,
    `▶ ${t.app}: ${app(red)}`,
    '',
    ...(parte ? [] : [`${t.capitulos}:`, capitulos, '']),
    guion.aviso,
    '',
    `${t.fuentes}:`,
    fuentes,
    `${t.fotos}:`,
    fotos,
    `${t.wiki}:`,
    wiki,
    '',
    `${t.musica}:`,
    musica,
    '',
    t.hashtags.join(' '),
  ].join('\n')
}

function corto(red, parte) {
  const titulo = parte ? `${guion.pregunta} · ${t.parte} ${parte}/${guion.partes.length}: ${guion.partes[parte - 1].titulo}` : guion.pregunta
  return [titulo, '', guion.subtitulo, '', `${t.bio}.`, '', t.hashtags.join(' ')].join('\n')
}

const videos = [{ archivo: 'completo.mp4', parte: 0 }, ...guion.partes.map((_, i) => ({ archivo: `parte-${i + 1}.mp4`, parte: i + 1 }))]
const paquete = videos.map(({ archivo, parte }) => ({
  archivo,
  youtube: {
    titulo: parte ? `${guion.pregunta} (${t.parte} ${parte}): ${guion.partes[parte - 1].titulo}` : `${guion.pregunta} ${t.guiaCompleta}`,
    descripcion: descripcionLarga('youtube', parte),
  },
  // Facebook sí hace clicables los enlaces del texto.
  facebook: { texto: descripcionLarga('facebook', parte) },
  instagram: { texto: corto('instagram', parte), enlaceBio: pagina('instagram') },
  tiktok: { texto: corto('tiktok', parte), enlaceBio: pagina('tiktok') },
}))
writeFileSync(path.join(FINAL, 'paquete.json'), JSON.stringify({ tema, idioma, pregunta: guion.pregunta, videos: paquete }, null, 2))
console.log(`✓ paquete.json · ${paquete.length} videos × 4 redes`)
