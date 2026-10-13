// Renderiza la música de fondo de las guías con el motor del Studio de audio de
// la app (la misma ruta que «Exportar WAV»: `desplegar` → `renderizarBuffer`):
//   marketing/guias/musica/<id>.mp3   (y musica.json con sus créditos)
//
//   APP_URL=http://localhost:53378 node marketing/guias/musica/componer.mjs [paso-firme …]
//
// Las recetas viven en recetas.mjs. Se nivelan a la misma sonoridad para que
// VOLUMEN_MUSICA de montar.mjs valga igual para todas.
import { execFileSync } from 'node:child_process'
import { readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FFMPEG, conPagina, esperarDescarga, evaluar } from '../cdp.mjs'
import { abrirDemo } from '../demo.mjs'
import { RECETAS } from './recetas.mjs'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const pedidas = process.argv.slice(2)
const ids = pedidas.length ? pedidas : Object.keys(RECETAS)
/** Sonoridad de las pistas (LUFS integrados): la de las canciones que reemplazan (−7 a −9), con la que está ajustada la mezcla. */
const LUFS = -9

await conPagina(DIR, async (c) => {
  // La app de pruebas (en la demo, que se recarga sola al arrancar: se espera a que quede estable).
  await abrirDemo(c, 'es')
  for (const id of ids) {
    const receta = RECETAS[id]
    if (!receta) throw new Error(`no hay receta «${id}»`)
    const previo = new Set(readdirSync(DIR))
    const r = await evaluar(
      c,
      `(async () => {
        const ci = await import('/src/rooms/audio/cancionIA.ts')
        const ex = await import('/src/rooms/audio/exportarWav.ts')
        const plan = ci.validarPlan(${JSON.stringify(receta)}, false, { maxCompases: 128 })
        const { compases, pistas } = ci.desplegar(plan, false, 'mujer', { maxNotas: 4000, repetirMelodias: true })
        const buf = await ex.renderizarBuffer({ nombre: ${JSON.stringify(receta.titulo)}, bpm: plan.bpm, compases, swing: plan.swing, pistas, creadoEn: '', actualizadoEn: '' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(ex.wavDesdeBuffer(buf))
        a.download = ${JSON.stringify(id)} + '.wav'
        document.body.appendChild(a)
        a.click()
        return { segundos: buf.duration, compases, pistas: pistas.map((x) => x.instrumento + ':' + x.notas.length).join(' ') }
      })()`,
      { timeout: 300000 },
    )
    const wav = await esperarDescarga(DIR, id, previo)
    const mp3 = path.join(DIR, `${id}.mp3`)
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', wav, '-af', `loudnorm=I=${LUFS}:TP=-1.5:LRA=11`, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', mp3])
    unlinkSync(wav)
    console.log(`✓ ${id}.mp3 · ${Math.floor(r.segundos / 60)}:${String(Math.round(r.segundos % 60)).padStart(2, '0')} · ${r.compases} compases · ${r.pistas}`)
  }
})

// Los créditos que pide cada canción (paquetes.mjs los pone tal cual en la descripción).
const musica = {
  _nota: 'Música de fondo de las guías: composiciones propias hechas con el Studio de audio de MindHaOS (recetas.mjs → componer.mjs). Sin licencias de terceros. montar.mjs las alterna bajo la voz.',
  canciones: Object.entries(RECETAS).map(([id, r]) => ({
    archivo: `${id}.mp3`,
    titulo: r.titulo,
    credito: [`«${r.titulo}» · Música original de MindHaOS, hecha en su Studio de audio`],
  })),
}
writeFileSync(path.join(DIR, 'musica.json'), JSON.stringify(musica, null, 2) + '\n')
console.log('✓ musica.json')
