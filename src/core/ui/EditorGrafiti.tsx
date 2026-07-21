import { useGrafitis } from '../state/grafitiStore'
import type { HerramientaGrafiti } from '../house/grafitiLienzo'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

/** Paleta fija del grafiti (12 colores). */
const COLORES = [
  '#ffffff', '#111827', '#e11d48', '#f97316', '#facc15', '#22c55e',
  '#14b8a6', '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e',
]
const GROSORES = [7, 14, 26]

const btn =
  'grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white transition active:scale-90'

/**
 * Overlay del modo pintar del juguete Grafiti: un área transparente captura el
 * puntero (los trazos los raycastea GrafitiController contra el muro) y una barra
 * inferior tipo Paint ofrece colores, grosores, herramientas y acciones.
 */
export function EditorGrafiti() {
  const t = useT()
  const modo = useGrafitis((s) => s.modo)
  const color = useGrafitis((s) => s.color)
  const grosor = useGrafitis((s) => s.grosor)
  const herramienta = useGrafitis((s) => s.herramienta)
  const puedeDeshacer = useGrafitis((s) => s.puedeDeshacer)
  if (!modo) return null
  const g = useGrafitis.getState()

  const herrBtn = (h: HerramientaGrafiti, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      onClick={() => g.setHerramienta(h)}
      title={etiqueta}
      aria-label={etiqueta}
      className={`${btn} ${herramienta === h ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono nombre={icono} />
    </button>
  )

  return (
    <div className="absolute inset-0 z-50">
      {/* Área de captura: transparente (se ve el muro 3D); bloquea clic-para-caminar y órbita. */}
      <div
        data-lienzo-grafiti
        className="absolute inset-0 cursor-crosshair"
        style={{ touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Encabezado: título y salir sin guardar. */}
      <div className="pointer-events-none absolute left-0 right-0 top-3 flex items-start justify-center">
        <div className="ui-hud ui-pop pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white">
          <Icono nombre="paleta" /> {t('graf.titulo', 'Grafiti')}
          <button
            type="button"
            onClick={() => g.salir()}
            title={t('graf.salir', 'Salir sin guardar')}
            aria-label={t('graf.salir', 'Salir sin guardar')}
            className="ml-2 rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Barra tipo Paint. */}
      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center px-2">
        <div className="ui-hud ui-pop pointer-events-auto flex max-w-full flex-col gap-2 rounded-xl border border-white/10 p-2">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => g.setColor(c)}
                title={t('graf.color', 'Color')}
                aria-label={t('graf.color', 'Color')}
                style={{ background: c }}
                className={`h-7 w-7 rounded-full border transition active:scale-90 ${
                  color === c ? 'scale-110 border-white ring-2 ring-white/70' : 'border-white/20'
                }`}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {GROSORES.map((gr) => (
              <button
                key={gr}
                type="button"
                onClick={() => g.setGrosor(gr)}
                title={t('graf.grosor', 'Grosor')}
                aria-label={t('graf.grosor', 'Grosor')}
                className={`${btn} ${grosor === gr ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <span
                  className="rounded-full bg-white"
                  style={{ width: 4 + gr * 0.55, height: 4 + gr * 0.55 }}
                />
              </button>
            ))}
            <span className="mx-1 h-6 w-px bg-white/15" />
            {herrBtn('pincel', 'pincel', t('graf.pincel', 'Pincel'))}
            {herrBtn('spray', 'spray', t('graf.spray', 'Spray'))}
            {herrBtn('borrador', 'borrador', t('graf.borrador', 'Borrador'))}
            <button
              type="button"
              onClick={() => g.rellenar()}
              title={t('graf.bote', 'Rellenar todo de un color')}
              aria-label={t('graf.bote', 'Rellenar todo de un color')}
              className={`${btn} bg-white/10 hover:bg-white/20`}
            >
              <Icono nombre="bote" />
            </button>
            <span className="mx-1 h-6 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => g.deshacer()}
              disabled={!puedeDeshacer}
              title={t('graf.deshacer', 'Deshacer')}
              aria-label={t('graf.deshacer', 'Deshacer')}
              className={`${btn} bg-white/10 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icono nombre="deshacer" />
            </button>
            <button
              type="button"
              onClick={() => g.limpiar()}
              title={t('graf.limpiar', 'Limpiar')}
              aria-label={t('graf.limpiar', 'Limpiar')}
              className={`${btn} bg-white/10 hover:bg-white/20`}
            >
              <Icono nombre="basura" />
            </button>
            <span className="mx-1 h-6 w-px bg-white/15" />
            {modo.existente && (
              <button
                type="button"
                onClick={() => void g.borrarActual()}
                className="h-10 rounded-lg border border-rose-400/60 bg-rose-700/80 px-3 text-xs font-semibold text-white transition hover:bg-rose-600 active:scale-95"
              >
                {t('graf.borrar', 'Borrar grafiti')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void g.guardar()}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-emerald-400/60 bg-emerald-600 px-3 text-xs font-semibold texto-cta transition hover:bg-emerald-500 active:scale-95"
            >
              <Icono nombre="guardar" /> {t('graf.guardar', 'Guardar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
