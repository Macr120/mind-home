import { useJuegoCancha, etiquetaTenis } from '../state/juegoCanchaStore'
import { CANCHAS } from '../state/canchasStore'
import { useAsistentes } from '../state/asistentesStore'
import { SliderProp } from './comun/SliderProp'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/** Textos por defecto de los mensajes del minijuego (los emojis de celebración se quedan). */
const MENSAJES: Record<string, string> = {
  gol: '¡GOOOL! 🎉',
  golRival: 'Gol del rival…',
  canasta2: '¡Canasta! +2 🎉',
  canasta3: '¡Triplazo! +3 🎉',
  canastaRival: 'Canasta del rival…',
  fallo: 'Falló el tiro…',
  puntoTenis: '¡Punto tuyo! 🎾',
  puntoTenisRival: 'Punto del rival…',
  juegoTuyo: '¡Juego tuyo! 🎉',
  juegoRival: 'Juego del rival…',
  setTuyo: '¡SET tuyo! 🎉',
  setRival: 'Set del rival…',
  partidoTuyo: '¡GANASTE EL PARTIDO! 🏆',
  partidoRival: 'El rival ganó el partido…',
  aLaRed: 'A la red…',
  fuera: '¡Fuera!',
  peloteo: '¡Buen golpe! +1',
  nuevoRecord: '¡Nuevo récord! 🎉',
  seEscapo: 'Se te escapó…',
  homerun: '¡HOME RUN! +3 🎉',
  hit: '¡Hit! +1',
  foul: 'Foul…',
  strike: '¡Strike!',
  ponche: '¡Ponche! Tres strikes…',
}

/** Tramos de la barra de dificultad. */
const NIVELES: { v: number; clave: string; es: string }[] = [
  { v: 0, clave: 'dif.muyFacil', es: 'Muy fácil' },
  { v: 0.25, clave: 'dif.facil', es: 'Fácil' },
  { v: 0.5, clave: 'dif.normal', es: 'Normal' },
  { v: 0.75, clave: 'dif.dificil', es: 'Difícil' },
  { v: 1, clave: 'dif.experto', es: 'Experto' },
]

/**
 * HUD del minijuego de cancha. Al entrar a una cancha pregunta el modo (solo o
 * contra un asistente) y la dificultad; durante el partido muestra el marcador
 * persistente (con juegos y sets en tenis) y el mensaje del último punto.
 */
export function MarcadorCancha() {
  const t = useT()
  const clase = useJuegoCancha((s) => s.clase)
  const fase = useJuegoCancha((s) => s.fase)
  const modo = useJuegoCancha((s) => s.modo)
  const dificultad = useJuegoCancha((s) => s.dificultad)
  const rivalNombre = useJuegoCancha((s) => s.rivalNombre)
  const yo = useJuegoCancha((s) => s.yo)
  const rival = useJuegoCancha((s) => s.rival)
  const juegosYo = useJuegoCancha((s) => s.juegosYo)
  const juegosRival = useJuegoCancha((s) => s.juegosRival)
  const setsYo = useJuegoCancha((s) => s.setsYo)
  const setsRival = useJuegoCancha((s) => s.setsRival)
  const mejorPeloteo = useJuegoCancha((s) => s.mejorPeloteo)
  const mensaje = useJuegoCancha((s) => s.mensaje)
  const asistentes = useAsistentes((s) => s.lista)
  if (!fase || !clase) return null
  const j = useJuegoCancha.getState()
  const nivel = NIVELES.reduce((a, b) => (Math.abs(b.v - dificultad) < Math.abs(a.v - dificultad) ? b : a))

  if (fase === 'eligiendo') {
    return (
      <div className="pointer-events-none absolute left-0 right-0 top-14 z-30 flex justify-center px-3">
        <div className="ui-hud ui-pop pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-white/10 p-3">
          <p className="text-center text-sm font-black text-white">
            <Icono emoji={CANCHAS[clase].icon} /> {t(`canchas.clase.${clase}`, CANCHAS[clase].corto)} ·{' '}
            {t('juego.comoJugar', '¿Cómo quieres jugar?')}
          </p>
          <SliderProp
            label={t('juego.dificultad', 'Dificultad')}
            value={dificultad}
            min={0}
            max={1}
            step={0.25}
            fmt={() => t(nivel.clave, nivel.es)}
            onChange={(v) => j.setDificultad(v)}
            onReset={() => j.setDificultad(0.5)}
          />
          <button
            type="button"
            onClick={() => j.elegirModo('solo')}
            className="h-10 rounded-lg border border-emerald-400/50 bg-emerald-600 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
          >
            {clase === 'tenis'
              ? t('juego.soloFronton', 'Jugar solo (frontón contra el muro)')
              : clase === 'beisbol'
                ? t('juego.soloMaquina', 'Jugar solo (máquina de pitcheo)')
                : t('juego.solo', 'Jugar solo')}
          </button>
          <p className="text-center text-[11px] font-semibold text-white/50">
            {t('juego.contraIA', 'O contra un asistente:')}
          </p>
          <div className="flex max-h-32 flex-wrap items-center justify-center gap-1.5 overflow-y-auto">
            {asistentes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => j.elegirModo('ia', { id: a.id, nombre: a.nombre, color: a.color })}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                <Icono emoji={a.emoji} /> {a.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Tenis contra la IA: puntos 0/15/30/40 + juegos + sets.
  const tenisIA = clase === 'tenis' && modo === 'ia'
  const pts = tenisIA ? etiquetaTenis(yo, rival) : null
  // En vertical el marcador baja bajo la fila de botones de arriba (casa / engrane).
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-16 z-30 flex flex-col items-center gap-2 sm:top-3">
      <div className="ui-hud flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm font-black text-white">
        <Icono emoji={CANCHAS[clase].icon} />
        {tenisIA && pts ? (
          <>
            <span>
              {t('juego.tu', 'Tú')} {pts.yo} · {pts.rival} {rivalNombre ?? t('juego.rival', 'Rival')}
            </span>
            <span className="text-[10px] font-semibold text-white/50">
              {t('juego.juegos', 'Juegos')} {juegosYo}–{juegosRival} · {t('juego.sets', 'Sets')} {setsYo}–{setsRival}
            </span>
          </>
        ) : clase === 'tenis' ? (
          <span>
            {t('juego.peloteoActual', 'Peloteo')} {yo}
            <span className="ml-2 text-[10px] font-semibold text-white/50">
              {t('juego.record', 'Récord')} {mejorPeloteo}
            </span>
          </span>
        ) : (
          <span>
            {t('juego.tu', 'Tú')} {yo}
            {modo === 'ia' && ` · ${rival} ${rivalNombre ?? t('juego.rival', 'Rival')}`}
          </span>
        )}
        <span className="text-[10px] font-semibold text-white/40">{t(nivel.clave, nivel.es)}</span>
      </div>
      {mensaje && (
        <div className="ui-hud ui-pop rounded-xl border border-amber-300/40 px-5 py-2 text-xl font-black text-amber-300">
          {t(`juego.${mensaje}`, MENSAJES[mensaje] ?? mensaje)}
        </div>
      )}
    </div>
  )
}
