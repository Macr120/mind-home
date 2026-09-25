import type { ClipAvatar, ClipMusica, ClipSfx, ClipVoz, MedioVideo } from '../../core/data/db'
import { urlSonido } from './sonidos'

/**
 * Pool de fuentes de reproducción por medio: `<video>`/`<audio>` fuera del DOM
 * e `ImageBitmap` para las imágenes, con sus object URLs. Nace y muere con el
 * editor (o con un export): `dispose()` pausa todo y revoca TODAS las URLs —
 * patrón `VistaBlob` para sobrevivir al doble montaje de StrictMode.
 *
 * Los clips de audio (voz, música, sonidos, avatar) llevan un `<audio>` por
 * CLIP, no por medio: dos clips del mismo medio pueden solapar (sfx) o ser
 * contiguos tras dividir (cada mitad pre-seekada a su `desde`). Son perezosos
 * (el motor los pide al acercarse) y no crean URL propia: los de fábrica
 * apuntan a `public/sonidos/` y los importados reutilizan la object URL del
 * medio (varios elementos con la misma URL es válido; se revoca una sola vez).
 * Los `<video>` sí van por medio: los decodificadores son el recurso escaso.
 */

interface FuenteVideo {
  tipo: 'video'
  el: HTMLVideoElement
  url: string
}
interface FuenteAudio {
  tipo: 'audio'
  el: HTMLAudioElement
  url: string
}
interface FuenteImagen {
  tipo: 'imagen'
  bitmap: ImageBitmap
}
type Fuente = FuenteVideo | FuenteAudio | FuenteImagen
export type ClipAudio = ClipVoz | ClipMusica | ClipSfx | ClipAvatar

export interface PoolFuentes {
  de(medioId: number): Fuente | null
  /** `<audio>` propio de UN clip (perezoso, cacheado por `clip.id`); null si su medio no está. */
  audioDe(clip: ClipAudio): HTMLAudioElement | null
  /** Solo si ya existe: para pausar sin instanciar. */
  audioCargado(id: string): HTMLAudioElement | null
  /** Suelta los `<audio>` de los clips que ya no están en el proyecto. */
  podar(vivos: Set<string>): void
  /** Resuelve cuando todo lo creado tiene metadatos/bitmap, o vence el plazo (el export no puede arrancar a ciegas). */
  esperar(plazoMs?: number): Promise<void>
  dispose(): void
}

function firmaDe(c: ClipAudio): string {
  if (c.pista === 'sfx') return c.fuente.tipo === 'fabrica' ? `f:${c.fuente.clave}` : `m:${c.fuente.medioId}`
  return `m:${c.medioId ?? '-'}`
}

export function crearPool(medios: MedioVideo[]): PoolFuentes {
  const fuentes = new Map<number, Fuente>()
  const pendientes: Promise<void>[] = []
  for (const medio of medios) {
    // Sin blob = aún en la nube (el Editor lo está bajando): el clip sale como
    // ausente hasta que llega y el pool se rehace (`firmaMedios` cuenta el blob).
    const blob = medio.blob
    if (medio.id == null || !blob) continue
    if (medio.tipo === 'video') {
      const url = URL.createObjectURL(blob)
      const el = document.createElement('video')
      el.preload = 'auto'
      el.muted = false
      ;(el as HTMLVideoElement & { playsInline: boolean }).playsInline = true
      el.src = url
      fuentes.set(medio.id, { tipo: 'video', el, url })
    } else if (medio.tipo === 'audio') {
      const url = URL.createObjectURL(blob)
      const el = document.createElement('audio')
      el.preload = 'auto'
      el.src = url
      fuentes.set(medio.id, { tipo: 'audio', el, url })
    } else {
      const id = medio.id
      pendientes.push(
        createImageBitmap(blob)
          .then((bitmap) => {
            fuentes.set(id, { tipo: 'imagen', bitmap })
          })
          .catch(() => {}),
      )
    }
  }
  void Promise.all(pendientes)
  const audios = new Map<string, { el: HTMLAudioElement; firma: string }>()
  let muerto = false
  return {
    de: (medioId) => (muerto ? null : (fuentes.get(medioId) ?? null)),
    audioDe(c) {
      if (muerto) return null
      const firma = firmaDe(c)
      const previo = audios.get(c.id)
      if (previo && previo.firma === firma) return previo.el
      let src: string | null = null
      if (c.pista === 'sfx' && c.fuente.tipo === 'fabrica') src = urlSonido(c.fuente.clave)
      else {
        const medioId = c.pista === 'sfx' ? (c.fuente.tipo === 'medio' ? c.fuente.medioId : undefined) : c.medioId
        const f = medioId != null ? fuentes.get(medioId) : undefined
        if (f && f.tipo !== 'imagen') src = f.url
      }
      if (!src) return null
      if (previo) {
        previo.el.pause()
        previo.el.src = ''
      }
      const el = document.createElement('audio')
      el.preload = 'auto'
      el.src = src
      audios.set(c.id, { el, firma })
      return el
    },
    audioCargado: (id) => (muerto ? null : (audios.get(id)?.el ?? null)),
    podar(vivos) {
      for (const [id, a] of audios) {
        if (vivos.has(id)) continue
        a.el.pause()
        a.el.src = ''
        audios.delete(id)
      }
    },
    esperar(plazoMs = 4000) {
      const esperas: Promise<unknown>[] = [...pendientes]
      const elementos: HTMLMediaElement[] = []
      for (const f of fuentes.values()) if (f.tipo !== 'imagen') elementos.push(f.el)
      for (const a of audios.values()) elementos.push(a.el)
      for (const el of elementos) {
        if (el.readyState >= 1) continue
        esperas.push(
          new Promise<void>((resolver) => {
            el.addEventListener('loadedmetadata', () => resolver(), { once: true })
            el.addEventListener('error', () => resolver(), { once: true })
          }),
        )
      }
      const plazo = new Promise<void>((resolver) => window.setTimeout(resolver, plazoMs))
      return Promise.race([Promise.all(esperas).then(() => undefined), plazo])
    },
    dispose() {
      if (muerto) return
      muerto = true
      for (const a of audios.values()) {
        a.el.pause()
        a.el.src = ''
      }
      audios.clear()
      for (const f of fuentes.values()) {
        if (f.tipo === 'imagen') f.bitmap.close()
        else {
          f.el.pause()
          f.el.src = ''
          URL.revokeObjectURL(f.url)
        }
      }
      fuentes.clear()
    },
  }
}
