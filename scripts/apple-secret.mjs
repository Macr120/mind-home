/**
 * Genera el «client secret» de Sign in with Apple: un JWT firmado con la clave
 * .p8 del equipo. Es lo que se pega en Supabase → Auth → Providers → Apple.
 *
 * CADUCA A LOS 6 MESES (tope de Apple), así que hay que volver a correrlo y
 * repegar el token. Anota la fecha del recordatorio que imprime al final.
 *
 *   node scripts/apple-secret.mjs ruta/al/AuthKey_XXXX.p8
 */
import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const TEAM_ID = '9FA4Z58JF3'
const SERVICES_ID = 'com.macr120.mindhome.web'
const SEIS_MESES = 15777000 // segundos; el máximo que acepta Apple

const ruta = process.argv[2]
if (!ruta) {
  console.error('Falta la ruta del .p8:  node scripts/apple-secret.mjs ruta/al/AuthKey_XXXX.p8')
  process.exit(1)
}

// El Key ID viaja en el nombre del archivo que descarga Apple (AuthKey_XXXX.p8).
const kid = basename(ruta).replace(/^AuthKey_/, '').replace(/\.p8$/, '')
const clave = readFileSync(ruta, 'utf8')

const base64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url')

const ahora = Math.floor(Date.now() / 1000)
const cabecera = base64url({ alg: 'ES256', kid })
const cuerpo = base64url({
  iss: TEAM_ID,
  iat: ahora,
  exp: ahora + SEIS_MESES,
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
})

// ES256 exige la firma en crudo (R||S), no en DER: sin ieee-p1363 Apple la rechaza.
const firma = createSign('SHA256')
firma.update(`${cabecera}.${cuerpo}`)
const sig = firma.sign({ key: clave, dsaEncoding: 'ieee-p1363' }).toString('base64url')

console.log(`\nKey ID: ${kid}`)
console.log(`Caduca: ${new Date((ahora + SEIS_MESES) * 1000).toLocaleDateString()}\n`)
console.log(`${cabecera}.${cuerpo}.${sig}\n`)
