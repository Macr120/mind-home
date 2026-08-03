import { useNodosMapa } from '../../core/data/repository'
import { COLOR } from './constantes'

/**
 * Miniatura no interactiva de un mapa conceptual: sus nodos y uniones a escala,
 * sin texto (a este tamaño no se leería). La usa la conversación del chat para
 * enseñar lo que acaba de dibujar el asistente; al tocarla se abre en Ideas.
 */

/** Tamaño del nodo en unidades del mundo (R_HIJO = 130 de separación). */
const NODO_W = 88
const NODO_H = 30

export function MiniMapa({ mapaId, className }: { mapaId: number; className?: string }) {
  const nodos = useNodosMapa(mapaId)
  if (!nodos || nodos.length === 0) return null
  // La matriz de decisión es una tabla, no un lienzo: sus nodos no tienen sitio
  // y la miniatura saldría como un borrón en el origen.
  if (nodos.every((n) => n.x === 0 && n.y === 0)) return null

  // Encuadre: caja de todos los nodos con aire para que no se corten los bordes.
  const margen = NODO_W
  const xs = nodos.map((n) => n.x)
  const ys = nodos.map((n) => n.y)
  const minX = Math.min(...xs) - margen
  const minY = Math.min(...ys) - margen
  const ancho = Math.max(1, Math.max(...xs) + margen - minX)
  const alto = Math.max(1, Math.max(...ys) + margen - minY)
  const trazo = Math.max(2, ancho / 200)
  const porId = new Map(nodos.map((n) => [n.nodoId, n]))

  return (
    <svg
      viewBox={`${minX} ${minY} ${ancho} ${alto}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden
    >
      {nodos.map((n) => {
        const padre = n.padreId ? porId.get(n.padreId) : null
        if (!padre) return null
        return (
          <line
            key={`u-${n.nodoId}`}
            x1={padre.x}
            y1={padre.y}
            x2={n.x}
            y2={n.y}
            stroke={n.color ?? COLOR}
            strokeOpacity={0.45}
            strokeWidth={trazo}
          />
        )
      })}
      {nodos.map((n) => (
        <rect
          key={n.nodoId}
          x={n.x - NODO_W / 2}
          y={n.y - NODO_H / 2}
          width={NODO_W}
          height={NODO_H}
          rx={NODO_H / 2}
          fill={n.color ?? COLOR}
          fillOpacity={n.padreId ? 0.7 : 1}
        />
      ))}
    </svg>
  )
}
