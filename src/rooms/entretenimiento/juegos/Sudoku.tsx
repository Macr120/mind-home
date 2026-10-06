import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { vivo } from '../../../core/ui/estilos'
import { COLOR } from '../constantes'
import { formatearTiempo, guardarRecord, leerNumero } from './almacen'
import { registrarApariencia, useApariencia, type ColorJuego } from './apariencia'
import { barajar } from './cartas'
import type { Dificultad, PropsDificultad } from './dificultad'

// En «Clásico» el tablero sigue al tema (transparente, tinta y color del cuarto);
// con cualquier otro estilo o color propio pasa a esta paleta fija. Los de
// fábrica son su equivalente en el tema oscuro.
const APARIENCIA: ColorJuego[] = [
  { clave: 'celdas', labelEs: 'Celdas', papel: 'fondo', porDefecto: '#14161b' },
  { clave: 'bloques', labelEs: 'Líneas de bloque', papel: 'oscuro', porDefecto: '#5f6166' },
  { clave: 'fijas', labelEs: 'Números fijos', papel: 'claro', porDefecto: '#e5e7eb' },
  { clave: 'tuyos', labelEs: 'Tus números', papel: 'acento', porDefecto: '#34d399' },
  { clave: 'seleccion', labelEs: 'Selección', papel: 'uno', porDefecto: '#34d399' },
]
registrarApariencia('sudoku', APARIENCIA)

/** Luminancia aproximada (0 = negro, 1 = blanco) de un `#rrggbb`. */
function luz(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** El color tal cual o, si se pierde sobre el fondo, empujado hacia negro o blanco. */
function legible(color: string, fondo: string): string {
  if (Math.abs(luz(color) - luz(fondo)) >= 0.4) return color
  return `color-mix(in srgb, ${color} 40%, ${luz(fondo) > 0.5 ? '#000' : '#fff'})`
}

const PISTAS: Record<Dificultad, number> = { facil: 40, medio: 32, dificil: 26 }
const DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function esValido(t: number[], idx: number, n: number): boolean {
  const f = Math.floor(idx / 9)
  const c = idx % 9
  for (let i = 0; i < 9; i++) {
    if (t[f * 9 + i] === n || t[i * 9 + c] === n) return false
  }
  const f0 = f - (f % 3)
  const c0 = c - (c % 3)
  for (let df = 0; df < 3; df++)
    for (let dc = 0; dc < 3; dc++) if (t[(f0 + df) * 9 + (c0 + dc)] === n) return false
  return true
}

function rellenar(t: number[], idx = 0): boolean {
  if (idx === 81) return true
  if (t[idx] !== 0) return rellenar(t, idx + 1)
  for (const n of barajar(DIGITOS)) {
    if (esValido(t, idx, n)) {
      t[idx] = n
      if (rellenar(t, idx + 1)) return true
      t[idx] = 0
    }
  }
  return false
}

interface Partida {
  solucion: number[]
  inicial: number[]
}

function generarPartida(dif: Dificultad): Partida {
  const solucion = new Array<number>(81).fill(0)
  rellenar(solucion)
  const inicial = [...solucion]
  const huecos = 81 - PISTAS[dif]
  const orden = barajar([...Array(81).keys()])
  for (let i = 0; i < huecos; i++) inicial[orden[i]] = 0
  return { solucion, inicial }
}

function compartenUnidad(a: number, b: number): boolean {
  const fa = Math.floor(a / 9), ca = a % 9
  const fb = Math.floor(b / 9), cb = b % 9
  return (
    fa === fb ||
    ca === cb ||
    (Math.floor(fa / 3) === Math.floor(fb / 3) && Math.floor(ca / 3) === Math.floor(cb / 3))
  )
}

export function Sudoku({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const col = useApariencia('sudoku')
  const clasico = APARIENCIA.every((c) => col[c.clave] === c.porDefecto)
  const [partida, setPartida] = useState<Partida>(() => generarPartida(dificultad))
  const [tablero, setTablero] = useState<number[]>(() => [...partida.inicial])
  const [notas, setNotas] = useState<number[][]>(() => Array.from({ length: 81 }, () => []))
  const [sel, setSel] = useState<number | null>(null)
  const [lapiz, setLapiz] = useState(false)
  const [errores, setErrores] = useState(0)
  const [segundos, setSegundos] = useState(0)
  const [ganado, setGanado] = useState(false)
  const [record, setRecord] = useState(() => leerNumero(`sudoku-${dificultad}`, 0))

  useEffect(() => {
    if (ganado) return
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [ganado])

  const reiniciar = () => {
    const p = generarPartida(dificultad)
    setPartida(p)
    setTablero([...p.inicial])
    setNotas(Array.from({ length: 81 }, () => []))
    setSel(null)
    setErrores(0)
    setSegundos(0)
    setGanado(false)
  }

  const colocar = (n: number) => {
    if (ganado || sel === null || partida.inicial[sel] !== 0) return
    if (lapiz) {
      if (tablero[sel] !== 0) return
      setNotas((prev) =>
        prev.map((lista, i) =>
          i === sel ? (lista.includes(n) ? lista.filter((x) => x !== n) : [...lista, n].sort()) : lista,
        ),
      )
      return
    }
    if (tablero[sel] === n) return
    const nuevo = [...tablero]
    nuevo[sel] = n
    setTablero(nuevo)
    if (n !== partida.solucion[sel]) {
      setErrores((e) => e + 1)
      return
    }
    const celdaSel = sel
    setNotas((prev) => prev.map((lista, i) => (compartenUnidad(i, celdaSel) ? lista.filter((x) => x !== n) : lista)))
    if (nuevo.every((v, i) => v === partida.solucion[i])) {
      setGanado(true)
      setRecord(guardarRecord(`sudoku-${dificultad}`, segundos, true))
    }
  }

  const borrar = () => {
    if (ganado || sel === null || partida.inicial[sel] !== 0) return
    setTablero((prev) => prev.map((v, i) => (i === sel ? 0 : v)))
    setNotas((prev) => prev.map((lista, i) => (i === sel ? [] : lista)))
  }

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key >= '1' && e.key <= '9') colocar(Number(e.key))
      else if (e.key === 'Backspace' || e.key === 'Delete') borrar()
      else if (sel !== null && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const delta = e.key === 'ArrowUp' ? -9 : e.key === 'ArrowDown' ? 9 : e.key === 'ArrowLeft' ? -1 : 1
        const destino = sel + delta
        if (destino >= 0 && destino < 81) setSel(destino)
      }
    }
    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  })

  const selFila = sel !== null ? Math.floor(sel / 9) : -1
  const selCol = sel !== null ? sel % 9 : -1
  const valorSel = sel !== null ? tablero[sel] : 0
  // Base de las celdas, tinta de los resaltes y color de la selección.
  const base = clasico ? 'transparent' : col.celdas
  const tinta = clasico ? 'var(--ui-ink)' : luz(col.celdas) > 0.5 ? '#000' : '#fff'
  const marca = clasico ? COLOR : col.seleccion
  const fijas = clasico ? 'var(--ui-ink)' : legible(col.fijas, col.celdas)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-3 text-xs text-white/55">
          <span><Icono nombre="cronometro" /> {formatearTiempo(segundos)}</span>
          <span><Icono nombre="cerrar" /> {errores}</span>
          <span>
            {t('entre.j.mejor', 'Mejor')}: {record > 0 ? formatearTiempo(record) : '—'}
          </span>
        </div>
      </div>

      <div
        className={`mx-auto grid max-w-[400px] select-none grid-cols-9 overflow-hidden rounded-xl border-2 bg-black/30 shadow-lg ${
          clasico ? 'border-white/40' : ''
        }`}
        style={clasico ? undefined : { borderColor: col.bloques }}
      >
        {tablero.map((v, i) => {
          const f = Math.floor(i / 9)
          const c = i % 9
          const esInicial = partida.inicial[i] !== 0
          const enUnidad =
            sel !== null &&
            (f === selFila ||
              c === selCol ||
              (Math.floor(f / 3) === Math.floor(selFila / 3) && Math.floor(c / 3) === Math.floor(selCol / 3)))
          const mismoNumero = v !== 0 && v === valorSel && i !== sel
          const incorrecto = v !== 0 && !esInicial && v !== partida.solucion[i]
          // Los resaltes se mezclan con la tinta del tema (en claro, un blanco
          // literal sobre papel blanco no se vería).
          let fondo = base
          if (i === sel) fondo = `color-mix(in srgb, ${marca} 25%, ${base})`
          else if (mismoNumero) fondo = `color-mix(in srgb, ${tinta} 18%, ${base})`
          else if (enUnidad) fondo = `color-mix(in srgb, ${tinta} 7%, ${base})`
          const gruesaE = c % 3 === 2
          const gruesaB = f % 3 === 2
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSel(i)}
              className={`relative aspect-square text-base font-semibold sm:text-lg ${
                c < 8 ? (gruesaE ? 'border-e-2' : 'border-e') + (clasico ? (gruesaE ? ' border-e-white/35' : ' border-e-white/10') : '') : ''
              } ${f < 8 ? (gruesaB ? 'border-b-2' : 'border-b') + (clasico ? (gruesaB ? ' border-b-white/35' : ' border-b-white/10') : '') : ''} ${
                incorrecto ? 'text-red-400' : esInicial || !clasico ? '' : 'texto-vivo'
              }`}
              style={{
                background: fondo,
                ...(clasico
                  ? {}
                  : {
                      borderInlineEndColor: gruesaE ? col.bloques : `color-mix(in srgb, ${col.bloques} 35%, transparent)`,
                      borderBottomColor: gruesaB ? col.bloques : `color-mix(in srgb, ${col.bloques} 35%, transparent)`,
                    }),
                ...(esInicial
                  ? { color: fijas }
                  : incorrecto
                    ? {}
                    : clasico
                      ? vivo(COLOR)
                      : { color: legible(col.tuyos, col.celdas) }),
              }}
            >
              {v !== 0 ? (
                v
              ) : notas[i].length > 0 ? (
                <span
                  className={`absolute inset-0 grid grid-cols-3 text-[7px] leading-none ${clasico ? 'text-white/50' : ''}`}
                  style={clasico ? undefined : { color: `color-mix(in srgb, ${fijas} 55%, transparent)` }}
                >
                  {DIGITOS.map((d) => (
                    <span key={d} className="flex items-center justify-center">
                      {notas[i].includes(d) ? d : ''}
                    </span>
                  ))}
                </span>
              ) : (
                ''
              )}
            </button>
          )
        })}
      </div>

      <div className="mx-auto grid max-w-[400px] grid-cols-9 gap-1">
        {DIGITOS.map((n) => {
          const usados = tablero.filter((v) => v === n).length
          return (
            <button
              key={n}
              type="button"
              onClick={() => colocar(n)}
              disabled={usados >= 9}
              className="rounded-lg bg-white/10 py-1.5 text-lg font-bold hover:bg-white/20 disabled:opacity-25"
            >
              {n}
              <span className="block text-[9px] font-normal text-white/40">{9 - usados}</span>
            </button>
          )
        })}
      </div>

      <div className="mx-auto flex max-w-[400px] gap-2">
        <button
          type="button"
          onClick={() => setLapiz((v) => !v)}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${lapiz ? 'text-black' : 'bg-white/10'}`}
          style={lapiz ? { background: COLOR } : undefined}
        >
          <Icono nombre="editar" /> {t('entre.j.sudoku.notas', 'Lápiz')}
        </button>
        <button type="button" onClick={borrar} className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold">
          ⌫ {t('entre.j.sudoku.borrar', 'Borrar')}
        </button>
        <button
          type="button"
          onClick={reiniciar}
          className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold"
        >
          <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
        </button>
      </div>

      {ganado && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center">
          <p className="text-lg font-black">{t('entre.j.ganaste', '¡Ganaste! 🎉')}</p>
          <p className="mt-1 text-sm text-white/60">
            ⏱ {formatearTiempo(segundos)} · {t('entre.j.mejor', 'Mejor')}: {formatearTiempo(record)}
          </p>
        </div>
      )}
    </div>
  )
}
