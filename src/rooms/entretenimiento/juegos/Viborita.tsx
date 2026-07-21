import { useEffect, useRef, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'

type Dir = 'izq' | 'der' | 'arr' | 'aba'
type Fase = 'lista' | 'jugando' | 'pausa' | 'fin'

const LADO = 20

interface Partida {
  serpiente: number[] // índices de celda, la cabeza primero
  manzana: number
  dir: Dir
  cola: Dir | null // giro encolado: máximo uno por tick, evita el 180° doble
  puntos: number
  viva: boolean
}

const OPUESTAS: Record<Dir, Dir> = { izq: 'der', der: 'izq', arr: 'aba', aba: 'arr' }
const DELTAS: Record<Dir, [number, number]> = { izq: [0, -1], der: [0, 1], arr: [-1, 0], aba: [1, 0] }

function manzanaLibre(serpiente: number[]): number {
  const ocupadas = new Set(serpiente)
  const libres: number[] = []
  for (let i = 0; i < LADO * LADO; i++) if (!ocupadas.has(i)) libres.push(i)
  return libres[Math.floor(Math.random() * libres.length)] ?? -1
}

function partidaInicial(): Partida {
  const centro = Math.floor(LADO / 2) * LADO + Math.floor(LADO / 2)
  const serpiente = [centro, centro - 1, centro - 2]
  return { serpiente, manzana: manzanaLibre(serpiente), dir: 'der', cola: null, puntos: 0, viva: true }
}

function avanzar(p: Partida): Partida {
  const dir = p.cola ?? p.dir
  const [df, dc] = DELTAS[dir]
  const f = Math.floor(p.serpiente[0] / LADO) + df
  const c = (p.serpiente[0] % LADO) + dc
  if (f < 0 || f >= LADO || c < 0 || c >= LADO) return { ...p, dir, cola: null, viva: false }
  const cabeza = f * LADO + c
  if (cabeza === p.manzana) {
    const serpiente = [cabeza, ...p.serpiente]
    const manzana = manzanaLibre(serpiente)
    // Sin celdas libres: la viborita llenó el tablero (victoria, manzana = -1)
    return { serpiente, manzana, dir, cola: null, puntos: p.puntos + 1, viva: manzana >= 0 }
  }
  const cuerpo = p.serpiente.slice(0, -1)
  if (cuerpo.includes(cabeza)) return { ...p, dir, cola: null, viva: false }
  return { ...p, serpiente: [cabeza, ...cuerpo], dir, cola: null }
}

export function Viborita() {
  const t = useT()
  const [p, setP] = useState<Partida>(partidaInicial)
  const [fase, setFase] = useState<Fase>('lista')
  const [record, setRecord] = useState(() => leerNumero('viborita-record', 0))
  const toque = useRef<{ x: number; y: number } | null>(null)

  const velocidad = Math.max(70, 130 - Math.floor(p.puntos / 5) * 10)

  // Un timeout por tick: el efecto se reprograma con cada avance y siempre ve estado fresco
  useEffect(() => {
    if (fase !== 'jugando') return
    const id = setTimeout(() => {
      const sig = avanzar(p)
      setP(sig)
      if (!sig.viva) {
        setFase('fin')
        setRecord(guardarRecord('viborita-record', sig.puntos))
      }
    }, velocidad)
    return () => clearTimeout(id)
  }, [p, fase, velocidad])

  // En segundo plano los timers se estrangulan: mejor pausar la partida
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') setFase((f) => (f === 'jugando' ? 'pausa' : f))
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => document.removeEventListener('visibilitychange', alOcultar)
  }, [])

  const girar = (d: Dir) => {
    setP((prev) => {
      const efectiva = prev.cola ?? prev.dir
      if (d === efectiva || d === OPUESTAS[efectiva]) return prev
      return { ...prev, cola: d }
    })
  }

  const empezar = () => {
    setP(partidaInicial())
    setFase('jugando')
  }

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const k = e.key.toLowerCase()
      const dir: Dir | null =
        k === 'arrowleft' || k === 'a' ? 'izq' : k === 'arrowright' || k === 'd' ? 'der' : k === 'arrowup' || k === 'w' ? 'arr' : k === 'arrowdown' || k === 's' ? 'aba' : null
      if (dir) {
        e.preventDefault()
        girar(dir)
      }
    }
    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  })

  const cuerpo = new Set(p.serpiente)
  const cabeza = p.serpiente[0]

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[360px] items-center gap-2">
        <div className="flex-1 rounded-xl bg-white/5 p-2 text-center">
          <p className="text-[10px] text-white/45">{t('entre.j.puntos', 'Puntos')}</p>
          <p className="text-lg font-black">{p.puntos}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/5 p-2 text-center">
          <p className="text-[10px] text-white/45">{t('entre.j.mejor', 'Mejor')}</p>
          <p className="text-lg font-black">{record}</p>
        </div>
        {fase === 'jugando' || fase === 'pausa' ? (
          <button
            type="button"
            onClick={() => setFase(fase === 'pausa' ? 'jugando' : 'pausa')}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20"
          >
            {fase === 'pausa' ? '▶' : '⏸'}
          </button>
        ) : (
          <button type="button" onClick={empezar} className="rounded-xl px-3 py-3 text-sm font-bold text-black" style={{ background: COLOR }}>
            {t('entre.j.nueva', 'Nueva partida')}
          </button>
        )}
      </div>

      <div
        className="relative mx-auto max-w-[360px] overflow-hidden rounded-xl bg-white/5 p-1"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => {
          toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchEnd={(e) => {
          if (!toque.current) return
          const dx = e.changedTouches[0].clientX - toque.current.x
          const dy = e.changedTouches[0].clientY - toque.current.y
          toque.current = null
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
          girar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : dy > 0 ? 'aba' : 'arr')
        }}
      >
        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${LADO}, minmax(0, 1fr))` }}>
          {Array.from({ length: LADO * LADO }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-[2px]"
              style={{
                background:
                  i === cabeza ? '#a7f3d0' : cuerpo.has(i) ? COLOR : i === p.manzana ? '#ef4444' : 'rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
        {fase !== 'jugando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70">
            {fase === 'fin' && (
              <p className="text-lg font-black">
                {p.manzana < 0 ? t('entre.j.ganaste', '¡Ganaste! 🎉') : t('entre.j.viborita.fin', '¡Ay! La viborita chocó.')}
              </p>
            )}
            {fase === 'pausa' && <p className="text-lg font-black">{t('entre.j.pausa', 'Pausa')}</p>}
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

      <div className="mx-auto grid w-44 grid-cols-3 gap-1 text-lg">
        <span />
        <button type="button" onClick={() => girar('arr')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          ↑
        </button>
        <span />
        <button type="button" onClick={() => girar('izq')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          ←
        </button>
        <button type="button" onClick={() => girar('aba')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          ↓
        </button>
        <button type="button" onClick={() => girar('der')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          →
        </button>
      </div>
    </div>
  )
}
