import { useMemo } from 'react'
import { useT } from '../../core/i18n/useT'
import { AIRE_ENCUADRE, COLORES_FUNCION, VISTA_INICIAL } from './constantes'
import { muestrearParametrica, type FuncionGrafica } from './curvas'
import type { Motor } from './motor'
import { BotonAjustar } from './PlanoPolar'
import { PlanoSvg } from './PlanoSvg'
import { claveDe, encuadrarXY, tramosDeXY } from './trazos'
import { usePlano } from './usePlano'

/**
 * (x(t), y(t)): la curva que recorre un punto al pasar el tiempo.
 *
 * Como en polar, el dominio es el parámetro y no la vista. Y aquí es donde se
 * nota el criterio de corte por distancia en PÍXELES: un salto de una curva
 * paramétrica puede ser todo horizontal, y mirar solo la Y no lo vería.
 */
export function PlanoParametrico({
  motor,
  lista,
  rangoT,
}: {
  motor: Motor | null
  lista: FuncionGrafica[]
  rangoT: [number, number]
}) {
  const t = useT()
  const clave = claveDe(lista)

  const curvas = useMemo(
    () => muestrearParametrica(motor, lista, rangoT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motor, clave, rangoT[0], rangoT[1]],
  )

  const inicial = useMemo(() => encuadrarXY(curvas, AIRE_ENCUADRE) ?? VISTA_INICIAL, [curvas])
  const plano = usePlano(inicial, { cuadrado: true })
  const { visible, dentro, px, py, cortePx } = plano

  const trazos = useMemo(
    () =>
      curvas.map((c, i) => ({
        id: c.id,
        color: COLORES_FUNCION[i % COLORES_FUNCION.length],
        tramos: tramosDeXY(c.xs, c.ys, px, py, cortePx),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [curvas, visible, dentro.w, dentro.h, cortePx],
  )

  return (
    <PlanoSvg
      plano={plano}
      trazos={trazos}
      botones={<BotonAjustar onClick={() => plano.encuadrar(encuadrarXY(curvas, AIRE_ENCUADRE) ?? VISTA_INICIAL)} />}
    >
      <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-lg bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/70">
        {t('computo.graf.pistaParam', 't de {a} a {b}', {
          a: rangoT[0].toFixed(2),
          b: rangoT[1].toFixed(2),
        })}
      </div>
    </PlanoSvg>
  )
}
