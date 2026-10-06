import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { registrarJuegoMesa, useMesa, type Asiento, type Mesa } from '../../../core/partida/mesa'
import { COLOR } from '../constantes'
import { registrarApariencia, useApariencia } from './apariencia'
import { CartaView, COLORES_CARTA, islaTinta, legible } from './CartaView'
import { barajar, crearBaraja, type Carta } from './cartas'
import type { Dificultad, PropsDificultad } from './dificultad'
import { ElegirModo } from './ElegirModo'
import { BarraMesa, nombreAsiento, opcionEnLinea } from './mesaJuego'

type Palo = Carta['palo']
const PALOS: Palo[] = ['♠', '♥', '♦', '♣']
const CARTAS_INICIALES = 7

const TAPETE = '#022c22'

registrarApariencia('ocholocos', [
  { clave: 'tapete', labelEs: 'Tapete', papel: 'fondo', porDefecto: TAPETE },
  { clave: 'dorso', labelEs: 'Dorso', papel: 'oscuro', porDefecto: COLORES_CARTA.dorso },
  { clave: 'cara', labelEs: 'Cara', papel: 'claro', porDefecto: COLORES_CARTA.cara },
  { clave: 'rojo', labelEs: 'Palos rojos', papel: 'uno', porDefecto: COLORES_CARTA.rojo },
  { clave: 'negro', labelEs: 'Palos negros', papel: 'dos', porDefecto: COLORES_CARTA.negro },
  { clave: 'marca', labelEs: 'Jugables', papel: 'acento', porDefecto: COLORES_CARTA.marca },
])

/** La mesa a media transparencia; con un tapete propio, su tinta legible encima. */
const estiloTapete = (tapete: string) => ({
  background: `color-mix(in srgb, ${tapete} 50%, transparent)`,
  ...(tapete !== TAPETE ? islaTinta(tapete) : {}),
})

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

/** Reparte una baraja ya mezclada: dos manos, el mazo y la carta de salida. */
function repartirBaraja(baraja: Carta[]) {
  // La carta de salida no puede ser un 8: se devuelve al fondo.
  let i = CARTAS_INICIALES * 2
  while (baraja[i].valor === 8) i++
  const salida = baraja[i]
  return {
    mano1: baraja.slice(0, CARTAS_INICIALES),
    mano2: baraja.slice(CARTAS_INICIALES, CARTAS_INICIALES * 2),
    mazo: baraja.slice(CARTAS_INICIALES * 2).filter((c) => c !== salida),
    salida,
  }
}

function repartir(): RondaOcho {
  const { mano1, mano2, mazo, salida } = repartirBaraja(barajar(crearBaraja()))
  return {
    mano: mano1,
    manoIA: mano2,
    mazo,
    descarte: [salida],
    palo: salida.palo,
    turno: 'tu',
    pases: 0,
    teFaltan: [],
  }
}

/** Saca una carta; si el mazo se acabó, rebaraja el descarte menos la de arriba. */
function sacar(
  r: Pick<RondaOcho, 'mazo' | 'descarte'>,
  mezclar: (l: Carta[]) => Carta[] = barajar,
): { carta: Carta | null; mazo: Carta[]; descarte: Carta[] } {
  let mazo = r.mazo
  let descarte = r.descarte
  if (!mazo.length && descarte.length > 1) {
    mazo = mezclar(descarte.slice(0, -1))
    descarte = descarte.slice(-1)
  }
  if (!mazo.length) return { carta: null, mazo, descarte }
  return { carta: mazo[mazo.length - 1], mazo: mazo.slice(0, -1), descarte }
}

/**
 * Cierre de la ronda entre dos manos: gana quien se quedó sin cartas y suma los
 * puntos de la otra; con 2 pases seguidos gana la mano que vale menos.
 */
function cierre(m1: Carta[], m2: Carta[], pases: number): { ganador: 1 | 2 | 'empate'; puntos: number } | null {
  if (!m1.length) return { ganador: 1, puntos: puntosDe(m2) }
  if (!m2.length) return { ganador: 2, puntos: puntosDe(m1) }
  if (pases < 2) return null
  const p1 = puntosDe(m1)
  const p2 = puntosDe(m2)
  return p1 === p2 ? { ganador: 'empate', puntos: 0 } : p1 < p2 ? { ganador: 1, puntos: p2 } : { ganador: 2, puntos: p1 }
}

// ─── En línea ────────────────────────────────────────────────────────────────

/** Partida entera de la mesa en línea: viaja tal cual (las cartas son datos llanos). */
interface EstadoOchoEnLinea {
  manos: Record<Asiento, Carta[]>
  mazo: Carta[]
  /** La última es la de arriba. */
  descarte: Carta[]
  palo: Palo
  turno: Asiento
  pases: number
  marcador: Record<Asiento, number>
  fin: { ganador: Asiento | 'empate'; puntos: number } | null
  /** Rondas jugadas: las pares las abre `a` y las nones `b`. */
  ronda: number
  /** Estado del PRNG: con él se mezcla igual en todos los clientes. */
  semilla: number
}

/** `i` es la posición en MI mano; `palo` solo cuenta si la carta es un 8. */
type MovOcho = { t: 'soltar'; i: number; palo?: Palo } | { t: 'robar' } | { t: 'pasar' } | { t: 'ronda' }

/** Fisher-Yates con mulberry32 sembrado; devuelve también la semilla siguiente. */
function mezclarSembrado(lista: Carta[], semilla: number): { lista: Carta[]; semilla: number } {
  let s = semilla >>> 0
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let x = Math.imul(s ^ (s >>> 15), 1 | s)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  const r = [...lista]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return { lista: r, semilla: Math.floor(rnd() * 4294967296) }
}

function rondaEnLinea(semilla: number, ronda: number, marcador: Record<Asiento, number>): EstadoOchoEnLinea {
  const m = mezclarSembrado(crearBaraja(), semilla)
  const { mano1, mano2, mazo, salida } = repartirBaraja(m.lista)
  return {
    manos: { a: mano1, b: mano2 },
    mazo,
    descarte: [salida],
    palo: salida.palo,
    turno: ronda % 2 === 0 ? 'a' : 'b',
    pases: 0,
    marcador,
    fin: null,
    ronda,
    semilla: m.semilla,
  }
}

function cerrarRonda(e: EstadoOchoEnLinea): EstadoOchoEnLinea {
  const c = cierre(e.manos.a, e.manos.b, e.pases)
  if (!c) return e
  const ganador = c.ganador === 1 ? 'a' : c.ganador === 2 ? 'b' : 'empate'
  const marcador = ganador === 'empate' ? e.marcador : { ...e.marcador, [ganador]: e.marcador[ganador] + c.puntos }
  return { ...e, marcador, fin: { ganador, puntos: c.puntos } }
}

/** Reductor puro y determinista: el mismo en el árbitro y en cada cliente. */
function aplicarOcho(e: EstadoOchoEnLinea, m: MovOcho, yo: Asiento): EstadoOchoEnLinea | null {
  if (!m || typeof m !== 'object') return null
  if (m.t === 'ronda') return e.fin ? rondaEnLinea(e.semilla, e.ronda + 1, e.marcador) : null
  if (e.fin || e.turno !== yo) return null
  const otro: Asiento = yo === 'a' ? 'b' : 'a'
  const mano = e.manos[yo]
  const arriba = e.descarte[e.descarte.length - 1]
  const puede = mano.some((c) => sePuede(c, arriba, e.palo))
  if (m.t === 'soltar') {
    const carta = Number.isInteger(m.i) ? mano[m.i] : undefined
    if (!carta || !sePuede(carta, arriba, e.palo)) return null
    const palo = carta.valor === 8 ? m.palo : carta.palo
    if (!palo || !PALOS.includes(palo)) return null
    return cerrarRonda({
      ...e,
      manos: { ...e.manos, [yo]: mano.filter((_, k) => k !== m.i) },
      descarte: [...e.descarte, carta],
      palo,
      turno: otro,
      pases: 0,
    })
  }
  if (m.t === 'robar') {
    if (puede) return null
    let semilla = e.semilla
    const s = sacar(e, (l) => {
      const r = mezclarSembrado(l, semilla)
      semilla = r.semilla
      return r.lista
    })
    if (!s.carta) return null
    return { ...e, mazo: s.mazo, descarte: s.descarte, semilla, manos: { ...e.manos, [yo]: [...mano, s.carta] } }
  }
  if (m.t === 'pasar') {
    if (puede || e.mazo.length > 0 || e.descarte.length > 1) return null
    return cerrarRonda({ ...e, turno: otro, pases: e.pases + 1 })
  }
  return null
}

registrarJuegoMesa<EstadoOchoEnLinea, MovOcho>('ocholocos', {
  inicial: (semilla) => rondaEnLinea(semilla, 0, { a: 0, b: 0 }),
  aplicar: aplicarOcho,
  terminado: (e) => e.fin !== null,
})

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

export function OchoLocos({ dificultad = 'medio', mesaOnline = false }: PropsDificultad) {
  const t = useT()
  const mesa = useMesa<EstadoOchoEnLinea, MovOcho>('ocholocos')
  const col = useApariencia('ocholocos')
  const [modo, setModo] = useState<'ia' | 'online' | null>(mesaOnline ? 'online' : null)
  const online = modo === 'online'
  // Sin sala no hay nada que elegir: se juega contra la máquina como siempre.
  const contraIA = modo === 'ia' || (modo === null && !mesa.enLinea)
  const sinAsientoB = mesa.asientos.b === null
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
    const c = cierre(r.mano, r.manoIA, r.pases)
    if (!c) return
    const f: FinRonda = { ganador: c.ganador === 1 ? 'tu' : c.ganador === 2 ? 'ia' : 'empate', puntos: c.puntos }
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
    if (!contraIA || fin || ronda.turno !== 'ia') return
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
  }, [ronda, fin, contraIA])

  // Al ENTRAR en línea (no cada vez que cambia la mesa: si la que miraba se
  // cierra, no hay que abrir otra en su lugar).
  useEffect(() => {
    if (online && mesa.enLinea && !mesa.abierta) mesa.abrir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mesa.enLinea])

  // Sentarse enfrente en cuanto haya mesa y sitio (también viniendo de la banda).
  useEffect(() => {
    if (online && mesa.abierta && mesa.miAsiento === null && sinAsientoB) mesa.sentar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, mesa.abierta, mesa.miAsiento, sinAsientoB])

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

  if (online)
    return (
      <MesaOcho
        mesa={mesa}
        alSalir={() => {
          mesa.levantar()
          setModo(null)
        }}
      />
    )

  if (!contraIA) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: 'ia',
            icono: <Icono nombre="mascota-robot" />,
            titulo: t('entre.j.modo.ia', 'Contra la máquina'),
            desc: t('entre.j.ocholocos.desc', 'Suelta tus cartas por palo o número; el 8 cambia el palo.'),
            alElegir: () => setModo('ia'),
          },
          opcionEnLinea(t, mesa.asientos, () => setModo('online')),
        ]}
      />
    )
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
        <div className="flex gap-2">
          <button type="button" onClick={nuevaPartida} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
          </button>
          {mesa.enLinea && (
            <button type="button" onClick={() => setModo(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
              {t('entre.j.modo.cambiar', 'Cambiar modo')}
            </button>
          )}
        </div>
      </div>

      {/* Mano de la máquina, boca abajo */}
      <div className="flex items-center gap-1 overflow-hidden rounded-xl bg-white/5 px-3 py-2">
        <span className="me-1 text-sm">
          <Icono nombre="mascota-robot" />
        </span>
        <div className="flex -space-x-5">
          {ronda.manoIA.map((c, k) => (
            <CartaView key={k} carta={c} bocaAbajo ancho={30} colores={col} />
          ))}
        </div>
        <span className="ms-auto shrink-0 text-xs text-white/45">{ronda.manoIA.length}</span>
      </div>

      {/* Mesa: mazo, carta de arriba y palo que manda */}
      <div className="flex items-center justify-center gap-5 rounded-xl border border-white/10 p-4" style={estiloTapete(col.tapete)}>
        <button
          type="button"
          onClick={robar}
          disabled={!!fin || ronda.turno !== 'tu' || puedesJugar || !quedanCartas}
          className="relative disabled:opacity-60"
          aria-label={t('entre.j.ocholocos.robar', 'Robar del mazo')}
        >
          <CartaView carta={arriba} bocaAbajo ancho={56} colores={col} />
          <span className="absolute -bottom-2 -end-2 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white ui-noche">
            {ronda.mazo.length}
          </span>
        </button>
        <CartaView carta={arriba} ancho={62} colores={col} />
        <div className="text-center">
          <p
            className={`text-4xl leading-none ${rojo ? '' : 'text-white/90'}`}
            style={rojo ? { color: legible(col.rojo, col.tapete) } : undefined}
          >
            {ronda.palo}
          </p>
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
              className="h-10 w-10 rounded-lg text-2xl leading-none shadow-sm"
              style={{ background: col.cara, color: legible(p === '♥' || p === '♦' ? col.rojo : col.negro, col.cara) }}
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
              <CartaView carta={c} ancho={50} seleccionada={jugable || ochoPendiente === idx} colores={col} />
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

/**
 * Mesa en línea: la partida es la de la mesa (una sola fuente) y cada jugada
 * se manda sin aplicarla aquí; vuelve por el canal. Cada quien ve su mano y
 * del rival solo el dorso; quien mira sin asiento ve las dos boca abajo.
 */
function MesaOcho({ mesa, alSalir }: { mesa: Mesa<EstadoOchoEnLinea, MovOcho>; alSalir: () => void }) {
  const t = useT()
  /** Índice del 8 que vas a tirar, mientras eliges el palo. */
  const [ochoPendiente, setOchoPendiente] = useState<number | null>(null)
  const col = useApariencia('ocholocos')
  const e = mesa.estado
  const yo = mesa.miAsiento
  const nombre = (a: Asiento) => nombreAsiento(t, mesa.asientos, a, yo)

  const cabecera = (
    <div className="flex flex-wrap items-center gap-2">
      <BarraMesa abierta={mesa.abierta} cerrada={mesa.cerrada} asientos={mesa.asientos} miAsiento={yo} />
      <button type="button" onClick={alSalir} className="ms-auto rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
        {t('entre.j.mesa.salir', 'Salir de la mesa')}
      </button>
    </div>
  )
  if (!e) return <div className="mx-auto max-w-[560px] space-y-3">{cabecera}</div>

  const abajo: Asiento = yo ?? 'a'
  const enfrente: Asiento = abajo === 'a' ? 'b' : 'a'
  const arriba = e.descarte[e.descarte.length - 1]
  const miTurno = yo !== null && e.turno === yo && !e.fin
  const miMano = yo ? e.manos[yo] : []
  const puedesJugar = miMano.some((c) => sePuede(c, arriba, e.palo))
  const quedanCartas = e.mazo.length > 0 || e.descarte.length > 1
  const rojo = e.palo === '♥' || e.palo === '♦'

  const jugar = (m: MovOcho) => {
    setOchoPendiente(null)
    mesa.jugar(m)
  }

  const clickCarta = (idx: number) => {
    if (!miTurno) return
    const carta = miMano[idx]
    if (!sePuede(carta, arriba, e.palo)) return
    if (carta.valor === 8) setOchoPendiente(idx)
    else jugar({ t: 'soltar', i: idx })
  }

  const robar = () => {
    if (miTurno && !puedesJugar && quedanCartas) jugar({ t: 'robar' })
  }

  /** Mano boca abajo: la del rival, o las dos si solo miras. */
  const dorso = (a: Asiento) => (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl bg-white/5 px-3 py-2">
      <span className="me-1 shrink-0 text-xs font-semibold text-white/60">{nombre(a)}</span>
      <div className="flex -space-x-5">
        {e.manos[a].map((c, k) => (
          <CartaView key={k} carta={c} bocaAbajo ancho={30} colores={col} />
        ))}
      </div>
      <span className="ms-auto shrink-0 text-xs text-white/45">{e.manos[a].length}</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-[560px] space-y-3">
      {cabecera}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-lg bg-white/5 px-3 py-1.5 font-semibold">
          {nombre('a')} {e.marcador.a} · {nombre('b')} {e.marcador.b}
        </span>
        {e.fin === null && (
          <span className="text-white/60">
            {t('entre.j.turno', 'Turno')}: <strong className="text-white/90">{nombre(e.turno)}</strong>
          </span>
        )}
      </div>

      {dorso(enfrente)}

      {/* Mesa: mazo, carta de arriba y palo que manda */}
      <div className="flex items-center justify-center gap-5 rounded-xl border border-white/10 p-4" style={estiloTapete(col.tapete)}>
        <button
          type="button"
          onClick={robar}
          disabled={!miTurno || puedesJugar || !quedanCartas}
          className="relative disabled:opacity-60"
          aria-label={t('entre.j.ocholocos.robar', 'Robar del mazo')}
        >
          <CartaView carta={arriba} bocaAbajo ancho={56} colores={col} />
          <span className="absolute -bottom-2 -end-2 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white ui-noche">
            {e.mazo.length}
          </span>
        </button>
        <CartaView carta={arriba} ancho={62} colores={col} />
        <div className="text-center">
          <p
            className={`text-4xl leading-none ${rojo ? '' : 'text-white/90'}`}
            style={rojo ? { color: legible(col.rojo, col.tapete) } : undefined}
          >
            {e.palo}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/45">{t('entre.j.ocholocos.palo', 'Palo')}</p>
        </div>
      </div>

      {arriba.valor === 8 && !e.fin && (
        <p className="text-center text-xs text-white/50">{t('entre.j.ocholocos.cambia', 'Ahora se juega {palo}', { palo: e.palo })}</p>
      )}

      {ochoPendiente !== null && miTurno && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-white/55">{t('entre.j.ocholocos.elegirPalo', 'Elige el palo')}</span>
          {PALOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => jugar({ t: 'soltar', i: ochoPendiente, palo: p })}
              className="h-10 w-10 rounded-lg text-2xl leading-none shadow-sm"
              style={{ background: col.cara, color: legible(p === '♥' || p === '♦' ? col.rojo : col.negro, col.cara) }}
            >
              {p}
            </button>
          ))}
          <button type="button" onClick={() => setOchoPendiente(null)} className="text-sm text-white/40">
            <Icono nombre="cerrar" />
          </button>
        </div>
      )}

      {/* Tu mano (o la de `a` boca abajo si solo miras) */}
      {yo ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {miMano.map((c, idx) => {
            const jugable = miTurno && sePuede(c, arriba, e.palo)
            return (
              <button
                key={`${c.palo}${c.valor}`}
                type="button"
                onClick={() => clickCarta(idx)}
                className={`rounded-md transition ${jugable ? 'hover:-translate-y-1' : 'opacity-55'} ${
                  ochoPendiente === idx ? '-translate-y-1' : ''
                }`}
              >
                <CartaView carta={c} ancho={50} seleccionada={jugable || ochoPendiente === idx} colores={col} />
              </button>
            )
          })}
        </div>
      ) : (
        dorso(abajo)
      )}

      {miTurno && !puedesJugar && (
        <div className="flex justify-center">
          {quedanCartas ? (
            <button type="button" onClick={robar} className="rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
              <Icono nombre="naipe" /> {t('entre.j.ocholocos.robar', 'Robar del mazo')}
            </button>
          ) : (
            <button type="button" onClick={() => jugar({ t: 'pasar' })} className="rounded-xl bg-white/10 px-4 py-2 font-bold">
              {t('entre.j.domino.pasar', 'Paso')}
            </button>
          )}
        </div>
      )}

      {e.fin && (
        <div
          className={`rounded-xl border p-4 text-center ${
            e.fin.ganador === 'empate'
              ? 'border-white/20 bg-white/10'
              : e.fin.ganador === yo
                ? 'border-emerald-500/40 bg-emerald-500/15'
                : 'border-red-500/40 bg-red-500/15'
          }`}
        >
          <p className="text-lg font-black">
            {e.fin.ganador === 'empate'
              ? t('entre.j.domino.empateRonda', 'Empate: nadie suma puntos')
              : e.fin.ganador === yo
                ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                : t('entre.j.mesa.gana', 'Gana {n}', { n: nombre(e.fin.ganador) })}
          </p>
          {e.fin.ganador !== 'empate' && <p className="text-sm font-semibold text-white/60">+{e.fin.puntos}</p>}
          {yo && (
            <button
              type="button"
              onClick={() => jugar({ t: 'ronda' })}
              className="mt-3 rounded-xl px-4 py-2 font-bold text-black"
              style={{ background: COLOR }}
            >
              {t('entre.j.domino.siguienteRonda', 'Siguiente ronda')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
