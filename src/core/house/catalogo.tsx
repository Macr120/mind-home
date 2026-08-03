import { Suspense, useContext, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { TB as B, TC as Cyl, TS as Sphere, TemaContext } from './primitivas'
import { getModelo, COLISION, ALTO, piezasDesdeRecurso } from './modelosRecursos'
import { ModeloPiezas, ModeloGLB } from './modeloPersonalizado'
import { ModeloPiezasAnimado } from './Animado'
import {
  CuadroFoto, Espejo, FuenteClasica, Estanque, CascadaPared,
  Resbaladilla, Pasamanos, Carrusel, Columpio,
  Antorcha, FarolPoste, LamparaPie, VelaCandelabro,
  Espectacular, LetreroVegas, LetreroNeon,
  TIPO_CUADRO_FOTO, TIPO_ESPEJO, TIPO_FUENTE, TIPO_ESTANQUE, TIPO_CASCADA,
  TIPO_RESBALADILLA, TIPO_PASAMANOS, TIPO_CARRUSEL, TIPO_COLUMPIO,
  TIPO_ANTORCHA, TIPO_FAROL, TIPO_LAMPARA_PIE, TIPO_VELA,
  TIPO_ESPECTACULAR, TIPO_LETRERO_VEGAS, TIPO_LETRERO_NEON,
} from './especiales'
import { FlotadorObjeto } from './flotador'
import { TIPO_FLOTADOR } from '../state/flotadorStore'
import { EspecialPlantilla, esEspecialPlantilla } from './especialesPlantilla'
import { Cancha3D } from './canchas'
import { esCancha, claseDeCancha } from '../state/canchasStore'
import type { AnimacionModelo } from './animacion'
import { piezasDesdeElemento, type Extractor } from './piezasDesdeModelo'
import { FORMA_VEHICULO } from './vehiculos'
import type { TemaId } from './temas'
import type { Pieza3D } from '../chat/mascotas'

/** Tipo de objeto construido por el usuario con geometría básica (sus piezas van en `ObjetoCuarto.piezas`). */
export const TIPO_PIEZAS = 'piezas'
/** Tipo de objeto con un modelo .glb subido por el usuario (va en `ObjetoCuarto.modeloGlb`). */
export const TIPO_GLB = 'glb'

/**
 * Catálogo de objetos de decoración. Soporta dos tipos de recurso:
 * - primitivas temáticas (TB/TC/TS, peso 0, estilo Roblox) → `render`
 * - modelos .glb destacados (Kenney/Quaternius CC0) → `glb`
 * Las primitivas se re-visten con el tema activo (ver `primitivas.tsx`).
 * Para agregar una pieza .glb: pon el archivo en `public/models/` y añade
 * una entrada con `glb: '/models/archivo.glb'`.
 */

export interface CatalogoItem {
  id: string
  nombre: string
  icon: string
  defaultColor: string
  /** Render con primitivas (recibe el color elegido). */
  render?: (color: string) => React.ReactElement
  /** O modelo .glb destacado. */
  glb?: string
  escala?: number
}

const WOOD = '#7a5230'

export const CATALOGO: CatalogoItem[] = [
  {
    id: 'planta',
    nombre: 'Planta',
    icon: '🪴',
    defaultColor: '#22c55e',
    render: (c) => (
      <group>
        <Cyl p={[0, 0.25, 0]} r={0.28} h={0.5} c={WOOD} />
        <Sphere p={[0, 0.75, 0]} r={0.42} c={c} />
      </group>
    ),
  },
  {
    id: 'lampara',
    nombre: 'Lámpara',
    icon: '💡',
    defaultColor: '#fbbf24',
    render: (c) => (
      <group>
        <Cyl p={[0, 0.05, 0]} r={0.28} h={0.1} c="#2b2f3a" />
        <Cyl p={[0, 0.7, 0]} r={0.05} h={1.2} c="#2b2f3a" />
        <mesh position={[0, 1.4, 0]} castShadow>
          <coneGeometry args={[0.35, 0.4, 16]} />
          <meshStandardMaterial color={c} roughness={0.5} emissive={c} emissiveIntensity={0.3} />
        </mesh>
      </group>
    ),
  },
  {
    id: 'alfombra',
    nombre: 'Alfombra',
    icon: '🟫',
    defaultColor: '#a855f7',
    render: (c) => (
      <group>
        <B p={[0, 0.06, 0]} s={[2, 0.08, 1.4]} c={c} />
        <B p={[0, 0.07, 0]} s={[1.6, 0.06, 1.05]} c="#ffffff" />
        <B p={[0, 0.08, 0]} s={[1.3, 0.05, 0.8]} c={c} />
      </group>
    ),
  },
  {
    id: 'silla',
    nombre: 'Silla',
    icon: '🪑',
    defaultColor: '#ef4444',
    render: (c) => (
      <group>
        <B p={[0, 0.5, 0]} s={[0.6, 0.1, 0.6]} c={c} />
        <B p={[0, 0.85, -0.25]} s={[0.6, 0.6, 0.1]} c={c} />
        <B p={[-0.25, 0.25, -0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
        <B p={[0.25, 0.25, -0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
        <B p={[-0.25, 0.25, 0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
        <B p={[0.25, 0.25, 0.25]} s={[0.08, 0.5, 0.08]} c={WOOD} />
      </group>
    ),
  },
  {
    id: 'baul',
    nombre: 'Baúl',
    icon: '🧰',
    defaultColor: '#b45309',
    render: (c) => (
      <group>
        <B p={[0, 0.3, 0]} s={[1.1, 0.6, 0.7]} c={c} />
        <B p={[0, 0.65, 0]} s={[1.15, 0.15, 0.75]} c="#6b4f3a" />
        <B p={[0, 0.5, 0.38]} s={[0.2, 0.2, 0.05]} c="#fbbf24" />
      </group>
    ),
  },
  {
    id: 'cuadro',
    nombre: 'Cuadro',
    icon: '🖼️',
    defaultColor: '#3b82f6',
    render: (c) => (
      <group>
        <Cyl p={[0, 0.55, 0]} r={0.04} h={1.1} c="#2b2f3a" />
        <B p={[0, 1.0, 0]} s={[0.9, 0.7, 0.08]} c="#1f2937" />
        <B p={[0, 1.0, 0.05]} s={[0.75, 0.55, 0.02]} c={c} />
      </group>
    ),
  },
  {
    id: 'guitarra',
    nombre: 'Guitarra',
    icon: '🎸',
    defaultColor: '#d97706',
    // Acostada en el suelo: cuerpo en forma de 8 + mástil con pala.
    render: (c) => (
      <group>
        <Sphere p={[0, 0.18, 0.55]} r={0.42} c={c} />
        <Sphere p={[0, 0.18, 0.1]} r={0.28} c={c} />
        <Cyl p={[0, 0.33, 0.55]} r={0.12} h={0.04} c="#1f2937" />
        <B p={[0, 0.18, -0.55]} s={[0.16, 0.1, 1.1]} c={WOOD} />
        <B p={[0, 0.18, -1.15]} s={[0.26, 0.1, 0.26]} c="#1f2937" />
      </group>
    ),
  },
  {
    id: 'mesa',
    nombre: 'Mesa',
    icon: '🪵',
    defaultColor: '#8b5a2b',
    render: (c) => (
      <group>
        <B p={[0, 0.72, 0]} s={[1.4, 0.1, 0.9]} c={c} />
        <B p={[-0.6, 0.36, -0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
        <B p={[0.6, 0.36, -0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
        <B p={[-0.6, 0.36, 0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
        <B p={[0.6, 0.36, 0.35]} s={[0.1, 0.72, 0.1]} c={WOOD} />
      </group>
    ),
  },
  {
    id: 'pelota',
    nombre: 'Pelota',
    icon: '⚽',
    defaultColor: '#ef4444',
    render: (c) => <Sphere p={[0, 0.35, 0]} r={0.35} c={c} />,
  },
  {
    id: 'libro',
    nombre: 'Libro',
    icon: '📕',
    defaultColor: '#2563eb',
    render: (c) => (
      <group>
        <B p={[0, 0.12, 0]} s={[0.72, 0.2, 0.52]} c={c} />
        <B p={[0.02, 0.12, 0]} s={[0.66, 0.16, 0.48]} c="#f5f5f0" />
      </group>
    ),
  },
  // Vehículos montables (la mecánica de conducción vive en Character.tsx).
  {
    id: 'bicicleta',
    nombre: 'Bicicleta',
    icon: '🚲',
    defaultColor: '#ef4444',
    // Forma pura (sin hooks): el modelo animado solo hace falta al conducir (VehiculoMontado).
    render: (c) => FORMA_VEHICULO.bicicleta({ color: c }),
  },
  {
    id: 'motocicleta',
    nombre: 'Motocicleta',
    icon: '🏍️',
    defaultColor: '#8b5cf6',
    render: (c) => FORMA_VEHICULO.motocicleta({ color: c }),
  },
  {
    id: 'automovil',
    nombre: 'Automóvil',
    icon: '🚗',
    defaultColor: '#3b82f6',
    render: (c) => FORMA_VEHICULO.automovil({ color: c }),
  },
  {
    id: 'ovni',
    nombre: 'Platillo OVNI',
    icon: '🛸',
    defaultColor: '#22c55e',
    render: (c) => FORMA_VEHICULO.ovni({ color: c }),
  },
  // Ejemplo de pieza .glb destacada (descomenta y pon el archivo en public/models/):
  // { id: 'trofeo', nombre: 'Trofeo', icon: '🏆', defaultColor: '#fbbf24', glb: '/models/trofeo.glb', escala: 1 },
]

export const getCatalogoItem = (id: string) => CATALOGO.find((i) => i.id === id)

/** Primitivas temáticas del catálogo (usan hooks: se leen por referencia, no se ejecutan). */
const PRIMS_CATALOGO = new Map<unknown, Extractor>([
  [B, (p) => ({ tipo: 'caja', pos: p.p as [number, number, number], tam: p.s as number[], color: p.c as string })],
  [Cyl, (p) => ({ tipo: 'cilindro', pos: p.p as [number, number, number], tam: [p.r as number, p.r as number, p.h as number], color: p.c as string })],
  [Sphere, (p) => ({ tipo: 'esfera', pos: p.p as [number, number, number], tam: [p.r as number], color: p.c as string })],
])

/** Réplica editable (piezas) de un objeto del catálogo; null si es un .glb. */
function piezasDesdeCatalogo(tipo: string, color: string): Pieza3D[] | null {
  const item = getCatalogoItem(tipo)
  if (!item?.render) return null
  // expandir: baja a componentes anidados sin hooks (p. ej. `Rueda` de los vehículos).
  const piezas = piezasDesdeElemento(item.render(color), { prims: PRIMS_CATALOGO, expandir: true })
  return piezas.length ? piezas : null
}

/**
 * Réplica editable (piezas) de cualquier objeto colocado a partir de su `tipo`:
 * objeto del catálogo o recurso 3D. Devuelve null cuando no hay forma reproducible
 * (ya es de piezas, o es un modelo .glb): en ese caso se parte de una caja.
 */
export function piezasDesdeObjeto(tipo: string, color: string, tema: TemaId | null): Pieza3D[] | null {
  if (tipo === TIPO_PIEZAS || tipo === TIPO_GLB) return null
  if (tipo.startsWith('recurso:')) return piezasDesdeRecurso(Number(tipo.slice('recurso:'.length)), color, tema)
  return piezasDesdeCatalogo(tipo, color)
}

/** Footprint de colisión [hx, hz] de la decoración genérica. Ausente = no estorba. */
const COLISION_CAT: Record<string, [number, number]> = {
  planta: [0.35, 0.35],
  lampara: [0.28, 0.28],
  silla: [0.3, 0.3],
  baul: [0.55, 0.35],
  mesa: [0.7, 0.45],
  pelota: [0.35, 0.35],
  guitarra: [0.4, 0.5],
  cuadro: [0.45, 0.1],
  // Objetos especiales (especiales.tsx): no están en CATALOGO pero sí estorban.
  'cuadro-foto': [0.6, 0.12],
  espejo: [0.5, 0.2],
  fuente: [0.75, 0.75],
  estanque: [0.95, 0.95],
  'cascada-pared': [0.8, 0.45],
  // Iluminación (especiales.tsx): emiten luz real de noche.
  antorcha: [0.18, 0.18],
  farol: [0.28, 0.28],
  'lampara-pie': [0.3, 0.3],
  vela: [0.2, 0.2],
  // Juegos de parque a escala del personaje (footprints × ESCALA_JUEGO de parqueStore).
  resbaladilla: [0.55, 1.85],
  pasamanos: [1.55, 0.65],
  carrusel: [1.55, 1.55],
  columpio: [1.5, 0.85],
  bicicleta: [0.25, 0.9],
  motocicleta: [0.3, 0.95],
  automovil: [0.7, 1.5],
  ovni: [1.05, 1.05],
  // Objetos principales de plantilla (especialesPlantilla.tsx).
  'olla-plantilla': [0.4, 0.4],
  'despertador-plantilla': [0.35, 0.28],
  'librero-libro': [0.55, 0.25],
  'globo-terraqueo': [0.3, 0.3],
  'estanteria-herramientas': [0.48, 0.22],
  'repisa-juegos': [0.55, 0.22],
  // Usables (caminadora y tapete son pisables: se sube/sienta encima).
  periodico: [0.62, 0.32],
  'sillon-lectura': [0.42, 0.38],
  laptop: [0.56, 0.32],
  'guitarra-plantilla': [0.6, 0.28],
  'planta-regar': [0.35, 0.35],
  libreta: [0.45, 0.28],
  'calendario-pared': [0.4, 0.1],
  // alfombra y libro: planos / menudos → se pueden pisar.
}

/** Alto aproximado de los objetos principales de plantilla (marcador de entrada). */
const ALTO_ESPECIAL: Record<string, number> = {
  'olla-plantilla': 1.7,
  'despertador-plantilla': 1.4,
  'librero-libro': 1.9,
  'globo-terraqueo': 1.5,
  'estanteria-herramientas': 1.65,
  'repisa-juegos': 1.75,
  caminadora: 1.25,
  periodico: 0.85,
  'sillon-lectura': 1.1,
  laptop: 1.8,
  'tapete-yoga': 0.15,
  'guitarra-plantilla': 1.55,
  'planta-regar': 1.3,
  libreta: 0.6,
  'calendario-pared': 2.15,
}

/**
 * Footprint de colisión [hx, hz] de cualquier objeto colocado según su `tipo`.
 * `null` = no estorba (el personaje pasa por encima).
 */
export function footprintDeTipo(tipo: string): [number, number] | null {
  if (tipo.startsWith('recurso:')) return COLISION[Number(tipo.slice('recurso:'.length))] ?? null
  return COLISION_CAT[tipo] ?? null
}

/** Alto aproximado del objeto (para el marcador del objeto principal). */
export function altoDeTipo(tipo: string): number {
  if (tipo.startsWith('recurso:')) return ALTO[Number(tipo.slice('recurso:'.length))] ?? 2.2
  return ALTO_ESPECIAL[tipo] ?? 1.2
}

function GlbObjeto({ src, escala = 1 }: { src: string; escala?: number }) {
  const { scene } = useGLTF(src)
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} scale={escala} />
}

/** Dibuja un recurso 3D, objeto del catálogo, mueble temático, .glb o piezas del usuario. */
export function ObjetoView({
  tipo,
  color,
  piezas,
  modeloGlb,
  foto,
  texto,
  anim,
  nivelAnim = null,
  sinReflejo = false,
  objetoId,
  fx,
}: {
  tipo: string
  color: string
  piezas?: Pieza3D[]
  /** Objetos tipo 'glb': el modelo subido por el usuario (ya optimizado). */
  modeloGlb?: Blob
  /** Objetos especiales 'cuadro-foto' y 'espectacular': la foto subida por el usuario. */
  foto?: Blob
  /** Anuncios (espectacular/letreros): el texto que muestra el letrero. */
  texto?: string
  /** Animación del objeto: activa las poses en modelos de piezas (sin pasarla, estático). */
  anim?: AnimacionModelo
  /** Piso del objeto para la activación por 'proximidad' (null = ignorar nivel). */
  nivelAnim?: number | null
  /** Espejos como vidrio estático y fuentes sin gotas animadas (miniaturas: canvas sin frameloop). */
  sinReflejo?: boolean
  /** Id de la instancia del mapa: los juegos de parque solo animan si es el que se usa. */
  objetoId?: number
  /** Intensidad de los efectos del objeto especial (agua/luz); 1 = normal. */
  fx?: number
}) {
  const tema = useContext(TemaContext)
  if (tipo === TIPO_CUADRO_FOTO) return <CuadroFoto color={color} foto={foto} />
  if (tipo === TIPO_ESPEJO) return <Espejo color={color} simple={sinReflejo} />
  if (tipo === TIPO_FUENTE) return <FuenteClasica color={color} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_ESTANQUE) return <Estanque color={color} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_CASCADA) return <CascadaPared color={color} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_RESBALADILLA) return <Resbaladilla color={color} />
  if (tipo === TIPO_PASAMANOS) return <Pasamanos color={color} />
  if (tipo === TIPO_CARRUSEL) return <Carrusel color={color} objetoId={objetoId} />
  if (tipo === TIPO_COLUMPIO) return <Columpio color={color} objetoId={objetoId} />
  if (tipo === TIPO_FLOTADOR) return <FlotadorObjeto color={color} objetoId={objetoId} />
  if (tipo === TIPO_ANTORCHA) return <Antorcha color={color} simple={sinReflejo} fx={fx} />
  if (esCancha(tipo)) return <Cancha3D clase={claseDeCancha(tipo)} color={color} />
  if (tipo === TIPO_FAROL) return <FarolPoste color={color} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_LAMPARA_PIE) return <LamparaPie color={color} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_VELA) return <VelaCandelabro color={color} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_ESPECTACULAR) return <Espectacular color={color} foto={foto} texto={texto} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_LETRERO_VEGAS) return <LetreroVegas color={color} texto={texto} simple={sinReflejo} fx={fx} />
  if (tipo === TIPO_LETRERO_NEON) return <LetreroNeon color={color} texto={texto} simple={sinReflejo} fx={fx} />
  if (esEspecialPlantilla(tipo)) {
    return <EspecialPlantilla tipo={tipo} color={color} simple={sinReflejo} nivel={nivelAnim} objetoId={objetoId} />
  }
  if (tipo === TIPO_PIEZAS) {
    if (!piezas || piezas.length === 0) return null
    if (anim && anim.activacion !== 'apagado' && (anim.poses?.length ?? 0) >= 2) {
      return <ModeloPiezasAnimado piezas={piezas} anim={anim} nivel={nivelAnim} />
    }
    return <ModeloPiezas piezas={piezas} />
  }
  if (tipo === TIPO_GLB) {
    return modeloGlb ? (
      <Suspense fallback={null}>
        <ModeloGLB blob={modeloGlb} />
      </Suspense>
    ) : null
  }
  if (tipo.startsWith('recurso:')) {
    const modelo = getModelo(Number(tipo.slice('recurso:'.length)))
    return modelo ? modelo.render(color, tema?.id ?? null) : null
  }
  const item = getCatalogoItem(tipo)
  if (!item) return null
  if (item.glb) {
    return (
      <Suspense fallback={null}>
        <GlbObjeto src={item.glb} escala={item.escala} />
      </Suspense>
    )
  }
  return item.render ? item.render(color) : null
}
