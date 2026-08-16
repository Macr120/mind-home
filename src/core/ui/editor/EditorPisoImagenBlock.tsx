import { useRef } from 'react'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { GenerarTexturaIA } from './GenerarTexturaIA'

const AJUSTES = [
  { id: 'x1', clave: 'grande', labelEs: 'Grande' },
  { id: 'x2', clave: 'medio', labelEs: 'Medio' },
  { id: 'x4', clave: 'mosaico', labelEs: 'Mosaico' },
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
  onSubir: (imagen: Blob) => void
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
              <div className="absolute end-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold texto-cta">
                {t('editor.imgActiva', 'ACTIVA')}
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            {!imagenActiva ? (
              <button
                type="button"
                onClick={onActivar}
                className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 py-1.5 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-400/20"
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
                        ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {t(`editor.tamano.${a.clave}`, a.labelEs)}
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
          <span className="text-base"><Icono nombre="imagen" /></span>
          {t('editor.pisoCuarto.subirImagen', 'Subir imagen')}
        </button>
      )}

      <div className="mt-2">
        <GenerarTexturaIA superficie="piso" onGenerada={onSubir} />
      </div>

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
