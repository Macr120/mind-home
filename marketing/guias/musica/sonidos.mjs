// Los ejemplos que suenan bajo la voz en las tomas de la casa de la guía de Música:
// el Himno de la alegría por capas, sintetizado por la propia página de la guía
// (renderizarHimno de web/src/guias/Musica.tsx, en el Chrome del grabador) → sonidos/<nombre>.mp3.
//
//   GUIAS_URL=http://localhost:53390 node marketing/guias/musica/sonidos.mjs
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { FFMPEG, RAIZ, conPagina, dormir, ejecutar, evaluar } from '../cdp.mjs'

const GUIAS = process.env.GUIAS_URL || 'http://localhost:5174'
const DIR = path.join(RAIZ, 'musica', 'sonidos')
mkdirSync(DIR, { recursive: true })

/** Pulso en que entra cada pista (sin pista = no suena) y cuántas vueltas da el Himno (17 s cada una). */
const CLIPS = {
  // «primero el golpe del ritmo, luego la melodía y al final los acordes»
  capas: { entradas: { bateria: 0, melodia: 8, acordes: 20, bajo: 20 }, vueltas: 2 },
  ritmo: { entradas: { bateria: 0 }, vueltas: 2 },
  melodia: { entradas: { melodia: 0 }, vueltas: 2 },
  manos: { entradas: { melodia: 0, acordes: 0, bajo: 0 }, vueltas: 2 },
  completo: { entradas: { bateria: 0, bajo: 0, acordes: 0, melodia: 0 }, vueltas: 3 },
}

await conPagina(DIR, async (c) => {
  await c.enviar('Page.navigate', { url: `${GUIAS}/guias/musica.html` })
  await dormir(4000)
  for (const [nombre, { entradas, vueltas }] of Object.entries(CLIPS)) {
    // El WAV sale por descarga (por CDP, varios MB de base64 tumban la sesión).
    const wav = path.join(DIR, `${nombre}.wav`)
    rmSync(wav, { force: true })
    await evaluar(
      c,
      `(async () => {
        const url = performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes('/src/guias/Musica.tsx')) ?? '/src/guias/Musica.tsx'
        const b64 = await (await import(url)).renderizarHimno(${JSON.stringify(entradas)}, ${vueltas})
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
        a.download = '${nombre}.wav'
        a.click()
      })()`,
      { timeout: 120000 },
    )
    for (let i = 0; i < 60 && !(existsSync(wav) && statSync(wav).size > 1000); i++) await dormir(500)
    await dormir(800)
    await ejecutar(FFMPEG, ['-y', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.5', '-b:a', '192k', path.join(DIR, `${nombre}.mp3`)])
    rmSync(wav)
    console.log('✓', nombre)
  }
})
