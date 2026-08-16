/**
 * YouTube Data API v3 — PARA EL FUTURO: el día D los Shorts se suben a mano en
 * YouTube Studio, porque (1) la cuota por defecto (10 000 u/día) solo alcanza
 * ~6 `videos.insert` (1600 u cada uno) y (2) una app OAuth sin verificar deja
 * los videos BLOQUEADOS EN PRIVADO hasta pasar el audit de Google. Cuando el
 * proyecto esté verificado y con cuota ampliada, este script automatiza todo.
 *
 *   node scripts/publicar/youtube.mjs autorizar
 *     Flujo OAuth de escritorio (loopback): imprime la URL, recibe el código y
 *     te da el GOOGLE_REFRESH_TOKEN para .env.marketing.
 *
 *   node scripts/publicar/youtube.mjs subir <slug> <idioma>
 *     Sube salida/<idioma>.mp4 con título/descripción de meta.<idioma>.json y
 *     su pista salida/<idioma>.srt.
 */
import http from 'node:http'
import { createReadStream, readFileSync } from 'node:fs'
import path from 'node:path'
import { youtube } from '@googleapis/youtube'
import { OAuth2Client } from 'google-auth-library'
import { RAIZ, requiere } from './entorno.mjs'

const [orden, slug, idioma] = process.argv.slice(2)
const REDIRECT = 'http://127.0.0.1:8089/callback'
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl'

if (orden === 'autorizar') {
  const clientId = requiere('GOOGLE_CLIENT_ID')
  const secreto = requiere('GOOGLE_CLIENT_SECRET')
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    })
  console.log(`Abre en el navegador (con la cuenta del canal):\n\n${url}\n`)
  http
    .createServer(async (req, res) => {
      const codigo = new URL(req.url, REDIRECT).searchParams.get('code')
      if (!codigo) return res.end()
      res.end('Listo, vuelve a la terminal.')
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          code: codigo,
          client_id: clientId,
          client_secret: secreto,
          redirect_uri: REDIRECT,
          grant_type: 'authorization_code',
        }),
      })
      const dato = await r.json()
      console.log(`\nAñade a .env.marketing:\nGOOGLE_REFRESH_TOKEN=${dato.refresh_token}`)
      process.exit(0)
    })
    .listen(8089)
} else if (orden === 'subir') {
  if (!slug || !idioma) {
    console.error('uso: youtube.mjs subir <slug> <idioma>')
    process.exit(1)
  }
  const DIR = path.join(RAIZ, 'marketing', 'video', slug)
  const meta = JSON.parse(readFileSync(path.join(DIR, `meta.${idioma}.json`), 'utf8'))
  const auth = new OAuth2Client(requiere('GOOGLE_CLIENT_ID'), requiere('GOOGLE_CLIENT_SECRET'), REDIRECT)
  auth.setCredentials({ refresh_token: requiere('GOOGLE_REFRESH_TOKEN') })
  const yt = youtube({ version: 'v3', auth })

  const video = await yt.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.porPlataforma?.youtube?.titulo || meta.titulo,
        description: meta.porPlataforma?.youtube?.descripcion || meta.descripcion,
        defaultLanguage: idioma,
        defaultAudioLanguage: idioma,
      },
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
    },
    media: { body: createReadStream(path.join(DIR, 'salida', `${idioma}.mp4`)) },
  })
  console.log(`✓ video ${video.data.id}`)

  await yt.captions.insert({
    part: ['snippet'],
    requestBody: { snippet: { videoId: video.data.id, language: idioma, name: '' } },
    media: { body: createReadStream(path.join(DIR, 'salida', `${idioma}.srt`)) },
  })
  console.log('✓ subtítulos')
} else {
  console.error('uso: youtube.mjs autorizar | subir <slug> <idioma>')
  process.exit(1)
}
