import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { ModeloPiezas, ModeloGLB } from './modeloPersonalizado'
import { GrupoAnimado, CuerpoDePiezas } from './Animado'
import { marchaAvatar } from './animacion'
import { Agachado, CuerpoBase, MarchaBob } from './CuerpoBase'
import { Prendas } from './Prendas'
import { Rostro } from './Rostro'
import { Peinado } from './Peinado'
import { ModeloMascota } from './Asistente3D'
import { anclasDe, muestraRostro, soportaPeinado } from './apariencia'
import { categoriaMarcha } from './cuerpos'
import { COLOR_FORMA } from '../chat/mascotas'
import type { Avatar } from '../state/disenoStore'

/**
 * Casco de obra (modo editor): cúpula amarilla + ala + cresta, sobre la cabeza.
 * Marca visualmente que el personaje está editando el mundo.
 */
function CascoEditor() {
  return (
    <group position={[0, 1.62, 0]}>
      {/* Cúpula (media esfera) */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f5b500" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Ala perimetral */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
        <meshStandardMaterial color="#f5b500" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Visera frontal (un poco más larga al frente) */}
      <mesh castShadow position={[0, 0.07, 0.28]}>
        <boxGeometry args={[0.34, 0.04, 0.16]} />
        <meshStandardMaterial color="#e0a400" roughness={0.5} />
      </mesh>
      {/* Cresta central */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.5]} />
        <meshStandardMaterial color="#e0a400" roughness={0.5} />
      </mesh>
    </group>
  )
}

/**
 * Avatar completo: cuerpo (cubos, forma integrada, o modelo propio) + ropa,
 * escalado por `av.escala`. Lo usan tanto la escena 3D (`Character`) como la
 * vista previa del editor.
 * `casco`: muestra el casco de obra (personaje en modo editor 3D).
 * `animar`: reproduce `av.animacion` (el Character del mapa y el ▶ del preview).
 * `caminar`: balanceo/bob de marcha ligado a `marchaAvatar` (solo el Character).
 */
export function AvatarModelo({
  av,
  casco = false,
  animar = false,
  caminar = false,
}: {
  av: Avatar
  casco?: boolean
  animar?: boolean
  caminar?: boolean
}) {
  const anim = animar ? av.animacion : undefined
  const brazoForma = useRef<THREE.Group>(null)
  const categoria = categoriaMarcha(av)
  const anclas = anclasDe(av)
  return (
    <group scale={av.escala}>
      <Agachado activo={caminar}>
        <GrupoAnimado anim={anim}>
          {av.modeloGlb ? (
            <MarchaBob activo={caminar}>
              <Suspense fallback={null}>
                <ModeloGLB blob={av.modeloGlb} />
              </Suspense>
              <Prendas ropa={av.ropa} anclas={anclas} />
            </MarchaBob>
          ) : av.modelo3d && av.modelo3d.length > 0 ? (
            categoria === 'flotan' ? (
              <MarchaBob activo={caminar}>
                <CuerpoDePiezas piezas={av.modelo3d} anim={anim} personaje={av} estado={marchaAvatar} />
                <Prendas ropa={av.ropa} anclas={anclas} />
              </MarchaBob>
            ) : (
              <>
                <CuerpoDePiezas piezas={av.modelo3d} anim={anim} personaje={av} estado={marchaAvatar} />
                {muestraRostro(av) && (
                  <Rostro anclas={anclas} expresion={av.expresion} rostro={av.rostro} />
                )}
                {soportaPeinado(av) && (
                  <Peinado anclas={anclas} peinado={av.peinado} color={av.peloColor} />
                )}
                <Prendas ropa={av.ropa} anclas={anclas} marcha={caminar} marchaEstado={marchaAvatar} />
              </>
            )
          ) : av.forma ? (
            <MarchaBob activo={caminar}>
              <ModeloMascota
                forma={av.forma}
                color={av.formaColor ?? COLOR_FORMA[av.forma]}
                brazoRef={brazoForma}
                estado={marchaAvatar}
                sinOjos={muestraRostro(av)}
              />
              {muestraRostro(av) && (
                <Rostro anclas={anclas} expresion={av.expresion} rostro={av.rostro} />
              )}
              <Prendas ropa={av.ropa} anclas={anclas} />
            </MarchaBob>
          ) : (
            <>
              <CuerpoBase
                colorCabeza={av.cabeza}
                colorTorso={av.torso}
                colorPiernas={av.piernas}
                caminar={caminar}
              />
              <Rostro anclas={anclas} expresion={av.expresion} rostro={av.rostro} />
              <Peinado anclas={anclas} peinado={av.peinado} color={av.peloColor} />
              <Prendas ropa={av.ropa} anclas={anclas} marcha={caminar} marchaEstado={marchaAvatar} />
            </>
          )}
          {av.ropaCustom?.map((g, i) => (
            <ModeloPiezas key={`rc-${g.refId}-${i}`} piezas={g.piezas} />
          ))}
          {casco && <CascoEditor />}
        </GrupoAnimado>
      </Agachado>
    </group>
  )
}
