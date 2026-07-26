import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { barajar } from './cartas'
import { claveDificultad, type Dificultad, type PropsDificultad } from './dificultad'

type Tipo = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type Fase = 'lista' | 'jugando' | 'pausa' | 'fin'

// Caída: milisegundos del nivel 1 y tope al que se acelera cada 10 líneas
const RITMO: Record<Dificultad, { inicial: number; minimo: number }> = {
  facil: { inicial: 880, minimo: 190 },
  medio: { inicial: 700, minimo: 110 },
  dificil: { inicial: 500, minimo: 65 },
}

const COLS = 10
const FILAS = 20
const TIPOS: Tipo[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const PUNTOS_LINEAS = [0, 100, 300, 500, 800]

const FORMAS: Record<Tipo, { m: number[][]; color: string }> = {
  I: { m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#22d3ee' },
  O: { m: [[1, 1], [1, 1]], color: '#facc15' },
  T: { m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#a78bfa' },
  S: { m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#4ade80' },
  Z: { m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#f87171' },
  J: { m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#60a5fa' },
  L: { m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#fb923c' },
}

interface Pieza {
  m: number[][]
  color: string
  x: number
  y: number
}

interface Partida {
  fijas: (string | null)[]
  pieza: Pieza
  siguiente: Tipo
  bolsa: Tipo[]
  puntos: number
  lineas: number
  viva: boolean
}

function rotada(m: number[][]): number[][] {
  const n = m.length
  return m.map((fila, f) => fila.map((_, c) => m[n - 1 - c][f]))
}

function colisiona(fijas: (string | null)[], m: number[][], x: number, y: number): boolean {
  for (let f = 0; f < m.length; f++)
    for (let c = 0; c < m[f].length; c++) {
      if (!m[f][c]) continue
      const cx = x + c
      const cy = y + f
      if (cx < 0 || cx >= COLS || cy >= FILAS) return true
      if (cy >= 0 && fijas[cy * COLS + cx]) return true
    }
  return false
}

function nuevaPieza(tipo: Tipo): Pieza {
  const { m, color } = FORMAS[tipo]
  return { m, color, x: Math.floor((COLS - m[0].length) / 2), y: 0 }
}

function sacar(bolsa: Tipo[]): { tipo: Tipo; resto: Tipo[] } {
  const fuente = bolsa.length ? bolsa : barajar(TIPOS)
  return { tipo: fuente[0], resto: fuente.slice(1) }
}

function partidaInicial(): Partida {
  const b1 = sacar(barajar(TIPOS))
  const b2 = sacar(b1.resto)
  return {
    fijas: new Array<string | null>(COLS * FILAS).fill(null),
    pieza: nuevaPieza(b1.tipo),
    siguiente: b2.tipo,
    bolsa: b2.resto,
    puntos: 0,
    lineas: 0,
    viva: true,
  }
}

const nivelDe = (lineas: number) => Math.floor(lineas / 10)

// Suelda la pieza, limpia líneas completas y saca la siguiente de la bolsa
function fijarYSeguir(p: Partida): Partida {
  const fijas = [...p.fijas]
  p.pieza.m.forEach((fila, f) =>
    fila.forEach((v, c) => {
      if (v && p.pieza.y + f >= 0) fijas[(p.pieza.y + f) * COLS + p.pieza.x + c] = p.pieza.color
    }),
  )
  const restantes: (string | null)[][] = []
  for (let f = 0; f < FILAS; f++) {
    const fila = fijas.slice(f * COLS, (f + 1) * COLS)
    if (!fila.every((v) => v)) restantes.push(fila)
  }
  const limpiadas = FILAS - restantes.length
  while (restantes.length < FILAS) restantes.unshift(new Array<string | null>(COLS).fill(null))
  const lineas = p.lineas + limpiadas
  const puntos = p.puntos + PUNTOS_LINEAS[limpiadas] * (nivelDe(p.lineas) + 1)
  const { tipo, resto } = sacar(p.bolsa)
  const pieza = nuevaPieza(p.siguiente)
  return {
    fijas: restantes.flat(),
    pieza,
    siguiente: tipo,
    bolsa: resto,
    puntos,
    lineas,
    viva: !colisiona(restantes.flat(), pieza.m, pieza.x, pieza.y),
  }
}

function bajar(p: Partida): Partida {
  if (!colisiona(p.fijas, p.pieza.m, p.pieza.x, p.pieza.y + 1)) return { ...p, pieza: { ...p.pieza, y: p.pieza.y + 1 } }
  return fijarYSeguir(p)
}

function caer(p: Partida): Partida {
  let y = p.pieza.y
  while (!colisiona(p.fijas, p.pieza.m, p.pieza.x, y + 1)) y++
  return fijarYSeguir({ ...p, pieza: { ...p.pieza, y } })
}

function moverX(p: Partida, d: number): Partida {
  if (colisiona(p.fijas, p.pieza.m, p.pieza.x + d, p.pieza.y)) return p
  return { ...p, pieza: { ...p.pieza, x: p.pieza.x + d } }
}

function girar(p: Partida): Partida {
  const m = rotada(p.pieza.m)
  // Wall-kick simple: se intenta en el sitio y desplazando una columna
  for (const dx of [0, -1, 1]) {
    if (!colisiona(p.fijas, m, p.pieza.x + dx, p.pieza.y)) return { ...p, pieza: { ...p.pieza, m, x: p.pieza.x + dx } }
  }
  return p
}

export function Tetris({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const clave = claveDificultad('tetris-record', dificultad)
  const [p, setP] = useState<Partida>(partidaInicial)
  const [fase, setFase] = useState<Fase>('lista')
  const [record, setRecord] = useState(() => leerNumero(clave, 0))

  const nivel = nivelDe(p.lineas)
  const ritmo = RITMO[dificultad]
  const velocidad = Math.max(ritmo.minimo, ritmo.inicial - 60 * nivel)

  const aplicar = (sig: Partida) => {
    setP(sig)
    if (!sig.viva) {
      setFase('fin')
      setRecord(guardarRecord(clave, sig.puntos))
    }
  }

  const accion = (fn: (x: Partida) => Partida) => {
    if (fase !== 'jugando') return
    aplicar(fn(p))
  }

  useEffect(() => {
    if (fase !== 'jugando') return
    const id = setTimeout(() => aplicar(bajar(p)), velocidad)
    return () => clearTimeout(id)
  }, [p, fase, velocidad])

  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') setFase((f) => (f === 'jugando' ? 'pausa' : f))
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => document.removeEventListener('visibilitychange', alOcultar)
  }, [])

  const empezar = () => {
    setP(partidaInicial())
    setFase('jugando')
  }

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const acciones: Record<string, (x: Partida) => Partida> = {
        arrowleft: (x) => moverX(x, -1),
        arrowright: (x) => moverX(x, 1),
        arrowup: girar,
        arrowdown: bajar,
        ' ': caer,
      }
      const fn = acciones[e.key.toLowerCase()]
      if (fn) {
        e.preventDefault()
        accion(fn)
      }
    }
    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  })

  // Celdas de la pieza activa proyectadas sobre el tablero
  const activas = new Map<number, string>()
  if (fase !== 'lista') {
    p.pieza.m.forEach((fila, f) =>
      fila.forEach((v, c) => {
        if (v && p.pieza.y + f >= 0) activas.set((p.pieza.y + f) * COLS + p.pieza.x + c, p.pieza.color)
      }),
    )
  }
  const formaSig = FORMAS[p.siguiente]

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[380px] items-start justify-center gap-3">
        <div className="relative shrink-0" style={{ width: 'min(240px, 56vw)' }}>
          <div className="grid grid-cols-10 gap-px rounded-lg bg-white/5 p-1">
            {p.fijas.map((color, i) => (
              <div
                key={i}
                className="aspect-square rounded-[2px]"
                style={{ background: activas.get(i) ?? color ?? 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
          {fase !== 'jugando' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70 ui-noche px-2 text-center">
              {fase === 'fin' && <p className="font-black">{t('entre.j.tetris.fin', 'Tablero lleno. ¡Buena partida!')}</p>}
              {fase === 'pausa' && <p className="font-black">{t('entre.j.pausa', 'Pausa')}</p>}
              <button
                type="button"
                onClick={fase === 'pausa' ? () => setFase('jugando') : empezar}
                className="rounded-xl px-4 py-2 font-bold text-black"
                style={{ background: COLOR }}
              >
                {fase === 'pausa' ? t('entre.j.seguir', 'Seguir') : fase === 'fin' ? t('entre.j.nueva', 'Nueva partida') : t('entre.j.jugar', 'Jugar')}
              </button>
            </div>
          )}
        </div>

        <div className="w-24 shrink-0 space-y-2 text-center text-sm">
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-white/45">{t('entre.j.tetris.siguiente', 'Siguiente')}</p>
            <div className="mx-auto mt-1 grid w-14 grid-cols-4 gap-px">
              {Array.from({ length: 16 }, (_, i) => {
                const f = Math.floor(i / 4)
                const c = i % 4
                const lleno = fase !== 'lista' && !!formaSig.m[f]?.[c]
                return <div key={i} className="aspect-square rounded-[2px]" style={{ background: lleno ? formaSig.color : 'transparent' }} />
              })}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-white/45">{t('entre.j.puntos', 'Puntos')}</p>
            <p className="font-black">{p.puntos}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-white/45">{t('entre.j.tetris.lineas', 'Líneas')}</p>
            <p className="font-black">{p.lineas}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-white/45">{t('entre.j.tetris.nivel', 'Nivel')}</p>
            <p className="font-black">{nivel + 1}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-white/45">{t('entre.j.mejor', 'Mejor')}</p>
            <p className="font-black">{record}</p>
          </div>
          {fase === 'jugando' && (
            <button type="button" onClick={() => setFase('pausa')} className="w-full rounded-xl bg-white/10 py-1.5 font-bold hover:bg-white/20">
              ⏸
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[300px] grid-cols-5 gap-1 text-lg">
        <button type="button" onClick={() => accion((x) => moverX(x, -1))} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
          ◀
        </button>
        <button type="button" onClick={() => accion(girar)} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
          ⟳
        </button>
        <button type="button" onClick={() => accion(bajar)} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
          ▼
        </button>
        <button type="button" onClick={() => accion(caer)} className="col-span-1 rounded-lg bg-white/10 py-2 hover:bg-white/20">
          ⤓
        </button>
        <button type="button" onClick={() => accion((x) => moverX(x, 1))} className="rounded-lg bg-white/10 py-2 hover:bg-white/20">
          ▶
        </button>
      </div>
    </div>
  )
}
