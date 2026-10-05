import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Retrato } from '../../buzon/ui/Retrato'
import { useT } from '../../i18n/useT'
import { Icono } from '../../ui/iconos/Icono'
import { enviarCharla, MAX_TEXTO, useCharla } from '../charla'
import { usePartida } from '../partidaStore'
import { alternarMicro, alternarSilencio, entrarVoz, reanudarAudio, salirVoz, useVoz } from '../voz'
import type { JugadorSala, Ranura } from '../tipos'

/**
 * Charla de la sala mientras se juega: texto + voz en vivo. Montada UNA vez en
 * la raíz de `App.tsx` (el `ChatBox` está desmontado dentro de cuartos, en la
 * carrera y en el paintball). Solo existe con sala viva y al menos dos personas.
 *
 * Va al borde derecho, a media altura: abajo están el joystick (izquierda) y
 * los botones de acción (derecha), y arriba el marcador centrado.
 */
export function CharlaSala() {
  const sala = usePartida((s) => s.sala)
  const dentro = sala?.jugadores.filter((j) => j.estado === 'dentro') ?? []
  if (!sala || dentro.length < 2) return null
  return <Charla jugadores={dentro} mi={sala.miRanura} />
}

/** Que el clic o el toque no llegue a `window`: la mira del paintball dispararía. */
const parar = (e: SyntheticEvent) => e.stopPropagation()

function Charla({ jugadores, mi }: { jugadores: JugadorSala[]; mi: Ranura }) {
  const t = useT()
  const abierta = useCharla((s) => s.abierta)
  const setAbierta = useCharla((s) => s.setAbierta)
  const noLeidos = useCharla((s) => s.noLeidos)
  const voz = useVoz()

  const nombre = (r: Ranura) => {
    if (r === mi) return t('partida.sala.tu', 'Tú')
    const j = jugadores.find((x) => x.ranura === r)
    return j ? j.nombre || (j.alias ? `@${j.alias}` : r) : t('partida.alguien', 'Alguien')
  }

  return (
    <div
      className="safe-fin pointer-events-auto fixed end-2 top-[28%] z-40 flex flex-col items-end gap-2"
      onMouseDown={parar}
      onPointerDown={parar}
      onTouchStart={parar}
    >
      {abierta ? (
        <Panel jugadores={jugadores} mi={mi} nombre={nombre} onPlegar={() => setAbierta(false)} />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAbierta(true)}
            title={t('partida.charla.abrir', 'Charla de la sala')}
            aria-label={t('partida.charla.abrir', 'Charla de la sala')}
            className="ui-panel-glass relative grid h-11 w-11 place-items-center rounded-full border border-white/15 text-lg shadow-lg transition hover:brightness-125"
          >
            <Icono nombre="chat" />
            {noLeidos > 0 && (
              <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white tabular-nums">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <BotonVoz />
        </>
      )}
      {voz.audioBloqueado && (
        <button
          type="button"
          onClick={reanudarAudio}
          className="ui-panel-glass rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold shadow-lg"
        >
          <Icono nombre="bocina" /> {t('partida.voz.tocarOir', 'Toca para oír')}
        </button>
      )}
    </div>
  )
}

/** Plegada: unirse a la voz, o (ya dentro) silenciar mi micro. */
function BotonVoz() {
  const t = useT()
  const activa = useVoz((s) => s.activa)
  const pidiendo = useVoz((s) => s.pidiendo)
  const mudo = useVoz((s) => s.microMudo)
  const mi = usePartida((s) => s.sala?.miRanura)
  const hablo = useVoz((s) => (mi ? !!s.hablando[mi] : false))
  const titulo = !activa
    ? t('partida.voz.unirse', 'Unirse a la voz')
    : mudo
      ? t('partida.voz.activarMicro', 'Activar micro')
      : t('partida.voz.silenciarMicro', 'Silenciar micro')
  return (
    <button
      type="button"
      disabled={pidiendo}
      onClick={() => (activa ? alternarMicro() : void entrarVoz())}
      title={titulo}
      aria-label={titulo}
      className={`ui-panel-glass grid h-11 w-11 place-items-center rounded-full border text-lg shadow-lg transition hover:brightness-125 disabled:opacity-50 ${
        activa && !mudo ? 'border-emerald-400/70' : 'border-white/15'
      } ${hablo ? 'ring-2 ring-emerald-400' : ''}`}
    >
      <Icono nombre={activa && mudo ? 'silencio' : 'microfono'} />
    </button>
  )
}

function Panel({
  jugadores,
  mi,
  nombre,
  onPlegar,
}: {
  jugadores: JugadorSala[]
  mi: Ranura
  nombre: (r: Ranura) => string
  onPlegar: () => void
}) {
  const t = useT()
  const mensajes = useCharla((s) => s.mensajes)
  const voz = useVoz()
  const [texto, setTexto] = useState('')
  const lista = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes.length])

  const enviar = () => {
    if (enviarCharla(texto)) setTexto('')
  }

  const retrato = (r: Ranura) => jugadores.find((j) => j.ranura === r)

  return (
    <div className="ui-panel-glass ui-pop flex w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-2xl border border-white/10 p-2.5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold">
          {t('partida.charla.titulo', 'Sala · {n}', { n: jugadores.length })}
        </p>
        <button
          type="button"
          onClick={onPlegar}
          title={t('partida.charla.plegar', 'Plegar')}
          aria-label={t('partida.charla.plegar', 'Plegar')}
          className="rounded-lg px-2 py-0.5 text-white/50 transition hover:bg-white/10"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      {/* Quién está y quién habla. */}
      <div className="flex flex-wrap gap-1.5">
        {jugadores.map((j) => {
          const enVoz = j.ranura === mi ? voz.activa : !!voz.enVoz[j.ranura]
          const mudo = j.ranura === mi ? voz.microMudo : !!voz.enVoz[j.ranura]?.mu
          const conexion = voz.conexiones[j.ranura]
          const silenciado = !!voz.silenciados[j.ranura]
          return (
            <div key={j.ranura} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-0.5 ps-0.5 pe-1.5">
              <span className={`rounded-full ${voz.hablando[j.ranura] ? 'ring-2 ring-emerald-400' : ''}`}>
                <Retrato retrato={j.retrato} emoji={j.emoji} className="h-6 w-6" textoClase="text-sm" />
              </span>
              <span className="max-w-[5.5rem] truncate text-[11px]">{nombre(j.ranura)}</span>
              {enVoz && (
                <span
                  className={`text-[11px] ${conexion === 'fallo' ? 'text-red-400' : conexion === 'conectando' ? 'text-amber-300' : 'text-white/60'}`}
                  title={
                    conexion === 'fallo'
                      ? t('partida.voz.fallo', 'Sin conexión de voz')
                      : conexion === 'conectando'
                        ? t('partida.voz.conectando', 'Conectando…')
                        : t('partida.voz.enVoz', 'En la voz')
                  }
                >
                  <Icono nombre={mudo ? 'silencio' : 'microfono'} />
                </span>
              )}
              {voz.activa && j.ranura !== mi && enVoz && (
                <button
                  type="button"
                  onClick={() => alternarSilencio(j.ranura)}
                  title={silenciado ? t('partida.voz.oir', 'Volver a oír') : t('partida.voz.silenciar', 'Silenciar')}
                  aria-label={silenciado ? t('partida.voz.oir', 'Volver a oír') : t('partida.voz.silenciar', 'Silenciar')}
                  className={`rounded-full px-1 text-[11px] transition hover:bg-white/10 ${silenciado ? 'text-red-400' : 'text-white/50'}`}
                >
                  <Icono nombre={silenciado ? 'silencio' : 'bocina'} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Controles de voz. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {!voz.activa ? (
          <button
            type="button"
            disabled={voz.pidiendo}
            onClick={() => void entrarVoz()}
            className="ui-boton flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
          >
            <Icono nombre="microfono" />{' '}
            {voz.pidiendo ? t('partida.voz.pidiendo', 'Pidiendo micro…') : t('partida.voz.unirse', 'Unirse a la voz')}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={alternarMicro}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs transition hover:bg-white/10"
            >
              <Icono nombre={voz.microMudo ? 'silencio' : 'microfono'} />{' '}
              {voz.microMudo ? t('partida.voz.activarMicro', 'Activar micro') : t('partida.voz.silenciarMicro', 'Silenciar micro')}
            </button>
            <button
              type="button"
              onClick={() => salirVoz()}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-red-300 transition hover:bg-white/10"
            >
              <Icono nombre="telefono" /> {t('partida.voz.salir', 'Salir de la voz')}
            </button>
          </>
        )}
      </div>
      {voz.error && (
        <p className="text-[11px] leading-snug text-red-400/90">
          {voz.error === 'permiso'
            ? t('partida.voz.error.permiso', 'No hay permiso para usar el micrófono')
            : t('partida.voz.error.soporte', 'Este dispositivo no admite voz en vivo')}
        </p>
      )}

      {/* Mensajes. */}
      <div ref={lista} className="max-h-48 min-h-12 space-y-1.5 overflow-y-auto pe-1">
        {mensajes.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-white/40">{t('partida.charla.vacia', 'Saluda a la sala')}</p>
        ) : (
          mensajes.map((m) => {
            const j = retrato(m.j)
            return (
              <div key={m.id} className="flex items-start gap-1.5">
                <Retrato retrato={j?.retrato} emoji={j?.emoji ?? ''} className="h-5 w-5" textoClase="text-xs" />
                <p className="min-w-0 flex-1 text-xs leading-snug break-words">
                  <span className={`font-semibold ${m.j === mi ? 'text-white' : 'text-white/60'}`}>{nombre(m.j)}</span>{' '}
                  <span className="text-white/90">{m.tx}</span>
                </p>
              </div>
            )
          })
        )}
      </div>

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        <input
          ref={campo}
          value={texto}
          maxLength={MAX_TEXTO}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Escape suelta el foco y devuelve las teclas al juego.
            if (e.key === 'Escape') campo.current?.blur()
          }}
          placeholder={t('partida.charla.escribe', 'Escribe a la sala…')}
          aria-label={t('partida.charla.escribe', 'Escribe a la sala…')}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs outline-none focus:border-white/30"
        />
        <button
          type="submit"
          disabled={!texto.trim()}
          title={t('partida.charla.enviar', 'Enviar')}
          aria-label={t('partida.charla.enviar', 'Enviar')}
          className="ui-boton grid h-8 w-8 place-items-center rounded-lg disabled:opacity-40"
        >
          <Icono nombre="enviar" />
        </button>
      </form>
    </div>
  )
}
