import { AbsoluteFill, Sequence } from 'remotion'
import type { DatosIdioma, EscenaPlan } from './escenas'
import { Toma } from './Toma'

export const Escena: React.FC<{ escena: EscenaPlan; datos: DatosIdioma; idioma: string }> = ({ escena, datos, idioma }) => (
  <AbsoluteFill>
    {escena.tomas.map((t, i) => (
      <Sequence key={i} from={t.desde} durationInFrames={t.frames} name={t.tipo === 'clip' ? t.clip : t.tipo}>
        <Toma toma={t} datos={datos} idioma={idioma} />
      </Sequence>
    ))}
  </AbsoluteFill>
)
