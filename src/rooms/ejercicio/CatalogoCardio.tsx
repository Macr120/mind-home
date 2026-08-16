import { useState } from 'react'
import type { GrupoCardio } from '../../core/data/db'
import { VACIO, gruposCardioRepo } from '../../core/data/repository'
import { slugGrupo } from './catalogo'
import { GenerarImagenesBar } from './GenerarImagenesBar'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { normalizarEjercicio } from './stats'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { acento } from '../_shared/acento'
import { C_CARDIO } from './constantes'

/**
 * Catálogo de resistencia con la misma estructura que fuerza y flexibilidad:
 * se elige una categoría y aparecen sus actividades (nombre, descripción e
 * imagen) para tocar y añadirlas a la rutina que se está creando. Las
 * categorías y sus actividades son editables.
 */
export function CatalogoCardio({ onAgregar }: { onAgregar: (nombre: string) => void }) {
  const [grupoId, setGrupoId] = useState<string | null>(null)
  const [agregandoGrupo, setAgregandoGrupo] = useState(false)
  const [nuevoGrupo, setNuevoGrupo] = useState('')
  const [agregandoEjercicio, setAgregandoEjercicio] = useState(false)
  const [nombreNuevoEj, setNombreNuevoEj] = useState('')
  const [descNuevoEj, setDescNuevoEj] = useState('')
  const t = useT()

  const grupos = gruposCardioRepo.useAll() ?? VACIO
  const grupo = grupos.find((g) => g.grupoId === grupoId)
  const imgPorClave = useImagenesPorClave()

  const crearGrupo = async () => {
    const label = nuevoGrupo.trim()
    if (!label) return
    const nuevoId = slugGrupo(label, grupos.map((g) => g.grupoId))
    const orden = grupos.reduce((m, g) => Math.max(m, g.orden), -1) + 1
    await gruposCardioRepo.add({ grupoId: nuevoId, label, orden, ejercicios: [] })
    setNuevoGrupo('')
    setAgregandoGrupo(false)
  }

  const borrarGrupo = async (g: GrupoCardio) => {
    if (!g.id) return
    if (grupoId === g.grupoId) setGrupoId(null)
    await gruposCardioRepo.remove(g.id)
  }

  const agregarEjercicioCatalogo = async () => {
    if (!grupo?.id) return
    const nombre = nombreNuevoEj.trim()
    if (!nombre) return
    await gruposCardioRepo.update(grupo.id, {
      ejercicios: [...grupo.ejercicios, { nombre, descripcion: descNuevoEj.trim() || undefined }],
    })
    setNombreNuevoEj('')
    setDescNuevoEj('')
    setAgregandoEjercicio(false)
  }

  const borrarEjercicioCatalogo = async (nombreEj: string) => {
    if (!grupo?.id) return
    await gruposCardioRepo.update(grupo.id, {
      ejercicios: grupo.ejercicios.filter((e) => e.nombre !== nombreEj),
    })
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <p className="text-base font-bold">
        <Icono nombre="tab-cardio" /> {t('ejercicio.cardio.catalogo', 'Catálogo por categoría')}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {grupos.map((g) => (
          <div
            key={g.grupoId}
            className={`flex items-center gap-1 rounded-lg ps-2.5 pe-1 py-1 text-xs font-semibold ${
              grupoId === g.grupoId
                ? 'ui-accent-bg'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
            style={grupoId === g.grupoId ? acento(C_CARDIO) : undefined}
          >
            <button type="button" onClick={() => setGrupoId(grupoId === g.grupoId ? null : g.grupoId)}>
              {t(`ejercicio.grupo.${g.grupoId}`, g.label)}
            </button>
            <button
              type="button"
              onClick={() => void borrarGrupo(g)}
              title={t('ejercicio.catalogo.borrarGrupo', 'Borrar grupo')}
              className="rounded px-1 text-white/40 hover:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
        {agregandoGrupo ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nuevoGrupo}
              onChange={(e) => setNuevoGrupo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void crearGrupo()
                if (e.key === 'Escape') setAgregandoGrupo(false)
              }}
              placeholder={t('ejercicio.catalogo.ph.grupo', 'Nombre del grupo')}
              className="w-28 rounded-lg bg-black/30 px-2 py-1 text-xs border border-white/10 outline-none"
            />
            <button
              type="button"
              onClick={crearGrupo}
              className="ui-accent-bg rounded-lg px-2 py-1 text-xs font-bold"
              style={acento(C_CARDIO)}
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAgregandoGrupo(true)}
            className="rounded-lg border border-dashed border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white/50 hover:bg-white/10"
          >
            {t('ejercicio.catalogo.nuevoGrupo', '+ Nuevo grupo')}
          </button>
        )}
      </div>

      {grupo && (
        <div className="pt-1">
          <GenerarImagenesBar ejercicios={grupo.ejercicios} imgPorClave={imgPorClave} accent="sky" />
          <p className="mb-1.5 mt-2 text-xs font-semibold text-white/50">
            {t('ejercicio.cardio.disponibles', 'Actividades disponibles · toca para añadir')}
          </p>
          <div className="space-y-1.5">
            {grupo.ejercicios.map((ej) => (
              <div
                key={ej.nombre}
                className="flex items-center gap-3 rounded-lg bg-white/5 hover:bg-sky-500/15 border border-white/10 px-3 py-2 transition"
              >
                <MiniaturaEjercicio
                  nombre={ej.nombre}
                  descripcion={ej.descripcion}
                  registro={imgPorClave.get(normalizarEjercicio(ej.nombre))}
                  hoverBorde="hover:border-sky-500/50"
                />
                <button
                  type="button"
                  onClick={() => onAgregar(ej.nombre)}
                  className="min-w-0 flex-1 text-start"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-semibold text-white/90">{ej.nombre}</span>
                    <span className="shrink-0 font-bold text-sky-400">+</span>
                  </div>
                  {ej.descripcion && <p className="mt-0.5 text-xs text-white/55">{ej.descripcion}</p>}
                </button>
                <button
                  type="button"
                  onClick={() => void borrarEjercicioCatalogo(ej.nombre)}
                  title={t('ejercicio.catalogo.borrarEjercicio', 'Borrar del catálogo')}
                  className="shrink-0 text-white/25 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {agregandoEjercicio ? (
            <div className="mt-2 space-y-1.5 rounded-lg bg-black/20 p-2">
              <input
                autoFocus
                value={nombreNuevoEj}
                onChange={(e) => setNombreNuevoEj(e.target.value)}
                placeholder={t('ejercicio.catalogo.ph.actividad', 'Nombre de la actividad')}
                className="w-full rounded-lg bg-black/30 px-2 py-1.5 text-xs border border-white/10 outline-none"
              />
              <input
                value={descNuevoEj}
                onChange={(e) => setDescNuevoEj(e.target.value)}
                placeholder={t('ejercicio.catalogo.ph.descripcion', 'Descripción (opcional)')}
                className="w-full rounded-lg bg-black/30 px-2 py-1.5 text-xs border border-white/10 outline-none"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAgregandoEjercicio(false)}
                  className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold text-white/70"
                >
                  {t('ejercicio.cancelar', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={agregarEjercicioCatalogo}
                  className="ui-accent-bg flex-1 rounded-lg py-1.5 text-xs font-bold"
                  style={acento(C_CARDIO)}
                >
                  {t('ejercicio.catalogo.guardar', 'Guardar')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAgregandoEjercicio(true)}
              className="mt-2 text-xs text-sky-400 hover:underline"
            >
              {t('ejercicio.catalogo.nuevaActividad', '+ Añadir actividad al catálogo')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
