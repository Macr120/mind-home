import type { PublicacionVideo } from '../../../core/data/db'
import { abrirEnlace } from '../../../core/enlaces'
import { localeActual, useT } from '../../../core/i18n/useT'
import { NOMBRE_RED, PLATAFORMAS } from '../../../core/redes/tipos'
import { LogoRed } from '../../../core/ui/logosMarca'

/** Logos pequeños en la tarjeta del proyecto: una por red publicada (la última), tocarla abre el video. */
export function InsigniasPublicacion({ publicaciones }: { publicaciones?: PublicacionVideo[] }) {
  const t = useT()
  if (!publicaciones?.length) return null
  const ultimas = PLATAFORMAS.map((p) => publicaciones.filter((x) => x.plataforma === p && x.estado !== 'error').at(-1)).filter(
    (x): x is PublicacionVideo => x != null,
  )
  if (ultimas.length === 0) return null
  return (
    <span className="ms-1 inline-flex items-center gap-1 align-middle">
      {ultimas.map((pub) => {
        const titulo = t('video.publicar.insignia', 'Publicado en {red} · {f}', {
          red: NOMBRE_RED[pub.plataforma],
          f: new Date(pub.fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' }),
        })
        return (
          <button
            key={pub.plataforma}
            type="button"
            title={titulo}
            aria-label={titulo}
            disabled={!pub.url}
            onClick={(e) => {
              e.stopPropagation()
              if (pub.url) void abrirEnlace(pub.url)
            }}
            className="rounded p-0.5 text-white/55 transition hover:bg-white/10 hover:text-white/90 disabled:pointer-events-none"
          >
            <LogoRed plataforma={pub.plataforma} className="h-3 w-3" />
          </button>
        )
      })}
    </span>
  )
}
