import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { DatosIdioma, TomaPlan } from './escenas'
import { Cierre } from './Cierre'

const FONDO = '#0f1115'

/** Acercamiento lento y continuo (Ken Burns) para que ningún plano esté quieto. */
const kenBurns = (frame: number, frames: number) => 1 + 0.06 * Math.min(1, frame / Math.max(frames, 1))

/** Golpe de escala en el corte: el plano entra un 10 % más grande y se asienta. */
function usePunch() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return 1.1 - 0.1 * spring({ frame, fps, config: { damping: 18, stiffness: 220, mass: 0.5 } })
}

/** Destello con el color de la marca (el gancho). */
const Flash: React.FC<{ en: number }> = ({ en }) => {
  const frame = useCurrentFrame()
  if (frame < en) return null
  const o = interpolate(frame, [en, en + 7], [0.8, 0], { extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ backgroundColor: '#FFB319', opacity: o }} />
}

/** Cuando falta un clip (aún no grabado) se ve su nombre en vez de un negro mudo. */
const Relleno: React.FC<{ nombre: string }> = ({ nombre }) => (
  <AbsoluteFill
    style={{
      backgroundColor: '#1b1f2a',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#7c86a2',
      fontFamily: 'sans-serif',
      fontSize: 44,
    }}
  >
    falta el clip {nombre}
  </AbsoluteFill>
)

const Video: React.FC<{ ruta: string; seg: number; frames: number }> = ({ ruta, seg, frames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const punch = usePunch()
  const escala = kenBurns(frame, frames) * punch
  // Si el clip es más corto que su hueco (una voz larga), se ralentiza en vez de
  // quedarse en negro.
  const rate = Math.min(1, Math.max(0.5, seg / (frames / fps)))
  return (
    <AbsoluteFill style={{ backgroundColor: FONDO }}>
      <AbsoluteFill style={{ transform: `scale(${escala})` }}>
        <OffthreadVideo
          src={staticFile(ruta)}
          playbackRate={rate}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const Escritorio: React.FC<{ ruta: string; frames: number }> = ({ ruta, frames }) => {
  const frame = useCurrentFrame()
  const punch = usePunch()
  const escala = kenBurns(frame, frames) * punch
  return (
    <AbsoluteFill style={{ backgroundColor: '#161a22', justifyContent: 'center', alignItems: 'center' }}>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(192,125,254,0.35), rgba(15,17,21,0) 60%)',
        }}
      />
      <div style={{ transform: `scale(${escala * 0.94})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 1000,
            padding: 16,
            borderRadius: 28,
            background: '#0b0d12',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          <Img src={staticFile(ruta)} style={{ width: '100%', display: 'block', borderRadius: 14 }} />
        </div>
        <div style={{ width: 300, height: 26, marginTop: -2, background: '#0b0d12', borderRadius: '0 0 14px 14px' }} />
      </div>
    </AbsoluteFill>
  )
}

const Rafaga: React.FC<{ rutas: string[]; frames: number }> = ({ rutas, frames }) => {
  if (!rutas.length) return <Relleno nombre="05-calendario (otros idiomas)" />
  const sub = Math.max(1, Math.floor(frames / rutas.length))
  return (
    <AbsoluteFill style={{ backgroundColor: FONDO }}>
      {rutas.map((r, i) => (
        <Sequence key={r + i} from={i * sub} durationInFrames={i === rutas.length - 1 ? frames - i * sub : sub}>
          <AbsoluteFill>
            <OffthreadVideo src={staticFile(r)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

export const Toma: React.FC<{ toma: TomaPlan; datos: DatosIdioma; idioma: string }> = ({ toma, datos, idioma }) => {
  const { fps } = useVideoConfig()
  if (toma.tipo === 'clip') {
    const m = datos.clips[toma.clip]
    if (!m) return <Relleno nombre={toma.clip} />
    return (
      <>
        <Video ruta={m.ruta} seg={m.seg} frames={toma.frames} />
        {toma.flash !== undefined ? <Flash en={Math.round(toma.flash * fps)} /> : null}
      </>
    )
  }
  if (toma.tipo === 'rafaga') return <Rafaga rutas={datos.rafaga} frames={toma.frames} />
  if (toma.tipo === 'escritorio') return <Escritorio ruta={datos.escritorio} frames={toma.frames} />
  return <Cierre guion={datos.guion} idioma={idioma} frames={toma.frames} />
}
