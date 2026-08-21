import { hayCreditos } from '../cuenta/costos'
import { costoOperacion, type CtxCosto, type OperacionIA } from '../cuenta/catalogoIA'
import { useAjustes } from '../state/ajustesStore'
import { useT } from '../i18n/useT'

/**
 * El precio en créditos de lo que estás a punto de pedirle a la IA. Se pone
 * junto al botón que gasta, para decidir ANTES y no al ver la barra del mes.
 *
 * Con `op` el precio lo calcula el propio badge a partir del catálogo, y se
 * suscribe él mismo a la calidad de imagen: así ningún call-site puede pintar un
 * número rancio al cambiarla. `n` queda para los pocos casos sin operación.
 */

/**
 * El chip, sin condiciones. Lo usa la pantalla de precios (que se ve siempre).
 *
 * SIEMPRE lleva «≈»: la tarifa por operación es el precio anunciado, pero el
 * cobro real lo ajusta el servidor al gasto de la llamada (migración
 * 20260820000002), así que ningún número de aquí es exacto por definición.
 */
export function CreditosBadge({ n, lote = false }: { n: number; lote?: boolean }) {
  const t = useT()
  if (n <= 0) return null

  const etiqueta = lote
    ? t('creditos.porCada', '{n} c/u', { n: String(n) })
    : n === 1
      ? t('creditos.uno', '1 crédito')
      : t('creditos.n', `${n} créditos`, { n: String(n) })

  return (
    <span
      title={`${t(
        'creditos.ayuda',
        '1 respuesta = 1 crédito · un plan largo = 4 · una imagen 3 o 10 · un modelo 3D = 10',
      )} · ${t('creditos.aprox', 'Los precios en créditos son aproximados: el cobro sigue el consumo real.')}`}
      className="shrink-0 rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold text-violet-200"
    >
      ≈ {etiqueta}
    </span>
  )
}

type PropsCreditos =
  | { op: OperacionIA; ctx?: CtxCosto; n?: never }
  | { n: number; op?: never; ctx?: never }

/**
 * El badge junto a un botón. No se pinta en BYOK ni sin cuenta: ahí la IA va con
 * la clave del usuario y no hay créditos que contar.
 */
export function Creditos(props: PropsCreditos) {
  // Suscripción SIEMPRE, aunque esta operación no use imágenes hoy: el día que
  // las use, el precio ya se recalcula solo.
  const calidad = useAjustes((s) => s.calidadImagen)
  if (!hayCreditos()) return null

  if (props.op) {
    return (
      <CreditosBadge
        n={costoOperacion(props.op, { ...props.ctx, calidad })}
        lote={props.op.lote && props.ctx?.n === undefined}
      />
    )
  }
  return <CreditosBadge n={props.n} />
}
