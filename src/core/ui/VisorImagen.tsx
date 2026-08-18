import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fechaLocalISO } from '../fechaLocal'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Imagen a pantalla completa con descarga. Lo que se abre al tocar una imagen
 * generada con IA: antes solo se veía en miniatura dentro del hilo y no había
 * forma de sacarla de la app. Recibe la object URL ya creada por quien la pinta
 * (crear otra duplicaría el blob en memoria).
 *
 * Va por portal al body porque `fixed` NO es la pantalla cuando algún ancestro
 * tiene `backdrop-blur`: los paneles de vidrio de la app crean bloque contenedor
 * y el visor se quedaba recortado dentro de la burbuja del chat.
 */
export function VisorImagen({ url, tipo, onCerrar }: { url: string; tipo: string; onCerrar: () => void }) {
  const t = useT()

  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [onCerrar])

  const descargar = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = `mph-imagen-${fechaLocalISO()}.${tipo.split('/')[1] || 'png'}`
    a.click()
  }

  return createPortal(
    <div
      className="ui-noche fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
      onClick={onCerrar}
    >
      <img src={url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
      <div className="absolute end-4 top-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={descargar}
          aria-label={t('visor.descargar', 'Descargar')}
          title={t('visor.descargar', 'Descargar')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
        >
          <Icono nombre="descargar" />
        </button>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={t('visor.cerrar', 'Cerrar')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
