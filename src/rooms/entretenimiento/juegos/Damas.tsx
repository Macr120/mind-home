import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import type { Dificultad, PropsDificultad } from './dificultad'
import { ElegirModo } from './ElegirModo'

type ColorFicha = 'clara' | 'oscura'
type Modo = '2j' | 'ia'

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

export function Damas({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const [modo, setModo] = useState<Modo | null>(null)
  const [tablero, setTablero] = useState<TableroDamas>(tableroInicial)
  const [turno, setTurno] = useState<ColorFicha>('clara')
  const [sel, setSel] = useState<number | null>(null)
  const [cadena, setCadena] = useState<number | null>(null)
  const [ganador, setGanador] = useState<ColorFicha | null>(null)

  const legales =
    cadena != null ? movsFicha(tablero, cadena).filter((m) => m.captura != null) : movsLegales(tablero, turno)
  const destinos = sel !== null ? legales.filter((m) => m.de === sel) : []

  const reiniciar = (m: Modo | null) => {
    setModo(m)
    setTablero(tableroInicial())
    setTurno('clara')
    setSel(null)
    setCadena(null)
    setGanador(null)
  }

  const jugar = (m: MovDama) => {
    const { tablero: nuevo, corono } = aplicarMov(tablero, m)
    const sigueCadena = m.captura != null && !corono && movsFicha(nuevo, m.a).some((x) => x.captura != null)
    setTablero(nuevo)
    if (sigueCadena) {
      setCadena(m.a)
      setSel(m.a)
      return
    }
    const rival: ColorFicha = turno === 'clara' ? 'oscura' : 'clara'
    setCadena(null)
    setSel(null)
    if (movsLegales(nuevo, rival).length === 0) setGanador(turno)
    else setTurno(rival)
  }

  // La máquina lleva las oscuras (las capturas ya son obligatorias para ambos)
  useEffect(() => {
    if (modo !== 'ia' || ganador || turno !== 'oscura') return
    const id = setTimeout(() => {
      const opciones =
        cadena != null ? movsFicha(tablero, cadena).filter((m) => m.captura != null) : movsLegales(tablero, 'oscura')
      if (!opciones.length) return
      jugar(movIA(tablero, opciones, dificultad))
    }, 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, ganador, turno, tablero, cadena])

  const clickCasilla = (i: number) => {
    if (ganador || modo === null) return
    if (modo === 'ia' && turno === 'oscura') return
    if (sel !== null) {
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
        ]}
      />
    )
  }

  const claras = tablero.filter((x) => x?.color === 'clara').length
  const oscuras = tablero.filter((x) => x?.color === 'oscura').length
  const nombreColor = (c: ColorFicha) =>
    c === 'clara' ? t('entre.j.damas.claras', 'Claras') : t('entre.j.damas.oscuras', 'Oscuras')

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
              : t('entre.j.damas.gana', `¡Ganan las ${nombreColor(ganador).toLowerCase()}!`, { color: nombreColor(ganador) })}
          </span>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => reiniciar(modo)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
          </button>
          <button type="button" onClick={() => reiniciar(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {t('entre.j.modo.cambiar', 'Cambiar modo')}
          </button>
        </div>
      </div>

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
                      ? 'border-slate-400 bg-gradient-to-br from-white to-slate-300'
                      : 'border-black bg-gradient-to-br from-slate-600 to-slate-950'
                  } ${sel === i ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  {ficha.dama && (
                    <span className={ficha.color === 'clara' ? 'text-amber-500' : 'text-amber-300'}>♛</span>
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
