import type { RefObject } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { BotonPrimario } from '../_shared/ui'
import { COLOR } from './constantes'

function Boton({
  icono,
  etiqueta,
  onClick,
  disabled,
  pressed,
  className = '',
}: {
  icono: NombreIcono
  etiqueta: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={etiqueta}
      title={etiqueta}
      className={`ui-boton grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sm transition disabled:opacity-30 ${
        pressed ? 'border-white/50 bg-white/20' : 'border-white/10 bg-white/5 hover:bg-white/10'
      } ${className}`}
    >
      <Icono nombre={icono} />
    </button>
  )
}

/**
 * La barra entre el visor y la timeline (estilo CapCut): añadir, dividir y
 * borrar; play y contador (por ref: cambia cada frame); imán, zoom y pantalla
 * completa. `aria-live="off"` en el contador a propósito.
 */
export function BarraHerramientas({
  etiquetaRef,
  reproduciendo,
  onPlayPausa,
  onAnadir,
  puedeDividir,
  onDividir,
  puedeBorrar,
  onBorrar,
  iman,
  onIman,
  onZoom,
  pantallaCompleta,
  onPantallaCompleta,
  onInicio,
  onGrabar,
  grabando = false,
  progreso = null,
  aviso,
  onMedios,
  onEditor,
  medios,
  editor,
}: {
  etiquetaRef: RefObject<HTMLSpanElement | null>
  reproduciendo: boolean
  onPlayPausa: () => void
  onAnadir: () => void
  puedeDividir: boolean
  onDividir: () => void
  puedeBorrar: boolean
  onBorrar: () => void
  iman: boolean
  onIman: () => void
  onZoom: (delta: 1 | -1) => void
  /** Sin handler no hay botón (el modo película ya ocupa toda la pantalla). */
  pantallaCompleta?: boolean
  onPantallaCompleta?: () => void
  /** Modo película: ir al principio (antes de Play) y grabar la toma (después); `grabando` = el botón para. */
  onInicio?: () => void
  onGrabar?: () => void
  grabando?: boolean
  /** Progreso 0–1 de la toma en curso (barra fina bajo la barra), o null. */
  progreso?: number | null
  aviso: string
  /** Con el visor plegado (sus botones flotantes no se ven): abrir y cerrar los laterales. */
  onMedios?: () => void
  onEditor?: () => void
  medios?: boolean
  editor?: boolean
}) {
  const t = useT()
  return (
    <div className="shrink-0">
      <div
        role="toolbar"
        aria-label={t('video.barra.titulo', 'Herramientas del editor')}
        className="flex h-11 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {onMedios && <Boton icono="carpeta" etiqueta={t('video.barra.medios', 'Medios')} onClick={onMedios} pressed={medios} />}
        <BotonPrimario type="button" pequeno app={COLOR} onClick={onAnadir}>
          <Icono nombre="agregar" /> {t('video.barra.anadir', 'Añadir')}
        </BotonPrimario>
        <Boton icono="tijeras" etiqueta={t('video.barra.dividir', 'Dividir en el cursor')} onClick={onDividir} disabled={!puedeDividir} />
        <Boton icono="basura" etiqueta={t('video.barra.borrar', 'Borrar el clip')} onClick={onBorrar} disabled={!puedeBorrar} />
        <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />
        {onInicio && <Boton icono="regresarInicio" etiqueta={t('video.pelicula.inicio', 'Ir al principio')} onClick={onInicio} />}
        <button
          type="button"
          onClick={onPlayPausa}
          disabled={grabando}
          aria-label={reproduciendo ? t('video.preview.pausa', 'Pausar') : t('video.preview.play', 'Reproducir')}
          title={reproduciendo ? t('video.preview.pausa', 'Pausar') : t('video.preview.play', 'Reproducir')}
          className="ui-boton grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"
        >
          <Icono nombre={reproduciendo ? 'pausa' : 'play'} />
        </button>
        {onGrabar && (
          <button
            type="button"
            onClick={onGrabar}
            aria-pressed={grabando}
            aria-label={grabando ? t('video.pelicula.detenerToma', 'Detener la grabación') : t('video.pelicula.grabar', 'Grabar la toma')}
            title={grabando ? t('video.pelicula.detenerToma', 'Detener la grabación') : t('video.pelicula.grabar', 'Grabar la toma')}
            className={`ui-boton grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
              grabando ? 'bg-red-500 text-white' : 'bg-white/10 text-red-400 hover:bg-white/20'
            }`}
          >
            <Icono nombre={grabando ? 'detener' : 'grabar'} />
          </button>
        )}
        <span
          ref={etiquetaRef}
          aria-live="off"
          aria-label={t('video.barra.tiempo', 'Tiempo actual y duración total')}
          className="shrink-0 font-mono text-xs tabular-nums text-white/70"
        >
          0:00.0 / 0:00
        </span>
        <span className="ms-auto" />
        <Boton icono="iman" etiqueta={t('video.barra.iman', 'Imán: pegar a bordes y cursor')} onClick={onIman} pressed={iman} />
        <Boton icono="alejar" etiqueta={t('video.barra.alejar', 'Alejar')} onClick={() => onZoom(-1)} />
        <Boton icono="acercar" etiqueta={t('video.barra.acercar', 'Acercar')} onClick={() => onZoom(1)} />
        {onPantallaCompleta && (
          <Boton
            icono={pantallaCompleta ? 'contraer' : 'expandir'}
            etiqueta={
              pantallaCompleta
                ? t('video.barra.salirPantalla', 'Salir de pantalla completa')
                : t('video.barra.pantallaCompleta', 'Pantalla completa')
            }
            onClick={onPantallaCompleta}
            pressed={!!pantallaCompleta}
          />
        )}
        {onEditor && <Boton icono="editar" etiqueta={t('video.barra.editor', 'Editor del clip')} onClick={onEditor} pressed={editor} />}
      </div>
      {progreso != null && (
        <div className="mx-1 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-red-500 transition-[width]" style={{ width: `${Math.round(progreso * 100)}%` }} />
        </div>
      )}
      {aviso && (
        <p role="status" className="truncate px-1 text-[11px] text-amber-300/90">
          {aviso}
        </p>
      )}
    </div>
  )
}
