import { useMemo } from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { Escena } from './Escena'
import { planificar, volumenMusica, type Idioma } from './escenas'
import { cargarFuentes } from './fuentes'

export type PropsPromo = { idioma: Idioma }

export const Promo: React.FC<PropsPromo> = ({ idioma }) => {
  cargarFuentes(idioma)
  const plan = useMemo(() => planificar(idioma), [idioma])
  return (
    <AbsoluteFill style={{ backgroundColor: '#0f1115' }}>
      {plan.escenas.map((e) => (
        <Sequence key={e.id} from={e.desde} durationInFrames={e.frames} name={e.id}>
          <Escena escena={e} datos={plan.datos} idioma={idioma} />
        </Sequence>
      ))}
      {plan.voces.map((v) => (
        <Sequence key={v.clave} from={v.desde} durationInFrames={v.frames} name={'voz ' + v.clave}>
          <Audio src={staticFile(v.ruta)} />
        </Sequence>
      ))}
      {plan.musica ? (
        <Audio
          src={staticFile(plan.musica)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(f) => volumenMusica(f, plan)}
        />
      ) : null}
    </AbsoluteFill>
  )
}
