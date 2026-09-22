import { useEffect, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { registrarJuegoMesa, useMesa, type Asiento } from '../../../core/partida/mesa'
import { COLOR } from '../constantes'
import type { Dificultad, PropsDificultad } from './dificultad'
import { ElegirModo } from './ElegirModo'
import { BarraMesa, nombreAsiento, opcionEnLinea } from './mesaJuego'

type Modo = '2j' | 'ia' | 'online'
type FichaC4 = 'R' | 'A'
type TableroC4 = (FichaC4 | null)[]

/** Partida entera: es lo que viaja en la mesa en línea (`e` de la apertura). */
interface EstadoC4 {
  tab: TableroC4
  turno: FichaC4
  ganador: FichaC4 | 'empate' | null
}

/** La jugada es la columna donde se suelta la ficha. */
interface MovC4 {
  col: number
}

/** Quien abre la mesa lleva las rojas, que son las que empiezan. */
const FICHA_DE: Record<Asiento, FichaC4> = { a: 'R', b: 'A' }

const COLS = 7
const FILAS = 6
// Columnas del centro hacia afuera: preferencia de la IA cuando no hay jugada crítica
const ORDEN_CENTRAL = [3, 2, 4, 1, 5, 0, 6]
const DIRS_C4 = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

function filaLibre(t: TableroC4, col: number): number | null {
  for (let f = FILAS - 1; f >= 0; f--) if (t[f * COLS + col] === null) return f
  return null
}

function hayCuatro(t: TableroC4, ficha: FichaC4): boolean {
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLS; c++) {
      if (t[f * COLS + c] !== ficha) continue
      for (const [df, dc] of DIRS_C4) {
        let n = 1
        while (n < 4) {
          const f1 = f + df * n
          const c1 = c + dc * n
          if (f1 < 0 || f1 >= FILAS || c1 < 0 || c1 >= COLS || t[f1 * COLS + c1] !== ficha) break
          n++
        }
        if (n === 4) return true
      }
    }
  return false
}

function conFicha(t: TableroC4, col: number, ficha: FichaC4): TableroC4 | null {
  const f = filaLibre(t, col)
  if (f === null) return null
  const nuevo = [...t]
  nuevo[f * COLS + col] = ficha
  return nuevo
}

const columnasLibres = (t: TableroC4) => ORDEN_CENTRAL.filter((col) => filaLibre(t, col) !== null)

function inicialC4(): EstadoC4 {
  return { tab: new Array<FichaC4 | null>(COLS * FILAS).fill(null), turno: 'R', ganador: null }
}

/**
 * Reductor puro de la partida: null si ya acabó, si no es el turno de esa ficha
 * o si la columna no existe o está llena. Es el mismo que usa el árbitro de la
 * mesa para juzgar la jugada que le llega.
 */
function aplicarC4(e: EstadoC4, col: number, ficha: FichaC4): EstadoC4 | null {
  if (e.ganador !== null || e.turno !== ficha) return null
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return null
  const tab = conFicha(e.tab, col, ficha)
  if (!tab) return null
  const ganador = hayCuatro(tab, ficha) ? ficha : tab.every((c) => c !== null) ? 'empate' : null
  return { tab, turno: ficha === 'R' ? 'A' : 'R', ganador }
}

const VACIO_C4 = inicialC4()

registrarJuegoMesa<EstadoC4, MovC4>('c4', {
  inicial: inicialC4,
  aplicar: (e, m, asiento) => aplicarC4(e, m?.col, FICHA_DE[asiento]),
  terminado: (e) => e.ganador !== null,
})

// Cuenta amenazas por ventanas de 4 desde el punto de vista de `ficha`
function evaluar(t: TableroC4, ficha: FichaC4): number {
  const rival: FichaC4 = ficha === 'A' ? 'R' : 'A'
  let puntos = 0
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLS; c++)
      for (const [df, dc] of DIRS_C4) {
        const f3 = f + df * 3
        const c3 = c + dc * 3
        if (f3 < 0 || f3 >= FILAS || c3 < 0 || c3 >= COLS) continue
        let mias = 0
        let suyas = 0
        for (let n = 0; n < 4; n++) {
          const v = t[(f + df * n) * COLS + c + dc * n]
          if (v === ficha) mias++
          else if (v === rival) suyas++
        }
        if (mias && suyas) continue
        if (mias === 3) puntos += 6
        else if (mias === 2) puntos += 2
        else if (suyas === 3) puntos -= 5
        else if (suyas === 2) puntos -= 2
      }
  for (let f = 0; f < FILAS; f++) if (t[f * COLS + 3] === ficha) puntos += 3
  return puntos
}

// Negamax con poda alfa-beta; el rival acaba de mover, así que si ya hizo 4 perdimos
function negamax(t: TableroC4, ficha: FichaC4, prof: number, alfa: number, beta: number): number {
  const rival: FichaC4 = ficha === 'A' ? 'R' : 'A'
  if (hayCuatro(t, rival)) return -10000 - prof
  const cols = columnasLibres(t)
  if (!cols.length) return 0
  if (prof === 0) return evaluar(t, ficha)
  let mejor = -Infinity
  for (const col of cols) {
    const v = -negamax(conFicha(t, col, ficha)!, rival, prof - 1, -beta, -alfa)
    mejor = Math.max(mejor, v)
    alfa = Math.max(alfa, v)
    if (alfa >= beta) break
  }
  return mejor
}

/**
 * Columna que juega la máquina (lleva las amarillas):
 * fácil remata pero no bloquea, medio gana/bloquea/centro y difícil busca a 5 jugadas.
 */
function columnaIA(t: TableroC4, dif: Dificultad): number {
  const cols = columnasLibres(t)
  const gana = cols.find((col) => hayCuatro(conFicha(t, col, 'A')!, 'A'))
  if (gana !== undefined) return gana
  if (dif === 'facil') return cols[Math.floor(Math.random() * cols.length)]
  const bloqueo = cols.find((col) => hayCuatro(conFicha(t, col, 'R')!, 'R'))
  if (bloqueo !== undefined) return bloqueo
  if (dif === 'medio') return cols[0]
  let mejor = -Infinity
  let elegida = cols[0]
  for (const col of cols) {
    const v = -negamax(conFicha(t, col, 'A')!, 'R', 4, -Infinity, Infinity)
    if (v > mejor) {
      mejor = v
      elegida = col
    }
  }
  return elegida
}

export function CuatroEnLinea({ dificultad = 'medio', mesaOnline = false }: PropsDificultad) {
  const t = useT()
  const mesa = useMesa<EstadoC4, MovC4>('c4')
  const [modo, setModo] = useState<Modo | null>(mesaOnline ? 'online' : null)
  const [local, setLocal] = useState<EstadoC4>(inicialC4)

  const online = modo === 'online'
  // En línea el tablero es el de la mesa: una sola fuente, nunca el `useState`.
  const { tab: tablero, turno, ganador } = online ? (mesa.estado ?? VACIO_C4) : local
  const miFicha = online && mesa.miAsiento ? FICHA_DE[mesa.miAsiento] : null
  const turnoMio = !online || miFicha === turno
  const sinAsientoB = mesa.asientos.b === null

  const reiniciar = (m: Modo | null) => {
    if (online && m !== 'online') mesa.levantar()
    setModo(m)
    setLocal(inicialC4())
  }

  const soltar = (col: number, ficha: FichaC4) => {
    if (online) {
      mesa.jugar({ col })
      return
    }
    const nuevo = aplicarC4(local, col, ficha)
    if (nuevo) setLocal(nuevo)
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

  useEffect(() => {
    if (modo !== 'ia' || ganador || turno !== 'A') return
    const id = setTimeout(() => soltar(columnaIA(tablero, dificultad), 'A'), 450)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, ganador, turno, tablero])

  if (modo === null) {
    return (
      <ElegirModo
        opciones={[
          {
            clave: 'ia',
            icono: <Icono nombre="mascota-robot" />,
            titulo: t('entre.j.modo.ia', 'Contra la máquina'),
            desc: t('entre.j.cuatroenlinea.iaDesc', 'Tú llevas las rojas'),
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

  const nombreFicha = (f: FichaC4) =>
    online
      ? nombreAsiento(t, mesa.asientos, f === 'R' ? 'a' : 'b', mesa.miAsiento)
      : f === 'R'
        ? t('entre.j.cuatroenlinea.rojas', 'Rojas')
        : t('entre.j.cuatroenlinea.amarillas', 'Amarillas')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {ganador === null ? (
          <span className="text-white/60">
            {t('entre.j.turno', 'Turno')}:{' '}
            <strong style={{ color: turno === 'R' ? '#f87171' : '#facc15' }}>
              {modo === 'ia' ? (turno === 'R' ? t('entre.j.tu', 'Tú') : t('entre.j.maquina', 'Máquina')) : nombreFicha(turno)}
            </strong>
          </span>
        ) : (
          <span className="font-bold" style={{ color: COLOR }}>
            <Icono nombre="trofeo" />{' '}
            {ganador === 'empate'
              ? t('entre.j.cuatroenlinea.empate', 'Empate: tablero lleno')
              : modo === 'ia'
                ? ganador === 'R'
                  ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                  : t('entre.j.cuatroenlinea.ganaMaquina', 'Gana la máquina')
                : online
                  ? ganador === miFicha
                    ? t('entre.j.ganaste', '¡Ganaste! 🎉')
                    : t('entre.j.mesa.gana', 'Gana {n}', { n: nombreFicha(ganador) })
                  : t('entre.j.cuatroenlinea.gana', `¡Ganan las ${nombreFicha(ganador).toLowerCase()}!`, { color: nombreFicha(ganador) })}
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

      <div className="mx-auto grid max-w-[360px] select-none grid-cols-7 gap-1 rounded-xl bg-blue-950/70 p-2">
        {tablero.map((ficha, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (ganador || !turnoMio || (modo === 'ia' && turno === 'A')) return
              soltar(i % COLS, turno)
            }}
            className="flex aspect-square items-center justify-center"
          >
            <span
              className="h-[88%] w-[88%] rounded-full shadow-inner"
              style={{ background: ficha === 'R' ? '#ef4444' : ficha === 'A' ? '#facc15' : 'rgba(255,255,255,0.08)' }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
