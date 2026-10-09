import type { ExpresionId } from '../../../src/core/house/apariencia'
import type { T } from './datos'

/**
 * Memes con Pep@: formatos conocidos rehechos con el personaje (sin fotos de
 * terceros). Las imágenes de Pep@ son capturas de `?pose=<id>` (fondo
 * transparente, `marketing/guias/memes.mjs`) en `/guias/<tema>/memes/<id>.png`;
 * los textos van en `<tema>.memes.<id>` del diccionario de la guía.
 */
export const POSES: Record<string, { escena: string; cara: ExpresionId }> = {
  rechaza: { escena: 'rechaza', cara: 'serio' },
  aprueba: { escena: 'senala', cara: 'feliz' },
  orgulloso: { escena: 'orgulloso', cara: 'guino' },
  confundido: { escena: 'confundido', cara: 'sorpresa' },
  relajado: { escena: 'relajado', cara: 'feliz' },
  cansado: { escena: 'cansado', cara: 'triste' },
  contento: { escena: 'saluda', cara: 'feliz' },
  // No es de un meme: el primer plano de las miniaturas de los videos.
  pensando: { escena: 'pensando', cara: 'neutral' },
}

type Formato = 'drake' | 'arribaAbajo' | 'unico'
interface DefMeme {
  formato: Formato
  poses: string[]
  /** Efecto de sonido al aparecer (`/guias/sonidos/<id>.mp3`). */
  sonido: string
}

export const MEMES: Record<string, DefMeme> = {
  // «Drake»: lo que no / lo que sí.
  constancia: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  // «Ellos: … / Yo: …».
  griegos: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  silla: { formato: 'arribaAbajo', poses: ['cansado', 'contento'], sonido: 'bruh' },
  // Texto arriba, una imagen.
  descarga: { formato: 'unico', poses: ['relajado'], sonido: 'wow' },
}

export function Meme({ id, tema, t }: { id: string; tema: string; t: T }) {
  const m = MEMES[id]
  if (!m) return null
  const img = (pose: string) => <img src={`/guias/${tema}/memes/${pose}.png`} alt="" loading="lazy" />
  const texto = (c: 'arriba' | 'abajo') => t(`${tema}.memes.${id}.${c}`)
  if (m.formato === 'unico') {
    return (
      <figure className="g-meme g-meme-unico">
        <figcaption>{texto('arriba')}</figcaption>
        <div className="g-meme-img">{img(m.poses[0])}</div>
      </figure>
    )
  }
  return (
    <figure className={`g-meme g-meme-${m.formato}`}>
      {(['arriba', 'abajo'] as const).map((c, i) => (
        <div key={c} className="g-meme-panel">
          <div className="g-meme-img">{img(m.poses[i])}</div>
          <p>{texto(c)}</p>
        </div>
      ))}
    </figure>
  )
}
