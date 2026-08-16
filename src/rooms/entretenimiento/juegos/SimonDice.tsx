import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { claveDificultad, type Dificultad, type PropsDificultad } from './dificultad'

type Fase = 'inicio' | 'muestra' | 'turno' | 'fin'

const COLORES = ['#22c55e', '#ef4444', '#eab308', '#3b82f6']

// Ritmo de la demostración: milisegundos por color, cuánto recorta cada ronda y su tope
const RITMO: Record<Dificultad, { inicial: number; recorte: number; minimo: number }> = {
  facil: { inicial: 820, recorte: 20, minimo: 420 },
  medio: { inicial: 620, recorte: 25, minimo: 260 },
  dificil: { inicial: 460, recorte: 30, minimo: 165 },
}

const alAzar = () => Math.floor(Math.random() * 4)

export function SimonDice({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const ritmo = RITMO[dificultad]
  const clave = claveDificultad('simon-record', dificultad)
  const [secuencia, setSecuencia] = useState<number[]>([])
  const [fase, setFase] = useState<Fase>('inicio')
  const [paso, setPaso] = useState(0)
  const [iluminado, setIluminado] = useState<number | null>(null)
  const [record, setRecord] = useState(() => leerNumero(clave, 0))

  const empezar = () => {
    setSecuencia([alAzar()])
    setPaso(0)
    setFase('muestra')
  }

  // Reproduce la secuencia: dos ticks por color (encender/apagar), acelerando con la longitud
  useEffect(() => {
    if (fase !== 'muestra') return
    const vel = Math.max(ritmo.minimo, ritmo.inicial - secuencia.length * ritmo.recorte)
    let i = 0
    let id: ReturnType<typeof setInterval>
    const arranque = setTimeout(() => {
      id = setInterval(() => {
        if (i % 2 === 0) {
          const idx = i / 2
          if (idx >= secuencia.length) {
            clearInterval(id)
            setIluminado(null)
            setFase('turno')
            return
          }
          setIluminado(secuencia[idx])
        } else setIluminado(null)
        i++
      }, vel / 2)
    }, 450)
    return () => {
      clearTimeout(arranque)
      clearInterval(id)
    }
  }, [fase, secuencia, ritmo])

  const pulsar = (n: number) => {
    if (fase !== 'turno') return
    setIluminado(n)
    setTimeout(() => setIluminado(null), 200)
    if (n !== secuencia[paso]) {
      setFase('fin')
      setRecord(guardarRecord(clave, secuencia.length - 1))
      return
    }
    if (paso + 1 < secuencia.length) {
      setPaso(paso + 1)
      return
    }
    setSecuencia([...secuencia, alAzar()])
    setPaso(0)
    setFase('muestra')
  }

  return (
    <div className="mx-auto max-w-[300px] space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t('entre.j.simon.ronda', 'Ronda')}: {secuencia.length}
          <span className="ms-2 text-white/45">
            {t('entre.j.mejor', 'Mejor')}: {record}
          </span>
        </span>
        <span className="text-xs text-white/55">
          {fase === 'muestra' && t('entre.j.simon.observa', 'Observa…')}
          {fase === 'turno' && t('entre.j.simon.tuTurno', '¡Tu turno!')}
        </span>
      </div>

      <div className="relative">
        <div className="grid grid-cols-2 gap-2">
          {COLORES.map((color, n) => (
            <button
              key={n}
              type="button"
              onClick={() => pulsar(n)}
              className={`aspect-square rounded-2xl transition-opacity duration-100 ${iluminado === n ? 'opacity-100 ring-4 ring-white/80' : 'opacity-40'}`}
              style={{ background: color }}
            />
          ))}
        </div>
        {fase !== 'muestra' && fase !== 'turno' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/75 ui-noche">
            {fase === 'fin' && (
              <p className="text-center font-black">
                {t('entre.j.simon.fallaste', 'Fallaste en la ronda {n}', { n: secuencia.length })}
              </p>
            )}
            <button type="button" onClick={empezar} className="rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
              {fase === 'inicio' ? t('entre.j.jugar', 'Jugar') : t('entre.j.nueva', 'Nueva partida')}
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/35">{t('entre.j.simon.regla', 'Repite la secuencia de colores: cada ronda suma uno más.')}</p>
    </div>
  )
}
