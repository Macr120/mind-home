import { ANCLAS_AVATAR, type ExpresionId, type PeinadoId } from '../../../src/core/house/apariencia'
import { Rostro } from '../../../src/core/house/Rostro'
import { Peinado } from '../../../src/core/house/Peinado'
import { ModeloPiezas } from '../../../src/core/house/modeloPersonalizado'
import { RostroVivo } from './RostroVivo'
import { mascaraDe } from './mascaras'
import type { SenalesCara } from './expresiones'

/**
 * SOLO la cabeza del personaje (la Base —el box-man de la app— o la de un
 * cuerpo prediseñado: Princesa, Alien, Osito…), centrada en el origen para
 * poder posarla sobre la cara con la matriz de MediaPipe. Reutiliza `Rostro` y
 * `Peinado` tal cual (dibujan sobre las anclas del avatar, con la cabeza en
 * y=1.5), así que todo va dentro de un grupo desplazado -1.5. En el modo
 * «Viva» el rostro estático se sustituye por `RostroVivo` animado.
 */
export function CabezaAvatar({
  piel,
  mascara,
  expresion,
  peinado,
  pelo,
  viva,
  senales,
}: {
  piel: string
  mascara: string
  expresion: ExpresionId
  peinado: PeinadoId
  pelo: string
  viva?: boolean
  senales?: React.RefObject<SenalesCara>
}) {
  const m = mascaraDe(mascara)
  return (
    <group position={[0, -1.5, 0]}>
      {m.piezas ? (
        // Las piezas vienen recentradas en el origen: vuelven a y=1.5 ya escaladas
        // al tamaño de la cabeza Base, para que el rostro y las anclas les calcen.
        <group position={[0, 1.5, 0]} scale={m.escala}>
          <ModeloPiezas piezas={m.piezas} />
        </group>
      ) : (
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.44, 0.44, 0.44]} />
          <meshStandardMaterial color={piel} />
        </mesh>
      )}
      {m.conRostro &&
        (viva && senales ? (
          <RostroVivo anclas={ANCLAS_AVATAR} expresion={expresion} senales={senales} />
        ) : (
          <Rostro anclas={ANCLAS_AVATAR} expresion={expresion} />
        ))}
      {!m.piezas && <Peinado anclas={ANCLAS_AVATAR} peinado={peinado} color={pelo} />}
    </group>
  )
}
