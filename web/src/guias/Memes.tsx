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
  // No son de un meme: el primer plano de las miniaturas de los videos (señalando la pregunta, con cara de sorpresa).
  pensando: { escena: 'pensando', cara: 'neutral' },
  miniatura: { escena: 'senala', cara: 'sorpresa' },
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
  // Cocina.
  limones: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  ultraprocesados: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  perfecta: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  tarde: { formato: 'arribaAbajo', poses: ['cansado', 'contento'], sonido: 'bruh' },
  // Descanso.
  cinco: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  capitulo: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'jeje-boy' },
  cafe: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'bruh' },
  siesta: { formato: 'unico', poses: ['relajado'], sonido: 'wow' },
  // Finanzas.
  garantizado: { formato: 'unico', poses: ['confundido'], sonido: 'bruh' },
  hormiga: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  quincena: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  minimo: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'jeje-boy' },
  // Idiomas.
  olvido: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'bruh' },
  lista: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  perfecto: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'jeje-boy' },
  // Arte.
  simbolos: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'bruh' },
  ojos: { formato: 'arribaAbajo', poses: ['confundido', 'orgulloso'], sonido: 'jeje-boy' },
  cien: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  // Metas (las poses son de la princesa, la narradora).
  enero: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  vaga: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  arruine: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  grande: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'jeje-boy' },
  // Mindfulness (también de la princesa).
  solo: { formato: 'arribaAbajo', poses: ['relajado', 'confundido'], sonido: 'bruh' },
  relajate: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  pestanas: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'jeje-boy' },
  super: { formato: 'unico', poses: ['confundido'], sonido: 'bruh' },
  // Aprender (de la princesa).
  releer: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'bruh' },
  subrayar: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  nocheAntes: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'jeje-boy' },
  porque: { formato: 'unico', poses: ['confundido'], sonido: 'bruh' },
  // Matemáticas (las poses son del alien, el narrador).
  cero: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  miedoMate: { formato: 'unico', poses: ['cansado'], sonido: 'bruh' },
  estimacion: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  formula: { formato: 'arribaAbajo', poses: ['relajado', 'confundido'], sonido: 'bruh' },
  // Agenda (también de la princesa).
  diezMinutos: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  urgente: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  multitarea: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  manana: { formato: 'arribaAbajo', poses: ['relajado', 'cansado'], sonido: 'bruh' },
  // Escritura (las poses son del mago, el narrador).
  nervios: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  hojaBlanca: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  sumerios: { formato: 'arribaAbajo', poses: ['orgulloso', 'relajado'], sonido: 'jeje-boy' },
  borrador: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  // Hobbies (las poses son del alien, el narrador).
  productivo: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  talento: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'jeje-boy' },
  equipo: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  racha: { formato: 'unico', poses: ['cansado'], sonido: 'bruh' },
  // Entretenimiento (las poses son del alien, el narrador).
  elegir: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  scroll: { formato: 'arribaAbajo', poses: ['relajado', 'confundido'], sonido: 'jeje-boy' },
  unoMas: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  spoiler: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  // Garage (las poses son de Pep@ con barba y overol de mecánico, el narrador).
  testigo: { formato: 'arribaAbajo', poses: ['relajado', 'confundido'], sonido: 'jeje-boy' },
  llanta: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  aceite: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  cadena: { formato: 'unico', poses: ['cansado'], sonido: 'bruh' },
  // Noticias (las poses son de Pep@ vestido de vaquero, el narrador).
  titular: { formato: 'arribaAbajo', poses: ['orgulloso', 'confundido'], sonido: 'bruh' },
  compartir: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  fuente: { formato: 'arribaAbajo', poses: ['confundido', 'relajado'], sonido: 'jeje-boy' },
  madrugada: { formato: 'unico', poses: ['cansado'], sonido: 'bruh' },
  // Ideas (las poses son del osito, el narrador).
  cienIdeas: { formato: 'drake', poses: ['rechaza', 'aprueba'], sonido: 'nice' },
  ducha: { formato: 'unico', poses: ['confundido'], sonido: 'wow' },
  reunion: { formato: 'arribaAbajo', poses: ['orgulloso', 'cansado'], sonido: 'bruh' },
  hoja: { formato: 'arribaAbajo', poses: ['relajado', 'orgulloso'], sonido: 'jeje-boy' },
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
