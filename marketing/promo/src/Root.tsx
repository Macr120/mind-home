import { Composition } from 'remotion'
import { FPS, IDIOMAS, planificar } from './escenas'
import { Promo } from './Promo'

/** Una composición por idioma: `Promo-es`, `Promo-en`, … `Promo-ar`. */
export const Root: React.FC = () => (
  <>
    {IDIOMAS.map((id) => (
      <Composition
        key={id}
        id={'Promo-' + id}
        component={Promo}
        durationInFrames={planificar(id).total}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ idioma: id }}
      />
    ))}
  </>
)
