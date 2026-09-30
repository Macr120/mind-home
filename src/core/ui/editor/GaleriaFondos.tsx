import { useMemo, useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { GALERIA_FONDOS, imagenDeFondo, svgFondo, type FondoGaleria } from '../../house/fondosGaleria'
import { escalaCubrir } from '../../house/fondosImagen'
import { useT } from '../../i18n/useT'

/**
 * Imágenes de fondo listas para elegir. Al tocar una entra en «Mis imágenes»
 * (cubriendo la pantalla) y queda puesta; si ya estaba, solo se vuelve a poner.
 */
export function GaleriaFondos() {
  const t = useT()
  const fondosImagen = useDiseño((s) => s.fondosImagen)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const agregarFondoImagen = useDiseño((s) => s.agregarFondoImagen)
  const setFondoImagenActivo = useDiseño((s) => s.setFondoImagenActivo)
  const [cargando, setCargando] = useState<string | null>(null)
  // Miniaturas: el mismo SVG de la imagen, dibujado por el navegador.
  const miniaturas = useMemo(
    () => new Map(GALERIA_FONDOS.map((f) => [f.id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFondo(f))}`])),
    [],
  )

  const nombreDe = (f: FondoGaleria) => t(`fondo.galeria.${f.id}`, f.nombre)
  const guardada = (f: FondoGaleria) => fondosImagen.find((i) => i.nombre === nombreDe(f))

  const elegir = async (f: FondoGaleria) => {
    const ya = guardada(f)
    if (ya?.id != null) {
      await setFondoImagenActivo(ya.id)
      return
    }
    setCargando(f.id)
    try {
      const blob = await imagenDeFondo(f)
      await agregarFondoImagen(blob, nombreDe(f), {
        anclaU: 0.5,
        anclaV: 0.5,
        escala: escalaCubrir(1920, 1080, window.innerWidth, window.innerHeight),
      })
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {t('editor.fondo.galeria', 'Imágenes de fondo')}
      </p>
      <p className="text-[10px] leading-snug text-white/45">
        {t('editor.fondo.galeriaDesc', 'Toca una para ponerla a pantalla completa; queda en «Mis imágenes» para ajustarla.')}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {GALERIA_FONDOS.map((f) => {
          const activa = guardada(f)?.id === fondoImagenActivo && fondoImagenActivo != null
          return (
            <button
              key={f.id}
              type="button"
              disabled={cargando != null}
              onClick={() => void elegir(f)}
              className="overflow-hidden rounded-lg border text-start transition disabled:opacity-60"
              style={{
                borderColor: activa ? 'rgba(52,211,153,0.7)' : 'color-mix(in srgb, var(--ui-ink) 8%, transparent)',
                background: activa ? 'rgba(52,211,153,0.12)' : 'color-mix(in srgb, var(--ui-ink) 4%, transparent)',
              }}
            >
              <img src={miniaturas.get(f.id)} alt={nombreDe(f)} className="aspect-video w-full object-cover" draggable={false} />
              <span className="block truncate px-2 py-1 text-[11px] font-medium text-white/80">
                {cargando === f.id ? t('editor.fondo.galeriaCargando', 'Preparando…') : nombreDe(f)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
