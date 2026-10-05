import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react'
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
 * Calca la barra del chat de la casa: las caras de la sala a la izquierda (abren
 * y cierran los mensajes), la caja de texto en medio y el micrófono y enviar a
 * la derecha. Se mueve por su asa a donde el usuario quiera; la posición se
 * recuerda por el borde de ABAJO, así los mensajes crecen hacia arriba como en
 * el chat. Sin posición guardada va al borde derecho, a media altura.
 */
export function CharlaSala() {
  const sala = usePartida((s) => s.sala)
  const dentro = sala?.jugadores.filter((j) => j.estado === 'dentro') ?? []
  if (!sala || dentro.length < 2) return null
  return <Charla jugadores={dentro} mi={sala.miRanura} />
}

/** Que el clic o el toque no llegue a `window`: la mira del paintball dispararía. */
const parar = (e: SyntheticEvent) => e.stopPropagation()

const LS_POS = 'mh.charlaSala.pos'
/** Posición: `x` = borde izquierdo y `b` = distancia al borde de abajo, en px. */
interface Pos {
  x: number
  b: number
}

function leerPos(): Pos | null {
  try {
    const p = JSON.parse(localStorage.getItem(LS_POS) ?? 'null') as Pos | null
    return p && Number.isFinite(p.x) && Number.isFinite(p.b) ? p : null
  } catch {
    return null
  }
}

/** Que la barra no se salga de la pantalla (al moverla o al girar el teléfono). */
function acotar(p: Pos, ancho: number, alto: number): Pos {
  return {
    x: Math.min(Math.max(4, p.x), Math.max(4, innerWidth - ancho - 4)),
    b: Math.min(Math.max(4, p.b), Math.max(4, innerHeight - alto - 4)),
  }
}

function Charla({ jugadores, mi }: { jugadores: JugadorSala[]; mi: Ranura }) {
  const t = useT()
  const abierta = useCharla((s) => s.abierta)
  const setAbierta = useCharla((s) => s.setAbierta)
  const noLeidos = useCharla((s) => s.noLeidos)
  const voz = useVoz()
  const [texto, setTexto] = useState('')
  const [pos, setPos] = useState<Pos | null>(leerPos)
  const barra = useRef<HTMLFormElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  /** Dónde se agarró la barra, relativo a su esquina inferior izquierda. */
  const agarre = useRef<{ dx: number; dy: number } | null>(null)

  // Al cambiar el tamaño de la ventana la posición guardada puede quedar fuera.
  useEffect(() => {
    const ajustar = () => {
      const r = barra.current?.getBoundingClientRect()
      if (r) setPos((p) => (p ? acotar(p, r.width, r.height) : p))
    }
    addEventListener('resize', ajustar)
    return () => removeEventListener('resize', ajustar)
  }, [])

  const nombre = (r: Ranura) => {
    if (r === mi) return t('partida.sala.tu', 'Tú')
    const j = jugadores.find((x) => x.ranura === r)
    return j ? j.nombre || (j.alias ? `@${j.alias}` : r) : t('partida.alguien', 'Alguien')
  }

  const enviar = () => {
    if (enviarCharla(texto)) setTexto('')
  }

  // Arrastre por el asa: la captura va SOLO en el asa (en la caja entera
  // dejaría muertos los botones de dentro).
  const empezar = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = barra.current?.getBoundingClientRect()
    if (!r) return
    e.currentTarget.setPointerCapture(e.pointerId)
    agarre.current = { dx: e.clientX - r.left, dy: r.bottom - e.clientY }
  }
  const mover = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const a = agarre.current
    const r = barra.current?.getBoundingClientRect()
    if (!a || !r) return
    setPos(acotar({ x: e.clientX - a.dx, b: innerHeight - (e.clientY + a.dy) }, r.width, r.height))
  }
  const soltar = () => {
    if (!agarre.current) return
    agarre.current = null
    try {
      if (pos) localStorage.setItem(LS_POS, JSON.stringify(pos))
    } catch {
      // Sin almacenamiento la posición dura lo que la pestaña.
    }
  }

  const tituloMicro = !voz.activa
    ? voz.pidiendo
      ? t('partida.voz.pidiendo', 'Pidiendo micro…')
      : t('partida.voz.unirse', 'Unirse a la voz')
    : voz.microMudo
      ? t('partida.voz.activarMicro', 'Activar micro')
      : t('partida.voz.silenciarMicro', 'Silenciar micro')
  const tituloCaras = abierta ? t('partida.charla.plegar', 'Plegar') : t('partida.charla.abrir', 'Charla de la sala')

  return (
    <div
      className={`pointer-events-auto fixed z-40 flex w-80 max-w-[calc(100vw-0.5rem)] flex-col gap-2 ${
        pos ? '' : 'safe-fin end-2 bottom-[40%]'
      }`}
      style={pos ? { left: pos.x, bottom: pos.b } : undefined}
      onMouseDown={parar}
      onPointerDown={parar}
      onTouchStart={parar}
    >
      {abierta && <Panel jugadores={jugadores} mi={mi} nombre={nombre} />}

      {voz.audioBloqueado && (
        <button
          type="button"
          onClick={reanudarAudio}
          className="ui-panel-glass self-end rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold shadow-lg"
        >
          <Icono nombre="bocina" /> {t('partida.voz.tocarOir', 'Toca para oír')}
        </button>
      )}

      {/* La barra, como la del chat de la casa. */}
      <form
        ref={barra}
        className="ui-panel-glass flex items-center gap-1.5 rounded-2xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md"
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        <button
          type="button"
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          title={t('partida.charla.mover', 'Mover el chat')}
          aria-label={t('partida.charla.mover', 'Mover el chat')}
          className="grid h-9 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-white/35 hover:bg-white/10 hover:text-white/70 active:cursor-grabbing"
        >
          <Icono nombre="mover" />
        </button>

        {/* Las caras de la sala: abren y cierran los mensajes. */}
        <button
          type="button"
          onClick={() => setAbierta(!abierta)}
          title={tituloCaras}
          aria-label={tituloCaras}
          className={`relative flex h-10 shrink-0 items-center rounded-xl px-1.5 transition ${
            abierta ? 'bg-accent/20' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {jugadores.slice(0, 4).map((j, i) => (
            <span
              key={j.ranura}
              className={`rounded-full ring-2 ${voz.hablando[j.ranura] ? 'ring-emerald-400' : 'ring-transparent'} ${i ? '-ms-2' : ''}`}
            >
              <Retrato retrato={j.retrato} emoji={j.emoji} className="h-7 w-7" textoClase="text-base" />
            </span>
          ))}
          {noLeidos > 0 && !abierta && (
            <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white tabular-nums">
              {noLeidos > 9 ? '9+' : noLeidos}
            </span>
          )}
        </button>

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
          className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-white/90 outline-none"
        />

        {/* Micrófono: entra a la voz y, ya dentro, se silencia o se activa. */}
        <button
          type="button"
          disabled={voz.pidiendo}
          onClick={() => (voz.activa ? alternarMicro() : void entrarVoz())}
          title={tituloMicro}
          aria-label={tituloMicro}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition disabled:animate-pulse ${
            voz.activa && !voz.microMudo
              ? `bg-emerald-500/20 text-emerald-400 ${voz.hablando[mi] ? 'ring-2 ring-emerald-400' : ''}`
              : voz.activa
                ? 'bg-red-500/15 text-red-400'
                : 'text-white/45 hover:bg-white/10 hover:text-white/85'
          }`}
        >
          <Icono nombre={voz.activa && voz.microMudo ? 'silencio' : 'microfono'} />
        </button>
        {voz.activa && (
          <button
            type="button"
            onClick={() => salirVoz()}
            title={t('partida.voz.salir', 'Salir de la voz')}
            aria-label={t('partida.voz.salir', 'Salir de la voz')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-red-400 transition hover:bg-red-500/15"
          >
            <Icono nombre="telefono" />
          </button>
        )}

        {texto.trim() && (
          <button
            type="submit"
            title={t('partida.charla.enviar', 'Enviar')}
            aria-label={t('partida.charla.enviar', 'Enviar')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-lg text-accent-ink transition"
          >
            <Icono nombre="enviar" />
          </button>
        )}
      </form>
    </div>
  )
}

/** Encima de la barra: quién está (con su voz) y los mensajes. */
function Panel({
  jugadores,
  mi,
  nombre,
}: {
  jugadores: JugadorSala[]
  mi: Ranura
  nombre: (r: Ranura) => string
}) {
  const t = useT()
  const mensajes = useCharla((s) => s.mensajes)
  const voz = useVoz()
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes.length])

  const retrato = (r: Ranura) => jugadores.find((j) => j.ranura === r)

  return (
    <div className="ui-panel-glass ui-pop flex flex-col gap-2 rounded-2xl border border-white/10 p-2.5 shadow-xl backdrop-blur-md">
      <p className="truncate text-xs font-bold">{t('partida.charla.titulo', 'Sala · {n}', { n: jugadores.length })}</p>

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
    </div>
  )
}
