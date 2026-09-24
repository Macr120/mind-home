import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { CartaView } from './CartaView'
import { barajar, crearBaraja, type Carta } from './cartas'
import type { Dificultad, PropsDificultad } from './dificultad'

type Palo = Carta['palo']
const PALOS: Palo[] = ['♠', '♥', '♦', '♣']
const CARTAS_INICIALES = 7

interface RondaOcho {
  mano: Carta[]
  manoIA: Carta[]
  mazo: Carta[]
  /** La última es la de arriba. */
  descarte: Carta[]
  /** Palo que manda: el de la carta de arriba, o el que se eligió con un 8. */
  palo: Palo
  turno: 'tu' | 'ia'
  /** Turnos seguidos sin jugar (mazo vacío): con 2 la ronda se cierra. */
  pases: number
  /** Palos que no tenías cuando te tocó robar: la máquina difícil los busca. */
  teFaltan: Palo[]
}

interface FinRonda {
  ganador: 'tu' | 'ia' | 'empate'
  puntos: number
}

/** 8 = 50, figuras = 10, el resto su número (el As vale 1). */
const puntosDe = (mano: Carta[]) => mano.reduce((s, c) => s + (c.valor === 8 ? 50 : c.valor > 10 ? 10 : c.valor), 0)

const sePuede = (c: Carta, arriba: Carta, palo: Palo) => c.valor === 8 || c.palo === palo || c.valor === arriba.valor

function repartir(): RondaOcho {
  const baraja = barajar(crearBaraja())
  // La carta de salida no puede ser un 8: se devuelve al fondo.
  let i = CARTAS_INICIALES * 2
  while (baraja[i].valor === 8) i++
  const salida = baraja[i]
  const mazo = baraja.slice(CARTAS_INICIALES * 2).filter((c) => c !== salida)
  return {
    mano: baraja.slice(0, CARTAS_INICIALES),
    manoIA: baraja.slice(CARTAS_INICIALES, CARTAS_INICIALES * 2),
    mazo,
    descarte: [salida],
    palo: salida.palo,
    turno: 'tu',
    pases: 0,
    teFaltan: [],
  }
}

/** Saca una carta; si el mazo se acabó, rebaraja el descarte menos la de arriba. */
function sacar(r: RondaOcho): { carta: Carta | null; mazo: Carta[]; descarte: Carta[] } {
  let mazo = r.mazo
  let descarte = r.descarte
  if (!mazo.length && descarte.length > 1) {
    mazo = barajar(descarte.slice(0, -1))
    descarte = descarte.slice(-1)
  }
  if (!mazo.length) return { carta: null, mazo, descarte }
  return { carta: mazo[mazo.length - 1], mazo: mazo.slice(0, -1), descarte }
}

/** El palo del que más cartas quedan en la mano (sin contar los 8). */
function paloFuerte(mano: Carta[]): Palo {
  const cuenta = (p: Palo) => mano.filter((c) => c.palo === p && c.valor !== 8).length
  return PALOS.reduce((mejor, p) => (cuenta(p) > cuenta(mejor) ? p : mejor), PALOS[0])
}

/**
 * Jugada de la máquina: fácil tira cualquiera que sirva; medio guarda los 8
 * para el final y sigue el palo del que más tiene; difícil además lleva el
 * juego a los palos que sabe que te faltan.
 */
function jugadaIA(mano: Carta[], arriba: Carta, palo: Palo, dif: Dificultad, teFaltan: Palo[]): { carta: Carta; palo: Palo } | null {
  const opciones = mano.filter((c) => sePuede(c, arriba, palo))
  if (!opciones.length) return null
  if (dif === 'facil') {
    const carta = opciones[Math.floor(Math.random() * opciones.length)]
    return { carta, palo: carta.valor === 8 ? PALOS[Math.floor(Math.random() * 4)] : carta.palo }
  }
  const normales = opciones.filter((c) => c.valor !== 8)
  if (!normales.length) {
    const carta = opciones[0]
    const resto = mano.filter((c) => c !== carta)
    const hacia = dif === 'dificil' ? teFaltan.find((p) => resto.some((c) => c.palo === p)) : undefined
    return { carta, palo: hacia ?? paloFuerte(resto) }
  }
  let mejor = normales[0]
  let mejorPuntaje = -Infinity
  for (const c of normales) {
    const resto = mano.filter((x) => x !== c)
    // Cuántas cartas quedan que sigan casando después de tirar esta.
    const siguen = resto.filter((x) => x.palo === c.palo || x.valor === c.valor).length
    const puntaje =
      siguen * 2 + (c.valor > 10 ? 1 : 0) + (dif === 'dificil' && teFaltan.includes(c.palo) ? 4 : 0) + Math.random()
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = c
    }
  }
  return { carta: mejor, palo: mejor.palo }
}

export function OchoLocos({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const [ronda, setRonda] = useState<RondaOcho>(repartir)
  const [fin, setFin] = useState<FinRonda | null>(null)
  const [marcador, setMarcador] = useState({ tu: 0, ia: 0 })
  const [aviso, setAviso] = useState<string | null>(null)
  /** Índice del 8 que tiraste, mientras eliges el palo. */
  const [ochoPendiente, setOchoPendiente] = useState<number | null>(null)

  const arriba = ronda.descarte[ronda.descarte.length - 1]
  const puedesJugar = ronda.mano.some((c) => sePuede(c, arriba, ronda.palo))
  const quedanCartas = ronda.mazo.length > 0 || ronda.descarte.length > 1

  const transicion = (r: RondaOcho) => {
    setRonda(r)
    let f: FinRonda | null = null
    if (!r.mano.length) f = { ganador: 'tu', puntos: puntosDe(r.manoIA) }
    else if (!r.manoIA.length) f = { ganador: 'ia', puntos: puntosDe(r.mano) }
    else if (r.pases >= 2) {
      const pTu = puntosDe(r.mano)
      const pIA = puntosDe(r.manoIA)
      f = pTu === pIA ? { ganador: 'empate', puntos: 0 } : pTu < pIA ? { ganador: 'tu', puntos: pIA } : { ganador: 'ia', puntos: pTu }
    }
    if (!f) return
    setFin(f)
    const puntos = f.puntos
    if (f.ganador === 'tu') setMarcador((m) => ({ ...m, tu: m.tu + puntos }))
    else if (f.ganador === 'ia') setMarcador((m) => ({ ...m, ia: m.ia + puntos }))
  }

  const tirar = (idx: number, palo: Palo) => {
    const carta = ronda.mano[idx]
    setOchoPendiente(null)
    setAviso(null)
    transicion({
      ...ronda,
      mano: ronda.mano.filter((_, k) => k !== idx),
      descarte: [...ronda.descarte, carta],
      palo,
      turno: 'ia',
      pases: 0,
    })
  }

  const clickCarta = (idx: number) => {
    if (fin || ronda.turno !== 'tu') return
    const carta = ronda.mano[idx]
    if (!sePuede(carta, arriba, ronda.palo)) return
    if (carta.valor === 8) setOchoPendiente(idx)
    else tirar(idx, carta.palo)
  }

  const robar = () => {
    if (fin || ronda.turno !== 'tu' || puedesJugar) return
    const s = sacar(ronda)
    if (!s.carta) return
    const teFaltan = ronda.teFaltan.includes(ronda.palo) ? ronda.teFaltan : [...ronda.teFaltan, ronda.palo]
    setRonda({ ...ronda, mazo: s.mazo, descarte: s.descarte, mano: [...ronda.mano, s.carta], teFaltan })
  }

  const pasar = () => {
    if (fin || ronda.turno !== 'tu' || puedesJugar || quedanCartas) return
    transicion({ ...ronda, turno: 'ia', pases: ronda.pases + 1 })
  }

  // La máquina roba hasta poder jugar y tira según su dificultad.
  useEffect(() => {
    if (fin || ronda.turno !== 'ia') return
    const id = setTimeout(() => {
      let r = { ...ronda, manoIA: [...ronda.manoIA] }
      let robadas = 0
      let jugada = jugadaIA(r.manoIA, arriba, r.palo, dificultad, r.teFaltan)
      while (!jugada) {
        const s = sacar(r)
        if (!s.carta) break
        r = { ...r, mazo: s.mazo, descarte: s.descarte, manoIA: [...r.manoIA, s.carta] }
        robadas++
        jugada = jugadaIA(r.manoIA, arriba, r.palo, dificultad, r.teFaltan)
      }
      if (!jugada) {
        setAviso(t('entre.j.domino.pasoIA', 'La máquina pasa'))
        transicion({ ...r, turno: 'tu', pases: r.pases + 1 })
        return
      }
      const { carta, palo } = jugada
      const partes: string[] = []
      if (robadas > 0) partes.push(t('entre.j.domino.robaIA', `La máquina robó ${robadas}`, { n: String(robadas) }))
      if (carta.valor === 8) partes.push(t('entre.j.ocholocos.cambia', 'Ahora se juega {palo}', { palo }))
      setAviso(partes.length ? partes.join(' · ') : null)
      transicion({
        ...r,
        manoIA: r.manoIA.filter((c) => c !== carta),
        descarte: [...r.descarte, carta],
        palo,
        turno: 'tu',
        pases: 0,
      })
    }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ronda, fin])

  const siguienteRonda = () => {
    setRonda(repartir())
    setFin(null)
    setOchoPendiente(null)
    setAviso(null)
  }

  const nuevaPartida = () => {
    setMarcador({ tu: 0, ia: 0 })
    siguienteRonda()
  }

  const rojo = ronda.palo === '♥' || ronda.palo === '♦'

  return (
    <div className="mx-auto max-w-[560px] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-lg bg-white/5 px-3 py-1.5 font-semibold">
          <Icono nombre="animo-contento" /> {marcador.tu} · <Icono nombre="mascota-robot" /> {marcador.ia}
        </span>
        {fin === null && (
          <span className="text-white/60">
            {t('entre.j.turno', 'Turno')}:{' '}
            <strong className="text-white/90">
              {ronda.turno === 'tu' ? t('entre.j.tu', 'Tú') : t('entre.j.maquina', 'Máquina')}
            </strong>
          </span>
        )}
        <button type="button" onClick={nuevaPartida} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
          <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
        </button>
      </div>

      {/* Mano de la máquina, boca abajo */}
      <div className="flex items-center gap-1 overflow-hidden rounded-xl bg-white/5 px-3 py-2">
        <span className="me-1 text-sm">
          <Icono nombre="mascota-robot" />
        </span>
        <div className="flex -space-x-5">
          {ronda.manoIA.map((c, k) => (
            <CartaView key={k} carta={c} bocaAbajo ancho={30} />
          ))}
        </div>
        <span className="ms-auto shrink-0 text-xs text-white/45">{ronda.manoIA.length}</span>
      </div>

      {/* Mesa: mazo, carta de arriba y palo que manda */}
      <div className="flex items-center justify-center gap-5 rounded-xl border border-white/10 bg-emerald-950/50 p-4">
        <button
          type="button"
          onClick={robar}
          disabled={!!fin || ronda.turno !== 'tu' || puedesJugar || !quedanCartas}
          className="relative disabled:opacity-60"
          aria-label={t('entre.j.ocholocos.robar', 'Robar del mazo')}
        >
          <CartaView carta={arriba} bocaAbajo ancho={56} />
          <span className="absolute -bottom-2 -end-2 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white ui-noche">
            {ronda.mazo.length}
          </span>
        </button>
        <CartaView carta={arriba} ancho={62} />
        <div className="text-center">
          <p className={`text-4xl leading-none ${rojo ? 'text-red-500' : 'text-white/90'}`}>{ronda.palo}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/45">{t('entre.j.ocholocos.palo', 'Palo')}</p>
        </div>
      </div>

      {aviso && <p className="text-center text-xs text-white/50">{aviso}</p>}

      {ochoPendiente !== null && !fin && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-white/55">{t('entre.j.ocholocos.elegirPalo', 'Elige el palo')}</span>
          {PALOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => tirar(ochoPendiente, p)}
              className={`h-10 w-10 rounded-lg bg-[#ffffff] text-2xl leading-none shadow-sm ${
                p === '♥' || p === '♦' ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
          <button type="button" onClick={() => setOchoPendiente(null)} className="text-sm text-white/40">
            <Icono nombre="cerrar" />
          </button>
        </div>
      )}

      {/* Tu mano */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {ronda.mano.map((c, idx) => {
          const jugable = !fin && ronda.turno === 'tu' && sePuede(c, arriba, ronda.palo)
          return (
            <button
              key={`${c.palo}${c.valor}`}
              type="button"
              onClick={() => clickCarta(idx)}
              className={`rounded-md transition ${jugable ? 'hover:-translate-y-1' : 'opacity-55'} ${
                ochoPendiente === idx ? '-translate-y-1' : ''
              }`}
            >
              <CartaView carta={c} ancho={50} seleccionada={jugable || ochoPendiente === idx} />
            </button>
          )
        })}
      </div>

      {!fin && ronda.turno === 'tu' && !puedesJugar && (
        <div className="flex justify-center">
          {quedanCartas ? (
            <button type="button" onClick={robar} className="rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
              <Icono nombre="naipe" /> {t('entre.j.ocholocos.robar', 'Robar del mazo')}
            </button>
          ) : (
            <button type="button" onClick={pasar} className="rounded-xl bg-white/10 px-4 py-2 font-bold">
              {t('entre.j.domino.pasar', 'Paso')}
            </button>
          )}
        </div>
      )}

      {fin && (
        <div
          className={`rounded-xl border p-4 text-center ${
            fin.ganador === 'tu'
              ? 'border-emerald-500/40 bg-emerald-500/15'
              : fin.ganador === 'ia'
                ? 'border-red-500/40 bg-red-500/15'
                : 'border-white/20 bg-white/10'
          }`}
        >
          <p className="text-lg font-black">
            {fin.ganador === 'tu'
              ? t('entre.j.domino.ganasteRonda', `Ganas la ronda: +${fin.puntos} puntos`, { n: String(fin.puntos) })
              : fin.ganador === 'ia'
                ? t('entre.j.domino.rondaIA', `La máquina gana la ronda: +${fin.puntos} puntos`, { n: String(fin.puntos) })
                : t('entre.j.domino.empateRonda', 'Empate: nadie suma puntos')}
          </p>
          <button type="button" onClick={siguienteRonda} className="mt-3 rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
            {t('entre.j.domino.siguienteRonda', 'Siguiente ronda')}
          </button>
        </div>
      )}
    </div>
  )
}
