import { useMemo, useState } from 'react'
import type { Hobby, SesionHobby } from '../../core/data/db'
import { hobbiesRepo, proyectosHobbyRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { tabInicial } from '../../core/state/intencionApp'
import { useT } from '../../core/i18n/useT'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { DetalleHobby } from './DetalleHobby'
import { FormHobby } from './FormHobby'
import { fechasSemanaActual, minutosPorDia, rachaActual, rgba } from './stats'

export function HobbiesApp() {
  const t = useT()
  const hobbies = hobbiesRepo.useAll() ?? []
  const sesiones = sesionesHobbyRepo.useAll() ?? []
  const proyectos = proyectosHobbyRepo.useAll() ?? []

  const [hobbyId, setHobbyId] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Hobby | null>(null)
  // La única de las cuatro apps sin pestañas: era maestro/detalle a secas.
  const [tab, setTab] = useState<'hobbies' | 'cronograma'>(() =>
    tabInicial('hobbies', ['hobbies', 'cronograma'] as const, 'hobbies'),
  )

  const porHobby = useMemo(() => {
    const m = new Map<number, SesionHobby[]>()
    for (const s of sesiones) {
      const lista = m.get(s.hobbyId)
      if (lista) lista.push(s)
      else m.set(s.hobbyId, [s])
    }
    return m
  }, [sesiones])

  if (creando || editando) {
    return (
      <div className="mx-auto max-w-2xl">
        <FormHobby
          hobby={editando ?? undefined}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      </div>
    )
  }

  const abierto = hobbyId != null ? hobbies.find((h) => h.id === hobbyId) : undefined
  if (abierto) {
    return (
      <div className="mx-auto max-w-2xl">
        <DetalleHobby
          hobby={abierto}
          sesiones={porHobby.get(abierto.id!) ?? []}
          proyectos={proyectos.filter((p) => p.hobbyId === abierto.id)}
          onVolver={() => setHobbyId(null)}
          onEditar={() => setEditando(abierto)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2">
        {(['hobbies', 'cronograma'] as const).map((id) => (
          <button
            key={id}
            type="button"
            data-tut={`hobbies.tab.${id}`}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-violet-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono nombre={id === 'hobbies' ? 'rompecabezas' : 'calendario'} />{' '}
            {t(`hobbies.tab.${id}`, id === 'hobbies' ? 'Hobbies' : 'Cronograma')}
          </button>
        ))}
      </div>

      {tab === 'cronograma' ? (
        <CronogramaApp plantillaId="hobbies" />
      ) : (
        <>
      <p className="text-sm text-white/50 text-center">
        {t('hobbies.desc', 'Dale seguimiento a tus pasatiempos: sesiones, rachas, metas y proyectos.')}
      </p>

      <button
        type="button"
        data-tut="hobbies.agregar"
        onClick={() => setCreando(true)}
        className="w-full rounded-lg bg-violet-600 py-2 font-bold texto-cta hover:bg-violet-500 transition"
      >
        <Icono nombre="agregar" /> {t('hobbies.nuevo', 'Nuevo hobby')}
      </button>

      {hobbies.length === 0 ? (
        <div data-tut="hobbies.lista" className="rounded-xl border border-dashed border-white/15 p-8 text-center">
          <p className="text-4xl mb-2">
            <Icono nombre="rompecabezas" />
          </p>
          <p className="text-sm text-white/50">
            {t('hobbies.vacio.titulo', 'Aún no tienes hobbies registrados. Empieza agregando los que disfrutas.')}
          </p>
        </div>
      ) : (
        <ul data-tut="hobbies.lista" className="space-y-2">
          {hobbies.map((h) => {
            const suyas = porHobby.get(h.id!) ?? []
            const fechas = new Set(suyas.map((s) => s.fecha))
            const racha = rachaActual(fechas)
            const porDia = minutosPorDia(suyas)
            const practicados = fechasSemanaActual(fechas)
            const minSemana = practicados.reduce((acc, f) => acc + (porDia.get(f) ?? 0), 0)
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setHobbyId(h.id!)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl"
                    style={{ background: rgba(h.color, 0.2) }}
                  >
                    <Icono emoji={h.emoji} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{h.nombre}</p>
                    <p className="text-xs text-white/45">
                      {h.metaDiasSemana
                        ? t('hobbies.lista.meta', '{d}/{m} días esta semana', {
                            d: practicados.length,
                            m: h.metaDiasSemana,
                          })
                        : t('hobbies.lista.semana', '{n} min esta semana', { n: minSemana })}
                    </p>
                  </div>
                  {racha > 0 && (
                    <span
                      className="flex shrink-0 items-center gap-1 text-sm font-semibold"
                      style={{ color: h.color }}
                    >
                      <Icono nombre="racha" /> {racha}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
        </>
      )}
    </div>
  )
}
