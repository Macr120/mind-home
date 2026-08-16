import { Icono } from '../../../core/ui/iconos/Icono'
import { useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import type { Carta } from './cartas'
import { barajar, crearBaraja, esRoja } from './cartas'
import { CartaView } from './CartaView'
import type { Dificultad, PropsDificultad } from './dificultad'

interface CartaSol extends Carta {
  boca: boolean
}

interface EstadoSol {
  columnas: CartaSol[][]
  mazo: Carta[]
  descarte: Carta[]
  fundaciones: Carta[][]
  movimientos: number
  /** Veces que se ha reciclado el descarte para volver a recorrer el mazo. */
  reciclados: number
}

// Cartas que se levantan de golpe y cuántas vueltas se pueden dar al mazo
const AJUSTE: Record<Dificultad, { roba: number; vueltas: number }> = {
  facil: { roba: 1, vueltas: Infinity },
  medio: { roba: 3, vueltas: Infinity },
  dificil: { roba: 3, vueltas: 3 },
}

type SelSol = { zona: 'col'; col: number; idx: number } | { zona: 'descarte' } | null

const ANCHO = 46
const ALTO = Math.round(ANCHO * 1.4)
const SOLAPE_ARRIBA = 21
const SOLAPE_ABAJO = 9

function repartirSol(): EstadoSol {
  const baraja = barajar(crearBaraja())
  const columnas: CartaSol[][] = []
  let pos = 0
  for (let n = 0; n < 7; n++) {
    const col: CartaSol[] = []
    for (let k = 0; k <= n; k++) col.push({ ...baraja[pos++], boca: k === n })
    columnas.push(col)
  }
  return { columnas, mazo: baraja.slice(pos), descarte: [], fundaciones: [[], [], [], []], movimientos: 0, reciclados: 0 }
}

const clonar = (e: EstadoSol): EstadoSol => JSON.parse(JSON.stringify(e)) as EstadoSol
const alternas = (a: Carta, b: Carta) => esRoja(a) !== esRoja(b)

function encajaEnColumna(carta: Carta, col: CartaSol[]): boolean {
  if (!col.length) return carta.valor === 13
  const tope = col[col.length - 1]
  return tope.boca && tope.valor === carta.valor + 1 && alternas(carta, tope)
}

function encajaEnFundacion(carta: Carta, pila: Carta[]): boolean {
  if (!pila.length) return carta.valor === 1
  const tope = pila[pila.length - 1]
  return tope.palo === carta.palo && carta.valor === tope.valor + 1
}

// Solo se puede agarrar una secuencia descendente de colores alternos, toda boca arriba
function grupoValido(col: CartaSol[], idx: number): boolean {
  if (!col[idx]?.boca) return false
  for (let k = idx; k < col.length - 1; k++)
    if (!(col[k].valor === col[k + 1].valor + 1 && alternas(col[k], col[k + 1]))) return false
  return true
}

export function Solitario({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const ajuste = AJUSTE[dificultad]
  const [estado, setEstado] = useState<EstadoSol>(repartirSol)
  const [sel, setSel] = useState<SelSol>(null)
  const [historial, setHistorial] = useState<EstadoSol[]>([])

  const ganado = estado.fundaciones.reduce((s, f) => s + f.length, 0) === 52

  const ejecutar = (fn: (e: EstadoSol) => boolean) => {
    const e = clonar(estado)
    if (!fn(e)) return
    e.movimientos++
    setHistorial((h) => [...h.slice(-59), estado])
    setEstado(e)
    setSel(null)
  }

  const nuevaPartida = () => {
    setEstado(repartirSol())
    setSel(null)
    setHistorial([])
  }

  const deshacer = () => {
    if (!historial.length) return
    const copia = [...historial]
    setEstado(copia.pop()!)
    setHistorial(copia)
    setSel(null)
  }

  const sinVueltas = !estado.mazo.length && estado.reciclados >= ajuste.vueltas - 1

  const robar = () =>
    ejecutar((e) => {
      if (e.mazo.length) {
        for (let k = 0; k < ajuste.roba && e.mazo.length; k++) e.descarte.push(e.mazo.pop()!)
      } else if (e.descarte.length && e.reciclados < ajuste.vueltas - 1) {
        e.mazo = e.descarte.reverse()
        e.descarte = []
        e.reciclados++
      } else return false
      return true
    })

  const grupoDe = (e: EstadoSol, s: NonNullable<SelSol>): Carta[] =>
    s.zona === 'descarte' ? e.descarte.slice(-1) : e.columnas[s.col].slice(s.idx)

  const extraer = (e: EstadoSol, s: NonNullable<SelSol>): CartaSol[] => {
    if (s.zona === 'descarte') return [{ ...e.descarte.pop()!, boca: true }]
    const col = e.columnas[s.col]
    const grupo = col.splice(s.idx)
    const tope = col[col.length - 1]
    if (tope && !tope.boca) tope.boca = true
    return grupo
  }

  const intentarFundacion = (s: NonNullable<SelSol>): boolean => {
    const grupo = grupoDe(estado, s)
    if (grupo.length !== 1) return false
    const f = estado.fundaciones.findIndex((pila) => encajaEnFundacion(grupo[0], pila))
    if (f < 0) return false
    ejecutar((e) => {
      e.fundaciones[f].push(extraer(e, s)[0])
      return true
    })
    return true
  }

  const clickDescarte = () => {
    if (!estado.descarte.length) return
    if (sel !== null && sel.zona === 'descarte') {
      if (!intentarFundacion(sel)) setSel(null)
    } else setSel({ zona: 'descarte' })
  }

  const clickColumna = (colIdx: number, cartaIdx: number | null) => {
    const col = estado.columnas[colIdx]
    if (sel !== null && !(sel.zona === 'col' && sel.col === colIdx)) {
      const grupo = grupoDe(estado, sel)
      if (grupo.length && encajaEnColumna(grupo[0], col)) {
        const s = sel
        ejecutar((e) => {
          e.columnas[colIdx].push(...extraer(e, s))
          return true
        })
        return
      }
    }
    if (sel !== null && sel.zona === 'col' && sel.col === colIdx && sel.idx === cartaIdx) {
      // segundo clic en la misma carta: intenta subirla a su fundación
      if (cartaIdx === col.length - 1) {
        if (!intentarFundacion(sel)) setSel(null)
      } else setSel(null)
      return
    }
    if (cartaIdx !== null && grupoValido(col, cartaIdx)) setSel({ zona: 'col', col: colIdx, idx: cartaIdx })
    else setSel(null)
  }

  const clickFundacion = (fIdx: number) => {
    if (sel === null) return
    const grupo = grupoDe(estado, sel)
    if (grupo.length === 1 && encajaEnFundacion(grupo[0], estado.fundaciones[fIdx])) {
      const s = sel
      ejecutar((e) => {
        e.fundaciones[fIdx].push(extraer(e, s)[0])
        return true
      })
    } else setSel(null)
  }

  const subirTodo = () =>
    ejecutar((e) => {
      let algo = false
      let hubo = true
      while (hubo) {
        hubo = false
        const d = e.descarte[e.descarte.length - 1]
        if (d) {
          const f = e.fundaciones.findIndex((p) => encajaEnFundacion(d, p))
          if (f >= 0) {
            e.fundaciones[f].push(e.descarte.pop()!)
            hubo = true
          }
        }
        for (const col of e.columnas) {
          const tope = col[col.length - 1]
          if (!tope?.boca) continue
          const f = e.fundaciones.findIndex((p) => encajaEnFundacion(tope, p))
          if (f >= 0) {
            col.pop()
            const nuevoTope = col[col.length - 1]
            if (nuevoTope && !nuevoTope.boca) nuevoTope.boca = true
            e.fundaciones[f].push(tope)
            hubo = true
          }
        }
        if (hubo) algo = true
      }
      return algo
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-white/55">
          {t('entre.j.movs', 'Movimientos')}: <strong className="text-white/85">{estado.movimientos}</strong>
          {Number.isFinite(ajuste.vueltas) && (
            <span className="ms-3">
              {t('entre.j.sol.vueltas', 'Vueltas al mazo')}:{' '}
              <strong className="text-white/85">{ajuste.vueltas - estado.reciclados}</strong>
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={subirTodo} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            <Icono nombre="subir" /> {t('entre.j.sol.auto', 'Auto')}
          </button>
          <button
            type="button"
            onClick={deshacer}
            disabled={!historial.length}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold disabled:opacity-30"
          >
            <Icono nombre="deshacer" /> {t('entre.j.deshacer', 'Deshacer')}
          </button>
          <button type="button" onClick={nuevaPartida} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
          </button>
        </div>
      </div>

      <div className="mx-auto w-fit select-none space-y-2">
        <div className="flex gap-1">
          <button type="button" onClick={robar} className="relative" style={{ width: ANCHO, height: ALTO }}>
            {estado.mazo.length ? (
              <>
                <CartaView carta={{ palo: '♠', valor: 1 }} bocaAbajo ancho={ANCHO} />
                <span className="absolute -end-1 -top-1 rounded-full bg-white/20 px-1 text-[9px] font-bold">
                  {estado.mazo.length}
                </span>
              </>
            ) : (
              <span
                className={`flex h-full w-full items-center justify-center rounded-md border border-dashed text-xl ${
                  sinVueltas ? 'border-white/10 text-white/15' : 'border-white/30 text-white/50'
                }`}
              >
                ↻
              </span>
            )}
          </button>
          <button type="button" onClick={clickDescarte} style={{ width: ANCHO, height: ALTO }}>
            {estado.descarte.length ? (
              <CartaView
                carta={estado.descarte[estado.descarte.length - 1]}
                seleccionada={sel !== null && sel.zona === 'descarte'}
                ancho={ANCHO}
              />
            ) : (
              <span className="block h-full w-full rounded-md border border-dashed border-white/15" />
            )}
          </button>
          <span style={{ width: ANCHO }} />
          {estado.fundaciones.map((pila, f) => (
            <button key={f} type="button" onClick={() => clickFundacion(f)} style={{ width: ANCHO, height: ALTO }}>
              {pila.length ? (
                <CartaView carta={pila[pila.length - 1]} ancho={ANCHO} />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-white/30 text-sm text-white/40">
                  A
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {estado.columnas.map((col, colIdx) => {
            let acumulado = 0
            const posiciones = col.map((carta) => {
              const actual = acumulado
              acumulado += carta.boca ? SOLAPE_ARRIBA : SOLAPE_ABAJO
              return actual
            })
            const altura = (col.length ? posiciones[col.length - 1] + ALTO : ALTO) + 2
            return (
              <div key={colIdx} className="relative" style={{ width: ANCHO, height: altura }}>
                {col.length === 0 && (
                  <button
                    type="button"
                    onClick={() => clickColumna(colIdx, null)}
                    className="absolute inset-x-0 top-0 rounded-md border border-dashed border-white/15"
                    style={{ height: ALTO }}
                  />
                )}
                {col.map((carta, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => clickColumna(colIdx, k)}
                    className="absolute"
                    style={{ top: posiciones[k] }}
                  >
                    <CartaView
                      carta={carta}
                      bocaAbajo={!carta.boca}
                      seleccionada={sel !== null && sel.zona === 'col' && sel.col === colIdx && k >= sel.idx}
                      ancho={ANCHO}
                    />
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {ganado && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center">
          <p className="text-lg font-black">{t('entre.j.ganaste', '¡Ganaste! 🎉')}</p>
          <p className="mt-1 text-sm text-white/60">
            {t('entre.j.movs', 'Movimientos')}: {estado.movimientos}
          </p>
          <button
            type="button"
            onClick={nuevaPartida}
            className="mt-2 rounded-xl px-4 py-2 font-bold text-black"
            style={{ background: COLOR }}
          >
            {t('entre.j.nueva', 'Nueva partida')}
          </button>
        </div>
      )}
    </div>
  )
}
