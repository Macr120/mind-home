import { useMemo, useState } from 'react'
import type { GrupoFuerza } from '../../core/data/db'
import { VACIO, gruposFuerzaRepo } from '../../core/data/repository'
import { piramideFuerza, slugGrupo, type OpcionSplit } from './catalogo'
import { GenerarImagenesBar } from './GenerarImagenesBar'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { normalizarEjercicio } from './stats'
import { RUTINAS, type RutinaPlantilla } from './rutinas'
import { descEjercicio, nombreEjercicio, nombreRutina } from './nombres'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { acento } from '../_shared/acento'
import { C_FUERZA } from './constantes'
import { useAvisoAgregado } from './avisoAgregado'

/**
 * Pirámide de especificidad: al elegir un enfoque muestra sus ejercicios
 * (toca para añadir al entreno) y la rutina preguardada o sugerida. El
 * catálogo (grupos y ejercicios) es editable: se puede agregar o borrar un
 * grupo, y agregar o borrar ejercicios desde cualquier enfoque — cuando la
 * selección cubre varios grupos ("Empuje"), el alta pregunta a cuál va.
 */
export function CatalogoFuerza({
  onAgregar,
  onUsarRutina,
}: {
  /** Devuelve false si el ejercicio ya estaba en la rutina (para el acuse). */
  onAgregar: (nombre: string) => boolean
  onUsarRutina: (rutina: RutinaPlantilla) => void
}) {
  const [splitId, setSplitId] = useState<string | null>(null)
  const [agregandoGrupo, setAgregandoGrupo] = useState(false)
  const [nuevoGrupo, setNuevoGrupo] = useState('')
  const [agregandoEjercicio, setAgregandoEjercicio] = useState(false)
  const [nombreNuevoEj, setNombreNuevoEj] = useState('')
  const [descNuevoEj, setDescNuevoEj] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [aviso, avisar] = useAvisoAgregado()
  const t = useT()

  const grupos = gruposFuerzaRepo.useAll() ?? VACIO
  const imgPorClave = useImagenesPorClave()
  const piramide = useMemo(() => piramideFuerza(grupos), [grupos])

  // Los niveles superiores traducen con ejercicio.split.*; el nivel de grupos con ejercicio.grupo.*
  const etiqueta = (op: OpcionSplit) =>
    op.grupos.length === 1 && op.grupos[0] === op.id
      ? t(`ejercicio.grupo.${op.id}`, op.label)
      : t(`ejercicio.split.${op.id}`, op.label)

  const split = piramide.flat().find((o) => o.id === splitId)
  const gruposDelSplit = split ? grupos.filter((g) => split.grupos.includes(g.grupoId)) : []
  // Grupo al que se añade lo nuevo. Con la selección en un enfoque agregado
  // ("Empuje" cubre pecho, hombros y tríceps) el destino se elige en el propio
  // formulario: antes el alta simplemente no salía y el catálogo solo crecía
  // entrando grupo por grupo.
  const grupoDestino = gruposDelSplit.find((g) => g.grupoId === destinoId) ?? gruposDelSplit[0] ?? null
  // Un enfoque sin un solo ejercicio no ofrece rutinas: si la única tarjeta con
  // contenido es «Rutina sugerida», parece que el catálogo abre rutinas en vez
  // de ejercicios. Con la lista vacía se dice qué falta y ya está.
  const sinEjercicios = gruposDelSplit.every((g) => g.ejercicios.length === 0)
  const preguardadas =
    split && !sinEjercicios ? RUTINAS.fuerza.filter((r) => r.splitId === split.id) : []
  // Para un grupo muscular sin rutina preguardada se sugiere una con su catálogo
  const rutinas: RutinaPlantilla[] =
    split && !sinEjercicios && preguardadas.length === 0 && gruposDelSplit.length === 1
      ? [
          {
            nombre: etiqueta(split),
            splitId: split.id,
            duracionMin: 40,
            descripcion: '',
            ejercicios: gruposDelSplit[0].ejercicios.slice(0, 5).map((e) => e.nombre),
          },
        ]
      : preguardadas

  const crearGrupo = async () => {
    const label = nuevoGrupo.trim()
    if (!label) return
    const grupoId = slugGrupo(label, grupos.map((g) => g.grupoId))
    const orden = grupos.reduce((m, g) => Math.max(m, g.orden), -1) + 1
    await gruposFuerzaRepo.add({ grupoId, label, orden, ejercicios: [] })
    setNuevoGrupo('')
    setAgregandoGrupo(false)
  }

  const borrarGrupo = async (g: GrupoFuerza) => {
    if (!g.id) return
    if (splitId === g.grupoId) setSplitId(null)
    await gruposFuerzaRepo.remove(g.id)
  }

  const agregarEjercicioCatalogo = async () => {
    if (!grupoDestino?.id) return
    const nombre = nombreNuevoEj.trim()
    if (!nombre) return
    await gruposFuerzaRepo.update(grupoDestino.id, {
      ejercicios: [...grupoDestino.ejercicios, { nombre, descripcion: descNuevoEj.trim() || undefined }],
    })
    setNombreNuevoEj('')
    setDescNuevoEj('')
    setAgregandoEjercicio(false)
  }

  const borrarEjercicioCatalogo = async (g: GrupoFuerza, nombreEj: string) => {
    if (!g.id) return
    await gruposFuerzaRepo.update(g.id, {
      ejercicios: g.ejercicios.filter((e) => e.nombre !== nombreEj),
    })
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <p className="text-base font-bold"><Icono nombre="techo" /> {t('ejercicio.piramide', 'Catálogo por enfoque')}</p>
      <div className="space-y-1.5">
        {piramide.map((fila, i) => {
          const esHoja = i === piramide.length - 1
          return (
            <div key={i} className="flex flex-wrap justify-center gap-1.5">
              {fila.map((op) =>
                esHoja ? (
                  <div
                    key={op.id}
                    className={`flex items-center gap-1 rounded-lg ps-2.5 pe-1 py-1 text-xs font-semibold ${
                      splitId === op.id
                        ? 'ui-accent-bg'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    style={splitId === op.id ? acento(C_FUERZA) : undefined}
                  >
                    <button type="button" onClick={() => setSplitId(splitId === op.id ? null : op.id)}>
                      {etiqueta(op)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const g = grupos.find((x) => x.grupoId === op.id)
                        if (g) void borrarGrupo(g)
                      }}
                      title={t('ejercicio.catalogo.borrarGrupo', 'Borrar grupo')}
                      className="rounded px-1 text-white/40 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setSplitId(splitId === op.id ? null : op.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      splitId === op.id
                        ? 'ui-accent-bg'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    style={splitId === op.id ? acento(C_FUERZA) : undefined}
                  >
                    {etiqueta(op)}
                  </button>
                ),
              )}
              {esHoja &&
                (agregandoGrupo ? (
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
                      style={acento(C_FUERZA)}
                    >
                      <Icono nombre="confirmar" />
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
                ))}
            </div>
          )
        })}
      </div>

      {split && (
        <div className="space-y-3 pt-1">
          <GenerarImagenesBar
            ejercicios={gruposDelSplit.flatMap((g) => g.ejercicios)}
            imgPorClave={imgPorClave}
            accent="orange"
          />
          <div>
            <p className="mb-1.5 text-xs font-semibold text-white/50">
              {t('ejercicio.sugeridos', 'Ejercicios disponibles · toca para añadir')}
            </p>
            {sinEjercicios && (
              <p className="text-xs text-white/40">
                {gruposDelSplit.length === 0
                  ? t(
                      'ejercicio.catalogo.sinGrupos',
                      'Este enfoque no tiene grupos en tu catálogo. Crea uno con «+ Nuevo grupo» y añádele ejercicios.',
                    )
                  : t(
                      'ejercicio.catalogo.sinEjercicios',
                      'Estas carpetas todavía no tienen ejercicios. Añádelos abajo con «+ Añadir ejercicio al catálogo».',
                    )}
              </p>
            )}
            <div className="space-y-2">
              {gruposDelSplit.map((g) => (
                <div key={g.grupoId}>
                  {gruposDelSplit.length > 1 && (
                    <p className="mb-1 text-[9px] uppercase tracking-wide text-white/35">
                      {t(`ejercicio.grupo.${g.grupoId}`, g.label)}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {g.ejercicios.map((ej) => (
                      <div
                        key={ej.nombre}
                        className="flex items-center gap-3 rounded-lg bg-white/5 hover:bg-orange-500/15 border border-white/10 px-3 py-2 transition"
                      >
                        <MiniaturaEjercicio
                          nombre={ej.nombre}
                          descripcion={ej.descripcion}
                          registro={imgPorClave.get(normalizarEjercicio(ej.nombre))}
                          hoverBorde="hover:border-orange-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => avisar(ej.nombre, onAgregar(ej.nombre))}
                          className="min-w-0 flex-1 text-start"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm font-semibold text-white/90">
                              {nombreEjercicio(t, ej.nombre)}
                            </span>
                            {aviso?.nombre === ej.nombre ? (
                              <span
                                className={`shrink-0 text-[10px] font-bold ${
                                  aviso.nuevo ? 'text-emerald-400' : 'text-white/45'
                                }`}
                              >
                                {aviso.nuevo
                                  ? t('ejercicio.catalogo.anadido', '✓ Añadido')
                                  : t('ejercicio.catalogo.yaEsta', 'Ya está')}
                              </span>
                            ) : (
                              <span className="shrink-0 font-bold text-orange-400">+</span>
                            )}
                          </div>
                          {ej.descripcion && (
                            <p className="mt-0.5 text-xs text-white/55">{descEjercicio(t, ej.nombre, ej.descripcion)}</p>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void borrarEjercicioCatalogo(g, ej.nombre)}
                          title={t('ejercicio.catalogo.borrarEjercicio', 'Borrar del catálogo')}
                          className="shrink-0 text-white/25 hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {grupoDestino &&
              (agregandoEjercicio ? (
                <div className="mt-2 space-y-1.5 rounded-lg bg-black/20 p-2">
                  {gruposDelSplit.length > 1 && (
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      {t('ejercicio.catalogo.destino', 'Añadir al grupo')}
                      <select
                        value={grupoDestino.grupoId}
                        onChange={(e) => setDestinoId(e.target.value)}
                        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-white/85 border border-white/10 outline-none"
                      >
                        {gruposDelSplit.map((g) => (
                          <option key={g.grupoId} value={g.grupoId} className="bg-neutral-900">
                            {t(`ejercicio.grupo.${g.grupoId}`, g.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <input
                    autoFocus
                    value={nombreNuevoEj}
                    onChange={(e) => setNombreNuevoEj(e.target.value)}
                    placeholder={t('ejercicio.catalogo.ph.ejercicio', 'Nombre del ejercicio')}
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
                      style={acento(C_FUERZA)}
                    >
                      {t('ejercicio.catalogo.guardar', 'Guardar')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAgregandoEjercicio(true)}
                  className="mt-2 text-xs text-orange-400 hover:underline"
                >
                  {t('ejercicio.catalogo.nuevoEjercicio', '+ Añadir ejercicio al catálogo')}
                </button>
              ))}
          </div>

          {rutinas.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-white/50">
                {t('ejercicio.rutina.sugerida', 'Rutina sugerida')}
              </p>
              <div className="space-y-1.5">
                {rutinas.map((r) => (
                  <button
                    key={r.nombre}
                    type="button"
                    onClick={() => onUsarRutina(r)}
                    className="block w-full rounded-lg bg-white/5 hover:bg-orange-500/15 border border-white/10 px-3 py-2 text-start transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-semibold text-white/90">{nombreRutina(t, r.nombre)}</span>
                      <span className="shrink-0 text-xs text-white/40">{r.duracionMin} min</span>
                    </div>
                    {r.ejercicios && r.ejercicios.length > 0 && (
                      <p className="mt-0.5 text-xs text-white/55">
                        {r.ejercicios.map((n) => nombreEjercicio(t, n)).join(' · ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
