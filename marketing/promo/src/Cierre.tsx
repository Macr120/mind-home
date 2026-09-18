import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Guion } from './escenas'
import { esRTL, familiaDe } from './fuentes'

const DOMINIO = 'mindhaos.com'

/** Cierre: las piezas de la marca, el nombre, el eslogan en tres líneas y la llamada a probar. */
export const Cierre: React.FC<{ guion: Guion; idioma: string; frames: number }> = ({ guion, idioma, frames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const resorte = (desde: number, rigidez = 140) =>
    spring({ frame: frame - desde, fps, config: { damping: 15, stiffness: rigidez, mass: 0.7 } })
  const caida = resorte(0, 120)
  const nombre = resorte(8)
  const cta = resorte(78)
  const fundido = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
  // Al final se apaga para dar paso al plano que cierra el bucle.
  const apagado = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const rtl = esRTL(idioma)
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at 50% 30%, #6a7f16 0%, #52630e 35%, #232b06 100%)',
        alignItems: 'center',
        opacity: Math.min(fundido, apagado),
        fontFamily: familiaDe(idioma),
        direction: rtl ? 'rtl' : 'ltr',
      }}
    >
      <div style={{ marginTop: 250, transform: `translateY(${(1 - caida) * -220}px) scale(${0.7 + 0.3 * caida})`, opacity: caida }}>
        <Img src={staticFile('marca/piezas.svg')} style={{ width: 560, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.45))' }} />
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 58,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: -0.5,
          opacity: nombre,
          transform: `translateY(${(1 - nombre) * 24}px)`,
          direction: 'ltr',
        }}
      >
        MindHaOS
      </div>
      <div style={{ marginTop: 70, padding: '0 90px', textAlign: 'center', unicodeBidi: 'plaintext' }}>
        {guion.cierre.map((linea, i) => {
          const q = resorte(20 + i * 20)
          return (
            <div
              key={i}
              style={{
                fontSize: 44,
                lineHeight: 1.3,
                fontWeight: 700,
                color: ['#FFB319', '#FF505F', '#E4C6FF'][i % 3],
                marginBottom: 26,
                opacity: q,
                transform: `translateY(${(1 - q) * 34}px)`,
                textShadow: '0 3px 14px rgba(0,0,0,0.35)',
              }}
            >
              {linea}
            </div>
          )
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 330,
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          opacity: cta,
          transform: `scale(${0.8 + 0.2 * cta})`,
        }}
      >
        <div
          style={{
            background: '#FFB319',
            color: '#1d1600',
            fontSize: 46,
            fontWeight: 800,
            padding: '22px 64px',
            borderRadius: 999,
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
          }}
        >
          {guion.cta.gratis}
        </div>
        <div style={{ marginTop: 34, fontSize: 40, fontWeight: 600, color: 'rgba(255,255,255,0.92)', direction: 'ltr' }}>{DOMINIO}</div>
        <div style={{ marginTop: 12, fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.7)', direction: 'ltr' }}>
          {guion.cta.tiendas}
        </div>
      </div>
    </AbsoluteFill>
  )
}
