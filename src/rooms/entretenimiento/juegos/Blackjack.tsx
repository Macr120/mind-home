import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { SALDO_INICIAL, guardarSaldo, leerSaldo } from './almacen'
import type { Carta } from './cartas'
import { barajar, crearBaraja } from './cartas'
import { CartaView } from './CartaView'

type Fase = 'apuesta' | 'jugador' | 'fin'

function valorMano(mano: Carta[]): number {
  let total = 0
  let ases = 0
  for (const c of mano) {
    if (c.valor === 1) {
      ases++
      total += 11
    } else total += Math.min(10, c.valor)
  }
  while (total > 21 && ases > 0) {
    total -= 10
    ases--
  }
  return total
}

const FICHAS: { valor: number; clase: string }[] = [
  { valor: 5, clase: 'border-red-400 bg-red-500/20' },
  { valor: 25, clase: 'border-emerald-400 bg-emerald-500/20' },
  { valor: 100, clase: 'border-indigo-400 bg-indigo-500/20' },
]

export function Blackjack() {
  const t = useT()
  const [saldo, setSaldo] = useState<number>(leerSaldo)
  const [apuesta, setApuesta] = useState(0)
  const [mazo, setMazo] = useState<Carta[]>([])
  const [jugador, setJugador] = useState<Carta[]>([])
  const [crupier, setCrupier] = useState<Carta[]>([])
  const [fase, setFase] = useState<Fase>('apuesta')
  const [resultado, setResultado] = useState<{ texto: string; gano: boolean } | null>(null)

  useEffect(() => {
    guardarSaldo(saldo)
  }, [saldo])

  const repartir = () => {
    if (fase !== 'apuesta' || apuesta < 1 || apuesta > saldo) return
    const m = barajar(crearBaraja(4))
    const j = [m.pop()!, m.pop()!]
    const d = [m.pop()!, m.pop()!]
    setMazo(m)
    setJugador(j)
    setCrupier(d)
    let s = saldo - apuesta
    if (valorMano(j) === 21) {
      setFase('fin')
      if (valorMano(d) === 21) {
        s += apuesta
        setResultado({ texto: t('entre.j.bj.empate', 'Empate: recuperas tu apuesta'), gano: false })
      } else {
        s += Math.floor(apuesta * 2.5)
        setResultado({ texto: t('entre.j.bj.blackjack', '¡Blackjack! Paga 3:2 🎉'), gano: true })
      }
    } else {
      setFase('jugador')
      setResultado(null)
    }
    setSaldo(s)
  }

  // El crupier destapa y pide hasta llegar a 17; luego se paga la mano
  const cerrarMano = (m: Carta[], j: Carta[], apuestaFinal: number, saldoActual: number) => {
    const d = [...crupier]
    while (valorMano(d) < 17) d.push(m.pop()!)
    setMazo(m)
    setCrupier(d)
    const vj = valorMano(j)
    const vd = valorMano(d)
    let s = saldoActual
    if (vd > 21) {
      s += apuestaFinal * 2
      setResultado({ texto: t('entre.j.bj.crupierPasa', 'El crupier se pasa: ¡ganaste!'), gano: true })
    } else if (vj > vd) {
      s += apuestaFinal * 2
      setResultado({ texto: t('entre.j.ganaste', '¡Ganaste! 🎉'), gano: true })
    } else if (vj === vd) {
      s += apuestaFinal
      setResultado({ texto: t('entre.j.bj.empate', 'Empate: recuperas tu apuesta'), gano: false })
    } else {
      setResultado({ texto: t('entre.j.bj.pierde', 'Gana el crupier'), gano: false })
    }
    setSaldo(s)
    setFase('fin')
  }

  const pedir = () => {
    if (fase !== 'jugador') return
    const m = [...mazo]
    const j = [...jugador, m.pop()!]
    setMazo(m)
    setJugador(j)
    if (valorMano(j) > 21) {
      setFase('fin')
      setResultado({ texto: t('entre.j.bj.pasaste', 'Te pasaste de 21'), gano: false })
    }
  }

  const plantarse = () => {
    if (fase === 'jugador') cerrarMano([...mazo], jugador, apuesta, saldo)
  }

  const doblar = () => {
    if (fase !== 'jugador' || jugador.length !== 2 || saldo < apuesta) return
    const m = [...mazo]
    const j = [...jugador, m.pop()!]
    const s = saldo - apuesta
    const doble = apuesta * 2
    setJugador(j)
    setApuesta(doble)
    if (valorMano(j) > 21) {
      setMazo(m)
      setSaldo(s)
      setFase('fin')
      setResultado({ texto: t('entre.j.bj.pasaste', 'Te pasaste de 21'), gano: false })
    } else cerrarMano(m, j, doble, s)
  }

  const nuevaMano = () => {
    setJugador([])
    setCrupier([])
    setResultado(null)
    setFase('apuesta')
    if (apuesta > saldo) setApuesta(0)
  }

  const vJ = valorMano(jugador)
  const vC = valorMano(crupier)
  const ocultaCrupier = fase === 'jugador'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-lg bg-white/5 px-3 py-1.5">
          <Icono emoji="💰" /> {t('entre.j.saldo', 'Saldo')}: <strong>{saldo}</strong>
        </span>
        {saldo === 0 && apuesta === 0 && fase === 'apuesta' && (
          <button
            type="button"
            onClick={() => setSaldo(SALDO_INICIAL)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-black"
            style={{ background: COLOR }}
          >
            <Icono nombre="moneda" /> {t('entre.j.recargar', 'Recibir 500 fichas')}
          </button>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-emerald-950 to-[#06281c] p-4">
        <div>
          <p className="mb-1 text-xs text-white/45">
            <Icono nombre="sombrero" /> {t('entre.j.bj.crupier', 'Crupier')}
            {crupier.length > 0 && !ocultaCrupier && ` · ${vC}`}
          </p>
          <div className="flex min-h-[74px] flex-wrap gap-1.5">
            {crupier.map((c, k) => (
              <CartaView key={k} carta={c} bocaAbajo={ocultaCrupier && k === 1} ancho={52} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-white/45">
            <Icono nombre="animo-contento" /> {t('entre.j.bj.tu', 'Tu mano')}
            {jugador.length > 0 && ` · ${vJ}`}
          </p>
          <div className="flex min-h-[74px] flex-wrap gap-1.5">
            {jugador.map((c, k) => (
              <CartaView key={k} carta={c} ancho={52} />
            ))}
          </div>
        </div>
        {resultado && (
          <p className={`text-center text-lg font-black ${resultado.gano ? 'text-emerald-300' : 'text-white/80'}`}>
            {resultado.texto}
          </p>
        )}
      </div>

      {fase === 'apuesta' && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            {FICHAS.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => apuesta + f.valor <= saldo && setApuesta(apuesta + f.valor)}
                className={`h-12 w-12 rounded-full border-2 text-sm font-bold ${f.clase} disabled:opacity-30`}
                disabled={apuesta + f.valor > saldo}
              >
                {f.valor}
              </button>
            ))}
            <button type="button" onClick={() => setApuesta(0)} className="text-xs text-white/40 underline">
              {t('entre.j.bj.quitar', 'Quitar')}
            </button>
          </div>
          <p className="text-center text-sm">
            {t('entre.j.bj.apuesta', 'Apuesta')}: <strong>{apuesta}</strong>
          </p>
          <button
            type="button"
            onClick={repartir}
            disabled={apuesta < 1}
            className="w-full rounded-xl py-2.5 font-bold text-black disabled:opacity-30"
            style={{ background: COLOR }}
          >
            {t('entre.j.bj.repartir', 'Repartir')}
          </button>
        </div>
      )}

      {fase === 'jugador' && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={pedir} className="rounded-xl bg-white/10 py-2.5 font-bold hover:bg-white/20">
            <Icono nombre="naipe" /> {t('entre.j.bj.pedir', 'Pedir')}
          </button>
          <button type="button" onClick={plantarse} className="rounded-xl py-2.5 font-bold text-black" style={{ background: COLOR }}>
            <Icono nombre="mano" /> {t('entre.j.bj.plantarse', 'Plantarse')}
          </button>
          <button
            type="button"
            onClick={doblar}
            disabled={jugador.length !== 2 || saldo < apuesta}
            className="rounded-xl bg-white/10 py-2.5 font-bold hover:bg-white/20 disabled:opacity-30"
          >
            ×2 {t('entre.j.bj.doblar', 'Doblar')}
          </button>
        </div>
      )}

      {fase === 'fin' && (
        <button
          type="button"
          onClick={nuevaMano}
          className="w-full rounded-xl py-2.5 font-bold text-black"
          style={{ background: COLOR }}
        >
          {t('entre.j.bj.nuevaMano', 'Nueva mano')}
        </button>
      )}

      <p className="text-center text-xs text-white/35">
        {t('entre.j.bj.regla', 'El crupier se planta con 17. El blackjack paga 3:2.')}
      </p>
    </div>
  )
}
