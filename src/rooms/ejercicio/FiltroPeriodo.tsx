import { PERIODOS, type Periodo } from './periodo'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'

/**
 * Semana / Mes / Año / Todo. Lo usan Progreso (las tres modalidades) y Metas,
 * para que el mismo filtro recorte estadísticas y objetivos por igual.
 * `color` es el de la MODALIDAD que lo pinta; sin él, el rosa de la app (Metas).
 */
export function FiltroPeriodo({
  valor,
  onChange,
  color = COLOR,
}: {
  valor: Periodo
  onChange: (p: Periodo) => void
  color?: string
}) {
  return (
    <PestanasCarpeta
      items={PERIODOS}
      activo={valor}
      onCambio={onChange}
      prefijoClave="ejercicio.periodo"
      color={color}
      variante="sub"
      nivel={2}
    />
  )
}
