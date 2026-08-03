import { Icono } from '../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import { sesionesMindfulnessRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { CheckInAnimo } from './CheckInAnimo'
import { FinSesion } from './FinSesion'
import { tocarCampana } from './campana'
import { COLOR } from './constantes'
import { hoyISO } from './fecha'

type PatronId = 'caja' | '478'

interface FaseResp {
  key: 'inhala' | 'sosten' | 'exhala'
  seg: number
  escala: number
}

const PATRONES: Record<PatronId, { titulo: string; desc: string; fases: FaseResp[] }> = {
  caja: {
    titulo: 'Respiración en caja 4-4-4-4',
    desc: 'Inhala, sostén, exhala, sostén: 4 s cada fase. Equilibrio y foco.',
    fases: [
      { key: 'inhala', seg: 4, escala: 1.18 },
      { key: 'sosten', seg: 4, escala: 1.18 },
      { key: 'exhala', seg: 4, escala: 0.78 },
      { key: 'sosten', seg: 4, escala: 0.78 },
    ],
  },
  '478': {
    titulo: 'Respiración 4-7-8',
    desc: 'Inhala 4 s, sostén 7 s, exhala 8 s. Relaja el sistema nervioso.',
    fases: [
      { key: 'inhala', seg: 4, escala: 1.18 },
      { key: 'sosten', seg: 7, escala: 1.18 },
      { key: 'exhala', seg: 8, escala: 0.78 },
    ],
  },
}

const DURACIONES = [2, 3, 5, 10]

interface Config {
  patron: PatronId
  duracionMin: number
  animoAntes?: number
}

type Estado =
  | { fase: 'elegir' }
  | { fase: 'antes'; config: Config }
  | { fase: 'activa'; config: Config }
  | { fase: 'despues'; config: Config; minReales: number }

export function RespiracionTab({ onSesion }: { onSesion: (activa: boolean) => void }) {
  const t = useT()
  const [estado, setEstado] = useState<Estado>({ fase: 'elegir' })
  const [patronSel, setPatronSel] = useState<PatronId>('caja')
  const [durSel, setDurSel] = useState(3)

  useEffect(() => {
    onSesion(estado.fase !== 'elegir')
    return () => onSesion(false)
  }, [estado.fase, onSesion])

  const guardar = async (config: Config, minReales: number, animoDespues?: number) => {
    await sesionesMindfulnessRepo.add({
      fecha: hoyISO(),
      tipo: 'respiracion',
      titulo: t(`jardin.resp.${config.patron}.titulo`, PATRONES[config.patron].titulo),
      duracionMin: minReales,
      tema: config.patron,
      animoAntes: config.animoAntes,
      animoDespues,
    })
    setEstado({ fase: 'elegir' })
  }

  if (estado.fase === 'antes') {
    const { config } = estado
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <CheckInAnimo
          pregunta={t('jardin.chk.antes', '¿Cómo llegas?')}
          onElegir={(animo) => {
            tocarCampana(1)
            setEstado({ fase: 'activa', config: { ...config, animoAntes: animo } })
          }}
        />
      </div>
    )
  }

  if (estado.fase === 'activa') {
    const { config } = estado
    return (
      <RespiracionActiva
        config={config}
        onFin={(minReales) => {
          if (minReales <= 0) setEstado({ fase: 'elegir' })
          else setEstado({ fase: 'despues', config, minReales })
        }}
      />
    )
  }

  if (estado.fase === 'despues') {
    const { config, minReales } = estado
    return (
      <FinSesion
        minReales={minReales}
        animoAntes={config.animoAntes}
        onCerrar={(animoDespues) => void guardar(config, minReales, animoDespues)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <section data-tut="jardin.resp.patron" className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        <p className="text-sm font-semibold">{t('jardin.resp.patron', 'Elige tu patrón')}</p>
        <div className="grid grid-cols-1 gap-2">
          {(['caja', '478'] as PatronId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPatronSel(id)}
              className={`rounded-xl p-3 text-left border transition ${
                patronSel === id
                  ? 'border-emerald-500/60 bg-emerald-500/15'
                  : 'border-white/10 bg-black/20 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-bold">
                <Icono nombre="respiracion" /> {id === 'caja' ? t('jardin.resp.caja', 'Respiración en caja 4-4-4-4') : t('jardin.resp.478', 'Técnica 4-7-8')}
              </p>
              <p className="text-xs text-white/45 mt-0.5">{t(`jardin.resp.${id}.desc`, PATRONES[id].desc)}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">{t('jardin.resp.duracion', 'Duración')}</span>
          {DURACIONES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDurSel(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                durSel === d ? 'bg-emerald-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEstado({ fase: 'antes', config: { patron: patronSel, duracionMin: durSel } })}
          className="w-full rounded-lg py-2.5 text-sm font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/35"
        >
          {t('jardin.resp.comenzar', 'Comenzar respiración')}
        </button>
      </section>
    </div>
  )
}

/** Círculo que se expande al inhalar y se contrae al exhalar, guiado por el patrón. */
function RespiracionActiva({ config, onFin }: { config: Config; onFin: (minReales: number) => void }) {
  const t = useT()
  const fases = PATRONES[config.patron].fases
  const totalSeg = config.duracionMin * 60
  const [transcurrido, setTranscurrido] = useState(0)
  const [pausa, setPausa] = useState(false)
  // Doble render inicial para que la primera inhalación anime desde la escala
  // chica: el rAF garantiza que el navegador pinte el estado inicial primero.
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (pausa) return
    const id = setInterval(() => setTranscurrido((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [pausa])

  const terminado = transcurrido >= totalSeg
  useEffect(() => {
    if (!terminado) return
    tocarCampana(2)
    const id = setTimeout(() => onFin(config.duracionMin), 800)
    return () => clearTimeout(id)
  }, [terminado, config.duracionMin, onFin])

  const terminarAhora = () => {
    const minReales = Math.round(transcurrido / 60)
    if (minReales > 0) tocarCampana(1)
    onFin(minReales)
  }

  // Posición dentro del ciclo → fase actual y segundos restantes de la fase.
  const cicloSeg = fases.reduce((acc, f) => acc + f.seg, 0)
  const pos = transcurrido % cicloSeg
  let idxFase = 0
  let inicioFase = 0
  for (let i = 0, acc = 0; i < fases.length; i++) {
    if (pos < acc + fases[i].seg) {
      idxFase = i
      inicioFase = acc
      break
    }
    acc += fases[i].seg
  }
  const fase = fases[idxFase]
  const segFaseRestante = fase.seg - (pos - inicioFase)
  const segRestante = Math.max(0, totalSeg - transcurrido)

  const NOMBRES: Record<FaseResp['key'], string> = {
    inhala: t('jardin.resp.inhala', 'Inhala'),
    sosten: t('jardin.resp.sosten', 'Sostén'),
    exhala: t('jardin.resp.exhala', 'Exhala'),
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 flex flex-col items-center gap-4">
      <p className="text-sm font-semibold text-white/70">{t(`jardin.resp.${config.patron}.titulo`, PATRONES[config.patron].titulo)}</p>

      <div className="relative flex items-center justify-center" style={{ height: 250, width: '100%' }}>
        <div
          className="absolute rounded-full"
          style={{
            width: 190,
            height: 190,
            background: `${COLOR}2b`,
            boxShadow: `0 0 60px ${COLOR}40`,
            transform: `scale(${montado ? fase.escala : 0.78})`,
            transition: `transform ${fase.seg}s ease-in-out`,
          }}
        />
        <div className="relative text-center">
          <p className="text-xl font-bold text-white/90">{NOMBRES[fase.key]}</p>
          <p className="text-4xl font-black tabular-nums texto-vivo" style={vivo(COLOR)}>
            {segFaseRestante}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/50 tabular-nums">
        {pausa
          ? t('jardin.ses.pausada', 'En pausa')
          : `${Math.floor(segRestante / 60)}:${String(segRestante % 60).padStart(2, '0')}`}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPausa((p) => !p)}
          className="rounded-lg px-4 py-2 text-sm font-semibold bg-white/10 hover:bg-white/15"
        >
          {pausa ? t('jardin.ses.reanudar', 'Reanudar') : t('jardin.ses.pausar', 'Pausar')}
        </button>
        <button
          type="button"
          onClick={terminarAhora}
          className="rounded-lg px-4 py-2 text-sm font-semibold bg-white/5 text-white/60 hover:bg-white/10"
        >
          {t('jardin.ses.terminar', 'Terminar')}
        </button>
      </div>
    </div>
  )
}
