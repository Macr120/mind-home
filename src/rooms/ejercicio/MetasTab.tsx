import { useState } from 'react'
import type { PerfilEjercicio, SesionEjercicio, SistemaUnidades } from '../../core/data/db'
import { perfilEjercicioRepo } from '../../core/data/repository'
import { PERFIL_DEFECTO } from './constantes'
import { ResumenTab } from './ResumenTab'
import type { Periodo } from './periodo'
import { useT } from '../../core/i18n/useT'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'

const SISTEMAS: { id: SistemaUnidades; labelEs: string; ejemplo: string }[] = [
  { id: 'internacional', labelEs: 'Internacional', ejemplo: 'kg · km' },
  { id: 'ingles', labelEs: 'Inglés', ejemplo: 'lb · mi' },
]

export function MetasTab({
  perfil,
  perfilEfectivo,
  sesiones,
  periodo,
  setPeriodo,
}: {
  perfil: (PerfilEjercicio & { id: number }) | undefined
  perfilEfectivo: PerfilEjercicio
  sesiones: SesionEjercicio[]
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
}) {
  const p = perfil ?? { id: 0, ...PERFIL_DEFECTO }
  const [fuerza, setFuerza] = useState(String(p.sesionesFuerzaSemana))
  const [resistencia, setResistencia] = useState(String(p.minutosResistenciaSemana))
  const [flex, setFlex] = useState(String(p.minutosFlexibilidadSemana))
  const [dias, setDias] = useState(String(p.diasActivosSemana))
  const [unidades, setUnidades] = useState<SistemaUnidades>(p.unidades ?? 'internacional')

  const guardar = async () => {
    const datos = {
      sesionesFuerzaSemana: parseInt(fuerza, 10) || 3,
      minutosResistenciaSemana: parseInt(resistencia, 10) || 90,
      minutosFlexibilidadSemana: parseInt(flex, 10) || 60,
      diasActivosSemana: parseInt(dias, 10) || 5,
      unidades,
    }
    if (p.id) await perfilEjercicioRepo.update(p.id, datos)
    else await perfilEjercicioRepo.add(datos)
  }

  const preset = (tipo: 'balance' | 'fuerza' | 'cardio' | 'movilidad') => {
    const map = {
      balance: { f: '3', r: '90', fl: '60', d: '5' },
      fuerza: { f: '4', r: '60', fl: '45', d: '5' },
      cardio: { f: '2', r: '150', fl: '45', d: '6' },
      movilidad: { f: '2', r: '60', fl: '120', d: '5' },
    }
    const v = map[tipo]
    setFuerza(v.f)
    setResistencia(v.r)
    setFlex(v.fl)
    setDias(v.d)
  }

  const t = useT()

  return (
    <div className="space-y-5">
      <ResumenTab
        sesiones={sesiones}
        perfil={perfilEfectivo}
        periodo={periodo}
        setPeriodo={setPeriodo}
      />

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-base font-bold mb-2"><Icono nombre="objetivo" /> {t('ejercicio.metas.titulo', 'Objetivos semanales')}</p>
        <p className="text-xs text-white/45 mb-3">
          {t('ejercicio.metas.desc', 'Inspirado en programas progresivos (Apple Fitness+, Fitbod, Peloton): define cuánto quieres entrenar cada modalidad.')}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(['balance', 'fuerza', 'cardio', 'movilidad'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => preset(id)}
              className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-400"
            >
              {t(`ejercicio.preset.${id}`, id === 'balance' ? 'Equilibrado' : id === 'fuerza' ? 'Hipertrofia' : id === 'cardio' ? 'Resistencia' : 'Movilidad')}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={t('ejercicio.metas.fuerza', 'Sesiones fuerza / sem')} value={fuerza} onChange={setFuerza} />
          <Campo label={t('ejercicio.metas.resistencia', 'Min resistencia / sem')} value={resistencia} onChange={setResistencia} />
          <Campo label={t('ejercicio.metas.flex', 'Min flexibilidad / sem')} value={flex} onChange={setFlex} />
          <Campo label={t('ejercicio.metas.dias', 'Días activos / sem')} value={dias} onChange={setDias} />
        </div>

        <div className="mt-4">
          <p className="text-[10px] text-white/45">
            {t('ejercicio.metas.sistema', 'Sistema de medidas')}
          </p>
          <div className="mt-1 flex gap-2">
            {SISTEMAS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setUnidades(s.id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  unidades === s.id
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    : 'bg-black/30 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {t(`ejercicio.sistema.${s.id}`, s.labelEs)}{' '}
                <span className="font-normal text-white/40">{s.ejemplo}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-white/35">
            {t(
              'ejercicio.metas.sistema.desc',
              'Cambia cómo se ven los pesos de fuerza (kg o lb) y las distancias y ritmos de resistencia (km o mi). Tus entrenos guardados se convierten solos.',
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={guardar}
          className="mt-4 w-full rounded-xl py-2.5 font-bold bg-rose-600 texto-cta"
        >
          {t('ejercicio.metas.guardar', 'Guardar metas')}
        </button>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10 text-sm text-white/55 space-y-2">
        <p className="font-semibold text-white/80">{t('ejercicio.metas.pilares', 'Qué incluye cada pilar')}</p>
        <p>
          <strong className="text-orange-400"><Icono nombre="tab-fuerza" /> {t('ejercicio.tab.fuerza', 'Fuerza')}</strong>{' '}
          — {t('ejercicio.pilar.fuerza', 'series, repeticiones, peso, volumen total y records (estilo Fitbod).')}
        </p>
        <p>
          <strong className="text-sky-400"><Icono nombre="tab-cardio" /> {t('ejercicio.tab.resistencia', 'Resistencia')}</strong>{' '}
          — {t('ejercicio.pilar.resistencia', 'cardio, HIIT, distancia y RPE por zonas (estilo Peloton / NTC).')}
        </p>
        <p>
          <strong className="text-violet-400"><Icono nombre="cuarto-jardin" /> {t('ejercicio.tab.flexibilidad', 'Flexibilidad')}</strong>{' '}
          — {t('ejercicio.pilar.flex', 'yoga, movilidad y estiramientos por enfoque corporal.')}
        </p>
      </div>

      {/* El cronograma cierra la pestaña: las metas semanales de arriba son el «cuánto»
          y esto el «cuándo». Alto fijo porque `Cronograma` es `flex-1 min-h-0` y sin
          contenedor con altura se colapsaría a cero. */}
      <div data-tut="ejercicio.cronograma" className="space-y-2">
        <p className="text-base font-bold">
          <Icono nombre="calendario" /> {t('ejercicio.tab.cronograma', 'Cronograma')}
        </p>
        <p className="text-xs text-white/45">
          {t(
            'ejercicio.cronograma.desc',
            'Tus metas grandes sobre el eje del tiempo. Con ✨ la IA te arma el plan y te sugiere cuáles de tus rutinas agendar.',
          )}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex h-96 flex-col">
            <CronogramaApp plantillaId="ejercicio" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/45">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
      />
    </label>
  )
}
