import { COLOR_TIEMPO } from './tiempoTranscurrido'

/**
 * Barra de avance del periodo que se está mirando: cuánto de la semana, del mes o
 * del año ya se vivió. Es la misma marca en las tres vistas — una sola pieza para
 * que no se separen con el tiempo.
 */
export function BarraTiempo({ frac, className }: { frac: number; className?: string }) {
  return (
    <div className={`relative h-0.5 ${className ?? ''}`}>
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, backgroundColor: COLOR_TIEMPO }}
      />
    </div>
  )
}
