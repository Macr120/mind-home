import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PERSONAJES_ONBOARDING } from '../../../core/bienvenida/CapturaPersonajes'
import { CapturaBusto, reducir } from '../../../core/buzon/RetratoAvatar'
import type { ExpresionId, PeinadoId } from '../../../core/house/apariencia'
import type { Avatar } from '../../../core/state/disenoStore'
import { CARAS, PERSONAS, azar, type Persona } from './cien.personas'

/*
 * Las caras de las 100 personas: los personajes de la app (los 12 de la
 * bienvenida) con colores propios de cada una. Se capturan UNA vez por sesión
 * en un canvas oculto, de una en una (un solo contexto WebGL), y quedan en
 * `CARAS` como data URL: reabrir el juego ya no vuelve a pintarlas.
 */

/** Lado del retrato en px (la celda mide ~36 px; así queda nítida en pantallas 2×). */
const LADO_CARA = 96

const PIELES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e']
const PELOS = ['#1a1a1a', '#3a2a1a', '#6b4423', '#b5651d', '#e6c07b', '#8b2e16']
const CANAS = ['#d9d9d9', '#bdbdbd', '#f2f2f2']
const ROPA = ['#e23b3b', '#2f5fd0', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#db2777', '#65a30d', '#f97316', '#475569']
const PANTALON = ['#1e3a8a', '#1f2937', '#78350f', '#374151', '#0f766e', '#4c1d95']
const PEINADOS: PeinadoId[] = ['corto', 'puntas', 'coleta', 'chongo', 'largo', 'afro', 'mohawk', 'tazon']
const PEINADOS_MAYORES: PeinadoId[] = ['corto', 'ninguno', 'chongo', 'largo']
const EXPRESIONES: ExpresionId[] = ['feliz', 'sonrisa', 'neutral', 'guino', 'sorpresa', 'serio', 'ternura']

/** Los personajes que no son el humano base (princesa, formas y cuerpos prediseñados). */
const ESPECIALES = PERSONAJES_ONBOARDING.filter((p) => p.id !== 'base')
const BASE = PERSONAJES_ONBOARDING.find((p) => p.id === 'base')?.av

/** Gira el tono de un color: el mismo personaje, otra paleta. */
function girarTono(color: string, giro: number): string {
  return `#${new THREE.Color(color).offsetHSL(giro, 0, 0).getHexString()}`
}

/** La apariencia de la persona `i`, siempre la misma (semilla por índice). */
function avatarDe(i: number, p: Persona): Avatar {
  const r = azar(1000 + i)
  const de = <T,>(lista: readonly T[]): T => lista[Math.floor(r() * lista.length)] as T
  const expresion = de(EXPRESIONES)
  // Seis de cada diez son el humano base; el resto, un personaje especial recoloreado.
  if (r() < 0.6 || !BASE) {
    const mayor = p.edad >= 60
    return {
      ...(BASE as Avatar),
      cabeza: de(PIELES),
      torso: de(ROPA),
      piernas: de(PANTALON),
      peinado: de(mayor ? PEINADOS_MAYORES : PEINADOS),
      peloColor: de(mayor ? CANAS : PELOS),
      expresion,
    }
  }
  const esp = de(ESPECIALES).av
  const giro = r()
  if (esp.forma) return { ...esp, formaColor: de(ROPA), expresion }
  return {
    ...esp,
    expresion,
    modelo3d: esp.modelo3d?.map((pz) => ({ ...pz, color: girarTono(pz.color, giro) })),
  }
}

/**
 * Captura en segundo plano las caras que falten y avisa con cada una. No pinta
 * nada visible; desaparece cuando ya están las 100.
 */
export function CapturaCaras({ alCapturar }: { alCapturar: () => void }) {
  const [i, setI] = useState(() => PERSONAS.findIndex((_, k) => CARAS[k] === undefined))
  const persona = PERSONAS[i]
  if (i < 0 || !persona) return null

  const listo = (canvas: HTMLCanvasElement) => {
    CARAS[i] = reducir(canvas, LADO_CARA) ?? ''
    alCapturar()
    setI(PERSONAS.findIndex((_, k) => CARAS[k] === undefined))
  }

  return (
    <div className="pointer-events-none fixed start-[-9999px] top-0 h-40 w-40" aria-hidden>
      <Canvas
        dpr={1}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [1.5, 1.3, 3], fov: 30, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.35} />
        <CapturaBusto key={i} av={avatarDe(i, persona)} onListo={listo} />
      </Canvas>
    </div>
  )
}
