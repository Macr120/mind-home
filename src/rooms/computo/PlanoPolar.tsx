import { useMemo } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { AIRE_ENCUADRE, COLORES_FUNCION, VISTA_INICIAL } from './constantes'
import { muestrearPolar, type FuncionGrafica } from './curvas'
import type { Motor } from './motor'
import { PlanoSvg } from './PlanoSvg'
import { claveDe, encuadrarXY, tramosDeXY } from './trazos'
import { usePlano } from './usePlano'

/**
 * r = f(θ), dibujado en el plano cartesiano de siempre.
 *
 * Dos cosas lo separan del graficador de funciones y las dos importan:
 *
 *  1. El MUESTREO no depende de la vista. El dominio es θ ∈ [0, 4π], así que
 *     panear o alejarse no puede cambiar la forma de la curva. Por eso hay dos
 *     `useMemo`: uno en unidades (θ) y otro en píxeles (la vista).
 *  2. El plano va CUADRADO. Con la escala de cada eje por su cuenta, un `r = 1`
 *     saldría como una elipse achatada un 15 %, que en polar es sencillamente
 *     un dibujo equivocado.
 */
export function PlanoPolar({ motor, lista }: { motor: Motor | null; lista: FuncionGrafica[] }) {
  const t = useT()
  const clave = claveDe(lista)

  // Unidades. NO depende de `vista`: panear no cambia la curva.
  const curvas = useMemo(
    () => muestrearPolar(motor, lista),
    // `clave` resume el contenido: cambiar cuál se edita no re-muestrea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motor, clave],
  )

  const inicial = useMemo(() => encuadrarXY(curvas, AIRE_ENCUADRE) ?? VISTA_INICIAL, [curvas])
  const plano = usePlano(inicial, { cuadrado: true })
  const { visible, dentro, px, py, cortePx } = plano

  // Píxeles. Aquí sí manda la vista.
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
      botones={
        // El encuadre se calcula al montar y luego manda el usuario. Sin este
        // botón, escribir otra curva te deja mirando el sitio equivocado.
        <BotonAjustar onClick={() => plano.encuadrar(encuadrarXY(curvas, AIRE_ENCUADRE) ?? VISTA_INICIAL)} />
      }
    >
      <div className="pointer-events-none absolute bottom-1.5 start-1.5 rounded-lg bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/70">
        {t('computo.graf.pistaPolar', 'θ da dos vueltas completas')}
      </div>
    </PlanoSvg>
  )
}

/** Encuadra la curva entera. Lo usan polar y paramétrica, que no se autoencuadran. */
export function BotonAjustar({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('computo.graf.reencuadrar', 'Ajustar a la curva')}
      aria-label={t('computo.graf.reencuadrar', 'Ajustar a la curva')}
      className="rounded-lg bg-black/50 px-1.5 py-1 text-xs text-white/60 transition hover:text-white"
    >
      <Icono nombre="expandir" />
    </button>
  )
}
