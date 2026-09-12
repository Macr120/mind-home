import { useEffect, useMemo } from 'react'
import { useT } from '../../../core/i18n/useT'
import type { AspectoVideo } from '../constantes'

/**
 * Lo que se va a publicar: el frame del visor mientras no hay export, y el
 * archivo real (reproducible) cuando ya se renderizó. TikTok exige una vista
 * previa del contenido antes de publicar.
 */
export function VistaPrevia({
  poster,
  blob,
  aspecto,
  duracion,
  formato,
}: {
  poster: string | null
  blob: Blob | null
  aspecto: AspectoVideo
  duracion: number
  formato: 'MP4' | 'WebM'
}) {
  const t = useT()
  // La URL nace con el blob (memo) y se revoca cuando cambia o al desmontar.
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )
  const caja = aspecto === '9:16' ? 'aspect-[9/16] max-h-56' : aspecto === '1:1' ? 'aspect-square max-h-56' : 'aspect-video max-h-48'
  return (
    <div className="space-y-1">
      <div className={`${caja} mx-auto overflow-hidden rounded-lg bg-black`}>
        {url ? (
          <video src={url} controls muted playsInline className="h-full w-full object-contain" />
        ) : poster ? (
          <img src={poster} alt="" className="h-full w-full object-contain" />
        ) : null}
      </div>
      <p className="text-center text-[11px] text-white/45">
        {t('video.publicar.previa.meta', '{seg} s · {aspecto} · {formato}', { seg: Math.round(duracion), aspecto, formato })}
        {!blob && ` · ${t('video.publicar.previa.pendiente', 'Se exportará al publicar (720p).')}`}
      </p>
    </div>
  )
}
