import { useEffect, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'

type Modo = '2j' | 'ia'
type FichaC4 = 'R' | 'A'
type TableroC4 = (FichaC4 | null)[]

const COLS = 7
const FILAS = 6
// Columnas del centro hacia afuera: preferencia de la IA cuando no hay jugada crítica
const ORDEN_CENTRAL = [3, 2, 4, 1, 5, 0, 6]

function filaLibre(t: TableroC4, col: number): number | null {
  for (let f = FILAS - 1; f >= 0; f--) if (t[f * COLS + col] === null) return f
  return null
}

function hayCuatro(t: TableroC4, ficha: FichaC4): boolean {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLS; c++) {
      if (t[f * COLS + c] !== ficha) continue
      for (const [df, dc] of dirs) {
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

// IA: gana si puede, bloquea si el rival gana, si no juega lo más al centro posible
function columnaIA(t: TableroC4): number {
  for (const ficha of ['A', 'R'] as const)
    for (const col of ORDEN_CENTRAL) {
      const prueba = conFicha(t, col, ficha)
      if (prueba && hayCuatro(prueba, ficha)) return col
    }
  return ORDEN_CENTRAL.find((col) => filaLibre(t, col) !== null)!
}

export function CuatroEnLinea() {
  const t = useT()
  const [modo, setModo] = useState<Modo | null>(null)
  const [tablero, setTablero] = useState<TableroC4>(() => new Array<FichaC4 | null>(COLS * FILAS).fill(null))
  const [turno, setTurno] = useState<FichaC4>('R')
  const [ganador, setGanador] = useState<FichaC4 | 'empate' | null>(null)

  const reiniciar = (m: Modo | null) => {
    setModo(m)
    setTablero(new Array<FichaC4 | null>(COLS * FILAS).fill(null))
    setTurno('R')
    setGanador(null)
  }

  const soltar = (col: number, ficha: FichaC4) => {
    const nuevo = conFicha(tablero, col, ficha)
    if (!nuevo) return
    setTablero(nuevo)
    if (hayCuatro(nuevo, ficha)) setGanador(ficha)
    else if (nuevo.every((c) => c !== null)) setGanador('empate')
    else setTurno(ficha === 'R' ? 'A' : 'R')
  }

  useEffect(() => {
    if (modo !== 'ia' || ganador || turno !== 'A') return
    const id = setTimeout(() => soltar(columnaIA(tablero), 'A'), 450)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, ganador, turno, tablero])

  if (modo === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t('entre.j.modo.titulo', '¿Cómo quieres jugar?')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => reiniciar('ia')}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <p className="text-2xl"><Icono nombre="mascota-robot" /></p>
            <p className="mt-1 font-bold">{t('entre.j.modo.ia', 'Contra la máquina')}</p>
            <p className="text-xs text-white/50">{t('entre.j.cuatroenlinea.iaDesc', 'Tú llevas las rojas')}</p>
          </button>
          <button
            type="button"
            onClick={() => reiniciar('2j')}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <p className="text-2xl"><Icono nombre="companeros" /></p>
            <p className="mt-1 font-bold">{t('entre.j.modo.2j', '2 jugadores')}</p>
            <p className="text-xs text-white/50">{t('entre.j.modo.2jDesc', 'En el mismo dispositivo')}</p>
          </button>
        </div>
      </div>
    )
  }

  const nombreFicha = (f: FichaC4) => (f === 'R' ? t('entre.j.cuatroenlinea.rojas', 'Rojas') : t('entre.j.cuatroenlinea.amarillas', 'Amarillas'))

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
                : t('entre.j.cuatroenlinea.gana', `¡Ganan las ${nombreFicha(ganador).toLowerCase()}!`, { color: nombreFicha(ganador) })}
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

      <div className="mx-auto grid max-w-[360px] select-none grid-cols-7 gap-1 rounded-xl bg-blue-950/70 p-2">
        {tablero.map((ficha, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (ganador || (modo === 'ia' && turno === 'A')) return
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
