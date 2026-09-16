import { useEffect, useState } from 'react'
import type { HojaCorte, PlanCorte } from '../../muebles/corte'
import { letra } from '../../muebles/corte'
import type { Despiece } from '../../muebles/tipos'
import { useEditorUi } from '../../state/editorUiStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { BotonSecundario } from '../../../rooms/_shared/ui'
import { MARGEN_MM, paletaCorte, primitivasHoja, viewBoxHoja, type OpcsDibujo, type Primitiva } from './corteSvg'
import {
  descargarHojaPng,
  descargarHojaSvg,
  imprimirPlanCorte,
  sePuedeImprimir,
} from './exportarTaller'

/**
 * Diagrama de cortes: cómo se acomodan las piezas en cada hoja de tablero, con
 * su aprovechamiento y sus retazos. Pinta las mismas primitivas que se exportan
 * a SVG/PNG/impresión, así que lo que se ve es exactamente lo que se entrega.
 */

const OPCS: OpcsDibujo = { cotas: true, etiquetas: true, cantos: true }

function Prim({ p }: { p: Primitiva }) {
  if (p.t === 'rect') {
    return (
      <rect
        x={p.x}
        y={p.y}
        width={p.w}
        height={p.h}
        fill={p.rayado ? 'url(#rayadoTaller)' : (p.relleno ?? 'none')}
        stroke={p.borde ?? 'none'}
        strokeWidth={p.grosor ?? 1}
        strokeDasharray={p.guion}
      />
    )
  }
  if (p.t === 'linea') {
    return (
      <line
        x1={p.x1}
        y1={p.y1}
        x2={p.x2}
        y2={p.y2}
        stroke={p.color}
        strokeWidth={p.grosor}
        strokeDasharray={p.guion}
        strokeLinecap="round"
      />
    )
  }
  return (
    <text
      x={p.x}
      y={p.y}
      fill={p.color}
      fontSize={p.tam}
      fontWeight={p.peso ?? 400}
      textAnchor={p.ancla ?? 'start'}
      transform={p.girado ? `rotate(-90 ${p.x} ${p.y})` : undefined}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {p.txt}
    </text>
  )
}

function HojaSvg({ hoja, claro, zoom = 1 }: { hoja: HojaCorte; claro: boolean; zoom?: number }) {
  const pal = paletaCorte(claro)
  const prims = primitivasHoja(hoja, pal, OPCS)
  return (
    <svg
      viewBox={viewBoxHoja(hoja)}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: `${zoom * 100}%`, height: 'auto', display: 'block' }}
    >
      <defs>
        <pattern
          id="rayadoTaller"
          width={40}
          height={40}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={40} stroke={pal.sobrante} strokeWidth={12} />
        </pattern>
      </defs>
      <rect
        x={-MARGEN_MM}
        y={-MARGEN_MM}
        width={hoja.ancho + MARGEN_MM * 2}
        height={hoja.alto + MARGEN_MM * 2}
        fill={pal.fondo}
      />
      {prims.map((p, i) => (
        <Prim key={i} p={p} />
      ))}
    </svg>
  )
}

export function DiagramaCortes({
  plan,
  despiece,
  nombre,
}: {
  plan: PlanCorte
  despiece: Despiece
  nombre: string
}) {
  const t = useT()
  const claro = useEditorUi((s) => s.previewClaro)
  const [ampliada, setAmpliada] = useState<HojaCorte | null>(null)
  const [zoom, setZoom] = useState(1)

  // Escape cierra la hoja ampliada, como cualquier otra vista a pantalla
  // completa de la casa (y antes que el propio taller, que sigue detrás).
  useEffect(() => {
    if (!ampliada) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setAmpliada(null)
    }
    window.addEventListener('keydown', alPulsar, true)
    return () => window.removeEventListener('keydown', alPulsar, true)
  }, [ampliada])

  if (plan.grupos.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-[12px] text-white/50">
        {t('muebles.corte.vacio', 'Este mueble no lleva tableros que cortar.')}
      </p>
    )
  }

  const hojasTotales = plan.grupos.reduce((a, g) => a + g.hojas.length, 0)
  const desperdicio = plan.grupos.reduce((a, g) => a + g.desperdicioM2, 0)
  const aprov = plan.grupos.reduce((a, g) => a + g.m2Piezas, 0) / plan.grupos.reduce((a, g) => a + g.m2Hojas, 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Dato valor={String(hojasTotales)} etiqueta={t('muebles.corte.hojas', 'Hojas')} />
        <Dato
          valor={`${Math.round((aprov || 0) * 100)} %`}
          etiqueta={t('muebles.corte.aprov', 'Aprovechamiento')}
        />
        <Dato
          valor={`${desperdicio.toFixed(2)} m²`}
          etiqueta={t('muebles.corte.desperdicio', 'Desperdicio')}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sePuedeImprimir() && (
          <BotonSecundario
            pequeno
            onClick={() =>
              void imprimirPlanCorte(plan, despiece, nombre, {
                hoja: t('muebles.corte.hoja', 'Hoja'),
                aprov: t('muebles.corte.aprov', 'Aprovechamiento'),
                pieza: t('muebles.corte.pieza', 'Pieza'),
                medidas: t('muebles.corte.medidas', 'Medidas (mm)'),
                cant: t('muebles.corte.piezasTotal', 'piezas'),
                material: t('muebles.corte.material', 'Material'),
              })
            }
          >
            <Icono nombre="imprimir" /> {t('muebles.corte.imprimir', 'Imprimir / PDF')}
          </BotonSecundario>
        )}
      </div>

      {plan.grupos.map((g) => (
        <div key={`${g.materialId}-${g.grosor}`} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold text-white/70">
              {t(`muebles.mat.${g.materialId}`, g.materialId)} · {g.grosor} mm
            </p>
            <p className="text-[10px] tabular-nums text-white/40">
              {t('muebles.corte.nHojas', '{n} hojas', { n: g.hojas.length })} ·{' '}
              {Math.round(g.aprovechamiento * 100)} %
            </p>
          </div>
          {g.hojas.map((h) => (
            <div key={h.id} className="overflow-hidden rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAmpliada(h)
                  setZoom(1)
                }}
                title={t('muebles.corte.ampliar', 'Ver en grande')}
                className="block w-full"
              >
                <HojaSvg hoja={h} claro={claro} />
              </button>
              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-2.5 py-1.5">
                <span className="text-[10px] tabular-nums text-white/45">
                  {t('muebles.corte.hojaDe', 'Hoja {n} de {total}', { n: h.indice, total: g.hojas.length })} ·{' '}
                  {h.piezas.length} {t('muebles.corte.piezasTotal', 'piezas')} ·{' '}
                  {Math.round(h.aprovechamiento * 100)} %
                </span>
                <span className="flex gap-1">
                  <BotonIcono
                    titulo={t('muebles.corte.descargarSvg', 'Descargar SVG')}
                    onClick={() => void descargarHojaSvg(h, nombre)}
                    icono="descargar"
                  />
                  <BotonIcono
                    titulo={t('muebles.corte.descargarPng', 'Descargar imagen')}
                    onClick={() => void descargarHojaPng(h, nombre)}
                    icono="imagen"
                  />
                </span>
              </div>
              {h.sobrantes.some((s) => s.utilizable) && (
                <p className="border-t border-white/5 px-2.5 py-1.5 text-[10px] text-white/35">
                  {t('muebles.corte.retazos', 'Retazos:')}{' '}
                  {h.sobrantes
                    .filter((s) => s.utilizable)
                    .map((s) => `${s.ancho} × ${s.alto}`)
                    .join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('muebles.corte.leyenda', 'Leyenda')}
        </p>
        <div className="grid gap-1 text-[11px] sm:grid-cols-2">
          {despiece.tableros.map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span
                className="grid h-4 w-5 shrink-0 place-items-center rounded text-[9px] font-bold text-black/70"
                style={{ background: p.color }}
              >
                {letra(i)}
              </span>
              <span className="min-w-0 flex-1 truncate text-white/65">{t(p.clave, p.nombreEs)}</span>
              <span className="shrink-0 tabular-nums text-white/35">
                {p.cantidad}× {p.ancho}×{p.alto}
              </span>
            </div>
          ))}
        </div>
      </div>

      {ampliada && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/90"
          onClick={() => setAmpliada(null)}
        >
          {/* Barra propia con fondo: si no, se lee encima del encabezado del
              taller, que sigue ahí detrás. */}
          <div
            className="flex items-center justify-between gap-2 border-b border-white/10 bg-[var(--ui-panel)] px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-semibold">{ampliada.id}</span>
            <span className="flex items-center gap-1.5">
              <BotonIcono
                titulo={t('muebles.corte.alejar', 'Alejar')}
                onClick={() => setZoom((z) => Math.max(1, z - 1))}
                icono="alejar"
              />
              <span className="w-8 text-center text-xs tabular-nums text-white/60">{zoom}×</span>
              <BotonIcono
                titulo={t('muebles.corte.acercar', 'Acercar')}
                onClick={() => setZoom((z) => Math.min(4, z + 1))}
                icono="acercar"
              />
              <BotonSecundario pequeno onClick={() => setAmpliada(null)}>
                {t('ui.cerrar', 'Cerrar')}
              </BotonSecundario>
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            <HojaSvg hoja={ampliada} claro={claro} zoom={zoom} />
          </div>
        </div>
      )}
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

function BotonIcono({
  titulo,
  onClick,
  icono,
}: {
  titulo: string
  onClick: () => void
  icono: 'descargar' | 'imagen' | 'acercar' | 'alejar'
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="ui-boton grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-xs transition hover:bg-white/20"
    >
      <Icono nombre={icono} />
    </button>
  )
}
