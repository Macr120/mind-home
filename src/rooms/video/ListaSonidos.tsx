import { useEffect, useState } from 'react'
import type { FuenteSonido, MedioVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonSecundario, TARJETA } from '../_shared/ui'
import { SONIDOS_FABRICA, urlSonido } from './sonidos'
import type { PropsArrastreItem } from './useArrastreMedio'

/** Un solo reproductor de muestra para todo el módulo: escuchar otro corta al anterior. */
let muestra: HTMLAudioElement | null = null
let urlMuestra = ''
function pararMuestra() {
  if (muestra) {
    muestra.pause()
    muestra = null
  }
  if (urlMuestra) {
    URL.revokeObjectURL(urlMuestra)
    urlMuestra = ''
  }
}
/** Reproduce `src` (revocando `url` al acabar, si la hay); `alTerminar` se llama al acabar o fallar. */
function reproducirMuestra(src: string, url: string, alTerminar: () => void) {
  pararMuestra()
  urlMuestra = url
  const audio = new Audio(src)
  const fin = () => {
    if (muestra !== audio) return
    pararMuestra()
    alTerminar()
  }
  audio.onended = fin
  audio.onerror = fin
  muestra = audio
  void audio.play().catch(fin)
}

/** Fuente de un sonido → src reproducible (y la object URL a revocar, si es un medio). */
function srcDeSonido(fuente: FuenteSonido, porId: Map<number, MedioVideo>): { src: string; url: string } | null {
  if (fuente.tipo === 'fabrica') {
    const src = urlSonido(fuente.clave)
    return src ? { src, url: '' } : null
  }
  const m = porId.get(fuente.medioId)
  if (!m) return null
  const url = URL.createObjectURL(m.blob)
  return { src: url, url }
}

/** Botón escuchar/parar de un sonido (lo usan la lista y el panel del clip). */
export function BotonEscuchar({
  fuente,
  porId,
  sonando,
  onSonando,
}: {
  fuente: FuenteSonido
  porId: Map<number, MedioVideo>
  sonando: boolean
  onSonando: (v: boolean) => void
}) {
  const t = useT()
  return (
    <button
      type="button"
      data-no-arrastre
      onClick={() => {
        if (sonando) {
          pararMuestra()
          onSonando(false)
          return
        }
        const s = srcDeSonido(fuente, porId)
        if (!s) return
        reproducirMuestra(s.src, s.url, () => onSonando(false))
        onSonando(true)
      }}
      aria-label={sonando ? t('video.sonidos.parar', 'Parar') : t('video.sonidos.escuchar', 'Escuchar')}
      title={sonando ? t('video.sonidos.parar', 'Parar') : t('video.sonidos.escuchar', 'Escuchar')}
      className="ui-boton grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
    >
      <Icono nombre={sonando ? 'pausa' : 'play'} />
    </button>
  )
}

/** La carpeta «sonidos» de fábrica para elegir uno (o pasar a la biblioteca de audios importados). */
export function ListaSonidos({
  medios,
  onElegir,
  onImportado,
  compacto = false,
  propsArrastre,
}: {
  medios: MedioVideo[]
  onElegir: (fuente: FuenteSonido) => void
  /** Pasar a la biblioteca de audios importados; sin él no se ofrece (el panel lateral ya los lista). */
  onImportado?: () => void
  /** Una sola columna: la versión del panel lateral del editor. */
  compacto?: boolean
  /** Gesto de arrastre a la timeline (panel lateral); el botón «Añadir» sigue siendo el toque. */
  propsArrastre?: (clave: string) => PropsArrastreItem
}) {
  const t = useT()
  const [sonando, setSonando] = useState<string | null>(null)
  const porId = new Map(medios.filter((m) => m.id != null).map((m) => [m.id!, m]))
  useEffect(() => () => pararMuestra(), [])
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.sonidos.fabrica', 'De fábrica')}</p>
        <ul className={`grid grid-cols-1 gap-1.5 ${compacto ? '' : 'sm:grid-cols-2'}`}>
          {SONIDOS_FABRICA.map((f) => {
            const fuente: FuenteSonido = { tipo: 'fabrica', clave: f.clave }
            return (
              <li
                key={f.clave}
                className={`${TARJETA} flex items-center gap-2 p-2${propsArrastre ? ' select-none [-webkit-touch-callout:none]' : ''}`}
                {...propsArrastre?.(f.clave)}
              >
                <BotonEscuchar fuente={fuente} porId={porId} sonando={sonando === f.clave} onSonando={(v) => setSonando(v ? f.clave : null)} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{t(f.claveNombre, f.es)}</span>
                <span className="shrink-0 text-[10px] text-white/40">{f.duracion}s</span>
                <BotonSecundario pequeno data-no-arrastre onClick={() => onElegir(fuente)}>
                  <Icono nombre="agregar" /> {t('video.sonidos.agregar', 'Añadir')}
                </BotonSecundario>
              </li>
            )
          })}
        </ul>
      </div>
      {onImportado && (
        <BotonSecundario pequeno onClick={onImportado}>
          <Icono nombre="musica" /> {t('video.sonidos.importado', 'Audio importado')}
        </BotonSecundario>
      )}
    </div>
  )
}
