import { Suspense, useEffect, useRef, useState } from 'react'
import type { ImagenEjercicio, TipoEntrenamiento } from '../../core/data/db'
import { guardarMusicaRutina, musicaRutinaEncendida, useMusicaRutina } from '../../core/audio/musicaRutina'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { useUrlImagen } from './imagenIA'
import { urlImagenPreset } from './imagenesPreset'
import { VisorEjercicio, tienePatron } from './anim'
import { normalizarEjercicio } from './stats'
import { pitar } from './pitar'
import { nombreEjercicio, nombreRutina } from './nombres'

/** Color de la modalidad y segundos por ejercicio al abrir (flex: el mismo defecto que el formulario). */
const CONFIG: Record<TipoEntrenamiento, { color: string; segundos: number }> = {
  flexibilidad: { color: '#a78bfa', segundos: 30 },
  fuerza: { color: '#f97316', segundos: 45 },
  resistencia: { color: '#38bdf8', segundos: 120 },
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Reproductor guiado de una rutina (las tres modalidades): al «Iniciar» muestra
 * el ejercicio actual —el avatar haciéndolo en 3D, o su imagen si no tiene
 * animación— y un contador en cuenta regresiva. Al agotarse el tiempo pita y
 * salta al siguiente; también se puede avanzar/retroceder a mano. Es un apoyo
 * del momento: no guarda nada (la sesión se registra aparte). Mientras está
 * abierto suena la música de ejercicio (`useMusicaRutina`), con un ♫ para
 * apagarla; la elección se recuerda.
 */
export function ReproductorRutina({
  tipo,
  rutina,
  imgPorClave,
  onCerrar,
}: {
  tipo: TipoEntrenamiento
  rutina: { nombre: string; ejercicios?: string[] }
  imgPorClave: Map<string, ImagenEjercicio>
  onCerrar: () => void
}) {
  const t = useT()
  const { color: COLOR, segundos: SEG_DEFECTO } = CONFIG[tipo]
  const posturas = rutina.ejercicios?.length ? rutina.ejercicios : [rutina.nombre]
  const [idx, setIdx] = useState(0)
  // Animación o ilustración del ejercicio en curso (conmutable; la animación gana si existe).
  const [vista, setVista] = useState<'anim' | 'foto'>('anim')
  const conAnim = tienePatron(posturas[idx])
  // Segundos por postura: ajustable en pausa (se conserva para las siguientes).
  const [segPostura, setSegPostura] = useState(SEG_DEFECTO)
  const [restante, setRestante] = useState(SEG_DEFECTO)
  const [corriendo, setCorriendo] = useState(true)
  const [completado, setCompletado] = useState(false)
  // Momento (época ms) en que termina el conteo de la postura en curso.
  const finRef = useRef(0)
  // Música de ejercicio mientras el reproductor está abierto (la casa la toca; aquí solo se manda).
  const [musica, setMusica] = useState(musicaRutinaEncendida)
  useEffect(() => {
    useMusicaRutina.setState({ modo: musica ? 'on' : 'off' })
    return () => useMusicaRutina.setState({ modo: 'auto' })
  }, [musica])
  const alternarMusica = () => {
    guardarMusicaRutina(!musica)
    setMusica(!musica)
  }

  // La imagen del usuario manda; si no tiene, la ilustración de fábrica.
  const registro = imgPorClave.get(normalizarEjercicio(posturas[idx]))
  const urlPropia = useUrlImagen(registro)
  const url = registro ? urlPropia : urlImagenPreset(posturas[idx])

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
  }, [SEG_DEFECTO])

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
            <p className="truncate text-base font-black">{nombreRutina(t, rutina.nombre)}</p>
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
            onClick={alternarMusica}
            title={
              musica
                ? t('ejercicio.reproductor.musicaOn', 'Música de ejercicio encendida · tocar para apagar')
                : t('ejercicio.reproductor.musicaOff', 'Música de ejercicio apagada · tocar para encender')
            }
            className={`ms-auto rounded-lg px-2 py-1 transition hover:bg-white/10 ${musica ? 'text-white/80' : 'text-white/35'}`}
          >
            <Icono nombre={musica ? 'musica' : 'silencio'} />
          </button>
          <button
            type="button"
            onClick={onCerrar}
            title={t('ejercicio.reproductor.cerrar', 'Cerrar')}
            className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
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

        {/* El ejercicio actual: avatar en 3D (sigue el contador: en pausa se congela) o su imagen
            (contain: las ilustraciones son cuadradas y recortarlas se come la postura) */}
        <div className="relative mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {conAnim && vista === 'anim' ? (
            <Suspense fallback={null}>
              <VisorEjercicio nombre={posturas[idx]} jugando={corriendo} className="h-full" />
            </Suspense>
          ) : url ? (
            <img src={url} alt={nombreEjercicio(t, posturas[idx])} className="h-full w-full object-contain" />
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
          {conAnim && (
            <button
              type="button"
              onClick={() => setVista((v) => (v === 'anim' ? 'foto' : 'anim'))}
              title={
                vista === 'anim'
                  ? t('ejercicio.reproductor.verFoto', 'Ver la ilustración')
                  : t('ejercicio.reproductor.verAnim', 'Ver la animación')
              }
              className="absolute end-1.5 top-1.5 rounded-lg bg-black/50 px-1.5 py-1 text-xs text-white/60 transition hover:text-white"
            >
              <Icono nombre={vista === 'anim' ? 'imagen' : 'persona'} />
            </button>
          )}
        </div>

        <p className="mb-1 truncate text-center text-lg font-bold">{nombreEjercicio(t, posturas[idx])}</p>

        {/* Contador */}
        <p className="text-center text-5xl font-black tabular-nums" style={{ color: COLOR }}>
          {fmt(restante)}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLOR }} />
        </div>

        {!corriendo && !completado && (
          <label className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/45">
            {tipo === 'fuerza'
              ? t('ejercicio.reproductor.segundosEjercicio', 'Segundos por ejercicio')
              : tipo === 'resistencia'
                ? t('ejercicio.reproductor.segundosTramo', 'Segundos por tramo')
                : t('ejercicio.reproductor.segundos', 'Segundos por postura')}
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
