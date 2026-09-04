import { useEffect, useState } from 'react'
import {
  cancelarGrabacionPantalla,
  detenerGrabacionPantalla,
  MAX_SEG_GRABACION,
  useGrabacionPantalla,
} from '../grabacionPantalla'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * La píldora flotante mientras se graba la app para el Studio de video: reloj,
 * Detener y descartar; antes, la cuenta regresiva en grande sobre el mapa. Se
 * monta en la raíz de `App` (el cuarto que pidió la toma está cerrado), por
 * encima del HUD y de los cuartos y por debajo de `confirmar` (z-75).
 * `ui-noche`: vidrio oscuro con tinta blanca en los dos modos.
 */
export default function GrabacionPantallaOverlay() {
  const t = useT()
  const estado = useGrabacionPantalla((s) => s.estado)
  const inicioMs = useGrabacionPantalla((s) => s.inicioMs)
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (estado !== 'grabando' && estado !== 'cuenta') return
    // La cuenta se refresca fino (cambia cada segundo exacto); el reloj, cada medio segundo.
    const id = window.setInterval(() => setAhora(Date.now()), estado === 'cuenta' ? 100 : 500)
    return () => window.clearInterval(id)
  }, [estado])
  if (estado === 'inactivo') return null
  const guardando = estado === 'guardando'
  const cuenta = estado === 'cuenta' ? Math.max(1, Math.ceil((inicioMs - ahora) / 1000)) : 0
  const seg = estado === 'grabando' ? Math.min(MAX_SEG_GRABACION, Math.max(0, Math.floor((ahora - inicioMs) / 1000))) : 0

  return (
    <>
      {cuenta > 0 && (
        <div
          role="status"
          aria-live="polite"
          aria-label={t('video.grabar.cuenta', 'La grabación empieza en {n}', { n: cuenta })}
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center"
        >
          <span key={cuenta} className="ui-pop text-[9rem] font-black leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            {cuenta}
          </span>
        </div>
      )}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(0.5rem+var(--safe-top))] z-[70] flex flex-col items-center gap-1.5 px-2">
        <div
          role="status"
          aria-live="off"
          aria-label={t('video.grabar.estado', 'Grabando la app')}
          className="ui-noche pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/75 py-1 pe-1 ps-3 text-sm text-white shadow-lg backdrop-blur"
        >
          <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ${guardando ? '' : 'animate-pulse'}`} />
          <span className="font-mono text-xs tabular-nums">
            {guardando ? t('video.grabar.guardando', 'Guardando…') : `${fmt(seg)} / ${fmt(MAX_SEG_GRABACION)}`}
          </span>
          <button
            type="button"
            onClick={detenerGrabacionPantalla}
            disabled={guardando}
            className="ui-boton flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            <Icono nombre="detener" /> {t('video.grabar.detener', 'Detener')}
          </button>
          <button
            type="button"
            onClick={cancelarGrabacionPantalla}
            disabled={guardando}
            aria-label={t('video.grabar.descartar', 'Descartar la toma')}
            title={t('video.grabar.descartar', 'Descartar la toma')}
            className="ui-boton grid h-7 w-7 place-items-center rounded-full text-xs transition hover:bg-white/15 disabled:opacity-50"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        {seg < 6 && !guardando && cuenta === 0 && (
          <p className="ui-noche rounded-full bg-black/60 px-3 py-1 text-center text-[11px] text-white/80 backdrop-blur">
            {t('video.grabar.pista', 'Haz lo que quieras en la app; al detener vuelves al Studio con la toma como clip')}
          </p>
        )}
      </div>
    </>
  )
}
