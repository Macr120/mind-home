import { Icono } from '../../../core/ui/iconos/Icono'
import { useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { barajar } from './cartas'
import {
  GRUPOS_CONOCERSE,
  GRUPOS_DEBATES,
  PREGUNTAS_CONOCERSE,
  PREGUNTAS_DEBATES,
  type GrupoPregunta,
  type Pregunta,
} from './preguntas'

function MazoPreguntas({
  preguntas,
  grupos,
  gradiente,
  icono,
}: {
  preguntas: Pregunta[]
  grupos: GrupoPregunta[]
  gradiente: string
  icono: string
}) {
  const t = useT()
  const [activos, setActivos] = useState<string[]>(() => grupos.map((g) => g.id))
  const [mazo, setMazo] = useState<Pregunta[]>(() => barajar(preguntas))
  const [pos, setPos] = useState(0)

  const alternarGrupo = (id: string) => {
    const nuevos = activos.includes(id) ? activos.filter((x) => x !== id) : [...activos, id]
    if (!nuevos.length) return
    setActivos(nuevos)
    setMazo(barajar(preguntas.filter((p) => nuevos.includes(p.grupo))))
    setPos(0)
  }

  const rebarajar = () => {
    setMazo(barajar(preguntas.filter((p) => activos.includes(p.grupo))))
    setPos(0)
  }

  const siguiente = () => setPos((p) => Math.min(p + 1, mazo.length))
  const anterior = () => setPos((p) => Math.max(0, p - 1))

  const pregunta: Pregunta | undefined = mazo[pos]
  const grupoActual = pregunta ? grupos.find((g) => g.id === pregunta.grupo) : undefined

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {grupos.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => alternarGrupo(g.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              activos.includes(g.id) ? 'border-transparent text-black' : 'border-white/15 bg-white/5 text-white/45'
            }`}
            style={activos.includes(g.id) ? { background: g.color } : undefined}
          >
            {t(`entre.j.cartas.g.${g.id}`, g.label)}
          </button>
        ))}
        <button
          type="button"
          onClick={rebarajar}
          className="ms-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
        >
          <Icono nombre="barajar" /> {t('entre.j.cartas.barajar', 'Barajar')}
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={siguiente}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') siguiente()
        }}
        className="relative flex min-h-[280px] w-full cursor-pointer select-none flex-col overflow-hidden rounded-3xl border border-white/15 p-5 shadow-xl"
        style={{ background: gradiente }}
      >
        <span className="pointer-events-none absolute -bottom-7 -end-3 text-[120px] leading-none opacity-15">
          <Icono emoji={icono} />
        </span>
        {pregunta ? (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-white/75">
              <span>
                {t('entre.j.cartas.carta', `Carta ${pos + 1} de ${mazo.length}`, {
                  n: String(pos + 1),
                  t: String(mazo.length),
                })}
              </span>
              {grupoActual && (
                <span className="rounded-full bg-black/25 px-2.5 py-1">
                  {t(`entre.j.cartas.g.${grupoActual.id}`, grupoActual.label)}
                </span>
              )}
            </div>
            <p className="flex flex-1 items-center justify-center px-2 text-center text-xl font-bold leading-snug text-white drop-shadow-sm">
              {pregunta.texto}
            </p>
            <p className="text-center text-xs text-white/60">
              {t('entre.j.cartas.toca', 'Toca la carta para la siguiente')}
            </p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-xl font-black text-white">🎉 {t('entre.j.cartas.fin', 'Se acabaron las preguntas')}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                rebarajar()
              }}
              className="rounded-xl bg-black/30 px-4 py-2 font-bold text-white hover:bg-black/45"
            >
              <Icono nombre="barajar" /> {t('entre.j.cartas.reiniciar', 'Volver a barajar')}
            </button>
          </div>
        )}
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${mazo.length ? (Math.min(pos, mazo.length) / mazo.length) * 100 : 0}%`, background: COLOR }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={anterior}
          disabled={pos === 0}
          className="rounded-xl bg-white/10 px-4 py-2.5 text-lg font-bold hover:bg-white/20 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={siguiente}
          disabled={pos >= mazo.length}
          className="flex-1 rounded-xl py-2.5 font-bold text-black disabled:opacity-30"
          style={{ background: COLOR }}
        >
          {t('entre.j.cartas.siguiente', 'Siguiente')} ›
        </button>
      </div>
    </div>
  )
}

export function CartasConocerse() {
  return (
    <MazoPreguntas
      preguntas={PREGUNTAS_CONOCERSE}
      grupos={GRUPOS_CONOCERSE}
      gradiente="linear-gradient(135deg, #7c3aed, #db2777)"
      icono="💬"
    />
  )
}

export function CartasDebates() {
  return (
    <MazoPreguntas
      preguntas={PREGUNTAS_DEBATES}
      grupos={GRUPOS_DEBATES}
      gradiente="linear-gradient(135deg, #ea580c, #b91c1c)"
      icono="🔥"
    />
  )
}
