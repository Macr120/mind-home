import type { ClipVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { PISTAS } from './constantes'
import type { LadoAsa, PropsGestoClip } from './useGestosClips'

/** Asa de recorte de un clip seleccionado: solo captura y avisa; el valor en vivo lo pinta el gesto. */
function Asa({ lado, etiqueta, props }: { lado: LadoAsa; etiqueta: string; props: Record<string, unknown> }) {
  return (
    <div
      data-asa
      role="slider"
      aria-label={etiqueta}
      tabIndex={-1}
      style={{ touchAction: 'none' }}
      className={`absolute inset-y-0 z-20 flex w-4 cursor-ew-resize items-center justify-center bg-white/70 ${
        lado === 'ini' ? 'left-0 rounded-r' : 'right-0 rounded-l'
      }`}
      {...props}
    >
      <span className="h-6 w-0.5 rounded bg-black/50" />
    </div>
  )
}

/**
 * Un clip en su pista: posición y ancho por estilo, miniatura repetida o
 * icono + nombre, duración, marca de transición, burbuja del valor en vivo y
 * asas (solo en el seleccionado). Los gestos vienen de `useGestosClips`.
 */
export function ClipVista({
  clip,
  pxPorSeg,
  seleccionado,
  nombre,
  emoji,
  urlMiniatura,
  ausente,
  registrar,
  propsGesto,
  propsAsa,
  onTransicion,
  onTeclado,
  fmtDur,
}: {
  clip: ClipVideo
  pxPorSeg: number
  seleccionado: boolean
  nombre: string
  /** Emoji del asistente (clips de avatar); si no, el icono de la pista. */
  emoji?: string
  urlMiniatura?: string
  ausente?: boolean
  registrar: (el: HTMLElement | null) => void
  propsGesto: PropsGestoClip
  propsAsa: (lado: LadoAsa) => Record<string, unknown>
  onTransicion?: () => void
  onTeclado: (e: React.KeyboardEvent) => void
  fmtDur: (s: number) => string
}) {
  const t = useT()
  const pista = PISTAS[clip.pista]
  const colorFondo = clip.pista === 'video' && clip.fuente.tipo === 'color' ? clip.fuente.color : clip.pista === 'fondo' && clip.fuente.tipo === 'color' ? clip.fuente.color : null
  const icono: NombreIcono = ausente ? 'alerta' : pista.icono
  const conTransicion = clip.pista === 'video' && clip.transicion && clip.transicion.tipo !== 'corte'
  return (
    <div
      data-clip={clip.id}
      ref={registrar}
      role="button"
      tabIndex={0}
      aria-pressed={seleccionado}
      aria-label={t('video.timeline.clip', 'Clip {n}', { n: nombre })}
      style={{
        left: clip.inicio * pxPorSeg,
        width: Math.max(12, clip.duracion * pxPorSeg),
        background: colorFondo ?? `color-mix(in srgb, ${pista.color} 22%, transparent)`,
        borderColor: `${pista.color}99`,
        backgroundImage: urlMiniatura ? `url(${urlMiniatura})` : undefined,
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'repeat-x',
      }}
      className={`absolute inset-y-1 overflow-visible rounded-md border ${ausente ? 'border-dashed' : ''} ${
        seleccionado ? 'z-[1] ring-2 ring-white/80' : ''
      }`}
      onKeyDown={onTeclado}
      {...propsGesto}
    >
      <div className="flex h-full items-center gap-1 overflow-hidden rounded-md px-1.5">
        <span className="shrink-0 text-[11px] drop-shadow">
          {emoji ? <Icono emoji={emoji} /> : <Icono nombre={icono} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-white drop-shadow">{nombre}</span>
        <span className="shrink-0 rounded bg-black/60 px-1 text-[9px] text-white/85">{fmtDur(clip.duracion)}</span>
      </div>
      {conTransicion && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTransicion?.()
          }}
          aria-label={t('video.clip.transicionMarca', 'Transición: {nombre}', { nombre: clip.transicion?.tipo ?? '' })}
          title={t('video.clip.transicionMarca', 'Transición: {nombre}', { nombre: clip.transicion?.tipo ?? '' })}
          className="absolute -left-2 top-1/2 z-10 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-white text-[9px] text-black"
        >
          <Icono nombre="transicion" />
        </button>
      )}
      <span
        data-burbuja
        hidden
        className="pointer-events-none absolute -top-6 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white"
      />
      {seleccionado && (
        <>
          <Asa lado="ini" etiqueta={t('video.timeline.asaIni', 'Recortar el inicio')} props={propsAsa('ini')} />
          <Asa lado="fin" etiqueta={t('video.timeline.asaFin', 'Recortar el final')} props={propsAsa('fin')} />
        </>
      )}
    </div>
  )
}
