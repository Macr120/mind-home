import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { esRTL, familiaDe } from './fuentes'

/**
 * Titular corto sobre el clip, en el tercio superior (fuera de la zona que
 * TikTok tapa con su interfaz). Entra con un resorte y se va con un fundido
 * corto antes del corte. Debajo, las tres piezas de la marca.
 */
export const Titular: React.FC<{ texto: string; idioma: string; desde: number; hasta: number }> = ({
  texto,
  idioma,
  desde,
  hasta,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (!texto || frame < desde || frame >= hasta) return null
  const t = frame - desde
  const entrada = spring({ frame: t, fps, config: { damping: 14, stiffness: 160, mass: 0.6 } })
  const salida = interpolate(frame, [hasta - 6, hasta], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacidad = Math.min(entrada, salida)
  const escala = 0.88 + 0.12 * entrada
  // Tamaño según lo largo que sea: los idiomas que se alargan bajan de cuerpo solos.
  const tam = Math.max(54, Math.min(96, Math.round((96 * 19) / Math.max(texto.length, 14))))
  return (
    <AbsoluteFill style={{ alignItems: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 640,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)',
          opacity: opacidad,
        }}
      />
      <div
        style={{
          marginTop: 190,
          maxWidth: 920,
          padding: '0 60px',
          textAlign: 'center',
          opacity: opacidad,
          transform: `scale(${escala})`,
          direction: esRTL(idioma) ? 'rtl' : 'ltr',
          unicodeBidi: 'plaintext',
        }}
      >
        <div
          style={{
            fontFamily: familiaDe(idioma),
            fontWeight: 800,
            fontSize: tam,
            lineHeight: 1.1,
            color: '#ffffff',
            textShadow: '0 4px 26px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.65)',
            letterSpacing: esRTL(idioma) ? 0 : -1,
          }}
        >
          {texto}
        </div>
        <Img src={staticFile('marca/piezas.svg')} style={{ width: 150, marginTop: 24 }} />
      </div>
    </AbsoluteFill>
  )
}
