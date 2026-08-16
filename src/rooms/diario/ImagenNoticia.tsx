import { useEffect, useState } from 'react'
import { Icono } from '../../core/ui/iconos/Icono'
import { useT } from '../../core/i18n/useT'

/**
 * Portada de una tarjeta del diario: la imagen se ve completa (sin recortes) sobre
 * un fondo del color de la categoría y, al tocarla, se abre a pantalla completa.
 */
export function ImagenNoticia({
  src,
  color,
  onError,
}: {
  src: string
  color: string
  onError: () => void
}) {
  const t = useT()
  const [ampliada, setAmpliada] = useState(false)

  useEffect(() => {
    if (!ampliada) return
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAmpliada(false)
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [ampliada])

  return (
    <>
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        aria-label={t('diario.imagen.ampliar', 'Ver la imagen en grande')}
        className="block w-full cursor-zoom-in transition hover:brightness-110"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          className="max-h-[55vh] w-full object-contain"
          onError={onError}
        />
      </button>

      {ampliada && (
        <div
          className="ui-noche fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
          onClick={() => setAmpliada(false)}
        >
          <img src={src} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            type="button"
            onClick={() => setAmpliada(false)}
            aria-label={t('diario.imagen.cerrar', 'Cerrar')}
            className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
      )}
    </>
  )
}
