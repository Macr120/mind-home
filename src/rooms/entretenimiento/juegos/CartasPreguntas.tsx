import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useMemo, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { registrarJuegoMesa, useMesa, type Asiento } from '../../../core/partida/mesa'
import { COLOR } from '../constantes'
import { barajar } from './cartas'
import { ElegirModo } from './ElegirModo'
import { BarraMesa, opcionEnLinea } from './mesaJuego'
import type { PropsDificultad } from './dificultad'
import {
  GRUPOS_CONOCERSE,
  GRUPOS_DEBATES,
  PREGUNTAS_CONOCERSE,
  PREGUNTAS_DEBATES,
  type GrupoPregunta,
  type Pregunta,
} from './preguntas'
import { useBancoPreguntas } from './preguntas.i18n'

export type MazoId = 'conocerse' | 'debates'

/**
 * Los dos mazos barajados UNA vez por el árbitro (viaja el ORDEN, no la
 * semilla) y el puntero compartido. El mazo lo fija quien abre la mesa.
 */
export interface EstadoCartas {
  mazo: MazoId
  oc: number[]
  od: number[]
  pos: number
}

/** Pasar de carta (cualquiera de los dos) o fijar el mazo (solo quien abre). */
type MovCartas = { pos: number; mazo?: undefined } | { mazo: MazoId; pos?: undefined }

function inicialCartas(): EstadoCartas {
  const indices = (n: number) => Array.from({ length: n }, (_, i) => i)
  return {
    mazo: 'conocerse',
    oc: barajar(indices(PREGUNTAS_CONOCERSE.length)),
    od: barajar(indices(PREGUNTAS_DEBATES.length)),
    pos: 0,
  }
}

function ordenDe(e: EstadoCartas): number[] {
  return e.mazo === 'conocerse' ? e.oc : e.od
}

/**
 * Reductor puro. Aquí no hay turnos: la carta es un puntero compartido y lo
 * mueve cualquiera de los dos asientos. El mazo solo lo cambia quien abrió la
 * mesa y antes de pasar la primera carta.
 */
function aplicarCartas(e: EstadoCartas, m: MovCartas, asiento: Asiento): EstadoCartas | null {
  if (m?.mazo !== undefined) {
    if (asiento !== 'a' || e.pos !== 0 || m.mazo === e.mazo) return null
    return m.mazo === 'conocerse' || m.mazo === 'debates' ? { ...e, mazo: m.mazo } : null
  }
  const pos = m?.pos
  if (typeof pos !== 'number' || !Number.isInteger(pos) || pos === e.pos) return null
  return pos >= 0 && pos <= ordenDe(e).length ? { ...e, pos } : null
}

registrarJuegoMesa<EstadoCartas, MovCartas>('cartas', {
  inicial: inicialCartas,
  aplicar: aplicarCartas,
  terminado: (e) => e.pos >= ordenDe(e).length,
})

function MazoPreguntas({
  mazoId,
  preguntas,
  traduccion,
  grupos,
  gradiente,
  icono,
  mesaOnline,
}: {
  mazoId: MazoId
  preguntas: Pregunta[]
  /** El banco del idioma activo, por índice de pregunta; null = español. */
  traduccion: string[] | null
  grupos: GrupoPregunta[]
  gradiente: string
  icono: string
  mesaOnline: boolean
}) {
  const t = useT()
  const mesa = useMesa<EstadoCartas, MovCartas>('cartas')
  const [modo, setModo] = useState<'local' | 'online' | null>(mesaOnline ? 'online' : null)
  const [activos, setActivos] = useState<string[]>(() => grupos.map((g) => g.id))
  const [mazoLocal, setMazo] = useState<Pregunta[]>(() => barajar(preguntas))
  const [posLocal, setPos] = useState(0)

  const online = modo === 'online'
  const estado = online ? mesa.estado : null
  // La mesa abierta puede ser la del OTRO mazo: entonces esta pantalla sigue
  // siendo la de siempre y solo se avisa.
  const enMesa = estado !== null && estado.mazo === mazoId
  const sinAsientoB = mesa.asientos.b === null

  const mazo = useMemo(() => {
    if (!enMesa || !estado) return mazoLocal
    return ordenDe(estado)
      .map((i) => preguntas[i])
      .filter((p): p is Pregunta => p !== undefined)
  }, [enMesa, estado, mazoLocal, preguntas])
  const pos = enMesa && estado ? estado.pos : posLocal

  const alternarGrupo = (id: string) => {
    const nuevos = activos.includes(id) ? activos.filter((x) => x !== id) : [...activos, id]
    if (!nuevos.length) return
    setActivos(nuevos)
    setMazo(barajar(preguntas.filter((p) => nuevos.includes(p.grupo))))
    setPos(0)
  }

  const rebarajar = () => {
    setMazo(barajar(preguntas.filter((p) => activos.includes(p.grupo))))
    setPos(0)
  }

  const irA = (p: number) => {
    if (enMesa) mesa.jugar({ pos: p })
    else setPos(p)
  }

  const siguiente = () => irA(Math.min(pos + 1, mazo.length))
  const anterior = () => irA(Math.max(0, pos - 1))

  // Al ENTRAR en línea (no cada vez que cambia la mesa: si la que miraba se
  // cierra, no hay que abrir otra en su lugar).
  useEffect(() => {
    if (online && mesa.enLinea && !mesa.abierta) mesa.abrir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mesa.enLinea])

  // Sentarse enfrente si hay sitio y, si soy quien abrió la mesa, fijar el mazo
  // que estoy mirando (el árbitro la abre con el de conocerse).
  useEffect(() => {
    if (!online || !mesa.abierta) return
    if (mesa.miAsiento === null && sinAsientoB) mesa.sentar()
    else if (mesa.miAsiento === 'a' && mesa.estado && mesa.estado.mazo !== mazoId) mesa.jugar({ mazo: mazoId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mesa.abierta, mesa.miAsiento, sinAsientoB, mesa.estado?.mazo, mazoId])

  const pregunta: Pregunta | undefined = mazo[pos]
  const grupoActual = pregunta ? grupos.find((g) => g.id === pregunta.grupo) : undefined
  // Mirar la mesa de otros no da derecho a pasar la carta.
  const puedoPasar = !enMesa || mesa.miAsiento !== null

  if (modo === null && mesa.enLinea) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: 'local',
            icono: <Icono nombre="companeros" />,
            titulo: t('entre.j.modo.2j', '2 jugadores'),
            desc: t('entre.j.modo.2jDesc', 'En el mismo dispositivo'),
            alElegir: () => setModo('local'),
          },
          opcionEnLinea(t, mesa.asientos, () => setModo('online')),
        ]}
      />
    )
  }

  return (
    <div className="space-y-3">
      {online ? (
        <div className="flex flex-wrap items-center gap-2">
          <BarraMesa abierta={mesa.abierta} cerrada={mesa.cerrada} asientos={mesa.asientos} miAsiento={mesa.miAsiento} />
          {mesa.abierta && !enMesa && (
            <span className="text-xs text-amber-300/80">
              {t('entre.j.mesa.otroMazo', 'La mesa abierta es del otro mazo')}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              mesa.levantar()
              setModo('local')
            }}
            className="ms-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
          >
            {t('entre.j.mesa.salir', 'Salir de la mesa')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {grupos.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => alternarGrupo(g.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                activos.includes(g.id) ? 'border-transparent text-black' : 'border-white/15 bg-white/5 text-white/45'
              }`}
              style={activos.includes(g.id) ? { background: g.color } : undefined}
            >
              {t(`entre.j.cartas.g.${g.id}`, g.label)}
            </button>
          ))}
          <button
            type="button"
            onClick={rebarajar}
            className="ms-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
          >
            <Icono nombre="barajar" /> {t('entre.j.cartas.barajar', 'Barajar')}
          </button>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={siguiente}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') siguiente()
        }}
        className="relative flex min-h-[280px] w-full cursor-pointer select-none flex-col overflow-hidden rounded-3xl border border-white/15 p-5 shadow-xl"
        style={{ background: gradiente }}
      >
        <span className="pointer-events-none absolute -bottom-7 -end-3 text-[120px] leading-none opacity-15">
          <Icono emoji={icono} />
        </span>
        {pregunta ? (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-white/75">
              <span>
                {t('entre.j.cartas.carta', `Carta ${pos + 1} de ${mazo.length}`, {
                  n: String(pos + 1),
                  t: String(mazo.length),
                })}
              </span>
              {grupoActual && (
                <span className="rounded-full bg-black/25 px-2.5 py-1">
                  {t(`entre.j.cartas.g.${grupoActual.id}`, grupoActual.label)}
                </span>
              )}
            </div>
            <p className="flex flex-1 items-center justify-center px-2 text-center text-xl font-bold leading-snug text-white drop-shadow-sm">
              {traduccion?.[pregunta.i] ?? pregunta.texto}
            </p>
            <p className="text-center text-xs text-white/60">
              {t('entre.j.cartas.toca', 'Toca la carta para la siguiente')}
            </p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-xl font-black text-white">🎉 {t('entre.j.cartas.fin', 'Se acabaron las preguntas')}</p>
            {!enMesa && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  rebarajar()
                }}
                className="rounded-xl bg-black/30 px-4 py-2 font-bold text-white hover:bg-black/45"
              >
                <Icono nombre="barajar" /> {t('entre.j.cartas.reiniciar', 'Volver a barajar')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${mazo.length ? (Math.min(pos, mazo.length) / mazo.length) * 100 : 0}%`, background: COLOR }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={anterior}
          disabled={pos === 0 || !puedoPasar}
          className="rounded-xl bg-white/10 px-4 py-2.5 text-lg font-bold hover:bg-white/20 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={siguiente}
          disabled={pos >= mazo.length || !puedoPasar}
          className="flex-1 rounded-xl py-2.5 font-bold text-black disabled:opacity-30"
          style={{ background: COLOR }}
        >
          {t('entre.j.cartas.siguiente', 'Siguiente')} ›
        </button>
      </div>
    </div>
  )
}

export function CartasConocerse({ mesaOnline = false }: PropsDificultad) {
  const banco = useBancoPreguntas()
  return (
    <MazoPreguntas
      mazoId="conocerse"
      preguntas={PREGUNTAS_CONOCERSE}
      traduccion={banco?.conocerse ?? null}
      grupos={GRUPOS_CONOCERSE}
      gradiente="linear-gradient(135deg, #7c3aed, #db2777)"
      icono="💬"
      mesaOnline={mesaOnline}
    />
  )
}

export function CartasDebates({ mesaOnline = false }: PropsDificultad) {
  const banco = useBancoPreguntas()
  return (
    <MazoPreguntas
      mazoId="debates"
      preguntas={PREGUNTAS_DEBATES}
      traduccion={banco?.debates ?? null}
      grupos={GRUPOS_DEBATES}
      gradiente="linear-gradient(135deg, #ea580c, #b91c1c)"
      icono="🔥"
      mesaOnline={mesaOnline}
    />
  )
}
