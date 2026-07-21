import { useEffect, useRef, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'

type Dir = 'izq' | 'der' | 'arr' | 'aba'

const FONDOS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
}

function lineasPara(dir: Dir): number[][] {
  const lineas: number[][] = []
  for (let i = 0; i < 4; i++) {
    const linea: number[] = []
    for (let j = 0; j < 4; j++) {
      if (dir === 'izq') linea.push(i * 4 + j)
      else if (dir === 'der') linea.push(i * 4 + (3 - j))
      else if (dir === 'arr') linea.push(j * 4 + i)
      else linea.push((3 - j) * 4 + i)
    }
    lineas.push(linea)
  }
  return lineas
}

function agregarFicha(celdas: number[]): number[] {
  const vacias = celdas.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)
  if (!vacias.length) return celdas
  const nuevo = [...celdas]
  nuevo[vacias[Math.floor(Math.random() * vacias.length)]] = Math.random() < 0.9 ? 2 : 4
  return nuevo
}

function tableroInicial(): number[] {
  return agregarFicha(agregarFicha(new Array<number>(16).fill(0)))
}

function hayMovimientos(celdas: number[]): boolean {
  if (celdas.includes(0)) return true
  for (let f = 0; f < 4; f++)
    for (let c = 0; c < 4; c++) {
      const v = celdas[f * 4 + c]
      if (c < 3 && celdas[f * 4 + c + 1] === v) return true
      if (f < 3 && celdas[(f + 1) * 4 + c] === v) return true
    }
  return false
}

export function Juego2048() {
  const t = useT()
  const [celdas, setCeldas] = useState<number[]>(tableroInicial)
  const [puntos, setPuntos] = useState(0)
  const [record, setRecord] = useState(() => leerNumero('2048-record', 0))
  const [fin, setFin] = useState(false)
  const [logrado, setLogrado] = useState(false)
  const toque = useRef<{ x: number; y: number } | null>(null)

  const mover = (dir: Dir) => {
    if (fin) return
    let cambio = false
    let ganancia = 0
    const nuevo = [...celdas]
    for (const linea of lineasPara(dir)) {
      const valores = linea.map((i) => nuevo[i]).filter((v) => v !== 0)
      const fusionada: number[] = []
      for (let k = 0; k < valores.length; k++) {
        if (k + 1 < valores.length && valores[k] === valores[k + 1]) {
          fusionada.push(valores[k] * 2)
          ganancia += valores[k] * 2
          k++
        } else fusionada.push(valores[k])
      }
      linea.forEach((idx, pos) => {
        const v = fusionada[pos] ?? 0
        if (nuevo[idx] !== v) cambio = true
        nuevo[idx] = v
      })
    }
    if (!cambio) return
    const conFicha = agregarFicha(nuevo)
    setCeldas(conFicha)
    const total = puntos + ganancia
    setPuntos(total)
    if (total > record) setRecord(guardarRecord('2048-record', total))
    if (!logrado && conFicha.includes(2048)) setLogrado(true)
    if (!hayMovimientos(conFicha)) setFin(true)
  }

  const reiniciar = () => {
    setCeldas(tableroInicial())
    setPuntos(0)
    setFin(false)
    setLogrado(false)
  }

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const dir: Dir | null =
        e.key === 'ArrowLeft' ? 'izq' : e.key === 'ArrowRight' ? 'der' : e.key === 'ArrowUp' ? 'arr' : e.key === 'ArrowDown' ? 'aba' : null
      if (dir) {
        e.preventDefault()
        mover(dir)
      }
    }
    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  })

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[360px] items-center gap-2">
        <div className="flex-1 rounded-xl bg-white/5 p-2 text-center">
          <p className="text-[10px] text-white/45">{t('entre.j.puntos', 'Puntos')}</p>
          <p className="text-lg font-black">{puntos}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/5 p-2 text-center">
          <p className="text-[10px] text-white/45">{t('entre.j.mejor', 'Mejor')}</p>
          <p className="text-lg font-black">{record}</p>
        </div>
        <button
          type="button"
          onClick={reiniciar}
          className="rounded-xl px-3 py-3 text-sm font-bold text-black"
          style={{ background: COLOR }}
        >
          {t('entre.j.nueva', 'Nueva partida')}
        </button>
      </div>

      {logrado && (
        <p className="text-center text-sm font-semibold" style={{ color: COLOR }}>
          {t('entre.j.2048.logro', '¡Llegaste a 2048! Puedes seguir.')}
        </p>
      )}

      <div
        className="relative mx-auto max-w-[360px] rounded-xl bg-white/10 p-2"
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
          mover(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : dy > 0 ? 'aba' : 'arr')
        }}
      >
        <div className="grid grid-cols-4 gap-2">
          {celdas.map((v, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-lg font-black"
              style={{
                background: v ? (FONDOS[v] ?? '#3c3a32') : 'rgba(255,255,255,0.07)',
                color: v <= 4 ? '#776e65' : '#f9f6f2',
                fontSize: v >= 1024 ? 18 : v >= 128 ? 22 : 26,
              }}
            >
              {v || ''}
            </div>
          ))}
        </div>
        {fin && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/75">
            <p className="text-lg font-black">{t('entre.j.2048.fin', 'Sin movimientos. ¿Otra?')}</p>
            <button
              type="button"
              onClick={reiniciar}
              className="rounded-xl px-4 py-2 font-bold text-black"
              style={{ background: COLOR }}
            >
              {t('entre.j.nueva', 'Nueva partida')}
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto grid w-44 grid-cols-3 gap-1 text-lg">
        <span />
        <button type="button" onClick={() => mover('arr')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          ↑
        </button>
        <span />
        <button type="button" onClick={() => mover('izq')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          ←
        </button>
        <button type="button" onClick={() => mover('aba')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          ↓
        </button>
        <button type="button" onClick={() => mover('der')} className="rounded-lg bg-white/10 py-1.5 hover:bg-white/20">
          →
        </button>
      </div>
    </div>
  )
}
