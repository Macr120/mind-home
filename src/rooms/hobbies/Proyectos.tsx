import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import type { Hobby, ProyectoHobby, SesionHobby } from '../../core/data/db'
import { proyectosHobbyRepo, rutinasRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { borrarMetasDeAmbito, esMeta } from '../../core/metas'
import { Foto } from '../_shared/fotos'
import { fmtMin, hoyISO } from './stats'

/** Proyectos del hobby: alta inline, terminar/reabrir y tiempo acumulado por proyecto. */
export function Proyectos({
  hobby,
  proyectos,
  sesiones,
  onAbrir,
}: {
  hobby: Hobby
  proyectos: ProyectoHobby[]
  sesiones: SesionHobby[]
  onAbrir: (p: ProyectoHobby) => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const rutinas = rutinasRepo.useAll() ?? []

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    await proyectosHobbyRepo.add({
      hobbyId: hobby.id!,
      nombre: n,
      estado: 'en-curso',
      creadoEn: new Date().toISOString(),
    })
    setNombre('')
  }

  const alternar = (p: ProyectoHobby) =>
    proyectosHobbyRepo.update(
      p.id!,
      p.estado === 'en-curso'
        ? { estado: 'terminado', terminadoEn: hoyISO() }
        : { estado: 'en-curso', terminadoEn: undefined },
    )

  // Las sesiones del proyecto se desvinculan antes de borrarlo (no se pierden
  // registros); sus metas sí se van con él, que solo existían para el proyecto.
  const borrar = async (p: ProyectoHobby) => {
    for (const s of sesiones) {
      if (s.proyectoId === p.id && s.id != null) {
        await sesionesHobbyRepo.update(s.id, { proyectoId: undefined })
      }
    }
    await borrarMetasDeAmbito(`proyecto:${p.id}`)
    await proyectosHobbyRepo.remove(p.id!)
  }

  const ordenados = [...proyectos].sort((a, b) =>
    a.estado === b.estado ? 0 : a.estado === 'en-curso' ? -1 : 1,
  )

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <p className="text-xs font-semibold">{t('hobbies.proy.titulo', 'Proyectos')}</p>
      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t('hobbies.proy.ph', 'Ej. Tejer bufanda, aprender 3 canciones...')}
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15 transition"
        >
          {t('hobbies.proy.agregar', '+ Agregar')}
        </button>
      </form>

      {ordenados.length === 0 ? (
        <p className="py-2 text-center text-xs text-white/35">
          {t('hobbies.proy.vacio', 'Sin proyectos aún. Un proyecto le da rumbo a tu práctica.')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {ordenados.map((p) => {
            const suyas = sesiones.filter((s) => s.proyectoId === p.id)
            const min = suyas.reduce((acc, s) => acc + s.minutos, 0)
            const metas = rutinas.filter((r) => esMeta(r) && r.ambitoId === `proyecto:${p.id}`)
            const hechas = metas.filter((m) => m.completada).length
            const portada = p.imagenes?.[0]
            return (
              <li
                key={p.id}
                className={`flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-2 text-xs ${
                  p.estado === 'terminado' ? 'opacity-60' : ''
                }`}
              >
                {/* Abre el proyecto: sus metas, su cronograma y sus fotos. */}
                <button
                  type="button"
                  onClick={() => onAbrir(p)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {portada ? (
                    <Foto blob={portada} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="shrink-0">
                      <Icono nombre={p.estado === 'terminado' ? 'hecho' : 'herramienta'} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-semibold ${p.estado === 'terminado' ? 'line-through' : ''}`}
                    >
                      {p.nombre}
                    </span>
                    <span className="block text-[10px] text-white/40">
                      {t('hobbies.proy.stats', '{n} sesiones · {m}', { n: suyas.length, m: fmtMin(min) })}
                      {metas.length > 0 &&
                        ` · ${t('hobbies.proy.metas', '{h}/{n} metas', { h: hechas, n: metas.length })}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => alternar(p)}
                  className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
                >
                  {p.estado === 'en-curso'
                    ? t('hobbies.proy.terminar', 'Terminar')
                    : t('hobbies.proy.reabrir', 'Reabrir')}
                </button>
                <button
                  type="button"
                  onClick={() => borrar(p)}
                  className="shrink-0 text-white/30 hover:text-red-400"
                  title={t('hobbies.proy.borrar', 'Borrar proyecto')}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
