import { useCanchas, CANCHAS, esCancha, claseDeCancha, type ClaseCancha } from '../state/canchasStore'
import { useDiseño } from '../state/disenoStore'
import { ColorPicker } from './editor/ColorPicker'
import { SliderProp } from './editor/SliderProp'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const btn =
  'flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-white transition active:scale-95'

/** Paleta deportiva compacta; el color por defecto de la clase va como primer swatch. */
const PALETA_BASE = [
  '#22c55e', '#2563eb', '#0ea5e9', '#b45309', '#c2410c',
  '#dc2626', '#7c3aed', '#0d9488', '#475569',
]
const paletaDe = (base: string) => [base, ...PALETA_BASE.filter((c) => c !== base)]

/** Rango de tamaño de las canchas (uniforme, 1 = tamaño real). */
const ESCALA_MIN = 0.5
const ESCALA_MAX = 2

/**
 * Overlay del editor de Canchas: colocando, un fantasma con el color/tamaño
 * elegidos sigue el cursor y el clic coloca; en modo Editar, el clic selecciona
 * una cancha y sus controles se aplican en vivo (CanchasController).
 */
export function EditorCanchas() {
  const t = useT()
  const activo = useCanchas((s) => s.activo)
  const clase = useCanchas((s) => s.clase)
  const color = useCanchas((s) => s.color)
  const escala = useCanchas((s) => s.escala)
  const sel = useCanchas((s) => s.sel)
  const selObj = useDiseño((s) => s.objetos.find((o) => o.id === sel))
  if (!activo) return null
  const c = useCanchas.getState()
  const d = useDiseño.getState()
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const selCancha = selObj && esCancha(selObj.tipo) ? selObj : undefined
  const selDef = selCancha ? CANCHAS[claseDeCancha(selCancha.tipo)] : undefined

  const claseBtn = (cl: ClaseCancha) => (
    <button
      type="button"
      data-tut={`canchas.clase.${cl}`}
      onClick={() => c.setClase(cl)}
      title={t(`canchas.clase.${cl}`, CANCHAS[cl].corto)}
      aria-label={t(`canchas.clase.${cl}`, CANCHAS[cl].corto)}
      className={`${btn} ${clase === cl ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono emoji={CANCHAS[cl].icon} /> {t(`canchas.clase.${cl}`, CANCHAS[cl].corto)}
    </button>
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Encabezado. */}
      <div className="absolute left-0 right-0 top-3 flex items-start justify-center">
        <div
          data-tut="canchas.header"
          className="ui-hud ui-pop pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Icono nombre="cancha" /> {t('room.canchas.nombre', 'Canchas')}
          <button
            type="button"
            data-tut="canchas.salir"
            onClick={() => c.salir()}
            title={t('infra.salirEditor', 'Salir del editor')}
            aria-label={t('infra.salirEditor', 'Salir del editor')}
            className="ml-2 rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Barra: clases + herramientas arriba, panel contextual abajo. */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center px-2">
        <div
          data-tut="canchas.barra"
          data-tut-zona="app:canchas"
          className="ui-hud ui-pop pointer-events-auto flex w-full max-w-md flex-col gap-2 rounded-xl border border-white/10 p-2"
        >
          <div data-tut="canchas.clases" className="flex flex-wrap items-center justify-center gap-1.5">
            {claseBtn('futbol')}
            {claseBtn('tenis')}
            {claseBtn('basket')}
            <span className="mx-1 h-6 w-px bg-white/15" />
            {clase !== null && (
              <button
                type="button"
                data-tut="canchas.rotar"
                onClick={() => c.rotar()}
                title={t('canchas.rotar', 'Rotar (R)')}
                aria-label={t('canchas.rotar', 'Rotar (R)')}
                className={`${btn} bg-white/10 hover:bg-white/20`}
              >
                <Icono nombre="rotar-der" />
              </button>
            )}
            <button
              type="button"
              data-tut="canchas.editar"
              onClick={() => c.setClase(null)}
              title={t('canchas.editar', 'Editar cancha')}
              aria-label={t('canchas.editar', 'Editar cancha')}
              className={`${btn} ${clase === null ? 'border-sky-400/60 bg-sky-600' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Icono nombre="editar" /> {t('canchas.editar', 'Editar')}
            </button>
          </div>

          {clase !== null ? (
            // Colocando: color y tamaño de la PRÓXIMA cancha (los usa el fantasma).
            <div data-tut="canchas.panel.colocar" className="space-y-2 px-1">
              <ColorPicker
                value={color ?? CANCHAS[clase].color}
                onChange={(col) => c.setColor(col)}
                paleta={paletaDe(CANCHAS[clase].color)}
              />
              <SliderProp
                label={t('canchas.tamano', 'Tamaño')}
                value={escala}
                min={ESCALA_MIN}
                max={ESCALA_MAX}
                step={0.05}
                fmt={pct}
                onChange={(v) => c.setEscala(v)}
                onReset={() => c.setEscala(1)}
              />
            </div>
          ) : !selCancha || sel == null ? (
            <p data-tut="canchas.panel.vacio" className="px-1 text-center text-[11px] text-white/50">
              {t('canchas.tocaParaEditar', 'Toca una cancha del mapa para editarla.')}
            </p>
          ) : (
            // Editando la seleccionada: cambios EN VIVO sobre el objeto del mapa.
            <div data-tut="canchas.panel.editar" className="space-y-2 px-1">
              <ColorPicker
                value={selCancha.color}
                onChange={(col) => void d.setObjetoColor(sel, col)}
                paleta={paletaDe(selDef!.color)}
              />
              <SliderProp
                label={t('canchas.tamano', 'Tamaño')}
                value={selCancha.escala ?? 1}
                min={ESCALA_MIN}
                max={ESCALA_MAX}
                step={0.05}
                fmt={pct}
                onChange={(v) => void d.setObjetoEscala(sel, v)}
                onReset={() => void d.setObjetoEscala(sel, 1)}
                extra={
                  <>
                    <button
                      type="button"
                      onClick={() => void d.setObjetoRotacion(sel, ((selCancha.rotY ?? 0) + 90) % 360)}
                      title={t('canchas.rotar', 'Rotar (R)')}
                      aria-label={t('canchas.rotar', 'Rotar (R)')}
                      className="rounded px-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icono nombre="rotar-der" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void d.removeObjeto(sel)
                        c.seleccionar(null)
                      }}
                      title={t('canchas.quitar', 'Quitar cancha')}
                      aria-label={t('canchas.quitar', 'Quitar cancha')}
                      className="rounded px-1 text-rose-300/70 transition hover:bg-rose-500/20 hover:text-rose-200"
                    >
                      <Icono nombre="basura" />
                    </button>
                  </>
                }
              />
            </div>
          )}

          <p className="px-1 text-center text-[10px] leading-tight text-white/50">
            {t('canchas.ayuda', 'Toca el mapa para colocar; con Editar, toca una cancha para cambiar su color, tamaño o rotación.')}
          </p>
        </div>
      </div>
    </div>
  )
}
