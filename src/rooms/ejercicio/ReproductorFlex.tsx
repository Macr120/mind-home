import { useEffect, useRef, useState } from 'react'
import type { ImagenEjercicio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { useUrlImagen } from './imagenIA'
import { normalizarEjercicio } from './stats'
import { pitar } from './pitar'

const COLOR = '#a78bfa' // violeta, el acento de Flexibilidad
const SEG_DEFECTO = 30 // segundos por postura al abrir (mismo valor por defecto que el formulario)
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Reproductor guiado de una rutina de flexibilidad: al «Iniciar» muestra la
 * postura actual (imagen grande) y un contador en cuenta regresiva. Al agotarse
 * el tiempo pita y salta a la siguiente; también se puede avanzar/retroceder a
 * mano. Es un apoyo del momento: no guarda nada (la sesión se registra aparte).
 */
export function ReproductorFlex({
  rutina,
  imgPorClave,
  onCerrar,
}: {
  rutina: { nombre: string; ejercicios?: string[] }
  imgPorClave: Map<string, ImagenEjercicio>
  onCerrar: () => void
}) {
  const t = useT()
  const posturas = rutina.ejercicios?.length ? rutina.ejercicios : [rutina.nombre]

  const [idx, setIdx] = useState(0)
  // Segundos por postura: ajustable en pausa (se conserva para las siguientes).
  const [segPostura, setSegPostura] = useState(SEG_DEFECTO)
  const [restante, setRestante] = useState(SEG_DEFECTO)
  const [corriendo, setCorriendo] = useState(true)
  const [completado, setCompletado] = useState(false)
  // Momento (época ms) en que termina el conteo de la postura en curso.
  const finRef = useRef(0)

  const url = useUrlImagen(imgPorClave.get(normalizarEjercicio(posturas[idx])))

  const irA = (n: number) => {
    setIdx(Math.max(0, Math.min(posturas.length - 1, n)))
    setRestante(segPostura)
    finRef.current = Date.now() + segPostura * 1000
    setCorriendo(true)
    setCompletado(false)
  }

  const siguiente = () => {
    if (idx + 1 >= posturas.length) {
      setCorriendo(false)
      setCompletado(true)
      setRestante(0)
    } else {
      irA(idx + 1)
    }
  }

  // Arma el primer conteo al abrir (evita usar Date.now durante el render).
  useEffect(() => {
    finRef.current = Date.now() + SEG_DEFECTO * 1000
  }, [])

  // El handler de «se acabó el tiempo» siempre apunta a la postura actual.
  const alTerminarRef = useRef(siguiente)
  useEffect(() => {
    alTerminarRef.current = siguiente
  })

  // Conteo contra el deadline; al llegar a 0 pita y avanza. clearInterval
  // inmediato garantiza un solo pitido por postura.
  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((finRef.current - Date.now()) / 1000))
      setRestante(r)
      if (r === 0) {
        clearInterval(id)
        pitar()
        alTerminarRef.current()
      }
    }, 250)
    return () => clearInterval(id)
  }, [corriendo, idx])

  const alternar = () => {
    if (corriendo) {
      setCorriendo(false)
      return
    }
    const desde = restante || segPostura
    finRef.current = Date.now() + desde * 1000
    if (restante === 0) setRestante(desde)
    setCorriendo(true)
  }

  const pct = segPostura > 0 ? (restante / segPostura) * 100 : 0
  const hechos = completado ? posturas.length : idx

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black">{rutina.nombre}</p>
            <p className="text-[11px] text-white/45">
              {completado
                ? t('ejercicio.reproductor.completado', '¡Rutina completada!')
                : t('ejercicio.reproductor.paso', 'Ejercicio {i}/{n}', {
                    i: idx + 1,
                    n: posturas.length,
                  })}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            title={t('ejercicio.reproductor.cerrar', 'Cerrar')}
            className="ml-auto rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>

        {/* Progreso por posturas */}
        <div className="mb-3 flex gap-1">
          {posturas.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{ background: i < hechos ? COLOR : i === idx && !completado ? '#ffffff55' : '#ffffff1a' }}
            />
          ))}
        </div>

        {/* Imagen de la postura actual */}
        <div className="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {url ? (
            <img src={url} alt={posturas[idx]} className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 py-6 text-white/25">
              <span className="text-3xl">
                <Icono nombre="foto" />
              </span>
              <span className="text-[11px]">
                {t('ejercicio.reproductor.sinImagen', 'Sin imagen · añádela en el catálogo')}
              </span>
            </span>
          )}
        </div>

        <p className="mb-1 truncate text-center text-lg font-bold">{posturas[idx]}</p>

        {/* Contador */}
        <p className="text-center text-5xl font-black tabular-nums" style={{ color: COLOR }}>
          {fmt(restante)}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLOR }} />
        </div>

        {!corriendo && !completado && (
          <label className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/45">
            {t('ejercicio.reproductor.segundos', 'Segundos por postura')}
            <input
              type="number"
              min={1}
              value={segPostura}
              onChange={(e) => {
                const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                setSegPostura(v)
                setRestante(v)
              }}
              className="w-16 rounded-lg bg-black/30 px-2 py-1 text-center text-sm border border-white/10"
            />
          </label>
        )}

        {/* Controles */}
        {completado ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => irA(0)}
              className="flex-1 rounded-xl bg-white/10 py-2.5 font-bold text-white/80 hover:bg-white/20"
            >
              <Icono nombre="rotar-izq" /> {t('ejercicio.reproductor.reiniciar', 'Repetir')}
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 rounded-xl py-2.5 font-bold texto-cta"
              style={{ background: COLOR }}
            >
              <Icono nombre="hecho" /> {t('ejercicio.reproductor.terminar', 'Terminar')}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => irA(idx - 1)}
              disabled={idx === 0}
              title={t('ejercicio.reproductor.anterior', 'Anterior')}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-lg hover:bg-white/20 disabled:opacity-30"
            >
              <Icono nombre="volver" />
            </button>
            <button
              type="button"
              onClick={alternar}
              className="rounded-full px-6 py-3 text-lg texto-cta shadow-lg"
              style={{ background: COLOR }}
            >
              <Icono
                nombre={corriendo ? 'pausa' : 'play'}
                title={corriendo ? t('ejercicio.timer.pausa', 'Pausa') : t('ejercicio.timer.play', 'Reanudar')}
              />
            </button>
            <button
              type="button"
              onClick={siguiente}
              title={t('ejercicio.reproductor.siguiente', 'Siguiente')}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-lg hover:bg-white/20"
            >
              <Icono nombre="siguiente" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
