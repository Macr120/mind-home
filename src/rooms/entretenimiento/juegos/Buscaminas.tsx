import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { formatearTiempo, guardarRecord, leerNumero } from './almacen'
import { barajar } from './cartas'

type Nivel = 'facil' | 'medio' | 'dificil'
type Fase = 'lista' | 'jugando' | 'ganado' | 'perdido'

interface Celda {
  mina: boolean
  num: number
  revelada: boolean
  bandera: boolean
}

const NIVELES: Record<Nivel, { lado: number; minas: number }> = {
  facil: { lado: 9, minas: 10 },
  medio: { lado: 12, minas: 24 },
  dificil: { lado: 16, minas: 40 },
}

const COLORES_NUM = ['', '#60a5fa', '#4ade80', '#f87171', '#c4b5fd', '#fbbf24', '#22d3ee', '#f9fafb', '#9ca3af']

function tableroVacio(nivel: Nivel): Celda[] {
  return Array.from({ length: NIVELES[nivel].lado ** 2 }, () => ({
    mina: false,
    num: 0,
    revelada: false,
    bandera: false,
  }))
}

function vecinos(i: number, lado: number): number[] {
  const f = Math.floor(i / lado)
  const c = i % lado
  const res: number[] = []
  for (let df = -1; df <= 1; df++)
    for (let dc = -1; dc <= 1; dc++) {
      if (df === 0 && dc === 0) continue
      const f1 = f + df
      const c1 = c + dc
      if (f1 >= 0 && f1 < lado && c1 >= 0 && c1 < lado) res.push(f1 * lado + c1)
    }
  return res
}

// El primer clic nunca cae en mina: se siembran después, excluyendo esa celda y sus vecinas
function sembrarMinas(celdas: Celda[], nivel: Nivel, semilla: number): Celda[] {
  const { lado, minas } = NIVELES[nivel]
  const prohibidas = new Set([semilla, ...vecinos(semilla, lado)])
  const candidatas = celdas.map((_, i) => i).filter((i) => !prohibidas.has(i))
  const conMina = new Set(barajar(candidatas).slice(0, minas))
  return celdas.map((c, i) => ({
    ...c,
    mina: conMina.has(i),
    num: vecinos(i, lado).filter((v) => conMina.has(v)).length,
  }))
}

function revelarDesde(celdas: Celda[], inicio: number[], lado: number): { celdas: Celda[]; exploto: boolean } {
  const cs = celdas.map((c) => ({ ...c }))
  const cola = [...inicio]
  let exploto = false
  while (cola.length) {
    const i = cola.pop()!
    const c = cs[i]
    if (c.revelada || c.bandera) continue
    c.revelada = true
    if (c.mina) {
      exploto = true
      continue
    }
    if (c.num === 0) for (const v of vecinos(i, lado)) if (!cs[v].revelada) cola.push(v)
  }
  return { celdas: cs, exploto }
}

export function Buscaminas() {
  const t = useT()
  const [nivel, setNivel] = useState<Nivel>('facil')
  const [celdas, setCeldas] = useState<Celda[]>(() => tableroVacio('facil'))
  const [fase, setFase] = useState<Fase>('lista')
  const [segundos, setSegundos] = useState(0)
  const [modoBandera, setModoBandera] = useState(false)
  const [explotada, setExplotada] = useState<number | null>(null)
  const [record, setRecord] = useState(() => leerNumero('buscaminas-facil', 0))

  const { lado, minas } = NIVELES[nivel]
  const banderas = celdas.filter((c) => c.bandera).length
  const terminado = fase === 'ganado' || fase === 'perdido'

  useEffect(() => {
    if (fase !== 'jugando') return
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [fase])

  const reiniciar = (n: Nivel) => {
    setNivel(n)
    setCeldas(tableroVacio(n))
    setFase('lista')
    setSegundos(0)
    setExplotada(null)
    setRecord(leerNumero(`buscaminas-${n}`, 0))
  }

  const terminarJugada = (cs: Celda[], exploto: boolean, origen: number) => {
    if (exploto) {
      setCeldas(cs.map((c) => (c.mina ? { ...c, revelada: true } : c)))
      setFase('perdido')
      setExplotada(origen)
      return
    }
    const reveladas = cs.filter((c) => c.revelada).length
    if (reveladas === lado ** 2 - minas) {
      setCeldas(cs.map((c) => (c.mina ? { ...c, bandera: true } : c)))
      setFase('ganado')
      setRecord(guardarRecord(`buscaminas-${nivel}`, segundos, true))
      return
    }
    setCeldas(cs)
  }

  const alternarBandera = (i: number) => {
    if (terminado || celdas[i].revelada) return
    setCeldas(celdas.map((c, k) => (k === i ? { ...c, bandera: !c.bandera } : c)))
  }

  const abrir = (i: number) => {
    if (terminado || celdas[i].bandera) return
    if (fase === 'lista') {
      const cs = sembrarMinas(celdas, nivel, i)
      setFase('jugando')
      const r = revelarDesde(cs, [i], lado)
      terminarJugada(r.celdas, r.exploto, i)
      return
    }
    const celda = celdas[i]
    if (!celda.revelada) {
      const r = revelarDesde(celdas, [i], lado)
      terminarJugada(r.celdas, r.exploto, i)
      return
    }
    // acorde: clic en un número con sus banderas ya puestas revela el resto de vecinas
    if (celda.num > 0) {
      const vs = vecinos(i, lado)
      if (vs.filter((v) => celdas[v].bandera).length !== celda.num) return
      const pendientes = vs.filter((v) => !celdas[v].bandera && !celdas[v].revelada)
      if (!pendientes.length) return
      const r = revelarDesde(celdas, pendientes, lado)
      terminarJugada(r.celdas, r.exploto, i)
    }
  }

  const clickCelda = (i: number) => {
    if (modoBandera && !celdas[i].revelada) alternarBandera(i)
    else abrir(i)
  }

  const carita = fase === 'perdido' ? '😵' : fase === 'ganado' ? '😎' : '🙂'  // se pinta con <Icono emoji=>
  const tamFuente = lado === 16 ? 'text-[10px]' : lado === 12 ? 'text-xs' : 'text-sm'

  const DIFS: { id: Nivel; label: string }[] = [
    { id: 'facil', label: t('entre.j.dif.facil', 'Fácil') },
    { id: 'medio', label: t('entre.j.dif.medio', 'Medio') },
    { id: 'dificil', label: t('entre.j.dif.dificil', 'Difícil') },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {DIFS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => reiniciar(d.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${nivel === d.id ? 'text-black' : 'bg-white/10'}`}
              style={nivel === d.id ? { background: COLOR } : undefined}
            >
              {d.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/55">
          {t('entre.j.mejor', 'Mejor')}: {record > 0 ? formatearTiempo(record) : '—'}
        </span>
      </div>

      <div className="mx-auto flex max-w-[420px] items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm font-bold">
        <span><Icono nombre="bomba" /> {Math.max(0, minas - banderas)}</span>
        <button type="button" onClick={() => reiniciar(nivel)} className="rounded-lg bg-white/10 px-3 py-1 text-xl">
          <Icono emoji={carita} />
        </button>
        <span><Icono nombre="cronometro" /> {formatearTiempo(segundos)}</span>
        <button
          type="button"
          onClick={() => setModoBandera((v) => !v)}
          title={t('entre.j.buscaminas.modoBandera', 'Modo bandera')}
          className={`rounded-lg px-3 py-1 text-base ${modoBandera ? 'ring-2' : 'bg-white/10'}`}
          style={modoBandera ? { background: `${COLOR}33`, borderColor: COLOR } : undefined}
        >
          <Icono nombre="bandera" />
        </button>
      </div>

      <div
        className="mx-auto grid max-w-[420px] select-none gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${lado}, minmax(0, 1fr))` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {celdas.map((c, i) => {
          const banderaMal = fase === 'perdido' && c.bandera && !c.mina
          const contenido = banderaMal
            ? '✕'
            : c.revelada
              ? c.mina
                ? <Icono nombre="bomba" />
                : c.num > 0
                  ? String(c.num)
                  : ''
              : c.bandera
                ? <Icono nombre="bandera" />
                : ''
          return (
            <button
              key={i}
              type="button"
              onClick={() => clickCelda(i)}
              onContextMenu={(e) => {
                e.preventDefault()
                alternarBandera(i)
              }}
              className={`aspect-square rounded-[3px] font-bold leading-none ${tamFuente} ${
                c.revelada
                  ? i === explotada
                    ? 'bg-red-500/80'
                    : 'bg-white/10'
                  : 'bg-white/25 hover:bg-white/35'
              }`}
              style={{ color: c.revelada && !c.mina && c.num > 0 ? COLORES_NUM[c.num] : undefined }}
            >
              {contenido}
            </button>
          )
        })}
      </div>

      {fase === 'perdido' && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-center">
          <p className="font-bold">{t('entre.j.buscaminas.perdiste', '💥 ¡Buuum! Pisaste una mina.')}</p>
        </div>
      )}
      {fase === 'ganado' && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center">
          <p className="text-lg font-black">{t('entre.j.ganaste', '¡Ganaste! 🎉')}</p>
          <p className="mt-1 text-sm text-white/60">
            <Icono nombre="cronometro" /> {formatearTiempo(segundos)} · {t('entre.j.mejor', 'Mejor')}: {formatearTiempo(record)}
          </p>
        </div>
      )}
    </div>
  )
}
