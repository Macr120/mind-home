import { useEffect, useState } from 'react'
import { detenerPaisaje, iniciarPaisaje, type PaisajeId } from '../../core/audio/paisaje'
import type { SesionMindfulness } from '../../core/data/db'
import { sesionesMindfulnessRepo } from '../../core/data/repository'
import { Archivador } from '../_shared/Archivador'
import { useT } from '../../core/i18n/useT'
import { actividadId } from '../../core/rutinas'
import { vivo } from '../../core/ui/estilos'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { Icono } from '../../core/ui/iconos/Icono'
import { CheckInAnimo } from './CheckInAnimo'
import { FinSesion } from './FinSesion'
import { tocarCampana } from './campana'
import { COLOR } from './constantes'
import { hoyISO } from './fecha'
import { DURACIONES_PISTA, PISTAS } from './pistas'

type TemaId = PaisajeId | 'libre'

interface Config {
  tema: TemaId
  duracionMin: number
  animoAntes?: number
}

type Estado =
  | { fase: 'elegir' }
  | { fase: 'antes'; config: Config }
  | { fase: 'activa'; config: Config }
  | { fase: 'despues'; config: Config; minReales: number }

function tituloSesion(tema: TemaId) {
  if (tema === 'libre') return 'Meditación libre'
  const nombre = PISTAS.find((p) => p.id === tema)?.nombre ?? tema
  return `Meditación · ${nombre}`
}

export function MeditacionTab({
  onSesion,
  sesiones,
}: {
  onSesion: (activa: boolean) => void
  sesiones: SesionMindfulness[]
}) {
  const t = useT()
  const [estado, setEstado] = useState<Estado>({ fase: 'elegir' })
  const [temaSel, setTemaSel] = useState<PaisajeId>('bosque')
  const [durSel, setDurSel] = useState(10)
  const [minLibre, setMinLibre] = useState(10)

  // El modo inmersivo (sin cabecera ni tabs) aplica desde el check-in de entrada.
  useEffect(() => {
    onSesion(estado.fase !== 'elegir')
    return () => onSesion(false)
  }, [estado.fase, onSesion])

  const guardar = async (config: Config, minReales: number, animoDespues?: number) => {
    await sesionesMindfulnessRepo.add({
      fecha: hoyISO(),
      tipo: 'meditacion',
      titulo: tituloSesion(config.tema),
      duracionMin: minReales,
      tema: config.tema,
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
      <SesionActiva
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
      <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        <p className="text-sm font-semibold">{t('jardin.med.pistas', 'Pistas de sonido')}</p>
        <div className="grid grid-cols-2 gap-2">
          {PISTAS.map((pista) => (
            <button
              key={pista.id}
              type="button"
              onClick={() => setTemaSel(pista.id)}
              className={`rounded-xl p-3 text-left border transition ${
                temaSel === pista.id
                  ? 'border-emerald-500/60 bg-emerald-500/15'
                  : 'border-white/10 bg-black/20 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-bold">
                <Icono emoji={pista.icono} /> {t(`jardin.pista.${pista.id}`, pista.nombre)}
              </p>
              <p className="text-xs text-white/45 mt-0.5">{t(`jardin.pista.${pista.id}.desc`, pista.desc)}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">{t('jardin.med.duracion', 'Duración')}</span>
          {DURACIONES_PISTA.map((d) => (
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
          onClick={() => setEstado({ fase: 'antes', config: { tema: temaSel, duracionMin: durSel } })}
          className="w-full rounded-lg py-2.5 text-sm font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/35"
        >
          {t('jardin.med.comenzar', 'Comenzar meditación')}
        </button>

        {/* Reservarte un rato, no una alarma: `sinAviso` deja el bloque en el
            calendario y quita el interruptor. El jardín no persigue a nadie. */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-white/50">
            {t('jardin.med.reservar', 'Tu rato de calma')}
          </span>
          <HorarioActividad
            actividad={{
              actividadId: actividadId('jardin', 'meditacion'),
              plantillaId: 'jardin',
              nombre: t('jardin.med.bloque', 'Meditar'),
              emoji: '🧘',
              horaSugerida: '08:00',
              duracionMin: durSel,
              seccion: 'meditacion',
              sinAviso: true,
              registroRapido: {
                esquemaId: 'practica',
                valores: { tipo: 'meditacion', duracionMin: durSel, tema: temaSel },
                etiqueta: t('jardin.registrarMin', 'Registrar {n} min', { n: durSel }),
              },
            }}
          />
        </div>
      </section>

      <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="alarma" /> {t('jardin.med.libre', 'Temporizador libre')}
        </p>
        <p className="text-xs text-white/45">
          {t('jardin.med.libre.desc', 'Solo tú y una campana al empezar y al terminar.')}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={60}
            value={minLibre}
            onChange={(e) => setMinLibre(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <span className="w-16 shrink-0 text-right text-lg font-black tabular-nums texto-vivo" style={vivo(COLOR)}>
            {minLibre} min
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEstado({ fase: 'antes', config: { tema: 'libre', duracionMin: minLibre } })}
          className="w-full rounded-lg py-2.5 text-sm font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/35"
        >
          {t('jardin.med.comenzarLibre', 'Comenzar con campana')}
        </button>
      </section>

      {/* Sin rachas ni puntos: solo el registro de lo que ya hiciste, guardado
          en carpetas por semana, mes y año. */}
      <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-sm font-semibold">{t('jardin.hist', 'Tus sesiones')}</p>
        <Archivador
          items={sesiones}
          fecha={(s) => s.fecha}
          clave={(s) => s.id ?? `${s.fecha}-${s.titulo}`}
          vacio={t('jardin.hist.vacio', 'Aquí se guardarán tus sesiones de calma.')}
          resumen={(ses) =>
            t('jardin.hist.min', '{n} min', {
              n: ses.reduce((acc, s) => acc + s.duracionMin, 0),
            })
          }
        >
          {(s) => (
            <div className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs">
              <span className="shrink-0 text-white/45">{s.fecha}</span>
              <span className="min-w-0 flex-1 truncate text-white/80">{s.titulo}</span>
              <span className="shrink-0 font-semibold texto-vivo" style={vivo(COLOR)}>
                {s.duracionMin} min
              </span>
            </div>
          )}
        </Archivador>
      </section>
    </div>
  )
}

/** Sesión en curso: anillo de progreso, frase guía (si no es libre) y controles. */
function SesionActiva({ config, onFin }: { config: Config; onFin: (minReales: number) => void }) {
  const t = useT()
  const totalSeg = config.duracionMin * 60
  const [segRestante, setSegRestante] = useState(totalSeg)
  const [pausa, setPausa] = useState(false)

  useEffect(() => {
    if (pausa) return
    const id = setInterval(() => setSegRestante((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [pausa])

  const terminado = segRestante === 0
  useEffect(() => {
    if (!terminado) return
    tocarCampana(2)
    // Pequeña pausa para alcanzar a oír la campana antes de cambiar de pantalla.
    const id = setTimeout(() => onFin(config.duracionMin), 800)
    return () => clearTimeout(id)
  }, [terminado, config.duracionMin, onFin])

  const terminarAhora = () => {
    const minReales = Math.round((totalSeg - segRestante) / 60)
    if (minReales > 0) tocarCampana(1)
    onFin(minReales)
  }

  // La pista suena mientras dura la sesión; al salir se va con un fundido.
  useEffect(() => {
    if (config.tema === 'libre') return
    iniciarPaisaje(config.tema)
    return () => detenerPaisaje()
  }, [config.tema])

  const pista = PISTAS.find((p) => p.id === config.tema)

  const R = 88
  const C = 2 * Math.PI * R
  const pct = (totalSeg - segRestante) / totalSeg
  const min = Math.floor(segRestante / 60)
  const seg = segRestante % 60

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 flex flex-col items-center gap-4">
      <p className="text-sm font-semibold text-white/70">
        {tituloSesion(config.tema)} · {config.duracionMin} min
      </p>

      <div className="relative w-56 h-56">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={COLOR}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 100 100)"
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-black tabular-nums texto-vivo" style={vivo(COLOR)}>
            {min}:{String(seg).padStart(2, '0')}
          </p>
          {pausa && <p className="text-xs text-white/50 mt-1">{t('jardin.ses.pausada', 'En pausa')}</p>}
        </div>
      </div>

      {pista && (
        <p className="min-h-12 max-w-xs text-center text-sm italic text-white/70 leading-relaxed">
          {t(`jardin.pista.${pista.id}.desc`, pista.desc)}
        </p>
      )}

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
