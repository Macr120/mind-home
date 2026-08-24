/**
 * Sube la ficha del App Store por la API de App Store Connect: los textos de
 * `marketing/ficha/<id>.md` y las capturas de `marketing/tienda/`.
 *
 *   ASC_KEY_ID=XXXX ASC_ISSUER_ID=xxxx-... ASC_KEY_P8=~/AuthKey_XXXX.p8 \
 *     npm run asc:ficha                 # todos los idiomas
 *     npm run asc:ficha -- es fr de     # solo esos
 *     npm run asc:ficha -- --solo-texto # sin tocar capturas
 *
 * POR QUÉ UN SCRIPT Y NO LA WEB: App Store Connect rellena cada localización
 * NUEVA copiando el inglés, así que sus campos nunca están vacíos, y su
 * formulario es React —no acepta que le peguen un valor por fuera—. A mano son
 * 16 idiomas × 5 campos + 80 capturas. Por la API es una pasada, repetible cada
 * vez que cambie la landing (que es de donde sale la copia, ver ficha-tienda.mjs).
 *
 * La clave se saca en App Store Connect › Users and Access › Integrations ›
 * App Store Connect API, con rol **App Manager**. El .p8 se descarga UNA vez.
 */
import { createHash, createSign } from 'node:crypto'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://api.appstoreconnect.apple.com/v1'
const BUNDLE = 'com.macr120.mindhome'

/**
 * Los 16 idiomas de la app y su código en App Store Connect, que NO siempre es
 * el mismo: Apple no tiene «español» ni «portugués» a secas, hay que elegir
 * variante. Se usan las mismas que el `locale` de `src/core/i18n/idiomas.ts`.
 */
const IDIOMAS = {
  en: 'en-US',
  es: 'es-MX',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it',
  ja: 'ja',
  zh: 'zh-Hans',
  ko: 'ko',
  ru: 'ru',
  hi: 'hi',
  tr: 'tr',
  id: 'id',
  pl: 'pl',
  nl: 'nl-NL',
  ar: 'ar-SA',
}

const URL_SOPORTE = 'https://mindplannerhome.com/soporte'
const URL_MARKETING = 'https://mindplannerhome.com'

// ---------------------------------------------------------------- credenciales

const kid = process.env.ASC_KEY_ID
const iss = process.env.ASC_ISSUER_ID
const rutaP8 = (process.env.ASC_KEY_P8 || '').replace(/^~/, homedir())

if (!kid || !iss || !rutaP8) {
  console.error(`Faltan credenciales. Se necesitan las tres:

  ASC_KEY_ID     el Key ID de la clave (10 caracteres)
  ASC_ISSUER_ID  el Issuer ID del equipo (un UUID, arriba de la tabla de claves)
  ASC_KEY_P8     ruta al AuthKey_<KEY_ID>.p8 descargado

App Store Connect › Users and Access › Integrations › App Store Connect API.
El rol tiene que ser App Manager o superior.`)
  process.exit(1)
}
if (!existsSync(rutaP8)) {
  console.error(`No encuentro la clave en ${rutaP8}`)
  process.exit(1)
}

/** JWT ES256 para la API. Apple no acepta más de 20 minutos de vigencia. */
function token() {
  const ahora = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const cabeza = b64({ alg: 'ES256', kid, typ: 'JWT' })
  const cuerpo = b64({ iss, iat: ahora, exp: ahora + 900, aud: 'appstoreconnect-v1' })
  const firma = createSign('SHA256')
  firma.update(`${cabeza}.${cuerpo}`)
  // La firma sale en DER y la API la quiere en formato plano (r||s).
  return `${cabeza}.${cuerpo}.${derAPlano(firma.sign(readFileSync(rutaP8, 'utf8')))}`
}

/** DER (secuencia de dos enteros) → los 64 bytes crudos que pide JOSE. */
function derAPlano(der) {
  let i = 2
  if (der[1] & 0x80) i += der[1] & 0x7f
  const leer = () => {
    i++ // salta el 0x02
    const largo = der[i++]
    let n = der.subarray(i, i + largo)
    i += largo
    while (n.length > 32) n = n.subarray(1) // quita el cero de signo
    return Buffer.concat([Buffer.alloc(32 - n.length), n])
  }
  return Buffer.concat([leer(), leer()]).toString('base64url')
}

let jwt = token()
let jwtHecho = Date.now()

async function api(ruta, opciones = {}) {
  // El token caduca a los 15 min; en una tanda de 80 capturas eso pasa.
  if (Date.now() - jwtHecho > 10 * 60 * 1000) {
    jwt = token()
    jwtHecho = Date.now()
  }
  const url = ruta.startsWith('http') ? ruta : `${API}${ruta}`
  const r = await fetch(url, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  })
  if (r.status === 204) return null
  const texto = await r.text()
  const datos = texto ? JSON.parse(texto) : null
  if (!r.ok) {
    const detalle = datos?.errors?.map((e) => `${e.title}: ${e.detail}`).join('\n  ') || texto
    throw new Error(`${opciones.method || 'GET'} ${ruta} → ${r.status}\n  ${detalle}`)
  }
  return datos
}

// ---------------------------------------------------------------------- textos

/** Saca los cinco campos del markdown que genera `ficha-tienda.mjs`. */
function ficha(id) {
  const md = readFileSync(join(raiz, `marketing/ficha/${id}.md`), 'utf8')
  const campo = (titulo) => {
    const m = new RegExp(`## ${titulo}[^\\n]*\\n\\n(.*?)(?=\\n## |$)`, 's').exec(md)
    return m ? m[1].trim() : ''
  }
  return {
    promotionalText: campo('Texto promocional'),
    description: campo('Descripción'),
    keywords: campo('Palabras clave'),
    supportUrl: URL_SOPORTE,
    marketingUrl: URL_MARKETING,
  }
}

// ------------------------------------------------------------------- capturas

/**
 * Sube un PNG en tres pasos, que es como funciona TODO asset de esta API:
 * se reserva (y Apple contesta con las operaciones de subida troceadas), se
 * mandan los trozos, y se confirma con el md5 del archivo entero. Sin ese
 * último PATCH la captura se queda en el limbo y no aparece en la ficha.
 */
async function subirCaptura(setId, ruta) {
  const bytes = readFileSync(ruta)
  const nombre = ruta.split('/').pop()
  const reserva = await api('/appScreenshots', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        attributes: { fileSize: statSync(ruta).size, fileName: nombre },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
      },
    }),
  })
  const id = reserva.data.id
  for (const op of reserva.data.attributes.uploadOperations) {
    const cabeceras = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]))
    const trozo = bytes.subarray(op.offset, op.offset + op.length)
    const r = await fetch(op.url, { method: op.method, headers: cabeceras, body: trozo })
    if (!r.ok) throw new Error(`Subiendo ${nombre}: ${r.status} ${await r.text()}`)
  }
  await api(`/appScreenshots/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        id,
        attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex') },
      },
    }),
  })
}

/** Deja el set con EXACTAMENTE estas capturas y en este orden. */
async function reponerSet(locId, tipo, rutas) {
  const sets = await api(`/appStoreVersionLocalizations/${locId}/appScreenshotSets`)
  const previo = sets.data.find((s) => s.attributes.screenshotDisplayType === tipo)
  if (previo) await api(`/appScreenshotSets/${previo.id}`, { method: 'DELETE' })
  const set = await api('/appScreenshotSets', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: tipo },
        relationships: {
          appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: locId } },
        },
      },
    }),
  })
  // En serie y no en paralelo: el orden de la ficha es el orden de llegada, y
  // subiéndolas a la vez las láminas acaban barajadas (comprobado en la web).
  for (const ruta of rutas) await subirCaptura(set.data.id, ruta)
}

// ----------------------------------------------------------------------- main

const args = process.argv.slice(2)
const soloTexto = args.includes('--solo-texto')
const pedidos = args.filter((a) => !a.startsWith('--'))
const lista = (pedidos.length ? pedidos : Object.keys(IDIOMAS)).filter((id) => {
  if (IDIOMAS[id]) return true
  console.warn(`Idioma desconocido, lo salto: ${id}`)
  return false
})

const apps = await api(`/apps?filter[bundleId]=${BUNDLE}`)
const app = apps.data[0]
if (!app) throw new Error(`No hay ninguna app con el bundle ${BUNDLE} en esta cuenta`)

const versiones = await api(
  `/apps/${app.id}/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=PREPARE_FOR_SUBMISSION`,
)
const version = versiones.data[0]
if (!version) throw new Error('No hay una versión de iOS editable (PREPARE_FOR_SUBMISSION)')
console.log(`App ${app.attributes.name} · versión ${version.attributes.versionString}\n`)

/**
 * Los identificadores de tamaño de pantalla los DICE Apple, no los inventamos:
 * se leen de los sets que ya existen (los de inglés, subidos a mano). Así el
 * script no se rompe el día que Apple renombre el «6.9"».
 */
const locs = await api(`/appStoreVersions/${version.id}/appStoreVersionLocalizations`)
let TIPO_IPHONE = 'APP_IPHONE_67'
let TIPO_IPAD = 'APP_IPAD_PRO_3GEN_129'
const enUS = locs.data.find((l) => l.attributes.locale === 'en-US')
if (enUS) {
  const sets = await api(`/appStoreVersionLocalizations/${enUS.id}/appScreenshotSets`)
  const tipos = sets.data.map((s) => s.attributes.screenshotDisplayType)
  TIPO_IPHONE = tipos.find((t) => t.includes('IPHONE')) || TIPO_IPHONE
  TIPO_IPAD = tipos.find((t) => t.includes('IPAD')) || TIPO_IPAD
}
console.log(`Tamaños: iPhone ${TIPO_IPHONE} · iPad ${TIPO_IPAD}\n`)

for (const id of lista) {
  const locale = IDIOMAS[id]
  const textos = ficha(id)
  process.stdout.write(`${id.padEnd(3)} (${locale.padEnd(6)}) `)

  const actuales = await api(`/appStoreVersions/${version.id}/appStoreVersionLocalizations`)
  const existente = actuales.data.find((l) => l.attributes.locale === locale)
  let locId
  if (existente) {
    locId = existente.id
    await api(`/appStoreVersionLocalizations/${locId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'appStoreVersionLocalizations', id: locId, attributes: textos },
      }),
    })
    process.stdout.write('texto actualizado')
  } else {
    const nueva = await api('/appStoreVersionLocalizations', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: { locale, ...textos },
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
        },
      }),
    })
    locId = nueva.data.id
    process.stdout.write('texto creado')
  }

  if (!soloTexto) {
    const iphone = [1, 2, 3, 4]
      .map((n) => join(raiz, `marketing/tienda/appstore/${id}/0${n}.png`))
      .filter(existsSync)
    const ipad = join(raiz, `marketing/tienda/ipad/${id}.png`)
    if (iphone.length) {
      await reponerSet(locId, TIPO_IPHONE, iphone)
      process.stdout.write(` · ${iphone.length} de iPhone`)
    }
    if (existsSync(ipad)) {
      await reponerSet(locId, TIPO_IPAD, [ipad])
      process.stdout.write(' · 1 de iPad')
    }
  }
  process.stdout.write('\n')
}

console.log('\nListo. Revisa la ficha en App Store Connect antes de enviar a revisión.')
