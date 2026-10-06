import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react'
import { Retrato } from '../../buzon/ui/Retrato'
import { useT } from '../../i18n/useT'
import { Icono } from '../../ui/iconos/Icono'
import { enviarCharla, MAX_TEXTO, useCharla } from '../charla'
import { usePartida } from '../partidaStore'
import { alternarMicro, entrarVoz, reanudarAudio, salirVoz, useVoz } from '../voz'
import type { JugadorSala, Ranura } from '../tipos'

/**
 * Charla de la sala mientras se juega: texto + voz en vivo. Montada UNA vez en
 * la raíz de `App.tsx` (el `ChatBox` está desmontado dentro de cuartos, en la
 * carrera y en el paintball). Solo existe con sala viva y al menos dos personas.
 *
 * Calca la barra del chat de la casa: a la izquierda la cara de con quién se
 * habla (abre los mensajes, que salen encima), la caja de texto, el micrófono y
 * enviar. Con más de una persona, la cara abre a quién escribirle: a una sola o
 * a «Todos». Se pliega a una pastilla (cara + micro) y se mueve por su asa a
 * donde el usuario quiera; la posición se recuerda por el borde de ABAJO, así los mensajes crecen
 * hacia arriba como en el chat. Sin posición guardada va al borde derecho, a media altura.
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
  const con = useCharla((s) => s.con)
  const setCon = useCharla((s) => s.setCon)
  const voz = useVoz()
  const [texto, setTexto] = useState('')
  const [eligiendo, setEligiendo] = useState(false)
  const otros = jugadores.filter((j) => j.ranura !== mi)
  // Con una sola persona más, hablar con ella ES hablar con la sala: no hay a quién elegir.
  const varios = otros.length > 1
  const destino = varios && con && otros.some((j) => j.ranura === con) ? con : null
  const cara = destino ? otros.find((j) => j.ranura === destino) : varios ? null : otros[0]
  const [pos, setPos] = useState<Pos | null>(leerPos)
  const caja = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  /** Dónde se agarró la caja, relativo a su esquina inferior izquierda. */
  const agarre = useRef<{ dx: number; dy: number } | null>(null)

  // Al cambiar el tamaño de la ventana (o al desplegar) la posición guardada
  // puede quedar fuera: se acota con la caja entera, mensajes incluidos.
  useEffect(() => {
    const ajustar = () => {
      const r = caja.current?.getBoundingClientRect()
      if (r) setPos((p) => (p ? acotar(p, r.width, r.height) : p))
    }
    ajustar()
    addEventListener('resize', ajustar)
    return () => removeEventListener('resize', ajustar)
  }, [abierta])

  const nombre = (r: Ranura) => {
    if (r === mi) return t('partida.sala.tu', 'Tú')
    const j = jugadores.find((x) => x.ranura === r)
    return j ? j.nombre || (j.alias ? `@${j.alias}` : r) : t('partida.alguien', 'Alguien')
  }

  const enviar = () => {
    if (enviarCharla(texto, destino)) setTexto('')
  }

  // Arrastre por el asa: la captura va SOLO en el asa (en la caja entera
  // dejaría muertos los botones de dentro).
  const empezar = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = caja.current?.getBoundingClientRect()
    if (!r) return
    e.currentTarget.setPointerCapture(e.pointerId)
    agarre.current = { dx: e.clientX - r.left, dy: r.bottom - e.clientY }
  }
  const mover = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const a = agarre.current
    const r = caja.current?.getBoundingClientRect()
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

  const asa = (
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
      <Icono nombre="asa" />
    </button>
  )

  /** Aro de voz: verde si habla, rojo si se quedó sin conexión de voz. */
  const aro = (r: Ranura) =>
    voz.hablando[r] ? 'ring-emerald-400' : voz.conexiones[r] === 'fallo' ? 'ring-red-400' : 'ring-transparent'
  const todos = t('partida.charla.todos', 'Todos')

  // La cara de con quién se habla, a la izquierda como el asistente en el chat
  // de la casa. Con una sola persona abre y cierra los mensajes; con varias
  // abre a quién escribirle.
  const tituloCara = varios
    ? t('partida.charla.conQuien', '¿Con quién hablas?')
    : abierta
      ? t('partida.charla.plegar', 'Plegar')
      : t('partida.charla.abrir', 'Charla de la sala')
  const caras = (
    <button
      type="button"
      onClick={() => (varios ? setEligiendo(!eligiendo) : setAbierta(!abierta))}
      title={tituloCara}
      aria-label={tituloCara}
      aria-expanded={varios ? eligiendo : abierta}
      className={`relative flex h-10 shrink-0 items-center rounded-xl px-1.5 transition ${
        abierta || eligiendo ? 'bg-accent/20' : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      {cara ? (
        <span title={nombre(cara.ranura)} className={`rounded-full ring-2 ${aro(cara.ranura)}`}>
          <Retrato retrato={cara.retrato} emoji={cara.emoji} className="h-7 w-7" textoClase="text-base" />
        </span>
      ) : (
        <span title={todos} className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-base">
          <Icono nombre="companeros" />
        </span>
      )}
      {noLeidos > 0 && !abierta && (
        <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white tabular-nums">
          {noLeidos > 9 ? '9+' : noLeidos}
        </span>
      )}
    </button>
  )

  const tituloMicro = !voz.activa
    ? voz.pidiendo
      ? t('partida.voz.pidiendo', 'Pidiendo micro…')
      : t('partida.voz.unirse', 'Unirse a la voz')
    : voz.microMudo
      ? t('partida.voz.activarMicro', 'Activar micro')
      : t('partida.voz.silenciarMicro', 'Silenciar micro')
  // Micrófono: entra a la voz y, ya dentro, se silencia o se activa.
  const micro = (
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
  )
  const colgar = voz.activa && (
    <button
      type="button"
      onClick={() => salirVoz()}
      title={t('partida.voz.salir', 'Salir de la voz')}
      aria-label={t('partida.voz.salir', 'Salir de la voz')}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-red-400 transition hover:bg-red-500/15"
    >
      <Icono nombre="telefono" />
    </button>
  )

  return (
    <div
      ref={caja}
      className={`pointer-events-auto fixed z-40 flex flex-col gap-2 ${abierta ? 'w-80 max-w-[calc(100vw-0.5rem)]' : 'items-end'} ${
        pos ? '' : 'safe-fin end-2 bottom-[40%]'
      }`}
      style={pos ? { left: pos.x, bottom: pos.b } : undefined}
      onMouseDown={parar}
      onPointerDown={parar}
      onTouchStart={parar}
    >
      {eligiendo && varios && (
        // A quién escribirle: a todos o a una sola persona.
        <div className="ui-panel-glass ui-pop flex flex-col gap-1 rounded-2xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md">
          {[null, ...otros].map((j) => {
            const r = j?.ranura ?? null
            return (
              <button
                key={r ?? 'todos'}
                type="button"
                onClick={() => {
                  setCon(r)
                  setEligiendo(false)
                }}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm transition ${
                  r === destino ? 'bg-accent/20 font-semibold' : 'hover:bg-white/10'
                }`}
              >
                {j ? (
                  <span className={`rounded-full ring-2 ${aro(j.ranura)}`}>
                    <Retrato retrato={j.retrato} emoji={j.emoji} className="h-7 w-7" textoClase="text-base" />
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-base">
                    <Icono nombre="companeros" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{j ? nombre(j.ranura) : todos}</span>
              </button>
            )
          })}
        </div>
      )}

      {abierta && (
        <Panel
          jugadores={jugadores}
          mi={mi}
          nombre={nombre}
          titulo={cara ? nombre(cara.ranura) : t('partida.charla.tituloTodos', 'Todos · {n}', { n: jugadores.length })}
          destino={destino}
          varios={varios}
          onPlegar={() => setAbierta(false)}
        />
      )}

      {voz.audioBloqueado && (
        <button
          type="button"
          onClick={reanudarAudio}
          className="ui-panel-glass self-end rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold shadow-lg"
        >
          <Icono nombre="bocina" /> {t('partida.voz.tocarOir', 'Toca para oír')}
        </button>
      )}

      {abierta ? (
        // La barra, como la del chat de la casa: escribir, micrófono y enviar.
        <form
          className="ui-panel-glass flex items-center gap-1.5 rounded-2xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md"
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          {asa}
          {caras}
          <input
            ref={campo}
            value={texto}
            maxLength={MAX_TEXTO}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Escape suelta el foco y devuelve las teclas al juego.
              if (e.key === 'Escape') campo.current?.blur()
            }}
            placeholder={
              destino
                ? t('partida.charla.escribeA', 'Escribe a {n}…', { n: nombre(destino) })
                : t('partida.charla.escribe', 'Escribe a la sala…')
            }
            aria-label={
              destino
                ? t('partida.charla.escribeA', 'Escribe a {n}…', { n: nombre(destino) })
                : t('partida.charla.escribe', 'Escribe a la sala…')
            }
            className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-white/90 outline-none"
          />
          {micro}
          {colgar}
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
      ) : (
        // Plegada: una pastilla con los participantes (y los no leídos) y el micrófono.
        <div className="ui-panel-glass flex items-center gap-1 rounded-2xl border border-white/10 p-1.5 shadow-xl backdrop-blur-md">
          {asa}
          {caras}
          {micro}
          {colgar}
        </div>
      )}
    </div>
  )
}

/**
 * Encima de la barra: solo los mensajes de la conversación elegida. Con
 * `destino`, los de esa persona conmigo a solas; con «Todos», los de la sala
 * (con una sola persona más no hay diferencia: se ven todos).
 */
function Panel({
  jugadores,
  mi,
  nombre,
  titulo,
  destino,
  varios,
  onPlegar,
}: {
  jugadores: JugadorSala[]
  mi: Ranura
  nombre: (r: Ranura) => string
  titulo: string
  destino: Ranura | null
  varios: boolean
  onPlegar: () => void
}) {
  const t = useT()
  const todosLosMensajes = useCharla((s) => s.mensajes)
  const mensajes = !varios
    ? todosLosMensajes
    : destino
      ? todosLosMensajes.filter((m) => (m.j === destino && m.a === mi) || (m.j === mi && m.a === destino))
      : todosLosMensajes.filter((m) => !m.a)
  const voz = useVoz()
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes.length])

  const retrato = (r: Ranura) => jugadores.find((j) => j.ranura === r)

  return (
    <div className="ui-panel-glass ui-pop flex flex-col gap-2 rounded-2xl border border-white/10 p-2.5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold">{titulo}</p>
        <button
          type="button"
          onClick={onPlegar}
          title={t('partida.charla.plegar', 'Plegar')}
          aria-label={t('partida.charla.plegar', 'Plegar')}
          className="grid h-7 w-7 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="bajar" />
        </button>
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
