/**
 * Traduce SOLO las frases del Manual de comandos que faltan en cada
 * `manual.<idioma>.ts` y las inserta al final de su bloque `frases`, sin
 * regenerar el archivo.
 *
 * Por qué existe: `traducir-contenido.mjs --que=manual` regenera cada archivo
 * entero con lo que el modelo devuelve, y el motor descarta las frases cuyo
 * marcado [orden]/{dato} no valida — alrededor de la mitad en cada tanda. Una
 * regeneración PIERDE traducciones que ya existían. Este script solo añade.
 *
 * Por defecto traduce las frases NUEVAS respecto a git (`HEAD`): las viejas que
 * fallan llevan tiempo fallando y reintentarlas cuesta lo mismo cada vez. Con
 * `--todas` intenta todas las que falten.
 *
 *   node scripts/traducir-manual-faltantes.mjs            # los 14 idiomas, solo lo nuevo
 *   node scripts/traducir-manual-faltantes.mjs de fr      # algunos idiomas
 *   node scripts/traducir-manual-faltantes.mjs --todas    # también lo que fallaba
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sistemaDe } from './traducir/glosario.mjs'
import { comillas, crearCliente, nuevoGasto, resumenGasto, traducirTextos } from './traducir/motor.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const TODAS = args.includes('--todas')
const idiomas = args.filter((a) => !a.startsWith('--'))
const DESTINOS = idiomas.length ? idiomas : ['pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

const CADENA = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`
const desencomillar = (s) => s.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')

/** Los pares español/inglés del Manual (misma lectura por regex que traducir-contenido). */
function frasesDe(texto) {
  const salida = []
  const vistos = new Set()
  for (const m of texto.matchAll(new RegExp(String.raw`\bfrase:\s*(${CADENA})([\s\S]{0,300}?)\ben:\s*(${CADENA})`, 'g'))) {
    const es = desencomillar(m[1])
    const en = desencomillar(m[3])
    if (es === en || vistos.has(es)) continue
    vistos.add(es)
    salida.push({ id: es, es, en })
  }
  return salida
}

const INSTRUCCION_MANUAL = `Traduce estas frases de EJEMPLO del manual de comandos: son lo que el usuario
le diría al chat de la app para que haga algo, escritas como las diría de viva
voz. Tienen que sonar a persona hablando, no a comando de terminal.

El marcado es load-bearing: los [corchetes] envuelven la ORDEN (el verbo y lo
que lo acompaña) y las {llaves} envuelven el DATO que el usuario cambiaría por
el suyo. Los dos tienen que seguir envolviendo lo mismo en la traducción,
aunque el orden de las palabras cambie.`

const MANUAL = path.join(RAIZ, 'src', 'core', 'chat', 'ManualComandos.tsx')
const todas = frasesDe(readFileSync(MANUAL, 'utf8'))
let candidatas = todas
if (!TODAS) {
  const enHead = new Set(frasesDe(execSync('git show HEAD:src/core/chat/ManualComandos.tsx', { cwd: RAIZ, encoding: 'utf8' })).map((f) => f.es))
  candidatas = todas.filter((f) => !enHead.has(f.es))
  console.log(`frases nuevas respecto a HEAD: ${candidatas.length}`)
}

const cliente = crearCliente(RAIZ)
for (const id of DESTINOS) {
  const archivo = path.join(RAIZ, 'src', 'core', 'chat', `manual.${id}.ts`)
  let s = readFileSync(archivo, 'utf8')
  const nl = s.includes('\r\n') ? '\r\n' : '\n'
  const ini = s.indexOf('  frases: {')
  const fin = s.indexOf(nl + '  },', ini)
  if (ini < 0 || fin < 0) {
    console.log(`${id}: sin bloque frases`)
    continue
  }
  const existentes = new Set(
    [...s.slice(ini, fin).matchAll(new RegExp(String.raw`^\s{4}(${CADENA}):`, 'gm'))].map((m) => desencomillar(m[1])),
  )
  const faltan = candidatas.filter((f) => !existentes.has(f.es))
  if (!faltan.length) {
    console.log(`${id}: al día`)
    continue
  }
  const gasto = nuevoGasto()
  const trad = await traducirTextos(cliente, sistemaDe(id), faltan, gasto, { instruccion: INSTRUCCION_MANUAL })
  const lineas = [...trad].map(([es, t]) => `    ${comillas(es)}: ${comillas(t)},`).join(nl)
  if (lineas) writeFileSync(archivo, s.slice(0, fin) + nl + lineas + s.slice(fin))
  console.log(`${id}: ${faltan.length} faltaban → ${trad.size} traducidas · ${resumenGasto(gasto)}`)
}
