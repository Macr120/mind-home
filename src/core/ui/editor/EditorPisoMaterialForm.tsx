import type { CSSProperties } from 'react'
import { PISOS, esSinPiso, type PisoTipo } from '../../house/pisos'
import { ColorPicker } from './ColorPicker'
import { EditorPisoImagenBlock } from './EditorPisoImagenBlock'
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

/** Formulario compartido: textura, color e imagen de piso. */
export function EditorPisoMaterialForm({
  descripcion,
  pisoTipo,
  floorColor,
  imagenActiva,
  previewUrl,
  ajuste,
  onMaterial,
  onColor,
  onSubirImagen,
  onActivarImagen,
  onDesactivarImagen,
  onEliminarImagen,
  onAjusteImagen,
  onQuitarPiso,
}: {
  descripcion: string
  pisoTipo: string | null
  floorColor: string
  imagenActiva: boolean
  previewUrl: string | null
  ajuste: string
  onMaterial: (tipo: string | null, color: string) => void
  onColor: (c: string) => void
  onSubirImagen: (imagen: Blob) => void
  onActivarImagen: () => void
  onDesactivarImagen: () => void
  onEliminarImagen: () => void
  onAjusteImagen: (a: string) => void
  onQuitarPiso?: () => void
}) {
  const t = useT()
  const sinPisoActivo = esSinPiso(pisoTipo)
  const colorActivo = pisoTipo === null && !imagenActiva && !sinPisoActivo

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-white/45">{descripcion}</p>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('editor.pisoCuarto.textura', 'Textura')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onMaterial(null, floorColor)}
            className={[
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
              colorActivo
                ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
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

          {onQuitarPiso && (
            <button
              type="button"
              onClick={onQuitarPiso}
              className={[
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                sinPisoActivo
                  ? 'border-rose-400/70 bg-rose-400/15 text-rose-400'
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
          )}

          {PISOS.map((p) => {
            const activo = pisoTipo === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onMaterial(p.id, p.color)}
                className={[
                  'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition',
                  activo
                    ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
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
          <ColorPicker value={floorColor} onChange={onColor} />
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
        onSubir={onSubirImagen}
        onActivar={onActivarImagen}
        onDesactivar={onDesactivarImagen}
        onEliminar={onEliminarImagen}
        onAjuste={onAjusteImagen}
      />
      )}
    </div>
  )
}
