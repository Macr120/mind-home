import { useAjustes } from '../../state/ajustesStore'
import type { CalidadImagen } from '../../cuenta/calidadImagen'
import { costoOperacion, costoUnitario } from '../../cuenta/catalogoIA'
import { gruposIA } from '../../cuenta/gruposIA'
import { CREDITOS, hayCreditos } from '../../cuenta/costos'
import { CreditosBadge } from '../Creditos'
import { Icono } from '../iconos/Icono'
import { useT } from '../../i18n/useT'
import { vivo } from '../estilos'
import { ActivarIASection } from './ActivarIASection'

/**
 * IA: cómo se activa y lo que cuesta. Lo primero es el interruptor —antes solo
 * vivía en el panel del chat y nadie lo encontraba—, y debajo la calidad de
 * imagen (que decide proveedor y tarifa) y la tabla completa cuarto por cuarto.
 *
 * Se ve SIEMPRE, también sin cuenta: es justo lo que hace falta para decidir si
 * recargar. Por eso usa `CreditosBadge` (el chip puro) y no `Creditos`, que se
 * oculta cuando no hay créditos que gastar.
 */
export function EditorIASection({ embed, sinTitulo }: { embed?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const calidad = useAjustes((s) => s.calidadImagen)
  const setCalidad = useAjustes((s) => s.setCalidadImagen)

  const calidades: { id: CalidadImagen; label: string; desc: string }[] = [
    {
      id: 'rapida',
      label: t('ia.calidad.rapida', 'Rápida'),
      desc: t('ia.calidad.rapida.desc', 'Buena y barata. Es la que uso salvo que digas otra cosa.'),
    },
    {
      id: 'buena',
      label: t('ia.calidad.buena', 'Buena'),
      desc: t('ia.calidad.buena.desc', 'Más detalle y mejor texto dentro de la imagen.'),
    },
  ]

  return (
    <div className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}>
      {!sinTitulo && !embed && <p className="text-sm font-semibold">{t('ia.titulo', 'IA: activar y precios')}</p>}

      <ActivarIASection />

      {/* Calidad de imagen: la única palanca que mueve los precios de la tabla. */}
      <div data-tut="ia.calidad" className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ia.calidad.titulo', 'Calidad de las imágenes')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {calidades.map((c) => {
            const activo = calidad === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCalidad(c.id)}
                className={`flex flex-col items-start gap-1 rounded-md border px-2 py-1.5 text-left transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="flex w-full items-center gap-1.5">
                  <span className="flex-1 text-xs font-semibold">{c.label}</span>
                  <CreditosBadge n={CREDITOS[c.id === 'buena' ? 'imagen_alta' : 'imagen']} />
                </span>
                <span className="text-[10px] leading-snug opacity-70">{c.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tarifas base: la regla con la que se arma todo lo de abajo. */}
      <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] leading-relaxed text-white/45">
        {t(
          'ia.tarifas',
          'Una respuesta cuesta 1 crédito · un plan largo 3 · una imagen {img} · un modelo 3D 10.',
          { img: String(CREDITOS[calidad === 'buena' ? 'imagen_alta' : 'imagen']) },
        )}
      </p>

      {/* La tabla completa, cuarto por cuarto. */}
      <div data-tut="ia.tabla" className="space-y-4">
      {gruposIA().map((g) => (
        <div key={g.id} className="space-y-1">
          <p className="texto-vivo text-[10px] font-bold uppercase tracking-wider" style={vivo(g.color ?? 'currentColor')}>
            <Icono emoji={g.emoji} /> {t(g.clave, g.es)}
          </p>
          <div className="divide-y divide-white/5 rounded-md border border-white/10 bg-white/5">
            {g.ops.map((op) => (
              <div key={op.id} className="flex items-start gap-2 px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-snug text-white/75">{t(op.clave, op.es)}</p>
                  {op.dondeEs && (
                    <p className="text-[10px] leading-snug text-white/35">
                      {t(op.dondeClave ?? op.dondeEs, op.dondeEs)}
                    </p>
                  )}
                  {op.notaEs && (
                    <p className="text-[10px] leading-snug text-white/45">
                      {t(op.notaClave ?? op.notaEs, op.notaEs)}
                    </p>
                  )}
                </div>
                <CreditosBadge
                  n={op.lote ? costoUnitario(op, { calidad }) : costoOperacion(op, { calidad })}
                  aprox={op.aprox}
                  lote={op.lote}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>

      <p className="text-[10px] leading-snug text-white/35">
        {hayCreditos()
          ? t('ia.precios.pie', 'El cobro lo hace el servidor: esto es lo que costará antes de pedirlo.')
          : t(
              'ia.precios.pieSinCuenta',
              'Con tu propia clave de IA no se gastan créditos: pagas directo a tu proveedor.',
            )}
      </p>
    </div>
  )
}
