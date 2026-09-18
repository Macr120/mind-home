import type { PlanCorte } from '../../muebles/corte'
import type { AvisoMueble, Despiece } from '../../muebles/tipos'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { DiagramaCortes } from './DiagramaCortes'

/**
 * Lista de corte: lo que hay que comprar y cortar. Arriba el despiece en tabla
 * (que es lo que el carpintero se lleva al taller) y debajo el diagrama con el
 * acomodo en las hojas.
 */

export function AvisosMueble({ avisos }: { avisos: AvisoMueble[] }) {
  const t = useT()
  if (avisos.length === 0) return null
  return (
    <div className="space-y-1.5">
      {avisos.map((a, i) => (
        <p
          key={`${a.clave}-${i}`}
          className={`flex gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
            a.nivel === 'error'
              ? 'border-red-400/30 bg-red-400/10 text-red-300'
              : 'border-amber-400/25 bg-amber-400/10 text-amber-200/90'
          }`}
        >
          <Icono nombre="alerta" />
          <span>{t(a.clave, a.textoEs, a.vars)}</span>
        </p>
      ))}
    </div>
  )
}

/** Lados con canto de una pieza, en corto: «arr+izq». */
function cantosCortos(c: Despiece['tableros'][number]['cantos'], t: (k: string, d: string) => string): string {
  const partes = [
    c.arriba && t('muebles.canto.arr', 'arr'),
    c.abajo && t('muebles.canto.aba', 'aba'),
    c.izq && t('muebles.canto.izq', 'izq'),
    c.der && t('muebles.canto.der', 'der'),
  ].filter(Boolean)
  return partes.length ? partes.join('+') : '—'
}

export function PanelDespiece({
  despiece,
  plan,
  nombre,
}: {
  despiece: Despiece
  plan: PlanCorte
  nombre: string
}) {
  const t = useT()
  const totalPiezas = despiece.tableros.reduce((a, x) => a + x.cantidad, 0)
  const m2 = despiece.areaM2.reduce((a, x) => a + x.m2, 0)
  const ml = despiece.cantoMl.reduce((a, x) => a + x.ml, 0)
  const mlTubo = despiece.tuboMl.reduce((a, x) => a + x.ml, 0)

  return (
    <div className="space-y-3">
      <AvisosMueble avisos={[...despiece.avisos, ...plan.avisos]} />

      <div className="grid grid-cols-3 gap-2">
        <Dato valor={String(totalPiezas)} etiqueta={t('muebles.desp.piezas', 'Piezas')} />
        <Dato valor={`${m2.toFixed(2)} m²`} etiqueta={t('muebles.desp.tablero', 'Tablero')} />
        <Dato
          valor={mlTubo > 0 ? `${mlTubo.toFixed(1)} m` : `${ml.toFixed(1)} m`}
          etiqueta={mlTubo > 0 ? t('muebles.desp.tubo', 'Tubo') : t('muebles.desp.canto', 'Canto')}
        />
      </div>

      {despiece.tableros.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
                <th className="px-2 py-1.5 text-start font-semibold">{t('muebles.desp.pieza', 'Pieza')}</th>
                <th className="px-1 py-1.5 text-end font-semibold">{t('muebles.desp.cant', 'Cant.')}</th>
                <th className="px-2 py-1.5 text-end font-semibold">{t('muebles.desp.medidas', 'Medidas')}</th>
                <th className="px-2 py-1.5 text-end font-semibold">{t('muebles.desp.cantos', 'Cantos')}</th>
              </tr>
            </thead>
            <tbody>
              {despiece.tableros.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: p.color }}
                      />
                      <span className="min-w-0 truncate">{t(p.clave, p.nombreEs)}</span>
                    </span>
                    <span className="block text-[9px] text-white/30">
                      {t(`muebles.mat.${p.materialId}`, p.materialId)} · {p.grosor} mm
                    </span>
                  </td>
                  <td className="px-1 py-1.5 text-end tabular-nums text-white/70">{p.cantidad}</td>
                  <td className="px-2 py-1.5 text-end tabular-nums">
                    {p.forma === 'circular' ? `Ø ${p.ancho}` : `${p.ancho} × ${p.alto}`}
                  </td>
                  <td className="px-2 py-1.5 text-end text-[10px] text-white/45">
                    {cantosCortos(p.cantos, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {despiece.tubos.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <p className="bg-white/5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('muebles.desp.metal', 'Estructura metálica')}
          </p>
          <table className="w-full text-[11px]">
            <tbody>
              {despiece.tubos.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-2 py-1.5">{t(p.clave, p.nombreEs)}</td>
                  <td className="px-1 py-1.5 text-end tabular-nums text-white/70">{p.cantidad}</td>
                  <td className="px-2 py-1.5 text-end tabular-nums">{p.largo} mm</td>
                  <td className="px-2 py-1.5 text-end text-[10px] text-white/45">
                    {p.seccion.join('×')} × {p.pared}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {despiece.herrajes.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('muebles.desp.herrajes', 'Herrajes')}
          </p>
          <p className="text-[11px] leading-relaxed text-white/60">
            {despiece.herrajes
              .map((h) => `${h.cantidad} ${h.unidad} · ${t(h.clave, h.nombreEs)}`)
              .join('  ·  ')}
          </p>
        </div>
      )}

      <DiagramaCortes plan={plan} despiece={despiece} nombre={nombre} />
    </div>
  )
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
      <p className="text-base font-bold tabular-nums">{valor}</p>
      <p className="text-[10px] leading-tight text-white/40">{etiqueta}</p>
    </div>
  )
}
