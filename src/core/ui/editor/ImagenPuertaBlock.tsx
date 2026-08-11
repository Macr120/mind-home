import { comprimirFoto } from '../../house/especiales'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { GenerarTexturaIA } from './GenerarTexturaIA'

/**
 * Imagen de la hoja de una puerta: foto del usuario o textura generada con IA.
 * Lo comparten las puertas de las paredes de cuarto y las de los muros
 * independientes; cada editor decide dónde se guarda el Blob resultante.
 */
export function ImagenPuertaBlock({
  url,
  onImagen,
  onQuitar,
}: {
  /** object-URL de la imagen actual (si la hay). */
  url?: string
  onImagen: (blob: Blob) => void | Promise<void>
  onQuitar: () => void
}) {
  const t = useT()
  const titulo = t('paredes.imagenPuerta', 'Imagen de la puerta')

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{titulo}</p>

      {url && (
        <div className="overflow-hidden rounded-lg border border-white/10" style={{ height: 72 }}>
          <img src={url} alt={titulo} className="h-full w-full object-cover" draggable={false} />
        </div>
      )}

      <label className="block cursor-pointer rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/20">
        <Icono nombre="foto" />{' '}
        {url ? t('paredes.cambiarFoto', 'Cambiar la foto') : t('paredes.subirFoto', 'Subir una foto')}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f?.type.startsWith('image/')) return
            await onImagen(await comprimirFoto(f))
          }}
        />
      </label>

      <GenerarTexturaIA superficie="puerta" onGenerada={onImagen} />

      {url && (
        <button
          type="button"
          onClick={onQuitar}
          className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-red-500/25"
        >
          {t('paredes.quitarImagenPuerta', 'Quitar la imagen')}
        </button>
      )}

      <p className="text-[10px] leading-snug text-white/35">
        {t(
          'paredes.imagenPuertaAyuda',
          'Viste la hoja de la puerta (recta, doble o corredera). El portón de láminas conserva su color.',
        )}
      </p>
    </div>
  )
}
