import { useRef, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { barajar } from './cartas'

type Nivel = 'facil' | 'dificil'
type EstadoCarta = 'oculta' | 'vista' | 'lograda'

interface Carta {
  emoji: string
  estado: EstadoCarta
}

const NIVELES: Record<Nivel, { lado: number }> = {
  facil: { lado: 4 },
  dificil: { lado: 6 },
}

const EMOJIS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐷', '🐵', '🐰', '🦄', '🐙', '🦋', '🍎', '🍕', '🚀', '🌵', '⚽', '🎈']

function mazoInicial(nivel: Nivel): Carta[] {
  const pares = NIVELES[nivel].lado ** 2 / 2
  const elegidos = barajar(EMOJIS).slice(0, pares)
  return barajar([...elegidos, ...elegidos]).map((emoji) => ({ emoji, estado: 'oculta' as const }))
}

export function Memorama() {
  const t = useT()
  const [nivel, setNivel] = useState<Nivel>('facil')
  const [cartas, setCartas] = useState<Carta[]>(() => mazoInicial('facil'))
  const [volteadas, setVolteadas] = useState<number[]>([])
  const [intentos, setIntentos] = useState(0)
  const [ganado, setGanado] = useState(false)
  const [record, setRecord] = useState(() => leerNumero('memorama-facil', 0))
  const tapar = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reiniciar = (n: Nivel) => {
    if (tapar.current) clearTimeout(tapar.current)
    setNivel(n)
    setCartas(mazoInicial(n))
    setVolteadas([])
    setIntentos(0)
    setGanado(false)
    setRecord(leerNumero(`memorama-${n}`, 0))
  }

  const voltear = (i: number) => {
    if (ganado || cartas[i].estado !== 'oculta') return
    // Con un par fallido a la vista, el siguiente click lo tapa de inmediato
    if (volteadas.length === 2) {
      if (tapar.current) clearTimeout(tapar.current)
      setCartas((cs) => cs.map((c, k) => (volteadas.includes(k) ? { ...c, estado: 'oculta' } : k === i ? { ...c, estado: 'vista' } : c)))
      setVolteadas([i])
      return
    }
    const nuevas = cartas.map((c, k) => (k === i ? { ...c, estado: 'vista' as const } : c))
    if (volteadas.length === 0) {
      setCartas(nuevas)
      setVolteadas([i])
      return
    }
    const previa = volteadas[0]
    const total = intentos + 1
    setIntentos(total)
    if (nuevas[previa].emoji === nuevas[i].emoji) {
      const logradas = nuevas.map((c, k) => (k === previa || k === i ? { ...c, estado: 'lograda' as const } : c))
      setCartas(logradas)
      setVolteadas([])
      if (logradas.every((c) => c.estado === 'lograda')) {
        setGanado(true)
        setRecord(guardarRecord(`memorama-${nivel}`, total, true))
      }
      return
    }
    setCartas(nuevas)
    setVolteadas([previa, i])
    tapar.current = setTimeout(() => {
      setCartas((cs) => cs.map((c, k) => (k === previa || k === i ? { ...c, estado: 'oculta' } : c)))
      setVolteadas([])
    }, 700)
  }

  const { lado } = NIVELES[nivel]

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[420px] flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {t('entre.j.memorama.intentos', 'Intentos')}: {intentos}
          {record > 0 && (
            <span className="ml-2 text-white/45">
              {t('entre.j.mejor', 'Mejor')}: {record}
            </span>
          )}
        </span>
        <div className="flex gap-1.5">
          {(['facil', 'dificil'] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => reiniciar(n)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${nivel === n ? 'text-black' : 'bg-white/10 hover:bg-white/20'}`}
              style={nivel === n ? { background: COLOR } : undefined}
            >
              {n === 'facil' ? t('entre.j.dif.facil', 'Fácil') : t('entre.j.dif.dificil', 'Difícil')}
            </button>
          ))}
          <button type="button" onClick={() => reiniciar(nivel)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
            <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
          </button>
        </div>
      </div>

      <div className="relative mx-auto max-w-[420px]">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${lado}, minmax(0, 1fr))` }}>
          {cartas.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => voltear(i)}
              className={`flex aspect-square items-center justify-center rounded-lg transition ${
                c.estado === 'oculta' ? 'bg-white/10 hover:bg-white/20' : c.estado === 'vista' ? 'bg-white/25' : 'bg-emerald-500/25'
              } ${lado === 6 ? 'text-xl' : 'text-3xl'}`}
            >
              {c.estado === 'oculta' ? <span className="text-white/30">?</span> : <Icono emoji={c.emoji} />}
            </button>
          ))}
        </div>
        {ganado && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/75">
            <p className="text-lg font-black">{t('entre.j.ganaste', '¡Ganaste! 🎉')}</p>
            <p className="text-sm text-white/70">
              {t('entre.j.memorama.intentos', 'Intentos')}: {intentos} · {t('entre.j.mejor', 'Mejor')}: {record}
            </p>
            <button type="button" onClick={() => reiniciar(nivel)} className="rounded-xl px-4 py-2 font-bold text-black" style={{ background: COLOR }}>
              {t('entre.j.nueva', 'Nueva partida')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
