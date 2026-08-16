import { ANCLAS_AVATAR, type ExpresionId, type PeinadoId } from '../../../src/core/house/apariencia'
import { Rostro } from '../../../src/core/house/Rostro'
import { Peinado } from '../../../src/core/house/Peinado'
import { RostroVivo } from './RostroVivo'
import type { SenalesCara } from './expresiones'

/**
 * SOLO la cabeza del avatar Base (el box-man de la app), centrada en el origen
 * para poder posarla sobre la cara con la matriz de MediaPipe. Reutiliza
 * `Rostro` y `Peinado` tal cual (dibujan sobre las anclas del avatar, con la
 * cabeza en y=1.5), así que todo va dentro de un grupo desplazado -1.5. En el
 * modo «Viva» el rostro estático se sustituye por `RostroVivo` animado.
 */
export function CabezaAvatar({
  piel,
  expresion,
  peinado,
  pelo,
  viva,
  senales,
}: {
  piel: string
  expresion: ExpresionId
  peinado: PeinadoId
  pelo: string
  viva?: boolean
  senales?: React.RefObject<SenalesCara>
}) {
  return (
    <group position={[0, -1.5, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.44, 0.44, 0.44]} />
        <meshStandardMaterial color={piel} />
      </mesh>
      {viva && senales ? (
        <RostroVivo anclas={ANCLAS_AVATAR} expresion={expresion} senales={senales} />
      ) : (
        <Rostro anclas={ANCLAS_AVATAR} expresion={expresion} />
      )}
      <Peinado anclas={ANCLAS_AVATAR} peinado={peinado} color={pelo} />
    </group>
  )
}
