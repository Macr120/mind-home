import { useState } from 'react'
import type { Pieza3D } from '../../chat/mascotas'
import {
  PRESETS_ANIMACION,
  capturarPose,
  aplicarPose,
  type ActivacionAnimacion,
  type AnimacionModelo,
  type PresetAnimacionId,
} from '../../house/animacion'
import { useEditorUi } from '../../state/editorUiStore'
import { SliderProp } from './SliderProp'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Herramientas de animación compartidas por objetos y personajes: preset de
 * conjunto (girar/flotar/…), velocidad e intensidad, cuándo se activa en el
 * mapa y — en modelos de piezas — el editor de poses (keyframes que la escena
 * interpola en bucle). El resultado se ve con el botón ▶ del preview.
 */
export function EditorAnimacion({
  anim,
  onChange,
  piezas,
  onAplicarPose,
}: {
  anim?: AnimacionModelo
  /** Cada cambio entrega la animación completa (undefined = quitarla). */
  onChange: (a: AnimacionModelo | undefined) => void
  /** Modelo de piezas actual: habilita el editor de poses. */
  piezas?: Pieza3D[]
  /** Deja las piezas reales en una pose para retocarla con el editor de piezas. */
  onAplicarPose?: (p: Pieza3D[]) => void
}) {
  const t = useT()
  const setPiezasControles = useEditorUi((s) => s.setPiezasControles)
  const [poseSel, setPoseSel] = useState(0)

  const a: AnimacionModelo = anim ?? { activacion: 'siempre' }
  const poses = a.poses ?? []
  const iPose = poses.length ? Math.min(poseSel, poses.length - 1) : -1
  const hayAlgo = !!a.preset || poses.length > 0

  // Normaliza: sin preset y sin poses la animación desaparece por completo.
  const emitir = (parcial: Partial<AnimacionModelo>) => {
    const nuevo: AnimacionModelo = { ...a, ...parcial }
    if (!nuevo.preset && (nuevo.poses?.length ?? 0) === 0) onChange(undefined)
    else onChange(nuevo)
  }

  const nombrePreset = (p: { id: PresetAnimacionId; nombre: string }) =>
    t(`editor.anim.p.${p.id}`, p.nombre)

  const activaciones: { id: ActivacionAnimacion; label: string }[] = [
    { id: 'apagado', label: t('editor.anim.apagado', 'Apagado') },
    { id: 'siempre', label: t('editor.anim.siempre', 'Siempre') },
    { id: 'proximidad', label: t('editor.anim.cerca', 'Cerca de ti') },
  ]

  return (
    <div className="space-y-3">
      {/* 1) Preset de conjunto: mueve el objeto/personaje completo */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('editor.anim.preset', 'Movimiento')}
        </p>
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => emitir({ preset: undefined })}
            title={t('editor.anim.ninguno', 'Sin movimiento')}
            className={`h-9 flex-1 text-base transition ${
              !a.preset ? 'bg-accent/20 ring-1 ring-inset ring-accent/50' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            ∅
          </button>
          {PRESETS_ANIMACION.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => emitir({ preset: p.id })}
              title={nombrePreset(p)}
              className={`h-9 flex-1 text-base transition ${
                a.preset === p.id ? 'bg-accent/20 ring-1 ring-inset ring-accent/50' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Icono emoji={p.emoji} />
            </button>
          ))}
        </div>
      </div>

      {/* 2) Velocidad e intensidad */}
      {hayAlgo && (
        <div className="space-y-1.5">
          <SliderProp
            label={t('editor.anim.velocidad', 'Velocidad')}
            value={a.velocidad ?? 1}
            min={0.25}
            max={3}
            step={0.05}
            fmt={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => emitir({ velocidad: v })}
            onReset={() => emitir({ velocidad: undefined })}
          />
          {a.preset && (
            <SliderProp
              label={t('editor.anim.intensidad', 'Intensidad')}
              value={a.intensidad ?? 1}
              min={0.25}
              max={3}
              step={0.05}
              fmt={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => emitir({ intensidad: v })}
              onReset={() => emitir({ intensidad: undefined })}
            />
          )}
        </div>
      )}

      {/* 3) Cuándo se reproduce en el mapa */}
      {hayAlgo && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('editor.anim.activacion', 'Se anima')}
          </p>
          <div className="flex overflow-hidden rounded-md border border-white/10">
            {activaciones.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => emitir({ activacion: op.id })}
                className={`flex-1 px-2 py-1 text-[11px] font-semibold transition ${
                  a.activacion === op.id
                    ? 'bg-accent text-accent-ink'
                    : 'bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4) Poses (solo modelos de piezas): keyframes que se interpolan en bucle */}
      {piezas && piezas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('editor.anim.poses', 'Poses (animación propia)')}
          </p>
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'editor.anim.posesDesc',
              'Acomoda las piezas con el editor (engrane) y captura cada pose. Con 2 o más, el modelo pasa de una a otra en bucle.',
            )}
          </p>
          {poses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {poses.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPoseSel(i)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    i === iPose
                      ? 'border-accent/50 bg-accent text-accent-ink'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {t('editor.anim.pose', 'Pose')} {i + 1}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              emitir({ poses: [...poses, capturarPose(piezas)] })
              setPoseSel(poses.length)
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 text-[11px] font-semibold text-accent transition hover:bg-accent/20"
          >
            <Icono nombre="captura" /> {t('editor.anim.capturar', 'Capturar pose actual')}
          </button>
          {iPose >= 0 && (
            <div className="flex gap-1.5">
              {onAplicarPose && (
                <button
                  type="button"
                  onClick={() => {
                    onAplicarPose(aplicarPose(piezas, poses[iPose]))
                    setPiezasControles(true)
                  }}
                  title={t('editor.anim.cargarTip', 'Deja las piezas en esta pose para retocarla')}
                  className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
                >
                  <Icono nombre="editar" /> {t('editor.anim.cargar', 'Editar')}
                </button>
              )}
              <button
                type="button"
                onClick={() => emitir({ poses: poses.map((p, i) => (i === iPose ? capturarPose(piezas) : p)) })}
                title={t('editor.anim.actualizarTip', 'Reemplaza esta pose con la forma actual')}
                className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
              >
                <Icono nombre="repetir" /> {t('editor.anim.actualizar', 'Actualizar')}
              </button>
              <button
                type="button"
                onClick={() => {
                  emitir({ poses: poses.filter((_, i) => i !== iPose) })
                  setPoseSel(Math.max(0, iPose - 1))
                }}
                title={t('editor.anim.quitarPose', 'Quitar esta pose')}
                className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 transition hover:bg-red-600 hover:texto-cta"
              >
                <Icono nombre="basura" /> {t('editor.anim.quitar', 'Quitar')}
              </button>
            </div>
          )}
          {poses.length === 1 && (
            <p className="text-[10px] text-amber-300/70">
              {t('editor.anim.necesitaDos', 'Se necesitan 2 o más poses para reproducir la animación.')}
            </p>
          )}
          {poses.length >= 2 && (
            <SliderProp
              label={t('editor.anim.duracion', 'Duración por pose')}
              value={a.duracionPose ?? 1}
              min={0.2}
              max={5}
              step={0.1}
              fmt={(v) => `${v.toFixed(1)} s`}
              onChange={(v) => emitir({ duracionPose: v })}
              onReset={() => emitir({ duracionPose: undefined })}
            />
          )}
        </div>
      )}
    </div>
  )
}
