import { useEffect, useRef, useState } from 'react'
import { iaActiva } from '../../../core/chat/ia'
import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { barajar } from './cartas'
import { DILEMAS, type Dilema } from './dilemas.data'
import { AvisoJev } from './AvisoJev'
import { preguntarJev, type RespuestaJev } from './jev'

const POR_PARTIDA = 8

/** Lo que decidió Jev: `p` = probabilidad del «sí». */
type Decision = RespuestaJev<number>

function pedirDecision(d: Dilema): Promise<Decision> {
  return preguntarJev(d.texto ? { dilema: d.texto } : {}, { decision: d.pregunta }).then((r) =>
    r.ok ? { ok: true, valor: r.valor.decision ?? 0.5 } : r,
  )
}

const MAX_SITUACION = 600
const MAX_PREGUNTA = 200

/**
 * Tu propio dilema: le cuentas la situación y una pregunta de sí o no, y Jev
 * decide con su confianza. Solo aparece con la IA activa.
 */
function PreguntaleAJev() {
  const t = useT()
  const [situacion, setSituacion] = useState('')
  const [pregunta, setPregunta] = useState('')
  const [pensando, setPensando] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)

  const preguntar = async () => {
    const q = pregunta.trim()
    if (!q || pensando) return
    setPensando(true)
    setDecision(null)
    const d = await pedirDecision({ texto: situacion.trim(), pregunta: q, si: '', no: '' })
    setDecision(d)
    setPensando(false)
  }

  const p = decision?.ok ? decision.valor : null
  const si = p !== null && p >= 0.5
  return (
    <div className="mx-auto max-w-[520px] space-y-3">
      <textarea
        value={situacion}
        onChange={(e) => setSituacion(e.target.value)}
        maxLength={MAX_SITUACION}
        rows={4}
        placeholder={t('entre.j.dilemas.situacion', 'Cuéntale a Jev tu situación…')}
        className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/35"
      />
      <input
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void preguntar()
        }}
        maxLength={MAX_PREGUNTA}
        placeholder={t('entre.j.dilemas.tuPregunta', 'Tu pregunta de sí o no (¿Acepto el trabajo?)')}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/35"
      />
      <button
        type="button"
        onClick={() => void preguntar()}
        disabled={!pregunta.trim() || pensando}
        className="w-full rounded-lg px-3 py-2 text-sm font-bold text-black disabled:opacity-40"
        style={{ background: COLOR }}
      >
        <Icono nombre="memoria" /> {t('entre.j.dilemas.queDecida', 'Que decida Jev')}
      </button>

      {pensando && (
        <p className="animate-pulse text-center text-sm text-white/55">
          <Icono nombre="memoria" /> {t('entre.j.jev.pensando', 'Jev está decidiendo…')}
        </p>
      )}
      {decision && !decision.ok && <AvisoJev falta={decision.falta} alReintentar={() => void preguntar()} />}
      {p !== null && (
        <div className="space-y-2 rounded-xl bg-white/5 p-4 text-center">
          <p className="text-3xl font-black">{si ? t('entre.j.cien.si', 'Sí') : t('entre.j.cien.no', 'No')}</p>
          <p className="text-sm text-white/60">
            {t('entre.j.dilemas.confianza', 'Confianza de Jev: {n} %', { n: Math.round(Math.max(p, 1 - p) * 100) })}
          </p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full" style={{ width: `${Math.round(p * 100)}%`, background: COLOR }} />
          </div>
        </div>
      )}
      <p className="text-center text-[11px] text-white/35">
        {t('entre.j.jev.nota', 'Jev es un modelo de decisiones: da una probabilidad, no una verdad moral.')}
      </p>
    </div>
  )
}

/** Los 8 dilemas del juego y, con la IA activa, la pestaña para preguntarle a Jev el tuyo. */
export function Dilemas() {
  const t = useT()
  const [modo, setModo] = useState<'juego' | 'tuyo'>('juego')
  if (!iaActiva()) return <PartidaDilemas />
  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-[520px] gap-1.5">
        {(['juego', 'tuyo'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              modo === m ? 'text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            style={modo === m ? { background: COLOR } : undefined}
          >
            {m === 'juego' ? t('entre.j.dilemas.modoJuego', '8 dilemas') : t('entre.j.dilemas.modoTuyo', 'Pregúntale a Jev')}
          </button>
        ))}
      </div>
      {modo === 'juego' ? <PartidaDilemas /> : <PreguntaleAJev />}
    </div>
  )
}

/**
 * Tú contra Jev: respondes el dilema, luego se revela cómo lo decide Jev (una
 * llamada sí/no con su confianza) y se cuenta cuántas veces coinciden. La
 * decisión se pide al mostrar el dilema para que la revelación sea instantánea.
 */
function PartidaDilemas() {
  const t = useT()
  const [ronda, setRonda] = useState(() => barajar(DILEMAS).slice(0, POR_PARTIDA))
  const [i, setI] = useState(0)
  const [mia, setMia] = useState<boolean | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [coinciden, setCoinciden] = useState(0)
  const [record, setRecord] = useState(() => leerNumero('dilemas-coinciden', 0))
  // La promesa de la decisión del dilema en pantalla (se lanza al mostrarlo).
  const pendiente = useRef<Promise<Decision> | null>(null)

  const dilema = ronda[i]
  const terminado = i >= ronda.length

  useEffect(() => {
    pendiente.current = dilema ? pedirDecision(dilema) : null
  }, [dilema])

  const elegir = async (si: boolean) => {
    if (mia !== null || !dilema) return
    setMia(si)
    const d = await (pendiente.current ?? pedirDecision(dilema))
    setDecision(d)
    if (d.ok && d.valor >= 0.5 === si) setCoinciden((n) => n + 1)
  }

  const reintentar = async () => {
    if (!dilema || mia === null) return
    setDecision(null)
    pendiente.current = pedirDecision(dilema)
    const d = await pendiente.current
    setDecision(d)
    if (d.ok && d.valor >= 0.5 === mia) setCoinciden((n) => n + 1)
  }

  const siguiente = () => {
    const n = i + 1
    if (n >= ronda.length) setRecord(guardarRecord('dilemas-coinciden', coinciden))
    setI(n)
    setMia(null)
    setDecision(null)
  }

  const otraPartida = () => {
    setRonda(barajar(DILEMAS).slice(0, POR_PARTIDA))
    setI(0)
    setMia(null)
    setDecision(null)
    setCoinciden(0)
  }

  if (terminado) {
    return (
      <div className="mx-auto max-w-[520px] space-y-4 rounded-2xl bg-white/5 p-5 text-center">
        <p className="text-4xl">
          <Icono nombre="comparar" />
        </p>
        <p className="text-lg font-bold">
          {t('entre.j.dilemas.final', 'Coincidiste con Jev en {n} de {total}', { n: coinciden, total: ronda.length })}
        </p>
        <p className="text-sm text-white/55">
          {coinciden >= ronda.length * 0.75
            ? t('entre.j.dilemas.finalAlto', 'Piensas muy parecido a la IA.')
            : coinciden <= ronda.length * 0.25
              ? t('entre.j.dilemas.finalBajo', 'Tu brújula moral va por su cuenta.')
              : t('entre.j.dilemas.finalMedio', 'A veces coinciden y a veces no.')}
        </p>
        <p className="text-xs text-white/45">
          {t('entre.j.mejor', 'Mejor')}: {record}
        </p>
        <button type="button" onClick={otraPartida} className="rounded-lg px-4 py-2 text-sm font-bold text-black" style={{ background: COLOR }}>
          {t('entre.j.dilemas.otra', 'Otros 8 dilemas')}
        </button>
      </div>
    )
  }

  const pJev = decision?.ok ? decision.valor : null
  const jevSi = pJev !== null && pJev >= 0.5
  const confianza = pJev === null ? 0 : Math.round(Math.max(pJev, 1 - pJev) * 100)

  const opcion = (si: boolean) => {
    const elegida = mia === si
    const deJev = pJev !== null && jevSi === si
    return (
      <button
        key={String(si)}
        type="button"
        onClick={() => void elegir(si)}
        disabled={mia !== null}
        className={`relative w-full rounded-xl border p-3 text-start text-sm font-semibold transition ${
          mia === null
            ? 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10'
            : elegida
              ? 'border-transparent bg-white/15'
              : 'border-white/10 bg-white/[0.03] text-white/50'
        }`}
      >
        {si ? dilema.si : dilema.no}
        <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold">
          {elegida && <span className="rounded-full bg-white/15 px-2 py-0.5">{t('entre.j.dilemas.tu', 'Tú')}</span>}
          {deJev && (
            <span className="rounded-full px-2 py-0.5 text-black" style={{ background: COLOR }}>
              <Icono nombre="memoria" /> Jev · {confianza} %
            </span>
          )}
        </span>
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-[520px] space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t('entre.j.dilemas.contador', 'Dilema {n}/{total}', { n: i + 1, total: ronda.length })}
        </span>
        <span className="text-white/60">
          {t('entre.j.dilemas.coinciden', 'Coinciden: {n}', { n: coinciden })}
        </span>
      </div>

      <div className="rounded-2xl bg-white/5 p-4">
        <p className="leading-relaxed">{dilema.texto}</p>
        <p className="mt-2 text-sm font-bold">{dilema.pregunta}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">{[true, false].map(opcion)}</div>

      {mia !== null && decision === null && (
        <p className="animate-pulse text-center text-sm text-white/55">
          <Icono nombre="memoria" /> {t('entre.j.jev.pensando', 'Jev está decidiendo…')}
        </p>
      )}

      {decision && !decision.ok && <AvisoJev falta={decision.falta} alReintentar={() => void reintentar()} />}

      {pJev !== null && (
        <div className="space-y-2 rounded-xl bg-white/5 p-3">
          <p className="text-sm font-bold">
            {jevSi === mia
              ? t('entre.j.dilemas.igual', 'Jev decidió lo mismo que tú')
              : t('entre.j.dilemas.distinto', 'Jev decidió distinto')}
          </p>
          {/* Barra: cuánto se inclina Jev hacia cada opción */}
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full" style={{ width: `${Math.round(pJev * 100)}%`, background: COLOR }} />
          </div>
          <div className="flex justify-between text-[11px] text-white/50">
            <span>{dilema.si} · {Math.round(pJev * 100)} %</span>
            <span>{100 - Math.round(pJev * 100)} % · {dilema.no}</span>
          </div>
        </div>
      )}

      {mia !== null && decision !== null && (
        <button type="button" onClick={siguiente} className="w-full rounded-lg px-3 py-2 text-sm font-bold text-black" style={{ background: COLOR }}>
          {i + 1 < ronda.length ? t('entre.j.dilemas.siguiente', 'Siguiente dilema') : t('entre.j.dilemas.verResultado', 'Ver resultado')}
        </button>
      )}

      <p className="text-center text-[11px] text-white/35">
        {t('entre.j.jev.nota', 'Jev es un modelo de decisiones: da una probabilidad, no una verdad moral.')}
      </p>
    </div>
  )
}
