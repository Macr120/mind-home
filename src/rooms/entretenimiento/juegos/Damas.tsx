import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { registrarJuegoMesa, useMesa, type Asiento } from '../../../core/partida/mesa'
import { COLOR } from '../constantes'
import type { Dificultad, PropsDificultad } from './dificultad'
import { ElegirModo } from './ElegirModo'
import { BarraMesa, nombreAsiento, opcionEnLinea } from './mesaJuego'

type ColorFicha = 'clara' | 'oscura'
type Modo = '2j' | 'ia' | 'online'

interface Ficha {
  color: ColorFicha
  dama: boolean
}

type TableroDamas = (Ficha | null)[]

interface MovDama {
  de: number
  a: number
  captura?: number
}

function tableroInicial(): TableroDamas {
  const t: TableroDamas = new Array(64).fill(null)
  for (let f = 0; f < 3; f++)
    for (let c = 0; c < 8; c++) if ((f + c) % 2 === 1) t[f * 8 + c] = { color: 'oscura', dama: false }
  for (let f = 5; f < 8; f++)
    for (let c = 0; c < 8; c++) if ((f + c) % 2 === 1) t[f * 8 + c] = { color: 'clara', dama: false }
  return t
}

function movsFicha(t: TableroDamas, i: number): MovDama[] {
  const ficha = t[i]!
  const f = Math.floor(i / 8)
  const c = i % 8
  const dirs = ficha.dama
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : ficha.color === 'clara'
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]]
  const movs: MovDama[] = []
  for (const [df, dc] of dirs) {
    const f1 = f + df
    const c1 = c + dc
    if (f1 < 0 || f1 > 7 || c1 < 0 || c1 > 7) continue
    const i1 = f1 * 8 + c1
    if (t[i1] === null) movs.push({ de: i, a: i1 })
    else if (t[i1]!.color !== ficha.color) {
      const f2 = f + 2 * df
      const c2 = c + 2 * dc
      if (f2 >= 0 && f2 <= 7 && c2 >= 0 && c2 <= 7 && t[f2 * 8 + c2] === null)
        movs.push({ de: i, a: f2 * 8 + c2, captura: i1 })
    }
  }
  return movs
}

// Captura obligatoria: si el color tiene capturas, solo se permiten capturas
function movsLegales(t: TableroDamas, color: ColorFicha): MovDama[] {
  const movs: MovDama[] = []
  for (let i = 0; i < 64; i++) if (t[i]?.color === color) movs.push(...movsFicha(t, i))
  const capturas = movs.filter((m) => m.captura != null)
  return capturas.length ? capturas : movs
}

function aplicarMov(t: TableroDamas, m: MovDama): { tablero: TableroDamas; corono: boolean } {
  const nuevo = [...t]
  const ficha = { ...nuevo[m.de]! }
  nuevo[m.de] = null
  if (m.captura != null) nuevo[m.captura] = null
  const fila = Math.floor(m.a / 8)
  const corono = !ficha.dama && ((ficha.color === 'clara' && fila === 0) || (ficha.color === 'oscura' && fila === 7))
  if (corono) ficha.dama = true
  nuevo[m.a] = ficha
  return { tablero: nuevo, corono }
}

/**
 * Partida entera: es lo que viaja en la mesa en línea. `cadena` es la ficha que
 * está en mitad de una cadena de capturas (los saltos se mandan de uno en uno y
 * el turno no cambia hasta que se agota).
 */
interface EstadoDamas {
  tab: TableroDamas
  turno: ColorFicha
  cadena: number | null
  ganador: ColorFicha | null
}

/** La jugada son las dos casillas: la captura la deduce el reductor. */
interface MovDamasMesa {
  de: number
  a: number
}

/** Quien abre la mesa lleva las claras, que son las que empiezan. */
const COLOR_DE: Record<Asiento, ColorFicha> = { a: 'clara', b: 'oscura' }

function inicialDamas(): EstadoDamas {
  return { tab: tableroInicial(), turno: 'clara', cadena: null, ganador: null }
}

/** Los movimientos que tocan ahora: en mitad de una cadena, solo sus capturas. */
function legalesDamas(e: EstadoDamas): MovDama[] {
  return e.cadena != null
    ? movsFicha(e.tab, e.cadena).filter((m) => m.captura != null)
    : movsLegales(e.tab, e.turno)
}

/**
 * Reductor puro: null si la partida acabó, si no es el turno de ese color o si
 * el salto no está entre los legales. Es el mismo que usa el árbitro de la mesa.
 */
function aplicarDamas(e: EstadoDamas, m: MovDamasMesa, color: ColorFicha): EstadoDamas | null {
  if (e.ganador !== null || e.turno !== color) return null
  const mov = legalesDamas(e).find((x) => x.de === m?.de && x.a === m?.a)
  if (!mov) return null
  const { tablero: tab, corono } = aplicarMov(e.tab, mov)
  // Cadena viva: la misma ficha sigue comiendo y el turno NO cambia.
  if (mov.captura != null && !corono && movsFicha(tab, mov.a).some((x) => x.captura != null))
    return { tab, turno: e.turno, cadena: mov.a, ganador: null }
  const rival: ColorFicha = e.turno === 'clara' ? 'oscura' : 'clara'
  if (movsLegales(tab, rival).length === 0) return { tab, turno: e.turno, cadena: null, ganador: e.turno }
  return { tab, turno: rival, cadena: null, ganador: null }
}

const VACIO_DAMAS = inicialDamas()

registrarJuegoMesa<EstadoDamas, MovDamasMesa>('damas', {
  inicial: inicialDamas,
  aplicar: (e, m, asiento) => aplicarDamas(e, m, COLOR_DE[asiento]),
  terminado: (e) => e.ganador !== null,
})

// Material visto por la máquina (lleva las oscuras): una dama vale por tres fichas
function ventajaOscuras(t: TableroDamas): number {
  let v = 0
  for (const f of t) if (f) v += (f.color === 'oscura' ? 1 : -1) * (f.dama ? 3 : 1)
  return v
}

/**
 * Jugada de la máquina: fácil elige al azar, medio prioriza coronar y difícil
 * mira la mejor respuesta del rival antes de decidir (minimax de dos jugadas).
 */
function movIA(tablero: TableroDamas, opciones: MovDama[], dif: Dificultad): MovDama {
  const alAzar = (lista: MovDama[]) => lista[Math.floor(Math.random() * lista.length)]
  if (dif === 'facil') return alAzar(opciones)
  const coronan = opciones.filter((m) => !tablero[m.de]!.dama && Math.floor(m.a / 8) === 7)
  if (dif === 'medio') return alAzar(coronan.length ? coronan : opciones)
  let mejor = -Infinity
  let elegido = opciones[0]
  for (const m of opciones) {
    const { tablero: despues, corono } = aplicarMov(tablero, m)
    const respuestas = movsLegales(despues, 'clara')
    // El rival contesta con lo que más le conviene; sin respuestas, queda ahogado
    const valor = respuestas.length
      ? Math.min(...respuestas.map((r) => ventajaOscuras(aplicarMov(despues, r).tablero)))
      : 100
    const puntaje = valor + (corono ? 0.5 : 0) + Math.random() * 0.1
    if (puntaje > mejor) {
      mejor = puntaje
      elegido = m
    }
  }
  return elegido
}

export function Damas({ dificultad = 'medio', mesaOnline = false }: PropsDificultad) {
  const t = useT()
  const mesa = useMesa<EstadoDamas, MovDamasMesa>('damas')
  const [modo, setModo] = useState<Modo | null>(mesaOnline ? 'online' : null)
  const [local, setLocal] = useState<EstadoDamas>(inicialDamas)
  const [sel, setSel] = useState<number | null>(null)

  const online = modo === 'online'
  // En línea el tablero es el de la mesa: una sola fuente, nunca el `useState`.
  const estado = online ? (mesa.estado ?? VACIO_DAMAS) : local
  const { tab: tablero, turno, cadena, ganador } = estado
  const miColor = online && mesa.miAsiento ? COLOR_DE[mesa.miAsiento] : null
  const turnoMio = !online || miColor === turno
  const sinAsientoB = mesa.asientos.b === null

  const legales = legalesDamas(estado)
  // En mitad de una cadena manda la ficha que está comiendo, no lo que se tocó.
  const seleccion = cadena != null ? cadena : sel
  const destinos = seleccion !== null ? legales.filter((m) => m.de === seleccion) : []

  const reiniciar = (m: Modo | null) => {
    if (online && m !== 'online') mesa.levantar()
    setModo(m)
    setLocal(inicialDamas())
    setSel(null)
  }

  const jugar = (m: MovDama) => {
    if (online) {
      mesa.jugar({ de: m.de, a: m.a })
      setSel(null)
      return
    }
    const nuevo = aplicarDamas(local, m, turno)
    if (!nuevo) return
    setLocal(nuevo)
    setSel(null)
  }

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

  // La máquina lleva las oscuras (las capturas ya son obligatorias para ambos)
  useEffect(() => {
    if (modo !== 'ia' || ganador || turno !== 'oscura') return
    const id = setTimeout(() => {
      if (!legales.length) return
      jugar(movIA(tablero, legales, dificultad))
    }, 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, ganador, turno, tablero, cadena])

  const clickCasilla = (i: number) => {
    if (ganador || modo === null || !turnoMio) return
    if (modo === 'ia' && turno === 'oscura') return
    if (seleccion !== null) {
      const m = destinos.find((x) => x.a === i)
      if (m) {
        jugar(m)
        return
      }
    }
    if (tablero[i]?.color === turno && legales.some((m) => m.de === i)) setSel(i)
    else if (cadena === null) setSel(null)
  }

  if (modo === null) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: 'ia',
            icono: <Icono nombre="mascota-robot" />,
            titulo: t('entre.j.modo.ia', 'Contra la máquina'),
            desc: t('entre.j.damas.iaDesc', 'Tú llevas las claras'),
            alElegir: () => reiniciar('ia'),
          },
          {
            clave: '2j',
            icono: <Icono nombre="companeros" />,
            titulo: t('entre.j.modo.2j', '2 jugadores'),
            desc: t('entre.j.modo.2jDesc', 'En el mismo dispositivo'),
            alElegir: () => reiniciar('2j'),
          },
          ...(mesa.enLinea ? [opcionEnLinea(t, mesa.asientos, () => reiniciar('online'))] : []),
        ]}
      />
    )
  }

  const claras = tablero.filter((x) => x?.color === 'clara').length
  const oscuras = tablero.filter((x) => x?.color === 'oscura').length
  const nombreColor = (c: ColorFicha) =>
    online
      ? nombreAsiento(t, mesa.asientos, c === 'clara' ? 'a' : 'b', mesa.miAsiento)
      : c === 'clara'
        ? t('entre.j.damas.claras', 'Claras')
        : t('entre.j.damas.oscuras', 'Oscuras')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          ⚪ {claras} · ⚫ {oscuras}
        </span>
        {ganador === null ? (
          <span className="text-white/60">
            {t('entre.j.turno', 'Turno')}:{' '}
            <strong style={{ color: turno === 'clara' ? 'var(--ui-ink)' : 'color-mix(in srgb, var(--ui-ink) 60%, transparent)' }}>
              {modo === 'ia' ? (turno === 'clara' ? t('entre.j.tu', 'Tú') : t('entre.j.maquina', 'Máquina')) : nombreColor(turno)}
            </strong>
          </span>
        ) : (
          <span className="font-bold" style={{ color: COLOR }}>
            <Icono nombre="trofeo" />{' '}
            {modo === 'ia'
              ? ganador === 'clara'
                ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                : t('entre.j.damas.ganaMaquina', 'Gana la máquina')
              : online
                ? ganador === miColor
                  ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                  : t('entre.j.mesa.gana', 'Gana {n}', { n: nombreColor(ganador) })
                : t('entre.j.damas.gana', `¡Ganan las ${nombreColor(ganador).toLowerCase()}!`, { color: nombreColor(ganador) })}
          </span>
        )}
        <div className="flex gap-2">
          {!online && (
            <button type="button" onClick={() => reiniciar(modo)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
              <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
            </button>
          )}
          <button type="button" onClick={() => reiniciar(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {online ? t('entre.j.mesa.salir', 'Salir de la mesa') : t('entre.j.modo.cambiar', 'Cambiar modo')}
          </button>
        </div>
      </div>

      {online && <BarraMesa abierta={mesa.abierta} cerrada={mesa.cerrada} asientos={mesa.asientos} miAsiento={mesa.miAsiento} />}

      <div className="mx-auto grid max-w-[420px] select-none grid-cols-8 overflow-hidden rounded-xl border border-white/15 shadow-lg">
        {tablero.map((ficha, i) => {
          const f = Math.floor(i / 8)
          const c = i % 8
          const jugable = (f + c) % 2 === 1
          const destino = destinos.find((m) => m.a === i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => clickCasilla(i)}
              className="relative flex aspect-square items-center justify-center"
              style={{ background: jugable ? '#b58863' : '#f0d9b5' }}
            >
              {ficha && (
                <span
                  className={`flex h-[76%] w-[76%] items-center justify-center rounded-full border-2 shadow-md ${
                    ficha.color === 'clara'
                      ? 'border-slate-400 bg-gradient-to-br from-[#ffffff] to-slate-300'
                      : 'border-black bg-gradient-to-br from-slate-600 to-slate-950'
                  } ${seleccion === i ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  {/* Tonos 500/600: no se remapean en claro, y las fichas son de color fijo. */}
                  {ficha.dama && (
                    <span className={ficha.color === 'clara' ? 'text-amber-600' : 'text-amber-500'}>♛</span>
                  )}
                </span>
              )}
              {destino && (
                <span
                  className={`absolute h-[30%] w-[30%] rounded-full ${
                    destino.captura != null ? 'bg-red-400/85' : 'bg-emerald-400/80'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-center text-xs text-white/35">
        {t('entre.j.damas.regla', 'Captura obligatoria: si puedes comer, debes comer.')}
      </p>
    </div>
  )
}
