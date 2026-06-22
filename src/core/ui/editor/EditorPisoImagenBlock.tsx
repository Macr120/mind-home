import { useRef } from 'react'
import { useT } from '../../i18n/useT'

const AJUSTES = [
  { id: 'x1', label: 'Grande' },
  { id: 'x2', label: 'Medio' },
  { id: 'x4', label: 'Mosaico' },
] as const

/** Bloque reutilizable: subir / activar imagen de piso. */
export function EditorPisoImagenBlock({
  previewUrl,
  imagenActiva,
  ajuste,
  onSubir,
  onActivar,
  onDesactivar,
  onEliminar,
  onAjuste,
}: {
  previewUrl: string | null
  imagenActiva: boolean
  ajuste: string
  onSubir: (file: File) => void
  onActivar: () => void
  onDesactivar: () => void
  onEliminar: () => void
  onAjuste: (ajuste: string) => void
}) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file?.type.startsWith('image/')) onSubir(file)
    e.target.value = ''
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('editor.pisoCuarto.imagen', 'Imagen de fondo')}
      </p>

      {previewUrl ? (
        <div className="space-y-2">
          <div
            className={[
              'relative overflow-hidden rounded-lg border',
              imagenActiva ? 'border-emerald-400/70' : 'border-white/10',
            ].join(' ')}
            style={{ height: 72 }}
          >
            <img src={previewUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            {imagenActiva && (
              <div className="absolute right-1.5 top-1.5 rounded bg-emerald-400/80 px-1.5 py-0.5 text-[9px] font-bold text-black">
                ACTIVA
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            {!imagenActiva ? (
              <button
                type="button"
                onClick={onActivar}
                className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 py-1.5 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                {t('editor.pisoCuarto.usarImagen', 'Usar imagen')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onDesactivar}
                className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
              >
                {t('editor.pisoCuarto.desactivar', 'Desactivar')}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
            >
              {t('editor.pisoCuarto.cambiar', 'Cambiar')}
            </button>
            <button
              type="button"
              onClick={onEliminar}
              className="rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400/80 transition hover:bg-red-400/20 hover:text-red-400"
              title={t('editor.pisoCuarto.borrar', 'Borrar imagen')}
            >
              ✕
            </button>
          </div>

          {imagenActiva && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {t('editor.pisoCuarto.ajuste', 'Tamaño del mosaico')}
              </p>
              <div className="flex gap-1.5">
                {AJUSTES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onAjuste(a.id)}
                    className={[
                      'flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition',
                      ajuste === a.id
                        ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 py-4 text-[11px] text-white/50 transition hover:border-white/40 hover:bg-white/8 hover:text-white/70"
        >
          <span className="text-base">🖼️</span>
          {t('editor.pisoCuarto.subirImagen', 'Subir imagen')}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onArchivo}
      />
    </div>
  )
}
