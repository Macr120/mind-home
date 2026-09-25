/**
 * Copia los blobs del sync del bucket `sync-blobs` de Supabase Storage a
 * Cloudflare R2 y los da de alta en `almacen_objetos` (migración 20260925000001).
 *
 *   Storage: <user>/<tabla>/<uid>/<campo>
 *   R2:      <user>/sync/<tabla>/<uid>/<campo>   (clave relativa `sync/…`)
 *
 * Es idempotente: lo que ya está en R2 con el mismo tamaño se salta (solo se
 * vuelve a registrar). No borra nada de Storage: el cliente lee de R2 y, si
 * falta, de Storage (`core/data/sync/blobs.ts`). Vaciar `sync-blobs` es un paso
 * aparte, cuando R2 lleve tiempo sirviendo sin fallos.
 *
 * Variables (PowerShell: $env:NOMBRE="…"), o con Node ≥20 desde un archivo que
 * NO se commitea:  node --env-file=.env.almacen scripts/almacen/migrar-sync-blobs.mjs
 *   SUPABASE_URL (o VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 *   node scripts/almacen/migrar-sync-blobs.mjs --simular   → solo cuenta, no copia
 *   node scripts/almacen/migrar-sync-blobs.mjs             → copia
 */
import { createHash, createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SIMULAR = process.argv.includes('--simular')
const env = (k) => process.env[k] ?? ''
const URL_SB = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
const faltan = ['SUPABASE_SERVICE_ROLE_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].filter((k) => !env(k))
if (!URL_SB || faltan.length) {
  console.error('Faltan variables:', [!URL_SB && 'SUPABASE_URL', ...faltan].filter(Boolean).join(', '))
  process.exit(1)
}
const BUCKET_R2 = env('R2_BUCKET') || 'mindhaos-archivos'
const HOST = `${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
const sb = createClient(URL_SB, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

// --- SigV4 mínimo para R2 (PUT/HEAD con carga sin firmar) --------------------
const hmac = (k, s) => createHmac('sha256', k).update(s).digest()
const sha = (s) => createHash('sha256').update(s).digest('hex')

function firmar(method, clave, extra = {}) {
  const ahora = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')
  const dia = ahora.slice(0, 8)
  const ruta = `/${BUCKET_R2}/${clave.split('/').map(encodeURIComponent).join('/')}`
  const cab = { host: HOST, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD', 'x-amz-date': ahora, ...extra }
  const nombres = Object.keys(cab).sort()
  // Cada cabecera canónica termina en \n: por eso queda una línea en blanco antes de las firmadas.
  const canonicas = nombres.map((k) => `${k}:${cab[k]}\n`).join('')
  const canon = [method, ruta, '', canonicas, nombres.join(';'), 'UNSIGNED-PAYLOAD'].join('\n')
  const alcance = `${dia}/auto/s3/aws4_request`
  const aFirmar = ['AWS4-HMAC-SHA256', ahora, alcance, sha(canon)].join('\n')
  let k = hmac(`AWS4${env('R2_SECRET_ACCESS_KEY')}`, dia)
  for (const p of ['auto', 's3', 'aws4_request']) k = hmac(k, p)
  const firma = createHmac('sha256', k).update(aFirmar).digest('hex')
  return {
    url: `https://${HOST}${ruta}`,
    headers: {
      ...cab,
      authorization: `AWS4-HMAC-SHA256 Credential=${env('R2_ACCESS_KEY_ID')}/${alcance}, SignedHeaders=${nombres.join(';')}, Signature=${firma}`,
    },
  }
}

/** Tamaño en R2 (null si no existe). GET del primer byte, como `_shared/r2.ts::tamanoDe`. */
async function tamanoEnR2(clave) {
  const { url, headers } = firmar('GET', clave, { range: 'bytes=0-0' })
  const r = await fetch(url, { headers })
  await r.body?.cancel()
  if (r.status === 404) return null
  if (r.status === 416) return 0
  if (!r.ok) throw new Error(`GET ${clave}: ${r.status}`)
  const total = /\/(\d+)$/.exec(r.headers.get('content-range') ?? '')?.[1]
  return Number(total ?? r.headers.get('content-length') ?? 0)
}

async function subirAR2(clave, blob, mime) {
  const { url, headers } = firmar('PUT', clave, { 'content-type': mime })
  const r = await fetch(url, { method: 'PUT', headers, body: Buffer.from(await blob.arrayBuffer()) })
  if (!r.ok) throw new Error(`PUT ${clave}: ${r.status} ${await r.text()}`)
}

// --- Recorrido de Storage ------------------------------------------------------
async function* objetos(prefijo) {
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb.storage.from('sync-blobs').list(prefijo, { limit: 1000, offset: desde })
    if (error) throw new Error(`list ${prefijo}: ${error.message}`)
    for (const e of data ?? []) {
      const ruta = prefijo ? `${prefijo}/${e.name}` : e.name
      if (e.id === null) yield* objetos(ruta)
      else yield { ruta, bytes: Number(e.metadata?.size ?? 0), mime: e.metadata?.mimetype || 'application/octet-stream' }
    }
    if ((data ?? []).length < 1000) return
  }
}

const porUsuario = new Map()
let copiados = 0
let saltados = 0
let fallos = 0

for await (const o of objetos('')) {
  const [usuario, ...resto] = o.ruta.split('/')
  const relativa = `sync/${resto.join('/')}`
  const t = porUsuario.get(usuario) ?? { n: 0, bytes: 0 }
  t.n++
  t.bytes += o.bytes
  porUsuario.set(usuario, t)
  if (SIMULAR) continue
  try {
    const clave = `${usuario}/${relativa}`
    if ((await tamanoEnR2(clave)) === o.bytes) {
      saltados++
    } else {
      const { data, error } = await sb.storage.from('sync-blobs').download(o.ruta)
      if (error || !data) throw new Error(`download ${o.ruta}: ${error?.message ?? 'vacío'}`)
      await subirAR2(clave, data, o.mime)
      copiados++
    }
    const { error } = await sb.rpc('almacen_registrar', { p_uid: usuario, p_clave: relativa, p_bytes: o.bytes, p_mime: o.mime })
    if (error) throw new Error(`registrar ${relativa}: ${error.message}`)
  } catch (e) {
    fallos++
    console.error('✗', o.ruta, e.message)
  }
}

const mb = (b) => (b / 1024 ** 2).toFixed(1)
for (const [u, t] of porUsuario) console.log(`${u}  ${t.n} objetos  ${mb(t.bytes)} MB`)
const total = [...porUsuario.values()].reduce((s, t) => s + t.bytes, 0)
console.log(`\n${porUsuario.size} usuarios · ${mb(total)} MB${SIMULAR ? ' (simulación: nada copiado)' : ` · copiados ${copiados} · ya estaban ${saltados} · fallos ${fallos}`}`)
if (fallos) process.exit(1)
