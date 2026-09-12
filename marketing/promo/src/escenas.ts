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

export type Toma =
  | { tipo: 'clip'; clip: string; seg: number; flash?: number }
  | { tipo: 'rafaga'; seg: number }
  | { tipo: 'escritorio'; seg: number }
  | { tipo: 'cierre'; seg: number }

/** Titular en pantalla: `desde`/`hasta` en segundos dentro de la escena. */
export type TitularDef = { clave: string; desde: number; hasta?: number }

export type EscenaDef = { id: string; tomas: Toma[]; lineas: string[]; titulares: TitularDef[] }

export const ESCENAS: EscenaDef[] = [
  {
    id: 'gancho',
    tomas: [{ tipo: 'clip', clip: '01-avatar', seg: 3.2, flash: 1.5 }],
    lineas: ['gancho'],
    titulares: [{ clave: 'gancho', desde: 0.25 }],
  },
  {
    id: 'casa',
    tomas: [
      { tipo: 'clip', clip: '02-casa-gira', seg: 2.4 },
      { tipo: 'clip', clip: '03-app-cocina', seg: 0.8 },
      { tipo: 'clip', clip: '03-app-ejercicio', seg: 1.0 },
      { tipo: 'clip', clip: '03-app-finanzas', seg: 0.8 },
      { tipo: 'clip', clip: '03-app-metas', seg: 0.8 },
      { tipo: 'clip', clip: '03-app-studio', seg: 1.4 },
    ],
    lineas: ['casa'],
    titulares: [{ clave: 'apps', desde: 2.4 }],
  },
  {
    id: 'disena',
    tomas: [
      { tipo: 'clip', clip: '04-mosaico', seg: 2.2 },
      { tipo: 'clip', clip: '04-editor', seg: 2.6 },
      { tipo: 'clip', clip: '04-temas', seg: 3.2 },
    ],
    lineas: ['disena'],
    titulares: [{ clave: 'disena', desde: 0.3, hasta: 4.6 }],
  },
  {
    id: 'metas',
    tomas: [
      { tipo: 'clip', clip: '05-calendario', seg: 2.0 },
      { tipo: 'clip', clip: '05-misiones', seg: 2.0 },
      { tipo: 'clip', clip: '05-cronograma', seg: 2.2 },
      { tipo: 'clip', clip: '06-avatar-asistente', seg: 2.0 },
    ],
    lineas: ['metas'],
    titulares: [{ clave: 'metas', desde: 0.3, hasta: 6.0 }],
  },
  {
    id: 'ia',
    tomas: [
      { tipo: 'clip', clip: '06-chat', seg: 3.0 },
      { tipo: 'clip', clip: '06-fotos', seg: 2.4 },
      { tipo: 'clip', clip: '06-ideas', seg: 2.4 },
    ],
    lineas: ['ia'],
    titulares: [{ clave: 'ia', desde: 0.3, hasta: 5.2 }],
  },
  {
    id: 'cerebro',
    tomas: [
      { tipo: 'clip', clip: '07-sisifo', seg: 3.2 },
      { tipo: 'clip', clip: '07-wrapped', seg: 2.6 },
      { tipo: 'clip', clip: '07-baile', seg: 3.8 },
    ],
    lineas: ['cerebro'],
    titulares: [{ clave: 'progreso', desde: 3.4, hasta: 8.6 }],
  },
  {
    id: 'idiomas',
    tomas: [
      { tipo: 'rafaga', seg: 2.7 },
      { tipo: 'escritorio', seg: 1.9 },
      { tipo: 'clip', clip: '07-panel-ia', seg: 2.6 },
    ],
    lineas: ['idiomas'],
    titulares: [
      { clave: 'idiomas', desde: 0.1, hasta: 2.6 },
      { clave: 'plataformas', desde: 2.8, hasta: 4.5 },
      { clave: 'conSinIa', desde: 4.7 },
    ],
  },
  {
    id: 'cta',
    tomas: [{ tipo: 'clip', clip: '09-atardecer', seg: 3.2 }],
    lineas: ['cta'],
    titulares: [],
  },
  {
    id: 'cierre',
    tomas: [{ tipo: 'cierre', seg: 6.5 }],
    lineas: ['eslogan'],
    titulares: [],
  },
  // El último plano repite el primero: en TikTok el video vuelve a empezar solo
  // y el corte no se nota.
  {
    id: 'loop',
    tomas: [{ tipo: 'clip', clip: '01-avatar', seg: 1.0 }],
    lineas: [],
    titulares: [],
  },
]

/** Silencios alrededor de la voz (segundos). */
const PAUSA_INICIO = 0.15
const PAUSA_ENTRE = 0.35
const PAUSA_FIN = 0.25

export type TomaPlan = Toma & { desde: number; frames: number }
export type TitularPlan = { texto: string; desde: number; hasta: number }
export type EscenaPlan = { id: string; desde: number; frames: number; tomas: TomaPlan[]; titulares: TitularPlan[] }
export type VozPlan = { clave: string; ruta: string; desde: number; frames: number }
export type Plan = {
  idioma: Idioma
  fps: number
  total: number
  escenas: EscenaPlan[]
  voces: VozPlan[]
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
  let cursor = 0
  for (const e of ESCENAS) {
    const visual = e.tomas.reduce((a, t) => a + t.seg, 0)
    const duraciones = e.lineas.map((l) => datos.voz[l]?.seg ?? 0).filter((s) => s > 0)
    const vozSeg = duraciones.length
      ? PAUSA_INICIO + duraciones.reduce((a, b) => a + b, 0) + PAUSA_ENTRE * (duraciones.length - 1) + PAUSA_FIN
      : 0
    const frames = seg2f(Math.max(visual, vozSeg))
    let t0 = 0
    const tomas: TomaPlan[] = e.tomas.map((t, i) => {
      const ultima = i === e.tomas.length - 1
      const f = ultima ? frames - t0 : seg2f(t.seg)
      const tp: TomaPlan = { ...t, desde: t0, frames: f }
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
    const titulares: TitularPlan[] = e.titulares.map((t) => ({
      texto: datos.guion.titulares[t.clave] ?? '',
      desde: seg2f(t.desde),
      hasta: t.hasta === undefined ? frames : Math.min(frames, seg2f(t.hasta)),
    }))
    escenas.push({ id: e.id, desde: cursor, frames, tomas, titulares })
    cursor += frames
  }
  return { idioma, fps: FPS, total: Math.max(cursor, FPS), escenas, voces, datos, musica: MANIFIESTO.musica }
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
