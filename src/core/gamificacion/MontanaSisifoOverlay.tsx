import { useEffect } from 'react'
import { useT } from '../i18n/useT'
import { Icono } from '../ui/iconos/Icono'
import { useSisifoUi } from '../state/sisifoUiStore'
import { marcarSisifoVisto, useSisifo } from './sisifo'
import {
  CATEGORIAS,
  DIAS_META,
  DIAS_POR_SEMANA,
  INSIGNIAS,
  LIMITES_SEMANA,
  RANGOS,
  colorArcoiris,
  descInsignia,
  nombreCategoria,
  nombreInsignia,
  nombreRango,
} from './sisifoData'

/** Vértices de la silueta triangular de la montaña (base ancha, cima a la derecha). */
const MONTANA_BASE_Y = 192
const MONTANA_CIMA_Y = 20
/** Y del borde superior/inferior de cada uno de los 12 escalones (uno por rango). */
function bandaY(diasAcumulados: number): number {
  return MONTANA_BASE_Y - (diasAcumulados / DIAS_META) * (MONTANA_BASE_Y - MONTANA_CIMA_Y)
}

/**
 * Vista completa de la Montaña de Sísifo: la silueta con el marcador a la altura
 * actual, los 12 rangos (estratos de materiales), la rejilla de 52 insignias por
 * familia geológica y las estrellas permanentes. Abrirla apaga el badge.
 * Default export para cargarlo lazy desde App (igual que WrappedOverlay).
 */
export default function MontanaSisifoOverlay() {
  const t = useT()
  const cerrar = useSisifoUi((s) => s.cerrar)
  const vista = useSisifo()

  // Abrir la montaña cuenta como "visto": apaga el badge de insignia/estrella.
  useEffect(() => {
    if (vista) void marcarSisifoVisto(vista.insignias)
  }, [vista?.insignias, vista?.estrellaNueva]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!vista) return null

  const f = vista.altura / DIAS_META
  const mx = 40 + 120 * f
  const my = 190 - 170 * f
  const rango = RANGOS[vista.rango - 1]

  return (
    <div
      className="ui-panel-legible fixed inset-0 z-[70] overflow-y-auto backdrop-blur-sm"
      role="dialog"
      aria-label={t('sisifo.titulo', 'Montaña de Sísifo')}
    >
      <div className="mx-auto max-w-md px-4 py-5">
        {/* Cabecera */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white/90">
            <Icono nombre="montaña" /> {t('sisifo.titulo', 'Montaña de Sísifo')}
          </h2>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:bg-white/10"
            aria-label={t('sisifo.cerrar', 'Cerrar')}
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        {/* Montaña + lista de rangos */}
        <div className="grid grid-cols-2 gap-3">
          <svg viewBox="0 0 200 210" className="w-full" role="img" aria-label={t('sisifo.titulo', 'Montaña de Sísifo')}>
            <defs>
              <clipPath id="sisifoTriangulo">
                <polygon points="20,192 160,20 190,192" />
              </clipPath>
            </defs>
            {/* Escalones: un estrato de color por rango, alcanzados más vivos. */}
            <g clipPath="url(#sisifoTriangulo)">
              {RANGOS.map((r, i) => {
                const desde = i === 0 ? 0 : LIMITES_SEMANA[i - 1] * DIAS_POR_SEMANA
                const hasta = LIMITES_SEMANA[i] * DIAS_POR_SEMANA
                const yHasta = bandaY(desde)
                const yDesde = bandaY(hasta)
                const alcanzado = r.n <= vista.rango
                return (
                  <rect
                    key={r.n}
                    x="0"
                    y={yDesde}
                    width="200"
                    height={yHasta - yDesde}
                    fill={r.color}
                    opacity={alcanzado ? 0.4 : 0.12}
                  />
                )
              })}
            </g>
            <polygon points="20,192 160,20 190,192" fill="none" stroke="color-mix(in srgb, var(--ui-ink) 18%, transparent)" />
            {/* Ruta de ascenso */}
            <line x1="40" y1="190" x2="160" y2="20" stroke={rango.color} strokeWidth="2" strokeDasharray="4 4" opacity="0.75" />
            {vista.estrellas > 0 && <text x="160" y="16" textAnchor="middle" fontSize="16">⭐</text>}
            {/* Marcador del personaje a su altura */}
            <circle cx={mx} cy={my} r="6" fill={rango.color} stroke="var(--ui-panel-solido, var(--ui-panel))" strokeWidth="2" />
          </svg>

          <div className="flex flex-col">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
              {t('sisifo.rangos', 'Rangos')}
            </h3>
            <ol className="flex flex-col-reverse gap-0.5 text-[11px]">
            {RANGOS.map((r) => {
              const actual = r.n === vista.rango
              const alcanzado = r.n <= vista.rango
              return (
                <li
                  key={r.n}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${actual ? 'bg-white/10 font-semibold' : ''}`}
                  style={{ color: alcanzado ? r.color : 'color-mix(in srgb, var(--ui-ink) 35%, transparent)' }}
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: alcanzado ? r.color : 'color-mix(in srgb, var(--ui-ink) 15%, transparent)' }}
                  />
                  <span className="truncate">{nombreRango(r)}</span>
                </li>
              )
            })}
            </ol>
          </div>
        </div>

        {/* Progreso global */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span className="font-semibold" style={{ color: rango.color }}>{nombreRango(rango)}</span>
            <span>{t('sisifo.dia', 'Día')} {vista.altura}/{DIAS_META}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${(f * 100).toFixed(1)}%`, background: rango.color }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
            <span>{vista.insignias}/52 {t('sisifo.insignias', 'insignias')}</span>
            <span>{t('sisifo.gracias', 'Días de gracia')}: {vista.graciasRestantes}</span>
            <span className="text-white/70">⭐ ×{vista.estrellas}</span>
          </div>
        </div>

        {/* Rejilla de 52 insignias por familia geológica */}
        <div className="mt-4 space-y-3">
          {CATEGORIAS.map((cat) => (
            <section key={cat.es}>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: cat.color }}>
                <Icono nombre="gema" /> {nombreCategoria(cat)}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {INSIGNIAS.filter((b) => b.n >= cat.desde && b.n <= cat.hasta).map((b) => {
                  const ganada = b.n <= vista.insignias
                  // Insignias bloqueadas quedan en misterio: sin nombre ni descripción,
                  // se revelan al desbloquearlas.
                  return (
                    <div
                      key={b.n}
                      title={ganada ? descInsignia(b) : t('sisifo.bloqueada', 'Insignia bloqueada')}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${ganada ? 'border-white/10 bg-white/5' : 'border-white/5 bg-transparent opacity-45'}`}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: ganada ? colorArcoiris(b.n) : 'color-mix(in srgb, var(--ui-ink) 15%, transparent)' }}
                      />
                      <span className="truncate text-[11px] text-white/80">
                        {ganada ? nombreInsignia(b) : '?'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Cierre: cómo funciona el ascenso + la frase, en un mismo bloque. */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-white/60">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {t('sisifo.comoFunciona', 'Cómo funciona')}
          </h3>
          <ul className="list-disc space-y-1 pl-4">
            <li>{t('sisifo.ayuda1', 'Cada día con actividad en tus apps sube un escalón. La cima son 365 días.')}</li>
            <li>{t('sisifo.ayuda2', 'Cada 7 escalones ganas una insignia (52 en total) y cada tramo de semanas sube tu rango (12 en total).')}</li>
            <li>{t('sisifo.ayuda3', 'Si fallas un día tienes 2 días de gracia al mes: no pasa nada. Si se acaban, la piedra retrocede al inicio del rango actual.')}</li>
            <li>{t('sisifo.ayuda4', 'Al llegar a la cima ganas una estrella permanente y empiezas de nuevo desde abajo.')}</li>
          </ul>
          <p className="mt-3 border-t border-white/10 pt-3 text-center text-[11px] italic text-white/40">
            {t('sisifo.frase', 'Hay que imaginar a Sísifo feliz.')}
          </p>
        </div>
      </div>
    </div>
  )
}
