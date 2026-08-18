import type { ReactNode } from 'react'
import { DoubleSide } from 'three'
import { Estructura } from './Accesos'
import { MuroSegment } from './MuroRender'
import { PisoCelda } from './PisoCelda'
import { TechoForma } from './TechoForma'
import { TechoLoseta } from './TechoLoseta'
import { HojaPuertaMesh, MaterialHoja, PUERTA_ALTO, PUERTA_BASE_Y, PUERTA_GROSOR } from './puertaHojas'
import type { FormaLoseta } from './formasLoseta'
import { getPisoTipo, type PisoTipoId } from './pisos'
import { TECHO_PARAMS_DEFAULT, type TechoFormaId } from './techos'
import {
  TIPOS_MURO,
  type FormaMuroId,
  type TipoMuroId,
  type TipoPuertaId,
  type VentanaContenidoId,
  type VentanaFormaId,
} from './murosPuertas'
import { mezclar, type Tema } from './temas'
import { SIZE, WALL_H, type TipoAcceso } from './walls'
import type { SeccionCasaId } from '../ui/catalogoCasa'

/**
 * Escenas 3D de las PIEZAS DE LA CASA para el inventario: la miniatura de un
 * muro, una puerta o un techo se rasteriza igual que la de un mueble (ver
 * `MiniaturaEscena` en `Miniatura.tsx`), solo que aquí no hay un objeto del
 * catálogo detrás — hay que armar el trocito de casa a mano.
 *
 * Se reutilizan los MISMOS componentes que levantan la casa (`MuroSegment`,
 * `PisoCelda`, `TechoForma`, las hojas de puerta y las estructuras de acceso):
 * la miniatura enseña la pieza de verdad, con su material y su forma, y no un
 * dibujo aparte que se quedaría desfasado.
 */

/** Color del muro genérico (las secciones que no traen color propio), vestido por el tema. */
const colorMuroBase = (tema: Tema | null) =>
  tema ? mezclar(TIPOS_MURO[0].defaultColor, tema.shell.muroInt, 0.4) : TIPOS_MURO[0].defaultColor

/** Color del techo, como en `Room3D`. */
const colorTechoBase = (tema: Tema | null) =>
  tema ? mezclar(TIPOS_MURO[0].defaultColor, tema.shell.techo, 0.35) : '#6f665c'

/**
 * Props comunes de un tramo de muro suelto, centrado en el origen y apoyado en
 * y=0. `SIZE` se lee aquí dentro porque el tamaño de celda es configurable.
 */
const tramo = (tema: Tema | null, color: string, vertical = false) => ({
  cx: 0,
  cz: 0,
  sx: vertical ? 0.24 : SIZE,
  sz: vertical ? SIZE : 0.24,
  exterior: false,
  colorMuro: color,
  baseColor: color,
  extColor: color,
  roughness: tema?.roughness ?? 0.6,
  extRough: Math.min(1, (tema?.roughness ?? 0.6) + 0.2),
  metalness: tema?.metalness ?? 0,
  emissive: tema?.emissive ?? '#000000',
  emissiveInt: tema?.emissiveIntensity ?? 0,
  atenuado: false,
  marcoVentana: '#3f3f46',
  cristal: '#bcdcff',
})

/** Loseta suelta: la del catálogo de pisos, o un color plano si la pieza no trae material. */
function Losa({
  forma = 'cuadrado',
  piso,
  color = '#9ca3af',
  y = 0,
}: {
  forma?: FormaLoseta
  piso?: PisoTipoId
  color?: string
  y?: number
}) {
  const conf = piso ? getPisoTipo(piso) : null
  return (
    <group position={[0, y, 0]}>
      <PisoCelda
        lx={0}
        lz={0}
        color={conf?.color ?? color}
        roughness={conf?.roughness ?? 0.85}
        metalness={conf?.metalness ?? 0}
        emissive={conf?.emissive ?? '#000000'}
        emissiveIntensity={conf?.emissiveIntensity ?? 0}
        pisoConf={conf}
        atenuado={false}
        formaLoseta={{ forma, rotacion: 0 }}
      />
    </group>
  )
}

/** Cuarto en miniatura: losa, los dos muros del fondo y techo plano. */
function MiniCuarto({ tema, conTecho = true }: { tema: Tema | null; conTecho?: boolean }) {
  const muro = colorMuroBase(tema)
  const m = SIZE / 2
  return (
    <group>
      <Losa color={mezclar(muro, '#ffffff', 0.2)} />
      <group position={[0, 0, -m]}>
        <MuroSegment {...tramo(tema, muro)} />
      </group>
      <group position={[-m, 0, 0]}>
        <MuroSegment {...tramo(tema, muro, true)} />
      </group>
      {conTecho && <TechoLoseta tipo={null} colorCuarto={colorTechoBase(tema)} lx={0} lz={0} y={WALL_H} />}
    </group>
  )
}

/** Puerta: el vano abierto en un tramo de muro, con la hoja que le toca a cada tipo. */
function Puerta({ tipo, color, tema }: { tipo: TipoPuertaId; color: string; tema: Tema | null }) {
  const ancho = SIZE * 0.5
  const alto = PUERTA_ALTO
  const fraccionAlto = alto / WALL_H
  return (
    <group>
      <MuroSegment
        {...tramo(tema, colorMuroBase(tema))}
        ventana
        huecoSinCristal
        ventAncho={ancho / SIZE}
        ventAlto={fraccionAlto}
        ventPosY={fraccionAlto / 2}
      />
      {tipo === 'recta' && (
        <group position={[-ancho / 2, 0, 0]}>
          <HojaPuertaMesh width={ancho} color={color} alto={alto} />
        </group>
      )}
      {tipo === 'doble' &&
        [-1, 1].map((s) => (
          <group key={s} position={[(s * ancho) / 2, 0, 0]} rotation-y={s > 0 ? Math.PI : 0}>
            <HojaPuertaMesh width={ancho / 2} color={color} alto={alto} />
          </group>
        ))}
      {tipo === 'corredera' && (
        <mesh position={[0, PUERTA_BASE_Y + alto / 2, 0]}>
          <boxGeometry args={[ancho - 0.1, alto, PUERTA_GROSOR]} />
          <MaterialHoja color={color} roughness={0.35} metalness={0.4} />
        </mesh>
      )}
      {tipo === 'porton' &&
        Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[0, PUERTA_BASE_Y + alto / 10 + i * (alto / 5), 0]}>
            <boxGeometry args={[ancho - 0.08, alto / 5 - 0.06, PUERTA_GROSOR]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.65} />
          </mesh>
        ))}
    </group>
  )
}

/** Las piezas del armazón (sección «Estructura»): no hay componente que las pinte sueltas. */
function Armazon({ id, tema }: { id: string; tema: Tema | null }) {
  const muro = colorMuroBase(tema)
  const m = SIZE / 2
  switch (id) {
    case 'cuartos':
      return <MiniCuarto tema={tema} />
    case 'basicos':
      return <MiniCuarto tema={tema} conTecho={false} />
    case 'niveles':
      return (
        <group>
          <Losa color={mezclar(muro, '#ffffff', 0.2)} />
          <group position={[-m, 0, 0]}>
            <MuroSegment {...tramo(tema, muro, true)} />
          </group>
          <Losa color={mezclar(muro, '#ffffff', 0.2)} y={WALL_H} />
        </group>
      )
    case 'sotanos':
      return (
        <group>
          <Losa piso="pasto" y={WALL_H} />
          <Losa color={mezclar(muro, '#000000', 0.35)} />
        </group>
      )
    case 'albercas':
      return (
        <group>
          <Losa color="#7dd3fc" />
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[SIZE - 0.2, 0.9, SIZE - 0.2]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.55} roughness={0.1} metalness={0.2} />
          </mesh>
        </group>
      )
    case 'patios':
      return (
        <group>
          <Losa piso="pasto" />
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 1.1, 8]} />
            <meshStandardMaterial color="#7a5230" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <sphereGeometry args={[0.6, 12, 10]} />
            <meshStandardMaterial color="#2f7d32" roughness={0.9} />
          </mesh>
        </group>
      )
    case 'libre-recto':
      return <MuroSegment {...tramo(tema, muro)} />
    case 'libre-diagonal':
      return (
        <group rotation-y={-Math.PI / 5}>
          <MuroSegment {...tramo(tema, muro)} />
        </group>
      )
    case 'libre-curvo':
      // Arco de cilindro abierto: el muro curvo del editor de planos.
      return (
        <mesh position={[0, WALL_H / 2, 0]}>
          <cylinderGeometry args={[m, m, WALL_H, 24, 1, true, -Math.PI / 2, Math.PI]} />
          <meshStandardMaterial
            color={muro}
            roughness={tema?.roughness ?? 0.6}
            side={DoubleSide}
          />
        </mesh>
      )
    default:
      return null
  }
}

/**
 * Escena 3D de una pieza del catálogo de la casa, o `null` si esa pieza no tiene
 * modelo (entonces el inventario cae a su icono de siempre).
 */
export function escenaPiezaCasa(
  seccion: SeccionCasaId,
  id: string,
  color: string | undefined,
  tema: Tema | null,
): ReactNode | null {
  switch (seccion) {
    case 'estructura':
      return <Armazon id={id} tema={tema} />
    case 'muros':
      return <MuroSegment {...tramo(tema, color ?? colorMuroBase(tema))} tipoMuro={id as TipoMuroId} />
    case 'siluetas':
      return <MuroSegment {...tramo(tema, colorMuroBase(tema))} forma={id as FormaMuroId} />
    case 'puertas':
      return <Puerta tipo={id as TipoPuertaId} color={color ?? '#b9824f'} tema={tema} />
    case 'ventanas': {
      // Cuadro y espejo van empotrados: el vano es cuadrado y cambia su contenido.
      const empotrado = id === 'cuadro' || id === 'espejo'
      return (
        <MuroSegment
          {...tramo(tema, colorMuroBase(tema))}
          ventana
          ventForma={(empotrado ? 'cuadrado' : id) as VentanaFormaId}
          ventContenido={(empotrado ? id : 'ventana') as VentanaContenidoId}
          ventAncho={0.5}
          ventAlto={0.45}
          ventPosY={0.55}
        />
      )
    }
    case 'techos':
      // La losa va debajo de la forma, como en la casa: el techo «plano» ES la
      // losa (`TechoForma` no dibuja nada cuando la forma plana no tiene pendiente).
      return (
        <group>
          <TechoLoseta tipo={null} colorCuarto={colorTechoBase(tema)} lx={0} lz={0} />
          <TechoForma
            forma={id as TechoFormaId}
            params={TECHO_PARAMS_DEFAULT}
            tipo={null}
            colorCuarto={colorTechoBase(tema)}
            W={SIZE}
            H={SIZE}
            yBase={0.06}
          />
        </group>
      )
    case 'losetas':
      return <Losa forma={id as FormaLoseta} color={mezclar(colorMuroBase(tema), '#ffffff', 0.2)} />
    case 'pisoInterior':
    case 'pisoExterior':
      return <Losa piso={id as PisoTipoId} color={color} />
    case 'accesos':
      return <Estructura tipo={id as TipoAcceso} altura={WALL_H + 0.8} landing={WALL_H} baseY={0} />
    default:
      return null
  }
}
