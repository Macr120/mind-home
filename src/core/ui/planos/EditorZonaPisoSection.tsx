import type { CSSProperties } from 'react'
import type { ZonaPlano } from '../../data/db'
import { zonasRepo } from '../../data/repository'
import { PISOS, PISO_SIN_PISO, esSinPiso, getPisoTipo, type PisoTipo, type PisoTipoId } from '../../house/pisos'
import { ColorPicker } from '../editor/ColorPicker'
import { EditorPisoImagenBlock } from '../editor/EditorPisoImagenBlock'
import { usePreviewBlob } from '../editor/usePreviewBlob'
import { useT } from '../../i18n/useT'

function swatchStyle(p: PisoTipo): CSSProperties {
  if (p.textura)
    return { backgroundColor: p.color, backgroundImage: `url(/textures/floors/${p.textura}_color.jpg)` }
  if (p.id === 'mosaico' || p.id === 'ajedrez') {
    const [a, b] = p.id === 'mosaico' ? ['#c8c6d8', '#9896a8'] : ['#f0ede8', '#161616']
    return {
      background: `conic-gradient(${a} 90deg, ${b} 90deg 180deg, ${a} 180deg 270deg, ${b} 270deg)`,
      backgroundSize: '14px 14px',
    }
  }
  if (p.id === 'grid_neon')
    return {
      backgroundColor: '#050a18',
      backgroundImage:
        'linear-gradient(#3b6cff 1.5px, transparent 1.5px), linear-gradient(90deg, #3b6cff 1.5px, transparent 1.5px)',
      backgroundSize: '9px 9px',
    }
  return { backgroundColor: p.color }
}

/** Selector de piso para cuartos básicos del plano. */
export function EditorZonaPisoSection({ zona }: { zona: ZonaPlano }) {
  const t = useT()
  const pisoTipo = (zona.pisoTipo as string | null | undefined) ?? null
  const pisoConf = pisoTipo && !esSinPiso(pisoTipo) ? getPisoTipo(pisoTipo as PisoTipoId) : null
  const imagenActiva = !!(zona.pisoImagenActiva && zona.pisoImagen)
  const previewUrl = usePreviewBlob(zona.pisoImagen)
  const ajuste = zona.pisoImagenAjuste ?? 'x1'
  const floorColor = zona.pisoColor ?? pisoConf?.color ?? '#a8a29e'
  const sinPisoActivo = esSinPiso(pisoTipo)
  const colorActivo = pisoTipo === null && !imagenActiva && !sinPisoActivo

  const guardar = async (cambios: Partial<ZonaPlano>) => {
    if (zona.id == null) return
    await zonasRepo.update(zona.id, cambios)
  }

  const guardarColor = async (c: string) => {
    await guardar({ pisoTipo: null, pisoColor: c, pisoImagenActiva: false })
  }

  const guardarMaterial = async (pisoTipoVal: string | null, pisoColor: string) => {
    await guardar({
      pisoTipo: pisoTipoVal,
      pisoColor,
      pisoImagenActiva: false,
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-white/80">{zona.nombre}</p>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.pisoCuarto.textura', 'Textura')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => void guardarMaterial(null, floorColor)}
            className={[
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
              colorActivo
                ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
            ].join(' ')}
          >
            <div
              className="w-full rounded-md"
              style={{
                height: 28,
                background: colorActivo
                  ? floorColor
                  : 'linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff)',
              }}
            />
            <span className="text-[10px] font-medium leading-tight">
              {t('editor.piso.colorSolido', 'Color sólido')}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              void guardar({
                pisoTipo: PISO_SIN_PISO,
                pisoColor: '',
                pisoImagenActiva: false,
              })
            }
            className={[
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
              sinPisoActivo
                ? 'border-rose-400/70 bg-rose-400/15 text-rose-300'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
            ].join(' ')}
          >
            <div
              className="relative w-full rounded-md border border-dashed border-white/25 bg-[#0a0c10]"
              style={{ height: 28 }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-sm text-white/35">
                ✕
              </span>
            </div>
            <span className="text-[10px] font-medium leading-tight">
              {t('editor.piso.sinPiso', 'Sin piso')}
            </span>
          </button>

          {PISOS.map((p) => {
            const activo = pisoTipo === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  void guardar({
                    pisoTipo: p.id,
                    pisoColor: p.color,
                    pisoImagenActiva: false,
                  })
                }
                className={[
                  'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                  activo
                    ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                ].join(' ')}
              >
                <div
                  className="w-full rounded-md bg-cover bg-center"
                  style={{ height: 28, ...swatchStyle(p) }}
                />
                <span className="text-[10px] font-medium leading-tight">{p.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>

      {sinPisoActivo && (
        <p className="text-[10px] leading-snug text-white/40">
          {t(
            'editor.piso.sinPisoHint',
            'Sin loseta en estas celdas. Elige una textura o color para restaurar el piso.',
          )}
        </p>
      )}

      {!imagenActiva && !sinPisoActivo && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('editor.pisoCuarto.color', 'Color')}
          </p>
          <ColorPicker value={floorColor} onChange={(c) => void guardarColor(c)} />
          {!colorActivo && (
            <p className="mt-1.5 text-[10px] leading-snug text-white/35">
              {t(
                'editor.pisoCuarto.colorHint',
                'Al elegir un color se usa piso sólido (desactiva la textura activa).',
              )}
            </p>
          )}
        </div>
      )}

      {!sinPisoActivo && (
      <EditorPisoImagenBlock
        previewUrl={previewUrl}
        imagenActiva={imagenActiva}
        ajuste={ajuste}
        onSubir={(file) => {
          if (zona.id == null) return
          void guardar({
            pisoImagen: file,
            pisoImagenActiva: true,
            pisoImagenAjuste: ajuste,
            pisoTipo: null,
          })
        }}
        onActivar={() => void guardar({ pisoImagenActiva: true, pisoTipo: null })}
        onDesactivar={() => void guardar({ pisoImagenActiva: false })}
        onEliminar={() =>
          void guardar({
            pisoImagen: undefined,
            pisoImagenActiva: false,
            pisoImagenAjuste: undefined,
          })
        }
        onAjuste={(a) => void guardar({ pisoImagenAjuste: a })}
      />
      )}
    </div>
  )
}
