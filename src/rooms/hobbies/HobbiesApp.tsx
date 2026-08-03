import { useMemo, useState } from 'react'
import type { Hobby, SesionHobby } from '../../core/data/db'
import { VACIO, hobbiesRepo, proyectosHobbyRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { DetalleHobby } from './DetalleHobby'
import { DetalleProyecto } from './DetalleProyecto'
import { ejemploHobbies } from './ejemplos'
import { FormHobby } from './FormHobby'
import { fechasSemanaActual, minutosPorDia, rachaActual, rgba } from './stats'

/**
 * Maestro/detalle en tres escalones: la lista de hobbies, el hobby por dentro y
 * un proyecto suyo. El cronograma no es una pestaña de la app — cada hobby y
 * cada proyecto llevan el suyo, con las metas que le tocan.
 */
export function HobbiesApp() {
  const t = useT()
  const hobbies = hobbiesRepo.useAll() ?? VACIO
  const sesiones = sesionesHobbyRepo.useAll() ?? VACIO
  const proyectos = proyectosHobbyRepo.useAll() ?? VACIO

  const [hobbyId, setHobbyId] = useState<number | null>(null)
  const [proyectoId, setProyectoId] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Hobby | null>(null)

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
    const proyecto = proyectoId != null ? proyectos.find((p) => p.id === proyectoId) : undefined
    return (
      <div className="mx-auto max-w-2xl">
        {proyecto ? (
          <DetalleProyecto
            hobby={abierto}
            proyecto={proyecto}
            sesiones={porHobby.get(abierto.id!) ?? []}
            onVolver={() => setProyectoId(null)}
          />
        ) : (
          <DetalleHobby
            hobby={abierto}
            sesiones={porHobby.get(abierto.id!) ?? []}
            proyectos={proyectos.filter((p) => p.hobbyId === abierto.id)}
            onVolver={() => setHobbyId(null)}
            onEditar={() => setEditando(abierto)}
            onAbrirProyecto={(p) => setProyectoId(p.id ?? null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
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
                  data-tut={`hobbies.item.${h.id}`}
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

      <BarraEjemplo paquete={ejemploHobbies} />
    </div>
  )
}
