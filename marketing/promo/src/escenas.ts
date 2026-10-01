import manifiesto from './generado/manifiesto.json'

/**
 * El anuncio, escena por escena. Cada escena es una lista de TOMAS (clips de la
 * app grabados por `grabar/`, la ráfaga de idiomas, la captura de escritorio o
 * el cierre) y las LÍNEAS de voz que suenan mientras dura.
 *
 * La duración de una escena es la mayor entre lo visual (suma de `seg` de sus
 * tomas) y lo que tarda la voz en ese idioma; el sobrante lo absorbe la última
 * toma. Así el mismo montaje sirve para los 16 idiomas sin recortar nada.
 */
export const FPS = 30
export const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar'] as const
export type Idioma = (typeof IDIOMAS)[number]

export type Guion = {
  lineas: Record<string, string>
  titulares: Record<string, string>
  cierre: string[]
  cta: { gratis: string; tiendas: string }
}
export type Medio = { ruta: string; seg: number }
export type DatosIdioma = {
  guion: Guion
  voz: Record<string, Medio>
  clips: Record<string, Medio>
  rafaga: string[]
  escritorio: string
}
export type Manifiesto = { fps: number; musica: string | null; idiomas: Record<string, DatosIdioma> }
export const MANIFIESTO = manifiesto as unknown as Manifiesto

/** Los efectos de la carpeta de fábrica del Studio de video (`public/sonidos/`) y sus segundos. */
export const SONIDOS = { aaa: 5.3, click: 0.4, faa: 1.8, golpe: 3.1, 'jeje-boy': 1.9, wow: 1.9, nice: 3.1 } as const
export type Sonido = keyof typeof SONIDOS

/** `sfx`: efecto que suena con el corte de la toma (en la ráfaga, en cada idioma). */
export type Toma =
  | { tipo: 'clip'; clip: string; seg: number; flash?: number; sfx?: Sonido }
  | { tipo: 'rafaga'; seg: number; sfx?: Sonido }
  | { tipo: 'escritorio'; seg: number; sfx?: Sonido }
  | { tipo: 'cierre'; seg: number; sfx?: Sonido }

/** `tras`: efecto que va DESPUÉS de la última línea de voz de la escena, nunca encima. */
export type EscenaDef = { id: string; tomas: Toma[]; lineas: string[]; tras?: Sonido }

export const ESCENAS: EscenaDef[] = [
  {
    id: 'gancho',
    tomas: [{ tipo: 'clip', clip: '01-avatar', seg: 3.0, flash: 1.5 }],
    lineas: ['gancho'],
    tras: 'faa',
  },
  {
    id: 'casa',
    tomas: [
      { tipo: 'clip', clip: '02-casa-gira', seg: 2.4, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-cocina', seg: 0.8, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-ejercicio', seg: 1.0, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-finanzas', seg: 0.8, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-metas', seg: 0.8, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-studio', seg: 1.4, sfx: 'click' },
    ],
    lineas: ['casa'],
  },
  {
    id: 'disena',
    tomas: [
      { tipo: 'clip', clip: '04-mosaico', seg: 2.0, sfx: 'click' },
      { tipo: 'clip', clip: '04-editor', seg: 2.2, sfx: 'click' },
      { tipo: 'clip', clip: '04-temas', seg: 3.0, sfx: 'wow' },
    ],
    lineas: ['disena'],
  },
  {
    id: 'metas',
    tomas: [
      { tipo: 'clip', clip: '05-calendario', seg: 1.7, sfx: 'click' },
      { tipo: 'clip', clip: '05-misiones', seg: 1.7, sfx: 'click' },
      { tipo: 'clip', clip: '05-cronograma', seg: 1.8, sfx: 'click' },
      { tipo: 'clip', clip: '06-avatar-asistente', seg: 1.7, sfx: 'click' },
    ],
    lineas: ['metas'],
  },
  {
    id: 'ia',
    tomas: [
      { tipo: 'clip', clip: '06-chat', seg: 2.0, sfx: 'click' },
      { tipo: 'clip', clip: '06-fotos', seg: 1.5, sfx: 'click' },
      { tipo: 'clip', clip: '06-diagrama', seg: 2.0, sfx: 'click' },
      { tipo: 'clip', clip: '06-formulas', seg: 1.8, sfx: 'click' },
      { tipo: 'clip', clip: '06-grafica', seg: 2.0, sfx: 'click' },
    ],
    lineas: ['ia'],
  },
  {
    id: 'cerebro',
    tomas: [
      { tipo: 'clip', clip: '07-sisifo', seg: 3.2, sfx: 'click' },
      { tipo: 'clip', clip: '07-wrapped', seg: 2.6, sfx: 'nice' },
      { tipo: 'clip', clip: '07-baile', seg: 3.8, sfx: 'click' },
    ],
    lineas: ['cerebro'],
    // El grito «AAA» cuando acaba el argumento, sobre el baile.
    tras: 'aaa',
  },
  {
    id: 'idiomas',
    tomas: [
      { tipo: 'rafaga', seg: 2.7, sfx: 'click' },
      { tipo: 'escritorio', seg: 1.9, sfx: 'click' },
      { tipo: 'clip', clip: '07-panel-ia', seg: 2.6, sfx: 'click' },
    ],
    lineas: ['idiomas'],
  },
  {
    id: 'cta',
    tomas: [{ tipo: 'clip', clip: '09-atardecer', seg: 3.2, sfx: 'click' }],
    lineas: ['cta'],
  },
  {
    id: 'cierre',
    tomas: [{ tipo: 'clip', clip: '10-zoom-out', seg: 6.5, sfx: 'golpe' }],
    lineas: ['eslogan'],
    // Remate del anuncio cuando calla el eslogan.
    tras: 'jeje-boy',
  },
  // El último plano repite el primero: en TikTok el video vuelve a empezar solo
  // y el corte no se nota.
  {
    id: 'loop',
    tomas: [{ tipo: 'clip', clip: '01-avatar', seg: 0.8 }],
    lineas: [],
  },
]

/** Silencios alrededor de la voz (segundos). */
const PAUSA_INICIO = 0.1
const PAUSA_ENTRE = 0.25
const PAUSA_FIN = 0.15
/** El efecto `tras`: hueco desde que calla la voz y espacio máximo que la escena le reserva. */
const HUECO_TRAS = 0.1
const TOPE_TRAS = 2.2
const VOLUMEN_SFX = 0.6

export type TomaPlan = Toma & { desde: number; frames: number }
export type EscenaPlan = { id: string; desde: number; frames: number; tomas: TomaPlan[] }
export type VozPlan = { clave: string; ruta: string; desde: number; frames: number }
export type EfectoPlan = { ruta: string; desde: number; frames: number; volumen: number }
export type Plan = {
  idioma: Idioma
  fps: number
  total: number
  escenas: EscenaPlan[]
  voces: VozPlan[]
  efectos: EfectoPlan[]
  datos: DatosIdioma
  musica: string | null
}

const seg2f = (s: number) => Math.round(s * FPS)

export function datosDe(idioma: Idioma): DatosIdioma {
  return MANIFIESTO.idiomas[idioma] ?? MANIFIESTO.idiomas.es
}

/** Línea de tiempo completa (en frames) del anuncio en un idioma. */
export function planificar(idioma: Idioma): Plan {
  const datos = datosDe(idioma)
  const escenas: EscenaPlan[] = []
  const voces: VozPlan[] = []
  const efectos: EfectoPlan[] = []
  const efecto = (clave: Sonido, desde: number, frames = seg2f(SONIDOS[clave])) =>
    efectos.push({ ruta: `sonidos/${clave}.mp3`, desde, frames, volumen: VOLUMEN_SFX })
  let cursor = 0
  for (const e of ESCENAS) {
    const visual = e.tomas.reduce((a, t) => a + t.seg, 0)
    const duraciones = e.lineas.map((l) => datos.voz[l]?.seg ?? 0).filter((s) => s > 0)
    const vozSeg = duraciones.length
      ? PAUSA_INICIO + duraciones.reduce((a, b) => a + b, 0) + PAUSA_ENTRE * (duraciones.length - 1) + (e.tras ? HUECO_TRAS + Math.min(SONIDOS[e.tras], TOPE_TRAS) : PAUSA_FIN)
      : 0
    const frames = seg2f(Math.max(visual, vozSeg))
    let t0 = 0
    const tomas: TomaPlan[] = e.tomas.map((t, i) => {
      const ultima = i === e.tomas.length - 1
      const f = ultima ? frames - t0 : seg2f(t.seg)
      const tp: TomaPlan = { ...t, desde: t0, frames: f }
      if (t.sfx) {
        // La ráfaga corta una vez por idioma: un clic en cada corte.
        const cortes = t.tipo === 'rafaga' ? Math.max(1, datos.rafaga.length) : 1
        const sub = Math.max(1, Math.floor(f / cortes))
        for (let k = 0; k < cortes; k++) efecto(t.sfx, cursor + t0 + k * sub)
      }
      t0 += f
      return tp
    })
    let v0 = cursor + seg2f(PAUSA_INICIO)
    for (const l of e.lineas) {
      const m = datos.voz[l]
      if (!m || m.seg <= 0) continue
      const f = seg2f(m.seg)
      voces.push({ clave: l, ruta: m.ruta, desde: v0, frames: f })
      v0 += f + seg2f(PAUSA_ENTRE)
    }
    if (e.tras && voces.length) {
      // Nunca encima de otro efecto que ya suena (el «nice» del resumen): espera a
      // que acabe. Se corta si entra la siguiente línea (la de la escena que sigue).
      const trasVoz = v0 - seg2f(PAUSA_ENTRE) + seg2f(HUECO_TRAS)
      const desde = efectos.filter((x) => x.desde <= trasVoz).reduce((a, x) => Math.max(a, x.desde + x.frames), trasVoz)
      efecto(e.tras, desde, Math.min(seg2f(SONIDOS[e.tras]), cursor + frames + seg2f(PAUSA_INICIO) - desde))
    }
    escenas.push({ id: e.id, desde: cursor, frames, tomas })
    cursor += frames
  }
  return { idioma, fps: FPS, total: Math.max(cursor, FPS), escenas, voces, efectos, datos, musica: MANIFIESTO.musica }
}

/** Volumen de la música en un frame: baja mientras habla la voz y se apaga al final. */
export function volumenMusica(frame: number, plan: Plan): number {
  const ALTO = 0.45
  const BAJO = 0.14
  const RAMPA = 8
  let v = ALTO
  for (const voz of plan.voces) {
    const a = voz.desde
    const b = voz.desde + voz.frames
    if (frame < a - RAMPA || frame > b + RAMPA) continue
    let q: number
    if (frame < a) q = (a - frame) / RAMPA
    else if (frame <= b) q = 0
    else q = (frame - b) / RAMPA
    v = Math.min(v, BAJO + (ALTO - BAJO) * q)
  }
  const fin = plan.total - 30
  if (frame > fin) v *= Math.max(0, (plan.total - frame) / 30)
  return v
}
