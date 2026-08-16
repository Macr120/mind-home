import { useRef, type RefObject } from 'react'
import type * as THREE from 'three'
import { ModeloMascota } from './Asistente3D'
import { Prendas } from './Prendas'
import { Rostro } from './Rostro'
import { Peinado } from './Peinado'
import { GrupoAnimado } from './Animado'
import { anclasDe, muestraRostro, soportaPeinado, type ExpresionId } from './apariencia'
import type { AnimacionModelo } from './animacion'
import type { Asistente } from '../chat/mascotas'

/**
 * Composición completa de un asistente quieto (cuerpo + ropa + rostro +
 * peinado), compartida por el preview del editor y el Chat AR. La marcha va en
 * cero: el NPC vivo del mapa es Asistente3D, que anima su propia marcha.
 */
export function AsistenteModelo({
  asistente,
  anim,
  brazoRef,
  expresion,
}: {
  asistente: Asistente
  /** Animación ya pasada por `forzarSiempre` por el caller (undefined = quieto). */
  anim?: AnimacionModelo
  brazoRef?: RefObject<THREE.Group | null>
  /** Override efímero (emoción viva); ausente = la expresión guardada del asistente. */
  expresion?: ExpresionId
}) {
  const brazoInterno = useRef<THREE.Group>(null)
  return (
    <GrupoAnimado anim={anim}>
      <group scale={asistente.escala ?? 1}>
        <ModeloMascota
          forma={asistente.forma}
          color={asistente.color}
          modelo3d={asistente.modelo3d}
          modeloGlb={asistente.modeloGlb}
          cuerpoPresetId={asistente.cuerpoPresetId}
          brazoRef={brazoRef ?? brazoInterno}
          anim={anim}
          estado={{ velocidad: 0, fase: 0 }}
          sinOjos={muestraRostro(asistente)}
        />
        <Prendas ropa={asistente.ropa} anclas={anclasDe(asistente)} />
        {muestraRostro(asistente) && (
          <Rostro anclas={anclasDe(asistente)} expresion={expresion ?? asistente.expresion} rostro={asistente.rostro} />
        )}
        {soportaPeinado(asistente) && (
          <Peinado anclas={anclasDe(asistente)} peinado={asistente.peinado} color={asistente.peloColor} />
        )}
      </group>
    </GrupoAnimado>
  )
}
