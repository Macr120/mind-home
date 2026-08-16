import type { ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ALTOS_PLANO } from './constantes'
import { etiqueta, marcasVisibles, pasoRejilla } from './ejes'
import { MARGEN_PLANO, useAltoPlano, type Plano } from './usePlano'

/**
 * El plano dibujado: rejilla, ejes, rótulos, curvas y los controles de zoom.
 *
 * Lo comparten los cuatro tipos de gráfica. Recibe los trazos YA en píxeles
 * porque quien muestrea es el único que sabe de dónde salen los puntos —de la
 * vista en y=f(x), de θ en polar, de t en paramétrica— y ese reparto es justo lo
 * que permite que el polar no se remuestree al panear.
 *
 * Fuera de aquí quedan a propósito el muestreo, las raíces, la lectura del
 * cursor y los chips del pie: eso es dominio de cada tipo.
 */

export interface Trazo {
  id: string | number
  color: string
  /** Cada tramo continuo, ya en píxeles: "12.3,45.6 13.1,44.0 …". */
  tramos: string[]
  grosor?: number
}

const TENUE = 'color-mix(in srgb, var(--ui-ink) 10%, transparent)'
const EJE = 'color-mix(in srgb, var(--ui-ink) 40%, transparent)'
const TEXTO = 'color-mix(in srgb, var(--ui-ink) 45%, transparent)'

export function PlanoSvg({
  plano,
  trazos,
  alto,
  botones,
  capa,
  alMover,
  alSalir,
  children,
  ancla,
}: {
  plano: Plano
  trazos: Trazo[]
  /**
   * Alto FIJO, en CSS (no una clase). Sin él manda la preferencia del usuario y
   * aparece el botón que la cambia: así los planos sueltos la heredan sin tener
   * que reenviar nada.
   */
  alto?: string
  /** Botones extra en la columna de controles (el ojo de lectura del 2D). */
  botones?: ReactNode
  /** Va DENTRO del `<svg>`, encima de las curvas (raíces, cursor, puntos). */
  capa?: ReactNode
  /** Se compone con el paneo: no hace falta reenviarlo a mano. */
  alMover?: (e: React.PointerEvent) => void
  alSalir?: () => void
  /** HTML posicionado dentro del contenedor (los chips de lectura). */
  children?: ReactNode
  ancla?: string
}) {
  const t = useT()
  const { visible, tam, dentro, px, py, caja, manejadores } = plano
  const preferido = useAltoPlano()
  const nombreAlto = t(ALTOS_PLANO[preferido.nivel].clave, ALTOS_PLANO[preferido.nivel].labelEs)

  const pasoX = pasoRejilla(visible.x1 - visible.x0)
  const pasoY = pasoRejilla(visible.y1 - visible.y0)
  const marcasX = marcasVisibles(visible.x0, visible.x1, pasoX)
  const marcasY = marcasVisibles(visible.y0, visible.y1, pasoY)

  return (
    <div
      ref={caja}
      data-tut={ancla}
      {...manejadores}
      onPointerMove={(e) => {
        manejadores.onPointerMove(e)
        alMover?.(e)
      }}
      onPointerLeave={alSalir}
      // El alto va en `style` y no en una clase porque los tres niveles se miden
      // en `vh`: el `ResizeObserver` de `usePlano` mide la caja de verdad, así
      // que el plano se reencuadra solo al cambiarlo.
      style={{ height: alto ?? preferido.alto }}
      className="relative touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-black/25"
    >
      <svg width={tam.w} height={tam.h} className="block">
        {marcasX.map((x) => (
          <line key={`gx${x}`} x1={px(x)} y1={MARGEN_PLANO.arr} x2={px(x)} y2={MARGEN_PLANO.arr + dentro.h} stroke={TENUE} />
        ))}
        {marcasY.map((y) => (
          <line key={`gy${y}`} x1={MARGEN_PLANO.izq} y1={py(y)} x2={MARGEN_PLANO.izq + dentro.w} y2={py(y)} stroke={TENUE} />
        ))}

        {visible.y0 <= 0 && visible.y1 >= 0 && (
          <line
            x1={MARGEN_PLANO.izq}
            y1={py(0)}
            x2={MARGEN_PLANO.izq + dentro.w}
            y2={py(0)}
            stroke={EJE}
            strokeWidth={1.5}
          />
        )}
        {visible.x0 <= 0 && visible.x1 >= 0 && (
          <line
            x1={px(0)}
            y1={MARGEN_PLANO.arr}
            x2={px(0)}
            y2={MARGEN_PLANO.arr + dentro.h}
            stroke={EJE}
            strokeWidth={1.5}
          />
        )}

        {marcasX.map((x) => (
          <text key={`tx${x}`} x={px(x)} y={tam.h - 6} textAnchor="middle" fontSize={9} fill={TEXTO}>
            {etiqueta(x, pasoX)}
          </text>
        ))}
        {marcasY.map((y) => (
          <text key={`ty${y}`} x={MARGEN_PLANO.izq - 4} y={py(y) + 3} textAnchor="end" fontSize={9} fill={TEXTO}>
            {etiqueta(y, pasoY)}
          </text>
        ))}

        {trazos.map((tr) =>
          tr.tramos.map((puntos, i) => (
            <polyline
              key={`${tr.id}-${i}`}
              points={puntos}
              fill="none"
              stroke={tr.color}
              strokeWidth={tr.grosor ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}

        {capa}
      </svg>

      <div className="absolute end-1.5 top-1.5 flex flex-col gap-1">
        <BotonPlano etiqueta="+" titulo={t('computo.graf.acercar', 'Acercar')} onClick={() => plano.zoomCentro(1.4)} />
        <BotonPlano
          etiqueta="−"
          titulo={t('computo.graf.alejar', 'Alejar')}
          onClick={() => plano.zoomCentro(1 / 1.4)}
        />
        {/* Solo cuando el alto NO viene impuesto: si lo fija quien monta el
            plano, ofrecer un botón que no manda sería mentir. */}
        {alto == null && (
          <button
            type="button"
            onClick={preferido.ciclar}
            title={t('computo.graf.alto', 'Alto de la gráfica: {nivel}', { nivel: nombreAlto })}
            aria-label={t('computo.graf.alto', 'Alto de la gráfica: {nivel}', { nivel: nombreAlto })}
            className="rounded-lg bg-black/50 px-1.5 py-1 text-xs text-white/60 transition hover:text-white"
          >
            <Icono nombre="medida" />
          </button>
        )}
        {botones}
        <button
          type="button"
          onClick={plano.reiniciar}
          title={t('computo.graf.centrar', 'Centrar')}
          aria-label={t('computo.graf.centrar', 'Centrar')}
          className="rounded-lg bg-black/50 px-1.5 py-1 text-xs text-white/60 transition hover:text-white"
        >
          <Icono nombre="centrar" />
        </button>
      </div>

      {children}
    </div>
  )
}

/** Botón cuadrado de la columna de controles del plano. */
export function BotonPlano({
  etiqueta: texto,
  titulo,
  onClick,
}: {
  etiqueta: string
  titulo: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className="rounded-lg bg-black/50 px-2 py-1 text-sm font-bold leading-none text-white/60 transition hover:text-white"
    >
      {texto}
    </button>
  )
}
