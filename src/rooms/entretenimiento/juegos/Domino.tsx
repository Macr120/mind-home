import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { barajar } from './cartas'
import type { Dificultad, PropsDificultad } from './dificultad'

interface FichaDom {
  a: number
  b: number
}

interface RondaDom {
  mano: FichaDom[]
  manoIA: FichaDom[]
  pozo: FichaDom[]
  // Cadena orientada: cadena[0].a es la punta izquierda, última .b la derecha
  cadena: FichaDom[]
  turno: 'tu' | 'ia'
  pases: number
}

interface FinRonda {
  ganador: 'tu' | 'ia' | 'empate'
  puntos: number
  trancado: boolean
}

const PIPS: number[][] = [
  [],
  [4],
  [2, 6],
  [2, 4, 6],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
]

function todasLasFichas(): FichaDom[] {
  const fichas: FichaDom[] = []
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) fichas.push({ a, b })
  return fichas
}

const puntosDe = (mano: FichaDom[]) => mano.reduce((s, f) => s + f.a + f.b, 0)

// Abre quien tenga el doble más alto (o la ficha más pesada) y esa ficha sale sola
function repartirRonda(): RondaDom {
  const fichas = barajar(todasLasFichas())
  const mano = fichas.slice(0, 7)
  const manoIA = fichas.slice(7, 14)
  const pozo = fichas.slice(14)
  const valorSalida = (f: FichaDom) => (f.a === f.b ? 100 + f.a : f.a + f.b)
  const mejorTu = Math.max(...mano.map(valorSalida))
  const mejorIA = Math.max(...manoIA.map(valorSalida))
  const abresTu = mejorTu >= mejorIA
  const origen = abresTu ? mano : manoIA
  const idx = origen.findIndex((f) => valorSalida(f) === (abresTu ? mejorTu : mejorIA))
  const [salida] = origen.splice(idx, 1)
  return { mano, manoIA, pozo, cadena: [salida], turno: abresTu ? 'ia' : 'tu', pases: 0 }
}

const extremos = (cadena: FichaDom[]) => ({ izq: cadena[0].a, der: cadena[cadena.length - 1].b })

const esJugable = (f: FichaDom, cadena: FichaDom[]) => {
  const { izq, der } = extremos(cadena)
  return f.a === izq || f.b === izq || f.a === der || f.b === der
}

function colocar(cadena: FichaDom[], f: FichaDom, lado: 'izq' | 'der'): FichaDom[] {
  const { izq, der } = extremos(cadena)
  if (lado === 'izq') return [f.b === izq ? f : { a: f.b, b: f.a }, ...cadena]
  return [...cadena, f.a === der ? f : { a: f.b, b: f.a }]
}

interface JugadaDom {
  ficha: FichaDom
  lado: 'izq' | 'der'
}

/**
 * Jugada de la máquina: fácil suelta cualquier cosa, medio se quita la ficha más
 * pesada y difícil además cuida quedarse con fichas que sigan casando.
 */
function jugadaIA(mano: FichaDom[], cadena: FichaDom[], dif: Dificultad): JugadaDom {
  const { izq, der } = extremos(cadena)
  const opciones: JugadaDom[] = []
  for (const ficha of mano) {
    if (ficha.a === izq || ficha.b === izq) opciones.push({ ficha, lado: 'izq' })
    if (ficha.a === der || ficha.b === der) opciones.push({ ficha, lado: 'der' })
  }
  const peso = (f: FichaDom) => f.a + f.b
  if (dif === 'facil') return opciones[Math.floor(Math.random() * opciones.length)]
  if (dif === 'medio') return opciones.reduce((mejor, j) => (peso(j.ficha) > peso(mejor.ficha) ? j : mejor))
  let mejor = opciones[0]
  let mejorPuntaje = -Infinity
  for (const j of opciones) {
    const despues = colocar(cadena, j.ficha, j.lado)
    const salidas = mano.filter((f) => f !== j.ficha && esJugable(f, despues)).length
    const puntaje = peso(j.ficha) + 3 * salidas + (j.ficha.a === j.ficha.b ? 2 : 0) + Math.random()
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = j
    }
  }
  return mejor
}

function Mitad({ n, tam }: { n: number; tam: number }) {
  return (
    <span className="grid shrink-0 grid-cols-3 grid-rows-3 place-items-center" style={{ width: tam, height: tam }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="rounded-full bg-slate-900"
          style={{ width: tam * 0.17, height: tam * 0.17, opacity: PIPS[n].includes(i) ? 1 : 0 }}
        />
      ))}
    </span>
  )
}

function FichaDominoUI({ a, b, vertical = false, tam = 20 }: { a: number; b: number; vertical?: boolean; tam?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center overflow-hidden rounded-[5px] border border-black/50 bg-[#f5f0e2] shadow-sm ${
        vertical ? 'flex-col' : ''
      }`}
    >
      <Mitad n={a} tam={tam} />
      <span className={vertical ? 'h-px w-[80%] bg-black/25' : 'w-px self-stretch bg-black/25 my-[2px]'} />
      <Mitad n={b} tam={tam} />
    </span>
  )
}

function Dorso({ tam = 16 }: { tam?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-[4px] border border-emerald-700/70 bg-gradient-to-br from-emerald-800 to-emerald-950"
      style={{ width: tam, height: tam * 2 }}
    />
  )
}

export function Domino({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const [ronda, setRonda] = useState<RondaDom>(repartirRonda)
  const [fin, setFin] = useState<FinRonda | null>(null)
  const [pendiente, setPendiente] = useState<number | null>(null)
  const [marcador, setMarcador] = useState({ tu: 0, ia: 0 })
  const [aviso, setAviso] = useState<string | null>(null)

  const { izq, der } = extremos(ronda.cadena)
  const puedesJugar = ronda.mano.some((f) => esJugable(f, ronda.cadena))

  const evaluarFin = (r: RondaDom): FinRonda | null => {
    if (r.mano.length === 0) return { ganador: 'tu', puntos: puntosDe(r.manoIA), trancado: false }
    if (r.manoIA.length === 0) return { ganador: 'ia', puntos: puntosDe(r.mano), trancado: false }
    if (r.pases >= 2) {
      const pTu = puntosDe(r.mano)
      const pIA = puntosDe(r.manoIA)
      if (pTu === pIA) return { ganador: 'empate', puntos: 0, trancado: true }
      return pTu < pIA ? { ganador: 'tu', puntos: pIA, trancado: true } : { ganador: 'ia', puntos: pTu, trancado: true }
    }
    return null
  }

  const transicion = (r: RondaDom) => {
    setRonda(r)
    const f = evaluarFin(r)
    if (f) {
      setFin(f)
      if (f.ganador === 'tu') setMarcador((m) => ({ ...m, tu: m.tu + f.puntos }))
      else if (f.ganador === 'ia') setMarcador((m) => ({ ...m, ia: m.ia + f.puntos }))
    }
  }

  const jugarFicha = (idx: number, lado: 'izq' | 'der') => {
    if (fin || ronda.turno !== 'tu') return
    const f = ronda.mano[idx]
    const puedeIzq = f.a === izq || f.b === izq
    const puedeDer = f.a === der || f.b === der
    if ((lado === 'izq' && !puedeIzq) || (lado === 'der' && !puedeDer)) return
    setPendiente(null)
    setAviso(null)
    transicion({
      ...ronda,
      mano: ronda.mano.filter((_, k) => k !== idx),
      cadena: colocar(ronda.cadena, f, lado),
      turno: 'ia',
      pases: 0,
    })
  }

  const clickFicha = (idx: number) => {
    if (fin || ronda.turno !== 'tu') return
    const f = ronda.mano[idx]
    if (!esJugable(f, ronda.cadena)) return
    const puedeIzq = f.a === izq || f.b === izq
    const puedeDer = f.a === der || f.b === der
    if (puedeIzq && puedeDer && izq !== der) setPendiente(idx)
    else jugarFicha(idx, puedeIzq ? 'izq' : 'der')
  }

  const robar = () => {
    if (fin || ronda.turno !== 'tu' || puedesJugar || !ronda.pozo.length) return
    const pozo = [...ronda.pozo]
    const robada = pozo.pop()!
    setRonda({ ...ronda, pozo, mano: [...ronda.mano, robada] })
  }

  const pasar = () => {
    if (fin || ronda.turno !== 'tu' || puedesJugar || ronda.pozo.length) return
    transicion({ ...ronda, turno: 'ia', pases: ronda.pases + 1 })
  }

  // La máquina roba hasta poder y suelta su ficha más pesada
  useEffect(() => {
    if (fin || ronda.turno !== 'ia') return
    const id = setTimeout(() => {
      const manoIA = [...ronda.manoIA]
      const pozo = [...ronda.pozo]
      let robadas = 0
      let jugables = manoIA.filter((f) => esJugable(f, ronda.cadena))
      while (!jugables.length && pozo.length) {
        manoIA.push(pozo.pop()!)
        robadas++
        jugables = manoIA.filter((f) => esJugable(f, ronda.cadena))
      }
      if (!jugables.length) {
        setAviso(t('entre.j.domino.pasoIA', 'La máquina pasa'))
        transicion({ ...ronda, manoIA, pozo, turno: 'tu', pases: ronda.pases + 1 })
        return
      }
      const jugada = jugadaIA(manoIA, ronda.cadena, dificultad)
      manoIA.splice(manoIA.indexOf(jugada.ficha), 1)
      setAviso(robadas > 0 ? t('entre.j.domino.robaIA', `La máquina robó ${robadas}`, { n: String(robadas) }) : null)
      transicion({
        ...ronda,
        manoIA,
        pozo,
        cadena: colocar(ronda.cadena, jugada.ficha, jugada.lado),
        turno: 'tu',
        pases: 0,
      })
    }, 650)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ronda, fin])

  const siguienteRonda = () => {
    setRonda(repartirRonda())
    setFin(null)
    setPendiente(null)
    setAviso(null)
  }

  const nuevaPartida = () => {
    setMarcador({ tu: 0, ia: 0 })
    siguienteRonda()
  }

  return (
    <div className="space-y-3">
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

      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="mr-1 text-sm"><Icono nombre="mascota-robot" /></span>
          {ronda.manoIA.map((_, k) => (
            <Dorso key={k} tam={13} />
          ))}
        </div>
        <span className="shrink-0 text-xs text-white/45">
          {t('entre.j.domino.pozo', 'Pozo')}: {ronda.pozo.length}
        </span>
      </div>

      <div className="flex min-h-[96px] flex-wrap content-center items-center justify-center gap-[3px] rounded-xl border border-white/10 bg-emerald-950/50 p-3">
        {ronda.cadena.map((f, i) => (
          <FichaDominoUI key={i} a={f.a} b={f.b} vertical={f.a === f.b} tam={17} />
        ))}
      </div>

      {aviso && <p className="text-center text-xs text-white/50">{aviso}</p>}

      {pendiente !== null && !fin && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-white/55">{t('entre.j.domino.eliges', '¿En qué punta?')}</span>
          <button
            type="button"
            onClick={() => jugarFicha(pendiente, 'izq')}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-black"
            style={{ background: COLOR }}
          >
            ◀ {izq}
          </button>
          <button
            type="button"
            onClick={() => jugarFicha(pendiente, 'der')}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-black"
            style={{ background: COLOR }}
          >
            {der} ▶
          </button>
          <button type="button" onClick={() => setPendiente(null)} className="text-sm text-white/40">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-1.5">
        {ronda.mano.map((f, idx) => {
          const jugable = !fin && ronda.turno === 'tu' && esJugable(f, ronda.cadena)
          return (
            <button
              key={`${f.a}-${f.b}`}
              type="button"
              onClick={() => clickFicha(idx)}
              className={`rounded-[6px] transition ${
                jugable ? 'ring-2 ring-amber-400 hover:-translate-y-1' : 'opacity-60'
              } ${pendiente === idx ? 'ring-emerald-300 -translate-y-1' : ''}`}
            >
              <FichaDominoUI a={f.a} b={f.b} vertical tam={22} />
            </button>
          )
        })}
      </div>

      {!fin && ronda.turno === 'tu' && !puedesJugar && (
        <div className="flex justify-center">
          {ronda.pozo.length > 0 ? (
            <button
              type="button"
              onClick={robar}
              className="rounded-xl px-4 py-2 font-bold text-black"
              style={{ background: COLOR }}
            >
              <Icono nombre="domino" /> {t('entre.j.domino.robar', 'Robar del pozo')} ({ronda.pozo.length})
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
          {fin.trancado && <p className="text-xs text-white/55"><Icono nombre="candado" /> {t('entre.j.domino.trancado', 'Juego trancado')}</p>}
          <p className="mt-1 text-lg font-black">
            {fin.ganador === 'tu'
              ? t('entre.j.domino.ganasteRonda', `Ganas la ronda: +${fin.puntos} puntos`, { n: String(fin.puntos) })
              : fin.ganador === 'ia'
                ? t('entre.j.domino.rondaIA', `La máquina gana la ronda: +${fin.puntos} puntos`, { n: String(fin.puntos) })
                : t('entre.j.domino.empateRonda', 'Empate: nadie suma puntos')}
          </p>
          <button
            type="button"
            onClick={siguienteRonda}
            className="mt-3 rounded-xl px-4 py-2 font-bold text-black"
            style={{ background: COLOR }}
          >
            {t('entre.j.domino.siguienteRonda', 'Siguiente ronda')}
          </button>
        </div>
      )}
    </div>
  )
}
